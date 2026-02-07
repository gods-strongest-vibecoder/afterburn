// Broken link detection via HTTP status checking during crawl
import type { Page } from 'playwright';
import type { BrokenLink, LinkInfo } from '../types/discovery.js';

/**
 * Validates internal links by checking their HTTP status codes.
 * External links are skipped to avoid rate-limiting third-party sites.
 *
 * @param links - All links discovered on a page
 * @param page - Playwright Page instance (maintains session context for auth)
 * @returns Array of broken links (4xx, 5xx, network errors)
 */
export async function validateLinks(
  links: LinkInfo[],
  page: Page
): Promise<BrokenLink[]> {
  const brokenLinks: BrokenLink[] = [];
  const sourceUrl = page.url();

  // Filter to internal links only
  const internalLinks = links.filter(link => link.isInternal);

  // Deduplicate by href (normalize query strings)
  const uniqueUrls = new Map<string, LinkInfo>();
  for (const link of internalLinks) {
    try {
      const url = new URL(link.href);
      // Normalize: remove trailing slash, lowercase hostname
      const normalizedHref = `${url.origin}${url.pathname.replace(/\/$/, '')}${url.search}`;

      if (!uniqueUrls.has(normalizedHref)) {
        uniqueUrls.set(normalizedHref, { ...link, href: normalizedHref });
      }
    } catch {
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

  // Check links with concurrency limit (max 5 concurrent)
  const batchSize = 5;
  for (let i = 0; i < httpLinks.length; i += batchSize) {
    const batch = httpLinks.slice(i, i + batchSize);

    const results = await Promise.allSettled(
      batch.map(async (link) => {
        try {
          // Use page.request to maintain browser session context (cookies, auth)
          const response = await page.request.get(link.href, {
            timeout: 5000,
            // Follow redirects by default - only final status matters
          });

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
        } catch (error) {
          // Network error or timeout
          return {
            url: link.href,
            sourceUrl,
            statusCode: 0,
            statusText: error instanceof Error ? error.message : 'Network error',
          };
        }
      })
    );

    // Collect broken links from this batch
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value !== null) {
        brokenLinks.push(result.value);
      }
    }
  }

  return brokenLinks;
}
