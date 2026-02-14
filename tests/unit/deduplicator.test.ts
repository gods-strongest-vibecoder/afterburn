// Unit tests for issue deduplication logic
import { describe, it, expect } from 'vitest';
import { deduplicateIssues, type PrioritizedIssue } from '../../src/reports/priority-ranker.js';

/** Helper: build a minimal PrioritizedIssue */
function makeIssue(overrides: Partial<PrioritizedIssue> = {}): PrioritizedIssue {
  return {
    priority: 'medium',
    category: 'Console Error',
    summary: 'Something went wrong',
    impact: 'This causes errors or confuses users',
    fixSuggestion: 'Fix it',
    location: 'https://example.com',
    ...overrides,
  };
}

describe('deduplicateIssues', () => {
  it('returns empty array for empty input', () => {
    const result = deduplicateIssues([]);
    expect(result).toEqual([]);
  });

  it('passes through single issue unchanged (no occurrenceCount)', () => {
    const issue = makeIssue();
    const result = deduplicateIssues([issue]);
    expect(result).toHaveLength(1);
    expect(result[0].occurrenceCount).toBeUndefined();
    expect(result[0].summary).toBe(issue.summary);
  });

  it('deduplicates identical issues and keeps highest priority', () => {
    const issues: PrioritizedIssue[] = [
      makeIssue({ priority: 'low', summary: 'Duplicate error' }),
      makeIssue({ priority: 'high', summary: 'Duplicate error' }),
      makeIssue({ priority: 'medium', summary: 'Duplicate error' }),
    ];

    const result = deduplicateIssues(issues);
    expect(result).toHaveLength(1);
    expect(result[0].priority).toBe('high');
  });

  it('annotates deduplicated issues with correct occurrenceCount', () => {
    const issues: PrioritizedIssue[] = [
      makeIssue({ summary: 'Repeated error' }),
      makeIssue({ summary: 'Repeated error' }),
      makeIssue({ summary: 'Repeated error' }),
      makeIssue({ summary: 'Repeated error' }),
    ];

    const result = deduplicateIssues(issues);
    expect(result).toHaveLength(1);
    expect(result[0].occurrenceCount).toBe(4);
  });

  it('deduplicates Console Errors with same summary across different pages', () => {
    const issues: PrioritizedIssue[] = [
      makeIssue({ summary: 'Same error', location: 'https://example.com/page1' }),
      makeIssue({ summary: 'Same error', location: 'https://example.com/page2' }),
    ];

    const result = deduplicateIssues(issues);
    // Same console error on different pages = one issue
    expect(result).toHaveLength(1);
    expect(result[0].occurrenceCount).toBe(2);
    // Location should note multiple pages
    expect(result[0].location).toContain('and 1 other page');
  });

  it('does NOT deduplicate Workflow Errors with different locations', () => {
    const issues: PrioritizedIssue[] = [
      makeIssue({ category: 'Workflow Error', summary: 'Same error', location: 'https://example.com/page1' }),
      makeIssue({ category: 'Workflow Error', summary: 'Same error', location: 'https://example.com/page2' }),
    ];

    const result = deduplicateIssues(issues);
    // Workflow errors on different pages are separate issues
    expect(result).toHaveLength(2);
  });

  it('does NOT deduplicate issues with different categories', () => {
    const issues: PrioritizedIssue[] = [
      makeIssue({ category: 'Console Error', summary: 'Same text' }),
      makeIssue({ category: 'UI Issue', summary: 'Same text' }),
    ];

    const result = deduplicateIssues(issues);
    expect(result).toHaveLength(2);
  });

  it('maintains priority sort order after dedup', () => {
    const issues: PrioritizedIssue[] = [
      makeIssue({ priority: 'low', summary: 'Low issue', category: 'Console Error' }),
      makeIssue({ priority: 'high', summary: 'High issue', category: 'Workflow Error' }),
      makeIssue({ priority: 'medium', summary: 'Medium issue', category: 'Dead Button' }),
    ];

    const result = deduplicateIssues(issues);
    expect(result).toHaveLength(3);
    expect(result[0].priority).toBe('high');
    expect(result[1].priority).toBe('medium');
    expect(result[2].priority).toBe('low');
  });

  it('handles mixed: some duplicates, some unique', () => {
    const issues: PrioritizedIssue[] = [
      makeIssue({ summary: 'Unique issue A', category: 'Console Error' }),
      makeIssue({ summary: 'Duplicate issue', category: 'Console Error' }),
      makeIssue({ summary: 'Duplicate issue', category: 'Console Error' }),
      makeIssue({ summary: 'Duplicate issue', category: 'Console Error' }),
      makeIssue({ summary: 'Unique issue B', category: 'Dead Button' }),
    ];

    const result = deduplicateIssues(issues);
    expect(result).toHaveLength(3);

    const deduped = result.find(i => i.summary === 'Duplicate issue');
    expect(deduped?.occurrenceCount).toBe(3);

    const uniqueA = result.find(i => i.summary === 'Unique issue A');
    expect(uniqueA?.occurrenceCount).toBeUndefined();
  });

  it('normalizes summary for Console Error category (strips URLs)', () => {
    const issues: PrioritizedIssue[] = [
      makeIssue({
        category: 'Console Error',
        summary: 'Failed to load https://example.com/api/v1/data',
      }),
      makeIssue({
        category: 'Console Error',
        summary: 'Failed to load https://example.com/api/v2/other',
      }),
    ];

    const result = deduplicateIssues(issues);
    expect(result).toHaveLength(1);
    expect(result[0].occurrenceCount).toBe(2);
  });

  it('deduplicates Dead Button issues by selector regardless of page', () => {
    const issues: PrioritizedIssue[] = [
      makeIssue({
        category: 'Dead Button',
        summary: '#submit-btn doesn\'t do anything when clicked',
        location: 'https://example.com',
      }),
      makeIssue({
        category: 'Dead Button',
        summary: '#submit-btn doesn\'t do anything when clicked',
        location: 'https://example.com',
      }),
    ];

    const result = deduplicateIssues(issues);
    expect(result).toHaveLength(1);
    expect(result[0].occurrenceCount).toBe(2);
  });

  it('deduplicates Dead Button issues found on different pages', () => {
    const issues: PrioritizedIssue[] = [
      makeIssue({
        category: 'Dead Button',
        summary: '"Subscribe" button doesn\'t do anything when clicked',
        location: 'https://example.com/page1',
      }),
      makeIssue({
        category: 'Dead Button',
        summary: '"Subscribe" button doesn\'t do anything when clicked',
        location: 'https://example.com/page2',
      }),
    ];

    const result = deduplicateIssues(issues);
    // Same dead button on different pages = one issue
    expect(result).toHaveLength(1);
    expect(result[0].occurrenceCount).toBe(2);
    expect(result[0].location).toContain('and 1 other page');
  });

  it('deduplicates Accessibility issues across pages by summary', () => {
    const issues: PrioritizedIssue[] = [
      makeIssue({
        category: 'Accessibility',
        summary: 'Images must have alternate text',
        location: 'https://example.com/about',
      }),
      makeIssue({
        category: 'Accessibility',
        summary: 'Images must have alternate text',
        location: 'https://example.com/about',
      }),
      makeIssue({
        category: 'Accessibility',
        summary: 'Images must have alternate text',
        location: 'https://example.com/contact',
      }),
    ];

    const result = deduplicateIssues(issues);
    // Same accessibility violation across pages = one issue
    expect(result).toHaveLength(1);
    expect(result[0].occurrenceCount).toBe(3);
    expect(result[0].location).toContain('and 1 other page');
  });

  it('deduplicates Console Errors by resource URL from technicalDetails', () => {
    const issues: PrioritizedIssue[] = [
      makeIssue({
        category: 'Console Error',
        summary: 'Page or resource not found',
        location: 'https://example.com/images/icon.png',
        technicalDetails: 'HTTP 404: https://example.com/images/icon.png',
      }),
      makeIssue({
        category: 'Console Error',
        summary: 'Page or resource not found',
        location: 'https://example.com/images/icon.png',
        technicalDetails: 'HTTP 404: https://example.com/images/icon.png',
      }),
    ];

    const result = deduplicateIssues(issues);
    expect(result).toHaveLength(1);
    expect(result[0].occurrenceCount).toBe(2);
  });

  it('keeps different resource URLs as separate issues', () => {
    const issues: PrioritizedIssue[] = [
      makeIssue({
        category: 'Console Error',
        summary: 'Page or resource not found',
        technicalDetails: 'HTTP 404: https://example.com/images/icon-a.png',
      }),
      makeIssue({
        category: 'Console Error',
        summary: 'Page or resource not found',
        technicalDetails: 'HTTP 404: https://example.com/images/icon-b.png',
      }),
    ];

    const result = deduplicateIssues(issues);
    // Different resource URLs = different issues
    expect(result).toHaveLength(2);
  });

  // ─── New: Broken Link and SEO/Meta deduplication ──────────────────────

  it('deduplicates Broken Link issues with same URL from different pages', () => {
    const issues: PrioritizedIssue[] = [
      makeIssue({
        category: 'Broken Link',
        summary: 'Link to https://example.com/missing is broken (404)',
        location: 'https://example.com/page1',
      }),
      makeIssue({
        category: 'Broken Link',
        summary: 'Link to https://example.com/missing is broken (404)',
        location: 'https://example.com/page2',
      }),
    ];

    const result = deduplicateIssues(issues);
    expect(result).toHaveLength(1);
    expect(result[0].occurrenceCount).toBe(2);
  });

  it('keeps different broken link URLs as separate issues', () => {
    const issues: PrioritizedIssue[] = [
      makeIssue({
        category: 'Broken Link',
        summary: 'Link to https://example.com/a is broken (404)',
        location: 'https://example.com/page1',
      }),
      makeIssue({
        category: 'Broken Link',
        summary: 'Link to https://example.com/b is broken (404)',
        location: 'https://example.com/page1',
      }),
    ];

    const result = deduplicateIssues(issues);
    expect(result).toHaveLength(2);
  });

  it('deduplicates SEO/Meta issues across pages by summary', () => {
    const issues: PrioritizedIssue[] = [
      makeIssue({
        category: 'SEO / Meta',
        summary: 'Missing viewport meta tag — page won\'t display correctly on mobile devices',
        location: 'https://example.com/page1',
      }),
      makeIssue({
        category: 'SEO / Meta',
        summary: 'Missing viewport meta tag — page won\'t display correctly on mobile devices',
        location: 'https://example.com/page2',
      }),
    ];

    const result = deduplicateIssues(issues);
    expect(result).toHaveLength(1);
    expect(result[0].occurrenceCount).toBe(2);
  });

  it('keeps different SEO issues as separate', () => {
    const issues: PrioritizedIssue[] = [
      makeIssue({
        category: 'SEO / Meta',
        summary: 'Missing viewport meta tag',
        location: 'https://example.com',
      }),
      makeIssue({
        category: 'SEO / Meta',
        summary: 'Missing meta description',
        location: 'https://example.com',
      }),
    ];

    const result = deduplicateIssues(issues);
    expect(result).toHaveLength(2);
  });
});
