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

  it('does NOT deduplicate issues with different locations', () => {
    const issues: PrioritizedIssue[] = [
      makeIssue({ summary: 'Same error', location: 'https://example.com/page1' }),
      makeIssue({ summary: 'Same error', location: 'https://example.com/page2' }),
    ];

    const result = deduplicateIssues(issues);
    expect(result).toHaveLength(2);
    expect(result[0].occurrenceCount).toBeUndefined();
    expect(result[1].occurrenceCount).toBeUndefined();
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

  it('deduplicates Dead Button issues by selector', () => {
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

  it('deduplicates Accessibility issues by summary + location', () => {
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
    // Same summary + same location = deduped, different location = separate
    expect(result).toHaveLength(2);

    const aboutIssue = result.find(i => i.location === 'https://example.com/about');
    expect(aboutIssue?.occurrenceCount).toBe(2);

    const contactIssue = result.find(i => i.location === 'https://example.com/contact');
    expect(contactIssue?.occurrenceCount).toBeUndefined();
  });
});
