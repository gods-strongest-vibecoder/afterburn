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
    expect(typeError!.summary).toContain('exist');
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
    expect(unknown!.confidence).toBe('low');
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

  it('diagnoses dead buttons as dom errors', async () => {
    const artifact = makeArtifact({
      deadButtons: [
        { isDead: true, selector: '#ghost-btn', reason: 'No handler' },
      ],
    });

    const result = await analyzeErrors(artifact);
    expect(result).toHaveLength(1);
    expect(result[0].errorType).toBe('dom');
    expect(result[0].summary).toContain('ghost-btn');
  });

  it('diagnoses broken forms as form errors', async () => {
    const artifact = makeArtifact({
      brokenForms: [
        { isBroken: true, formSelector: '#login-form', reason: 'No action', filledFields: 3, skippedFields: 1 },
      ],
    });

    const result = await analyzeErrors(artifact);
    expect(result).toHaveLength(1);
    expect(result[0].errorType).toBe('form');
    expect(result[0].summary).toContain('login-form');
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
    const imgError = result.find(e => e.summary.includes('image'));
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
