---
phase: 02-discovery-planning
plan: 05
subsystem: discovery
tags: [discovery-pipeline, integration, orchestration, phase-2-capstone]

# Dependency graph
requires:
  - phase: 02-01
    provides: Discovery types and SiteCrawler with pageProcessor callback and additionalUrls API
  - phase: 02-02
    provides: SPA detector and element mapper with hidden element discovery
  - phase: 02-03
    provides: Link validator and sitemap builder
  - phase: 02-04
    provides: Gemini AI client and WorkflowPlanner

provides:
  - runDiscovery() orchestrator function wiring all Phase 2 modules
  - Complete discovery pipeline: SPA detection → crawl → element discovery → link validation → sitemap → AI workflows
  - Main entry point updated to run Phase 2 discovery instead of Phase 1 demo
  - --flows CLI flag for user workflow hints
  - Discovery artifact saved with all discovered data

affects: [03-execution, Phase 3 will consume discovery artifacts to execute workflows]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pipeline orchestration pattern: run SPA detection first, feed routes to crawler as additionalUrls"
    - "pageProcessor callback pattern for per-page element discovery during crawl"
    - "Graceful degradation: skip AI workflow planning if GEMINI_API_KEY not set"
    - "Progress reporting via onProgress callback for real-time user feedback"

key-files:
  created:
    - src/discovery/discovery-pipeline.ts
  modified:
    - src/discovery/index.ts
    - src/index.ts

key-decisions:
  - "Run SPA detection before crawl to feed discovered routes as additionalUrls"
  - "Use pageProcessor callback for element discovery instead of post-crawl processing"
  - "Merge visible + hidden elements from element mapper during pageProcessor"
  - "Collect broken links across all pages in closure variable"
  - "Graceful degradation when GEMINI_API_KEY not set (warn but continue)"
  - "Print sitemap tree and workflow summary to console for immediate user feedback"
  - "Replace Phase 1 demo entry point with full Phase 2 discovery pipeline"

patterns-established:
  - "Discovery orchestrator pattern: initialize managers → SPA detect → crawl with pageProcessor → post-process → save artifact"
  - "Per-page processing pattern: element discovery + screenshot + link validation inside pageProcessor callback"
  - "Progress reporting: onProgress callback for orchestrator-level updates, per-page progress inside pageProcessor"

# Metrics
duration: 4min
completed: 2026-02-07
---

# Phase 2 Plan 5: Discovery Pipeline Integration Summary

**Complete discovery orchestrator wiring SPA detector, crawler, element mapper, link validator, sitemap builder, and AI workflow planner into runDiscovery() entry point**

## Performance

- **Duration:** 4 minutes
- **Started:** 2026-02-07T17:21:45Z
- **Completed:** 2026-02-07T17:25:59Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Wired all Phase 2 modules into single `runDiscovery()` orchestrator function
- Integrated SPA detection before crawl to seed discovered routes as additionalUrls
- Implemented per-page element discovery via pageProcessor callback (visible + hidden elements merged)
- Added AI workflow generation with graceful degradation when GEMINI_API_KEY not set
- Updated main entry point to run Phase 2 discovery pipeline with --flows flag support
- Print comprehensive summary: pages found, interactive elements, broken links, SPA framework, workflows

## Task Commits

Each task was committed atomically:

1. **Task 1: Build discovery pipeline orchestrator (crawl + elements + SPA + links + sitemap)** - `da7d468` (feat)
   - Created discovery-pipeline.ts with runDiscovery() function
   - Steps 1-7: Initialize, launch browser, SPA detection, pageProcessor callback, crawler construction, crawl execution, sitemap building

2. **Task 2: Add AI workflow generation, artifact save, and update entry point** - `8542553` (feat)
   - Completed steps 8-10: AI workflow generation, artifact save, cleanup
   - Updated discovery/index.ts to export all Phase 2 modules
   - Updated main entry point to use Phase 2 pipeline instead of Phase 1 demo
   - Added --flows flag parsing for user workflow hints

## Files Created/Modified

- `src/discovery/discovery-pipeline.ts` - Phase 2 orchestrator: SPA detection → crawl with pageProcessor → sitemap → AI workflows → artifact save
- `src/discovery/index.ts` - Barrel export for all Phase 2 modules (crawler, SPA detector, element mapper, link validator, sitemap builder, discovery pipeline)
- `src/index.ts` - Main entry point with Phase 2 discovery pipeline, --flows flag parsing, comprehensive summary output

## Decisions Made

**Integration approach:**
- Run SPA detection on separate page before crawl (to avoid race conditions with crawler's first page)
- Feed SPA routes as additionalUrls to crawler's crawl() method
- Use crawler's pageProcessor callback for per-page element discovery (keeps page open for screenshot + link validation)
- Merge visible + hidden elements during pageProcessor (deduplication by selector/href)
- Collect broken links in closure variable across all pages

**Graceful degradation:**
- Check for GEMINI_API_KEY before initializing Gemini client
- Skip workflow planning if key not set (log warning, continue without workflows)
- Allows tool to work for discovery even without AI features

**User experience:**
- onProgress callback for high-level orchestrator updates (browser launch, SPA detection, sitemap building, workflow generation)
- Per-page crawl progress inside pageProcessor (individual page URLs)
- Print sitemap tree and workflow summary to console immediately
- Comprehensive final summary with counts: pages, elements, broken links, SPA framework, workflows

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all modules integrated cleanly. The pageProcessor callback pattern and additionalUrls API from Plan 01 worked exactly as designed for this integration.

## User Setup Required

**Optional: Gemini API key for AI workflow planning**

To enable AI workflow generation, set environment variable:
```bash
export GEMINI_API_KEY="your-api-key"
```

Get API key from: https://aistudio.google.com/app/apikey

**Tool works without GEMINI_API_KEY** - will skip workflow planning with a warning but still perform full discovery (crawl, elements, links, sitemap).

## Next Phase Readiness

**Phase 2 COMPLETE** - All 5 plans executed successfully.

Discovery pipeline fully integrated and working:
- ✓ Types and crawler (02-01)
- ✓ SPA detector and element mapper (02-02)
- ✓ Link validator and sitemap builder (02-03)
- ✓ Gemini AI and workflow planner (02-04)
- ✓ Discovery pipeline integration (02-05)

**Ready for Phase 3: Test Execution Engine**

Phase 3 will:
- Load discovery artifacts saved by Phase 2
- Execute workflow plans using Playwright
- Capture per-step screenshots
- Detect failures and collect error details

**Blockers:** None

**Concerns:** None - Phase 2 delivered all requirements on time

---
*Phase: 02-discovery-planning*
*Completed: 2026-02-07*
