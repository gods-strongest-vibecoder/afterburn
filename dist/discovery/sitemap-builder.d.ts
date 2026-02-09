import type { SitemapNode, PageData } from '../types/discovery.js';
/**
 * Builds a hierarchical sitemap tree from flat page data based on URL path structure.
 * Creates intermediate placeholder nodes for uncrawled parent paths.
 *
 * @param pages - Flat array of crawled pages
 * @param rootUrl - Root URL of the site (e.g., https://example.com)
 * @returns Root node of the sitemap tree
 */
export declare function buildSitemap(pages: PageData[], rootUrl: string): SitemapNode;
/**
 * Renders a sitemap tree as human-readable indented text.
 * Format: Title (path) with 2 spaces per depth level.
 *
 * @param node - Root or any node in the tree
 * @param indent - Current indentation level (internal use)
 * @returns Multi-line string representation of the tree
 */
export declare function printSitemapTree(node: SitemapNode, indent?: number): string;
