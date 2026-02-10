// Unit tests for the error analyzer's pattern-matching fallback path
import { describe, it, expect } from 'vitest';
import { analyzeErrors } from '../../src/analysis/error-analyzer.js';
import type { ExecutionArtifact } from '../../src/types/execution.js';

/** Helper: build a minimal ExecutionArtifact */
function makeArtifact(overrides: Partial<ExecutionArtifact> = {}): ExecutionArtifact {
  return {
    version: '1',
    stage: 'test',
    timestamp: new Date().toISOString(),
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

// All tests run WITHOUT apiKey to exercise the fallback pattern-matching path

describe('analyzeErrors (pattern-matching fallback)', () => {
  it('returns empty array when no errors exist', async () => {
    const result = await analyzeErrors(makeArtifact());
    expect(result).toEqual([]);
  });

  it('diagnoses TypeError in failed step', async () => {
    const artifact = makeArtifact({
      workflowResults: [
        {
          workflowName: 'Login',
          description: '',
          totalSteps: 1,
          passedSteps: 0,
          failedSteps: 1,
          skippedSteps: 0,
          stepResults: [
            {
              stepIndex: 0,
              action: 'click',
              selector: '#btn',
              status: 'failed',
              duration: 100,
              error: 'TypeError: Cannot read properties of null',
            },
          ],
          errors: { consoleErrors: [], networkFailures: [], brokenImages: [] },
          overallStatus: 'failed',
          duration: 100,
        },
      ],
    });

    const result = await analyzeErrors(artifact);
    expect(result.length).toBeGreaterThanOrEqual(1);

    const typeError = result.find(e => e.errorType === 'javascript');
    expect(typeError).toBeDefined();
    // Summary should mention null/undefined or property access issue
    expect(typeError!.summary.toLowerCase()).toMatch(/null|exist|property/);
    expect(typeError!.confidence).toBe('medium');
  });

  it('diagnoses ReferenceError in failed step', async () => {
    const artifact = makeArtifact({
      workflowResults: [
        {
          workflowName: 'Browse',
          description: '',
          totalSteps: 1,
          passedSteps: 0,
          failedSteps: 1,
          skippedSteps: 0,
          stepResults: [
            {
              stepIndex: 0,
              action: 'click',
              selector: '#x',
              status: 'failed',
              duration: 50,
              error: 'ReferenceError: foo is not defined',
            },
          ],
          errors: { consoleErrors: [], networkFailures: [], brokenImages: [] },
          overallStatus: 'failed',
          duration: 50,
        },
      ],
    });

    const result = await analyzeErrors(artifact);
    const refError = result.find(e => e.errorType === 'javascript');
    expect(refError).toBeDefined();
    expect(refError!.summary).toContain('defined');
  });

  it('diagnoses network/fetch error in failed step', async () => {
    const artifact = makeArtifact({
      workflowResults: [
        {
          workflowName: 'API',
          description: '',
          totalSteps: 1,
          passedSteps: 0,
          failedSteps: 1,
          skippedSteps: 0,
          stepResults: [
            {
              stepIndex: 0,
              action: 'click',
              selector: '#submit',
              status: 'failed',
              duration: 200,
              error: 'NetworkError: Failed to fetch',
            },
          ],
          errors: { consoleErrors: [], networkFailures: [], brokenImages: [] },
          overallStatus: 'failed',
          duration: 200,
        },
      ],
    });

    const result = await analyzeErrors(artifact);
    const netError = result.find(e => e.errorType === 'network');
    expect(netError).toBeDefined();
    expect(netError!.summary).toContain('connect');
  });

  it('falls back to "unknown" for unrecognized errors', async () => {
    const artifact = makeArtifact({
      workflowResults: [
        {
          workflowName: 'Unknown',
          description: '',
          totalSteps: 1,
          passedSteps: 0,
          failedSteps: 1,
          skippedSteps: 0,
          stepResults: [
            {
              stepIndex: 0,
              action: 'click',
              selector: '#x',
              status: 'failed',
              duration: 10,
              error: 'Something completely unexpected happened',
            },
          ],
          errors: { consoleErrors: [], networkFailures: [], brokenImages: [] },
          overallStatus: 'failed',
          duration: 10,
        },
      ],
    });

    const result = await analyzeErrors(artifact);
    const unknown = result.find(e => e.errorType === 'unknown');
    expect(unknown).toBeDefined();
    // Confidence for unknown errors was upgraded to 'medium' (don't undersell severity)
    expect(unknown!.confidence).toBe('medium');
  });

  it('diagnoses 404 network failures', async () => {
    const artifact = makeArtifact({
      workflowResults: [
        {
          workflowName: 'Browse',
          description: '',
          totalSteps: 0,
          passedSteps: 0,
          failedSteps: 0,
          skippedSteps: 0,
          stepResults: [],
          errors: {
            consoleErrors: [],
            networkFailures: [
              { url: 'https://example.com/api/data', status: 404, method: 'GET', resourceType: 'fetch' },
            ],
            brokenImages: [],
          },
          overallStatus: 'passed',
          duration: 100,
        },
      ],
    });

    const result = await analyzeErrors(artifact);
    const notFound = result.find(e => e.summary.includes('not found'));
    expect(notFound).toBeDefined();
    expect(notFound!.errorType).toBe('network');
    expect(notFound!.confidence).toBe('high');
  });

  it('diagnoses 500 server errors', async () => {
    const artifact = makeArtifact({
      workflowResults: [
        {
          workflowName: 'API',
          description: '',
          totalSteps: 0,
          passedSteps: 0,
          failedSteps: 0,
          skippedSteps: 0,
          stepResults: [],
          errors: {
            consoleErrors: [],
            networkFailures: [
              { url: 'https://example.com/api/submit', status: 500, method: 'POST', resourceType: 'fetch' },
            ],
            brokenImages: [],
          },
          overallStatus: 'passed',
          duration: 100,
        },
      ],
    });

    const result = await analyzeErrors(artifact);
    const serverErr = result.find(e => e.summary.includes('Server error'));
    expect(serverErr).toBeDefined();
    expect(serverErr!.confidence).toBe('high');
  });

  it('diagnoses 401 authentication errors', async () => {
    const artifact = makeArtifact({
      workflowResults: [
        {
          workflowName: 'Auth',
          description: '',
          totalSteps: 0,
          passedSteps: 0,
          failedSteps: 0,
          skippedSteps: 0,
          stepResults: [],
          errors: {
            consoleErrors: [],
            networkFailures: [
              { url: 'https://example.com/api/me', status: 401, method: 'GET', resourceType: 'fetch' },
            ],
            brokenImages: [],
          },
          overallStatus: 'passed',
          duration: 100,
        },
      ],
    });

    const result = await analyzeErrors(artifact);
    const authErr = result.find(e => e.summary.includes('Authentication'));
    expect(authErr).toBeDefined();
    expect(authErr!.errorType).toBe('authentication');
  });

  it('diagnoses 403 forbidden errors', async () => {
    const artifact = makeArtifact({
      workflowResults: [
        {
          workflowName: 'Access',
          description: '',
          totalSteps: 0,
          passedSteps: 0,
          failedSteps: 0,
          skippedSteps: 0,
          stepResults: [],
          errors: {
            consoleErrors: [],
            networkFailures: [
              { url: 'https://example.com/admin', status: 403, method: 'GET', resourceType: 'document' },
            ],
            brokenImages: [],
          },
          overallStatus: 'passed',
          duration: 100,
        },
      ],
    });

    const result = await analyzeErrors(artifact);
    const forbidden = result.find(e => e.summary.includes('Permission'));
    expect(forbidden).toBeDefined();
    expect(forbidden!.errorType).toBe('authentication');
  });

  it('does not inject dead buttons (handled by priority-ranker)', async () => {
    const artifact = makeArtifact({
      deadButtons: [
        { isDead: true, selector: '#ghost-btn', reason: 'No handler' },
      ],
    });

    const result = await analyzeErrors(artifact);
    expect(result).toHaveLength(0);
  });

  it('does not inject broken forms (handled by priority-ranker)', async () => {
    const artifact = makeArtifact({
      brokenForms: [
        { isBroken: true, formSelector: '#login-form', reason: 'No action', filledFields: 3, skippedFields: 1 },
      ],
    });

    const result = await analyzeErrors(artifact);
    expect(result).toHaveLength(0);
  });

  it('ignores non-dead buttons and non-broken forms', async () => {
    const artifact = makeArtifact({
      deadButtons: [{ isDead: false, selector: '#ok-btn' }],
      brokenForms: [{ isBroken: false, formSelector: '#ok-form', filledFields: 2, skippedFields: 0 }],
    });

    const result = await analyzeErrors(artifact);
    expect(result).toHaveLength(0);
  });

  it('diagnoses broken images', async () => {
    const artifact = makeArtifact({
      workflowResults: [
        {
          workflowName: 'Images',
          description: '',
          totalSteps: 0,
          passedSteps: 0,
          failedSteps: 0,
          skippedSteps: 0,
          stepResults: [],
          errors: {
            consoleErrors: [],
            networkFailures: [],
            brokenImages: [
              { url: 'https://example.com/logo.png', selector: 'img.logo', status: 404 },
            ],
          },
          overallStatus: 'passed',
          duration: 100,
        },
      ],
    });

    const result = await analyzeErrors(artifact);
    const imgError = result.find(e => e.summary.toLowerCase().includes('image'));
    expect(imgError).toBeDefined();
    expect(imgError!.errorType).toBe('network');
  });

  it('diagnoses console errors from workflows', async () => {
    const artifact = makeArtifact({
      workflowResults: [
        {
          workflowName: 'Browse',
          description: '',
          totalSteps: 0,
          passedSteps: 0,
          failedSteps: 0,
          skippedSteps: 0,
          stepResults: [],
          errors: {
            consoleErrors: [
              { message: 'TypeError: undefined is not a function', url: 'https://example.com', timestamp: '' },
            ],
            networkFailures: [],
            brokenImages: [],
          },
          overallStatus: 'passed',
          duration: 100,
        },
      ],
    });

    const result = await analyzeErrors(artifact);
    const consoleErr = result.find(e => e.errorType === 'javascript');
    expect(consoleErr).toBeDefined();
  });

  // Spec 2B: SyntaxError and RangeError patterns
  it('diagnoses SyntaxError in console errors', async () => {
    const artifact = makeArtifact({
      workflowResults: [
        {
          workflowName: 'Browse',
          description: '',
          totalSteps: 0,
          passedSteps: 0,
          failedSteps: 0,
          skippedSteps: 0,
          stepResults: [],
          errors: {
            consoleErrors: [
              { message: "SyntaxError: Unexpected token '<'", url: 'https://example.com', timestamp: '' },
            ],
            networkFailures: [],
            brokenImages: [],
          },
          overallStatus: 'passed',
          duration: 100,
        },
      ],
    });

    const result = await analyzeErrors(artifact);
    const syntaxErr = result.find(e => e.errorType === 'javascript' && e.summary.includes('syntax'));
    expect(syntaxErr).toBeDefined();
    expect(syntaxErr!.confidence).toBe('medium');
  });

  it('diagnoses RangeError in console errors', async () => {
    const artifact = makeArtifact({
      workflowResults: [
        {
          workflowName: 'Browse',
          description: '',
          totalSteps: 0,
          passedSteps: 0,
          failedSteps: 0,
          skippedSteps: 0,
          stepResults: [],
          errors: {
            consoleErrors: [
              { message: 'RangeError: Maximum call stack size exceeded', url: 'https://example.com', timestamp: '' },
            ],
            networkFailures: [],
            brokenImages: [],
          },
          overallStatus: 'passed',
          duration: 100,
        },
      ],
    });

    const result = await analyzeErrors(artifact);
    const rangeErr = result.find(e => e.errorType === 'javascript' && e.summary.includes('infinite loop'));
    expect(rangeErr).toBeDefined();
    expect(rangeErr!.confidence).toBe('medium');
  });

  it('diagnoses SyntaxError in failed steps', async () => {
    const artifact = makeArtifact({
      workflowResults: [
        {
          workflowName: 'Parse',
          description: '',
          totalSteps: 1,
          passedSteps: 0,
          failedSteps: 1,
          skippedSteps: 0,
          stepResults: [
            {
              stepIndex: 0,
              action: 'click',
              selector: '#btn',
              status: 'failed',
              duration: 50,
              error: "Uncaught SyntaxError: Unexpected end of input",
            },
          ],
          errors: { consoleErrors: [], networkFailures: [], brokenImages: [] },
          overallStatus: 'failed',
          duration: 50,
        },
      ],
    });

    const result = await analyzeErrors(artifact);
    const syntaxErr = result.find(e => e.errorType === 'javascript');
    expect(syntaxErr).toBeDefined();
    expect(syntaxErr!.summary).toContain('syntax');
  });

  it('diagnoses RangeError in failed steps', async () => {
    const artifact = makeArtifact({
      workflowResults: [
        {
          workflowName: 'Recurse',
          description: '',
          totalSteps: 1,
          passedSteps: 0,
          failedSteps: 1,
          skippedSteps: 0,
          stepResults: [
            {
              stepIndex: 0,
              action: 'click',
              selector: '#loop',
              status: 'failed',
              duration: 50,
              error: 'RangeError: Maximum call stack size exceeded',
            },
          ],
          errors: { consoleErrors: [], networkFailures: [], brokenImages: [] },
          overallStatus: 'failed',
          duration: 50,
        },
      ],
    });

    const result = await analyzeErrors(artifact);
    const rangeErr = result.find(e => e.errorType === 'javascript');
    expect(rangeErr).toBeDefined();
    expect(rangeErr!.summary).toContain('infinite loop');
  });

  // Spec 2C: Surface original error messages in fallback
  it('surfaces original error text in fallback summary (not generic message)', async () => {
    const artifact = makeArtifact({
      workflowResults: [
        {
          workflowName: 'Unknown',
          description: '',
          totalSteps: 1,
          passedSteps: 0,
          failedSteps: 1,
          skippedSteps: 0,
          stepResults: [
            {
              stepIndex: 0,
              action: 'click',
              selector: '#x',
              status: 'failed',
              duration: 10,
              error: 'Something completely unexpected happened',
            },
          ],
          errors: { consoleErrors: [], networkFailures: [], brokenImages: [] },
          overallStatus: 'failed',
          duration: 10,
        },
      ],
    });

    const result = await analyzeErrors(artifact);
    const unknown = result.find(e => e.errorType === 'unknown');
    expect(unknown).toBeDefined();
    // Summary should contain the actual error text, not the old generic message
    expect(unknown!.summary).toContain('Something completely unexpected happened');
    expect(unknown!.summary).not.toContain('AI diagnosis unavailable');
  });

  it('truncates long error messages in fallback summary to 150 chars', async () => {
    const longMessage = 'A'.repeat(300);
    const artifact = makeArtifact({
      workflowResults: [
        {
          workflowName: 'Long',
          description: '',
          totalSteps: 1,
          passedSteps: 0,
          failedSteps: 1,
          skippedSteps: 0,
          stepResults: [
            {
              stepIndex: 0,
              action: 'click',
              selector: '#x',
              status: 'failed',
              duration: 10,
              error: longMessage,
            },
          ],
          errors: { consoleErrors: [], networkFailures: [], brokenImages: [] },
          overallStatus: 'failed',
          duration: 10,
        },
      ],
    });

    const result = await analyzeErrors(artifact);
    const err = result.find(e => e.errorType === 'unknown');
    expect(err).toBeDefined();
    expect(err!.summary.length).toBeLessThanOrEqual(150);
    expect(err!.summary).toContain('...');
  });

  it('handles empty error message in fallback gracefully', async () => {
    const artifact = makeArtifact({
      workflowResults: [
        {
          workflowName: 'Empty',
          description: '',
          totalSteps: 1,
          passedSteps: 0,
          failedSteps: 1,
          skippedSteps: 0,
          stepResults: [
            {
              stepIndex: 0,
              action: 'click',
              selector: '#x',
              status: 'failed',
              duration: 10,
              error: '   ',
            },
          ],
          errors: { consoleErrors: [], networkFailures: [], brokenImages: [] },
          overallStatus: 'failed',
          duration: 10,
        },
      ],
    });

    const result = await analyzeErrors(artifact);
    const err = result.find(e => e.errorType === 'unknown');
    expect(err).toBeDefined();
    expect(err!.summary).toBe('An unknown error occurred');
  });

  // Spec 2D: Page URL attribution
  it('populates pageUrl for console errors in fallback diagnosis', async () => {
    const artifact = makeArtifact({
      workflowResults: [
        {
          workflowName: 'Browse',
          description: '',
          totalSteps: 0,
          passedSteps: 0,
          failedSteps: 0,
          skippedSteps: 0,
          stepResults: [],
          errors: {
            consoleErrors: [
              { message: 'TypeError: x is undefined', url: 'https://example.com/about', timestamp: '' },
            ],
            networkFailures: [],
            brokenImages: [],
          },
          overallStatus: 'passed',
          duration: 100,
        },
      ],
    });

    const result = await analyzeErrors(artifact);
    expect(result[0].pageUrl).toBe('https://example.com/about');
  });

  it('populates pageUrl for network failures in fallback diagnosis', async () => {
    const artifact = makeArtifact({
      workflowResults: [
        {
          workflowName: 'Browse',
          description: '',
          totalSteps: 0,
          passedSteps: 0,
          failedSteps: 0,
          skippedSteps: 0,
          stepResults: [],
          errors: {
            consoleErrors: [],
            networkFailures: [
              { url: 'https://example.com/api/data', status: 404, method: 'GET', resourceType: 'fetch' },
            ],
            brokenImages: [],
          },
          overallStatus: 'passed',
          duration: 100,
        },
      ],
    });

    const result = await analyzeErrors(artifact);
    expect(result[0].pageUrl).toBe('https://example.com/api/data');
  });

  it('populates pageUrl for broken images in fallback diagnosis', async () => {
    const artifact = makeArtifact({
      workflowResults: [
        {
          workflowName: 'Images',
          description: '',
          totalSteps: 0,
          passedSteps: 0,
          failedSteps: 0,
          skippedSteps: 0,
          stepResults: [],
          errors: {
            consoleErrors: [],
            networkFailures: [],
            brokenImages: [
              { url: 'https://example.com/logo.png', selector: 'img.logo', status: 404 },
            ],
          },
          overallStatus: 'passed',
          duration: 100,
        },
      ],
    });

    const result = await analyzeErrors(artifact);
    const imgErr = result.find(e => e.summary.toLowerCase().includes('image'));
    expect(imgErr).toBeDefined();
    expect(imgErr!.pageUrl).toBe('https://example.com/logo.png');
  });

  // ─── New pattern-match tests: CORS, SecurityError, CSP, Deprecation ──────

  it('diagnoses CORS errors in console messages', async () => {
    const artifact = makeArtifact({
      workflowResults: [
        {
          workflowName: 'API',
          description: '',
          totalSteps: 0,
          passedSteps: 0,
          failedSteps: 0,
          skippedSteps: 0,
          stepResults: [],
          errors: {
            consoleErrors: [
              // Note: avoid "fetch" in message since it matches the generic network pattern first
              { message: 'Request has been blocked by CORS policy: No Access-Control-Allow-Origin header is present', url: 'https://example.com', timestamp: '' },
            ],
            networkFailures: [],
            brokenImages: [],
          },
          overallStatus: 'passed',
          duration: 100,
        },
      ],
    });

    const result = await analyzeErrors(artifact);
    const corsErr = result.find(e => e.summary.toLowerCase().includes('cors'));
    expect(corsErr).toBeDefined();
    expect(corsErr!.errorType).toBe('network');
    expect(corsErr!.confidence).toBe('high');
  });

  it('diagnoses cross-origin errors in failed steps', async () => {
    const artifact = makeArtifact({
      workflowResults: [
        {
          workflowName: 'Submit',
          description: '',
          totalSteps: 1,
          passedSteps: 0,
          failedSteps: 1,
          skippedSteps: 0,
          stepResults: [
            {
              stepIndex: 0,
              action: 'click',
              selector: '#submit',
              status: 'failed',
              duration: 100,
              error: 'Cross-origin request blocked',
            },
          ],
          errors: { consoleErrors: [], networkFailures: [], brokenImages: [] },
          overallStatus: 'failed',
          duration: 100,
        },
      ],
    });

    const result = await analyzeErrors(artifact);
    const corsErr = result.find(e => e.summary.toLowerCase().includes('cors') || e.summary.toLowerCase().includes('cross-origin'));
    expect(corsErr).toBeDefined();
    expect(corsErr!.errorType).toBe('network');
  });

  it('diagnoses mixed content / SecurityError', async () => {
    const artifact = makeArtifact({
      workflowResults: [
        {
          workflowName: 'Browse',
          description: '',
          totalSteps: 0,
          passedSteps: 0,
          failedSteps: 0,
          skippedSteps: 0,
          stepResults: [],
          errors: {
            consoleErrors: [
              { message: 'Mixed Content: The page was loaded over HTTPS, but requested an insecure resource', url: 'https://example.com', timestamp: '' },
            ],
            networkFailures: [],
            brokenImages: [],
          },
          overallStatus: 'passed',
          duration: 100,
        },
      ],
    });

    const result = await analyzeErrors(artifact);
    const secErr = result.find(e => e.summary.toLowerCase().includes('security'));
    expect(secErr).toBeDefined();
    expect(secErr!.errorType).toBe('network');
    expect(secErr!.confidence).toBe('high');
  });

  it('diagnoses Content Security Policy violations', async () => {
    const artifact = makeArtifact({
      workflowResults: [
        {
          workflowName: 'Browse',
          description: '',
          totalSteps: 0,
          passedSteps: 0,
          failedSteps: 0,
          skippedSteps: 0,
          stepResults: [],
          errors: {
            consoleErrors: [
              { message: "Refused to execute inline script because it violates the Content Security Policy", url: 'https://example.com', timestamp: '' },
            ],
            networkFailures: [],
            brokenImages: [],
          },
          overallStatus: 'passed',
          duration: 100,
        },
      ],
    });

    const result = await analyzeErrors(artifact);
    const cspErr = result.find(e => e.summary.toLowerCase().includes('security policy') || e.summary.toLowerCase().includes('content blocked'));
    expect(cspErr).toBeDefined();
    expect(cspErr!.errorType).toBe('network');
  });

  it('diagnoses deprecation warnings', async () => {
    const artifact = makeArtifact({
      workflowResults: [
        {
          workflowName: 'Browse',
          description: '',
          totalSteps: 0,
          passedSteps: 0,
          failedSteps: 0,
          skippedSteps: 0,
          stepResults: [],
          errors: {
            consoleErrors: [
              { message: '[Deprecation] document.write() is deprecated and will be removed in a future version', url: 'https://example.com', timestamp: '' },
            ],
            networkFailures: [],
            brokenImages: [],
          },
          overallStatus: 'passed',
          duration: 100,
        },
      ],
    });

    const result = await analyzeErrors(artifact);
    const deprecErr = result.find(e => e.summary.toLowerCase().includes('deprecated'));
    expect(deprecErr).toBeDefined();
    expect(deprecErr!.errorType).toBe('javascript');
  });

  it('skips failed steps that have no error message', async () => {
    const artifact = makeArtifact({
      workflowResults: [
        {
          workflowName: 'Empty',
          description: '',
          totalSteps: 1,
          passedSteps: 0,
          failedSteps: 1,
          skippedSteps: 0,
          stepResults: [
            {
              stepIndex: 0,
              action: 'click',
              selector: '#x',
              status: 'failed',
              duration: 10,
              // no error field
            },
          ],
          errors: { consoleErrors: [], networkFailures: [], brokenImages: [] },
          overallStatus: 'failed',
          duration: 10,
        },
      ],
    });

    const result = await analyzeErrors(artifact);
    // Should not crash, should just produce no diagnoses for that step
    expect(result).toHaveLength(0);
  });
});
