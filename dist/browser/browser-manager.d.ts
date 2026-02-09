import type { Page } from 'playwright';
import type { BrowserConfig } from '../types/artifacts.js';
import type { ChallengeDetectionResult } from './challenge-detector.js';
/**
 * Manages browser lifecycle: launch, navigation, and cleanup.
 * Automatically dismisses cookie banners after navigation.
 */
export declare class BrowserManager {
    private browser;
    private context;
    private config?;
    constructor(config?: Partial<BrowserConfig>);
    /**
     * Launches stealth-enabled browser and creates context
     */
    launch(): Promise<void>;
    private _lastChallengeResult;
    /**
     * Returns the challenge detection result from the most recent newPage() navigation.
     */
    get lastChallengeResult(): ChallengeDetectionResult;
    /**
     * Creates a new page and optionally navigates to a URL.
     * Automatically dismisses cookie banners and detects bot-challenge pages after navigation.
     *
     * @param url - Optional URL to navigate to
     * @returns Playwright page instance
     */
    newPage(url?: string): Promise<Page>;
    /**
     * Closes browser and cleans up resources.
     * Safe to call multiple times.
     */
    close(): Promise<void>;
    /**
     * Checks if browser is currently launched
     */
    get isLaunched(): boolean;
}
