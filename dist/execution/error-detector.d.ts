import { Page } from 'playwright';
import { ErrorCollector } from '../types/execution.js';
/**
 * Set up page event listeners to capture errors passively
 * Returns collector and cleanup function
 */
export declare function setupErrorListeners(page: Page): {
    collector: ErrorCollector;
    cleanup: () => void;
};
