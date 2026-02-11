import { z } from 'zod';
import { ArtifactMetadata } from '../types/artifacts.js';
/**
 * Individual error diagnosis from LLM or fallback pattern matching
 */
export declare const ErrorDiagnosisSchema: z.ZodObject<{
    summary: z.ZodString;
    rootCause: z.ZodString;
    errorType: z.ZodEnum<{
        unknown: "unknown";
        network: "network";
        form: "form";
        javascript: "javascript";
        navigation: "navigation";
        authentication: "authentication";
        dom: "dom";
    }>;
    confidence: z.ZodEnum<{
        high: "high";
        low: "low";
        medium: "medium";
    }>;
    suggestedFix: z.ZodString;
    technicalDetails: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ErrorDiagnosis = z.infer<typeof ErrorDiagnosisSchema>;
/**
 * Batch response schema for diagnosing multiple errors in a single LLM call
 */
export declare const ErrorDiagnosisBatchSchema: z.ZodObject<{
    diagnoses: z.ZodArray<z.ZodObject<{
        rootCause: z.ZodString;
        plainEnglish: z.ZodString;
        suggestedFix: z.ZodString;
        severity: z.ZodEnum<{
            high: "high";
            low: "low";
            medium: "medium";
        }>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type ErrorDiagnosisBatch = z.infer<typeof ErrorDiagnosisBatchSchema>;
/**
 * UI audit findings from vision LLM analysis
 */
export declare const UIAuditSchema: z.ZodObject<{
    layoutIssues: z.ZodArray<z.ZodObject<{
        description: z.ZodString;
        severity: z.ZodEnum<{
            high: "high";
            low: "low";
            medium: "medium";
        }>;
        location: z.ZodString;
    }, z.core.$strip>>;
    contrastIssues: z.ZodArray<z.ZodObject<{
        element: z.ZodString;
        issue: z.ZodString;
        suggestion: z.ZodString;
    }, z.core.$strip>>;
    formattingIssues: z.ZodArray<z.ZodObject<{
        problem: z.ZodString;
        suggestion: z.ZodString;
    }, z.core.$strip>>;
    improvements: z.ZodArray<z.ZodString>;
    overallScore: z.ZodEnum<{
        good: "good";
        "needs-work": "needs-work";
        poor: "poor";
    }>;
}, z.core.$strip>;
export type UIAudit = z.infer<typeof UIAuditSchema>;
/**
 * Source code location for an error (populated by source mapper in Plan 04-03)
 */
export declare const SourceLocationSchema: z.ZodObject<{
    file: z.ZodString;
    line: z.ZodNumber;
    context: z.ZodString;
}, z.core.$strip>;
export type SourceLocation = z.infer<typeof SourceLocationSchema>;
/**
 * Diagnosed error with original message for source mapping
 */
export interface DiagnosedError extends ErrorDiagnosis {
    originalError: string;
    sourceLocation?: SourceLocation;
    screenshotRef?: string;
    pageUrl?: string;
}
/**
 * UI audit result for a specific page
 */
export interface UIAuditResult extends UIAudit {
    pageUrl: string;
    screenshotRef?: string;
}
/**
 * Complete analysis artifact (output of Phase 4)
 */
export interface AnalysisArtifact extends ArtifactMetadata {
    diagnosedErrors: DiagnosedError[];
    uiAudits: UIAuditResult[];
    sourceAnalysisAvailable: boolean;
    aiPowered: boolean;
}
