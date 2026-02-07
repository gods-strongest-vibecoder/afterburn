---
phase: 04-analysis-diagnosis
plan: 01
subsystem: analysis
tags: [zod, gemini, llm, error-diagnosis, multimodal]

# Dependency graph
requires:
  - phase: 03-execution-testing
    provides: ExecutionArtifact with error evidence, StepResult with ErrorEvidence
  - phase: 02-discovery-planning
    provides: GeminiClient for structured LLM output
provides:
  - ErrorDiagnosisSchema and UIAuditSchema for structured analysis output
  - DiagnosedError type with originalError field for source mapping
  - analyzeErrors function transforming ExecutionArtifact into plain English diagnoses
  - GeminiClient.generateStructuredWithImage for multimodal (text+image) analysis
  - Pattern-matching fallback diagnosis working without GEMINI_API_KEY
affects: [04-02-ui-auditor, 04-03-source-mapper, 05-reporting]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zod schemas for AI structured output validation"
    - "LLM error diagnosis with fallback pattern matching"
    - "Multimodal Gemini client for vision + text analysis"

key-files:
  created:
    - src/analysis/diagnosis-schema.ts
    - src/analysis/error-analyzer.ts
    - src/analysis/index.ts
  modified:
    - src/ai/gemini-client.ts

key-decisions:
  - "DiagnosedError includes originalError field for downstream source code mapping (Plan 04-03)"
  - "Fallback diagnosis via pattern matching ensures tool works without AI API key"
  - "Plain English diagnoses target non-technical vibe coders (no jargon)"
  - "GeminiClient extended with multimodal support for UI auditing (Plan 04-02)"

patterns-established:
  - "ErrorDiagnosis schema: summary, rootCause, errorType, confidence, suggestedFix for vibe coder audience"
  - "Preserve originalError in DiagnosedError for source mapping pipeline"
  - "Fallback pattern matching for common errors (TypeError, ReferenceError, network failures)"

# Metrics
duration: 5min
completed: 2026-02-07
---

# Phase 4 Plan 1: Diagnosis Schemas & Error Analyzer Summary

**LLM-powered error diagnosis with Zod schemas, multimodal Gemini client, and pattern-matching fallback for AI-optional operation**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-07T20:22:41Z
- **Completed:** 2026-02-07T20:27:41Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created complete Zod schema suite for Phase 4 structured output (ErrorDiagnosis, UIAudit, SourceLocation, AnalysisArtifact)
- Implemented analyzeErrors function that transforms Phase 3 ExecutionArtifact errors into plain English diagnoses
- Extended GeminiClient with generateStructuredWithImage for multimodal vision analysis
- Built pattern-matching fallback that produces basic diagnoses without GEMINI_API_KEY (graceful degradation)

## Task Commits

Each task was committed atomically:

1. **Task 1: Diagnosis schemas and GeminiClient multimodal extension** - `2d09b90` (feat)
   - Created diagnosis-schema.ts with ErrorDiagnosisSchema, UIAuditSchema, SourceLocationSchema
   - Extended GeminiClient with generateStructuredWithImage method

2. **Task 2: Error analyzer with LLM diagnosis and fallback** - `164ba36` (feat)
   - Implemented analyzeErrors with LLM-powered diagnosis
   - Built fallback pattern matching for common error types
   - Created barrel export from src/analysis/index.ts

## Files Created/Modified
- `src/analysis/diagnosis-schema.ts` - Zod schemas for all Phase 4 structured output (ErrorDiagnosis, UIAudit, SourceLocation, DiagnosedError, AnalysisArtifact)
- `src/analysis/error-analyzer.ts` - LLM error diagnosis with pattern-matching fallback, processes ExecutionArtifact into DiagnosedError array
- `src/analysis/index.ts` - Barrel export for Phase 4 analysis APIs
- `src/ai/gemini-client.ts` - Extended with generateStructuredWithImage for multimodal (text + image) structured generation

## Decisions Made

**DiagnosedError.originalError field:** Critical for Plan 04-03 source mapping. Preserves raw error message from ExecutionArtifact so source mapper can match against source code AST.

**Pattern-matching fallback:** Ensures Afterburn works for users without GEMINI_API_KEY. Pattern matches common errors (TypeError, ReferenceError, network 404/403/500) to produce basic diagnoses with medium confidence.

**Plain English for vibe coders:** All diagnosis fields (summary, rootCause, suggestedFix) target non-technical audience building with AI tools. No jargon like "null pointer exception" - instead "Tried to access something that doesn't exist in the code".

**Multimodal client extension:** GeminiClient.generateStructuredWithImage reads PNG files and sends to Gemini with text prompt, enabling Plan 04-02 UI auditing via vision LLM.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Plan 04-02 (UI Auditor):**
- UIAuditSchema defined and ready for vision LLM integration
- GeminiClient.generateStructuredWithImage method available for screenshot analysis
- AnalysisArtifact interface includes uiAudits array

**Ready for Plan 04-03 (Source Mapper):**
- DiagnosedError.originalError field populated for AST matching
- SourceLocation schema defined for source mapping results

**Ready for Phase 5 (Reporting):**
- AnalysisArtifact interface complete with diagnosedErrors, uiAudits, sourceAnalysisAvailable, aiPowered
- All diagnosis data structured for report generation

---
*Phase: 04-analysis-diagnosis*
*Completed: 2026-02-07*
