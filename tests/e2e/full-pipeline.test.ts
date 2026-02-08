// E2E integration tests for the full Afterburn pipeline (discovery -> execution -> analysis -> reporting)

import { describe, it, expect, afterAll } from 'vitest';
import { execFile } from 'node:child_process';
import path from 'node:path';
import fs from 'fs-extra';
import { runDiscovery } from '../../src/discovery/index.js';

const TEST_URL = 'https://en.wikipedia.org/wiki/Main_Page';

// Collect output directories for cleanup
const outputDirsToClean: string[] = [];

afterAll(async () => {
  for (const dir of outputDirsToClean) {
    try {
      await fs.remove(dir);
    } catch {
      // Ignore cleanup errors
    }
  }
});

// ─── Discovery Pipeline ─────────────────────────────────────────────
// Tests the first half of the pipeline: crawl + element mapping + sitemap + workflow planning

describe.sequential('Discovery pipeline', () => {
  it('discovers pages with sitemap and generates heuristic workflow plans', async () => {
    // Ensure no API key is set (heuristic fallback path)
    const savedKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    try {
      const result = await runDiscovery({
        targetUrl: TEST_URL,
        sessionId: 'e2e-discovery-test',
        maxPages: 1,
      });

      // --- Sitemap assertions ---
      expect(result.sitemap).toBeDefined();
      expect(result.sitemap.url).toContain('wikipedia.org');
      expect(result.sitemap.pageData).toBeDefined();

      // Should have discovered page data on the root page
      expect(result.crawlResult).toBeDefined();
      expect(result.crawlResult.pages.length).toBeGreaterThanOrEqual(1);
      expect(result.crawlResult.totalPagesDiscovered).toBeGreaterThanOrEqual(1);

      // PageData should contain links (Wikipedia has many)
      const rootPage = result.crawlResult.pages[0];
      expect(rootPage.links.length).toBeGreaterThan(0);

      // --- Heuristic workflow plan assertions ---
      expect(result.workflowPlans.length).toBeGreaterThan(0);

      for (const plan of result.workflowPlans) {
        expect(plan.workflowName).toBeTruthy();
        expect(plan.steps.length).toBeGreaterThan(0);
        expect(['critical', 'important', 'nice-to-have']).toContain(plan.priority);
        expect(plan.source).toBe('auto-discovered');
      }
    } finally {
      if (savedKey) process.env.GEMINI_API_KEY = savedKey;
    }
  }, 240_000);
});

// ─── Full Pipeline via CLI ──────────────────────────────────────────
// Tests the complete pipeline (discovery + execution + analysis + reporting) via the CLI entry point.
// Wikipedia's hundreds of links and 8 heuristic workflows make this a very long test.
// We use a generous 8-minute timeout to accommodate network variability.

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
          TEST_URL,
          '--max-pages', '1',
          '--output-dir', outputDir,
        ],
        { timeout: 450_000, cwd: process.cwd() },
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

    // CLI should produce output
    expect(allOutput.length).toBeGreaterThan(0);

    // Should contain the health score summary line: "Health: XX/100"
    expect(allOutput).toMatch(/Health:\s+\d+\/100/);

    // Verify report files exist on disk
    const outputExists = await fs.pathExists(outputDir);
    expect(outputExists).toBe(true);

    if (outputExists) {
      const files = await fs.readdir(outputDir);
      const htmlFiles = files.filter(f => f.endsWith('.html'));
      const mdFiles = files.filter(f => f.endsWith('.md'));

      expect(htmlFiles.length).toBeGreaterThanOrEqual(1);
      expect(mdFiles.length).toBeGreaterThanOrEqual(1);

      // Validate HTML report content
      if (htmlFiles.length > 0) {
        const htmlContent = await fs.readFile(path.join(outputDir, htmlFiles[0]), 'utf-8');
        expect(htmlContent).toContain('<html');
        expect(htmlContent.length).toBeGreaterThan(100);
      }

      // Validate Markdown report content
      if (mdFiles.length > 0) {
        const mdContent = await fs.readFile(path.join(outputDir, mdFiles[0]), 'utf-8');
        expect(mdContent).toContain('#');
        expect(mdContent.length).toBeGreaterThan(50);
      }
    }
  }, 480_000);
});
