// Generates structured Markdown reports with YAML frontmatter for AI coding tool consumption

import fs from 'fs-extra';
import { dirname } from 'node:path';
import { calculateHealthScore } from './health-scorer.js';
import { prioritizeIssues, deduplicateIssues } from './priority-ranker.js';
import type { HealthScore } from './health-scorer.js';
import type { PrioritizedIssue } from './priority-ranker.js';
import type { ExecutionArtifact, WorkflowExecutionResult } from '../types/execution.js';
import type { AnalysisArtifact, DiagnosedError, UIAuditResult } from '../analysis/diagnosis-schema.js';
import { redactSensitiveUrl, sanitizeForYaml } from '../utils/sanitizer.js';

/**
 * Generate YAML frontmatter with machine-readable metadata
 */
function generateFrontmatter(exec: ExecutionArtifact, analysis: AnalysisArtifact, healthScore: HealthScore, dedupedIssueCount: number): string {
  const workflowsPassed = exec.workflowResults.filter(w => w.overallStatus === 'passed').length;
  const workflowsFailed = exec.workflowResults.filter(w => w.overallStatus === 'failed').length;

  return `---
tool: afterburn
version: "1.0"
session_id: ${sanitizeForYaml(exec.sessionId)}
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
    return `| ${i + 1} | ${priorityLabel} | ${issue.category} | ${summaryTruncated} | ${issue.location} |`;
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
    let details = `### ${i + 1}. ${error.summary}

- **Error Type:** ${error.errorType}
- **Confidence:** ${error.confidence}
- **Root Cause:** ${error.rootCause}
- **Suggested Fix:** ${error.suggestedFix}
- **Original Error:** \`${error.originalError}\``;

    if (error.technicalDetails) {
      details += `\n- **Technical Details:** ${error.technicalDetails}`;
    }

    if (error.sourceLocation) {
      details += `\n- **Source:** \`${error.sourceLocation.file}:${error.sourceLocation.line}\`
- **Code Context:**
\`\`\`typescript
${error.sourceLocation.context}
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
      let stepLine = `${i + 1}. ${step.action} on \`${step.selector}\` - ${step.status}`;
      if (step.error) {
        stepLine += `\n   Error: ${step.error}`;
      }
      return stepLine;
    }).join('\n');

    return `### ${workflow.workflowName}

**Description:** ${workflow.description}
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
    let section = `### ${audit.pageUrl}

**Overall Score:** ${audit.overallScore}`;

    if (audit.layoutIssues.length > 0) {
      section += '\n\n**Layout Issues:**\n' + audit.layoutIssues.map(issue =>
        `- [${issue.severity}] ${issue.description} at ${issue.location}`
      ).join('\n');
    }

    if (audit.contrastIssues.length > 0) {
      section += '\n\n**Contrast Issues:**\n' + audit.contrastIssues.map(issue =>
        `- ${issue.element}: ${issue.issue} - Fix: ${issue.suggestion}`
      ).join('\n');
    }

    if (audit.formattingIssues.length > 0) {
      section += '\n\n**Formatting Issues:**\n' + audit.formattingIssues.map(issue =>
        `- ${issue.problem} - Fix: ${issue.suggestion}`
      ).join('\n');
    }

    if (audit.improvements.length > 0) {
      section += '\n\n**Improvements:**\n' + audit.improvements.map(improvement =>
        `- ${improvement}`
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
    `- \`${error.sourceLocation!.file}:${error.sourceLocation!.line}\` - ${error.summary}`
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

    return `| ${audit.url} | ${critical} | ${serious} | ${moderate} | ${minor} | ${total} |`;
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
      `- **${data.description}** (${data.count} elements) - [Learn more](${data.helpUrl})`
    ).join('\n');
  }

  return summary;
}

/**
 * Generate complete Markdown report with YAML frontmatter
 */
export function generateMarkdownReport(executionArtifact: ExecutionArtifact, analysisArtifact: AnalysisArtifact): string {
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

  // Format timestamp for display
  const readableTimestamp = new Date(executionArtifact.timestamp).toLocaleString();
  const mode = analysisArtifact.aiPowered ? 'AI-powered' : 'Basic';

  // Count specific issue types
  const deadButtonCount = executionArtifact.deadButtons.filter(b => b.isDead).length;
  const brokenFormCount = executionArtifact.brokenForms.filter(f => f.isBroken).length;
  const accessibilityViolations = executionArtifact.pageAudits.reduce((sum, audit) =>
    sum + (audit.accessibility?.violationCount || 0), 0);

  const workflowsPassed = executionArtifact.workflowResults.filter(w => w.overallStatus === 'passed').length;
  const workflowsFailed = executionArtifact.workflowResults.filter(w => w.overallStatus === 'failed').length;

  return `${frontmatter}

# Afterburn Test Report

**Target:** ${executionArtifact.targetUrl}
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

` : ''}*Generated by Afterburn v1.0 on ${readableTimestamp}*
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
