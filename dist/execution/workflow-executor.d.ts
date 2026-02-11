import type { WorkflowPlan } from '../types/discovery.js';
import type { ExecutionArtifact } from '../types/execution.js';
export interface ExecutionOptions {
    targetUrl: string;
    sessionId: string;
    workflowPlans: WorkflowPlan[];
    email?: string;
    password?: string;
    headless?: boolean;
    onProgress?: (message: string) => void;
}
/**
 * Executes all workflow plans with comprehensive error detection and auditing
 */
export declare class WorkflowExecutor {
    private browserManager;
    private screenshotManager;
    private options;
    constructor(options: ExecutionOptions);
    /**
     * Main execution flow: runs all workflows and produces execution artifact
     */
    execute(): Promise<ExecutionArtifact>;
    /**
     * Execute a single workflow plan
     */
    private executeWorkflow;
    /**
     * Audit a page with accessibility and performance checks
     */
    private auditPage;
    /**
     * Find the parent form selector for a field
     */
    private findFormSelector;
    /**
     * Inject --email and --password into login form fields
     */
    private injectCredentialsIfNeeded;
    /**
     * Check if selector looks like an email field
     */
    private isEmailField;
    /**
     * Check if selector looks like a password field
     */
    private isPasswordField;
    /**
     * Calculate total issues across all results
     */
    private calculateTotalIssues;
    /**
     * Log message with optional progress callback
     */
    private log;
}
