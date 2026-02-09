import { DiagnosedError, UIAuditResult } from '../analysis/diagnosis-schema.js';
import { ExecutionArtifact } from '../types/execution.js';
export type IssuePriority = 'high' | 'medium' | 'low';
export interface PrioritizedIssue {
    priority: IssuePriority;
    category: string;
    summary: string;
    impact: string;
    fixSuggestion: string;
    location: string;
    screenshotRef?: string;
    technicalDetails?: string;
    occurrenceCount?: number;
}
export declare function prioritizeIssues(diagnosedErrors: DiagnosedError[], uiAudits: UIAuditResult[], executionArtifact: ExecutionArtifact): PrioritizedIssue[];
/**
 * Deduplicate prioritized issues by grouping identical findings.
 * Within each group, keeps the highest-priority instance and annotates with occurrence count.
 * When issues from different pages are merged, aggregates unique page locations.
 * Returns a new array sorted by priority (high > medium > low).
 */
export declare function deduplicateIssues(issues: PrioritizedIssue[]): PrioritizedIssue[];
