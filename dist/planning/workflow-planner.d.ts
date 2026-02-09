import { GeminiClient } from '../ai/index.js';
import type { SitemapNode, WorkflowPlan } from '../types/discovery.js';
/**
 * Generates realistic user workflow test plans from sitemap using Gemini AI.
 * Plans include step-by-step actions with Playwright selectors and confidence scores.
 */
export declare class WorkflowPlanner {
    private gemini;
    constructor(geminiClient: GeminiClient);
    /**
     * Generate workflow test plans from sitemap structure
     * @param sitemap Hierarchical sitemap tree from Phase 2 discovery
     * @param userHints Optional user-specified workflows to prioritize (from --flows flag)
     * @returns Array of workflow plans sorted by priority
     */
    generatePlans(sitemap: SitemapNode, userHints?: string[]): Promise<WorkflowPlan[]>;
    /**
     * Create condensed text summary of sitemap for LLM prompt
     * Truncates at maxChars to stay within token limits
     */
    private summarizeSitemap;
    /**
     * Recursively collect all pages from sitemap tree
     */
    private collectPages;
    /**
     * Score page importance for prioritization
     * Higher score = more likely to contain important workflows
     */
    private getPageImportance;
    /**
     * Format a single page as text summary
     */
    private formatPageSummary;
    /**
     * Format form as concise description
     */
    private formatForm;
}
