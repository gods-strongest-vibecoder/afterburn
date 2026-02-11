import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFile } from 'node:child_process';
import path from 'node:path';
import fs from 'fs-extra';
import { runDiscovery } from '../../src/discovery/index.js';
import { startFixtureServer } from './helpers/local-fixture-server.js';

let fixtureBaseUrl = '';
let closeFixtureServer: (() => Promise<void>) | null = null;

const outputDirsToClean: string[] = [];

beforeAll(async () => {
  const fixture = await startFixtureServer();
  fixtureBaseUrl = fixture.baseUrl;
  closeFixtureServer = fixture.close;
});

afterAll(async () => {
  if (closeFixtureServer) {
    await closeFixtureServer();
  }

  for (const dir of outputDirsToClean) {
    try {
      await fs.remove(dir);
    } catch {
      // Ignore cleanup errors
    }
  }
});

describe.sequential('Discovery pipeline', () => {
  it('discovers pages with sitemap and generates heuristic workflow plans', async () => {
    const savedKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    try {
      const result = await runDiscovery({
        targetUrl: fixtureBaseUrl,
        sessionId: 'e2e-discovery-test',
        maxPages: 5,
      });

      expect(result.sitemap).toBeDefined();
      expect(result.sitemap.url).toContain('127.0.0.1');
      expect(result.sitemap.pageData).toBeDefined();

      expect(result.crawlResult).toBeDefined();
      expect(result.crawlResult.pages.length).toBeGreaterThanOrEqual(1);
      expect(result.crawlResult.totalPagesDiscovered).toBeGreaterThanOrEqual(1);

      const rootPage = result.crawlResult.pages[0];
      expect(rootPage.links.length).toBeGreaterThan(0);

      expect(result.workflowPlans.length).toBeGreaterThan(0);
      for (const plan of result.workflowPlans) {
        expect(plan.workflowName).toBeTruthy();
        expect(plan.steps.length).toBeGreaterThan(0);
        expect(['critical', 'important', 'nice-to-have']).toContain(plan.priority);
        expect(plan.source).toBe('auto-discovered');
      }
    } finally {
      if (savedKey) {
        process.env.GEMINI_API_KEY = savedKey;
      }
    }
  }, 120_000);
});

describe('Full pipeline via CLI', () => {
  it('runs end-to-end, produces health score and report files', async () => {
    const outputDir = path.join(
      process.cwd(),
      'afterburn-reports',
      `e2e-cli-${Date.now()}`
    );
    outputDirsToClean.push(outputDir);

    const result = await new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve) => {
      const child = execFile(
        'node',
        [
          path.join(process.cwd(), 'dist', 'index.js'),
          fixtureBaseUrl,
          '--max-pages', '5',
          '--output-dir', outputDir,
        ],
        {
          timeout: 180_000,
          cwd: process.cwd(),
          env: {
            ...process.env,
            AFTERBURN_ALLOW_PRIVATE_URLS: '1',
          },
        },
        (error, stdout, stderr) => {
          resolve({
            code: error ? (error as NodeJS.ErrnoException & { code?: number }).code ?? child.exitCode : 0,
            stdout: stdout || '',
            stderr: stderr || '',
          });
        }
      );
    });

    const allOutput = result.stdout + result.stderr;
    expect(allOutput.length).toBeGreaterThan(0);
    expect(allOutput).toMatch(/Health:\s+\d+\/100/);
    expect(allOutput).not.toContain('Scan timed out');

    const outputExists = await fs.pathExists(outputDir);
    expect(outputExists).toBe(true);

    if (outputExists) {
      const files = await fs.readdir(outputDir);
      const htmlFiles = files.filter(f => f.endsWith('.html'));
      const mdFiles = files.filter(f => f.endsWith('.md'));

      expect(htmlFiles.length).toBeGreaterThanOrEqual(1);
      expect(mdFiles.length).toBeGreaterThanOrEqual(1);

      if (htmlFiles.length > 0) {
        const htmlContent = await fs.readFile(path.join(outputDir, htmlFiles[0]), 'utf-8');
        expect(htmlContent).toContain('<html');
        expect(htmlContent.length).toBeGreaterThan(100);
      }

      if (mdFiles.length > 0) {
        const mdContent = await fs.readFile(path.join(outputDir, mdFiles[0]), 'utf-8');
        expect(mdContent).toContain('#');
        expect(mdContent.length).toBeGreaterThan(50);
      }
    }
  }, 240_000);
});
