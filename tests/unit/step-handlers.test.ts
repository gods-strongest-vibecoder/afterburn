import { describe, it, expect } from 'vitest';
import { isDisabledButtonError } from '../../src/execution/step-handlers.js';

describe('isDisabledButtonError', () => {
  it('returns true for "element is not enabled"', () => {
    expect(isDisabledButtonError('element is not enabled')).toBe(true);
  });

  it('returns true for "element is disabled"', () => {
    expect(isDisabledButtonError('element is disabled')).toBe(true);
  });

  it('returns true for "disabled:pointer-events-none"', () => {
    expect(isDisabledButtonError('disabled:pointer-events-none')).toBe(true);
  });

  it('is case insensitive: "ELEMENT IS NOT ENABLED"', () => {
    expect(isDisabledButtonError('ELEMENT IS NOT ENABLED')).toBe(true);
  });

  it('matches when embedded in a longer message', () => {
    expect(
      isDisabledButtonError('Timeout 10000ms exceeded... element is not enabled')
    ).toBe(true);
  });

  it('returns false for unrelated error "Element not found"', () => {
    expect(isDisabledButtonError('Element not found')).toBe(false);
  });

  it('returns false for unrelated error "Timeout exceeded"', () => {
    expect(isDisabledButtonError('Timeout exceeded')).toBe(false);
  });
});
