import type { Page } from 'playwright-core';
import type { StepResult, DeadButtonResult, BrokenFormResult } from '../types/execution.js';
import type { WorkflowStep, FormInfo } from '../types/discovery.js';
export declare const DEAD_BUTTON_WAIT = 500;
/**
 * Convert legacy LLM selector strings into Playwright selector engines.
 * Supports getByRole/getByLabel/getByText compatibility for older plans.
 */
export declare function normalizeStepSelector(selector: string): string;
/**
 * Main dispatcher - executes a workflow step and returns structured result
 */
export declare function executeStep(page: Page, step: WorkflowStep, stepIndex: number, baseUrl?: string): Promise<StepResult>;
/**
 * Fill all fields in a form with test data
 */
export declare function fillFormFields(page: Page, form: FormInfo): Promise<{
    filled: number;
    skipped: Array<{
        selector: string;
        reason: string;
    }>;
}>;
/**
 * Snapshot of page state used for dead-button comparison (no re-click needed)
 */
export interface ClickStateSnapshot {
    url: string;
    domSize: number;
    hadNetworkActivity: boolean;
}
/**
 * Capture current page state for dead-button comparison
 */
export declare function captureClickState(page: Page): Promise<ClickStateSnapshot>;
/**
 * Compare pre/post click state to detect dead buttons (no re-click)
 */
export declare function checkDeadButton(selector: string, before: ClickStateSnapshot, after: ClickStateSnapshot): DeadButtonResult;
/**
 * Detect broken forms by checking if submit has any effect
 */
export declare function detectBrokenForm(page: Page, formSelector: string): Promise<BrokenFormResult>;
/**
 * Dismiss modals/popups that might block interaction
 * Tries multiple strategies: close button, Escape key, native dialog dismissal
 */
export declare function dismissModalIfPresent(page: Page): Promise<void>;
