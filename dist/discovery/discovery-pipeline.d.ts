import type { DiscoveryArtifact, SitemapNode, WorkflowPlan } from '../types/discovery.js';
export interface DiscoveryOptions {
    targetUrl: string;
    sessionId: string;
    userHints?: string[];
    maxPages?: number;
    headless?: boolean;
    onProgress?: (message: string) => void;
}
export interface WorkflowPlanResolution {
    workflowPlans: WorkflowPlan[];
    usedHeuristicFallback: boolean;
}
export declare function resolveWorkflowPlans(planPromise: Promise<WorkflowPlan[]> | null, sitemap: SitemapNode): Promise<WorkflowPlanResolution>;
/**
 * Runs complete Phase 2 discovery pipeline: crawl, discover elements, detect SPA,
 * validate links, build sitemap, generate workflow plans.
 *
 * @param options Discovery configuration
 * @returns Complete discovery artifact with sitemap and workflow plans
 */
export declare function runDiscovery(options: DiscoveryOptions): Promise<DiscoveryArtifact>;
