import { ensurePublicHostname } from '../core/validation.js';
// Security caps for link validation
const MAX_LINKS_PER_PAGE = 50;
const MAX_TOTAL_LINKS = 500;
export function createLinkValidationState() {
    return { checkedCount: 0 };
}
/**
 * Validates internal links by checking their HTTP status codes.
 * External links are skipped to avoid rate-limiting third-party sites.
 *
 * @param links - All links discovered on a page
 * @param page - Playwright Page instance (maintains session context for auth)
 * @returns Array of broken links (4xx, 5xx, network errors)
 */
export async function validateLinks(links, page, state = createLinkValidationState()) {
    const brokenLinks = [];
    const sourceUrl = page.url();
    const hostnameSafetyCache = new Map();
    const assertHostnameIsPublic = async (hostname) => {
        const normalized = hostname.toLowerCase();
        if (hostnameSafetyCache.has(normalized)) {
            const cachedError = hostnameSafetyCache.get(normalized);
            if (cachedError) {
                throw new Error(cachedError);
            }
            return;
        }
        try {
            await ensurePublicHostname(normalized);
            hostnameSafetyCache.set(normalized, null);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            hostnameSafetyCache.set(normalized, message);
            throw error;
        }
    };
    // Filter to internal links only
    const internalLinks = links.filter(link => link.isInternal);
    // Deduplicate by href (normalize query strings)
    const uniqueUrls = new Map();
    for (const link of internalLinks) {
        try {
            const url = new URL(link.href);
            // Normalize: remove trailing slash, lowercase hostname
            const normalizedHref = `${url.origin}${url.pathname.replace(/\/$/, '')}${url.search}`;
            if (!uniqueUrls.has(normalizedHref)) {
                uniqueUrls.set(normalizedHref, { ...link, href: normalizedHref });
            }
        }
        catch {
            // Invalid URL, skip
            continue;
        }
    }
    // Filter out non-HTTP links
    const httpLinks = Array.from(uniqueUrls.values()).filter(link => {
        const href = link.href.toLowerCase();
        return !href.startsWith('mailto:') &&
            !href.startsWith('tel:') &&
            !href.startsWith('javascript:') &&
            !href.startsWith('data:') &&
            !href.startsWith('#');
    });
    // Apply per-page cap
    const cappedLinks = httpLinks.slice(0, MAX_LINKS_PER_PAGE);
    if (httpLinks.length > MAX_LINKS_PER_PAGE) {
        console.warn(`Capping link validation to ${MAX_LINKS_PER_PAGE} links per page (${httpLinks.length} found)`);
    }
    // Apply global cap
    const remainingGlobalCapacity = MAX_TOTAL_LINKS - state.checkedCount;
    const linksToCheck = cappedLinks.slice(0, remainingGlobalCapacity);
    if (linksToCheck.length < cappedLinks.length) {
        console.warn(`Global link cap reached (${MAX_TOTAL_LINKS} total). Skipping ${cappedLinks.length - linksToCheck.length} links.`);
    }
    state.checkedCount += linksToCheck.length;
    // Check links with concurrency limit (max 10 concurrent)
    const batchSize = 10;
    for (let i = 0; i < linksToCheck.length; i += batchSize) {
        const batch = linksToCheck.slice(i, i + batchSize);
        const results = await Promise.allSettled(batch.map(async (link) => {
            try {
                const initialParsedUrl = new URL(link.href);
                await assertHostnameIsPublic(initialParsedUrl.hostname);
                // Use page.request to maintain browser session context (cookies, auth)
                const response = await page.request.get(link.href, {
                    timeout: 5000,
                    // Follow redirects by default - only final status matters
                });
                // SSRF protection: check final redirect destination
                const finalUrl = response.url();
                if (finalUrl !== link.href) {
                    try {
                        const finalParsed = new URL(finalUrl);
                        await assertHostnameIsPublic(finalParsed.hostname);
                    }
                    catch (error) {
                        return {
                            url: link.href,
                            sourceUrl,
                            statusCode: 0,
                            statusText: error instanceof Error ? error.message : 'SSRF protection: Redirect destination failed validation',
                        };
                    }
                }
                // Check if response is broken (4xx, 5xx)
                if (response.status() >= 400) {
                    return {
                        url: link.href,
                        sourceUrl,
                        statusCode: response.status(),
                        statusText: response.statusText(),
                    };
                }
                return null; // Link is OK
            }
            catch (error) {
                // Network error or timeout
                return {
                    url: link.href,
                    sourceUrl,
                    statusCode: 0,
                    statusText: error instanceof Error ? error.message : 'Network error',
                };
            }
        }));
        // Collect broken links from this batch
        for (const result of results) {
            if (result.status === 'fulfilled' && result.value !== null) {
                brokenLinks.push(result.value);
            }
        }
    }
    return brokenLinks;
}
//# sourceMappingURL=link-validator.js.map