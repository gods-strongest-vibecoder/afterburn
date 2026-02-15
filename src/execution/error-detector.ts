// Page event listeners for passive error detection during workflow execution

import { Page } from 'playwright';
import { ErrorCollector } from '../types/execution.js';
import { redactSensitiveData, redactSensitiveUrl } from '../utils/sanitizer.js';

function isNextImageOptimizerUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return parsed.pathname === '/_next/image';
  } catch {
    return rawUrl.includes('/_next/image');
  }
}

/**
 * Set up page event listeners to capture errors passively
 * Returns collector and cleanup function
 */
export function setupErrorListeners(page: Page): { collector: ErrorCollector; cleanup: () => void } {
  const collector: ErrorCollector = {
    consoleErrors: [],
    networkFailures: [],
    brokenImages: [],
  };

  // Console error capture (only console.error, not warnings/logs)
  const consoleHandler = (msg: any) => {
    if (msg.type() === 'error') {
      const messageUrl = typeof msg.location === 'function'
        ? (msg.location()?.url || '')
        : '';
      if (isNextImageOptimizerUrl(messageUrl)) {
        return;
      }

      collector.consoleErrors.push({
        message: redactSensitiveData(msg.text()),
        url: page.url(),
        timestamp: new Date().toISOString(),
      });
    }
  };

  // Network failure capture (4xx and 5xx responses)
  const responseHandler = async (response: any) => {
    const status = response.status();
    const url = response.url();

    // Capture failed HTTP requests (4xx and 5xx)
    if (status >= 400) {
      // Ignore internal Next.js image optimizer failures (e.g., invalid remote URLs).
      // These requests are framework-internal noise and create false-positive report issues.
      if (isNextImageOptimizerUrl(url)) {
        return;
      }

      const resourceType = response.request().resourceType();

      // Add to network failures
      collector.networkFailures.push({
        url: redactSensitiveUrl(url),
        status,
        method: response.request().method(),
        resourceType,
      });

      // Detect broken images specifically
      const isImage = resourceType === 'image' || /\.(jpg|jpeg|png|gif|svg|webp|ico)$/i.test(url);
      if (isImage) {
        // Verify the image element actually exists in the current DOM.
        // Transient requests during SPA hydration (e.g. Next.js) can fire 4xx
        // responses for images that are never in the final rendered page.
        let selector: string | null = null;

        try {
          const imgElement = await page.locator(`img[src="${url}"]`).first().elementHandle({ timeout: 1000 });
          if (imgElement) {
            const id = await imgElement.getAttribute('id');
            const className = await imgElement.getAttribute('class');
            if (id) {
              selector = `img#${id}`;
            } else if (className) {
              selector = `img.${className.split(' ')[0]}`;
            } else {
              selector = `img[src*="${url.split('/').pop()}"]`;
            }
          }
        } catch {
          // Element not found in DOM — transient/phantom image
        }

        // Only report broken images that actually exist in the rendered DOM
        if (selector) {
          collector.brokenImages.push({
            url,
            selector,
            status,
          });
        }
      }
    }
  };

  // Uncaught exception capture (TypeError, ReferenceError, SyntaxError, etc.)
  const pageErrorHandler = (error: Error) => {
    collector.consoleErrors.push({
      message: redactSensitiveData(`Uncaught ${error.name}: ${error.message}`),
      url: page.url(),
      timestamp: new Date().toISOString(),
    });
  };

  // Register listeners
  page.on('console', consoleHandler);
  page.on('response', responseHandler);
  page.on('pageerror', pageErrorHandler);

  // Cleanup function to remove listeners
  const cleanup = () => {
    page.off('console', consoleHandler);
    page.off('response', responseHandler);
    page.off('pageerror', pageErrorHandler);
  };

  return { collector, cleanup };
}
