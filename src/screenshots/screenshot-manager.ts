// Screenshot capture coordination with content-hash deduplication
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import fs from 'fs-extra';
import type { Page } from 'playwright-core';
import type { ScreenshotRef } from '../types/artifacts.js';
import { captureDualFormat } from './dual-format.js';

/**
 * Manages screenshot capture with automatic deduplication by content hash
 */
export class ScreenshotManager {
  private readonly outputDir: string;
  private readonly dedupMap: Map<string, ScreenshotRef>;
  private readonly currentSessionFiles: Set<string>;

  constructor(outputDir: string = '.afterburn/screenshots') {
    this.outputDir = outputDir;
    this.dedupMap = new Map();
    this.currentSessionFiles = new Set();
    fs.ensureDirSync(this.outputDir);
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

    // Track current session files
    this.currentSessionFiles.add(ref.pngPath);
    this.currentSessionFiles.add(ref.webpPath);

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

  /**
   * Removes screenshots older than specified days based on file modification time.
   * Excludes screenshots from the current session.
   * @param olderThanDays - Age threshold in days (default: 7). Set to 0 to clean all old screenshots.
   * @returns Count of deleted files
   */
  async cleanup(olderThanDays: number = 7): Promise<number> {
    const files = await fs.readdir(this.outputDir);
    const now = Date.now();
    const threshold = olderThanDays * 24 * 60 * 60 * 1000; // Convert days to milliseconds
    let deletedCount = 0;

    for (const file of files) {
      const filepath = join(this.outputDir, file);

      // Skip files from current session
      if (this.currentSessionFiles.has(filepath)) {
        continue;
      }

      try {
        const stats = await fs.stat(filepath);
        const age = now - stats.mtimeMs;

        if (age > threshold) {
          await fs.unlink(filepath);
          deletedCount++;
        }
      } catch {
        // File might have been deleted already, continue
      }
    }

    return deletedCount;
  }
}
