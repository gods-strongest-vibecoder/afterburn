#!/usr/bin/env node
// Main entry point demonstrating Phase 1 pipeline integration
import crypto from 'node:crypto';
import { BrowserManager } from './browser/index.js';
import { ScreenshotManager } from './screenshots/index.js';
import { ArtifactStorage } from './artifacts/index.js';
import { ensureBrowserInstalled, withSpinner } from './cli/index.js';
import type { ArtifactMetadata, ScreenshotRef } from './types/artifacts.js';

interface SessionArtifact extends ArtifactMetadata {
  targetUrl: string;
  screenshots: ScreenshotRef[];
}

async function main(): Promise<void> {
  console.log('Afterburn v0.1.0 - Automated Web Testing\n');

  // First-run browser check
  await ensureBrowserInstalled();

  // Get target URL from command line
  const targetUrl = process.argv[2];
  if (!targetUrl) {
    console.error('Usage: afterburn <url>');
    console.error('Example: afterburn https://example.com');
    process.exit(1);
  }

  // Generate session ID
  const sessionId = crypto.randomUUID();

  // Initialize modules
  const browserManager = new BrowserManager();
  const screenshotManager = new ScreenshotManager();
  const artifactStorage = new ArtifactStorage();

  try {
    // Launch stealth browser
    await withSpinner('Launching browser', async () => {
      await browserManager.launch();
    });

    // Navigate to target URL (auto-dismisses cookies)
    const page = await withSpinner(`Navigating to ${targetUrl}`, async () => {
      return await browserManager.newPage(targetUrl);
    });

    // Capture dual-format screenshots
    const screenshotRef = await withSpinner('Capturing screenshots', async () => {
      return await screenshotManager.capture(page, 'initial');
    });

    // Save session artifact
    const sessionArtifact: SessionArtifact = {
      version: '1.0',
      stage: 'session',
      timestamp: new Date().toISOString(),
      sessionId,
      targetUrl,
      screenshots: [screenshotRef],
    };

    const artifactPath = await artifactStorage.save(sessionArtifact);

    // Print summary
    console.log('\n✓ Session complete');
    console.log(`  Session ID: ${sessionId}`);
    console.log(`  Screenshots:`);
    console.log(`    PNG:  ${screenshotRef.pngPath} (${screenshotRef.sizes.png} bytes)`);
    console.log(`    WebP: ${screenshotRef.webpPath} (${screenshotRef.sizes.webp} bytes)`);
    console.log(`    Size reduction: ${screenshotRef.sizes.reduction}`);
    console.log(`  Artifact: ${artifactPath}\n`);
  } catch (error) {
    console.error('\n✗ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    // Always close browser
    await browserManager.close();
  }
}

main();
