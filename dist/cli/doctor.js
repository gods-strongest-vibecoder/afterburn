// Pre-flight environment checks for Afterburn
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import dns from 'node:dns';
/**
 * Check Node.js version >= 18
 */
export function checkNodeVersion() {
    const version = process.versions.node;
    const major = parseInt(version.split('.')[0], 10);
    if (major >= 18) {
        return { name: 'Node.js', status: 'pass', message: `v${version} (>= 18 required)`, required: true };
    }
    return { name: 'Node.js', status: 'fail', message: `v${version} (>= 18 required, yours is too old)`, required: true };
}
/**
 * Check if Playwright Chromium browser is installed
 */
export function checkBrowserInstalled() {
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
    if (fs.existsSync(playwrightCache)) {
        try {
            const entries = fs.readdirSync(playwrightCache);
            const found = entries.some((entry) => entry.startsWith('chromium-') || entry.startsWith('chromium_headless_shell-'));
            if (found) {
                return { name: 'Chromium browser', status: 'pass', message: 'Installed', required: true };
            }
        }
        catch {
            // Directory exists but can't be read
        }
    }
    return {
        name: 'Chromium browser',
        status: 'fail',
        message: 'Not found. Run: npx playwright install chromium',
        required: true,
    };
}
/**
 * Check if GEMINI_API_KEY is set (optional, warn only)
 */
export function checkApiKey() {
    const key = process.env.GEMINI_API_KEY;
    if (key && key.trim().length > 0) {
        return { name: 'GEMINI_API_KEY', status: 'pass', message: 'Set', required: false };
    }
    return {
        name: 'GEMINI_API_KEY',
        status: 'warn',
        message: 'Not set (AI features disabled, heuristic mode will be used)',
        required: false,
    };
}
/**
 * Check network connectivity by resolving a known host
 */
export async function checkNetwork() {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            resolve({ name: 'Network', status: 'warn', message: 'DNS resolution timed out', required: false });
        }, 5000);
        dns.lookup('registry.npmjs.org', (err) => {
            clearTimeout(timeout);
            if (err) {
                resolve({ name: 'Network', status: 'warn', message: 'Cannot resolve DNS (offline?)', required: false });
            }
            else {
                resolve({ name: 'Network', status: 'pass', message: 'Connectivity OK', required: false });
            }
        });
    });
}
/**
 * Run all doctor checks and return results + exit code
 */
export async function runDoctor() {
    const results = [];
    results.push(checkNodeVersion());
    results.push(checkBrowserInstalled());
    results.push(checkApiKey());
    results.push(await checkNetwork());
    const failedRequired = results.some(r => r.required && r.status === 'fail');
    return { results, exitCode: failedRequired ? 1 : 0 };
}
/**
 * Format and print doctor results to console
 */
export function printDoctorResults(results, exitCode) {
    console.log('Afterburn Doctor\n');
    for (const result of results) {
        const icon = result.status === 'pass' ? '[PASS]'
            : result.status === 'warn' ? '[WARN]'
                : '[FAIL]';
        console.log(`  ${icon} ${result.name}: ${result.message}`);
    }
    console.log('');
    if (exitCode === 0) {
        console.log('All checks passed! Ready to scan.');
    }
    else {
        const failCount = results.filter(r => r.required && r.status === 'fail').length;
        console.log(`${failCount} check(s) failed.`);
    }
}
//# sourceMappingURL=doctor.js.map