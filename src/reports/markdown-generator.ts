// Generates structured Markdown reports with YAML frontmatter for AI coding tool consumption

import fs from 'fs-extra';
import { dirname } from 'node:path';
import { calculateHealthScore } from './health-scorer.js';
import { prioritizeIssues, deduplicateIssues } from './priority-ranker.js';
import type { HealthScore } from './health-scorer.js';
import type { PrioritizedIssue } from './priority-ranker.js';
import type { ExecutionArtifact, WorkflowExecutionResult } from '../types/execution.js';
import type { AnalysisArtifact, DiagnosedError, UIAuditResult } from '../analysis/diagnosis-schema.js';
import { redactSensitiveUrl, sanitizeForYaml, redactSensitiveData, sanitizeForMarkdownInline } from '../utils/sanitizer.js';
import { getAfterburnVersion } from '../version.js';

const REPORT_SCHEMA_VERSION = '1.1.0';

/**
 * Redact sensitive data from text before inserting into reports.
 * Strips query params with sensitive keys, truncates stack traces, replaces file paths with basename.
 */
function redactSensitive(text: string): string {
  if (!text) return text;

  let result = text;

  // Strip sensitive query params from URLs
  result = result.replace(/\b(https?:\/\/[^\s]+\?[^\s]*)/g, (url) => {
    try {
      const parsed = new URL(url);
      const sensitiveKeys = ['key', 'token', 'secret', 'password', 'auth', 'api', 'apikey', 'api_key', 'access_token', 'auth_token', 'session', 'jwt'];
      for (const key of sensitiveKeys) {
        if (parsed.searchParams.has(key)) {
          parsed.searchParams.set(key, '[REDACTED]');
        }
      }
      return parsed.toString();
    } catch {
      return url;
    }
  });

  // Truncate stack traces to first 3 lines
  const lines = result.split('\n');
  if (lines.length > 3 && lines.some(line => line.match(/^\s*at\s+/))) {
    const stackStart = lines.findIndex(line => line.match(/^\s*at\s+/));
    if (stackStart >= 0 && lines.length > stackStart + 3) {
      result = lines.slice(0, stackStart + 3).join('\n') + '\n... (stack trace truncated)';
    }
  }

  // Replace full file paths with basename only (remove directory info)
  result = result.replace(/([A-Z]:[\/\\]|\/[^\/\s]+\/)[^\s:]+([\/\\][^\s:]+)/g, (match) => {
    const lastSep = Math.max(match.lastIndexOf('/'), match.lastIndexOf('\\'));
    return lastSep >= 0 ? match.substring(lastSep + 1) : match;
  });

  // Apply general sensitive data redaction
  result = redactSensitiveData(result);

  return result;
}

/**
 * Sanitize text for safe inclusion in Markdown tables.
 * Escapes pipes, replaces newlines, escapes backticks in inline contexts, truncates long fields.
 */
function sanitizeForMarkdownTable(text: string): string {
  if (!text) return '';

  let result = text;

  // Escape pipe characters
  result = result.replace(/\|/g, '\\|');

  // Replace newlines with spaces
  result = result.replace(/\n/g, ' ');

  // Escape backticks in inline contexts (prevent code block injection)
  result = result.replace(/`/g, '\\`');

  // Truncate overly long fields
  if (result.length > 200) {
    result = result.slice(0, 197) + '...';
  }

  return result;
}

/**
 * Generate YAML frontmatter with machine-readable metadata
 */
function generateFrontmatter(exec: ExecutionArtifact, analysis: AnalysisArtifact, healthScore: HealthScore, dedupedIssueCount: number): string {
  const workflowsPassed = exec.workflowResults.filter(w => w.overallStatus === 'passed').length;
  const workflowsFailed = exec.workflowResults.filter(w => w.overallStatus === 'failed').length;

  return `---
tool: afterburn
schema_version: ${REPORT_SCHEMA_VERSION}
session_id: ${sanitizeForYaml(exec.sessionId)}
generated_at_utc: ${new Date().toISOString()}
timestamp: ${exec.timestamp}
target_url: ${sanitizeForYaml(redactSensitiveUrl(exec.targetUrl))}
health_score: ${healthScore.overall}
health_label: ${healthScore.label}
total_issues: ${dedupedIssueCount}
workflows_tested: ${exec.workflowResults.length}
workflows_passed: ${workflowsPassed}
workflows_failed: ${workflowsFailed}
ai_powered: ${analysis.aiPowered}
source_analysis: ${analysis.sourceAnalysisAvailable}
---`;
}

/**
 * Generate prioritized issue table
 */
function generateIssueTable(issues: PrioritizedIssue[]): string {
  if (issues.length === 0) {
    return 'No issues found.';
  }

  const rows = issues.map((issue, i) => {
    const priorityLabel = issue.priority.toUpperCase();
    let summaryText = issue.summary;
    if (issue.occurrenceCount && issue.occurrenceCount > 1) {
      summaryText += ` (x${issue.occurrenceCount})`;
    }
    const summaryTruncated = summaryText.length > 80 ? summaryText.slice(0, 77) + '...' : summaryText;
    const safeLocation = redactSensitiveUrl(issue.location);
    return `| ${i + 1} | ${priorityLabel} | ${sanitizeForMarkdownTable(issue.category)} | ${sanitizeForMarkdownTable(summaryTruncated)} | ${sanitizeForMarkdownTable(safeLocation)} |`;
  });

  return `| # | Priority | Category | Summary | Location |
|---|----------|----------|---------|----------|
${rows.join('\n')}`;
}

/**
 * Generate technical details section with original error messages
 */
function generateTechnicalDetails(diagnosedErrors: DiagnosedError[]): string {
  if (diagnosedErrors.length === 0) {
    return 'No errors diagnosed.';
  }

  return diagnosedErrors.map((error, i) => {
    let details = `### ${i + 1}. ${sanitizeForMarkdownTable(error.summary)}

- **Error Type:** ${sanitizeForMarkdownTable(error.errorType)}
- **Confidence:** ${error.confidence}
- **Root Cause:** ${sanitizeForMarkdownTable(error.rootCause)}
- **Suggested Fix:** ${sanitizeForMarkdownTable(error.suggestedFix)}
- **Original Error:** \`${redactSensitive(error.originalError)}\``;

    if (error.technicalDetails) {
      details += `\n- **Technical Details:** ${sanitizeForMarkdownTable(error.technicalDetails)}`;
    }

    if (error.sourceLocation) {
      const redactedContext = redactSensitive(error.sourceLocation.context || '');
      details += `\n- **Source:** \`${error.sourceLocation.file}:${error.sourceLocation.line}\`
- **Code Context:**
\`\`\`typescript
${redactedContext}
\`\`\``;
    }

    return details;
  }).join('\n\n');
}

/**
 * Generate reproduction steps from failed workflow results
 */
function generateReproductionSteps(workflowResults: WorkflowExecutionResult[]): string {
  const failedWorkflows = workflowResults.filter(w => w.overallStatus === 'failed');

  if (failedWorkflows.length === 0) {
    return 'All workflows passed successfully.';
  }

  return failedWorkflows.map(workflow => {
    const steps = workflow.stepResults.map((step, i) => {
      let stepLine = `${i + 1}. ${sanitizeForMarkdownTable(step.action)} on \`${sanitizeForMarkdownTable(step.selector || '')}\` - ${step.status}`;
      if (step.error) {
        stepLine += `\n   Error: ${redactSensitive(step.error)}`;
      }
      return stepLine;
    }).join('\n');

    return `### ${sanitizeForMarkdownTable(workflow.workflowName)}

**Description:** ${sanitizeForMarkdownTable(workflow.description)}
**Status:** Failed (${workflow.failedSteps}/${workflow.totalSteps} steps failed)
**Duration:** ${workflow.duration}ms

**Steps:**
${steps}`;
  }).join('\n\n');
}

/**
 * Generate UI audit section with layout, contrast, and formatting issues
 */
function generateUIAuditSection(uiAudits: UIAuditResult[]): string {
  if (uiAudits.length === 0) {
    return 'No UI audits performed.';
  }

  return uiAudits.map(audit => {
    let section = `### ${redactSensitiveUrl(audit.pageUrl)}

**Overall Score:** ${audit.overallScore}`;

    if (audit.layoutIssues.length > 0) {
      section += '\n\n**Layout Issues:**\n' + audit.layoutIssues.map(issue =>
        `- [${issue.severity}] ${sanitizeForMarkdownTable(issue.description)} at ${sanitizeForMarkdownTable(issue.location)}`
      ).join('\n');
    }

    if (audit.contrastIssues.length > 0) {
      section += '\n\n**Contrast Issues:**\n' + audit.contrastIssues.map(issue =>
        `- ${sanitizeForMarkdownTable(issue.element)}: ${sanitizeForMarkdownTable(issue.issue)} - Fix: ${sanitizeForMarkdownTable(issue.suggestion)}`
      ).join('\n');
    }

    if (audit.formattingIssues.length > 0) {
      section += '\n\n**Formatting Issues:**\n' + audit.formattingIssues.map(issue =>
        `- ${sanitizeForMarkdownTable(issue.problem)} - Fix: ${sanitizeForMarkdownTable(issue.suggestion)}`
      ).join('\n');
    }

    if (audit.improvements.length > 0) {
      section += '\n\n**Improvements:**\n' + audit.improvements.map(improvement =>
        `- ${sanitizeForMarkdownTable(improvement)}`
      ).join('\n');
    }

    return section;
  }).join('\n\n');
}

/**
 * Generate source code references section
 */
function generateSourceReferences(diagnosedErrors: DiagnosedError[]): string {
  const errorsWithSource = diagnosedErrors.filter(e => e.sourceLocation);

  if (errorsWithSource.length === 0) {
    return 'No source code references available. Run with `--source ./path` for source-level diagnosis.';
  }

  return errorsWithSource.map(error =>
    `- \`${error.sourceLocation!.file}:${error.sourceLocation!.line}\` - ${sanitizeForMarkdownTable(error.summary)}`
  ).join('\n');
}

/**
 * Generate accessibility summary with aggregated violations
 */
function generateAccessibilitySummary(executionArtifact: ExecutionArtifact): string {
  const pageAudits = executionArtifact.pageAudits.filter(a => a.accessibility);

  if (pageAudits.length === 0) {
    return 'No accessibility audits performed.';
  }

  // Build summary table
  const rows = pageAudits.map(audit => {
    const report = audit.accessibility!;
    const critical = report.violations.filter(v => v.impact === 'critical').length;
    const serious = report.violations.filter(v => v.impact === 'serious').length;
    const moderate = report.violations.filter(v => v.impact === 'moderate').length;
    const minor = report.violations.filter(v => v.impact === 'minor').length;
    const total = report.violationCount;

    return `| ${sanitizeForMarkdownTable(redactSensitiveUrl(audit.url))} | ${critical} | ${serious} | ${moderate} | ${minor} | ${total} |`;
  });

  let summary = `| Page | Critical | Serious | Moderate | Minor | Total |
|------|----------|---------|----------|-------|-------|
${rows.join('\n')}`;

  // Find top violations (most common across pages)
  const violationCounts = new Map<string, { count: number; description: string; helpUrl: string }>();
  for (const audit of pageAudits) {
    for (const violation of audit.accessibility!.violations) {
      const existing = violationCounts.get(violation.id);
      if (existing) {
        existing.count += violation.nodes;
      } else {
        violationCounts.set(violation.id, {
          count: violation.nodes,
          description: violation.description,
          helpUrl: violation.helpUrl,
        });
      }
    }
  }

  if (violationCounts.size > 0) {
    const topViolations = Array.from(violationCounts.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);

    summary += '\n\n**Top Violations:**\n' + topViolations.map(([id, data]) =>
      `- **${sanitizeForMarkdownInline(data.description)}** (${data.count} elements) - [Learn more](${redactSensitiveUrl(data.helpUrl)})`
    ).join('\n');
  }

  return summary;
}

/**
 * Generate complete Markdown report with YAML frontmatter
 */
export function generateMarkdownReport(executionArtifact: ExecutionArtifact, analysisArtifact: AnalysisArtifact): string {
  const appVersion = getAfterburnVersion();
  const healthScore = calculateHealthScore(executionArtifact);
  const prioritizedIssues = deduplicateIssues(
    prioritizeIssues(analysisArtifact.diagnosedErrors, analysisArtifact.uiAudits, executionArtifact)
  );

  const frontmatter = generateFrontmatter(executionArtifact, analysisArtifact, healthScore, prioritizedIssues.length);
  const issueTable = generateIssueTable(prioritizedIssues);
  const technicalDetails = generateTechnicalDetails(analysisArtifact.diagnosedErrors);
  const reproductionSteps = generateReproductionSteps(executionArtifact.workflowResults);
  const uiAuditSection = generateUIAuditSection(analysisArtifact.uiAudits);
  const accessibilitySummary = generateAccessibilitySummary(executionArtifact);
  const sourceReferences = generateSourceReferences(analysisArtifact.diagnosedErrors);

  // Format timestamp for display (ISO format for machine readability)
  const readableTimestamp = new Date(executionArtifact.timestamp).toISOString();
  const mode = analysisArtifact.aiPowered ? 'AI-powered' : 'Basic';

  // Count specific issue types
  const deadButtonCount = executionArtifact.deadButtons.filter(b => b.isDead).length;
  const brokenFormCount = executionArtifact.brokenForms.filter(f => f.isBroken).length;
  const brokenLinkCount = executionArtifact.brokenLinks.length;
  const accessibilityViolations = executionArtifact.pageAudits.reduce((sum, audit) =>
    sum + (audit.accessibility?.violationCount || 0), 0);

  const workflowsPassed = executionArtifact.workflowResults.filter(w => w.overallStatus === 'passed').length;
  const workflowsFailed = executionArtifact.workflowResults.filter(w => w.overallStatus === 'failed').length;

  return `${frontmatter}

# Afterburn Test Report

**Target:** ${redactSensitiveUrl(executionArtifact.targetUrl)}
**Health Score:** ${healthScore.overall}/100 (${healthScore.label})
**Date:** ${readableTimestamp}
**Mode:** ${mode}

## Summary

| Metric | Value |
|--------|-------|
| Workflows Tested | ${executionArtifact.workflowResults.length} |
| Workflows Passed | ${workflowsPassed} |
| Workflows Failed | ${workflowsFailed} |
| Total Issues | ${prioritizedIssues.length} |
| Dead Buttons | ${deadButtonCount} |
| Broken Forms | ${brokenFormCount} |
| Broken Links | ${brokenLinkCount} |
| Accessibility Violations | ${accessibilityViolations} |

## Issues (Prioritized)

${issueTable}

## Issue Details

${technicalDetails}

## Reproduction Steps

${reproductionSteps}

## UI Audit Results

${uiAuditSection}

## Accessibility

${accessibilitySummary}

## Source Code References

${sourceReferences}

---
${!analysisArtifact.aiPowered ? `
> **Tip:** Set \`GEMINI_API_KEY\` for smarter test planning and AI-powered root cause analysis. Get a free key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).

` : ''}*Generated by Afterburn v${appVersion} on ${readableTimestamp}*
`;
}

/**
 * Write Markdown report to file
 */
export async function writeMarkdownReport(markdown: string, outputPath: string): Promise<void> {
  await fs.ensureDir(dirname(outputPath));
  await fs.writeFile(outputPath, markdown, 'utf-8');
  console.log('Markdown report saved: ' + outputPath);
}
