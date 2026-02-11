import type { Page } from 'playwright';
import type { BrokenLink, LinkInfo } from '../types/discovery.js';
export interface LinkValidationState {
    checkedCount: number;
}
export declare function createLinkValidationState(): LinkValidationState;
/**
 * Validates internal links by checking their HTTP status codes.
 * External links are skipped to avoid rate-limiting third-party sites.
 *
 * @param links - All links discovered on a page
 * @param page - Playwright Page instance (maintains session context for auth)
 * @returns Array of broken links (4xx, 5xx, network errors)
 */
export declare function validateLinks(links: LinkInfo[], page: Page, state?: LinkValidationState): Promise<BrokenLink[]>;
