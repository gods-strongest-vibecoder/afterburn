// Browser performance metrics capture via Performance API
/**
 * Capture browser performance metrics from a Playwright page
 *
 * @param page - Playwright page to measure
 * @returns Performance metrics including LCP, DOM load time, and total load time
 */
export async function capturePerformanceMetrics(page) {
    try {
        const url = page.url();
        // Wait for load state with timeout
        await page.waitForLoadState('load', { timeout: 10000 });
        // Capture performance metrics via browser Performance API
        const metrics = await page.evaluate(() => {
            return new Promise((resolve) => {
                let lcpValue = 0;
                // Capture LCP via PerformanceObserver with buffered entries
                const lcpObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    if (lastEntry && lastEntry.renderTime) {
                        lcpValue = lastEntry.renderTime;
                    }
                    else if (lastEntry && lastEntry.loadTime) {
                        lcpValue = lastEntry.loadTime;
                    }
                });
                try {
                    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
                }
                catch (e) {
                    // LCP not supported, will use 0
                }
                // Wait 3 seconds for LCP to settle, then capture navigation timing
                setTimeout(() => {
                    lcpObserver.disconnect();
                    const navigation = performance.getEntriesByType('navigation')[0];
                    resolve({
                        lcp: lcpValue,
                        domContentLoaded: navigation?.domContentLoadedEventEnd || 0,
                        totalLoadTime: navigation?.loadEventEnd || 0,
                    });
                }, 3000);
            });
        });
        return {
            url,
            lcp: metrics.lcp,
            domContentLoaded: metrics.domContentLoaded,
            totalLoadTime: metrics.totalLoadTime,
        };
    }
    catch (error) {
        console.error('Performance metrics capture failed:', error);
        // Return safe defaults on error
        return {
            url: page.url(),
            lcp: 0,
            domContentLoaded: 0,
            totalLoadTime: 0,
        };
    }
}
//# sourceMappingURL=performance-monitor.js.map