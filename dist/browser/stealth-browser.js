// Stealth-enabled Playwright browser creation with anti-bot evasion
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
// Prevent duplicate plugin registration
let pluginApplied = false;
/**
 * Default browser configuration with realistic fingerprint
 */
const DEFAULT_CONFIG = {
    headless: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: {
        width: 1920,
        height: 1080,
    },
    locale: 'en-US',
    timezoneId: 'America/New_York',
};
/**
 * Creates a stealth-enabled Playwright browser with anti-bot evasion.
 * Uses playwright-extra with stealth plugin to bypass detection on real websites.
 *
 * @param config - Optional browser configuration overrides
 * @returns Object containing browser and context references
 */
export async function createStealthBrowser(config) {
    // Apply stealth plugin once
    if (!pluginApplied) {
        chromium.use(StealthPlugin());
        pluginApplied = true;
    }
    // Merge config with defaults
    const finalConfig = {
        ...DEFAULT_CONFIG,
        ...config,
        viewport: {
            ...DEFAULT_CONFIG.viewport,
            ...config?.viewport,
        },
    };
    // Launch browser with anti-bot evasion arguments
    const browser = await chromium.launch({
        headless: finalConfig.headless,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-site-isolation-trials',
        ],
    });
    // Create context with realistic fingerprint
    const context = await browser.newContext({
        userAgent: finalConfig.userAgent,
        viewport: finalConfig.viewport,
        locale: finalConfig.locale,
        timezoneId: finalConfig.timezoneId,
    });
    return { browser, context };
}
//# sourceMappingURL=stealth-browser.js.map