---
phase: 04-analysis-diagnosis
plan: 03
subsystem: analysis
tags: [gemini-vision, llm, ui-auditing, error-diagnosis, source-mapping, ast-analysis]

# Dependency graph
requires:
  - phase: 04-01
    provides: Diagnosis schemas (Zod), error analyzer with LLM diagnosis
  - phase: 04-02
    provides: Source code mapper with ts-morph AST analysis
  - phase: 03-04
    provides: Execution artifacts with workflow results and screenshots
provides:
  - Vision-powered UI auditor analyzing screenshots for layout/contrast/formatting issues
  - Complete analysis pipeline integration (discovery -> execution -> analysis)
  - CLI --source flag for source code pinpointing
  - Analysis artifacts with diagnosed errors and UI audits
affects: [05-reporting, phase-5]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Screenshot extraction from ExecutionArtifact.workflowResults
    - Multimodal vision LLM analysis with structured output
    - Phase 4 analysis as final pipeline stage before reporting

key-files:
  created:
    - src/analysis/ui-auditor.ts
  modified:
    - src/analysis/index.ts
    - src/index.ts

key-decisions:
  - "UI auditor extracts screenshots internally from ExecutionArtifact (no external parameters)"
  - "Vision LLM prompts target vibe coders with plain English, no CSS jargon"
  - "Analysis phase runs after execution, before exit - graceful degradation without GEMINI_API_KEY"
  - "Source mapper integration via --source flag enables AST-based error pinpointing"

patterns-established:
  - "Screenshot extraction: iterate workflowResults[].stepResults[].evidence?.screenshotRef"
  - "Vision prompts structured for WCAG AA contrast, mobile tap targets, layout issues"
  - "Analysis artifact combines diagnosedErrors + uiAudits + source mappings"
  - "Top 5 diagnosed errors printed to terminal for immediate user feedback"

# Metrics
duration: 6min
completed: 2026-02-07
---

# Phase 4 Plan 3: Vision UI Auditor & Pipeline Integration Summary

**Vision LLM audits screenshots for layout/contrast/formatting issues and full analysis pipeline wired: discovery -> execution -> analysis with --source flag for AST-based error pinpointing**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-07T20:36:43Z
- **Completed:** 2026-02-07T20:42:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Vision-powered UI auditor analyzes screenshots for layout issues, contrast problems, and formatting errors using Gemini Vision LLM
- Complete Phase 4 analysis integration into main pipeline after execution stage
- CLI --source flag enables ts-morph AST analysis for source code pinpointing
- Analysis artifacts saved with diagnosed errors, UI audits, and source locations
- Top diagnosed errors with plain English fix suggestions printed to terminal

## Task Commits

Each task was committed atomically:

1. **Task 1: Vision-powered UI auditor** - `ff9fc0c` (feat)
2. **Task 2: Wire analysis phase into main pipeline with --source flag** - `4c117c8` (feat)

## Files Created/Modified
- `src/analysis/ui-auditor.ts` - Vision LLM screenshot analysis for UI/UX issues (layout, contrast, formatting)
- `src/analysis/index.ts` - Updated barrel exports to include ui-auditor and source-mapper
- `src/index.ts` - Integrated Phase 4 analysis after execution, added --source flag parsing, saves analysis artifacts

## Decisions Made

**1. UI auditor screenshot extraction strategy**
- Extract screenshots internally from ExecutionArtifact.workflowResults[].stepResults[].evidence?.screenshotRef
- Deduplicate by pngPath, verify file existence before analysis
- No external parameters needed - auditor is self-contained

**2. Vision LLM prompt targeting**
- Structured prompts for WCAG AA contrast (4.5:1), mobile tap targets, layout issues
- Plain English output for vibe coders (no CSS jargon like "flexbox" or "z-index")
- Specific location references (top, bottom, left sidebar) for actionable feedback

**3. Analysis phase integration**
- Runs AFTER execution, BEFORE exit in main pipeline
- Graceful degradation: works without GEMINI_API_KEY (pattern-matching fallback)
- --source flag optional: enables ts-morph AST analysis when provided
- Analysis artifact combines diagnosedErrors + uiAudits + sourceLocation mappings

**4. Terminal output for user feedback**
- Print top 5 diagnosed errors with fix suggestions immediately
- Show AI-powered vs Basic mode based on GEMINI_API_KEY availability
- Display source pinpointing stats when --source provided

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. All tasks completed without issues. TypeScript compilation passed, full build succeeded.

## User Setup Required

None - no external service configuration required.

GEMINI_API_KEY environment variable is optional:
- If set: AI-powered error diagnosis and vision UI auditing
- If not set: Pattern-matching fallback for errors, no UI auditing

## Next Phase Readiness

**Phase 4 Complete - Ready for Phase 5 (Reporting)**

All Phase 4 success criteria met:
- Error analyzer with LLM diagnosis and pattern-matching fallback (04-01)
- Source code mapper with ts-morph AST analysis (04-02)
- Vision UI auditor for screenshot analysis (04-03)
- Full pipeline integration: discovery -> execution -> analysis (04-03)
- Analysis artifacts saved for Phase 5 reporting consumption

**Artifacts available for Phase 5:**
- `.afterburn/artifacts/analysis-{sessionId}.json` with:
  - diagnosedErrors[] with summary, rootCause, suggestedFix, sourceLocation
  - uiAudits[] with layoutIssues, contrastIssues, formattingIssues, improvements
  - sourceAnalysisAvailable flag (true when --source provided)
  - aiPowered flag (true when GEMINI_API_KEY set)

**No blockers.**

Phase 5 can consume analysis artifacts to generate:
- HTML report (human-readable with evidence screenshots)
- Markdown report (AI-tool-readable with structured findings)

---
*Phase: 04-analysis-diagnosis*
*Completed: 2026-02-07*
