import type { Page } from 'playwright';
interface AccessibilityViolation {
    id: string;
    impact: 'critical' | 'serious' | 'moderate' | 'minor';
    description: string;
    nodes: number;
    helpUrl: string;
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
export declare function auditAccessibility(page: Page): Promise<AccessibilityReport>;
export {};
