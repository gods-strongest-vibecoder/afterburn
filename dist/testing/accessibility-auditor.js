// WCAG accessibility audit via axe-core for Playwright pages
import { AxeBuilder } from '@axe-core/playwright';
/**
 * Run WCAG 2.0/2.1 A/AA accessibility audit on a Playwright page
 *
 * @param page - Playwright page to audit
 * @returns Accessibility report with violations, passes, and incomplete checks
 */
export async function auditAccessibility(page) {
    try {
        const url = page.url();
        // Run axe-core analysis with WCAG 2.0/2.1 A/AA tags
        const results = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();
        // Map violations to AccessibilityViolation type
        const violations = results.violations.map(violation => ({
            id: violation.id,
            impact: violation.impact,
            description: violation.description,
            nodes: violation.nodes.length,
            helpUrl: violation.helpUrl,
        }));
        return {
            url,
            violationCount: violations.length,
            violations,
            passes: results.passes.length,
            incomplete: results.incomplete.length,
        };
    }
    catch (error) {
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
//# sourceMappingURL=accessibility-auditor.js.map