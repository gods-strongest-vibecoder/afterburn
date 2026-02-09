import type { Page } from 'playwright-core';
import type { ScreenshotRef } from '../types/artifacts.js';
/**
 * Converts a PNG buffer to WebP format with optimal compression settings
 */
export declare function convertToWebP(pngBuffer: Buffer): Promise<Buffer>;
/**
 * Captures a full-page screenshot in both PNG and WebP formats with content-hash naming
 * @param page - Playwright page instance
 * @param name - Human-readable screenshot name
 * @param outputDir - Directory to save screenshots
 * @returns ScreenshotRef with paths and metadata
 */
export declare function captureDualFormat(page: Page, name: string, outputDir: string): Promise<ScreenshotRef>;
