// Redacts sensitive data (API keys, tokens, passwords) from text before it reaches LLM prompts or PR comments

/**
 * Redact clearly sensitive patterns from text while preserving useful error context.
 * Conservative approach: only redact things that are obviously secrets.
 */
export function redactSensitiveData(text: string): string {
  if (!text) return text;

  let redacted = text;

  // API key prefixes (OpenAI, GitHub, AWS, Anthropic, Stripe, etc.)
  redacted = redacted.replace(/\b(sk-[a-zA-Z0-9]{20,})/g, '[REDACTED_API_KEY]');
  redacted = redacted.replace(/\b(ghp_[a-zA-Z0-9]{36,})/g, '[REDACTED_GITHUB_TOKEN]');
  redacted = redacted.replace(/\b(ghu_[a-zA-Z0-9]{36,})/g, '[REDACTED_GITHUB_TOKEN]');
  redacted = redacted.replace(/\b(gho_[a-zA-Z0-9]{36,})/g, '[REDACTED_GITHUB_TOKEN]');
  redacted = redacted.replace(/\b(ghs_[a-zA-Z0-9]{36,})/g, '[REDACTED_GITHUB_TOKEN]');
  redacted = redacted.replace(/\b(github_pat_[a-zA-Z0-9_]{22,})/g, '[REDACTED_GITHUB_TOKEN]');
  redacted = redacted.replace(/\b(AKIA[0-9A-Z]{16})/g, '[REDACTED_AWS_KEY]');
  redacted = redacted.replace(/\b(sk-ant-[a-zA-Z0-9-]{20,})/g, '[REDACTED_API_KEY]');
  redacted = redacted.replace(/\b(sk_live_[a-zA-Z0-9]{20,})/g, '[REDACTED_STRIPE_KEY]');
  redacted = redacted.replace(/\b(sk_test_[a-zA-Z0-9]{20,})/g, '[REDACTED_STRIPE_KEY]');
  redacted = redacted.replace(/\b(rk_live_[a-zA-Z0-9]{20,})/g, '[REDACTED_STRIPE_KEY]');
  redacted = redacted.replace(/\b(rk_test_[a-zA-Z0-9]{20,})/g, '[REDACTED_STRIPE_KEY]');

  // Bearer tokens in headers
  redacted = redacted.replace(/(Bearer\s+)[a-zA-Z0-9._\-]{20,}/gi, '$1[REDACTED_TOKEN]');

  // Authorization headers with token values
  redacted = redacted.replace(/(Authorization:\s*)[^\s\n]{20,}/gi, '$1[REDACTED_TOKEN]');

  // password=... or passwd=... or secret=... in query strings or config
  redacted = redacted.replace(/((?:password|passwd|secret|token|apikey|api_key|access_token|auth_token)\s*[=:]\s*)("[^"]*"|'[^']*'|\S{8,})/gi, '$1[REDACTED]');

  // Long hex strings (40+ chars, like SHA tokens or secret keys)
  redacted = redacted.replace(/\b[0-9a-f]{40,}\b/gi, '[REDACTED_HEX_TOKEN]');

  // Long base64-looking strings (32+ chars of alphanumeric with +/=)
  // Only match standalone tokens, not error message prose
  redacted = redacted.replace(/\b[A-Za-z0-9+/]{32,}={0,2}\b/g, (match) => {
    // Only redact if it looks like a real token (has mixed case + digits, not just a word)
    const hasUpper = /[A-Z]/.test(match);
    const hasLower = /[a-z]/.test(match);
    const hasDigit = /[0-9]/.test(match);
    if (hasUpper && hasLower && hasDigit) {
      return '[REDACTED_BASE64_TOKEN]';
    }
    return match;
  });

  return redacted;
}

/**
 * Redact sensitive query parameters from URLs before they reach reports or LLM prompts.
 * Falls back to general text redaction if the URL cannot be parsed.
 */
export function redactSensitiveUrl(url: string): string {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    const sensitiveParams = ['token', 'key', 'apikey', 'api_key', 'secret', 'password', 'passwd', 'access_token', 'auth_token', 'session', 'jwt'];
    for (const param of sensitiveParams) {
      if (parsed.searchParams.has(param)) {
        parsed.searchParams.set(param, '[REDACTED]');
      }
    }
    return parsed.toString();
  } catch {
    return redactSensitiveData(url);
  }
}

/**
 * Sanitize a string for safe inclusion in YAML values.
 * Wraps in double quotes and escapes if value contains YAML special characters.
 */
export function sanitizeForYaml(value: string): string {
  if (!value) return '""';
  // If value contains YAML special chars, wrap in double quotes and escape internal quotes
  if (/[:{}\[\]#&*!|>'"% @`\n]/.test(value)) {
    return '"' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }
  return value;
}

/**
 * Sanitize a string for safe inclusion in Markdown tables.
 * Escapes pipe characters and removes newlines.
 */
export function sanitizeForMarkdown(text: string): string {
  if (!text) return '';
  // Escape pipe chars (for tables) and newlines
  return text.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}
