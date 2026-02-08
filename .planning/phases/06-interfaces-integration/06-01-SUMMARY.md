---
phase: 06-interfaces-integration
plan: 01
subsystem: cli
tags: [commander.js, ora, cli, pipeline, engine]

# Dependency graph
requires:
  - phase: 05-reporting-output
    provides: Health scorer, priority ranker, HTML/Markdown report generators
provides:
  - Reusable runAfterburn() engine function for all interfaces
  - Commander.js CLI with proper flag handling and help text
  - Thin entry point pattern for CLI, MCP, GitHub Action
  - Stage-based progress callback system with ora spinners
affects: [06-02-mcp-server, 06-03-github-action]

# Tech tracking
tech-stack:
  added: []
  patterns: [Core engine extraction, onProgress callback pattern, Commander.js CLI structure]

key-files:
  created: [src/core/engine.ts, src/core/index.ts, src/cli/commander-cli.ts]
  modified: [src/index.ts, src/cli/index.ts, package.json]

key-decisions:
  - "Core engine extracted into reusable runAfterburn() function that all interfaces (CLI, MCP, GitHub Action) can import"
  - "onProgress callback with stage names enables different interfaces to handle progress differently (ora spinners for CLI, structured logs for MCP/Action)"
  - "Reports default to ./afterburn-reports/{timestamp}/ instead of .afterburn/reports/ for better user experience"
  - "Commander.js provides proper flag parsing with help text, replacing manual process.argv parsing"
  - "Entry point reduced to 3 lines - imports program, calls parse()"
  - "--max-pages flag registered as string and parsed to number (Commander convention)"

patterns-established:
  - "Pattern 1: Core engine returns AfterBurnResult with all data needed by interfaces - no process.exit() in engine"
  - "Pattern 2: onProgress callback with stage names ('browser', 'discovery', 'execution', 'analysis', 'reporting', 'complete') enables interface-specific progress handling"
  - "Pattern 3: Graceful report degradation - report failures don't affect exitCode (reflects test results, not report generation)"

# Metrics
duration: 5min
completed: 2026-02-08
---

# Phase 6 Plan 1: Core Engine Extraction & CLI Summary

**Reusable runAfterburn() engine with Commander.js CLI, ora spinners, and configurable output directory**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-08T00:34:53Z
- **Completed:** 2026-02-08T00:39:53Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Core pipeline extracted into reusable runAfterburn() function that MCP and GitHub Action can import
- Commander.js CLI with all required flags (--source, --email, --password, --output-dir, --flows, --max-pages) and power-user flags (--no-headless, --verbose)
- Stage-based progress callback system with ora spinners for clean terminal UX
- Reports default to ./afterburn-reports/{timestamp}/ for better user experience
- Entry point reduced from 270 lines to 3 lines

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract core engine into reusable function** - `1fd84c3` (feat)
2. **Task 2: Build Commander.js CLI and rewire entry point** - `2b7c031` (feat)

## Files Created/Modified
- `src/core/engine.ts` - Reusable runAfterburn() function with full pipeline (discovery → execution → analysis → reporting)
- `src/core/index.ts` - Barrel export for core engine
- `src/cli/commander-cli.ts` - Commander.js program definition with action handler and ora spinner integration
- `src/cli/index.ts` - Added program export
- `src/index.ts` - Rewritten as 3-line entry point (shebang, import, parse)
- `package.json` - Added "files": ["dist"] for npx optimization

## Decisions Made

**Core engine design:**
- runAfterburn() encapsulates full pipeline but does NOT call process.exit() - that's the caller's job
- AfterBurnResult includes all data needed by interfaces: health score, prioritized issues, report paths, exit code
- onProgress callback receives stage names for interface-specific handling

**Progress reporting:**
- Stage names: 'browser', 'discovery', 'execution', 'analysis', 'reporting', 'complete'
- CLI maps stages to ora spinners with clean messages ("Crawling site...", "Testing workflows...")
- Spinner succeeds on stage transitions, final succeed on 'complete'

**Report paths:**
- Changed from .afterburn/reports/ to ./afterburn-reports/{timestamp}/ for better UX
- Users expect reports in working directory, not hidden .afterburn folder
- Timestamp-based directories prevent report overwrites

**Commander.js flags:**
- --max-pages registered as string (Commander convention) and parsed to number in action handler
- --no-headless flag uses Commander's boolean negation pattern
- All required flags from CONTEXT.md implemented: --source, --email, --password, --output-dir, --flows

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript compiled without errors, all verification steps passed.

## Next Phase Readiness

**Ready for Plan 06-02 (MCP Server):**
- Core engine can be imported from src/core/index.js
- AfterBurnOptions and AfterBurnResult types exported for MCP tool definitions
- onProgress callback enables MCP to provide structured progress logs

**Ready for Plan 06-03 (GitHub Action):**
- Same core engine import available
- exitCode in AfterBurnResult for GitHub Actions workflow success/failure
- Report paths for artifact upload

**Architecture benefits:**
- Zero code duplication across interfaces
- All three interfaces (CLI, MCP, GitHub Action) use identical pipeline
- Bug fixes and features in core engine automatically available to all interfaces

---
*Phase: 06-interfaces-integration*
*Completed: 2026-02-08*
