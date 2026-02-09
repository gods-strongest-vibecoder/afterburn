import type { Page } from 'playwright-core';
import type { ErrorEvidence, ErrorCollector } from '../types/execution.js';
import { ScreenshotManager } from '../screenshots/index.js';
/**
 * Capture error evidence when a workflow step fails
 * Collects screenshot, console errors, and network failures
 */
export declare function captureErrorEvidence(page: Page, collector: ErrorCollector, screenshotManager: ScreenshotManager, stepIndex: number): Promise<ErrorEvidence>;
