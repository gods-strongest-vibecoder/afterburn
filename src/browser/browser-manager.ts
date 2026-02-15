// Browser lifecycle management with stealth and cookie dismissal

import type { Browser, BrowserContext, Page } from 'playwright';
import type { BrowserConfig } from '../types/artifacts.js';
import { createStealthBrowser } from './stealth-browser.js';
import { dismissCookieBanner } from './cookie-dismisser.js';
import { detectChallengePage } from './challenge-detector.js';
import type { ChallengeDetectionResult } from './challenge-detector.js';

/**
 * Manages browser lifecycle: launch, navigation, and cleanup.
 * Automatically dismisses cookie banners after navigation.
 */
export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private config?: Partial<BrowserConfig>;

  constructor(config?: Partial<BrowserConfig>) {
    this.config = config;
  }

  /**
   * Launches stealth-enabled browser and creates context
   */
  async launch(): Promise<void> {
    const { browser, context } = await createStealthBrowser(this.config);
    this.browser = browser;
    this.context = context;
  }

  // Tracks whether the last navigated page was a bot-challenge page
  private _lastChallengeResult: ChallengeDetectionResult = { isChallengePage: false, provider: null };

  /**
   * Returns the challenge detection result from the most recent newPage() navigation.
   */
  get lastChallengeResult(): ChallengeDetectionResult {
    return this._lastChallengeResult;
  }

  /**
   * Creates a new page and optionally navigates to a URL.
   * Automatically dismisses cookie banners and detects bot-challenge pages after navigation.
   *
   * @param url - Optional URL to navigate to
   * @returns Playwright page instance
   */
  async newPage(url?: string, options?: { networkIdleTimeout?: number }): Promise<Page> {
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
        await page.waitForLoadState('networkidle', { timeout: options?.networkIdleTimeout ?? 5000 });
      } catch {
        // Timeout is acceptable - page may never reach networkidle
      }
    }

    return page;
  }

  /**
   * Closes browser and cleans up resources.
   * Safe to call multiple times.
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
    }
  }

  /**
   * Returns the browser context for route interception (e.g., blocking resources).
   */
  getContext(): BrowserContext | null {
    return this.context;
  }

  /**
   * Checks if browser is currently launched
   */
  get isLaunched(): boolean {
    return this.browser !== null && this.context !== null;
  }
}
