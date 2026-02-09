import type { SitemapNode, WorkflowPlan } from '../types/discovery.js';
/**
 * Generates workflow plans from sitemap data using heuristics instead of AI.
 * Produces the same WorkflowPlan[] format that Gemini returns, so downstream
 * pipeline stages (executor, analyzer, reporter) work unchanged.
 */
export declare function generateHeuristicPlans(sitemap: SitemapNode): WorkflowPlan[];
