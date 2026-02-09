import type { ExecutionArtifact } from '../types/execution.js';
import type { AnalysisArtifact } from '../analysis/diagnosis-schema.js';
/**
 * Generate complete Markdown report with YAML frontmatter
 */
export declare function generateMarkdownReport(executionArtifact: ExecutionArtifact, analysisArtifact: AnalysisArtifact): string;
/**
 * Write Markdown report to file
 */
export declare function writeMarkdownReport(markdown: string, outputPath: string): Promise<void>;
