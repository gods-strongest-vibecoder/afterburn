---
phase: 02-discovery-planning
verified: 2026-02-07T19:00:00Z
status: gaps_found
score: 4/5 must-haves verified
gaps:
  - truth: "Tool discovers client-side SPA routes and seeds them into crawler queue"
    status: failed
    reason: "additionalUrls passed in crawlerOptions but crawler.crawl() expects it as parameter"
    artifacts:
      - path: "src/discovery/crawler.ts"
        issue: "crawl() method accepts additionalUrls as parameter, not from constructor options"
      - path: "src/discovery/discovery-pipeline.ts"
        issue: "Passes spaRoutes via crawlerOptions.additionalUrls but never passes to crawl()"
    missing:
      - "Either: Store additionalUrls in constructor and use in crawl() method"
      - "Or: Pass spaRoutes as second parameter to crawler.crawl(targetUrl, spaRoutes)"
---

# Phase 2: Discovery & Planning Verification Report

**Phase Goal:** Tool discovers complete site structure including SPA routes, maps all interactive elements, and AI generates realistic workflow test plans without manual configuration.

**Verified:** 2026-02-07T19:00:00Z
**Status:** gaps_found
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can point tool at any URL and it discovers all reachable pages including client-side routes | PARTIAL | Crawler exists and crawls same-hostname pages. SPA routes are discovered BUT not properly seeded into crawler due to wiring gap |
| 2 | Tool maps every form, button, link, and navigation menu into structured sitemap artifact | VERIFIED | element-mapper.ts discovers forms with full field inventory, buttons, links, menus. buildSitemap() creates hierarchical tree. All wired in discovery-pipeline.ts |
| 3 | AI analyzes sitemap and automatically identifies common workflows without user hints | VERIFIED | WorkflowPlanner.generatePlans() calls Gemini with sitemap summary. Post-processes with confidence filtering. Returns WorkflowPlan array |
| 4 | User can optionally provide workflow hints via --flows flag | VERIFIED | index.ts parses --flows from argv, splits by comma, passes as userHints to runDiscovery(). WorkflowPlanner prioritizes user hints |
| 5 | Tool detects broken internal and external links during crawl | VERIFIED | validateLinks() checks internal links via page.request.get(). Returns BrokenLink array with statusCode. External links skipped per design |

**Score:** 4/5 truths verified (1 partial due to wiring gap)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| src/types/discovery.ts | All Phase 2 type definitions | VERIFIED | 139 lines. Exports all types: PageData, InteractiveElement, FormField, LinkInfo, SitemapNode, CrawlResult, DiscoveryArtifact, WorkflowPlan, WorkflowStep, SPAFramework, BrokenLink, FormInfo |
| src/discovery/crawler.ts | Recursive web crawler with URL queue and deduplication | ORPHANED | 292 lines. SiteCrawler class with crawl() method. URL normalization, dedup via Set, concurrency via Promise.allSettled. ISSUE: additionalUrls declared in CrawlerOptions but crawl() method has it as parameter |
| src/discovery/spa-detector.ts | SPA framework detection and History API route interception | VERIFIED | 257 lines. detectSPAFramework() checks Next.js, Nuxt, React, Vue, Angular, Svelte. interceptRouteChanges() wraps history API, clicks nav elements |
| src/discovery/element-mapper.ts | Interactive element discovery per page | VERIFIED | 445 lines. discoverElements() finds forms with field inventory, buttons, links, menus. discoverHiddenElements() clicks triggers, hovers menus |
| src/discovery/link-validator.ts | Broken link detection via HTTP status checking | VERIFIED | 97 lines. validateLinks() checks internal links only via page.request.get(). Returns BrokenLink array. Concurrency limit 5 |
| src/discovery/sitemap-builder.ts | Hierarchical sitemap tree builder | VERIFIED | 185 lines. buildSitemap() constructs tree by URL path. Creates placeholder nodes. printSitemapTree() renders indented text |
| src/ai/gemini-client.ts | Gemini 2.5 Flash API client | VERIFIED | 77 lines. GeminiClient with generateStructured() using Zod schema. generateText() for plain text. Throws clear error if API key missing |
| src/planning/plan-schema.ts | Zod schemas for workflow plan structured output | VERIFIED | 33 lines. WorkflowStepSchema, WorkflowPlanSchema, WorkflowPlansResponseSchema. Matches discovery.ts types |
| src/planning/workflow-planner.ts | AI workflow plan generator from sitemap | VERIFIED | 250 lines. WorkflowPlanner.generatePlans() creates sitemap summary (token-limited 40K chars), calls Gemini, post-processes results |
| src/discovery/discovery-pipeline.ts | Orchestrates full discovery pipeline | PARTIAL | 272 lines. runDiscovery() wires all modules. ISSUE: Passes spaRoutes via crawlerOptions but crawler.crawl() not called with second parameter |
| src/index.ts | Updated entry point with Phase 2 pipeline | VERIFIED | 103 lines. Parses --flows flag. Calls runDiscovery(). Prints summary with broken links, workflows, artifact path |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| discovery-pipeline.ts | crawler.ts | SiteCrawler with pageProcessor callback | WIRED | Lines 89-175 define pageProcessor. Line 187 constructs SiteCrawler. Line 191 calls crawl() |
| discovery-pipeline.ts | element-mapper.ts | discoverElements() + discoverHiddenElements() in pageProcessor | WIRED | Lines 97, 100 call discovery functions. Merge results lines 103-144 |
| discovery-pipeline.ts | spa-detector.ts | detectSPAFramework() + interceptRouteChanges() on first page | PARTIAL | Lines 70, 77 call SPA functions. spaRoutes stored BUT passed via options not to crawl() call |
| discovery-pipeline.ts | link-validator.ts | validateLinks() inside pageProcessor | WIRED | Line 150 calls validateLinks(). Results pushed to allBrokenLinks line 151 |
| discovery-pipeline.ts | sitemap-builder.ts | buildSitemap() after crawl | WIRED | Line 202 calls buildSitemap(). Line 205 calls printSitemapTree() |
| discovery-pipeline.ts | workflow-planner.ts | WorkflowPlanner.generatePlans() with sitemap | WIRED | Lines 216-219 construct GeminiClient + WorkflowPlanner. Degrades gracefully without API key |
| discovery-pipeline.ts | artifact-storage.ts | ArtifactStorage.save() for DiscoveryArtifact | WIRED | Line 251 calls artifactStorage.save(artifact) |
| index.ts | discovery-pipeline.ts | runDiscovery() called from main | WIRED | Lines 38-44 construct options. Line 46 calls runDiscovery() |
| crawler.ts | browser-manager.ts | BrowserManager.newPage() for each URL | WIRED | Line 139 calls browserManager.newPage(url) in crawlPage() |

### Requirements Coverage

Phase 2 maps to 7 requirements:

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| DISC-01: Crawl all reachable pages | PARTIAL | SPA routes discovered but not crawled due to wiring gap |
| DISC-02: Discover all forms, buttons, links, menus | SATISFIED | element-mapper complete, wired in pipeline |
| DISC-03: Map full site structure as page tree | SATISFIED | sitemap-builder creates hierarchical tree |
| DISC-04: Handle SPA routing (React, Vue, Next.js) | PARTIAL | SPA detection works, route discovery works, but routes not seeded into crawler |
| WKFL-01: AI auto-discovers workflows from page structure | SATISFIED | WorkflowPlanner generates plans from sitemap |
| WKFL-02: User can provide flow hints via --flows | SATISFIED | index.ts parses flag, WorkflowPlanner prioritizes hints |
| TEST-06: Detect broken links (404s) | SATISFIED | validateLinks checks internal links, reports broken ones |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| src/discovery/crawler.ts | 52 | Parameter additionalUrls in method signature when it should use constructor option | Blocker | SPA routes never get crawled - defeats DISC-04 goal |
| src/discovery/discovery-pipeline.ts | 191 | Calls crawler.crawl(targetUrl) without passing spaRoutes as second parameter | Blocker | SPA routes sit unused in crawlerOptions |

### Gaps Summary

**1 critical wiring gap blocking SPA route crawling:**

The architecture has a mismatch between how additionalUrls is passed and consumed:

**What the plan specified:**
- CrawlerOptions.additionalUrls should seed extra URLs into the crawl queue
- The pipeline should pass SPA routes via this option

**What was implemented:**
- CrawlerOptions interface declares additionalUrls?: string[] (line 16)
- Constructor does NOT store it (lines 35-45)
- crawl() method signature has additionalUrls as a second parameter instead (line 52)
- Pipeline passes spaRoutes via crawlerOptions.additionalUrls (line 184)
- Pipeline calls crawler.crawl(targetUrl) WITHOUT second parameter (line 191)

**Result:** SPA routes are discovered (interceptRouteChanges works) but never crawled (additionalUrls never reaches the queue-seeding logic).

**Fix options:**
1. Store additionalUrls in constructor, use this.additionalUrls in crawl() method (remove parameter)
2. Pass spaRoutes as second parameter to crawler.crawl(targetUrl, spaRoutes) in pipeline

Either fix achieves the goal. Option 1 matches the plan spec. Option 2 matches current implementation.

**All other must-haves verified.** The core discovery pipeline is functional: it crawls, discovers elements, validates links, builds sitemap, generates workflows. The gap is specific to SPA route integration.

---

Verified: 2026-02-07T19:00:00Z
Verifier: Claude (gsd-verifier)
