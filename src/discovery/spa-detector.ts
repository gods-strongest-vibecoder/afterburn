// SPA framework detection and client-side route discovery via History API interception

import type { Page } from 'playwright';
import type { SPAFramework } from '../types/discovery.js';

/**
 * Detect SPA framework from window properties and DOM attributes
 * Priority: Next.js before React, Nuxt before Vue (meta-frameworks use underlying frameworks)
 */
export async function detectSPAFramework(page: Page): Promise<SPAFramework> {
  return await page.evaluate(() => {
    // Next.js detection (check before React)
    const nextData = document.querySelector('script#__NEXT_DATA__');
    if (nextData || (window as any).__NEXT_DATA__) {
      try {
        const version = (window as any).__NEXT_DATA__?.buildId;
        return {
          framework: 'next' as const,
          version,
          router: 'next-router',
        };
      } catch {
        return { framework: 'next' as const, router: 'next-router' };
      }
    }

    // Nuxt detection (check before Vue)
    if ((window as any).__NUXT__ || document.querySelector('[data-n-head]')) {
      try {
        const version = (window as any).__NUXT__?.config?.app?.version;
        return {
          framework: 'nuxt' as const,
          version,
          router: 'nuxt-router',
        };
      } catch {
        return { framework: 'nuxt' as const, router: 'nuxt-router' };
      }
    }

    // React detection
    const reactContainer = Object.keys(document.body || {}).find((k) =>
      k.startsWith('__reactContainer')
    );
    const reactDevtools = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (reactContainer || reactDevtools) {
      try {
        const version = reactDevtools?.renderers?.values()?.next()?.value?.version;
        return {
          framework: 'react' as const,
          version,
          router: 'react-router',
        };
      } catch {
        return { framework: 'react' as const, router: 'react-router' };
      }
    }

    // Vue detection
    const vueAttr = document.querySelector('[data-v-]');
    if ((window as any).__VUE__ || (window as any).Vue || vueAttr) {
      try {
        const version = (window as any).Vue?.version || (window as any).__VUE__?.version;
        return {
          framework: 'vue' as const,
          version,
          router: 'vue-router',
        };
      } catch {
        return { framework: 'vue' as const, router: 'vue-router' };
      }
    }

    // Angular detection
    const ngVersion = document.querySelector('[ng-version]');
    if ((window as any).ng || ngVersion || document.querySelector('app-root')) {
      try {
        const version =
          ngVersion?.getAttribute('ng-version') || (window as any).ng?.version?.full;
        return {
          framework: 'angular' as const,
          version,
          router: 'angular-router',
        };
      } catch {
        return { framework: 'angular' as const, router: 'angular-router' };
      }
    }

    // Svelte detection
    if (document.querySelector('[data-svelte-h]')) {
      return {
        framework: 'svelte' as const,
        router: 'sveltekit',
      };
    }

    return { framework: 'none' as const };
  });
}

/**
 * Intercept History API and discover client-side routes by clicking navigation elements
 * Returns array of unique discovered route URLs
 */
export async function interceptRouteChanges(page: Page): Promise<string[]> {
  const discoveredRoutes = new Set<string>();
  const startUrl = page.url();
  const startHostname = new URL(startUrl).hostname;

  // Set hard timeout for entire function (30 seconds)
  const timeoutMs = 30000;
  const startTime = Date.now();

  try {
    // Inject History API interceptor
    await page.addInitScript(() => {
      (window as any).__afterburn_routes = [];

      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;

      history.pushState = function (data: any, unused: string, url?: string | URL | null) {
        if (url) {
          (window as any).__afterburn_routes.push(url);
        }
        return originalPushState.apply(history, arguments as any);
      };

      history.replaceState = function (data: any, unused: string, url?: string | URL | null) {
        if (url) {
          (window as any).__afterburn_routes.push(url);
        }
        return originalReplaceState.apply(history, arguments as any);
      };

      // Listen for popstate events
      window.addEventListener('popstate', () => {
        (window as any).__afterburn_routes.push(location.pathname + location.search);
      });
    });

    // Find all navigation-like elements
    const navLinks = await page.locator('nav a, [role="navigation"] a, header a').all();
    const allLinks = await page.getByRole('link').all();
    const navigationElements = [...new Set([...navLinks, ...allLinks])];

    // Filter for internal navigation (skip buttons like "Delete", "Submit", "Cancel")
    const skipWords = [
      'delete',
      'remove',
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
        if (!href) continue;

        // Skip if text suggests it's not navigation
        if (skipWords.some((word) => text.includes(word))) {
          continue;
        }

        // Check if internal (starts with / or same hostname)
        let isInternal = false;
        if (href.startsWith('/')) {
          isInternal = true;
        } else {
          try {
            const linkUrl = new URL(href, startUrl);
            isInternal = linkUrl.hostname === startHostname;
          } catch {
            continue;
          }
        }

        if (!isInternal) continue;

        // Store current URL
        const beforeUrl = page.url();

        // Try clicking the element
        try {
          await element.click({ timeout: 2000 });

          // Wait for navigation or route change
          try {
            await page.waitForLoadState('domcontentloaded', { timeout: 3000 });
          } catch {
            // Timeout is okay - route might have changed without full page load
          }

          // Collect discovered routes from window.__afterburn_routes
          const routes = await page.evaluate(() => {
            return (window as any).__afterburn_routes || [];
          });

          for (const route of routes) {
            try {
              const absoluteUrl = new URL(route, startUrl).href;
              discoveredRoutes.add(absoluteUrl);
            } catch {
              // Invalid URL, skip
            }
          }

          // Add current URL if it changed
          const afterUrl = page.url();
          if (afterUrl !== beforeUrl) {
            discoveredRoutes.add(afterUrl);
          }

          // Navigate back to original page
          if (page.url() !== beforeUrl) {
            try {
              await page.goBack({ timeout: 3000, waitUntil: 'domcontentloaded' });
            } catch {
              // If goBack fails, navigate directly
              try {
                await page.goto(beforeUrl, { timeout: 5000, waitUntil: 'domcontentloaded' });
              } catch {
                // If we can't go back, break the loop
                break;
              }
            }
          }
        } catch (error) {
          // Click failed - element might trigger download, alert, or be stale
          // Continue to next element
          continue;
        }
      } catch {
        // Failed to get attributes or interact with element
        continue;
      }
    }
  } catch (error) {
    // Entire function failed - return what we have
  }

  return Array.from(discoveredRoutes);
}
