# Roadmap: Afterburn

## Overview

Afterburn follows a linear pipeline from foundation to demo: establish reliable browser automation with stealth capabilities, discover site structure and workflows, execute tests with comprehensive error capture, analyze results using AI for diagnosis and UI auditing, generate dual-format reports (HTML for humans, Markdown for AI tools), wrap the core engine in three interfaces (CLI, MCP server, GitHub Action), and finish with demo preparation and polish. Each phase builds on the previous, with two parallel tracks in Phase 4 (diagnosis + UI audit) and Phase 6 (MCP + GitHub Action).

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Core Automation** - Browser automation, stealth, screenshots, artifact storage
- [ ] **Phase 2: Discovery & Planning** - Site crawling, workflow detection, LLM integration
- [ ] **Phase 3: Execution & Testing** - Test runner, error capture, functional checks
- [ ] **Phase 4: Analysis & Diagnosis** - AI error diagnosis, UI auditing, root cause analysis
- [ ] **Phase 5: Reporting & Output** - Dual-format reports, prioritization, visualization
- [ ] **Phase 6: Interfaces & Integration** - CLI wrapper, MCP server, GitHub Action
- [ ] **Phase 7: Demo Prep & Polish** - Video recording, offline mode, stability hardening

## Phase Details

### Phase 1: Foundation & Core Automation
**Goal**: Browser automation works reliably on real websites with stealth capabilities, screenshots are captured efficiently, and artifact pipeline is established for downstream phases.

**Depends on**: Nothing (first phase)

**Requirements**: DISC-05 (stealth mode), DISC-06 (cookie dismissal), CLI-03 (first-run progress)

**Success Criteria** (what must be TRUE):
  1. Tool can launch headless Chromium without triggering anti-bot detection on common sites (Vercel, Netlify deployments)
  2. Tool captures screenshots in dual format (PNG for vision API, WebP for display) with 25-35% size reduction
  3. First-run browser download shows progress indicator and completes without user confusion
  4. Cookie consent banners are automatically dismissed without manual intervention
  5. Artifact storage system persists intermediate outputs as JSON files for debugging and resume capability

**Plans**: 4 plans

Plans:
- [x] 01-01-PLAN.md -- Project setup, dependencies, and shared type definitions
- [x] 01-02-PLAN.md -- Stealth browser automation and cookie banner dismissal
- [x] 01-03-PLAN.md -- Dual-format screenshot capture and artifact storage
- [x] 01-04-PLAN.md -- CLI progress indicators and end-to-end integration

### Phase 2: Discovery & Planning
**Goal**: Tool discovers complete site structure including SPA routes, maps all interactive elements, and AI generates realistic workflow test plans without manual configuration.

**Depends on**: Phase 1

**Requirements**: DISC-01 (crawl pages), DISC-02 (discover elements), DISC-03 (site structure map), DISC-04 (SPA routing), WKFL-01 (auto-discover workflows), WKFL-02 (flow hints), TEST-06 (detect broken links)

**Success Criteria** (what must be TRUE):
  1. User can point tool at any URL and it discovers all reachable pages including client-side routes (React Router, Next.js)
  2. Tool maps every form, button, link, and navigation menu into a structured sitemap artifact
  3. AI analyzes sitemap and automatically identifies common workflows (signup, login, onboarding) without user hints
  4. User can optionally provide workflow hints via `--flows` flag to guide discovery
  5. Tool detects broken internal and external links (404s) during crawl

**Plans**: 5 plans

Plans:
- [ ] 02-01-PLAN.md -- Discovery types and recursive web crawler engine
- [ ] 02-02-PLAN.md -- SPA framework detection and interactive element mapper
- [ ] 02-03-PLAN.md -- Broken link validator and hierarchical sitemap builder
- [ ] 02-04-PLAN.md -- Gemini AI client and workflow plan generator
- [ ] 02-05-PLAN.md -- Discovery pipeline integration and CLI wiring

### Phase 3: Execution & Testing
**Goal**: Tool executes workflow test plans, fills forms with realistic data, captures errors and performance metrics, and produces comprehensive execution logs for analysis.

**Depends on**: Phase 2

**Requirements**: WKFL-03 (form filling), WKFL-04 (click/navigate/redirect), WKFL-05 (authenticated testing), WKFL-06 (workflow screenshots), TEST-01 (HTTP errors), TEST-02 (broken forms), TEST-03 (console errors), TEST-04 (dead buttons), TEST-05 (broken images), UIAX-05 (WCAG audit), UIAX-06 (performance metrics), CLI-04 (exit codes)

**Success Criteria** (what must be TRUE):
  1. Tool fills forms with realistic generated data (names, emails, addresses) and submits successfully
  2. Tool clicks buttons, follows navigation, handles redirects without manual intervention
  3. User can test authenticated flows by providing `--email` and `--password` flags
  4. Tool captures screenshots at every step of workflow execution
  5. Tool detects HTTP errors (500, 404, 403), broken forms, console errors, dead buttons, and broken images
  6. Tool runs axe-core accessibility audit and captures performance metrics (load time, LCP) on every page
  7. Tool exits with code 0 when all checks pass, non-zero when issues are found

**Plans**: TBD (3-5 plans expected)

Plans:
- [ ] 03-01: TBD during planning
- [ ] 03-02: TBD during planning
- [ ] 03-03: TBD during planning

### Phase 4: Analysis & Diagnosis
**Goal**: AI analyzes execution logs to infer root causes of errors with source code pinpointing when available, and vision LLM audits screenshots for UI/UX issues.

**Depends on**: Phase 3

**Requirements**: DIAG-01 (analyze browser evidence), DIAG-02 (AI root cause), DIAG-03 (source code diagnosis), DIAG-04 (pinpoint file/line), UIAX-01 (layout issues), UIAX-02 (contrast/readability), UIAX-03 (formatting issues), UIAX-04 (improvement suggestions)

**Success Criteria** (what must be TRUE):
  1. AI analyzes browser evidence (HTTP response, console output, network requests, DOM state) for each error
  2. AI infers likely root cause from browser evidence and provides plain English explanation
  3. When user provides `--source ./path`, tool cross-references errors with actual source code
  4. Tool pinpoints likely file and line number when source code is provided
  5. Vision LLM analyzes screenshots and detects layout issues (cramped elements, overlapping content)
  6. Vision LLM detects poor contrast, readability problems, and formatting issues (text cut off, misaligned elements)
  7. AI provides UI improvement suggestions in plain English without jargon

**Plans**: TBD (3-5 plans expected)

Plans:
- [ ] 04-01: TBD during planning
- [ ] 04-02: TBD during planning
- [ ] 04-03: TBD during planning

### Phase 5: Reporting & Output
**Goal**: Tool generates beautiful standalone HTML report for humans and structured Markdown report for AI coding tools, both with prioritized issues and actionable recommendations.

**Depends on**: Phase 4

**Requirements**: RPRT-01 (HTML report), RPRT-02 (plain English), RPRT-03 (embedded screenshots), RPRT-04 (prioritized to-do list), RPRT-05 (health score), RPRT-06 (Markdown AI report), RPRT-07 (technical details/reproduction steps), RPRT-08 (source code references)

**Success Criteria** (what must be TRUE):
  1. Tool generates beautiful standalone HTML file that opens in any browser without dependencies
  2. Human report uses plain English language with zero jargon and zero raw error codes
  3. Screenshots are embedded directly into reports for every issue found
  4. Report includes prioritized to-do list showing what to fix first and why
  5. Report shows overall health score (X/Y checks passed)
  6. Tool generates structured Markdown report designed for LLM consumption
  7. AI report includes technical error details, reproduction steps, and suggested fix strategies
  8. AI report references source code files and line numbers when `--source` was provided

**Plans**: TBD (3-4 plans expected)

Plans:
- [ ] 05-01: TBD during planning
- [ ] 05-02: TBD during planning
- [ ] 05-03: TBD during planning

### Phase 6: Interfaces & Integration
**Goal**: Core engine is wrapped in three interfaces: zero-install CLI via npx, MCP server for AI coding assistants, and GitHub Action for CI/CD.

**Depends on**: Phase 5

**Requirements**: CLI-01 (npx zero-install), CLI-02 (live terminal progress), MCP-01 (expose as MCP tool), MCP-02 (structured MCP results), CICD-01 (GitHub Action), CICD-02 (PR comments/artifacts)

**Success Criteria** (what must be TRUE):
  1. User can run `npx afterburn <url>` with zero installation or setup
  2. Terminal shows live real-time progress during crawl and test execution
  3. MCP server exposes scan functionality that AI coding assistants can invoke programmatically
  4. MCP returns structured results that AI tools can act on directly
  5. Reusable GitHub Action runs Afterburn on deploy and posts results as PR comment or workflow artifact
  6. GitHub Action accepts configuration for URL, auth credentials (via secrets), and pass/fail thresholds

**Plans**: TBD (3-4 plans expected)

Plans:
- [ ] 06-01: TBD during planning
- [ ] 06-02: TBD during planning
- [ ] 06-03: TBD during planning

### Phase 7: Demo Prep & Polish
**Goal**: Demo is rock-solid with pre-recorded video fallback, cached example reports, offline mode, and comprehensive error handling for live presentation.

**Depends on**: Phase 6

**Requirements**: None (polish and demo prep — no new features)

**Success Criteria** (what must be TRUE):
  1. Pre-recorded demo video shows complete workflow (scan → discover bugs → feed to Claude → bugs fixed → re-scan passes)
  2. Cached example reports exist for instant demo without live API calls
  3. Stable test targets deployed (Vercel/Netlify) with known bugs for reproducible demos
  4. Offline mode works when LLM APIs are unavailable (uses heuristics and cached results)
  5. Doctor command (`npx afterburn --doctor`) runs pre-flight checks before demos
  6. All user-facing error messages are clear and actionable
  7. Help text and documentation are complete and tested

**Plans**: TBD (2-3 plans expected)

Plans:
- [ ] 07-01: TBD during planning
- [ ] 07-02: TBD during planning

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Core Automation | 4/4 | Complete | 2026-02-07 |
| 2. Discovery & Planning | 0/5 | Not started | - |
| 3. Execution & Testing | 0/TBD | Not started | - |
| 4. Analysis & Diagnosis | 0/TBD | Not started | - |
| 5. Reporting & Output | 0/TBD | Not started | - |
| 6. Interfaces & Integration | 0/TBD | Not started | - |
| 7. Demo Prep & Polish | 0/TBD | Not started | - |
