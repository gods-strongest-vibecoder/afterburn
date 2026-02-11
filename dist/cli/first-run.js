// First-run browser installation check with progress feedback
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import ora from 'ora';
/**
 * Ensures Playwright Chromium browser is installed.
 * On first run, downloads the browser (~150-280MB) with progress feedback.
 * Throws if installation fails.
 */
export async function ensureBrowserInstalled() {
    const spinner = ora('Checking browser installation...').start();
    try {
        // Determine Playwright cache directory based on platform
        // macOS: ~/Library/Caches/ms-playwright
        // Windows: %LOCALAPPDATA%/ms-playwright
        // Linux: ~/.cache/ms-playwright
        let playwrightCache;
        if (process.platform === 'darwin') {
            playwrightCache = path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright');
        }
        else if (process.platform === 'win32') {
            playwrightCache = path.join(process.env.LOCALAPPDATA || os.homedir(), 'ms-playwright');
        }
        else {
            playwrightCache = path.join(os.homedir(), '.cache', 'ms-playwright');
        }
        // Also check PLAYWRIGHT_BROWSERS_PATH env var if set
        if (process.env.PLAYWRIGHT_BROWSERS_PATH) {
            playwrightCache = process.env.PLAYWRIGHT_BROWSERS_PATH;
        }
        // Check if playwright cache exists and has chromium installations
        // Modern Playwright uses chromium_headless_shell, older versions use chromium-
        let browserFound = false;
        if (fs.existsSync(playwrightCache)) {
            const entries = fs.readdirSync(playwrightCache);
            browserFound = entries.some((entry) => entry.startsWith('chromium-') || entry.startsWith('chromium_headless_shell-'));
        }
        if (browserFound) {
            spinner.succeed('Browser ready');
            return;
        }
        // Browser not found - need to download
        spinner.text = 'First run: Downloading Chromium (150-280MB)... this may take a minute';
        // Install chromium (suppress Playwright's own output by piping to null)
        execSync('npx playwright install chromium', {
            stdio: 'pipe',
            encoding: 'utf-8',
        });
        spinner.succeed('Browser installed successfully');
    }
    catch (error) {
        spinner.fail('Browser installation failed');
        throw new Error('Failed to install Chromium. Run manually: npx playwright install chromium');
    }
}
//# sourceMappingURL=first-run.js.map