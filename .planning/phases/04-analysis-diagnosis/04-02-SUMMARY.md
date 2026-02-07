---
phase: 04-analysis-diagnosis
plan: 02
subsystem: analysis
tags: [ts-morph, ast-analysis, source-mapping, typescript]

# Dependency graph
requires:
  - phase: 04-01
    provides: Diagnosis schema types (SourceLocation interface)
provides:
  - Source code mapper using ts-morph AST analysis
  - Error message to source location pinpointing
  - Batch error mapping for performance
affects: [04-03-error-diagnoser, 04-04-ui-auditor, 05-reporting]

# Tech tracking
tech-stack:
  added: [ts-morph]
  patterns: [AST-based code search, term extraction from error messages, relevance scoring]

key-files:
  created: [src/analysis/source-mapper.ts]
  modified: [package.json]

key-decisions:
  - "10-second timeout for source mapping prevents hanging on large codebases"
  - "Relevance scoring (exact match=10, partial=5, literal=3) prioritizes best matches"
  - "Graceful degradation on all error paths (missing files, timeout, parse errors)"
  - "Batch mapping shares single ts-morph Project instance for efficiency"

patterns-established:
  - "Error term extraction: quoted strings → identifiers from patterns → camelCase/PascalCase → URL path segments"
  - "AST search order: function declarations → arrow functions → classes → string literals"
  - "Fallback loading: try tsconfig.json, fallback to manual glob patterns"

# Metrics
duration: 5min
completed: 2026-02-07
---

# Phase 4 Plan 02: Source Code Mapper Summary

**TypeScript/JavaScript source code mapper using ts-morph AST analysis to pinpoint error locations by file and line number**

## Performance

- **Duration:** 5 minutes
- **Started:** 2026-02-07T19:56:38Z
- **Completed:** 2026-02-07T20:01:23Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments
- Created source-mapper.ts with ts-morph for TypeScript/JavaScript AST analysis
- Implemented intelligent error term extraction from browser error messages
- Built relevance-scored code search across functions, classes, variables, and string literals
- Added 10-second timeout protection to prevent hanging on large codebases
- Graceful degradation for missing tsconfig.json, invalid paths, and parse errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Install ts-morph and create source mapper** - `c40cb42` (feat)

## Files Created/Modified
- `src/analysis/source-mapper.ts` - AST-based source code mapper with term extraction, relevance scoring, and timeout protection
- `package.json` - Added ts-morph dependency (^27.0.2)

## Decisions Made

**Error term extraction strategy:**
- Extract quoted strings, identifiers from common error patterns ("Cannot read property X", "X is not a function")
- Filter stop words (undefined, null, object, string, number)
- Sort by length (longer = more specific = search first)

**AST search implementation:**
- Search function declarations, arrow functions, classes, and string literals
- Score by relevance: exact name match = 10, partial match = 5, string literal = 3
- Return highest-scoring match to pinpoint most likely error location

**Timeout and fallback handling:**
- 10-second hard timeout prevents hanging on large codebases
- Try tsconfig.json first, fallback to manual .ts/.tsx/.js/.jsx glob patterns if missing
- Graceful return null on any error path (missing files, timeout, parse errors)

**Batch efficiency:**
- `mapMultipleErrors()` loads ts-morph Project once for all errors
- Shares 10-second timeout across entire batch (not per-error)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript compilation passed on first attempt, ts-morph integration worked as expected.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Plan 04-03 (Error Diagnoser):**
- Source mapper exports `mapErrorToSource()` and `mapMultipleErrors()`
- Returns `SourceLocation` with file path, line number, and code context
- Can be integrated into error diagnosis pipeline to enrich DiagnosedError objects

**Ready for Plan 04-04 (UI Auditor):**
- Source mapping capability available for UI-related JavaScript errors

**Ready for Phase 5 (Reporting):**
- Source locations can be included in both HTML and Markdown reports
- File paths relative to source directory for clean display

---
*Phase: 04-analysis-diagnosis*
*Completed: 2026-02-07*
