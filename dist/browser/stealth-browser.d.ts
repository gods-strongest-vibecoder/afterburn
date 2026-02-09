import type { Browser, BrowserContext } from 'playwright';
import type { BrowserConfig } from '../types/artifacts.js';
/**
 * Creates a stealth-enabled Playwright browser with anti-bot evasion.
 * Uses playwright-extra with stealth plugin to bypass detection on real websites.
 *
 * @param config - Optional browser configuration overrides
 * @returns Object containing browser and context references
 */
export declare function createStealthBrowser(config?: Partial<BrowserConfig>): Promise<{
    browser: Browser;
    context: BrowserContext;
}>;
