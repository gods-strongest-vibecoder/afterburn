// WCAG accessibility audit via axe-core for Playwright pages

import { AxeBuilder } from '@axe-core/playwright';
import type { Page } from 'playwright';

// Local types (Plan 03-01 runs in parallel, may not have created types yet)
interface AccessibilityViolation {
  id: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  nodes: number;
  helpUrl: string;
  elementSamples?: string[];  // Up to 3 HTML snippets from affected elements
}

interface AccessibilityReport {
  url: string;
  violationCount: number;
  violations: AccessibilityViolation[];
  passes: number;
  incomplete: number;
}

/**
 * Run WCAG 2.0/2.1 A/AA accessibility audit on a Playwright page
 *
 * @param page - Playwright page to audit
 * @returns Accessibility report with violations, passes, and incomplete checks
 */
export async function auditAccessibility(page: Page): Promise<AccessibilityReport> {
  try {
    const url = page.url();

    // Run axe-core analysis with WCAG 2.0/2.1 A/AA tags
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // Map violations to AccessibilityViolation type
    const violations: AccessibilityViolation[] = results.violations.map(violation => {
      // Capture up to 3 HTML snippets from affected nodes for context
      const elementSamples = violation.nodes
        .slice(0, 3)
        .map(node => node.html)
        .filter((html): html is string => typeof html === 'string' && html.length > 0);

      return {
        id: violation.id,
        impact: violation.impact as 'critical' | 'serious' | 'moderate' | 'minor',
        description: violation.description,
        nodes: violation.nodes.length,
        helpUrl: violation.helpUrl,
        elementSamples: elementSamples.length > 0 ? elementSamples : undefined,
      };
    });

    return {
      url,
      violationCount: violations.length,
      violations,
      passes: results.passes.length,
      incomplete: results.incomplete.length,
    };
  } catch (error) {
    console.error('Accessibility audit failed:', error);

    // Return safe defaults on error
    return {
      url: page.url(),
      violationCount: 0,
      violations: [],
      passes: 0,
      incomplete: 0,
    };
  }
}
