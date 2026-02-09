import type { Page } from 'playwright';
import type { BrowserManager } from '../browser/browser-manager.js';
import type { CrawlResult, PageData } from '../types/discovery.js';
/**
 * Options for SiteCrawler configuration
 */
export interface CrawlerOptions {
    maxConcurrency?: number;
    maxPages?: number;
    excludePatterns?: string[];
    onPageCrawled?: (url: string, count: number) => void;
    pageProcessor?: (page: Page, url: string) => Promise<Partial<PageData>>;
    additionalUrls?: string[];
}
/**
 * Recursive web crawler that visits all same-hostname pages
 * Uses BrowserManager for stealth and cookie dismissal
 */
export declare class SiteCrawler {
    private browserManager;
    private visited;
    private queue;
    private pages;
    private hostname;
    private maxConcurrency;
    private maxPages;
    private excludePatterns;
    private onPageCrawled?;
    private pageProcessor?;
    constructor(browserManager: BrowserManager, options?: CrawlerOptions);
    /**
     * Crawls all same-hostname pages starting from seedUrl
     * @param seedUrl - Starting URL to crawl from
     * @returns CrawlResult with all discovered pages
     */
    crawl(seedUrl: string, additionalUrls?: string[]): Promise<CrawlResult>;
    /**
     * Crawls a single page: navigate, extract data, discover links
     */
    private crawlPage;
    /**
     * Extracts all links from a page
     */
    private extractLinks;
    /**
     * Normalizes a URL for deduplication
     * - Removes fragment (#...)
     * - Removes trailing slash (except root /)
     * - Lowercases hostname
     * - Sorts query parameters
     * - Removes default ports
     */
    private normalizeUrl;
    /**
     * Checks if URL matches any exclude pattern
     */
    private shouldExclude;
}
