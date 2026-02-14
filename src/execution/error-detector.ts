// Page event listeners for passive error detection during workflow execution

import { Page } from 'playwright';
import { ErrorCollector } from '../types/execution.js';
import { redactSensitiveData, redactSensitiveUrl } from '../utils/sanitizer.js';

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
        // Find selector by matching img src or background-image
        let selector = `img[src*="${url.split('/').pop()}"]`;

        // Try to find more specific selector if possible
        try {
          const imgElement = await page.locator(`img[src="${url}"]`).first().elementHandle({ timeout: 1000 });
          if (imgElement) {
            const id = await imgElement.getAttribute('id');
            const className = await imgElement.getAttribute('class');
            if (id) {
              selector = `img#${id}`;
            } else if (className) {
              selector = `img.${className.split(' ')[0]}`;
            }
          }
        } catch {
          // Fallback to generic selector if element not found
        }

        collector.brokenImages.push({
          url,
          selector,
          status,
        });
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
