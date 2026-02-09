import type { Page } from 'playwright';
import type { FormInfo, InteractiveElement, LinkInfo } from '../types/discovery.js';
/**
 * Container for all discovered interactive elements on a page
 */
export interface DiscoveredElements {
    forms: FormInfo[];
    buttons: InteractiveElement[];
    links: LinkInfo[];
    menus: InteractiveElement[];
    otherInteractive: InteractiveElement[];
}
/**
 * Discover all visible interactive elements on a page
 */
export declare function discoverElements(page: Page, pageUrl: string): Promise<DiscoveredElements>;
/**
 * Discover hidden elements by triggering interactions (buttons, menus, modals)
 * Returns only NEWLY discovered elements (not present in initial page load)
 */
export declare function discoverHiddenElements(page: Page, pageUrl: string): Promise<DiscoveredElements>;
