export { SiteCrawler } from './crawler.js';
export type { CrawlerOptions } from './crawler.js';
export { detectSPAFramework, interceptRouteChanges } from './spa-detector.js';
export { discoverElements, discoverHiddenElements } from './element-mapper.js';
export { validateLinks, createLinkValidationState } from './link-validator.js';
export { buildSitemap, printSitemapTree } from './sitemap-builder.js';
export { runDiscovery } from './discovery-pipeline.js';
export type { DiscoveryOptions } from './discovery-pipeline.js';
