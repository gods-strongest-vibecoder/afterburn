// Recursive web crawler with URL queue, deduplication, and pageProcessor callback
/**
 * Recursive web crawler that visits all same-hostname pages
 * Uses BrowserManager for stealth and cookie dismissal
 */
export class SiteCrawler {
    browserManager;
    visited; // normalized URLs already visited
    queue; // URLs to visit
    pages; // collected page data
    hostname = ''; // seed URL hostname for filtering
    maxConcurrency;
    maxPages;
    excludePatterns;
    onPageCrawled;
    pageProcessor;
    constructor(browserManager, options) {
        this.browserManager = browserManager;
        this.visited = new Set();
        this.queue = [];
        this.pages = [];
        this.maxConcurrency = options?.maxConcurrency ?? 3;
        this.maxPages = options?.maxPages ?? 0;
        this.excludePatterns = options?.excludePatterns ?? [];
        this.onPageCrawled = options?.onPageCrawled;
        this.pageProcessor = options?.pageProcessor;
    }
    /**
     * Crawls all same-hostname pages starting from seedUrl
     * @param seedUrl - Starting URL to crawl from
     * @returns CrawlResult with all discovered pages
     */
    async crawl(seedUrl, additionalUrls) {
        const startTime = Date.now();
        // Extract hostname from seed URL
        const seedUrlObj = new URL(seedUrl);
        this.hostname = seedUrlObj.hostname;
        // Add seed URL to queue
        const normalizedSeed = this.normalizeUrl(seedUrl);
        this.queue.push(normalizedSeed);
        // Add additional URLs (e.g., from SPA route detection)
        if (additionalUrls && additionalUrls.length > 0) {
            for (const url of additionalUrls) {
                try {
                    const urlObj = new URL(url, seedUrl); // Resolve relative URLs
                    if (urlObj.hostname === this.hostname) {
                        const normalized = this.normalizeUrl(urlObj.href);
                        if (!this.visited.has(normalized) && !this.queue.includes(normalized)) {
                            this.queue.push(normalized);
                        }
                    }
                }
                catch {
                    // Skip invalid URLs
                }
            }
        }
        // Process queue in batches
        while (this.queue.length > 0) {
            // Check maxPages limit
            if (this.maxPages > 0 && this.pages.length >= this.maxPages) {
                break;
            }
            // Warn after 50 pages
            if (this.pages.length === 50) {
                console.warn('⚠️  Discovered 50+ pages. Crawl continuing...');
            }
            // Take batch of URLs
            const batch = this.queue.splice(0, this.maxConcurrency);
            // Process batch concurrently
            const results = await Promise.allSettled(batch.map(url => this.crawlPage(url)));
            // Log errors without failing entire crawl
            results.forEach((result, index) => {
                if (result.status === 'rejected') {
                    console.error(`Error crawling ${batch[index]}: ${result.reason}`);
                }
            });
        }
        const duration = Date.now() - startTime;
        return {
            pages: this.pages,
            brokenLinks: [], // Populated by link validator in later plan
            totalPagesDiscovered: this.pages.length,
            totalLinksChecked: 0, // Populated by link validator in later plan
            crawlDuration: duration,
            spaDetected: { framework: 'none' } // Populated by SPA detector in later plan
        };
    }
    /**
     * Crawls a single page: navigate, extract data, discover links
     */
    async crawlPage(url) {
        // Skip if already visited or matches exclude pattern
        if (this.visited.has(url)) {
            return;
        }
        if (this.shouldExclude(url)) {
            return;
        }
        this.visited.add(url);
        let page = null;
        try {
            // Open page via BrowserManager (handles stealth + cookie dismissal)
            page = await this.browserManager.newPage(url);
            // Wait briefly for content to render
            await page.waitForTimeout(500);
            // Extract title
            const title = await page.title();
            // Extract links
            const links = await this.extractLinks(page, url);
            // Create minimal PageData
            const pageData = {
                url,
                title,
                forms: [],
                buttons: [],
                links,
                menus: [],
                otherInteractive: [],
                crawledAt: new Date().toISOString()
            };
            // If pageProcessor provided, call it and merge results
            if (this.pageProcessor) {
                const extraData = await this.pageProcessor(page, url);
                Object.assign(pageData, extraData);
            }
            // Store page data
            this.pages.push(pageData);
            // Notify progress callback
            if (this.onPageCrawled) {
                this.onPageCrawled(url, this.pages.length);
            }
            // Add discovered links to queue
            for (const link of links) {
                if (link.isInternal && !this.visited.has(link.href)) {
                    const normalized = this.normalizeUrl(link.href);
                    if (!this.queue.includes(normalized) && !this.visited.has(normalized)) {
                        this.queue.push(normalized);
                    }
                }
            }
        }
        finally {
            // Always close page
            if (page) {
                await page.close();
            }
        }
    }
    /**
     * Extracts all links from a page
     */
    async extractLinks(page, baseUrl) {
        const links = await page.$$eval('a[href]', (anchors) => {
            return anchors.map((a) => {
                const anchor = a;
                return {
                    href: anchor.href, // Already resolved by browser
                    text: anchor.textContent?.trim() || ''
                };
            });
        });
        // Classify links as internal/external
        return links.map(link => {
            try {
                const linkUrl = new URL(link.href);
                return {
                    href: link.href,
                    text: link.text,
                    isInternal: linkUrl.hostname === this.hostname
                };
            }
            catch {
                // Invalid URL
                return {
                    href: link.href,
                    text: link.text,
                    isInternal: false
                };
            }
        });
    }
    /**
     * Normalizes a URL for deduplication
     * - Removes fragment (#...)
     * - Removes trailing slash (except root /)
     * - Lowercases hostname
     * - Sorts query parameters
     * - Removes default ports
     */
    normalizeUrl(url) {
        try {
            const urlObj = new URL(url);
            // Remove fragment
            urlObj.hash = '';
            // Lowercase hostname
            urlObj.hostname = urlObj.hostname.toLowerCase();
            // Remove default ports
            if ((urlObj.protocol === 'http:' && urlObj.port === '80') ||
                (urlObj.protocol === 'https:' && urlObj.port === '443')) {
                urlObj.port = '';
            }
            // Sort query parameters
            const params = Array.from(urlObj.searchParams.entries()).sort((a, b) => a[0].localeCompare(b[0]));
            urlObj.search = '';
            params.forEach(([key, value]) => urlObj.searchParams.append(key, value));
            // Remove trailing slash (except root)
            let normalized = urlObj.href;
            if (urlObj.pathname !== '/' && normalized.endsWith('/')) {
                normalized = normalized.slice(0, -1);
            }
            return normalized;
        }
        catch {
            return url; // Return as-is if parsing fails
        }
    }
    /**
     * Checks if URL matches any exclude pattern
     */
    shouldExclude(url) {
        return this.excludePatterns.some(pattern => {
            if (pattern.startsWith('*') && pattern.endsWith('*')) {
                // *pattern* - contains
                return url.includes(pattern.slice(1, -1));
            }
            else if (pattern.startsWith('*')) {
                // *.ext - ends with
                return url.endsWith(pattern.slice(1));
            }
            else if (pattern.endsWith('*')) {
                // prefix* - starts with
                return url.startsWith(pattern.slice(0, -1));
            }
            else {
                // exact match
                return url.includes(pattern);
            }
        });
    }
}
//# sourceMappingURL=crawler.js.map