import { ExecutionArtifact } from '../types/execution.js';
import { DiagnosedError } from './diagnosis-schema.js';
/**
 * Main export: Analyze all errors from ExecutionArtifact and produce plain English diagnoses
 */
export declare function analyzeErrors(artifact: ExecutionArtifact, options?: {
    apiKey?: string;
    aiEnabled?: boolean;
}): Promise<DiagnosedError[]>;
