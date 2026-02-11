// SPA framework detection and client-side route discovery via History API interception
/**
 * Detect SPA framework from window properties and DOM attributes
 * Priority: Next.js before React, Nuxt before Vue (meta-frameworks use underlying frameworks)
 */
export async function detectSPAFramework(page) {
    return await page.evaluate(() => {
        // Next.js detection (check before React)
        const nextData = document.querySelector('script#__NEXT_DATA__');
        if (nextData || window.__NEXT_DATA__) {
            try {
                const version = window.__NEXT_DATA__?.buildId;
                return {
                    framework: 'next',
                    version,
                    router: 'next-router',
                };
            }
            catch {
                return { framework: 'next', router: 'next-router' };
            }
        }
        // Nuxt detection (check before Vue)
        if (window.__NUXT__ || document.querySelector('[data-n-head]')) {
            try {
                const version = window.__NUXT__?.config?.app?.version;
                return {
                    framework: 'nuxt',
                    version,
                    router: 'nuxt-router',
                };
            }
            catch {
                return { framework: 'nuxt', router: 'nuxt-router' };
            }
        }
        // React detection
        const reactContainer = Object.keys(document.body || {}).find((k) => k.startsWith('__reactContainer'));
        const reactDevtools = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
        if (reactContainer || reactDevtools) {
            try {
                const version = reactDevtools?.renderers?.values()?.next()?.value?.version;
                return {
                    framework: 'react',
                    version,
                    router: 'react-router',
                };
            }
            catch {
                return { framework: 'react', router: 'react-router' };
            }
        }
        // Vue detection
        const vueAttr = document.querySelector('[data-v-]');
        if (window.__VUE__ || window.Vue || vueAttr) {
            try {
                const version = window.Vue?.version || window.__VUE__?.version;
                return {
                    framework: 'vue',
                    version,
                    router: 'vue-router',
                };
            }
            catch {
                return { framework: 'vue', router: 'vue-router' };
            }
        }
        // Angular detection
        const ngVersion = document.querySelector('[ng-version]');
        if (window.ng || ngVersion || document.querySelector('app-root')) {
            try {
                const version = ngVersion?.getAttribute('ng-version') || window.ng?.version?.full;
                return {
                    framework: 'angular',
                    version,
                    router: 'angular-router',
                };
            }
            catch {
                return { framework: 'angular', router: 'angular-router' };
            }
        }
        // Svelte detection
        if (document.querySelector('[data-svelte-h]')) {
            return {
                framework: 'svelte',
                router: 'sveltekit',
            };
        }
        return { framework: 'none' };
    });
}
/**
 * Intercept History API and discover client-side routes by clicking navigation elements
 * Returns array of unique discovered route URLs
 */
export async function interceptRouteChanges(page) {
    const discoveredRoutes = new Set();
    const startUrl = page.url();
    const startHostname = new URL(startUrl).hostname;
    // Set hard timeout for entire function (30 seconds)
    const timeoutMs = 30000;
    const startTime = Date.now();
    try {
        // Inject History API interceptor
        await page.addInitScript(() => {
            window.__afterburn_routes = [];
            const originalPushState = history.pushState;
            const originalReplaceState = history.replaceState;
            history.pushState = function (data, unused, url) {
                if (url) {
                    window.__afterburn_routes.push(url);
                }
                return originalPushState.apply(history, arguments);
            };
            history.replaceState = function (data, unused, url) {
                if (url) {
                    window.__afterburn_routes.push(url);
                }
                return originalReplaceState.apply(history, arguments);
            };
            // Listen for popstate events
            window.addEventListener('popstate', () => {
                window.__afterburn_routes.push(location.pathname + location.search);
            });
        });
        // Find all navigation-like elements
        const navLinks = await page.locator('nav a, [role="navigation"] a, header a').all();
        const allLinks = await page.getByRole('link').all();
        const navigationElements = [...new Set([...navLinks, ...allLinks])];
        // Filter for internal navigation (skip destructive actions)
        const skipWords = [
            'delete',
            'remove',
            'destroy',
            'reset',
            'clear',
            'drop',
            'purge',
            'revoke',
            'terminate',
            'unsubscribe',
            'cancel-account',
            'close-account',
            'cancel',
            'submit',
            'download',
            'logout',
            'log out',
            'sign out',
        ];
        for (const element of navigationElements) {
            // Check timeout
            if (Date.now() - startTime > timeoutMs) {
                break;
            }
            try {
                const href = await element.getAttribute('href');
                const text = (await element.textContent())?.toLowerCase() || '';
                // Skip if no href or external link
                if (!href)
                    continue;
                // Skip if text suggests it's not navigation
                if (skipWords.some((word) => text.includes(word))) {
                    continue;
                }
                // Check if internal (starts with / or same hostname)
                let isInternal = false;
                if (href.startsWith('/')) {
                    isInternal = true;
                }
                else {
                    try {
                        const linkUrl = new URL(href, startUrl);
                        isInternal = linkUrl.hostname === startHostname;
                    }
                    catch {
                        continue;
                    }
                }
                if (!isInternal)
                    continue;
                // Store current URL
                const beforeUrl = page.url();
                // Try clicking the element
                try {
                    await element.click({ timeout: 2000 });
                    // Wait for navigation or route change
                    try {
                        await page.waitForLoadState('domcontentloaded', { timeout: 3000 });
                    }
                    catch {
                        // Timeout is okay - route might have changed without full page load
                    }
                    // Check if navigation left the original origin
                    const afterUrl = page.url();
                    const afterOrigin = new URL(afterUrl).origin;
                    const startOrigin = new URL(startUrl).origin;
                    if (afterOrigin !== startOrigin) {
                        // Off-origin navigation detected - go back
                        try {
                            await page.goBack({ timeout: 3000, waitUntil: 'domcontentloaded' });
                        }
                        catch {
                            // If goBack fails, navigate directly
                            try {
                                await page.goto(beforeUrl, { timeout: 5000, waitUntil: 'domcontentloaded' });
                            }
                            catch {
                                // Can't go back, break loop
                                break;
                            }
                        }
                        continue; // Skip this link
                    }
                    // Collect discovered routes from window.__afterburn_routes
                    const routes = await page.evaluate(() => {
                        return window.__afterburn_routes || [];
                    });
                    for (const route of routes) {
                        try {
                            const absoluteUrl = new URL(route, startUrl).href;
                            discoveredRoutes.add(absoluteUrl);
                        }
                        catch {
                            // Invalid URL, skip
                        }
                    }
                    // Add current URL if it changed
                    if (afterUrl !== beforeUrl) {
                        discoveredRoutes.add(afterUrl);
                    }
                    // Navigate back to original page
                    if (page.url() !== beforeUrl) {
                        try {
                            await page.goBack({ timeout: 3000, waitUntil: 'domcontentloaded' });
                        }
                        catch {
                            // If goBack fails, navigate directly
                            try {
                                await page.goto(beforeUrl, { timeout: 5000, waitUntil: 'domcontentloaded' });
                            }
                            catch {
                                // If we can't go back, break the loop
                                break;
                            }
                        }
                    }
                }
                catch (error) {
                    // Click failed - element might trigger download, alert, or be stale
                    // Continue to next element
                    continue;
                }
            }
            catch {
                // Failed to get attributes or interact with element
                continue;
            }
        }
    }
    catch (error) {
        // Entire function failed - return what we have
    }
    return Array.from(discoveredRoutes);
}
//# sourceMappingURL=spa-detector.js.map