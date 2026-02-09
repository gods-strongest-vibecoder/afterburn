// Categorize and prioritize issues from diagnosed errors, UI audits, and execution results

import { DiagnosedError, UIAuditResult } from '../analysis/diagnosis-schema.js';
import { ExecutionArtifact } from '../types/execution.js';

/**
 * Convert raw Playwright selectors into human-readable button labels.
 * e.g. 'button:has-text("Subscribe")' → 'Subscribe'
 *      'form:nth-of-type(1) [type="submit"]' → 'Submit button in form'
 */
function humanizeSelector(selector: string): string {
  // Extract text from has-text("...") patterns
  const hasTextMatch = selector.match(/has-text\(["'](.+?)["']\)/);
  if (hasTextMatch) return hasTextMatch[1];

  // Descriptive labels for common raw selector patterns
  if (/\[type=["']submit["']\]/.test(selector)) return 'Submit button in form';
  if (/\[type=["']reset["']\]/.test(selector)) return 'Reset button in form';
  if (/button:last-of-type/.test(selector)) return 'Button in form';
  if (/^#[\w-]+$/.test(selector)) return selector; // Keep simple IDs as-is

  return 'A button on the page';
}

export type IssuePriority = 'high' | 'medium' | 'low';

export interface PrioritizedIssue {
  priority: IssuePriority;
  category: string;         // e.g., "Workflow Error", "Console Error", "UI Issue", "Accessibility", "Dead Button", "Broken Form"
  summary: string;          // Plain English summary
  impact: string;           // Why it matters (plain English)
  fixSuggestion: string;    // How to fix (plain English)
  location: string;         // URL or file:line
  screenshotRef?: string;   // Path to screenshot if available
  technicalDetails?: string; // For AI report only
  occurrenceCount?: number; // How many times this issue was found (set when > 1)
}

/**
 * Find a page screenshot from workflow results (for issues without their own screenshot)
 */
function findPageScreenshot(workflowResults: ExecutionArtifact['workflowResults']): string | undefined {
  for (const workflow of workflowResults) {
    if (workflow.pageScreenshotRef) {
      return workflow.pageScreenshotRef;
    }
  }
  return undefined;
}

export function prioritizeIssues(
  diagnosedErrors: DiagnosedError[],
  uiAudits: UIAuditResult[],
  executionArtifact: ExecutionArtifact
): PrioritizedIssue[] {
  const issues: PrioritizedIssue[] = [];
  const fallbackScreenshot = findPageScreenshot(executionArtifact.workflowResults);

  // HIGH PRIORITY: Workflow-blocking errors
  for (const error of diagnosedErrors) {
    if (['navigation', 'authentication', 'form'].includes(error.errorType)) {
      issues.push({
        priority: 'high',
        category: 'Workflow Error',
        summary: error.summary,
        impact: 'This breaks a core user flow on your site',
        fixSuggestion: error.suggestedFix,
        location: error.sourceLocation ? `${error.sourceLocation.file}:${error.sourceLocation.line}` : (error.pageUrl || 'Unknown'),
        screenshotRef: error.screenshotRef,
        technicalDetails: error.technicalDetails,
      });
    }
  }

  // MEDIUM PRIORITY: Network and JavaScript errors
  for (const error of diagnosedErrors) {
    if (['network', 'javascript'].includes(error.errorType)) {
      issues.push({
        priority: 'medium',
        category: 'Console Error',
        summary: error.summary,
        impact: 'This causes errors or confuses users',
        fixSuggestion: error.suggestedFix,
        location: error.sourceLocation ? `${error.sourceLocation.file}:${error.sourceLocation.line}` : (error.pageUrl || 'Unknown'),
        screenshotRef: error.screenshotRef,
        technicalDetails: error.technicalDetails,
      });
    }
  }

  // MEDIUM PRIORITY: Dead buttons
  for (const deadButton of executionArtifact.deadButtons) {
    if (deadButton.isDead) {
      issues.push({
        priority: 'medium',
        category: 'Dead Button',
        summary: `The "${humanizeSelector(deadButton.selector)}" button doesn't do anything when clicked`,
        impact: 'This causes errors or confuses users',
        fixSuggestion: deadButton.reason || 'Add an event handler or make the button do something when clicked',
        location: executionArtifact.targetUrl,
        screenshotRef: fallbackScreenshot,
        technicalDetails: deadButton.reason,
      });
    }
  }

  // MEDIUM PRIORITY: Broken forms
  for (const brokenForm of executionArtifact.brokenForms) {
    if (brokenForm.isBroken) {
      issues.push({
        priority: 'medium',
        category: 'Broken Form',
        summary: 'A form on your site doesn\'t work when submitted',
        impact: 'This causes errors or confuses users',
        fixSuggestion: brokenForm.reason || 'Check form validation and submission handlers',
        location: `${executionArtifact.targetUrl} (${brokenForm.formSelector})`,
        screenshotRef: fallbackScreenshot,
        technicalDetails: `Filled fields: ${brokenForm.filledFields}, Skipped fields: ${brokenForm.skippedFields}`,
      });
    }
  }

  // MEDIUM PRIORITY: UI audit layout/contrast issues (high severity)
  for (const audit of uiAudits) {
    for (const layoutIssue of audit.layoutIssues) {
      if (layoutIssue.severity === 'high') {
        issues.push({
          priority: 'medium',
          category: 'UI Issue',
          summary: layoutIssue.description,
          impact: 'This causes errors or confuses users',
          fixSuggestion: `Check the layout at ${layoutIssue.location}`,
          location: audit.pageUrl,
          screenshotRef: audit.screenshotRef,
          technicalDetails: `Severity: ${layoutIssue.severity}`,
        });
      }
    }

    for (const contrastIssue of audit.contrastIssues) {
      issues.push({
        priority: 'medium',
        category: 'UI Issue',
        summary: `${contrastIssue.element}: ${contrastIssue.issue}`,
        impact: 'This causes errors or confuses users',
        fixSuggestion: contrastIssue.suggestion,
        location: audit.pageUrl,
        screenshotRef: audit.screenshotRef,
        technicalDetails: undefined,
      });
    }
  }

  // MEDIUM PRIORITY: Accessibility violations (critical or serious)
  for (const pageAudit of executionArtifact.pageAudits) {
    if (pageAudit.accessibility) {
      for (const violation of pageAudit.accessibility.violations) {
        if (violation.impact === 'critical' || violation.impact === 'serious') {
          issues.push({
            priority: 'medium',
            category: 'Accessibility',
            summary: violation.description,
            impact: 'This causes errors or confuses users',
            fixSuggestion: `Check accessibility guidelines at ${violation.helpUrl}`,
            location: pageAudit.url,
            screenshotRef: fallbackScreenshot,
            technicalDetails: `${violation.nodes} element(s) affected`,
          });
        }
      }
    }
  }

  // LOW PRIORITY: DOM and unknown errors
  for (const error of diagnosedErrors) {
    if (['dom', 'unknown'].includes(error.errorType)) {
      issues.push({
        priority: 'low',
        category: 'Console Error',
        summary: error.summary,
        impact: 'This is a minor issue but worth fixing',
        fixSuggestion: error.suggestedFix,
        location: error.sourceLocation ? `${error.sourceLocation.file}:${error.sourceLocation.line}` : (error.pageUrl || 'Unknown'),
        screenshotRef: error.screenshotRef,
        technicalDetails: error.technicalDetails,
      });
    }
  }

  // LOW PRIORITY: UI audit layout/contrast issues (medium/low severity)
  for (const audit of uiAudits) {
    for (const layoutIssue of audit.layoutIssues) {
      if (layoutIssue.severity === 'medium' || layoutIssue.severity === 'low') {
        issues.push({
          priority: 'low',
          category: 'UI Issue',
          summary: layoutIssue.description,
          impact: 'This is a minor issue but worth fixing',
          fixSuggestion: `Check the layout at ${layoutIssue.location}`,
          location: audit.pageUrl,
          screenshotRef: audit.screenshotRef,
          technicalDetails: `Severity: ${layoutIssue.severity}`,
        });
      }
    }

    for (const formattingIssue of audit.formattingIssues) {
      issues.push({
        priority: 'low',
        category: 'UI Issue',
        summary: formattingIssue.problem,
        impact: 'This is a minor issue but worth fixing',
        fixSuggestion: formattingIssue.suggestion,
        location: audit.pageUrl,
        screenshotRef: audit.screenshotRef,
        technicalDetails: undefined,
      });
    }

    for (const improvement of audit.improvements) {
      issues.push({
        priority: 'low',
        category: 'UI Issue',
        summary: improvement,
        impact: 'This is a minor issue but worth fixing',
        fixSuggestion: 'Consider this improvement to enhance user experience',
        location: audit.pageUrl,
        screenshotRef: audit.screenshotRef,
        technicalDetails: undefined,
      });
    }
  }

  // LOW PRIORITY: Accessibility violations (moderate or minor)
  for (const pageAudit of executionArtifact.pageAudits) {
    if (pageAudit.accessibility) {
      for (const violation of pageAudit.accessibility.violations) {
        if (violation.impact === 'moderate' || violation.impact === 'minor') {
          issues.push({
            priority: 'low',
            category: 'Accessibility',
            summary: violation.description,
            impact: 'This is a minor issue but worth fixing',
            fixSuggestion: `Check accessibility guidelines at ${violation.helpUrl}`,
            location: pageAudit.url,
            screenshotRef: fallbackScreenshot,
            technicalDetails: `${violation.nodes} element(s) affected`,
          });
        }
      }
    }
  }

  // DEDUP: Remove Console Error entries that duplicate Dead Button entries.
  // Dead buttons get added twice: once from executionArtifact.deadButtons (MEDIUM "Dead Button")
  // and again from error-analyzer's diagnosed errors (LOW "Console Error" with errorType=dom).
  const deadButtonSelectors = new Set(
    executionArtifact.deadButtons.filter(b => b.isDead).map(b => b.selector)
  );
  const filtered = issues.filter(issue => {
    if (issue.category !== 'Console Error') return true;
    // Check if this console error's summary references a dead button selector
    for (const sel of deadButtonSelectors) {
      if (issue.summary.includes(sel)) return false;
    }
    return true;
  });

  // SORT: high first, then medium, then low (within each priority, maintain insertion order)
  const highPriority = filtered.filter(i => i.priority === 'high');
  const mediumPriority = filtered.filter(i => i.priority === 'medium');
  const lowPriority = filtered.filter(i => i.priority === 'low');

  return [...highPriority, ...mediumPriority, ...lowPriority];
}

/**
 * Build a deduplication key for an issue based on its category.
 * Groups issues that represent the same underlying problem.
 */
function buildDedupKey(issue: PrioritizedIssue): string {
  switch (issue.category) {
    case 'Console Error':
      // Strip URLs and variable-specific details from summary for grouping
      const normalizedSummary = issue.summary
        .replace(/https?:\/\/[^\s)]+/g, '<URL>')
        .replace(/'[^']*'/g, "'...'");
      return `${issue.category}|${normalizedSummary}|${issue.location}`;
    case 'Dead Button':
      return `${issue.category}|${issue.summary}|${issue.location}`;
    case 'Broken Form':
      return `${issue.category}|${issue.location}`;
    case 'Accessibility':
      return `${issue.category}|${issue.summary}|${issue.location}`;
    case 'UI Issue':
      return `${issue.category}|${issue.summary}|${issue.location}`;
    case 'Workflow Error':
      return `${issue.category}|${issue.summary}|${issue.location}`;
    default:
      return `${issue.category}|${issue.summary}|${issue.location}`;
  }
}

const PRIORITY_RANK: Record<IssuePriority, number> = { high: 0, medium: 1, low: 2 };

/**
 * Deduplicate prioritized issues by grouping identical findings.
 * Within each group, keeps the highest-priority instance and annotates with occurrence count.
 * Returns a new array sorted by priority (high > medium > low).
 */
export function deduplicateIssues(issues: PrioritizedIssue[]): PrioritizedIssue[] {
  if (issues.length === 0) return [];

  const groups = new Map<string, { best: PrioritizedIssue; count: number }>();

  for (const issue of issues) {
    const key = buildDedupKey(issue);
    const existing = groups.get(key);

    if (existing) {
      existing.count++;
      // Keep the higher-priority instance
      if (PRIORITY_RANK[issue.priority] < PRIORITY_RANK[existing.best.priority]) {
        existing.best = issue;
      }
    } else {
      groups.set(key, { best: issue, count: 1 });
    }
  }

  // Build result with occurrence counts (only set when > 1)
  const deduped: PrioritizedIssue[] = [];
  for (const { best, count } of groups.values()) {
    deduped.push({
      ...best,
      occurrenceCount: count > 1 ? count : undefined,
    });
  }

  // Re-sort by priority
  const high = deduped.filter(i => i.priority === 'high');
  const medium = deduped.filter(i => i.priority === 'medium');
  const low = deduped.filter(i => i.priority === 'low');

  return [...high, ...medium, ...low];
}
