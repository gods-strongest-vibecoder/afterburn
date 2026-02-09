/**
 * Ensures Playwright Chromium browser is installed.
 * On first run, downloads the browser (~150-280MB) with progress feedback.
 * Throws if installation fails.
 */
export declare function ensureBrowserInstalled(): Promise<void>;
