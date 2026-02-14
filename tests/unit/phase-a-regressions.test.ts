import { describe, it, expect, vi } from 'vitest';
import { executeStep, normalizeStepSelector } from '../../src/execution/step-handlers.js';
import { mergeDiscoveryBrokenLinks, recalculateExecutionSummary } from '../../src/core/engine.js';
import { createLinkValidationState, validateLinks } from '../../src/discovery/link-validator.js';
import { resolveWorkflowPlans } from '../../src/discovery/discovery-pipeline.js';
import type { ExecutionArtifact } from '../../src/types/execution.js';
import type { LinkInfo, WorkflowStep, SitemapNode } from '../../src/types/discovery.js';

function createMockPage(initialUrl = 'about:blank') {
  let currentUrl = initialUrl;

  const modalLocator = {
    isVisible: vi.fn().mockResolvedValue(false),
    click: vi.fn().mockResolvedValue(undefined),
    count: vi.fn().mockResolvedValue(0),
  };

  return {
    url: vi.fn(() => currentUrl),
    goto: vi.fn(async (url: string) => {
      currentUrl = url;
    }),
    click: vi.fn().mockResolvedValue(undefined),
    fill: vi.fn().mockResolvedValue(undefined),
    selectOption: vi.fn().mockResolvedValue(undefined),
    waitForSelector: vi.fn().mockResolvedValue(undefined),
    isVisible: vi.fn().mockResolvedValue(true),
    locator: vi.fn(() => ({
      first: () => modalLocator,
      count: vi.fn().mockResolvedValue(0),
    })),
    keyboard: {
      press: vi.fn().mockResolvedValue(undefined),
    },
  } as any;
}

function createMinimalSitemap(): SitemapNode {
  return {
    url: 'https://example.com',
    title: 'Home',
    path: '/',
    depth: 0,
    children: [],
    pageData: {
      url: 'https://example.com',
      title: 'Home',
      forms: [],
      buttons: [],
      links: [],
      menus: [],
      otherInteractive: [],
      crawledAt: new Date().toISOString(),
    },
  };
}

function makeLinks(offset: number, count = 60): LinkInfo[] {
  return Array.from({ length: count }, (_, index) => ({
    href: `https://8.8.8.8/page-${offset + index}`,
    text: `Link ${offset + index}`,
    isInternal: true,
  }));
}

describe('Phase A regressions', () => {
  it('normalizes legacy getBy selectors into Playwright-compatible selector engines', () => {
    expect(normalizeStepSelector(`getByRole('button', { name: 'Sign Up' })`)).toBe('role=button[name="Sign Up"]');
    expect(normalizeStepSelector(`getByLabel('Email')`)).toBe('label=Email');
    expect(normalizeStepSelector(`getByText('Pricing')`)).toBe('text=Pricing');
  });

  it('allows first navigation from about:blank when target stays on base origin', async () => {
    const page = createMockPage('about:blank');
    const step: WorkflowStep = {
      action: 'navigate',
      selector: 'https://example.com/login',
      expectedResult: 'Login page loads',
      confidence: 1,
    };

    const result = await executeStep(page, step, 0, 'https://example.com');

    expect(result.status).toBe('passed');
    expect(page.goto).toHaveBeenCalledWith(
      'https://example.com/login',
      expect.objectContaining({ waitUntil: 'domcontentloaded' })
    );
  });

  it('resolves relative navigate steps against base URL before validation', async () => {
    const page = createMockPage('about:blank');
    const step: WorkflowStep = {
      action: 'navigate',
      selector: '/pricing',
      expectedResult: 'Pricing page loads',
      confidence: 1,
    };

    const result = await executeStep(page, step, 0, 'https://example.com');

    expect(result.status).toBe('passed');
    expect(page.goto).toHaveBeenCalledWith(
      'https://example.com/pricing',
      expect.objectContaining({ waitUntil: 'domcontentloaded' })
    );
  });

  it('executes fill steps using normalized selector output', async () => {
    const page = createMockPage('https://example.com');
    const step: WorkflowStep = {
      action: 'fill',
      selector: `getByLabel('Email')`,
      value: 'user@example.com',
      expectedResult: 'Email field is filled',
      confidence: 1,
    };

    const result = await executeStep(page, step, 1, 'https://example.com');

    expect(result.status).toBe('passed');
    expect(page.fill).toHaveBeenCalledWith(
      'label=Email',
      'user@example.com',
      expect.objectContaining({ timeout: expect.any(Number) })
    );
  });

  it('skips submit click steps when submit control is missing', async () => {
    const page = createMockPage('https://example.com');
    const step: WorkflowStep = {
      action: 'click',
      selector: 'form:nth-of-type(1) button[type="submit"], form:nth-of-type(1) input[type="submit"], form:nth-of-type(1) button:not([type])',
      expectedResult: 'Form submits',
      confidence: 1,
    };

    const result = await executeStep(page, step, 2, 'https://example.com');

    expect(result.status).toBe('skipped');
    expect(result.error).toContain('Skipping submit click');
    expect(page.click).not.toHaveBeenCalled();
  });

  it('falls back to heuristic workflow plans when AI planning promise rejects', async () => {
    const sitemap = createMinimalSitemap();

    const resolution = await resolveWorkflowPlans(
      Promise.reject(new Error('AI planner failed')),
      sitemap
    );

    expect(resolution.usedHeuristicFallback).toBe(true);
    expect(resolution.workflowPlans.length).toBeGreaterThan(0);
  });

  it('merges discovery broken links and recomputes totals/exit code', () => {
    const artifact: ExecutionArtifact = {
      version: '1.0.0',
      stage: 'execution',
      timestamp: new Date().toISOString(),
      sessionId: 'phase-a-test',
      targetUrl: 'https://example.com',
      workflowResults: [{
        workflowName: 'Happy path',
        description: 'All good',
        totalSteps: 1,
        passedSteps: 1,
        failedSteps: 0,
        skippedSteps: 0,
        stepResults: [{
          stepIndex: 0,
          action: 'navigate',
          selector: 'https://example.com',
          status: 'passed',
          duration: 10,
        }],
        errors: {
          consoleErrors: [],
          networkFailures: [],
          brokenImages: [],
        },
        overallStatus: 'passed',
        duration: 100,
      }],
      pageAudits: [],
      deadButtons: [],
      brokenForms: [],
      brokenLinks: [],
      totalIssues: 0,
      exitCode: 0,
    };

    mergeDiscoveryBrokenLinks(artifact, [{
      url: 'https://example.com/missing',
      sourceUrl: 'https://example.com',
      statusCode: 404,
      statusText: 'Not Found',
    }]);
    mergeDiscoveryBrokenLinks(artifact, [{
      url: 'https://example.com/missing',
      sourceUrl: 'https://example.com',
      statusCode: 404,
      statusText: 'Not Found',
    }]);
    recalculateExecutionSummary(artifact);

    expect(artifact.brokenLinks).toHaveLength(1);
    expect(artifact.totalIssues).toBe(1);
    expect(artifact.exitCode).toBe(1);
  });

  it('does not bleed link validation cap across separate scan states', async () => {
    const requestGet = vi.fn(async (url: string) => ({
      status: () => 200,
      statusText: () => 'OK',
      url: () => url,
    }));

    const mockPage = {
      url: () => 'https://8.8.8.8/root',
      request: { get: requestGet },
    } as any;

    const firstScanState = createLinkValidationState();
    for (let run = 0; run < 10; run++) {
      await validateLinks(makeLinks(run * 100), mockPage, firstScanState);
    }
    expect(firstScanState.checkedCount).toBe(500);

    requestGet.mockClear();

    const secondScanState = createLinkValidationState();
    await validateLinks(makeLinks(9999), mockPage, secondScanState);

    expect(secondScanState.checkedCount).toBe(50);
    expect(requestGet).toHaveBeenCalledTimes(50);
  });
});
