---
phase: 05-reporting-output
plan: 01
subsystem: reporting
tags: [handlebars, marked, health-scoring, prioritization, issue-ranking]

# Dependency graph
requires:
  - phase: 04-analysis-diagnosis
    provides: DiagnosedError, UIAuditResult, AnalysisArtifact types with plain English error diagnoses
  - phase: 03-execution
    provides: ExecutionArtifact with workflow results, dead buttons, broken forms, accessibility violations
provides:
  - Health scorer calculating 0-100 weighted score with veto logic for failed workflows
  - Priority ranker categorizing issues as high/medium/low with plain English summaries
  - Handlebars and marked dependencies for HTML/Markdown report generation
affects: [05-02-html-report, 05-03-markdown-report]

# Tech tracking
tech-stack:
  added: [handlebars, marked]
  patterns: [weighted health scoring with veto logic, priority-based issue categorization]

key-files:
  created: [src/reports/health-scorer.ts, src/reports/priority-ranker.ts]
  modified: [package.json, package-lock.json]

key-decisions:
  - "Health score weights: workflows 40%, errors 30%, accessibility 20%, performance 10%"
  - "Veto logic: any failed workflow caps score at maximum 50 (ensures workflow failures are visible)"
  - "Label thresholds: good >= 80, needs-work >= 50, poor < 50"
  - "Priority categorization: high = workflow-blocking, medium = errors/confusing, low = minor issues"
  - "All summaries in plain English targeting vibe coders (zero jargon)"

patterns-established:
  - "Weighted health scoring with breakdown by category"
  - "Three-tier priority system (high/medium/low) with insertion-order preservation"
  - "Plain English impact statements for each priority level"

# Metrics
duration: 3min
completed: 2026-02-07
---

# Phase 5 Plan 1: Report Foundations Summary

**Health scoring with veto logic and three-tier issue prioritization ready for HTML and Markdown report generators**

## Performance

- **Duration:** 3 minutes
- **Started:** 2026-02-07T22:49:28Z
- **Completed:** 2026-02-07T22:52:23Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Installed Handlebars and marked for HTML/Markdown report generation
- Created health scorer with weighted 0-100 scoring (workflows 40%, errors 30%, accessibility 20%, performance 10%)
- Implemented veto logic capping score at 50 when any workflow fails
- Created priority ranker categorizing all issue types into high/medium/low with plain English summaries
- Both modules compile cleanly with TypeScript strict mode

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and create health scorer** - `bee7b83` (feat)
2. **Task 2: Create priority ranker** - `fe8e90a` (feat)

## Files Created/Modified
- `package.json` - Added handlebars and marked dependencies
- `package-lock.json` - Dependency lockfile updated
- `src/reports/health-scorer.ts` - Calculates 0-100 health score with weighted breakdown and veto logic
- `src/reports/priority-ranker.ts` - Categorizes issues as high/medium/low with plain English summaries

## Decisions Made

**Health scoring weights:** Workflows 40%, errors 30%, accessibility 20%, performance 10% - balances user flow impact with technical quality

**Veto logic implementation:** Any failed workflow caps overall score at maximum 50 - ensures critical workflow failures are immediately visible regardless of other metrics

**Label thresholds:** good >= 80, needs-work >= 50, poor < 50 - provides three clear health states aligned with business impact

**Priority categorization rules:**
- HIGH: Navigation, authentication, form errors (breaks core user flows)
- MEDIUM: Network/JS errors, dead buttons, broken forms, high severity UI issues, critical/serious accessibility violations (causes errors or confuses users)
- LOW: DOM/unknown errors, low severity UI issues, moderate/minor accessibility violations (minor but worth fixing)

**Plain English targeting:** All summaries, impacts, and fix suggestions written for vibe coders with zero technical jargon - maintains project's accessibility goal

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - both modules implemented cleanly and compiled successfully on first attempt.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Plans 05-02 and 05-03:**
- Health scorer exports `calculateHealthScore()` function and `HealthScore` interface
- Priority ranker exports `prioritizeIssues()` function, `PrioritizedIssue` interface, and `IssuePriority` type
- Handlebars installed for HTML templating in Plan 05-02
- Marked installed for Markdown generation in Plan 05-03
- Both modules handle edge cases (no workflows, no audits, division by zero)
- All outputs are plain English suitable for vibe coders

**No blockers or concerns** - foundation solid for report generation.

---
*Phase: 05-reporting-output*
*Completed: 2026-02-07*
