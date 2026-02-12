// Type definitions for Phase 2 discovery and planning modules

import type { ArtifactMetadata, ScreenshotRef } from './artifacts.js';

/**
 * Individual form input/textarea/select field
 */
export interface FormField {
  type: string;          // input type (text, email, password, etc.)
  name: string;          // field name attribute
  label: string;         // associated label text or aria-label
  required: boolean;
  placeholder: string;
  disabled?: boolean;    // true when field cannot be edited
  readOnly?: boolean;    // true when field is readonly
  hidden?: boolean;      // true for hidden/non-visible fields
}

/**
 * Complete form with all its fields
 */
export interface FormInfo {
  action: string;        // form action attribute
  method: string;        // GET or POST
  selector: string;      // Playwright selector for the form
  fields: FormField[];
}

/**
 * Any clickable/interactive element on a page
 */
export interface InteractiveElement {
  type: 'button' | 'link' | 'input' | 'select' | 'menu' | 'tab' | 'modal-trigger';
  selector: string;      // Playwright selector for this element
  text: string;          // visible text content
  visible: boolean;      // visible on initial load?
  attributes: Record<string, string>;  // relevant attributes (href, type, role, etc.)
}

/**
 * A link found on a page
 */
export interface LinkInfo {
  href: string;          // resolved absolute URL
  text: string;          // link text
  isInternal: boolean;   // same hostname?
  statusCode?: number;   // populated by link validator
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
  otherInteractive: InteractiveElement[];  // tabs, modals, dropdowns
  screenshotRef?: ScreenshotRef;           // from Phase 1 types
  spaFramework?: SPAFramework;
  crawledAt: string;     // ISO 8601
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
  path: string;          // URL path component (e.g. /dashboard/settings)
  children: SitemapNode[];
  pageData: PageData;
  depth: number;         // depth from root (0 = homepage)
}

/**
 * A link that returned non-2xx status
 */
export interface BrokenLink {
  url: string;
  sourceUrl: string;     // page where link was found
  statusCode: number;    // 0 = network error
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
  confidence: number;    // 0-1
}

/**
 * AI-generated test plan
 */
export interface WorkflowPlan {
  workflowName: string;
  description: string;
  steps: WorkflowStep[];
  priority: 'critical' | 'important' | 'nice-to-have';
  estimatedDuration: number;  // seconds
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
  crawlDuration: number;      // milliseconds
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
  userHints: string[];         // from --flows flag
}

