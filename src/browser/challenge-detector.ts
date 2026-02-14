// Detect anti-bot challenge pages (Cloudflare, Akamai, etc.) that block automated testing

import type { Page } from 'playwright';

export interface ChallengeDetectionResult {
  isChallengePage: boolean;
  provider: string | null;
}

/**
 * Checks if the current page is an anti-bot challenge page rather than real site content.
 * Should be called after page.goto() to prevent parsing challenge HTML as real content.
 */
export async function detectChallengePage(page: Page): Promise<ChallengeDetectionResult> {
  try {
    const title = await page.title();
    const titleLower = title.toLowerCase();

    // Cloudflare challenge: title is "Just a moment..." or "Attention Required!"
    if (titleLower.includes('just a moment') || titleLower.includes('attention required')) {
      return { isChallengePage: true, provider: 'Cloudflare' };
    }

    // Check for known challenge page indicators in the DOM
    const challengeIndicators = await page.evaluate(() => {
      const body = document.body?.textContent?.toLowerCase() || '';
      const html = document.documentElement?.innerHTML?.toLowerCase() || '';

      return {
        // Cloudflare-specific
        hasCfChallenge: !!document.querySelector('#cf-challenge-running, #challenge-running, .cf-browser-verification'),
        hasCfScript: html.includes('__cf_chl_opt') || html.includes('cf-browser-verification'),
        hasCheckingBrowser: body.includes('checking your browser') || body.includes('verify you are human'),

        // Akamai Bot Manager
        hasAkamai: html.includes('akamai') && (body.includes('access denied') || body.includes('reference #')),

        // Generic bot detection
        hasAccessDenied: (body.includes('access denied') || body.includes('forbidden')) && body.length < 2000,
        hasCaptcha: !!document.querySelector('.g-recaptcha, .h-captcha, [data-sitekey]'),

        // PerimeterX
        hasPerimeterX: html.includes('perimeterx') || html.includes('_pxhd'),

        bodyLength: body.length,
      };
    });

    if (challengeIndicators.hasCfChallenge || challengeIndicators.hasCfScript) {
      return { isChallengePage: true, provider: 'Cloudflare' };
    }

    if (challengeIndicators.hasCheckingBrowser && challengeIndicators.bodyLength < 5000) {
      return { isChallengePage: true, provider: 'Anti-bot protection' };
    }

    if (challengeIndicators.hasAkamai) {
      return { isChallengePage: true, provider: 'Akamai' };
    }

    if (challengeIndicators.hasPerimeterX) {
      return { isChallengePage: true, provider: 'PerimeterX' };
    }

    if (challengeIndicators.hasAccessDenied) {
      return { isChallengePage: true, provider: 'Access control' };
    }

    if (challengeIndicators.hasCaptcha && challengeIndicators.bodyLength < 5000) {
      return { isChallengePage: true, provider: 'CAPTCHA' };
    }

    return { isChallengePage: false, provider: null };
  } catch {
    // If detection fails, assume it's not a challenge page
    return { isChallengePage: false, provider: null };
  }
}
