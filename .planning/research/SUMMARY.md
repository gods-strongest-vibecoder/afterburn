# Project Research Summary

**Project:** Afterburn - Automated Web Testing CLI Tool
**Domain:** AI-powered web testing, developer tools, hackathon MVP
**Researched:** 2026-02-07
**Confidence:** HIGH

## Executive Summary

Afterburn is a free, open-source CLI tool that automatically tests vibe-coded websites by crawling pages, simulating workflows, finding bugs, and generating dual reports (plain English for developers, structured Markdown for AI coding tools). The 7-day hackathon constraint demands proven, stable technologies over bleeding-edge experimentation. The research reveals a perfect market gap: 75% of developers report AI-generated code quality issues, yet existing testing tools are either expensive enterprise solutions (mabl at $50k+/year) or free but complex frameworks requiring manual test scripting (Cypress, Playwright).

The recommended approach uses **TypeScript + Node.js** for the runtime, **Playwright** for cross-browser automation (proven superior to Puppeteer for navigation-heavy workflows), **Gemini 2.5 Flash** as the primary vision LLM (33x cheaper than GPT-4o while maintaining quality), and a **modular pipeline architecture** with event-driven communication. The dual-report format (HTML for humans + Markdown for AI tools) is genuinely novel—zero competitors generate AI-optimized reports, creating a closed loop where AI generates code → Afterburn tests → AI fixes issues.

Key risks center on **anti-bot detection** (tool fails on 60%+ of real websites without stealth measures), **LLM token cost explosion** (uncontrolled screenshot analysis can cost $10+ per scan), and **AI hallucinations** (15-79% hallucination rates require verification passes). These are all solvable with strategic mitigations: playwright-extra stealth plugin from Day 1, selective screenshot capture with compression, and Playwright-based verification of LLM-identified elements. The hackathon timeline is tight but achievable with ruthless scope management—core automation and reporting in Days 1-5, polish and demo prep Days 6-7.

## Key Findings

### Recommended Stack

The stack prioritizes hackathon speed, production quality, and minimal operating costs. **TypeScript** (5.7+) is the clear choice over JavaScript for a tool designed for ongoing community use—type safety prevents bugs during rapid development, and GitHub adoption hit 80% in 2025 with native compilation arriving in 2026. **Playwright** beats Puppeteer for cross-browser support (Chromium/Firefox/WebKit vs Chrome-only), built-in auto-wait reducing flakiness, and superior performance on navigation-heavy scenarios.

**Core technologies:**
- **Playwright** (latest): Browser automation, screenshots, workflow simulation — cross-browser support and auto-wait eliminate Puppeteer's limitations
- **Gemini 2.5 Flash** ($0.30/$2.50 per 1M tokens): Primary vision LLM for UI analysis — 33x cheaper than GPT-4o with 75% cost reduction via context caching
- **Commander.js** (12+): CLI framework — lightweight, zero-config, perfect for hackathon speed (migrate to Oclif post-launch for plugin system)
- **Handlebars** (4.7+): HTML report templating — balances logic-less philosophy with built-in helpers, cleaner than EJS
- **@modelcontextprotocol/server** (1.x): MCP server for Claude integration — official TypeScript SDK with stdio transport support
- **axe-core**: Accessibility auditing — 57% issue detection, zero false positives, widely adopted standard
- **Pixelmatch** (6+): Screenshot comparison — pure JavaScript, no native deps, sufficient for MVP (upgrade to odiff post-hackathon for 6x speedup on large images)

**Token optimization is critical:** Implement prompt caching (90% cost reduction), batch processing (50% discount), image compression with Sharp (resize to 1024px = 700-1,300 tokens vs full-size), and smart model routing (GPT-4o Mini for text extraction, Gemini Flash for layout analysis, Claude Sonnet only for escalation). Expected cost for testing a 50-page site: $0.15-$0.30 with Gemini Flash, dropping to $0.005 per audit with prompt caching.

### Expected Features

The 2026 web testing landscape has consolidated around AI-powered test generation (mabl, testRigor), zero-config automation (TestCafe, Rainforest QA), and comprehensive auditing (Lighthouse, axe-core). Afterburn occupies the space between "free but complex" and "zero-config but expensive."

**Must have (table stakes):**
- Cross-browser testing — Chrome/Firefox/Safari behave differently, users expect this
- Screenshot capture + console log capture — essential for debugging and visual proof
- Accessibility audits (WCAG) — legal requirement, use axe-core (57% detection, zero false positives)
- Network request monitoring — API failures, 404s, slow requests critical for diagnosis
- HTML report generation — stakeholders expect visual reports with severity ranking
- Exit code for CI/CD — must integrate with build pipelines (0=pass, 1=fail)
- Basic performance metrics — page load time, LCP, FID from Lighthouse integration

**Should have (competitive differentiators):**
- **Dual-format reports** (HTML + Markdown) — ZERO competitors do this, closes vibe-coding loop (AI reads structured MD, proposes fixes automatically)
- **AI workflow discovery** — auto-discovers signup/login/checkout flows without config (only mabl offers this at $50k+/year)
- **Plain English summaries** — non-technical stakeholders understand results, most tools generate technical-only reports
- **Zero configuration** — point at URL and run, critical for vibe coder adoption
- **CLI-first design** — integrates naturally into dev workflow, most tools are GUI-first or cloud-only
- **Error root cause analysis** — AI analyzes failures to suggest fixes (mabl/BrowserStack offer this expensively, leverage LLM APIs for low cost)
- **UI layout auditing** — detect spacing issues, alignment problems, contrast beyond accessibility-only tools

**Defer (v2+):**
- Visual regression testing — Percy/Chromatic dominate this niche with complex baseline management
- Load/performance testing — different domain (k6, JMeter), requires distributed infrastructure
- Custom test scripting — defeats zero-config philosophy, keep 80% of users in zero-config path
- Enterprise SSO/RBAC — premature for MVP, focus on solo devs/small teams first
- Self-healing tests — over-hyped, adds complexity; Afterburn doesn't maintain tests, it runs them fresh

**Key insight:** Markdown reports provide 35% better RAG accuracy and 20-30% lower token costs for AI tools vs HTML. The dual-report strategy creates a closed loop: AI generates code → Afterburn tests → AI tool reads MD report → AI automatically proposes fixes.

### Architecture Approach

Afterburn follows a **modular pipeline architecture** with event-driven communication between components, proven in similar tools (Lighthouse, Cypress, Playwright). This enables the three form factors (CLI, MCP server, GitHub Action) to share a single core engine while maintaining clean boundaries between discovery, planning, execution, analysis, and reporting phases.

**Major components:**
1. **Crawler/Discovery Engine** — finds pages, forms, buttons, interactive elements on site; produces sitemap artifact (JSON)
2. **Workflow Planner** — analyzes sitemap, decides test order, generates test scenarios using LLM batch API; produces test plan artifact
3. **Executor** — runs Playwright scripts, captures screenshots, handles errors; produces execution log artifact
4. **Diagnostic Engine** — analyzes errors, cross-references source code, suggests fixes using LLM; produces diagnostic report artifact
5. **UI Auditor** — analyzes screenshots for layout/design issues using vision LLM; produces UI audit artifact
6. **Report Generator** — creates HTML + Markdown reports from all artifacts; produces final reports
7. **Screenshot Manager** — captures, optimizes (PNG + WebP dual-format), stores, references screenshots; 25-35% size reduction
8. **Artifact Storage** — persists intermediate outputs as JSON files in temp directory, enables resume capability and debugging

**Key patterns:**
- **Event-driven pipeline** — components communicate via orchestrator events, not direct calls; enables loose coupling and streaming output
- **Artifact persistence** — each stage produces immutable JSON artifacts; enables resume from any stage, simplifies debugging
- **Continuous batching** for LLM calls — 23x higher throughput vs sequential calls; batch related prompts with shared KV cache
- **Two-layer screenshot caching** — WebP for display (25-35% smaller), PNG for vision API (lossless quality)
- **Shared core engine** — all three interfaces (CLI, MCP, GitHub Action) use identical core; thin wrappers only handle I/O format translation

**Build order dependency:** Core Engine → Artifact Storage + Event Bus → Crawler → Screenshot Manager → Workflow Planner → Executor → Diagnostic Engine + UI Auditor (parallel) → Report Generator → CLI Wrapper → MCP Server → GitHub Action. Critical path takes 26 hours across 7 days.

### Critical Pitfalls

The research identified 17 domain-specific pitfalls across critical/moderate/minor severity. Top 5 demo-killers require immediate attention:

1. **Anti-bot detection kills every run** — websites block Playwright immediately, tool fails on 60%+ of real sites. Playwright displays command flags and `navigator.webdriver` that scream "I am a bot." **Prevention:** Use playwright-extra with stealth plugin from Phase 1 Day 1, test on real deployed targets (Netlify/Vercel) early, not just localhost. Without this, tool is DOA.

2. **LLM token cost explosion** — tool costs $5-20 per URL scan without optimization. 1024×1024 screenshot = 700-1,300 tokens, testing 20 pages = 14K-26K tokens input before analysis output. **Prevention:** Selective screenshots (key pages only), image compression to 512×512 (175-442 tokens), prompt caching (90% cost reduction), tiered analysis (text-only fast mode vs full vision mode). Target: $0.15-$0.30 per 50-page site.

3. **npx cold start death** — first run takes 2-5 minutes downloading package + Playwright browsers (500MB Chromium). User's terminal shows no progress, 60%+ abandon assuming tool is broken. **Prevention:** Progress indicators using ora/cli-progress from Day 1, clear first-run messaging ("Downloading browsers: 500MB, 2-3 minutes"), Docker option for instant runs, minimal browser (headless shell only).

4. **AI hallucinated test actions** — vision LLMs hallucinate at 15-79% rates, report clicking buttons that don't exist, false positives destroy trust. When asked to identify "login button", LLM may confidently report finding one when screenshot shows only a blue rectangle. **Prevention:** Verification pass using Playwright selectors to re-check LLM-identified elements, confidence scoring (filter <70%), temperature=0 for deterministic output, provide HTML structure alongside screenshots to ground truth.

5. **SPA navigation invisibility** — tool only tests homepage, misses 90% of React/Vue app functionality. Single-page apps use client-side routing without full page reloads, traditional crawlers only see initial HTML. **Prevention:** Use `page.waitForURL()` after clicks (not `page.url()`), detect SPA frameworks (React Router, Vue Router), execute JavaScript to extract routes from router config, hybrid crawling combining link following with SPA route detection.

**Additional critical pitfalls:**
- **Cookie consent blockers** — GDPR banners cover content, tests fail with "element not clickable"; auto-dismiss common banners (Cookiebot, OneTrust) in Phase 1
- **CAPTCHA blockers** — form tests fail, can't test signup/login flows; detect CAPTCHA scripts, flag as "not tested (CAPTCHA protected)" vs reporting "form broken"
- **Inconsistent LLM output** — same URL tested twice gives different results, users lose trust; use temperature=0, structured output schemas, cache responses by URL hash for 24 hours

## Implications for Roadmap

Based on research, suggested phase structure balancing dependencies, demo timeline, and pitfall avoidance:

### Phase 1: Foundation & Core Automation (Days 1-2)
**Rationale:** Must establish reliable browser automation and artifact pipeline before any analysis. Anti-bot detection must be solved Day 1 or tool fails on real websites. Event-driven architecture prevents rewrites later.

**Delivers:** Working browser automation with stealth, basic crawling, artifact storage, screenshot capture with dual-format compression.

**Addresses features:**
- Cross-browser testing (Playwright setup)
- Screenshot capture (Screenshot Manager)
- Console log capture (Playwright CDP)

**Avoids pitfalls:**
- Anti-bot detection (playwright-extra stealth plugin)
- npx cold start death (progress indicators with ora)
- Platform fragmentation (Node.js path module, cross-platform testing)

**Stack elements:** Playwright, TypeScript, Commander.js, fs-extra, chalk/ora

**Research flag:** Standard patterns, no deep research needed. Playwright docs are comprehensive.

---

### Phase 2: Discovery & Planning (Days 3-4)
**Rationale:** Crawler must run before planner can generate tests. LLM integration starts here with workflow planning (text-based, lower cost than vision). Continuous batching prevents token cost explosion.

**Delivers:** Complete site discovery with sitemap artifact, AI-powered workflow planning with test plan artifact, LLM integration with batching and caching.

**Addresses features:**
- Zero configuration (auto-discovers site structure)
- AI workflow discovery (LLM analyzes sitemap for common flows)
- Network request monitoring (HAR capture during crawl)

**Avoids pitfalls:**
- SPA navigation invisibility (waitForURL, client-side route extraction)
- Infinite scroll blindness (progressive scrolling with height tracking)
- LLM token cost explosion (batch API, prompt caching, selective analysis)
- Cookie consent blockers (auto-dismiss common banners)

**Stack elements:** Gemini 2.5 Flash API, axios (sitemap fetch), batching architecture

**Research flag:** May need phase research for SPA router detection patterns (React Router vs Vue Router vs Next.js). Otherwise well-documented.

---

### Phase 3: Execution & Testing (Days 4-5)
**Rationale:** Executor depends on test plan artifact from Phase 2. Screenshot management already built in Phase 1. Focus on reliable test execution with error handling.

**Delivers:** Complete test execution with Playwright, error capture with stack traces, execution log artifact, screenshot capture during tests.

**Addresses features:**
- Exit code for CI/CD (0=pass, 1=fail)
- Basic performance metrics (Lighthouse integration during execution)
- Accessibility audits (axe-core during page visits)

**Avoids pitfalls:**
- CAPTCHA blockers (detect and skip gracefully)
- Shadow DOM invisibility (Playwright `>>` selector piercing)
- Network timeout defaults (increase to 60s, retry logic)

**Stack elements:** Playwright execution, axe-core, Lighthouse API

**Research flag:** Standard patterns. Playwright test execution is well-documented.

---

### Phase 4: Analysis & Diagnosis (Day 5)
**Rationale:** Both Diagnostic Engine and UI Auditor depend on execution artifacts but are independent of each other—build in parallel. Vision LLM integration happens here (highest cost, so optimize heavily).

**Delivers:** Error root cause analysis with diagnostic report artifact, UI layout auditing with vision LLM, complete audit artifacts for reporting.

**Addresses features:**
- Error root cause analysis (LLM analyzes failures, suggests fixes)
- UI layout auditing (vision LLM detects spacing, alignment, contrast issues)
- Plain English summaries (LLM generates non-technical explanations)

**Avoids pitfalls:**
- AI hallucinated test actions (verification pass, confidence scoring, temperature=0)
- LLM token cost explosion (image compression to 512×512, selective vision analysis)
- Inconsistent LLM output (structured output schemas, caching)

**Stack elements:** Gemini 2.5 Flash Vision API, Claude Sonnet (escalation fallback), Sharp (image compression)

**Research flag:** May need phase research for optimal vision prompt engineering and structured output schemas.

---

### Phase 5: Reporting & Output (Day 6)
**Rationale:** All artifacts exist, reporting is straightforward template rendering. Dual-format reports (HTML + Markdown) differentiate from competitors.

**Delivers:** HTML reports with Handlebars, structured Markdown reports for AI tools, severity ranking, executive summaries.

**Addresses features:**
- HTML report generation (Handlebars + TailwindCSS CDN)
- **Dual-format reports** (CRITICAL DIFFERENTIATOR: AI-readable Markdown)
- Plain English summaries (already generated in Phase 4, rendered here)

**Avoids pitfalls:**
- Verbose report overload (executive summary, collapsible sections, severity ranking)
- Report storage explosion (WebP compression, thumbnail previews, configurable retention)

**Stack elements:** Handlebars, TailwindCSS CDN, Chart.js (optional visualizations), marked (Markdown rendering)

**Research flag:** Standard patterns. Template rendering is well-documented.

---

### Phase 6: CLI Interface & MCP Server (Day 6-7)
**Rationale:** CLI is simplest interface, tests end-to-end flow. MCP server builds on working CLI, demonstrates AI integration. GitHub Action is optional if time permits.

**Delivers:** CLI wrapper with Commander.js, MCP server wrapper with stdio transport, optional GitHub Action wrapper.

**Addresses features:**
- CLI-first design (natural developer workflow integration)
- MCP server (Claude Desktop integration)
- GitHub Action (optional CI/CD integration)

**Avoids pitfalls:**
- Platform fragmentation (test on Windows + Mac)
- Demo-driven technical debt (flagged TODOs, graceful degradation)

**Stack elements:** Commander.js, @modelcontextprotocol/server, @actions/core (optional)

**Research flag:** Standard patterns. CLI and MCP SDK are well-documented.

---

### Phase 7: Demo Prep & Polish (Day 7)
**Rationale:** Full day buffer for demo preparation, fallback creation, and bug fixes. Live demos depend on external services (LLM APIs, internet)—need offline fallbacks.

**Delivers:** Pre-recorded demo video, cached example reports, stable test targets, offline mode, doctor command for pre-run checks.

**Addresses features:**
- Demo reliability (video fallback, cached reports)
- User experience polish (error messages, help text)

**Avoids pitfalls:**
- Live demo dependency failure (recorded video, local fallback, stable test targets)
- Scope creep in 7 days (feature freeze Day 5, ruthless cuts)

**Research flag:** No research needed. Demo prep and testing.

---

### Phase Ordering Rationale

- **Dependencies drive order:** Can't plan tests without discovery (Phases 1→2), can't execute without plans (Phases 2→3), can't diagnose without execution logs (Phases 3→4), can't report without all artifacts (Phases 4→5).
- **Parallel opportunities:** Diagnostic Engine + UI Auditor in Phase 4 (both depend on execution but not each other), MCP + GitHub Action in Phase 6 (both wrap core).
- **Risk mitigation early:** Anti-bot detection solved Phase 1 Day 1 (tool unusable without), token cost controls Phase 2 (budget preservation), hallucination prevention Phase 4 (trust essential).
- **Progressive LLM complexity:** Text analysis in Phase 2 (planning, cheaper), vision analysis in Phase 4 (UI auditing, expensive but optimized by then).
- **Interfaces last:** Core engine must work before wrapping in CLI/MCP/GitHub Action (Phases 1-5), then thin wrappers (Phase 6).

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 2 (Discovery):** SPA router library detection patterns—React Router vs Vue Router vs Next.js have different APIs for route extraction. Need targeted research on `window.__REACT_ROUTER__` vs `this.$router.options.routes` patterns.
- **Phase 4 (Analysis):** Vision LLM prompt engineering for UI auditing—optimal structured output schemas (JSON vs TypeScript interfaces), confidence scoring thresholds, consistency validation techniques. Sparse documentation on vision-specific prompt optimization.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Foundation):** Playwright automation is comprehensively documented with official guides, BrowserStack resources, GitHub examples.
- **Phase 3 (Execution):** Test execution patterns proven in Cypress/Playwright docs, axe-core integration straightforward.
- **Phase 5 (Reporting):** Handlebars templating and HTML generation are well-established patterns.
- **Phase 6 (Interfaces):** Commander.js and MCP SDK have excellent official documentation with TypeScript examples.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All core technologies verified via official docs (Playwright, Gemini API, MCP SDK) and pricing pages (Gemini $0.30/$2.50, GPT-4o Mini $0.15/$0.60). TypeScript adoption stats from GitHub, performance benchmarks from BrowserStack. |
| Features | HIGH | Cross-referenced 5+ sources (mabl, Rainforest QA, Cypress docs, Playwright guides). Dual-report format confirmed unique via WebSearch. Vibe coding statistics verified (75% report AI code quality issues from 2026 sources). |
| Architecture | HIGH | Event-driven patterns proven in Lighthouse, Cypress, Playwright. Continuous batching documented by NVIDIA, MLOps community. Screenshot management best practices from Alibaba, BrowserStack. MCP patterns from official IBM, Anthropic docs. |
| Pitfalls | HIGH | Anti-bot detection documented by ScrapeOps, BrightData. Hallucination rates from NYT research, AWS blogs. SPA navigation issues from Playwright official docs, developer blogs. Token costs calculated from official pricing pages. |

**Overall confidence:** HIGH

The research is grounded in official documentation (Playwright, Anthropic, Google AI), verified pricing pages, performance benchmarks from reputable sources (BrowserStack, NVIDIA), and 2026-specific statistics on vibe coding and AI hallucinations. All four research files cross-reference multiple sources per claim.

### Gaps to Address

**During planning/execution:**

1. **SPA router diversity:** Research identified React Router, Vue Router, Next.js router patterns but didn't detail exact detection mechanisms. **Handle by:** Phase 2 planning includes targeted research on `window.__NEXT_DATA__` vs `window.__REACT_ROUTER__` detection, with fallback to generic JavaScript router extraction if framework unknown.

2. **Vision LLM prompt templates:** General token optimization strategies documented (compression, batching, caching) but specific vision prompts for UI auditing not detailed. **Handle by:** Phase 4 planning includes experimentation with structured output schemas, baseline prompt templates from Anthropic/Google docs, A/B testing during development.

3. **Hackathon venue constraints:** Unknown internet quality, demo environment OS, projector setup. **Handle by:** Phase 7 includes pre-recording demo video (offline fallback), testing on Windows + Mac (cross-platform), Docker image preparation (consistent environment), phone hotspot backup (WiFi failure).

4. **Email verification in signup flows:** Research flagged as open question for post-hackathon (temp email services, partner integrations). **Handle by:** Defer to v2, flag signup flows requiring email verification as "not fully testable" in MVP reports.

5. **Optimal screenshot resolution trade-off:** Research suggests 512×512 to 1024×1024 for token efficiency (175 to 1,300 tokens) but doesn't specify quality impact on vision LLM accuracy. **Handle by:** Phase 4 includes empirical testing at 512, 768, 1024 resolutions, measure accuracy vs cost trade-off on sample sites.

## Sources

### Primary (HIGH confidence)
- **Official documentation:** Playwright (https://playwright.dev/), MCP TypeScript SDK (https://github.com/modelcontextprotocol/typescript-sdk), TypeScript official site, Gemini API pricing, OpenAI API pricing, Claude API pricing
- **Performance benchmarks:** BrowserStack Playwright vs Puppeteer comparison, Pixelmatch vs odiff benchmarks (Vizzly), Playwright vs Selenium architecture reviews
- **2026 statistics:** GitHub TypeScript adoption (80%, Aug 2025), vibe coding statistics (75% report AI quality issues, 63% spend more time debugging), AI hallucination rates (15-79% across models, NYT research)

### Secondary (MEDIUM confidence)
- **Testing platform reviews:** mabl AI-powered testing (TheCTOClub), Rainforest QA features (G2), 12 AI test automation tools (TestGuild), best automation testing tools 2026 (Virtuoso QA)
- **Architecture patterns:** Event-driven architecture (Microsoft Azure, Confluent, Solace), LLM continuous batching (NVIDIA, MLOps blogs), CLI architecture (Confluent blog, clig.dev)
- **Token optimization:** LLM cost estimation guides (Medium, ByteIota, CloudIDR), smart caching strategies (Redis blog, Medium articles)

### Tertiary (LOW confidence)
- **Hackathon-specific advice:** MVP hackathon playbooks (Corporate Hackathon), scope creep avoidance (StartHawk), technical debt strategies (Monday.com, SalesforceBen predictions)
- **Template engine comparisons:** JavaScript templating pros/cons (Medium CodeChronicle), Handlebars vs EJS discussions (ecosystem consensus, versions not individually verified)

---
*Research completed: 2026-02-07*
*Ready for roadmap: yes*
