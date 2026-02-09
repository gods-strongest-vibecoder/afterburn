import type { HealthScore, PrioritizedIssue } from '../reports/index.js';
export interface AfterBurnOptions {
    targetUrl: string;
    sessionId?: string;
    sourcePath?: string;
    email?: string;
    password?: string;
    outputDir?: string;
    flowHints?: string[];
    maxPages?: number;
    headless?: boolean;
    onProgress?: (stage: string, message: string) => void;
}
export interface AfterBurnResult {
    healthScore: HealthScore;
    prioritizedIssues: PrioritizedIssue[];
    totalIssues: number;
    highPriorityCount: number;
    mediumPriorityCount: number;
    lowPriorityCount: number;
    workflowsPassed: number;
    workflowsTotal: number;
    htmlReportPath: string | null;
    markdownReportPath: string | null;
    exitCode: number;
    sessionId: string;
}
export declare function runAfterburn(options: AfterBurnOptions): Promise<AfterBurnResult>;
