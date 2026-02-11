import { ExecutionArtifact } from '../types/execution.js';
import { UIAuditResult } from './diagnosis-schema.js';
/**
 * Main export: Audit UI/UX issues from screenshots in execution artifact
 */
export declare function auditUI(artifact: ExecutionArtifact, options?: {
    apiKey?: string;
    aiEnabled?: boolean;
}): Promise<UIAuditResult[]>;
