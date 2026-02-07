---
phase: 02-discovery-planning
plan: 03
subsystem: discovery
tags: [playwright, link-validation, sitemap, web-crawling]

# Dependency graph
requires:
  - phase: 02-01
    provides: Discovery types (BrokenLink, LinkInfo, SitemapNode, PageData)
  - phase: 02-02
    provides: Element mapper for interactive element discovery
provides:
  - Broken link detection via HTTP status checking (validateLinks)
  - Hierarchical sitemap tree builder (buildSitemap)
  - Human-readable sitemap rendering (printSitemapTree)
affects: [02-04-workflow-planning, 02-05-integration, Phase-5-reporting]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Batch-based concurrency limiting for HTTP checks (max 5 concurrent)"
    - "URL normalization for deduplication (trailing slashes, query strings)"
    - "Placeholder node creation for uncrawled parent paths in tree"

key-files:
  created:
    - src/discovery/link-validator.ts
    - src/discovery/sitemap-builder.ts
  modified: []

key-decisions:
  - "Use page.request.get() instead of HEAD for link validation (maintains session context, more reliable)"
  - "Skip external links to avoid rate-limiting third-party sites"
  - "Create placeholder nodes for intermediate paths not crawled (enables complete tree even with sparse crawl)"
  - "Normalize URLs by removing trailing slashes and lowercasing hostname for deduplication"
  - "Process link checks in batches of 5 to avoid overwhelming target servers"

patterns-established:
  - "Link validator: page.request.get() with 5s timeout, batched concurrency control"
  - "Sitemap builder: depth-first tree construction from sorted path segments"
  - "URL normalization: handle trailing slashes, query strings, fragment-only links"

# Metrics
duration: 3min
completed: 2026-02-07
---

# Phase 02 Plan 03: Link Validation & Sitemap Summary

**Broken link detection via batched HTTP checks and hierarchical sitemap tree construction with placeholder nodes**

## Performance

- **Duration:** 3 minutes
- **Started:** 2026-02-07T17:04:33Z
- **Completed:** 2026-02-07T17:07:53Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Built validateLinks function detecting 4xx, 5xx, and network errors on internal links
- Implemented batched HTTP checking (5 concurrent) to avoid server overload
- Created buildSitemap function transforming flat PageData into hierarchical tree
- Added printSitemapTree for human-readable CLI output (vibe coder friendly)
- Handled edge cases: query params, trailing slashes, placeholder nodes for uncrawled paths

## Task Commits

Each task was committed atomically:

1. **Task 1: Build broken link validator** - `4101712` (feat)
2. **Task 2: Build hierarchical sitemap tree builder** - `6128de4` (feat)

**Plan metadata:** (pending final metadata commit)

## Files Created/Modified
- `src/discovery/link-validator.ts` - HTTP status checking for internal links with batch concurrency control
- `src/discovery/sitemap-builder.ts` - Hierarchical tree builder with placeholder nodes and human-readable rendering

## Decisions Made

**1. Use page.request.get() for link validation**
- Rationale: Maintains browser session context (cookies, auth) which is critical for authenticated sites
- Alternative considered: Standalone HTTP client would lose session state

**2. Skip external link validation**
- Rationale: Avoid rate-limiting third-party sites; focus on internal link health
- Trade-off: Won't detect broken external references, but reduces crawl time and risk

**3. Batched concurrency (max 5 concurrent)**
- Rationale: Balance between speed and server load; prevents overwhelming target
- Implementation: Process.allSettled with batch slicing

**4. Create placeholder nodes for uncrawled parent paths**
- Rationale: Ensures complete tree structure even when intermediate pages not crawled (e.g., /dashboard/settings exists but /dashboard wasn't crawled)
- Enables hierarchical navigation in reports without gaps

**5. URL normalization strategy**
- Trailing slash removal: `/about/` → `/about`
- Query string pages grouped under base path
- Fragment-only links (#top) skipped entirely

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Pre-existing type error in src/ai/gemini-client.ts**
- Discovered during tsc verification: Zod type incompatibility
- Not related to Task 2 work (verified with isolated type check)
- Deferred to plan 02-04 owner (AI client is part of workflow planning)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for integration:**
- validateLinks can be called during page crawl to populate BrokenLink[]
- buildSitemap consumes PageData[] from crawler to produce SitemapNode tree
- printSitemapTree provides CLI progress output

**Handoff to plan 02-04:**
- Sitemap tree is primary input for workflow plan generation
- BrokenLink[] should be surfaced in reports

**Handoff to plan 02-05:**
- Integration point: SiteCrawler → validateLinks per page → buildSitemap from all pages
- Need to wire into discovery pipeline orchestration

---
*Phase: 02-discovery-planning*
*Completed: 2026-02-07*
