// Input validation helpers for security hardening (URL, path, and numeric inputs)
import path from 'node:path';
/**
 * Validate that a URL uses http:// or https:// scheme.
 * Rejects file://, javascript:, data:, and other dangerous schemes.
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
        if (!resolved.startsWith(resolvedRoot)) {
            throw new Error(`${label} must be within workspace root "${resolvedRoot}". Got: "${resolved}"`);
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
 */
export function validateMaxPages(value) {
    if (value === undefined || value === null || isNaN(value) || value <= 0) {
        return 50; // Safe default
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
//# sourceMappingURL=validation.js.map