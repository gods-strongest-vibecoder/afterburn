# Phase 2 Plan 01: Types & Crawler Summary

**One-liner:** Recursive web crawler with URL deduplication, pageProcessor callback architecture, and comprehensive Phase 2 type definitions

---
phase: 02-discovery-planning
plan: 01
subsystem: discovery-core
status: complete
tags: [crawler, types, architecture, url-queue]

requires:
  - 01-02 (BrowserManager with stealth and cookie dismissal)

provides:
  - Phase 2 type definitions (PageData, CrawlResult, WorkflowPlan, etc.)
  - SiteCrawler class with recursive crawling
  - pageProcessor callback for pipeline extensibility
  - additionalUrls support for SPA route injection

affects:
  - 02-02 (SPA detector uses additionalUrls to seed routes)
  - 02-03 (element mapper injects via pageProcessor)
  - 02-04 (link validator injects via pageProcessor)
  - 02-05 (discovery pipeline orchestrates all modules)

tech-stack:
  added: []
  patterns:
    - "pageProcessor callback for pipeline stage injection"
    - "URL normalization for deduplication"
    - "Promise.allSettled for batch concurrency"

key-files:
  created:
    - src/types/discovery.ts
    - src/discovery/crawler.ts
    - src/discovery/index.ts
  modified:
    - src/discovery/spa-detector.ts (fixed blocking type errors)

decisions:
  - id: crawler-architecture
    what: "Build crawler on top of BrowserManager instead of using Crawlee"
    why: "playwright-extra conflicts with Crawlee's browser lifecycle; stealth setup requires full control"
    impact: "Manual URL queue + dedup implementation, but guaranteed stealth compatibility"
    date: 2026-02-07

  - id: pageprocessor-callback
    what: "Inject per-page processing via pageProcessor callback"
    why: "Separates crawling (URL management) from per-page work (elements, screenshots, validation)"
    impact: "Crawler stays focused on URL discovery; element mapping and validation are pluggable"
    date: 2026-02-07

  - id: additionalurls-seeding
    what: "Accept additionalUrls in crawl() for SPA route seeding"
    why: "SPA detector discovers routes via History API interception, needs to inject them into crawl"
    impact: "Pipeline can discover routes on first page, then seed them for full crawl"
    date: 2026-02-07

metrics:
  duration: 6m 24s
  completed: 2026-02-07
---

## What Was Built

### Phase 2 Type Definitions (src/types/discovery.ts)
Comprehensive type definitions for all Phase 2 modules:

- **PageData**: Complete page information (forms, buttons, links, menus, screenshot refs, SPA framework)
- **FormInfo & FormField**: Form structure with field inventory (type, name, label, required, placeholder)
- **InteractiveElement**: Buttons, inputs, selects, menus, tabs, modal triggers with selectors
- **LinkInfo**: Links with internal/external classification and status codes (for validator)
- **SitemapNode**: Hierarchical tree structure for site navigation
- **WorkflowPlan & WorkflowStep**: AI-generated test plans with confidence scores
- **CrawlResult**: Crawler output with pages, broken links, metrics
- **DiscoveryArtifact**: Complete Phase 2 artifact extending ArtifactMetadata

All types exported and verified with `tsc --noEmit`.

### Recursive Web Crawler (src/discovery/crawler.ts)
SiteCrawler class that recursively discovers all same-hostname pages:

**Architecture:**
- URL queue with Set-based deduplication
- Batch processing with configurable concurrency (default 3)
- URL normalization (lowercase hostname, remove fragments, sort params, remove trailing slashes)
- Exclude patterns support (*.pdf, */admin/*)
- Progress callback for live terminal feedback

**Key features:**
- **pageProcessor callback**: Injected per page BEFORE page.close() — enables element discovery, screenshots, link validation without crawler needing to know about them
- **additionalUrls support**: Seeds extra URLs at crawl start — critical for SPA routes discovered via History API interception
- **Uses BrowserManager**: Inherits stealth and cookie dismissal automatically
- **Warning after 50 pages**: Logs "Discovered 50+ pages. Crawl continuing..." but keeps going
- **Error resilience**: Promise.allSettled per batch — one page failure doesn't fail entire crawl

**CrawlerOptions interface:**
```typescript
{
  maxConcurrency?: number;    // default: 3
  maxPages?: number;          // default: 0 (unlimited)
  excludePatterns?: string[]; // ['*.pdf', '*/admin/*']
  onPageCrawled?: (url: string, count: number) => void;
  pageProcessor?: (page: Page, url: string) => Promise<Partial<PageData>>;
  additionalUrls?: string[];  // SPA routes to seed
}
```

**Flow per page:**
1. BrowserManager.newPage(url) — stealth + cookie dismissal
2. Extract title and links
3. Create minimal PageData
4. If pageProcessor exists: call it and merge result
5. Close page
6. Add discovered links to queue (same hostname, not visited)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed spa-detector.ts History API type errors**
- **Found during:** Task 2 TypeScript compilation
- **Issue:** Pre-existing spa-detector.ts file (from later plan 02-02) had type errors in pushState/replaceState interceptors — TypeScript's `.call()` method couldn't properly spread arguments for History API methods
- **Fix:** Changed from `.call(history, data, unused, url)` to `.apply(history, arguments as any)` to properly forward all arguments
- **Files modified:** src/discovery/spa-detector.ts
- **Commit:** bd86b9a
- **Why blocking:** `npx tsc --noEmit` failed, preventing verification of plan 02-01 completion

**2. [Rule 1 - Bug] Fixed extractLinks type error**
- **Found during:** Initial TypeScript compilation
- **Issue:** `page.$$eval('a[href]')` returns HTMLElement[], but code assumed `.href` property without type assertion
- **Fix:** Cast to HTMLAnchorElement within $$eval callback
- **Files modified:** src/discovery/crawler.ts (inline fix)
- **Commit:** be52b7d (included in task 2 commit)

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| crawler-architecture | Build on BrowserManager, not Crawlee | playwright-extra conflicts with Crawlee's lifecycle; need full browser control for stealth |
| pageprocessor-callback | Inject per-page logic via callback | Separates URL management from per-page processing; makes pipeline modular |
| additionalurls-seeding | Accept additionalUrls for SPA routes | SPA detector finds routes via History API, needs to inject them into crawl |

## Verification Results

- [x] `npx tsc --noEmit` passes with zero errors
- [x] `src/types/discovery.ts` exports all 13 types
- [x] `src/discovery/crawler.ts` exports SiteCrawler class
- [x] SiteCrawler uses BrowserManager (not raw Playwright)
- [x] pageProcessor callback supported in CrawlerOptions
- [x] additionalUrls seeding supported
- [x] URL normalization implemented (fragments, trailing slashes, query params)
- [x] Concurrency limited to maxConcurrency (default 3)
- [x] `npm run build` compiles successfully
- [x] `import('./dist/discovery/index.js')` exports SiteCrawler

## Task Commits

| Task | Commit | Files | Description |
|------|--------|-------|-------------|
| 1 | 3d672a9 | src/types/discovery.ts | Phase 2 type definitions (13 types) |
| 2 | be52b7d | src/discovery/crawler.ts, src/discovery/index.ts | Recursive web crawler with pageProcessor callback |
| Fix | bd86b9a | src/discovery/spa-detector.ts | Fixed blocking History API type errors |

## Next Phase Readiness

**Ready for:** Plan 02-02 (SPA Detection & Route Interception)

**Unblocked work:**
- SPA detector can now use `additionalUrls` to inject discovered routes into SiteCrawler
- Element mapper can use `pageProcessor` callback to inject per-page element discovery
- Link validator can use `pageProcessor` callback to validate links per page
- Discovery pipeline can orchestrate all modules via callbacks

**No blockers identified.**

## Notes

- **Pre-existing files:** Found spa-detector.ts and element-mapper.ts in src/discovery/ from plan 02-02 (already committed as 574ef59). These files were out of order but didn't affect plan 02-01 except for the type error fix.
- **Duration calculation:** Start 16:51:15 UTC, End 16:57:39 UTC = 6 minutes 24 seconds
- **Pattern established:** The pageProcessor callback + additionalUrls pattern creates a clean separation between crawling (this plan) and per-page analysis (later plans). This was the right architectural choice.
