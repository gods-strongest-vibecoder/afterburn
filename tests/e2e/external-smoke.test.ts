import { describe, it, expect } from 'vitest';
import { runDiscovery } from '../../src/discovery/index.js';

const EXTERNAL_SMOKE_URL = process.env.AFTERBURN_EXTERNAL_SMOKE_URL;
const describeExternal = EXTERNAL_SMOKE_URL ? describe : describe.skip;

describeExternal('External smoke scan', () => {
  it('can run discovery against configured external URL', async () => {
    const result = await runDiscovery({
      targetUrl: EXTERNAL_SMOKE_URL as string,
      sessionId: `external-smoke-${Date.now()}`,
      maxPages: 1,
    });

    expect(result.crawlResult.totalPagesDiscovered).toBeGreaterThan(0);
    expect(result.sitemap.url).toContain('http');
  }, 180_000);
});
