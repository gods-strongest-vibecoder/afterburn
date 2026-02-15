// Unit tests for the priority issue ranker
import { describe, it, expect } from 'vitest';
import { prioritizeIssues, sanitizeIssueSummary, buildAccessibilityDetails, type PrioritizedIssue } from '../../src/reports/priority-ranker.js';
import type { DiagnosedError, UIAuditResult } from '../../src/analysis/diagnosis-schema.js';
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

describe('prioritizeIssues', () => {
  it('returns empty array when there are no issues', () => {
    const result = prioritizeIssues([], [], makeArtifact());
    expect(result).toEqual([]);
  });

  it('classifies navigation errors as HIGH priority', () => {
    const errors: DiagnosedError[] = [
      {
        summary: 'Page not found',
        rootCause: 'Missing route',
        errorType: 'navigation',
        confidence: 'high',
        suggestedFix: 'Add the route',
        originalError: '404 not found',
      },
    ];

    const result = prioritizeIssues(errors, [], makeArtifact());
    expect(result).toHaveLength(1);
    expect(result[0].priority).toBe('high');
    expect(result[0].category).toBe('Workflow Error');
  });

  it('classifies authentication errors as HIGH priority', () => {
    const errors: DiagnosedError[] = [
      {
        summary: 'Auth failed',
        rootCause: 'Bad token',
        errorType: 'authentication',
        confidence: 'high',
        suggestedFix: 'Fix auth',
        originalError: '401 unauthorized',
      },
    ];

    const result = prioritizeIssues(errors, [], makeArtifact());
    expect(result).toHaveLength(1);
    expect(result[0].priority).toBe('high');
  });

  it('classifies form errors as HIGH priority', () => {
    const errors: DiagnosedError[] = [
      {
        summary: 'Form broken',
        rootCause: 'No handler',
        errorType: 'form',
        confidence: 'high',
        suggestedFix: 'Add handler',
        originalError: 'form submit failed',
      },
    ];

    const result = prioritizeIssues(errors, [], makeArtifact());
    expect(result).toHaveLength(1);
    expect(result[0].priority).toBe('high');
  });

  it('classifies network errors as MEDIUM priority', () => {
    const errors: DiagnosedError[] = [
      {
        summary: 'API call failed',
        rootCause: 'Server down',
        errorType: 'network',
        confidence: 'medium',
        suggestedFix: 'Check server',
        originalError: 'fetch failed',
      },
    ];

    const result = prioritizeIssues(errors, [], makeArtifact());
    expect(result).toHaveLength(1);
    expect(result[0].priority).toBe('medium');
    expect(result[0].category).toBe('Console Error');
  });

  it('classifies javascript errors as HIGH priority (medium+ confidence)', () => {
    const errors: DiagnosedError[] = [
      {
        summary: 'TypeError',
        rootCause: 'Null ref',
        errorType: 'javascript',
        confidence: 'medium',
        suggestedFix: 'Null check',
        originalError: 'TypeError: cannot read null',
      },
    ];

    const result = prioritizeIssues(errors, [], makeArtifact());
    expect(result).toHaveLength(1);
    expect(result[0].priority).toBe('high');
  });

  it('classifies dom errors as LOW priority', () => {
    const errors: DiagnosedError[] = [
      {
        summary: 'DOM issue',
        rootCause: 'Missing element',
        errorType: 'dom',
        confidence: 'low',
        suggestedFix: 'Check selectors',
        originalError: 'element not found',
      },
    ];

    const result = prioritizeIssues(errors, [], makeArtifact());
    expect(result).toHaveLength(1);
    expect(result[0].priority).toBe('low');
  });

  it('classifies unknown errors as LOW priority', () => {
    const errors: DiagnosedError[] = [
      {
        summary: 'Unknown error',
        rootCause: 'Unknown',
        errorType: 'unknown',
        confidence: 'low',
        suggestedFix: 'Investigate',
        originalError: 'something happened',
      },
    ];

    const result = prioritizeIssues(errors, [], makeArtifact());
    expect(result).toHaveLength(1);
    expect(result[0].priority).toBe('low');
  });

  it('sorts issues: high first, then medium, then low', () => {
    const errors: DiagnosedError[] = [
      { summary: 'low', rootCause: '', errorType: 'dom', confidence: 'low', suggestedFix: '', originalError: '' },
      { summary: 'high', rootCause: '', errorType: 'navigation', confidence: 'high', suggestedFix: '', originalError: '' },
      { summary: 'medium', rootCause: '', errorType: 'network', confidence: 'medium', suggestedFix: '', originalError: '' },
    ];

    const result = prioritizeIssues(errors, [], makeArtifact());
    expect(result[0].priority).toBe('high');
    expect(result[1].priority).toBe('medium');
    expect(result[2].priority).toBe('low');
  });

  it('creates issues for dead buttons', () => {
    const artifact = makeArtifact({
      deadButtons: [
        { isDead: true, selector: '#submit-btn', reason: 'No click handler' },
        { isDead: false, selector: '#working-btn' },
      ],
    });

    const result = prioritizeIssues([], [], artifact);
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('Dead Button');
    expect(result[0].priority).toBe('high');
  });

  it('creates issues for broken forms', () => {
    const artifact = makeArtifact({
      brokenForms: [
        { isBroken: true, formSelector: '#login-form', reason: 'Submit failed', filledFields: 2, skippedFields: 0 },
      ],
    });

    const result = prioritizeIssues([], [], artifact);
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('Broken Form');
    expect(result[0].priority).toBe('high');
  });

  it('creates issues for high-severity UI layout issues', () => {
    const uiAudits: UIAuditResult[] = [
      {
        pageUrl: 'https://example.com',
        layoutIssues: [
          { description: 'Overlapping elements', severity: 'high', location: 'header' },
        ],
        contrastIssues: [],
        formattingIssues: [],
        improvements: [],
        overallScore: 'needs-work',
      },
    ];

    const result = prioritizeIssues([], uiAudits, makeArtifact());
    expect(result).toHaveLength(1);
    expect(result[0].priority).toBe('medium');
    expect(result[0].category).toBe('UI Issue');
  });

  it('creates LOW priority issues for medium/low severity layout issues', () => {
    const uiAudits: UIAuditResult[] = [
      {
        pageUrl: 'https://example.com',
        layoutIssues: [
          { description: 'Minor spacing', severity: 'medium', location: 'footer' },
          { description: 'Tiny gap', severity: 'low', location: 'sidebar' },
        ],
        contrastIssues: [],
        formattingIssues: [],
        improvements: [],
        overallScore: 'good',
      },
    ];

    const result = prioritizeIssues([], uiAudits, makeArtifact());
    expect(result).toHaveLength(2);
    expect(result.every(i => i.priority === 'low')).toBe(true);
  });

  it('creates issues for critical/serious accessibility violations', () => {
    const artifact = makeArtifact({
      pageAudits: [
        {
          url: 'https://example.com',
          accessibility: {
            url: 'https://example.com',
            violationCount: 2,
            violations: [
              { id: 'contrast', impact: 'critical', description: 'Bad contrast', nodes: 3, helpUrl: 'https://axe.com/contrast' },
              { id: 'alt', impact: 'serious', description: 'Missing alt', nodes: 1, helpUrl: 'https://axe.com/alt' },
            ],
            passes: 10,
            incomplete: 0,
          },
        },
      ],
    });

    const result = prioritizeIssues([], [], artifact);
    expect(result).toHaveLength(2);
    expect(result.every(i => i.category === 'Accessibility')).toBe(true);
    // Critical accessibility violations are HIGH, serious are MEDIUM
    const criticalIssue = result.find(i => i.summary === 'Bad contrast');
    const seriousIssue = result.find(i => i.summary === 'Missing alt');
    expect(criticalIssue?.priority).toBe('high');
    expect(seriousIssue?.priority).toBe('medium');
  });

  it('creates LOW priority issues for moderate/minor accessibility violations', () => {
    const artifact = makeArtifact({
      pageAudits: [
        {
          url: 'https://example.com',
          accessibility: {
            url: 'https://example.com',
            violationCount: 2,
            violations: [
              { id: 'tabindex', impact: 'moderate', description: 'Tab order', nodes: 2, helpUrl: '' },
              { id: 'lang', impact: 'minor', description: 'Lang attr', nodes: 1, helpUrl: '' },
            ],
            passes: 10,
            incomplete: 0,
          },
        },
      ],
    });

    const result = prioritizeIssues([], [], artifact);
    expect(result).toHaveLength(2);
    expect(result.every(i => i.priority === 'low')).toBe(true);
  });

  it('handles a complex scenario with all issue types', () => {
    const errors: DiagnosedError[] = [
      { summary: 'Nav fail', rootCause: '', errorType: 'navigation', confidence: 'high', suggestedFix: '', originalError: '' },
      { summary: 'JS err', rootCause: '', errorType: 'javascript', confidence: 'medium', suggestedFix: '', originalError: '' },
      { summary: 'DOM err', rootCause: '', errorType: 'dom', confidence: 'low', suggestedFix: '', originalError: '' },
    ];

    const uiAudits: UIAuditResult[] = [
      {
        pageUrl: 'https://example.com',
        layoutIssues: [{ description: 'Overlap', severity: 'high', location: 'nav' }],
        contrastIssues: [{ element: 'h1', issue: 'Low contrast', suggestion: 'Darken text' }],
        formattingIssues: [{ problem: 'Inconsistent padding', suggestion: 'Use 16px' }],
        improvements: ['Add breadcrumbs'],
        overallScore: 'needs-work',
      },
    ];

    const artifact = makeArtifact({
      deadButtons: [{ isDead: true, selector: '#ghost', reason: 'noop' }],
      brokenForms: [{ isBroken: true, formSelector: '#form', reason: 'err', filledFields: 1, skippedFields: 1 }],
      pageAudits: [
        {
          url: 'https://example.com',
          accessibility: {
            url: 'https://example.com',
            violationCount: 1,
            violations: [{ id: 'a', impact: 'critical', description: 'Critical', nodes: 1, helpUrl: '' }],
            passes: 0,
            incomplete: 0,
          },
        },
      ],
    });

    const result = prioritizeIssues(errors, uiAudits, artifact);

    // Verify ordering: high first
    const firstHigh = result.findIndex(i => i.priority === 'high');
    const firstMedium = result.findIndex(i => i.priority === 'medium');
    const firstLow = result.findIndex(i => i.priority === 'low');

    expect(firstHigh).toBeLessThan(firstMedium);
    expect(firstMedium).toBeLessThan(firstLow);

    // All issue types represented
    const categories = new Set(result.map(i => i.category));
    expect(categories.has('Workflow Error')).toBe(true);
    expect(categories.has('Dead Button')).toBe(true);
    expect(categories.has('Broken Form')).toBe(true);
  });

  // Spec 2D: Location resolution
  it('uses pageUrl from diagnosed error as issue location', () => {
    const errors: DiagnosedError[] = [
      {
        summary: 'API call failed',
        rootCause: 'Server down',
        errorType: 'network',
        confidence: 'medium',
        suggestedFix: 'Check server',
        originalError: 'fetch failed',
        pageUrl: 'https://example.com/api/data',
      },
    ];

    const result = prioritizeIssues(errors, [], makeArtifact());
    expect(result[0].location).toBe('https://example.com/api/data');
  });

  it('prefers sourceLocation over pageUrl for issue location', () => {
    const errors: DiagnosedError[] = [
      {
        summary: 'Auth fail',
        rootCause: 'Bad logic',
        errorType: 'navigation',
        confidence: 'high',
        suggestedFix: 'Fix auth',
        originalError: 'auth error',
        pageUrl: 'https://example.com/login',
        sourceLocation: { file: 'src/auth.ts', line: 42, context: 'checkToken()' },
      },
    ];

    const result = prioritizeIssues(errors, [], makeArtifact());
    expect(result[0].location).toBe('src/auth.ts:42');
  });

  // ─── New: Broken Link and SEO/Meta issue categories ──────────────────────

  it('creates MEDIUM priority issues for broken links', () => {
    const artifact = makeArtifact({
      brokenLinks: [
        { url: 'https://example.com/missing', sourceUrl: 'https://example.com/home', statusCode: 404, statusText: 'Not Found' },
      ],
    });

    const result = prioritizeIssues([], [], artifact);
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('Broken Link');
    expect(result[0].priority).toBe('medium');
    expect(result[0].summary).toContain('broken');
    expect(result[0].location).toBe('https://example.com/home');
  });

  it('handles unreachable broken links (statusCode 0)', () => {
    const artifact = makeArtifact({
      brokenLinks: [
        { url: 'https://example.com/dead', sourceUrl: 'https://example.com/page', statusCode: 0, statusText: '' },
      ],
    });

    const result = prioritizeIssues([], [], artifact);
    expect(result).toHaveLength(1);
    expect(result[0].summary).toContain('unreachable');
  });

  it('creates issues for SEO/meta problems from page audits', () => {
    const artifact = makeArtifact({
      pageAudits: [
        {
          url: 'https://example.com',
          metaIssues: [
            { id: 'missing-viewport', severity: 'high', description: 'Missing viewport meta tag', suggestion: 'Add viewport tag' },
            { id: 'missing-meta-description', severity: 'medium', description: 'Missing meta description', suggestion: 'Add meta description' },
          ],
        },
      ],
    });

    const result = prioritizeIssues([], [], artifact);
    expect(result.length).toBe(2);
    const seoIssues = result.filter(i => i.category === 'SEO / Meta');
    expect(seoIssues).toHaveLength(2);
    // High severity meta issues get medium priority
    expect(seoIssues.find(i => i.summary.includes('viewport'))?.priority).toBe('medium');
  });

  it('falls back to Unknown when no pageUrl or sourceLocation', () => {
    const errors: DiagnosedError[] = [
      {
        summary: 'Unknown error',
        rootCause: 'Unknown',
        errorType: 'unknown',
        confidence: 'low',
        suggestedFix: 'Investigate',
        originalError: 'mystery',
      },
    ];

    const result = prioritizeIssues(errors, [], makeArtifact());
    expect(result[0].location).toBe('Unknown');
  });
});

// ─── sanitizeIssueSummary ────────────────────────────────────────────────────

describe('sanitizeIssueSummary', () => {
  it('strips everything after "Call log:"', () => {
    expect(sanitizeIssueSummary('Timeout error Call log: trace details...')).toBe('Timeout error');
  });

  it('strips everything after "=== logs ==="', () => {
    expect(sanitizeIssueSummary('Error message === logs === detailed logs')).toBe('Error message');
  });

  it('replaces page.click timeout with readable message', () => {
    expect(sanitizeIssueSummary('page.click: Timeout 10000ms exceeded.')).toBe('Click timed out on element');
  });

  it('replaces page.fill timeout with readable message', () => {
    expect(sanitizeIssueSummary('page.fill: Timeout 5000ms exceeded.')).toBe('Could not fill form field');
  });

  it('replaces other page.X timeout with generic action message', () => {
    expect(sanitizeIssueSummary('page.evaluate: Timeout 3000ms exceeded.')).toBe('Action timed out');
  });

  it('truncates to 120 chars with ellipsis for long strings', () => {
    const longString = 'A'.repeat(200);
    const result = sanitizeIssueSummary(longString);
    expect(result.length).toBe(120);
    expect(result.endsWith('...')).toBe(true);
    expect(result).toBe('A'.repeat(117) + '...');
  });

  it('returns short strings unchanged', () => {
    expect(sanitizeIssueSummary('Simple error')).toBe('Simple error');
  });

  it('handles combined: timeout + call log stripped together', () => {
    const input = 'page.click: Timeout 10000ms exceeded.Call log: waiting for locator...';
    expect(sanitizeIssueSummary(input)).toBe('Click timed out on element');
  });
});

// ─── buildAccessibilityDetails ───────────────────────────────────────────────

describe('buildAccessibilityDetails', () => {
  it('returns node count when no elementSamples', () => {
    const result = buildAccessibilityDetails({ nodes: 5 });
    expect(result).toContain('5 element(s) affected');
  });

  it('includes element samples when present', () => {
    const result = buildAccessibilityDetails({
      nodes: 3,
      elementSamples: ['<button>Click</button>', '<img>'],
    });
    expect(result).toContain('3 element(s) affected');
    expect(result).toContain('Examples:');
    expect(result).toContain('<button>Click</button>');
    expect(result).toContain('<img>');
  });

  it('truncates long HTML snippets to ~80 chars', () => {
    const longHtml = '<div class="' + 'x'.repeat(100) + '">content</div>';
    const result = buildAccessibilityDetails({
      nodes: 1,
      elementSamples: [longHtml],
    });
    // The truncated sample should be 80 chars (77 + '...')
    expect(result).toContain('...');
    // The original long HTML should NOT appear in full
    expect(result).not.toContain(longHtml);
  });

  it('handles empty elementSamples array same as no samples', () => {
    const result = buildAccessibilityDetails({ nodes: 2, elementSamples: [] });
    expect(result).toBe('2 element(s) affected');
  });
});

// ─── Timeout vs broken link priority ─────────────────────────────────────────

describe('broken link priority: timeout vs actual broken', () => {
  it('gives LOW priority to timeout broken links with statusCode 0', () => {
    const artifact = makeArtifact({
      brokenLinks: [
        {
          url: 'https://example.com/slow-page',
          sourceUrl: 'https://example.com/home',
          statusCode: 0,
          statusText: 'Timeout: navigation exceeded 30000ms',
        },
      ],
    });

    const result = prioritizeIssues([], [], artifact);
    expect(result).toHaveLength(1);
    expect(result[0].priority).toBe('low');
    expect(result[0].summary).toContain('timed out');
  });

  it('gives MEDIUM priority to 404 broken links with "broken" in summary', () => {
    const artifact = makeArtifact({
      brokenLinks: [
        {
          url: 'https://example.com/missing-page',
          sourceUrl: 'https://example.com/home',
          statusCode: 404,
          statusText: 'Not Found',
        },
      ],
    });

    const result = prioritizeIssues([], [], artifact);
    expect(result).toHaveLength(1);
    expect(result[0].priority).toBe('medium');
    expect(result[0].summary).toContain('broken');
  });
});
