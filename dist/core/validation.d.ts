/**
 * Validate that a URL uses http:// or https:// scheme.
 * Rejects file://, javascript:, data:, and other dangerous schemes.
 */
export declare function validateUrl(url: string): string;
/**
 * Validate a filesystem path has no path traversal sequences.
 * Resolves to absolute path and rejects ../ sequences.
 */
export declare function validatePath(inputPath: string, label: string, workspaceRoot?: string): string;
/**
 * Validate that a navigation URL stays within the same origin as the base URL.
 * Allows same hostname or subdomains of the base hostname.
 */
export declare function validateNavigationUrl(navigationUrl: string, baseUrl: string): string;
/**
 * Validate and clamp maxPages to a safe range.
 * Returns a safe integer between 1 and 500, defaulting to 50.
 */
export declare function validateMaxPages(value: number | undefined): number;
/**
 * Validate selector string length to prevent abuse.
 * Returns the selector if valid, throws if too long.
 */
export declare function validateSelector(selector: string): string;
/**
 * Sanitize a string value by stripping potential script injection patterns.
 * Removes <script> tags and javascript: URIs from step values.
 */
export declare function sanitizeValue(value: string): string;
