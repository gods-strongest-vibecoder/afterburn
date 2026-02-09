import type { Page } from 'playwright';
import type { CookieBannerSelector } from '../types/artifacts.js';
/**
 * Known cookie consent platforms with their selectors
 * Ordered by prevalence (OneTrust is most common)
 */
export declare const COOKIE_SELECTORS: CookieBannerSelector[];
/**
 * Attempts to detect and dismiss cookie consent banners.
 * Tries known platforms in order, clicking the first visible accept button.
 *
 * @param page - Playwright page instance
 * @returns Object indicating if banner was dismissed and which platform
 */
export declare function dismissCookieBanner(page: Page): Promise<{
    dismissed: boolean;
    platform: string | null;
}>;
