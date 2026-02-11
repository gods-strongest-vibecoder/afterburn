// Broken link detection via HTTP status checking during crawl
import type { Page } from 'playwright';
import type { BrokenLink, LinkInfo } from '../types/discovery.js';
import { isPrivateOrReservedIP } from '../core/validation.js';
import dns from 'node:dns/promises';

// Security caps for link validation
const MAX_LINKS_PER_PAGE = 50;
const MAX_TOTAL_LINKS = 500;

let globalLinkCount = 0;

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

  // Apply per-page cap
  const cappedLinks = httpLinks.slice(0, MAX_LINKS_PER_PAGE);
  if (httpLinks.length > MAX_LINKS_PER_PAGE) {
    console.warn(`Capping link validation to ${MAX_LINKS_PER_PAGE} links per page (${httpLinks.length} found)`);
  }

  // Apply global cap
  const remainingGlobalCapacity = MAX_TOTAL_LINKS - globalLinkCount;
  const linksToCheck = cappedLinks.slice(0, remainingGlobalCapacity);

  if (linksToCheck.length < cappedLinks.length) {
    console.warn(`Global link cap reached (${MAX_TOTAL_LINKS} total). Skipping ${cappedLinks.length - linksToCheck.length} links.`);
  }

  globalLinkCount += linksToCheck.length;

  // Check links with concurrency limit (max 5 concurrent)
  const batchSize = 10;
  for (let i = 0; i < linksToCheck.length; i += batchSize) {
    const batch = linksToCheck.slice(i, i + batchSize);

    const results = await Promise.allSettled(
      batch.map(async (link) => {
        try {
          // SSRF protection: check if URL hostname resolves to private IP
          try {
            const url = new URL(link.href);
            const hostname = url.hostname;

            // Skip DNS check if it's already an IP literal (checked in validateUrl)
            if (!hostname.match(/^\d+\.\d+\.\d+\.\d+$/) && !hostname.includes(':')) {
              // Resolve hostname to IP addresses
              try {
                const addresses = await dns.resolve4(hostname);
                for (const ip of addresses) {
                  if (isPrivateOrReservedIP(ip)) {
                    return {
                      url: link.href,
                      sourceUrl,
                      statusCode: 0,
                      statusText: `SSRF protection: URL resolves to private IP ${ip}`,
                    };
                  }
                }
              } catch (dnsError) {
                // DNS resolution failed - treat as broken link
                return {
                  url: link.href,
                  sourceUrl,
                  statusCode: 0,
                  statusText: `DNS resolution failed: ${dnsError instanceof Error ? dnsError.message : 'Unknown error'}`,
                };
              }
            }
          } catch {
            // URL parsing failed, skip SSRF check
          }

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
              const finalHostname = finalParsed.hostname;

              // Check if final destination is private
              if (finalHostname.match(/^\d+\.\d+\.\d+\.\d+$/) || finalHostname.includes(':')) {
                if (isPrivateOrReservedIP(finalHostname)) {
                  return {
                    url: link.href,
                    sourceUrl,
                    statusCode: 0,
                    statusText: `SSRF protection: Redirect to private IP ${finalHostname}`,
                  };
                }
              }
            } catch {
              // URL parsing failed, continue
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
