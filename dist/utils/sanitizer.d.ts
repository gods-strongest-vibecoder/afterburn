/**
 * Redact clearly sensitive patterns from text while preserving useful error context.
 * Conservative approach: only redact things that are obviously secrets.
 */
export declare function redactSensitiveData(text: string): string;
/**
 * Redact sensitive query parameters from URLs before they reach reports or LLM prompts.
 * Falls back to general text redaction if the URL cannot be parsed.
 */
export declare function redactSensitiveUrl(url: string): string;
/**
 * Sanitize a string for safe inclusion in YAML values.
 * Wraps in double quotes and escapes if value contains YAML special characters.
 */
export declare function sanitizeForYaml(value: string): string;
/**
 * Sanitize a string for safe inclusion in Markdown tables.
 * Escapes pipe characters and removes newlines.
 */
export declare function sanitizeForMarkdown(text: string): string;
