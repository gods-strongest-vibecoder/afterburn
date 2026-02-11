// Zod schemas for Phase 4 error diagnosis, UI auditing, and analysis artifacts
import { z } from 'zod';
/**
 * Individual error diagnosis from LLM or fallback pattern matching
 */
export const ErrorDiagnosisSchema = z.object({
    summary: z.string().describe('One-sentence plain English summary of what went wrong'),
    rootCause: z.string().describe('Plain English explanation of the root cause'),
    errorType: z.enum(['network', 'javascript', 'dom', 'form', 'navigation', 'authentication', 'unknown']),
    confidence: z.enum(['high', 'medium', 'low']),
    suggestedFix: z.string().describe('Actionable next step in plain English'),
    technicalDetails: z.string().optional().describe('Technical details for developers'),
});
/**
 * Batch response schema for diagnosing multiple errors in a single LLM call
 */
export const ErrorDiagnosisBatchSchema = z.object({
    diagnoses: z.array(z.object({
        rootCause: z.string().describe('Plain English explanation of the root cause'),
        plainEnglish: z.string().describe('One-sentence plain English summary of what went wrong'),
        suggestedFix: z.string().describe('Actionable next step in plain English'),
        severity: z.enum(['high', 'medium', 'low']).describe('Severity of the error'),
    })).describe('One diagnosis per error, in the same order as the input errors'),
});
/**
 * UI audit findings from vision LLM analysis
 */
export const UIAuditSchema = z.object({
    layoutIssues: z.array(z.object({
        description: z.string(),
        severity: z.enum(['high', 'medium', 'low']),
        location: z.string(),
    })),
    contrastIssues: z.array(z.object({
        element: z.string(),
        issue: z.string(),
        suggestion: z.string(),
    })),
    formattingIssues: z.array(z.object({
        problem: z.string(),
        suggestion: z.string(),
    })),
    improvements: z.array(z.string()).describe('Plain English improvement suggestions'),
    overallScore: z.enum(['good', 'needs-work', 'poor']),
});
/**
 * Source code location for an error (populated by source mapper in Plan 04-03)
 */
export const SourceLocationSchema = z.object({
    file: z.string(),
    line: z.number(),
    context: z.string().describe('First ~200 chars of relevant code'),
});
//# sourceMappingURL=diagnosis-schema.js.map