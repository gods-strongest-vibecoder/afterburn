// Unit tests for core input validation functions (URL, path, maxPages, selector, sanitizeValue)
import { describe, it, expect } from 'vitest';
import {
  validateUrl,
  validatePublicUrl,
  ensurePublicHostname,
  validatePath,
  validateMaxPages,
  validateSelector,
  sanitizeValue,
} from '../../src/core/validation.js';

// ─── validateUrl ────────────────────────────────────────────────────────────

describe('validateUrl', () => {
  it('accepts valid https URL', () => {
    expect(validateUrl('https://example.com')).toBe('https://example.com');
  });

  it('accepts valid http URL', () => {
    expect(validateUrl('http://example.com/page')).toBe('http://example.com/page');
  });

  it('trims whitespace', () => {
    expect(validateUrl('  https://example.com  ')).toBe('https://example.com');
  });

  it('rejects javascript: scheme', () => {
    expect(() => validateUrl('javascript:alert(1)')).toThrow('Unsafe URL scheme');
  });

  it('rejects data: scheme', () => {
    expect(() => validateUrl('data:text/html,<h1>hi</h1>')).toThrow('Unsafe URL scheme');
  });

  it('rejects file: scheme', () => {
    expect(() => validateUrl('file:///etc/passwd')).toThrow('Unsafe URL scheme');
  });

  it('rejects ftp: scheme', () => {
    expect(() => validateUrl('ftp://files.example.com')).toThrow('Unsafe URL scheme');
  });

  it('rejects totally invalid input', () => {
    expect(() => validateUrl('not-a-url')).toThrow('Invalid URL');
  });

  it('rejects empty string', () => {
    expect(() => validateUrl('')).toThrow('Invalid URL');
  });

  it('accepts URL with port', () => {
    expect(validateUrl('https://localhost:3000')).toBe('https://localhost:3000');
  });

  it('accepts URL with path and query', () => {
    const url = 'https://example.com/path?q=search&page=1';
    expect(validateUrl(url)).toBe(url);
  });
});

describe('validatePublicUrl / ensurePublicHostname', () => {
  it('rejects localhost hostnames', async () => {
    await expect(validatePublicUrl('http://localhost:3000')).rejects.toThrow('localhost');
  });

  it('rejects hostnames that resolve to private IPs', async () => {
    await expect(
      validatePublicUrl('https://example.com', async () => ['10.0.0.1'])
    ).rejects.toThrow('private IP');
  });

  it('accepts hostnames that resolve to public IPs', async () => {
    await expect(
      validatePublicUrl('https://example.com', async () => ['93.184.216.34'])
    ).resolves.toBe('https://example.com');
  });

  it('ensurePublicHostname rejects IPv6 loopback and link-local addresses', async () => {
    await expect(ensurePublicHostname('::1')).rejects.toThrow('private/loopback');
    await expect(ensurePublicHostname('fe80::1')).rejects.toThrow('private/loopback');
  });
});

// ─── validatePath ───────────────────────────────────────────────────────────

describe('validatePath', () => {
  it('resolves a simple relative path to absolute', () => {
    const result = validatePath('output', 'output-dir');
    expect(result).toBeTruthy();
    // Result should be an absolute path
    expect(result).toMatch(/^[A-Z]:|^\//);
  });

  it('rejects path traversal with ..', () => {
    expect(() => validatePath('../../../etc/passwd', 'source')).toThrow('Path traversal');
  });

  it('rejects embedded .. in path', () => {
    expect(() => validatePath('a/../../b', 'source')).toThrow('Path traversal');
  });

  it('trims whitespace', () => {
    const result = validatePath('  output  ', 'output-dir');
    expect(result).toBeTruthy();
  });

  it('enforces workspace root containment when provided', () => {
    // A path outside the workspace root should throw
    expect(() =>
      validatePath('C:/other/place', 'source', 'C:/afterburn')
    ).toThrow('escapes workspace root');
  });

  it('allows path within workspace root', () => {
    const result = validatePath('C:/afterburn/src', 'source', 'C:/afterburn');
    expect(result).toContain('afterburn');
  });
});

// ─── validateMaxPages ───────────────────────────────────────────────────────

describe('validateMaxPages', () => {
  it('returns default 50 for undefined', () => {
    expect(validateMaxPages(undefined)).toBe(50);
  });

  it('returns default 50 for NaN', () => {
    expect(validateMaxPages(NaN)).toBe(50);
  });

  it('returns 500 (unlimited) for zero', () => {
    expect(validateMaxPages(0)).toBe(500);
  });

  it('returns default 50 for negative', () => {
    expect(validateMaxPages(-10)).toBe(50);
  });

  it('clamps to 500 for very large values', () => {
    expect(validateMaxPages(9999)).toBe(500);
  });

  it('passes through valid value', () => {
    expect(validateMaxPages(25)).toBe(25);
  });

  it('floors decimal values', () => {
    expect(validateMaxPages(10.7)).toBe(10);
  });

  it('returns 1 for value of 1', () => {
    expect(validateMaxPages(1)).toBe(1);
  });

  it('returns 500 for value of 500', () => {
    expect(validateMaxPages(500)).toBe(500);
  });
});

// ─── validateSelector ───────────────────────────────────────────────────────

describe('validateSelector', () => {
  it('accepts normal CSS selector', () => {
    expect(validateSelector('#submit-btn')).toBe('#submit-btn');
  });

  it('accepts complex but reasonable selector', () => {
    const sel = 'form.login input[type="email"]';
    expect(validateSelector(sel)).toBe(sel);
  });

  it('rejects selector exceeding 500 characters', () => {
    const longSelector = 'a'.repeat(501);
    expect(() => validateSelector(longSelector)).toThrow('Selector too long');
  });

  it('accepts selector at exactly 500 characters', () => {
    const sel = 'a'.repeat(500);
    expect(validateSelector(sel)).toBe(sel);
  });

  it('accepts empty selector', () => {
    expect(validateSelector('')).toBe('');
  });
});

// ─── sanitizeValue ──────────────────────────────────────────────────────────

describe('sanitizeValue', () => {
  it('strips <script> tags', () => {
    const result = sanitizeValue('hello<script>alert(1)</script>world');
    expect(result).toBe('helloworld');
  });

  it('strips <script> tags with attributes', () => {
    const result = sanitizeValue('<script type="text/javascript">evil()</script>');
    expect(result).toBe('');
  });

  it('strips case-insensitive <SCRIPT> tags', () => {
    const result = sanitizeValue('<SCRIPT>alert(1)</SCRIPT>');
    expect(result).toBe('');
  });

  it('strips javascript: URIs', () => {
    const result = sanitizeValue('javascript:alert(1)');
    expect(result).toBe('alert(1)');
  });

  it('strips javascript: with spaces', () => {
    const result = sanitizeValue('javascript :alert(1)');
    expect(result).toBe('alert(1)');
  });

  it('strips event handler attributes', () => {
    const result = sanitizeValue('onclick=evil()');
    expect(result).toBe('evil()');
  });

  it('strips onerror handler', () => {
    const result = sanitizeValue('onerror=hack()');
    expect(result).toBe('hack()');
  });

  it('strips onload handler', () => {
    const result = sanitizeValue('onload=init()');
    expect(result).toBe('init()');
  });

  it('preserves normal form values', () => {
    const value = 'John Doe';
    expect(sanitizeValue(value)).toBe('John Doe');
  });

  it('preserves email addresses', () => {
    const value = 'user@example.com';
    expect(sanitizeValue(value)).toBe('user@example.com');
  });

  it('handles multiple injection attempts', () => {
    const result = sanitizeValue('<script>a</script> javascript:void(0) onclick=evil()');
    expect(result).not.toContain('<script');
    expect(result).not.toContain('javascript:');
    expect(result).not.toContain('onclick=');
  });
});
