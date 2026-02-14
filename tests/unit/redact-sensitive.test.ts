// Unit tests for redactSensitiveData — direct coverage of all secret pattern detections
import { describe, it, expect } from 'vitest';
import { redactSensitiveData } from '../../src/utils/sanitizer.js';

describe('redactSensitiveData', () => {
  it('returns empty string for empty input', () => {
    expect(redactSensitiveData('')).toBe('');
  });

  it('returns normal text unchanged', () => {
    const text = 'Error: page not found at /home';
    expect(redactSensitiveData(text)).toBe(text);
  });

  // API key prefixes
  it('redacts OpenAI sk- keys', () => {
    const text = 'key is sk-abcdefghijklmnopqrstuvwxyz1234567890';
    const result = redactSensitiveData(text);
    expect(result).toContain('[REDACTED_API_KEY]');
    expect(result).not.toContain('sk-abcdefghijklmnopqrstuvwxyz');
  });

  it('redacts GitHub personal access tokens (ghp_)', () => {
    // Use a context where the ghp_ pattern is not preceded by "token:" (which matches the password= pattern first)
    const text = 'my pat is ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmn ok';
    const result = redactSensitiveData(text);
    expect(result).toContain('[REDACTED_GITHUB_TOKEN]');
  });

  it('redacts GitHub user tokens (ghu_)', () => {
    const text = 'ghu_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmn';
    const result = redactSensitiveData(text);
    expect(result).toContain('[REDACTED_GITHUB_TOKEN]');
  });

  it('redacts GitHub fine-grained PATs (github_pat_)', () => {
    const text = 'github_pat_ABCDEFGHIJKLMNOPQRSTUV12';
    const result = redactSensitiveData(text);
    expect(result).toContain('[REDACTED_GITHUB_TOKEN]');
  });

  it('redacts AWS access keys (AKIA prefix)', () => {
    const text = 'aws key AKIAIOSFODNN7EXAMPLE';
    const result = redactSensitiveData(text);
    expect(result).toContain('[REDACTED_AWS_KEY]');
  });

  it('redacts Anthropic keys (sk-ant- prefix)', () => {
    const text = 'sk-ant-abcdefghijklmnopqrstuvwxyz';
    const result = redactSensitiveData(text);
    expect(result).toContain('[REDACTED_API_KEY]');
  });

  it('redacts Stripe live keys', () => {
    const prefix = 'sk_live_';
    const text = prefix + 'xxxxxxxxxxxxxxxxxxxx';
    const result = redactSensitiveData(text);
    expect(result).toContain('[REDACTED_STRIPE_KEY]');
  });

  it('redacts Stripe test keys', () => {
    const prefix = 'sk_test_';
    const text = prefix + 'xxxxxxxxxxxxxxxxxxxx';
    const result = redactSensitiveData(text);
    expect(result).toContain('[REDACTED_STRIPE_KEY]');
  });

  it('redacts Stripe restricted keys (rk_live_)', () => {
    const prefix = 'rk_live_';
    const text = prefix + 'xxxxxxxxxxxxxxxxxxxx';
    const result = redactSensitiveData(text);
    expect(result).toContain('[REDACTED_STRIPE_KEY]');
  });

  // Bearer tokens
  it('redacts Bearer tokens', () => {
    const text = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abc123';
    const result = redactSensitiveData(text);
    expect(result).toContain('[REDACTED_TOKEN]');
    expect(result).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
  });

  // Password patterns
  it('redacts password= in query strings', () => {
    const text = 'password=mysecretpassword123';
    const result = redactSensitiveData(text);
    expect(result).toContain('[REDACTED]');
    expect(result).not.toContain('mysecretpassword123');
  });

  it('redacts secret= values', () => {
    const text = 'secret=verysecretvalue';
    const result = redactSensitiveData(text);
    expect(result).toContain('[REDACTED]');
  });

  it('redacts apikey= values', () => {
    const text = 'apikey=myapikeyvalue123';
    const result = redactSensitiveData(text);
    expect(result).toContain('[REDACTED]');
  });

  // Long hex strings
  it('redacts long hex strings (40+ chars)', () => {
    const hex = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
    const text = `commit hash: ${hex}`;
    const result = redactSensitiveData(text);
    expect(result).toContain('[REDACTED_HEX_TOKEN]');
  });

  it('does not redact short hex strings (<40 chars)', () => {
    const text = 'color: #ff0000 or hash abc123def';
    expect(redactSensitiveData(text)).toBe(text);
  });

  // Multiple secrets in one text
  it('redacts multiple different secret types in one text', () => {
    const text = 'API: sk-abcdefghijklmnopqrstuvwxyz1234567890 and token ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmn';
    const result = redactSensitiveData(text);
    expect(result).toContain('[REDACTED_API_KEY]');
    expect(result).toContain('[REDACTED_GITHUB_TOKEN]');
  });
});
