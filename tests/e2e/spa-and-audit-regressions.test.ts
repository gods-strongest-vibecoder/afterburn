import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BrowserManager } from '../../src/browser/index.js';
import { interceptRouteChanges } from '../../src/discovery/spa-detector.js';
import { WorkflowExecutor } from '../../src/execution/index.js';
import { startFixtureServer } from './helpers/local-fixture-server.js';

let fixtureBaseUrl = '';
let closeFixtureServer: (() => Promise<void>) | null = null;

beforeAll(async () => {
  const fixture = await startFixtureServer();
  fixtureBaseUrl = fixture.baseUrl;
  closeFixtureServer = fixture.close;
});

afterAll(async () => {
  if (closeFixtureServer) {
    await closeFixtureServer();
  }
});

describe.sequential('SPA and audit regressions', () => {
  it('captures SPA client-side routes via History API interception', async () => {
    const browser = new BrowserManager({ headless: true });
    await browser.launch();

    try {
      const page = await browser.newPage(`${fixtureBaseUrl}/spa`);
      const routes = await interceptRouteChanges(page);

      expect(routes).toContain(`${fixtureBaseUrl}/spa/about`);
      expect(routes).toContain(`${fixtureBaseUrl}/spa/pricing`);
    } finally {
      await browser.close();
    }
  }, 120_000);

  it('keeps page audit URL labels aligned with captured audit page data', async () => {
    const browser = new BrowserManager({ headless: true });
    await browser.launch();

    try {
      const page = await browser.newPage(`${fixtureBaseUrl}/contact`);
      const pageAudits: Array<any> = [];
      const executor = new WorkflowExecutor({
        targetUrl: fixtureBaseUrl,
        sessionId: `audit-url-regression-${Date.now()}`,
        workflowPlans: [],
        headless: true,
      });

      await (executor as any).auditPage(page, `${fixtureBaseUrl}/pricing`, pageAudits);

      expect(pageAudits).toHaveLength(1);
      expect(pageAudits[0].url).toBe(`${fixtureBaseUrl}/pricing`);
      expect(pageAudits[0].accessibility?.url).toBe(`${fixtureBaseUrl}/pricing`);
      expect(pageAudits[0].performance?.url).toBe(`${fixtureBaseUrl}/pricing`);
    } finally {
      await browser.close();
    }
  }, 120_000);
});
