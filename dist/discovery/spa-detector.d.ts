import type { Page } from 'playwright';
import type { SPAFramework } from '../types/discovery.js';
/**
 * Detect SPA framework from window properties and DOM attributes
 * Priority: Next.js before React, Nuxt before Vue (meta-frameworks use underlying frameworks)
 */
export declare function detectSPAFramework(page: Page): Promise<SPAFramework>;
/**
 * Intercept History API and discover client-side routes by clicking navigation elements
 * Returns array of unique discovered route URLs
 */
export declare function interceptRouteChanges(page: Page): Promise<string[]>;
