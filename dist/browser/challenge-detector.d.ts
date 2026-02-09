import type { Page } from 'playwright';
export interface ChallengeDetectionResult {
    isChallengePage: boolean;
    provider: string | null;
}
/**
 * Checks if the current page is an anti-bot challenge page rather than real site content.
 * Should be called after page.goto() to prevent parsing challenge HTML as real content.
 */
export declare function detectChallengePage(page: Page): Promise<ChallengeDetectionResult>;
