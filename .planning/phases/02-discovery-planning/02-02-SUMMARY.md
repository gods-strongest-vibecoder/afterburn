---
phase: 02-discovery-planning
plan: 02
subsystem: discovery
tags: [playwright, spa-detection, element-discovery, react, vue, angular, next.js, nuxt, svelte]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Playwright browser automation with stealth mode
  - phase: 02-01
    provides: Discovery type definitions (SPAFramework, InteractiveElement, FormInfo, LinkInfo)
provides:
  - SPA framework detection (React, Vue, Angular, Next.js, Nuxt, Svelte)
  - History API interception for client-side route discovery
  - Interactive element discovery (forms, buttons, links, menus)
  - Hidden element discovery via triggered interactions
  - Complete form field inventory extraction
affects: [02-03, 02-04, 02-05, 03-execution-testing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Framework detection via window properties and DOM attributes"
    - "History API interception pattern for SPA route discovery"
    - "Role-based Playwright locators for accessibility-first element selection"
    - "Hidden element discovery via button clicks and menu hovers"
    - "Form field label association using 'for' attribute and ancestor lookup"

key-files:
  created:
    - src/discovery/spa-detector.ts
    - src/discovery/element-mapper.ts
  modified: []

key-decisions:
  - "Detect meta-frameworks first (Next.js before React, Nuxt before Vue) to avoid false positives"
  - "30-second hard timeout for route interception to prevent infinite loops"
  - "Skip navigation elements with delete/submit/cancel text to avoid destructive actions"
  - "Deduplicate links by absolute URL to prevent duplicate entries in sitemap"
  - "Use goBack() for navigation reset, fallback to direct goto if goBack fails"

patterns-established:
  - "SPA Detection: Check meta-frameworks first, then base frameworks, return 'none' if no match"
  - "Route Discovery: Inject History API interceptor → click nav elements → collect routes → navigate back"
  - "Element Discovery: Use getByRole() for buttons/links, locator() for forms/menus, resolve relative URLs"
  - "Hidden Elements: Click triggers → wait 500ms → discover new elements → close/reset → continue"
  - "Label Association: Try aria-label → label[for=id] → ancestor::label in order"

# Metrics
duration: 5min
completed: 2026-02-07
---

# Phase 02 Plan 02: SPA Framework Detection & Interactive Element Mapper Summary

**Complete SPA framework detection for 6 frameworks with History API interception and comprehensive element discovery including hidden modals, dropdowns, and mobile navigation**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-07T16:52:27Z
- **Completed:** 2026-02-07T16:57:23Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- SPA framework detection identifies React, Vue, Angular, Next.js, Nuxt, and Svelte with version extraction
- Client-side route discovery via History API interception and navigation element clicking
- Comprehensive element discovery: forms (with complete field inventory), buttons, links, menus, and other interactive elements
- Hidden element discovery triggers modals, dropdowns, and hamburger menus to map full UI surface
- Safe interaction handling with timeouts, error catching, and navigation reset capabilities

## Task Commits

Each task was committed atomically:

1. **Task 1: Build SPA framework detection and route interception** - `574ef59` (feat)
2. **Task 2: Build interactive element mapper with hidden element discovery** - `3e2dfff` (feat)

## Files Created/Modified
- `src/discovery/spa-detector.ts` - Detects SPA frameworks from window properties/DOM attributes, intercepts History API to discover client-side routes
- `src/discovery/element-mapper.ts` - Discovers all interactive elements including forms (with field inventory), buttons, links, menus, tabs, modals; triggers hidden elements

## Decisions Made

**Framework detection order:**
- Meta-frameworks checked first (Next.js before React, Nuxt before Vue) because they use underlying frameworks internally and would otherwise cause false positives

**Navigation safety:**
- Skip links/buttons with text containing "delete", "remove", "cancel", "submit", "download", "logout" to avoid triggering destructive actions during route discovery

**Timeout strategy:**
- 30-second hard timeout for entire route interception function to prevent infinite loops on sites with dynamic content generation
- 2-second timeout per element click to quickly recover from non-responsive elements
- 3-second timeout for page load state after navigation

**URL resolution:**
- All links resolved to absolute URLs using `new URL(href, pageUrl).href` for consistent deduplication
- Links deduplicated by absolute URL to prevent same page appearing multiple times in sitemap

**Hidden element reset:**
- After discovering hidden content, try clicking trigger again to toggle off
- Fallback to Escape key if toggle fails
- Ultimate fallback: reload page to reset state if modal can't be closed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**History API type errors:**
- TypeScript complained about `history.pushState.apply(history, args)` with rest parameters
- **Resolution:** Changed from `apply(history, args)` to `call(history, data, unused, url)` with proper typed parameters

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 02-03 (Broken link validator and sitemap builder):**
- SPA framework detection available for adaptive crawling strategies
- Element discovery functions ready to be called per page during crawl
- Route interception ready for discovering client-side navigation in React/Vue/Angular apps

**Ready for Phase 02-04 (Workflow plan generator):**
- Complete element inventory (forms with fields, buttons, links, menus) ready for AI workflow planning
- Form field structure includes all necessary metadata (type, name, label, required, placeholder)

**No blockers:**
- All functions export properly and TypeScript compilation passes
- Playwright integration verified with proper role-based locators and page.evaluate() usage
- Safe error handling prevents crashes on non-standard sites

---
*Phase: 02-discovery-planning*
*Completed: 2026-02-07*
