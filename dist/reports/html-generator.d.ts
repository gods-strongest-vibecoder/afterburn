import type { ExecutionArtifact } from '../types/execution.js';
import type { AnalysisArtifact } from '../analysis/diagnosis-schema.js';
/**
 * Generate self-contained HTML report with inline CSS and base64 screenshots
 */
export declare function generateHtmlReport(executionArtifact: ExecutionArtifact, analysisArtifact: AnalysisArtifact): Promise<string>;
/**
 * Write HTML report to file
 */
export declare function writeHtmlReport(html: string, outputPath: string): Promise<void>;
