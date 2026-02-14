// Unit tests for screenshot embedding in HTML report generation
import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { generateHtmlReport } from '../../src/reports/html-generator.js';
import type { ExecutionArtifact } from '../../src/types/execution.js';
import type { AnalysisArtifact } from '../../src/analysis/diagnosis-schema.js';

const TEST_SCREENSHOT = join(import.meta.dirname, 'fixtures', 'test-screenshot.png');

/** Helper: build a minimal ExecutionArtifact */
function makeExecArtifact(overrides: Partial<ExecutionArtifact> = {}): ExecutionArtifact {
  return {
    version: '1',
    stage: 'test',
    timestamp: '2026-02-08T12:00:00.000Z',
    sessionId: 'test-session',
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
    sessionId: 'test-session',
    diagnosedErrors: [],
    uiAudits: [],
    sourceAnalysisAvailable: false,
    aiPowered: false,
    ...overrides,
  };
}

describe('generateHtmlReport screenshot embedding', () => {
  it('includes screenshot img tag when screenshotRef points to valid file', async () => {
    const analysis = makeAnalysisArtifact({
      diagnosedErrors: [
        {
          summary: 'Navigation failed',
          rootCause: 'Page not found',
          errorType: 'navigation',
          confidence: 'high',
          suggestedFix: 'Check the URL',
          originalError: '404 page',
          screenshotRef: TEST_SCREENSHOT,
        },
      ],
    });

    const html = await generateHtmlReport(makeExecArtifact(), analysis);

    // The template should render an <img> with a base64 data URI
    expect(html).toContain('data:image/webp;base64,');
    expect(html).toContain('alt="Screenshot showing the issue"');
  });

  it('omits screenshot when screenshotRef is undefined', async () => {
    const analysis = makeAnalysisArtifact({
      diagnosedErrors: [
        {
          summary: 'Navigation failed',
          rootCause: 'Page not found',
          errorType: 'navigation',
          confidence: 'high',
          suggestedFix: 'Check the URL',
          originalError: '404 page',
          // No screenshotRef
        },
      ],
    });

    const html = await generateHtmlReport(makeExecArtifact(), analysis);

    // Should NOT contain screenshot img tag
    expect(html).not.toContain('data:image/webp;base64,');
    expect(html).not.toContain('alt="Screenshot showing the issue"');
    // But the issue itself should still render
    expect(html).toContain('Navigation failed');
  });

  it('omits screenshot when screenshotRef points to missing file', async () => {
    const analysis = makeAnalysisArtifact({
      diagnosedErrors: [
        {
          summary: 'Navigation failed',
          rootCause: 'Page not found',
          errorType: 'navigation',
          confidence: 'high',
          suggestedFix: 'Check the URL',
          originalError: '404 page',
          screenshotRef: '/nonexistent/path/screenshot.png',
        },
      ],
    });

    const html = await generateHtmlReport(makeExecArtifact(), analysis);

    // Should gracefully omit the screenshot
    expect(html).not.toContain('data:image/webp;base64,');
    expect(html).not.toContain('alt="Screenshot showing the issue"');
    // Issue should still render
    expect(html).toContain('Navigation failed');
  });
});
