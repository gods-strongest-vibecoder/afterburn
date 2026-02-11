// Smoke tests for Markdown report generator — safety net for dedup input shape changes
import { describe, it, expect } from 'vitest';
import { generateMarkdownReport } from '../../src/reports/markdown-generator.js';
import type { ExecutionArtifact } from '../../src/types/execution.js';
import type { AnalysisArtifact } from '../../src/analysis/diagnosis-schema.js';

/** Helper: build a minimal ExecutionArtifact */
function makeExecArtifact(overrides: Partial<ExecutionArtifact> = {}): ExecutionArtifact {
  return {
    version: '1',
    stage: 'test',
    timestamp: '2026-02-08T12:00:00.000Z',
    sessionId: 'smoke-test-session',
    targetUrl: 'https://example.com',
    workflowResults: [],
    pageAudits: [],
    deadButtons: [],
    brokenForms: [],
    brokenLinks: [],
    totalIssues: 0,
    exitCode: 0,
    ...overrides,
  };
}

/** Helper: build a minimal AnalysisArtifact */
function makeAnalysisArtifact(overrides: Partial<AnalysisArtifact> = {}): AnalysisArtifact {
  return {
    version: '1',
    stage: 'analysis',
    timestamp: '2026-02-08T12:00:00.000Z',
    sessionId: 'smoke-test-session',
    diagnosedErrors: [],
    uiAudits: [],
    sourceAnalysisAvailable: false,
    aiPowered: false,
    ...overrides,
  };
}

describe('generateMarkdownReport', () => {
  it('generates valid report structure with empty input', () => {
    const report = generateMarkdownReport(makeExecArtifact(), makeAnalysisArtifact());

    // YAML frontmatter present
    expect(report).toMatch(/^---\n/);
    expect(report).toMatch(/\n---\n/);

    // Key sections present
    expect(report).toContain('# Afterburn Test Report');
    expect(report).toContain('## Summary');
    expect(report).toContain('## Issues (Prioritized)');
    expect(report).toContain('## Issue Details');
    expect(report).toContain('## Reproduction Steps');
    expect(report).toContain('## Accessibility');

    // Empty state messages
    expect(report).toContain('No issues found.');
    expect(report).toContain('No errors diagnosed.');
    expect(report).toContain('All workflows passed successfully.');
  });

  it('renders YAML frontmatter with correct fields', () => {
    const report = generateMarkdownReport(
      makeExecArtifact({ totalIssues: 5 }),
      makeAnalysisArtifact({ aiPowered: true, sourceAnalysisAvailable: true }),
    );

    // Extract frontmatter between --- markers
    const frontmatter = report.split('---')[1];

    expect(frontmatter).toContain('tool: afterburn');
    expect(frontmatter).toContain('session_id:');
    expect(frontmatter).toContain('health_score:');
    expect(frontmatter).toContain('health_label:');
    // total_issues reflects deduplicated prioritized count (0 here since no diagnosed errors provided)
    expect(frontmatter).toContain('total_issues: 0');
    expect(frontmatter).toContain('ai_powered: true');
    expect(frontmatter).toContain('source_analysis: true');
  });

  it('renders issue table with a diagnosed error', () => {
    const exec = makeExecArtifact({ totalIssues: 1 });
    const analysis = makeAnalysisArtifact({
      diagnosedErrors: [
        {
          summary: 'Button click handler is missing',
          rootCause: 'No event listener attached',
          errorType: 'dom',
          confidence: 'high',
          suggestedFix: 'Add click event listener to button element',
          originalError: 'Element not interactive',
        },
      ],
    });

    const report = generateMarkdownReport(exec, analysis);

    // Issue table header
    expect(report).toContain('| # | Priority | Category | Summary | Location |');
    // Issue row contains the summary
    expect(report).toContain('Button click handler is missing');
    // Technical details section renders
    expect(report).toContain('### 1. Button click handler is missing');
    expect(report).toContain('**Root Cause:** No event listener attached');
    expect(report).toContain('**Suggested Fix:** Add click event listener to button element');
  });

  it('renders summary table with workflow and issue counts', () => {
    const exec = makeExecArtifact({
      totalIssues: 12,
      workflowResults: [
        {
          workflowName: 'Login',
          description: 'Test login flow',
          totalSteps: 3,
          passedSteps: 3,
          failedSteps: 0,
          skippedSteps: 0,
          stepResults: [],
          errors: { consoleErrors: [], networkFailures: [], brokenImages: [] },
          overallStatus: 'passed',
          duration: 1500,
        },
        {
          workflowName: 'Checkout',
          description: 'Test checkout flow',
          totalSteps: 4,
          passedSteps: 2,
          failedSteps: 2,
          skippedSteps: 0,
          stepResults: [],
          errors: { consoleErrors: [], networkFailures: [], brokenImages: [] },
          overallStatus: 'failed',
          duration: 2000,
        },
      ],
      deadButtons: [
        { isDead: true, selector: '#ghost', reason: 'No handler' },
        { isDead: false, selector: '#ok' },
      ],
      brokenForms: [
        { isBroken: true, formSelector: '#form1', reason: 'No action', filledFields: 2, skippedFields: 0 },
      ],
    });

    const report = generateMarkdownReport(exec, makeAnalysisArtifact());

    expect(report).toContain('| Workflows Tested | 2 |');
    expect(report).toContain('| Workflows Passed | 1 |');
    expect(report).toContain('| Workflows Failed | 1 |');
    // Total Issues reflects deduplicated prioritized count (2: 1 dead button + 1 broken form)
    expect(report).toContain('| Total Issues | 2 |');
    expect(report).toContain('| Dead Buttons | 1 |');
    expect(report).toContain('| Broken Forms | 1 |');
  });

  it('renders accessibility summary with violation counts', () => {
    const exec = makeExecArtifact({
      pageAudits: [
        {
          url: 'https://example.com',
          accessibility: {
            url: 'https://example.com',
            violationCount: 2,
            violations: [
              { id: 'color-contrast', impact: 'critical', description: 'Low contrast text', nodes: 3, helpUrl: 'https://axe.com/contrast' },
              { id: 'image-alt', impact: 'serious', description: 'Missing alt text', nodes: 1, helpUrl: 'https://axe.com/alt' },
            ],
            passes: 10,
            incomplete: 0,
          },
        },
      ],
    });

    const report = generateMarkdownReport(exec, makeAnalysisArtifact());

    // Accessibility table headers
    expect(report).toContain('| Page | Critical | Serious | Moderate | Minor | Total |');
    // Violation counts in the row
    expect(report).toContain('| 1 |');  // 1 critical
    expect(report).toContain('| 2 |');  // 2 total
    // Top violations section
    expect(report).toContain('**Top Violations:**');
    expect(report).toContain('Low contrast text');
    expect(report).toContain('Missing alt text');
  });

  it('redacts sensitive query params in issue locations and accessibility URLs', () => {
    const exec = makeExecArtifact({
      pageAudits: [
        {
          url: 'https://example.com/page?token=secret123',
          accessibility: {
            url: 'https://example.com/page?token=secret123',
            violationCount: 1,
            violations: [
              {
                id: 'color-contrast',
                impact: 'critical',
                description: 'Low contrast',
                nodes: 1,
                helpUrl: 'https://docs.example.com/help?api_key=abc123',
              },
            ],
            passes: 0,
            incomplete: 0,
          },
        },
      ],
    });

    const analysis = makeAnalysisArtifact({
      diagnosedErrors: [
        {
          summary: 'Broken API call',
          rootCause: 'Token in URL',
          errorType: 'network',
          confidence: 'high',
          suggestedFix: 'Use auth headers',
          originalError: 'Request failed',
          sourceLocation: {
            file: 'src/app.ts',
            line: 12,
            column: 1,
            context: 'fetch("/api?token=secret123")',
            confidence: 0.9,
          },
        },
      ],
    });

    const report = generateMarkdownReport(exec, analysis);

    expect(report).toContain('token=%5BREDACTED%5D');
    expect(report).toContain('api_key=%5BREDACTED%5D');
    expect(report).not.toContain('secret123');
    expect(report).not.toContain('abc123');
  });
});
