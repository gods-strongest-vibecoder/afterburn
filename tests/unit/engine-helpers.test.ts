// Unit tests for engine helper functions: domainSlug and fileTimestamp
import { describe, it, expect } from 'vitest';
import { domainSlug, fileTimestamp } from '../../src/core/engine.js';

// --- domainSlug -----------------------------------------------------------------

describe('domainSlug', () => {
  it('strips www and converts dots to hyphens', () => {
    expect(domainSlug('https://www.example.com')).toBe('example-com');
  });

  it('strips the path and keeps only the hostname', () => {
    expect(domainSlug('https://getcredibly.org/pricing')).toBe('getcredibly-org');
  });

  it('handles multi-level subdomains', () => {
    expect(domainSlug('https://sub.example.co.uk')).toBe('sub-example-co-uk');
  });

  it('strips port numbers (hostname only)', () => {
    expect(domainSlug('http://localhost:3000')).toBe('localhost');
  });

  it('returns "unknown-site" for an empty string', () => {
    expect(domainSlug('')).toBe('unknown-site');
  });

  it('returns "unknown-site" for an invalid URL', () => {
    expect(domainSlug('not-a-url')).toBe('unknown-site');
  });

  it('handles https URL without www', () => {
    expect(domainSlug('https://example.com')).toBe('example-com');
  });

  it('handles URL with query string and fragment', () => {
    expect(domainSlug('https://example.com/page?q=1#section')).toBe('example-com');
  });
});

// --- fileTimestamp ---------------------------------------------------------------

describe('fileTimestamp', () => {
  it('matches the YYYY-MM-DD-HHmmss format', () => {
    const ts = fileTimestamp();
    expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}-\d{6}$/);
  });

  it('contains no special characters besides hyphens', () => {
    const ts = fileTimestamp();
    // Only digits and hyphens allowed
    expect(ts).toMatch(/^[0-9-]+$/);
  });

  it('has exactly 17 characters', () => {
    const ts = fileTimestamp();
    // YYYY-MM-DD-HHmmss = 4+1+2+1+2+1+6 = 17
    expect(ts.length).toBe(17);
  });

  it('starts with a plausible year', () => {
    const ts = fileTimestamp();
    const year = parseInt(ts.slice(0, 4), 10);
    expect(year).toBeGreaterThanOrEqual(2024);
    expect(year).toBeLessThanOrEqual(2030);
  });

  it('month is between 01 and 12', () => {
    const ts = fileTimestamp();
    const month = parseInt(ts.slice(5, 7), 10);
    expect(month).toBeGreaterThanOrEqual(1);
    expect(month).toBeLessThanOrEqual(12);
  });

  it('day is between 01 and 31', () => {
    const ts = fileTimestamp();
    const day = parseInt(ts.slice(8, 10), 10);
    expect(day).toBeGreaterThanOrEqual(1);
    expect(day).toBeLessThanOrEqual(31);
  });
});
