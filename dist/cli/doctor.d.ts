export type CheckStatus = 'pass' | 'warn' | 'fail';
export interface CheckResult {
    name: string;
    status: CheckStatus;
    message: string;
    required: boolean;
}
/**
 * Check Node.js version >= 18
 */
export declare function checkNodeVersion(): CheckResult;
/**
 * Check if Playwright Chromium browser is installed
 */
export declare function checkBrowserInstalled(): CheckResult;
/**
 * Check if GEMINI_API_KEY is set (optional, warn only)
 */
export declare function checkApiKey(): CheckResult;
/**
 * Check network connectivity by resolving a known host
 */
export declare function checkNetwork(): Promise<CheckResult>;
/**
 * Run all doctor checks and return results + exit code
 */
export declare function runDoctor(): Promise<{
    results: CheckResult[];
    exitCode: number;
}>;
/**
 * Format and print doctor results to console
 */
export declare function printDoctorResults(results: CheckResult[], exitCode: number): void;
