// Browser lifecycle management with stealth and cookie dismissal
import { createStealthBrowser } from './stealth-browser.js';
import { dismissCookieBanner } from './cookie-dismisser.js';
import { detectChallengePage } from './challenge-detector.js';
/**
 * Manages browser lifecycle: launch, navigation, and cleanup.
 * Automatically dismisses cookie banners after navigation.
 */
export class BrowserManager {
    browser = null;
    context = null;
    config;
    constructor(config) {
        this.config = config;
    }
    /**
     * Launches stealth-enabled browser and creates context
     */
    async launch() {
        const { browser, context } = await createStealthBrowser(this.config);
        this.browser = browser;
        this.context = context;
    }
    // Tracks whether the last navigated page was a bot-challenge page
    _lastChallengeResult = { isChallengePage: false, provider: null };
    /**
     * Returns the challenge detection result from the most recent newPage() navigation.
     */
    get lastChallengeResult() {
        return this._lastChallengeResult;
    }
    /**
     * Creates a new page and optionally navigates to a URL.
     * Automatically dismisses cookie banners and detects bot-challenge pages after navigation.
     *
     * @param url - Optional URL to navigate to
     * @returns Playwright page instance
     */
    async newPage(url) {
        if (!this.context) {
            throw new Error('Browser not launched. Call launch() first.');
        }
        const page = await this.context.newPage();
        if (url) {
            // Navigate with DOM ready first
            await page.goto(url, { waitUntil: 'domcontentloaded' });
            // Detect anti-bot challenge pages before processing content
            this._lastChallengeResult = await detectChallengePage(page);
            if (this._lastChallengeResult.isChallengePage) {
                console.warn(`Anti-bot challenge detected (${this._lastChallengeResult.provider}) on ${url}. Results may be incomplete.`);
            }
            // Try to dismiss cookie banner
            await dismissCookieBanner(page);
            // Wait for network idle with timeout (some SPAs never reach idle)
            try {
                await page.waitForLoadState('networkidle', { timeout: 5000 });
            }
            catch {
                // Timeout is acceptable - page may never reach networkidle
            }
        }
        return page;
    }
    /**
     * Closes browser and cleans up resources.
     * Safe to call multiple times.
     */
    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.context = null;
        }
    }
    /**
     * Checks if browser is currently launched
     */
    get isLaunched() {
        return this.browser !== null && this.context !== null;
    }
}
//# sourceMappingURL=browser-manager.js.map