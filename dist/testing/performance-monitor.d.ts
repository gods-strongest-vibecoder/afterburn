import type { Page } from 'playwright';
interface PerformanceMetrics {
    lcp: number;
    domContentLoaded: number;
    totalLoadTime: number;
    url: string;
}
/**
 * Capture browser performance metrics from a Playwright page
 *
 * @param page - Playwright page to measure
 * @returns Performance metrics including LCP, DOM load time, and total load time
 */
export declare function capturePerformanceMetrics(page: Page): Promise<PerformanceMetrics>;
export {};
