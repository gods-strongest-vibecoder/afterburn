// Zod schemas for Phase 4 error diagnosis, UI auditing, and analysis artifacts

import { z } from 'zod';
import { ArtifactMetadata } from '../types/artifacts.js';

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

export type ErrorDiagnosis = z.infer<typeof ErrorDiagnosisSchema>;

/**
 * UI audit findings from vision LLM analysis
 */
export const UIAuditSchema = z.object({
  layoutIssues: z.array(
    z.object({
      description: z.string(),
      severity: z.enum(['high', 'medium', 'low']),
      location: z.string(),
    })
  ),
  contrastIssues: z.array(
    z.object({
      element: z.string(),
      issue: z.string(),
      suggestion: z.string(),
    })
  ),
  formattingIssues: z.array(
    z.object({
      problem: z.string(),
      suggestion: z.string(),
    })
  ),
  improvements: z.array(z.string()).describe('Plain English improvement suggestions'),
  overallScore: z.enum(['good', 'needs-work', 'poor']),
});

export type UIAudit = z.infer<typeof UIAuditSchema>;

/**
 * Source code location for an error (populated by source mapper in Plan 04-03)
 */
export const SourceLocationSchema = z.object({
  file: z.string(),
  line: z.number(),
  context: z.string().describe('First ~200 chars of relevant code'),
});

export type SourceLocation = z.infer<typeof SourceLocationSchema>;

/**
 * Diagnosed error with original message for source mapping
 */
export interface DiagnosedError extends ErrorDiagnosis {
  originalError: string; // Raw error message from ExecutionArtifact (used for source mapping)
  sourceLocation?: SourceLocation;
  screenshotRef?: string; // Path to screenshot if available
  pageUrl?: string; // URL of the page where this error occurred
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
  aiPowered: boolean; // false when GEMINI_API_KEY not set
}
