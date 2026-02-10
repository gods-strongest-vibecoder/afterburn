import type { Page } from 'playwright';
export interface MetaIssue {
    id: string;
    severity: 'high' | 'medium' | 'low';
    description: string;
    suggestion: string;
}
export interface MetaAuditResult {
    url: string;
    issues: MetaIssue[];
}
/**
 * Audit a page for common meta tag and structural SEO issues.
 * These are heuristic checks that don't require AI — just DOM inspection.
 */
export declare function auditMeta(page: Page): Promise<MetaAuditResult>;
