// Browser lifecycle management with stealth and cookie dismissal

import type { Browser, BrowserContext, Page } from 'playwright';
import type { BrowserConfig } from '../types/artifacts.js';
import { createStealthBrowser } from './stealth-browser.js';
import { dismissCookieBanner } from './cookie-dismisser.js';

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

  /**
   * Creates a new page and optionally navigates to a URL.
   * Automatically dismisses cookie banners after navigation.
   *
   * @param url - Optional URL to navigate to
   * @returns Playwright page instance
   */
  async newPage(url?: string): Promise<Page> {
    if (!this.context) {
      throw new Error('Browser not launched. Call launch() first.');
    }

    const page = await this.context.newPage();

    if (url) {
      // Navigate with DOM ready first
      await page.goto(url, { waitUntil: 'domcontentloaded' });

      // Try to dismiss cookie banner
      await dismissCookieBanner(page);

      // Wait for network idle with timeout (some SPAs never reach idle)
      try {
        await page.waitForLoadState('networkidle', { timeout: 5000 });
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
   * Checks if browser is currently launched
   */
  get isLaunched(): boolean {
    return this.browser !== null && this.context !== null;
  }
}
