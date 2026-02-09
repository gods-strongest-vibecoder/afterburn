import type { Page } from 'playwright-core';
import type { ScreenshotRef } from '../types/artifacts.js';
/**
 * Manages screenshot capture with automatic deduplication by content hash
 */
export declare class ScreenshotManager {
    private readonly outputDir;
    private readonly dedupMap;
    constructor(outputDir?: string);
    /**
     * Captures a screenshot in dual format (PNG + WebP) with deduplication
     * @param page - Playwright page instance
     * @param name - Human-readable screenshot name
     * @returns ScreenshotRef (existing ref if duplicate detected)
     */
    capture(page: Page, name: string): Promise<ScreenshotRef>;
    /**
     * Returns all captured screenshots
     */
    getAll(): ScreenshotRef[];
    /**
     * Finds a screenshot by name
     */
    getByName(name: string): ScreenshotRef | undefined;
}
