// Unit tests for untested security/utility functions: validation, sanitization, and dead-button detection
import { describe, it, expect, vi } from 'vitest';
import { validateNavigationUrl } from '../../src/core/validation.js';
import { redactSensitiveUrl, sanitizeForYaml, sanitizeForMarkdown, sanitizeForMarkdownInline } from '../../src/utils/sanitizer.js';
import { checkDeadButton, captureClickState } from '../../src/execution/step-handlers.js';
import type { ClickStateSnapshot } from '../../src/execution/step-handlers.js';

// ─── validateNavigationUrl ───────────────────────────────────────────────────

describe('validateNavigationUrl', () => {
  const base = 'https://example.com';

  it('allows same-origin navigation', () => {
    const result = validateNavigationUrl('https://example.com/about', base);
    expect(result).toBe('https://example.com/about');
  });

  it('allows subdomain navigation', () => {
    const result = validateNavigationUrl('https://api.example.com/v1', base);
    expect(result).toBe('https://api.example.com/v1');
  });

  it('allows deeply nested subdomain', () => {
    const result = validateNavigationUrl('https://a.b.example.com/path', base);
    expect(result).toBe('https://a.b.example.com/path');
  });

  it('rejects cross-origin navigation', () => {
    expect(() => validateNavigationUrl('https://evil.com/steal', base)).toThrow('blocked');
  });

  it('rejects domain that merely contains the base hostname', () => {
    // "notexample.com" is not a subdomain of "example.com"
    expect(() => validateNavigationUrl('https://notexample.com', base)).toThrow('blocked');
  });

  it('rejects invalid URL', () => {
    expect(() => validateNavigationUrl('not-a-url', base)).toThrow('Invalid URL');
  });

  it('rejects javascript: scheme', () => {
    expect(() => validateNavigationUrl('javascript:alert(1)', base)).toThrow('Unsafe URL scheme');
  });

  it('rejects data: scheme', () => {
    expect(() => validateNavigationUrl('data:text/html,<h1>hi</h1>', base)).toThrow('Unsafe URL scheme');
  });

  it('rejects file: scheme', () => {
    expect(() => validateNavigationUrl('file:///etc/passwd', base)).toThrow('Unsafe URL scheme');
  });

  it('trims whitespace from URL', () => {
    const result = validateNavigationUrl('  https://example.com/page  ', base);
    expect(result).toBe('https://example.com/page');
  });
});

// ─── redactSensitiveUrl ──────────────────────────────────────────────────────

describe('redactSensitiveUrl', () => {
  it('redacts token query parameter', () => {
    const result = redactSensitiveUrl('https://example.com/api?token=secret123');
    expect(result).toContain('token=%5BREDACTED%5D');
    expect(result).not.toContain('secret123');
  });

  it('redacts key query parameter', () => {
    const result = redactSensitiveUrl('https://example.com/api?key=mysecretkey');
    expect(result).toContain('key=%5BREDACTED%5D');
    expect(result).not.toContain('mysecretkey');
  });

  it('redacts password query parameter', () => {
    const result = redactSensitiveUrl('https://example.com/login?password=hunter2');
    expect(result).not.toContain('hunter2');
  });

  it('redacts api_key query parameter', () => {
    const result = redactSensitiveUrl('https://example.com?api_key=abc123');
    expect(result).not.toContain('abc123');
  });

  it('redacts access_token query parameter', () => {
    const result = redactSensitiveUrl('https://example.com?access_token=mytoken');
    expect(result).not.toContain('mytoken');
  });

  it('redacts multiple sensitive params at once', () => {
    const result = redactSensitiveUrl('https://example.com?token=a&key=b&safe=ok');
    expect(result).not.toContain('token=a');
    expect(result).not.toContain('key=b');
    expect(result).toContain('safe=ok');
  });

  it('leaves normal URLs untouched', () => {
    const url = 'https://example.com/path?page=1&sort=name';
    const result = redactSensitiveUrl(url);
    expect(result).toBe(url);
  });

  it('handles URL with no query string', () => {
    const url = 'https://example.com/about';
    expect(redactSensitiveUrl(url)).toBe(url);
  });

  it('falls back to text redaction for malformed URL', () => {
    // Not a valid URL, so it falls through to redactSensitiveData
    const result = redactSensitiveUrl('not-a-valid-url');
    // Should not throw, just return something
    expect(typeof result).toBe('string');
  });

  it('returns empty string for empty input', () => {
    expect(redactSensitiveUrl('')).toBe('');
  });

  it('falls back to text redaction that catches API keys in non-parseable strings', () => {
    // No colon-scheme means URL() constructor throws, triggering the fallback to redactSensitiveData
    const result = redactSensitiveUrl('my secret sk-abcdefghijklmnopqrstuvwxyz1234567890 is here');
    expect(result).toContain('[REDACTED_API_KEY]');
    expect(result).not.toContain('sk-abcdefghijklmnopqrstuvwxyz1234567890');
  });
});

// ─── sanitizeForYaml ─────────────────────────────────────────────────────────

describe('sanitizeForYaml', () => {
  it('returns simple alphanumeric string as-is (no special chars)', () => {
    // Note: space is a YAML special char, so 'hello world' gets quoted
    expect(sanitizeForYaml('helloworld')).toBe('helloworld');
  });

  it('wraps string with spaces in double quotes (space is YAML-special)', () => {
    expect(sanitizeForYaml('hello world')).toBe('"hello world"');
  });

  it('wraps string with colons in double quotes', () => {
    const result = sanitizeForYaml('key: value');
    expect(result).toBe('"key: value"');
  });

  it('wraps string with brackets in double quotes', () => {
    expect(sanitizeForYaml('[list item]')).toBe('"[list item]"');
  });

  it('wraps string with hash in double quotes', () => {
    expect(sanitizeForYaml('# comment')).toBe('"# comment"');
  });

  it('escapes internal double quotes', () => {
    const result = sanitizeForYaml('say "hello"');
    expect(result).toBe('"say \\"hello\\""');
  });

  it('wraps string with newlines in double quotes', () => {
    const result = sanitizeForYaml('line1\nline2');
    // The function wraps in quotes but preserves the literal newline (does not escape to \\n)
    expect(result).toBe('"line1\nline2"');
  });

  it('returns empty double-quotes for empty string', () => {
    expect(sanitizeForYaml('')).toBe('""');
  });

  it('wraps string with ampersand in double quotes', () => {
    expect(sanitizeForYaml('a & b')).toBe('"a & b"');
  });

  it('wraps string with exclamation mark', () => {
    expect(sanitizeForYaml('!important')).toBe('"!important"');
  });

  it('escapes backslashes before quotes', () => {
    const result = sanitizeForYaml('path\\to\\"file');
    expect(result).toBe('"path\\\\to\\\\\\"file"');
  });
});

// ─── sanitizeForMarkdown ─────────────────────────────────────────────────────

describe('sanitizeForMarkdown', () => {
  it('escapes pipe characters', () => {
    expect(sanitizeForMarkdown('col1|col2')).toBe('col1\\|col2');
  });

  it('removes newlines', () => {
    expect(sanitizeForMarkdown('line1\nline2')).toBe('line1 line2');
  });

  it('handles combined pipes and newlines', () => {
    expect(sanitizeForMarkdown('a|b\nc|d')).toBe('a\\|b c\\|d');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeForMarkdown('')).toBe('');
  });

  it('passes through normal text unchanged', () => {
    expect(sanitizeForMarkdown('hello world')).toBe('hello world');
  });

  it('handles multiple consecutive pipes', () => {
    expect(sanitizeForMarkdown('||')).toBe('\\|\\|');
  });

  it('handles multiple consecutive newlines', () => {
    expect(sanitizeForMarkdown('a\n\nb')).toBe('a  b');
  });
});

describe('sanitizeForMarkdownInline', () => {
  it('escapes inline backticks', () => {
    expect(sanitizeForMarkdownInline('run `rm -rf` now')).toBe('run \\`rm -rf\\` now');
  });

  it('matches markdown sanitizer baseline behavior for pipes and newlines', () => {
    expect(sanitizeForMarkdownInline('a|b\nc')).toBe('a\\|b c');
  });
});

// ─── checkDeadButton ─────────────────────────────────────────────────────────

describe('checkDeadButton', () => {
  const baseBefore: ClickStateSnapshot = {
    url: 'https://example.com/page',
    domSize: 5000,
    hadNetworkActivity: false,
  };

  it('detects dead button when nothing changes', () => {
    const after: ClickStateSnapshot = {
      url: 'https://example.com/page',
      domSize: 5000,
      hadNetworkActivity: false,
    };
    const result = checkDeadButton('#btn', baseBefore, after);
    expect(result.isDead).toBe(true);
    expect(result.selector).toBe('#btn');
    expect(result.reason).toBeDefined();
  });

  it('detects alive button when URL changes', () => {
    const after: ClickStateSnapshot = {
      url: 'https://example.com/new-page',
      domSize: 5000,
      hadNetworkActivity: false,
    };
    const result = checkDeadButton('#btn', baseBefore, after);
    expect(result.isDead).toBe(false);
  });

  it('detects alive button when DOM changes significantly (>100 chars)', () => {
    const after: ClickStateSnapshot = {
      url: 'https://example.com/page',
      domSize: 5200, // +200, exceeds 100-char threshold
      hadNetworkActivity: false,
    };
    const result = checkDeadButton('#btn', baseBefore, after);
    expect(result.isDead).toBe(false);
  });

  it('detects alive button when network activity occurs', () => {
    const after: ClickStateSnapshot = {
      url: 'https://example.com/page',
      domSize: 5000,
      hadNetworkActivity: true,
    };
    const result = checkDeadButton('#btn', baseBefore, after);
    expect(result.isDead).toBe(false);
  });

  it('treats DOM change of exactly 100 as dead (threshold is >100)', () => {
    const after: ClickStateSnapshot = {
      url: 'https://example.com/page',
      domSize: 5100, // exactly +100
      hadNetworkActivity: false,
    };
    const result = checkDeadButton('#btn', baseBefore, after);
    // Math.abs(5100 - 5000) = 100, which is NOT > 100
    expect(result.isDead).toBe(true);
  });

  it('treats DOM change of 101 as alive', () => {
    const after: ClickStateSnapshot = {
      url: 'https://example.com/page',
      domSize: 5101, // +101, exceeds threshold
      hadNetworkActivity: false,
    };
    const result = checkDeadButton('#btn', baseBefore, after);
    expect(result.isDead).toBe(false);
  });

  it('detects DOM shrinkage as alive (negative change >100)', () => {
    const after: ClickStateSnapshot = {
      url: 'https://example.com/page',
      domSize: 4800, // -200, abs exceeds threshold
      hadNetworkActivity: false,
    };
    const result = checkDeadButton('#btn', baseBefore, after);
    expect(result.isDead).toBe(false);
  });

  it('preserves selector in result', () => {
    const result = checkDeadButton('.submit-btn', baseBefore, { ...baseBefore });
    expect(result.selector).toBe('.submit-btn');
  });
});

// ─── captureClickState ───────────────────────────────────────────────────────

describe('captureClickState', () => {
  it('returns correct ClickStateSnapshot shape', async () => {
    // Mock a minimal Playwright Page object
    const mockPage = {
      url: () => 'https://example.com/current',
      evaluate: vi.fn().mockResolvedValue(4200),
    } as any;

    const snapshot = await captureClickState(mockPage);
    expect(snapshot).toEqual({
      url: 'https://example.com/current',
      domSize: 4200,
      hadNetworkActivity: false,
    });
  });

  it('hadNetworkActivity defaults to false (caller sets it)', async () => {
    const mockPage = {
      url: () => 'https://test.com',
      evaluate: vi.fn().mockResolvedValue(100),
    } as any;

    const snapshot = await captureClickState(mockPage);
    expect(snapshot.hadNetworkActivity).toBe(false);
  });

  it('captures actual URL from page', async () => {
    const mockPage = {
      url: () => 'https://shop.example.com/cart?id=5',
      evaluate: vi.fn().mockResolvedValue(9999),
    } as any;

    const snapshot = await captureClickState(mockPage);
    expect(snapshot.url).toBe('https://shop.example.com/cart?id=5');
  });

  it('captures DOM size from page.evaluate', async () => {
    const mockPage = {
      url: () => 'https://example.com',
      evaluate: vi.fn().mockResolvedValue(0),
    } as any;

    const snapshot = await captureClickState(mockPage);
    expect(snapshot.domSize).toBe(0);
  });
});
