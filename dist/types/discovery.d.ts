import type { ArtifactMetadata, ScreenshotRef } from './artifacts.js';
/**
 * Individual form input/textarea/select field
 */
export interface FormField {
    type: string;
    name: string;
    label: string;
    required: boolean;
    placeholder: string;
}
/**
 * Complete form with all its fields
 */
export interface FormInfo {
    action: string;
    method: string;
    selector: string;
    fields: FormField[];
}
/**
 * Any clickable/interactive element on a page
 */
export interface InteractiveElement {
    type: 'button' | 'link' | 'input' | 'select' | 'menu' | 'tab' | 'modal-trigger';
    selector: string;
    text: string;
    visible: boolean;
    attributes: Record<string, string>;
}
/**
 * A link found on a page
 */
export interface LinkInfo {
    href: string;
    text: string;
    isInternal: boolean;
    statusCode?: number;
}
/**
 * Everything discovered about a single page
 */
export interface PageData {
    url: string;
    title: string;
    forms: FormInfo[];
    buttons: InteractiveElement[];
    links: LinkInfo[];
    menus: InteractiveElement[];
    otherInteractive: InteractiveElement[];
    screenshotRef?: ScreenshotRef;
    spaFramework?: SPAFramework;
    crawledAt: string;
}
/**
 * Detected SPA framework info
 */
export interface SPAFramework {
    framework: 'react' | 'vue' | 'angular' | 'next' | 'svelte' | 'nuxt' | 'none';
    version?: string;
    router?: string;
}
/**
 * Hierarchical tree node for sitemap
 */
export interface SitemapNode {
    url: string;
    title: string;
    path: string;
    children: SitemapNode[];
    pageData: PageData;
    depth: number;
}
/**
 * A link that returned non-2xx status
 */
export interface BrokenLink {
    url: string;
    sourceUrl: string;
    statusCode: number;
    statusText: string;
}
/**
 * Single step in a workflow plan
 */
export interface WorkflowStep {
    action: 'navigate' | 'click' | 'fill' | 'select' | 'wait' | 'expect';
    selector: string;
    value?: string;
    expectedResult: string;
    confidence: number;
}
/**
 * AI-generated test plan
 */
export interface WorkflowPlan {
    workflowName: string;
    description: string;
    steps: WorkflowStep[];
    priority: 'critical' | 'important' | 'nice-to-have';
    estimatedDuration: number;
    source: 'auto-discovered' | 'user-hint';
}
/**
 * Output of the crawler
 */
export interface CrawlResult {
    pages: PageData[];
    brokenLinks: BrokenLink[];
    totalPagesDiscovered: number;
    totalLinksChecked: number;
    crawlDuration: number;
    spaDetected: SPAFramework;
}
/**
 * Complete Phase 2 output artifact (extends ArtifactMetadata)
 */
export interface DiscoveryArtifact extends ArtifactMetadata {
    targetUrl: string;
    sitemap: SitemapNode;
    crawlResult: CrawlResult;
    workflowPlans: WorkflowPlan[];
    userHints: string[];
}
