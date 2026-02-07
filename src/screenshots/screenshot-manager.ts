// Screenshot capture coordination with content-hash deduplication
import { createHash } from 'node:crypto';
import type { Page } from 'playwright-core';
import type { ScreenshotRef } from '../types/artifacts.js';
import { captureDualFormat } from './dual-format.js';

/**
 * Manages screenshot capture with automatic deduplication by content hash
 */
export class ScreenshotManager {
  private readonly outputDir: string;
  private readonly dedupMap: Map<string, ScreenshotRef>;

  constructor(outputDir: string = '.afterburn/screenshots') {
    this.outputDir = outputDir;
    this.dedupMap = new Map();
  }

  /**
   * Captures a screenshot in dual format (PNG + WebP) with deduplication
   * @param page - Playwright page instance
   * @param name - Human-readable screenshot name
   * @returns ScreenshotRef (existing ref if duplicate detected)
   */
  async capture(page: Page, name: string): Promise<ScreenshotRef> {
    // Capture PNG buffer to compute hash
    const pngBuffer = await page.screenshot({ type: 'png', fullPage: true });
    const hash = createHash('sha256').update(pngBuffer).digest('hex').substring(0, 12);

    // Check if this content hash already exists (deduplication)
    const existing = this.dedupMap.get(hash);
    if (existing) {
      return existing;
    }

    // New screenshot - capture dual format and store in dedup map
    const ref = await captureDualFormat(page, name, this.outputDir);
    this.dedupMap.set(hash, ref);
    return ref;
  }

  /**
   * Returns all captured screenshots
   */
  getAll(): ScreenshotRef[] {
    return Array.from(this.dedupMap.values());
  }

  /**
   * Finds a screenshot by name
   */
  getByName(name: string): ScreenshotRef | undefined {
    return this.getAll().find((ref) => ref.name === name);
  }
}
