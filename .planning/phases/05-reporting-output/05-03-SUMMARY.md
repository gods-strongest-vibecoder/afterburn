---
phase: 05-reporting-output
plan: 03
subsystem: reporting
tags: [markdown, yaml, frontmatter, ai-reports, llm-tools]

# Dependency graph
requires:
  - phase: 05-01
    provides: health-scorer and priority-ranker for report metadata
  - phase: 04-03
    provides: DiagnosedError with sourceLocation and UIAuditResult
  - phase: 03-04
    provides: ExecutionArtifact with workflowResults, pageAudits, deadButtons, brokenForms
provides:
  - generateMarkdownReport function returning structured Markdown string with YAML frontmatter
  - writeMarkdownReport function for file persistence
  - Machine-readable metadata (session_id, health_score, total_issues, ai_powered, source_analysis)
  - Prioritized issue table with columns: #, Priority, Category, Summary, Location
  - Technical error details with original error messages and source code references
  - Reproduction steps from failed workflow results
  - UI audit results with layout, contrast, formatting issues
  - Accessibility summary with violation counts and top violations
  - Consistent H1/H2/H3 heading hierarchy for AI parsing
affects: [05-04-main-pipeline-integration, 06-interfaces]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - YAML frontmatter for machine-readable metadata
    - Consistent heading hierarchy (H1 title, H2 sections, H3 subsections)
    - Labeled tables with header rows and separator rows
    - Language-hinted code blocks (```typescript, ```bash)
    - Explicit text labels for metadata (**Priority:** HIGH)
    - Backtick-quoted file paths in source references

key-files:
  created:
    - src/reports/markdown-generator.ts
  modified: []

key-decisions:
  - "YAML frontmatter format: tool, version, session_id, timestamp, target_url, health_score, health_label, total_issues, workflows_tested, workflows_passed, workflows_failed, ai_powered, source_analysis"
  - "Issue table columns: #, Priority, Category, Summary (80 char truncation), Location"
  - "Reproduction steps: Include ALL steps (passed + failed) so AI sees full workflow context"
  - "Edge case handling: Fallback messages for empty arrays (no errors, no workflows, no source)"
  - "AI-parseability: No emoji-only markers, explicit text labels, consistent heading hierarchy"

patterns-established:
  - "Markdown report structure: frontmatter → summary → prioritized issues → details → reproduction → UI → accessibility → source references"
  - "Helper function pattern: Each section has a dedicated generator function with edge case handling"
  - "Graceful degradation: Fallback messages when features not available (e.g., no source analysis)"

# Metrics
duration: 2min
completed: 2026-02-07
---

# Phase 5 Plan 3: Markdown Report Generator Summary

**Structured Markdown reports with YAML frontmatter, prioritized issue tables, technical details, reproduction steps, and source code references for AI coding tool consumption**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-07T22:57:52Z
- **Completed:** 2026-02-07T22:59:28Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Generated structured Markdown reports with YAML frontmatter containing 13 machine-readable metadata fields
- Created prioritized issue table with columns for priority (HIGH/MEDIUM/LOW), category, summary (80-char truncated), and location
- Included technical error details with original error messages, root causes, suggested fixes, and source code references (file:line + context)
- Generated reproduction steps from failed workflows showing all steps (passed + failed) for full context
- Built UI audit section with layout, contrast, and formatting issues from vision LLM analysis
- Created accessibility summary with violation counts per page and top 5 most common violations
- Ensured AI-parseability with consistent H1/H2/H3 heading hierarchy, labeled tables, language-hinted code blocks, and explicit text labels
- Implemented edge case handling with fallback messages for empty arrays (no errors, no workflows, no source analysis)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Markdown report generator** - `683e49e` (feat)

## Files Created/Modified

- `src/reports/markdown-generator.ts` - Generates structured Markdown reports with YAML frontmatter for AI coding tool consumption (generateMarkdownReport, writeMarkdownReport)

## Decisions Made

**YAML frontmatter structure:**
- Includes 13 metadata fields: tool, version, session_id, timestamp, target_url, health_score, health_label, total_issues, workflows_tested, workflows_passed, workflows_failed, ai_powered, source_analysis
- Enables AI tools to parse reports programmatically without text processing

**Issue table design:**
- Columns: #, Priority, Category, Summary, Location
- Priority in CAPS (HIGH/MEDIUM/LOW) for clear visual scanning
- Summary truncated to 80 chars to keep table readable
- Location shows file:line for source-mapped errors, URLs for others

**Reproduction steps strategy:**
- Include ALL steps (passed + failed) in failed workflows
- Rationale: AI tools need full context to understand where workflow failed and what succeeded before it
- Duration and error messages attached to each step

**Edge case handling approach:**
- Every helper function returns fallback message for empty input
- Examples: "No errors diagnosed.", "All workflows passed successfully.", "No source code references available. Run with `--source ./path` for source-level diagnosis."
- Ensures report is always valid Markdown even with minimal data

**AI-parseability requirements:**
- Consistent heading hierarchy: H1 for title, H2 for sections, H3 for subsections (no skipped levels)
- All tables have header rows with `|` delimiters and separator row (`|---|---|`)
- Code blocks use triple backticks with language hints (```typescript, ```bash)
- Explicit text labels: `**Priority:** HIGH` (not emoji-only markers)
- Source code references use backtick-quoted file paths: `src/file.ts:42`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Markdown report generator complete and ready for pipeline integration. Next plan (05-04) will integrate both HTML and Markdown report generators into the main pipeline alongside health scoring and priority ranking.

**Ready for:**
- Plan 05-04: Main pipeline integration (add reporting step after analysis phase)

**Artifacts produced:**
- `src/reports/markdown-generator.ts` with exports: generateMarkdownReport (returns Markdown string), writeMarkdownReport (saves to file)

**Satisfies requirements:**
- RPRT-06: Markdown report with YAML frontmatter
- RPRT-07: Technical details and reproduction steps
- RPRT-08: Source code references (file:line + context)

---
*Phase: 05-reporting-output*
*Completed: 2026-02-07*
