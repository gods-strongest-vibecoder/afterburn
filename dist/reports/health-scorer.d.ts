import { ExecutionArtifact } from '../types/execution.js';
export interface HealthScore {
    overall: number;
    label: 'good' | 'needs-work' | 'poor';
    breakdown: {
        workflows: number;
        errors: number;
        accessibility: number;
        performance: number;
    };
    checksPassed: number;
    checksTotal: number;
}
export declare function calculateHealthScore(executionArtifact: ExecutionArtifact): HealthScore;
