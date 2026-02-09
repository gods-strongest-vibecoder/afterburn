// Categorize and prioritize issues from diagnosed errors, UI audits, and execution results

import { DiagnosedError, UIAuditResult } from '../analysis/diagnosis-schema.js';
import { ExecutionArtifact } from '../types/execution.js';

/**
 * Convert raw Playwright selectors into human-readable button labels.
 * e.g. 'button:has-text("Subscribe")' → '"Subscribe" button'
 *      'form:nth-of-type(1) [type="submit"]' → 'Submit button'
 */
function humanizeSelector(selector: string): string {
  // Extract button text from :has-text("...") patterns
  const hasTextMatch = selector.match(/:?has-text\("([^"]+)"\)/);
  if (hasTextMatch) return `"${hasTextMatch[1]}" button`;

  // Identify submit buttons
  if (selector.includes('[type="submit"]')) {
    const formMatch = selector.match(/form#([\w-]+)/);
    if (formMatch) return `Submit button (${formMatch[1].replace(/-/g, ' ')} form)`;
    return 'Submit button';
  }

  // Keep simple IDs as-is (e.g. #submit-btn)
  if (/^#[\w-]+$/.test(selector)) return selector;

  // Generic fallback
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
        summary: `${humanizeSelector(deadButton.selector)} doesn't do anything when clicked`,
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

  // SORT: high first, then medium, then low (within each priority, maintain insertion order)
  const highPriority = issues.filter(i => i.priority === 'high');
  const mediumPriority = issues.filter(i => i.priority === 'medium');
  const lowPriority = issues.filter(i => i.priority === 'low');

  return [...highPriority, ...mediumPriority, ...lowPriority];
}

/**
 * Extract a resource URL from technicalDetails if present (e.g., "HTTP 404: http://...").
 * Returns the URL if found, undefined otherwise.
 */
function extractResourceUrl(issue: PrioritizedIssue): string | undefined {
  if (!issue.technicalDetails) return undefined;
  const match = issue.technicalDetails.match(/https?:\/\/[^\s)]+/);
  return match?.[0];
}

/**
 * Build a deduplication key for an issue based on its category.
 * Groups issues that represent the same underlying problem, even across different pages.
 */
function buildDedupKey(issue: PrioritizedIssue): string {
  switch (issue.category) {
    case 'Console Error': {
      // For network errors with a specific resource URL (e.g., "HTTP 404: http://..."),
      // deduplicate by the resource URL alone — the same broken resource on multiple pages is one issue.
      const resourceUrl = extractResourceUrl(issue);
      if (resourceUrl) {
        return `${issue.category}|resource:${resourceUrl}`;
      }
      // For other console errors, strip URLs and variable-specific details from summary for grouping
      const normalizedSummary = issue.summary
        .replace(/https?:\/\/[^\s)]+/g, '<URL>')
        .replace(/'[^']*'/g, "'...'");
      return `${issue.category}|${normalizedSummary}`;
    }
    case 'Dead Button':
      // Same button summary = same dead button, regardless of which page it was found on
      return `${issue.category}|${issue.summary}`;
    case 'Broken Form':
      return `${issue.category}|${issue.location}`;
    case 'Accessibility':
      // Same accessibility violation across pages = one issue (e.g., missing lang on every page)
      return `${issue.category}|${issue.summary}`;
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
 * When issues from different pages are merged, aggregates unique page locations.
 * Returns a new array sorted by priority (high > medium > low).
 */
export function deduplicateIssues(issues: PrioritizedIssue[]): PrioritizedIssue[] {
  if (issues.length === 0) return [];

  const groups = new Map<string, { best: PrioritizedIssue; count: number; locations: Set<string> }>();

  for (const issue of issues) {
    const key = buildDedupKey(issue);
    const existing = groups.get(key);

    if (existing) {
      existing.count++;
      existing.locations.add(issue.location);
      // Keep the higher-priority instance
      if (PRIORITY_RANK[issue.priority] < PRIORITY_RANK[existing.best.priority]) {
        existing.best = issue;
      }
    } else {
      groups.set(key, { best: issue, count: 1, locations: new Set([issue.location]) });
    }
  }

  // Build result with occurrence counts and aggregated locations
  const deduped: PrioritizedIssue[] = [];
  for (const { best, count, locations } of groups.values()) {
    const dedupedIssue = {
      ...best,
      occurrenceCount: count > 1 ? count : undefined,
    };
    // If the issue was found on multiple distinct pages, annotate the location
    if (locations.size > 1) {
      dedupedIssue.location = `${best.location} (and ${locations.size - 1} other page${locations.size - 1 > 1 ? 's' : ''})`;
    }
    deduped.push(dedupedIssue);
  }

  // Re-sort by priority
  const high = deduped.filter(i => i.priority === 'high');
  const medium = deduped.filter(i => i.priority === 'medium');
  const low = deduped.filter(i => i.priority === 'low');

  return [...high, ...medium, ...low];
}
