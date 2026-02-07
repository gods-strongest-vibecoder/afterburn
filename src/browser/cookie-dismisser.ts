// Auto-detection and dismissal of cookie consent banners

import type { Page } from 'playwright';
import type { CookieBannerSelector } from '../types/artifacts.js';

/**
 * Known cookie consent platforms with their selectors
 * Ordered by prevalence (OneTrust is most common)
 */
export const COOKIE_SELECTORS: CookieBannerSelector[] = [
  {
    name: 'OneTrust',
    acceptButton: '#onetrust-accept-btn-handler',
    modal: '#onetrust-banner-sdk',
  },
  {
    name: 'Cookiebot',
    acceptButton: '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
    modal: '#CybotCookiebotDialog',
  },
  {
    name: 'CookieYes',
    acceptButton: '.cky-btn-accept',
    modal: '.cky-consent-container',
  },
  {
    name: 'Generic',
    acceptButton: [
      'button:has-text("Accept all")',
      'button:has-text("Accept cookies")',
      'button:has-text("Allow all")',
      'button:has-text("I agree")',
      '[id*="accept"]',
      '[class*="accept"]',
    ].join(', '),
  },
];

/**
 * Attempts to detect and dismiss cookie consent banners.
 * Tries known platforms in order, clicking the first visible accept button.
 *
 * @param page - Playwright page instance
 * @returns Object indicating if banner was dismissed and which platform
 */
export async function dismissCookieBanner(
  page: Page
): Promise<{ dismissed: boolean; platform: string | null }> {
  for (const selector of COOKIE_SELECTORS) {
    try {
      // Wait for accept button with short timeout (banner may not exist)
      const button = page.locator(selector.acceptButton).first();
      const isVisible = await button.isVisible({ timeout: 2000 });

      if (!isVisible) {
        continue;
      }

      // Click the accept button
      await button.click();

      // If modal selector exists, wait for it to become hidden
      if (selector.modal) {
        try {
          await page.locator(selector.modal).waitFor({
            state: 'hidden',
            timeout: 5000,
          });
        } catch {
          // Modal might not disappear or might not exist - non-critical
        }
      }

      // Wait for animations to complete
      await page.waitForTimeout(500);

      return { dismissed: true, platform: selector.name };
    } catch {
      // This selector didn't work, try next one
      continue;
    }
  }

  // No cookie banner found
  return { dismissed: false, platform: null };
}
