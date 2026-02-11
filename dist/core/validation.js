// Input validation helpers for security hardening (URL, path, and numeric inputs)
import path from 'node:path';
/**
 * Check if an IP address is private or reserved (loopback, link-local, private ranges)
 * Blocks: 127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16, ::1, fc00::/7
 */
export function isPrivateOrReservedIP(ip) {
    // IPv6 loopback
    if (ip === '::1' || ip === '0000:0000:0000:0000:0000:0000:0000:0001') {
        return true;
    }
    // IPv6 private (fc00::/7)
    if (ip.startsWith('fc') || ip.startsWith('fd')) {
        return true;
    }
    // IPv4 patterns
    const parts = ip.split('.');
    if (parts.length === 4) {
        const first = parseInt(parts[0], 10);
        const second = parseInt(parts[1], 10);
        // 127.0.0.0/8 (loopback)
        if (first === 127)
            return true;
        // 10.0.0.0/8 (private)
        if (first === 10)
            return true;
        // 172.16.0.0/12 (private)
        if (first === 172 && second >= 16 && second <= 31)
            return true;
        // 192.168.0.0/16 (private)
        if (first === 192 && second === 168)
            return true;
        // 169.254.0.0/16 (link-local)
        if (first === 169 && second === 254)
            return true;
    }
    return false;
}
/**
 * Validate that a URL uses http:// or https:// scheme.
 * Rejects file://, javascript:, data:, and other dangerous schemes.
 * Also rejects URLs resolving to private/loopback IPs (SSRF protection).
 */
export function validateUrl(url) {
    const trimmed = url.trim();
    let parsed;
    try {
        parsed = new URL(trimmed);
    }
    catch {
        throw new Error(`Invalid URL: "${trimmed}". Must be a valid http:// or https:// URL.`);
    }
    const allowedProtocols = ['http:', 'https:'];
    if (!allowedProtocols.includes(parsed.protocol)) {
        throw new Error(`Unsafe URL scheme "${parsed.protocol}" in "${trimmed}". Only http:// and https:// are allowed.`);
    }
    // SSRF protection: check if hostname resolves to private IP
    // Note: This is a synchronous check for IP literals. DNS resolution is async and happens in link-validator.
    const hostname = parsed.hostname;
    // Check if hostname is already an IP literal
    if (hostname.match(/^\d+\.\d+\.\d+\.\d+$/) || hostname.includes(':')) {
        if (isPrivateOrReservedIP(hostname)) {
            throw new Error(`SSRF protection: URL "${trimmed}" resolves to private/loopback address "${hostname}". Only public URLs are allowed.`);
        }
    }
    return trimmed;
}
/**
 * Validate a filesystem path has no path traversal sequences.
 * Resolves to absolute path and rejects ../ sequences.
 */
export function validatePath(inputPath, label, workspaceRoot) {
    const trimmed = inputPath.trim();
    // Reject obvious traversal patterns before resolving
    // Security: prevent escaping intended directory boundaries
    if (trimmed.includes('..')) {
        throw new Error(`Path traversal detected in ${label}: "${trimmed}". Paths must not contain ".." sequences.`);
    }
    // Resolve to absolute path
    const resolved = path.resolve(trimmed);
    // If workspace root specified, enforce containment
    if (workspaceRoot) {
        const resolvedRoot = path.resolve(workspaceRoot);
        // Use path.relative for proper containment check (prevents bypass via symlinks/normalization)
        const relativePath = path.relative(resolvedRoot, resolved);
        if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
            throw new Error(`${label} escapes workspace root "${resolvedRoot}". Got: "${resolved}"`);
        }
    }
    return resolved;
}
/**
 * Validate that a navigation URL stays within the same origin as the base URL.
 * Allows same hostname or subdomains of the base hostname.
 */
export function validateNavigationUrl(navigationUrl, baseUrl) {
    const validated = validateUrl(navigationUrl);
    const navParsed = new URL(validated);
    const baseParsed = new URL(baseUrl);
    // Allow same hostname or subdomains
    if (navParsed.hostname !== baseParsed.hostname &&
        !navParsed.hostname.endsWith('.' + baseParsed.hostname)) {
        throw new Error(`Navigation to "${navParsed.hostname}" blocked. Only same-origin navigation allowed (base: "${baseParsed.hostname}").`);
    }
    return validated;
}
/**
 * Validate and clamp maxPages to a safe range.
 * Returns a safe integer between 1 and 500, defaulting to 50.
 * Special case: 0 means "unlimited" but still capped at 500.
 */
export function validateMaxPages(value) {
    if (value === undefined || value === null || isNaN(value) || value < 0) {
        return 50; // Safe default
    }
    // Special case: 0 means unlimited (but we still cap at 500 for safety)
    if (value === 0) {
        return 500;
    }
    // Clamp to [1, 500] range to prevent resource exhaustion
    return Math.min(Math.max(Math.floor(value), 1), 500);
}
/**
 * Validate selector string length to prevent abuse.
 * Returns the selector if valid, throws if too long.
 */
export function validateSelector(selector) {
    const MAX_SELECTOR_LENGTH = 500;
    if (selector.length > MAX_SELECTOR_LENGTH) {
        throw new Error(`Selector too long (${selector.length} chars, max ${MAX_SELECTOR_LENGTH}). Possible injection attempt.`);
    }
    return selector;
}
/**
 * Sanitize a string value by stripping potential script injection patterns.
 * Removes <script> tags and javascript: URIs from step values.
 */
export function sanitizeValue(value) {
    // Strip <script> tags (case-insensitive, handles attributes)
    let sanitized = value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    // Strip javascript: URIs
    sanitized = sanitized.replace(/javascript\s*:/gi, '');
    // Strip event handlers in attributes (onclick=, onerror=, etc.)
    sanitized = sanitized.replace(/\bon\w+\s*=/gi, '');
    return sanitized;
}
/**
 * Sanitize session ID for filesystem usage
 * Replaces invalid filename characters with underscores
 */
export function sanitizeSessionId(sessionId) {
    // Allow only alphanumeric, dash, and underscore
    return sessionId.replace(/[^a-zA-Z0-9_-]/g, '_');
}
//# sourceMappingURL=validation.js.map