/**
 * Check if an IP address is private or reserved (loopback, link-local, private ranges)
 * Blocks: 127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16, ::1, fc00::/7
 */
export declare function isPrivateOrReservedIP(ip: string): boolean;
/**
 * Validate that a URL uses http:// or https:// scheme.
 * Rejects file://, javascript:, data:, and other dangerous schemes.
 * Also rejects URLs resolving to private/loopback IPs (SSRF protection).
 */
export declare function validateUrl(url: string): string;
export type HostLookupFn = (hostname: string) => Promise<string[]>;
/**
 * Enforce that a hostname resolves only to public IP addresses.
 * Rejects localhost names, private ranges, and DNS failures.
 */
export declare function ensurePublicHostname(hostname: string, lookup?: HostLookupFn): Promise<void>;
/**
 * Validate URL format and ensure hostname resolves to public IP space.
 */
export declare function validatePublicUrl(url: string, lookup?: HostLookupFn): Promise<string>;
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
 * Special case: 0 means "unlimited" but still capped at 500.
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
/**
 * Sanitize session ID for filesystem usage
 * Replaces invalid filename characters with underscores
 */
export declare function sanitizeSessionId(sessionId: string): string;
