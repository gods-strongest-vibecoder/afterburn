# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-07)

**Core value:** Any vibe coder can run one command and instantly know what's broken on their site, why it matters, and exactly what to fix — no test-writing, no config, no expertise needed.

**Current focus:** Phase 6 - Interfaces & Integration

## Current Position

Phase: 6 of 7 (Interfaces & Integration)
Plan: 2 of 3 complete
Status: In progress
Last activity: 2026-02-08 — Completed 06-03-PLAN.md (GitHub Action)

Progress: [██████████░] 96% (22/23 total plans complete across all phases)

## Performance Metrics

**Velocity:**
- Total plans completed: 22
- Average duration: 4.7 minutes
- Total execution time: 1.7 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 - Foundation | 4/4 | 49 min | 12.3 min |
| 2 - Discovery | 5/5 | 21 min | 4.2 min |
| 3 - Execution | 4/4 | 15 min | 3.8 min |
| 4 - Analysis | 3/3 | 17 min | 5.7 min |
| 5 - Reporting | 4/4 | 13 min | 3.3 min |
| 6 - Interfaces | 2/3 | 12 min | 6.0 min |

**Recent Trend:**
- Last 5 plans: 05-02 (5m), 05-03 (2m), 05-04 (3m), 06-01 (5m), 06-03 (7m)
- Trend: Excellent velocity maintained (2-7 min/plan)

*Updated after plan 06-03 completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- **Phase structure:** 7 phases following pipeline dependency (Foundation → Discovery → Execution → Analysis → Reporting → Interfaces → Demo)
- **Hackathon timeline:** 7 days (Feb 7-14), demo-ready by Feb 14
- **Anti-bot priority:** Stealth mode must work from Phase 1 Day 1 or tool fails on real websites
- **Dual reports:** HTML for humans + Markdown for AI tools (competitive differentiator)
- **Token efficiency:** Heuristics for discovery, LLM only for workflow planning and UI analysis
- **ESM modules:** Using ESM with NodeNext resolution (modern standard, required for playwright-extra) — 01-01
- **Dual-format screenshots:** PNG for LLM analysis + WebP for display (accuracy vs size) — 01-01
- **commander.js CLI:** Standard Node.js CLI framework instead of custom arg parsing — 01-01
- **puppeteer-extra-plugin-stealth:** Correct stealth plugin (not playwright-extra-plugin-stealth which is deprecated stub) — 01-02
- **Module-level plugin guard:** Prevents duplicate StealthPlugin registration across multiple browser launches — 01-02
- **NetworkIdle timeout:** 5-second timeout prevents indefinite hangs on SPAs that never reach idle — 01-02
- **Cookie dismissal order:** OneTrust → Cookiebot → CookieYes → Generic patterns (prioritized by prevalence) — 01-02
- **WebP compression:** quality 80, effort 4, smartSubsample true (balances size vs speed) — 01-03
- **Content-hash deduplication:** SHA-256 first 12 chars prevents redundant screenshot saves — 01-03
- **Artifact cleanup:** 7-day default retention for JSON artifacts (configurable) — 01-03
- **ora for progress indicators:** Prevents user abandonment during long first-run browser download (150-280MB) — 01-04
- **Cross-platform playwright cache detection:** Handles Windows LocalAppData and Unix .cache paths — 01-04
- **Defer Commander.js to Phase 6:** Simple process.argv[2] parsing sufficient for Phase 1 integration testing — 01-04
- **Session artifacts include screenshot refs:** Enables downstream phases to locate screenshots without re-discovery — 01-04
- **Meta-framework detection priority:** Next.js before React, Nuxt before Vue prevents false positives — 02-02
- **30-second route interception timeout:** Hard limit prevents infinite loops on dynamic content sites — 02-02
- **Navigation element filtering:** Skip "delete", "submit", "cancel", "logout" text to avoid destructive actions during route discovery — 02-02
- **Label association fallback chain:** aria-label → label[for=id] → ancestor::label ensures complete form field metadata — 02-02
- **Hidden element reset strategy:** Toggle trigger → Escape key → page reload fallback for reliable state reset — 02-02
- **Crawler architecture:** Build on BrowserManager instead of Crawlee to avoid playwright-extra conflicts — 02-01
- **pageProcessor callback pattern:** Inject per-page processing via callback to separate URL management from element discovery — 02-01
- **additionalUrls seeding:** Accept additionalUrls in crawl() for SPA route injection from History API interception — 02-01
- **page.request.get() for link validation:** Maintains session context (cookies, auth) vs standalone HTTP client — 02-03
- **External link skipping:** Don't check external links to avoid rate-limiting third-party sites — 02-03
- **Batched link checking:** Max 5 concurrent HTTP checks prevents overwhelming target servers — 02-03
- **Placeholder sitemap nodes:** Create intermediate nodes for uncrawled parent paths (ensures complete tree) — 02-03
- **Gemini 2.5 Flash for workflow planning:** Fast response times (< 2s), native structured JSON output, cost-effective — 02-04
- **40K char sitemap summarization:** Prevents token overflow on large sites (50+ pages), prioritizes workflow-relevant content — 02-04
- **Confidence-based step filtering:** Steps < 0.3 filtered (hallucinated), workflows with steps < 0.7 flagged for review — 02-04
- **Page importance scoring:** Forms 10x, buttons 2x, menus 3x, links 0.5x (ensures workflow-critical pages included) — 02-04
- **SPA detection before crawl:** Run SPA detector on separate page, feed routes to crawler as additionalUrls (prevents race conditions) — 02-05
- **pageProcessor for element discovery:** Per-page element discovery inside crawler callback keeps page open for screenshots + link validation — 02-05
- **Graceful degradation for AI:** Skip workflow planning if GEMINI_API_KEY not set (tool still performs full discovery) — 02-05
- **Console error filtering:** Capture console.error() only, not warnings or logs — reduces noise while catching actual errors — 03-01
- **Network failure scope:** Track 4xx and 5xx HTTP responses via response listener — covers broken links, missing pages, permission issues, and server bugs — 03-01
- **Fixed test data:** Nested structure (personal, address, account, payment, dates) with const assertion for type safety — 03-01
- **Field value mapping:** Name-based inference with type fallback handles 20+ patterns — 03-01
- **Error listener cleanup:** setupErrorListeners returns cleanup function to prevent memory leaks — 03-01
- **Step timeout strategy:** 10-second timeout for step actions, 30 seconds for navigation (balances speed vs slow sites) — 03-03
- **3-way dead button detection:** URL + DOM + network comparison catches all no-op button types — 03-03
- **1-second post-action wait:** Allows async effects to manifest before state comparison — 03-03
- **Non-blocking modal dismissal:** Best-effort approach (native dialogs + DOM close buttons + Escape key) prevents false positives — 03-03
- **Form filling skip strategy:** Unrecognized custom controls skipped with reason instead of failing — 03-03
- **Continue on step failure:** Workflows execute all steps even if some fail to capture maximum evidence — 03-04
- **Key page auditing:** Audit first navigation + final URL only (balances coverage vs speed) — 03-04
- **Credential injection heuristic:** Detect login workflows by name/description, inject --email/--password into matching fields — 03-04
- **Exit code for CI/CD:** 0 if all pass, 1 if any failures or issues detected — 03-04
- **Form detection trigger:** Detect broken forms when fill step followed by submit click — 03-04
- **DiagnosedError.originalError field:** Preserves raw error message for source code mapping in Plan 04-03 — 04-01
- **Pattern-matching fallback diagnosis:** Error analyzer works without GEMINI_API_KEY using pattern matching for common errors — 04-01
- **Plain English diagnoses:** All diagnosis fields target non-technical vibe coders (no jargon) — 04-01
- **Multimodal GeminiClient:** generateStructuredWithImage reads PNG files for vision LLM analysis — 04-01
- **10-second AST analysis timeout:** Prevents ts-morph from hanging on large codebases — 04-02
- **Screenshot extraction from artifact:** UI auditor extracts screenshots internally from ExecutionArtifact.workflowResults — 04-03
- **Vision LLM targeting vibe coders:** UI audit prompts use plain English, no CSS jargon — 04-03
- **Analysis phase integration:** Runs after execution, before exit with graceful degradation — 04-03
- **--source flag for AST mapping:** Enables ts-morph source code pinpointing when provided — 04-03
- **Health score weighting:** Workflows 40%, errors 30%, accessibility 20%, performance 10% balances user flow impact with technical quality — 05-01
- **Veto logic for failed workflows:** Any failed workflow caps overall score at maximum 50 ensures critical issues visible — 05-01
- **Three-tier priority system:** High = workflow-blocking, medium = errors/confusing, low = minor issues with plain English impacts — 05-01
- **Screenshot optimization for HTML reports:** Max 768px width resize with WebP quality 80, reduce to 60 if >100KB prevents base64 bloat in HTML reports — 05-02
- **ESM path resolution with fallback:** Template paths use dual fallback (dist/ and src/) to work in both compiled and dev environments — 05-02
- **Graceful screenshot degradation:** Missing screenshots return undefined instead of throwing, preventing report generation failures — 05-02
- **Triple-brace CSS injection:** {{{inlineCSS}}} prevents Handlebars HTML-escaping, enabling proper inline style injection — 05-02
- **YAML frontmatter for Markdown reports:** 13 metadata fields (session_id, health_score, total_issues, ai_powered, source_analysis) enable programmatic parsing by AI tools — 05-03
- **Reproduction steps with full context:** Include ALL steps (passed + failed) in failed workflows so AI tools can see where workflow failed and what succeeded before it — 05-03
- **AI-parseability requirements:** Consistent H1/H2/H3 hierarchy, labeled tables, language-hinted code blocks, explicit text labels (no emoji-only markers) — 05-03
- **Edge case fallback messages:** Every helper function returns meaningful message for empty input (e.g., "No source code references available. Run with --source ./path") — 05-03
- **Barrel export pattern:** Clean imports from module namespaces (reports/index.ts exports all report modules), matches established pattern used in discovery/, execution/, analysis/ — 05-04
- **Graceful report degradation:** Report generation wrapped in try/catch, failures log warnings but preserve execution exit code (reflects test results, not report generation status) — 05-04
- **Core engine extraction:** runAfterburn() function encapsulates full pipeline, reusable by all interfaces (CLI, MCP, GitHub Action) without code duplication — 06-01
- **onProgress callback pattern:** Stage-based progress reporting ('browser', 'discovery', 'execution', 'analysis', 'reporting', 'complete') enables interface-specific handling (ora spinners for CLI, structured logs for MCP/Action) — 06-01
- **Report output directory change:** Changed from .afterburn/reports/ to ./afterburn-reports/{timestamp}/ for better UX (users expect reports in working directory, not hidden folder) — 06-01
- **Commander.js CLI implementation:** Proper flag parsing with help text, replaces manual process.argv parsing — 06-01
- **AfterBurnResult return pattern:** Engine returns all data needed by interfaces (health score, prioritized issues, report paths, exit code) without calling process.exit() — 06-01
- **Separate action/tsconfig.json:** action/ has own tsconfig with outDir: '.', rootDir: '.' so index.ts compiles to index.js in same directory (GitHub Actions expects index.js at action root) — 06-03
- **Actions toolkit as devDependencies:** @actions/* packages installed as devDependencies (only used in CI, keeps production dependencies lean) — 06-03
- **Import from dist/ in action:** action/index.ts imports from '../dist/core/index.js' because action/ is NOT under src/ rootDir — 06-03
- **Top 5 issues in PR comment:** PR comment shows top 5 prioritized issues in table (scannable in 5 seconds, full details in artifacts) — 06-03
- **fail-on threshold logic:** Four levels (high/medium/low/never) for tunable workflow failures — different teams have different quality bars — 06-03
- **Auto-default github-token:** github-token input defaults to ${{ github.token }} for zero-config PR comment posting — 06-03

### Pending Todos

None yet.

### Blockers/Concerns

**Phase 1 Critical:**
- ✅ Anti-bot detection solved — playwright-extra stealth plugin with 17-module evasion working (01-02)
- ✅ Cookie consent handled — auto-dismissal covers OneTrust, Cookiebot, CookieYes, Generic patterns (01-02)
- ✅ Browser lifecycle managed — clean launch/navigate/close API with auto-cookie-dismissal (01-02)
- ✅ Screenshot infrastructure complete — dual-format capture with deduplication ready (01-03)
- ✅ Artifact persistence complete — JSON storage enables pipeline debugging and resume (01-03)
- ✅ First-run browser download progress — ora spinners with size estimate prevent user abandonment (01-04)
- ✅ End-to-end pipeline integration — all Phase 1 modules wired together and verified (01-04)

**Phase 1 COMPLETE** — All 5 ROADMAP success criteria met

**Phase 2 COMPLETE** — All 5 ROADMAP success criteria met
- ✅ 02-01 complete — Discovery types and crawler engine with URL queue
- ✅ 02-02 complete — SPA detection (6 frameworks) and element mapper with hidden element discovery
- ✅ 02-03 complete — Broken link validator and hierarchical sitemap builder
- ✅ 02-04 complete — Gemini AI client and workflow plan generator with token-efficient summarization
- ✅ 02-05 complete — Discovery pipeline integration and CLI wiring

**Phase 3 COMPLETE** — All 4 ROADMAP success criteria met
- ✅ 03-01 complete — Execution types, test data constants, and error detection infrastructure
- ✅ 03-02 complete — Accessibility auditing and performance monitoring
- ✅ 03-03 complete — Step action handlers with form filling, dead button detection, and evidence capture
- ✅ 03-04 complete — Workflow executor orchestration and main pipeline integration with exit codes

**Phase 4 COMPLETE** — All 3 plans complete, all ROADMAP success criteria met
- ✅ 04-01 complete — Diagnosis schemas and error analyzer with LLM diagnosis and pattern-matching fallback
- ✅ 04-02 complete — Source code mapper with ts-morph AST analysis
- ✅ 04-03 complete — Vision UI auditor and analysis pipeline integration
- ✅ Full pipeline: discovery → execution → analysis with artifact output
- ✅ AI-powered error diagnosis with plain English suggestions
- ✅ Vision LLM screenshot analysis for UI/UX issues
- ✅ Source code pinpointing via --source flag

**Phase 5 COMPLETE** — All 4 plans complete, all ROADMAP success criteria met
- ✅ 05-01 complete — Health scorer and priority ranker with weighted scoring and veto logic
- ✅ 05-02 complete (Wave 2) — HTML report generator with Handlebars templates, inline CSS, base64 screenshots
- ✅ 05-03 complete (Wave 2) — Markdown report generator with YAML frontmatter and AI-optimized structure
- ✅ 05-04 complete — CLI report integration with barrel exports and pipeline wiring
- ✅ Full pipeline: discovery → execution → analysis → reporting → exit
- ✅ Both HTML and Markdown reports generated and saved after analysis
- ✅ Report file paths printed to terminal
- ✅ Graceful degradation: report failures don't crash pipeline
- HTML reports are self-contained single files with inline CSS and base64-embedded screenshots (no CDN dependencies)
- Screenshot optimization: max 768px width, WebP quality 80/60, graceful degradation on errors
- Template path resolution works in both dist/ (compiled) and src/ (dev) environments
- Markdown reports have YAML frontmatter with 13 metadata fields for machine parsing
- Prioritized issue table with columns: #, Priority, Category, Summary, Location
- Technical details section includes original error messages and source code references (file:line + context)
- Reproduction steps show all workflow steps (passed + failed) for full context
- AI-parseability ensured: consistent H1/H2/H3 hierarchy, labeled tables, language-hinted code blocks
- Edge case handling with fallback messages for empty data (no errors, no workflows, no source)

**Phase 6 IN PROGRESS** — 2/3 plans complete
- ✅ 06-01 complete — Core engine extraction and Commander.js CLI
  - Core engine extracted into reusable runAfterburn() function
  - Commander.js CLI with all required flags (--source, --email, --password, --output-dir, --flows, --max-pages)
  - Stage-based progress callback with ora spinners
  - Entry point reduced from 270 lines to 3 lines
  - Reports default to ./afterburn-reports/{timestamp}/
- ✅ 06-03 complete — GitHub Action with PR comments and artifacts
  - GitHub Action metadata (action.yml) with 6 inputs and 3 outputs
  - Action entry point calls runAfterburn() and posts PR comments
  - PR comment shows health score + top 5 issues (scannable in 5 seconds)
  - Artifacts uploaded with 7-day retention
  - fail-on threshold logic (high/medium/low/never) for tunable workflow failures
  - Auto-default github-token for zero-config PR comments

**Timeline Risk:**
- 7-day hackathon deadline is aggressive for 34 requirements
- Must ruthlessly prioritize core features over nice-to-haves
- Demo prep (Phase 7) is non-negotiable — feature freeze after Phase 6

## Session Continuity

Last session: 2026-02-08 — Completed 06-03-PLAN.md (GitHub Action)
Stopped at: Phase 6 Plan 2 of 3 complete (22/23 total plans)
Resume file: None

**Next action:** Execute Phase 6 Plan 2 (MCP Server) to complete Phase 6
