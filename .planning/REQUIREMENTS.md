# Requirements: Afterburn

**Defined:** 2026-02-07
**Core Value:** Any vibe coder can run one command and instantly know what's broken on their site, why it matters, and exactly what to fix — no test-writing, no config, no expertise needed.

## v1 Requirements

Requirements for hackathon submission (Feb 14, 2026). Each maps to roadmap phases.

### Discovery & Crawling

- [x] **DISC-01**: User can point tool at any URL and it crawls all reachable pages
- [x] **DISC-02**: Tool discovers all forms, buttons, links, and navigation menus on each page
- [x] **DISC-03**: Tool maps full site structure as a page tree
- [x] **DISC-04**: Tool handles SPA routing (React, Vue, Next.js client-side navigation)
- [x] **DISC-05**: Tool bypasses common anti-bot detection (stealth mode)
- [x] **DISC-06**: Tool auto-dismisses cookie consent banners

### Workflow Simulation

- [x] **WKFL-01**: AI auto-discovers user workflows from page structure (signup, onboarding, dashboard)
- [x] **WKFL-02**: User can provide optional flow hints via `--flows "signup, checkout"` flag
- [x] **WKFL-03**: Tool fills forms with realistic generated data (names, emails, addresses)
- [x] **WKFL-04**: Tool clicks buttons, follows navigations, handles redirects
- [x] **WKFL-05**: User can test authenticated flows via `--email` and `--password` flags
- [x] **WKFL-06**: Tool captures screenshots on workflow errors for evidence collection

### Functional Testing

- [x] **TEST-01**: Tool detects HTTP errors (500, 404, 403) with context
- [x] **TEST-02**: Tool detects broken forms (submit with no effect — no request, no navigation, no DOM change)
- [x] **TEST-03**: Tool captures JavaScript console errors per page
- [x] **TEST-04**: Tool detects dead buttons (click handlers producing no effect)
- [x] **TEST-05**: Tool detects broken images and missing assets
- [x] **TEST-06**: Tool detects broken links (internal and external 404s)

### Error Diagnosis

- [x] **DIAG-01**: Tool analyzes browser evidence for each error (HTTP response, console output, network requests, DOM state)
- [x] **DIAG-02**: AI infers likely root cause from browser evidence
- [x] **DIAG-03**: Tool accepts `--source ./path` flag for deeper source code diagnosis
- [x] **DIAG-04**: Tool pinpoints likely file and line when source code is provided

### UI Audit & Accessibility

- [x] **UIAX-01**: AI analyzes screenshots for layout issues (cramped elements, overlapping content)
- [x] **UIAX-02**: AI detects poor contrast and readability problems
- [x] **UIAX-03**: AI detects formatting issues (text cut off, misaligned elements)
- [x] **UIAX-04**: AI provides UI improvement suggestions in plain English
- [x] **UIAX-05**: Tool runs WCAG accessibility audit via axe-core on every page
- [x] **UIAX-06**: Tool reports basic performance metrics (load time, LCP) per page

### Reporting

- [x] **RPRT-01**: Tool generates beautiful standalone HTML report (human report)
- [x] **RPRT-02**: Human report uses plain English — zero jargon, zero raw error codes
- [x] **RPRT-03**: Human report includes embedded screenshots for every issue
- [x] **RPRT-04**: Human report has a prioritized to-do list (what to fix first and why)
- [x] **RPRT-05**: Human report shows overall health score (X/Y checks passed)
- [x] **RPRT-06**: Tool generates structured Markdown report (AI report)
- [x] **RPRT-07**: AI report includes technical error details, reproduction steps, suggested fixes
- [x] **RPRT-08**: AI report references source code files/lines when `--source` was provided

### CLI Interface

- [x] **CLI-01**: Tool runs via `npx afterburn <url>` with zero install
- [x] **CLI-02**: Terminal shows live real-time progress during crawl/test
- [x] **CLI-03**: Tool shows progress indicators during first-run browser download
- [x] **CLI-04**: Exit code 0 = all clear, non-zero = issues found

### MCP Server

- [x] **MCP-01**: Tool exposes scan functionality as MCP tool for AI coding assistants
- [x] **MCP-02**: MCP returns structured results that AI tools can act on

### GitHub Action

- [x] **CICD-01**: Reusable GitHub Action that runs Afterburn on deploy
- [x] **CICD-02**: Posts report as PR comment or workflow artifact

## v2 Requirements

Deferred to post-hackathon. Tracked but not in current roadmap.

### Mobile & Responsive
- **MOBILE-01**: Test at mobile viewport (375px) in addition to desktop
- **MOBILE-02**: Flag responsive layout issues between viewport sizes

### Visual Regression
- **VISREG-01**: Compare screenshots between runs for visual changes
- **VISREG-02**: Smart tolerance for acceptable pixel differences

### Multi-Provider AI
- **AIPROV-01**: Support GPT-4o, Kimi K2.5, Claude as alternative AI providers
- **AIPROV-02**: User selects provider via config or `--model` flag

### History & Trends
- **HIST-01**: Store results from previous runs
- **HIST-02**: Show trends over time (improving/degrading)

### Advanced Execution
- **EXEC-01**: Parallel page execution for faster scans
- **EXEC-02**: Custom test scripting for edge cases

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Load/performance testing | Different domain (k6, JMeter); not a vibe coder pain point |
| Self-healing tests | Over-hyped; Afterburn runs fresh each time, no tests to maintain |
| Record/replay UI | Defeats zero-config philosophy; AI discovery is the modern approach |
| Enterprise SSO/RBAC | Premature; focus on individual vibe coders and small teams |
| Cloud dashboard / hosted service | CLI tool only; keeps it free and open source |
| Auto-fixing bugs | Afterburn diagnoses and reports; the AI coding tool fixes |
| Cross-device cloud testing | Requires device farms (BrowserStack); expensive infrastructure |
| Manual test case management | Vibe coders won't write test cases; let AI discover them |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DISC-01 | Phase 2 | Complete |
| DISC-02 | Phase 2 | Complete |
| DISC-03 | Phase 2 | Complete |
| DISC-04 | Phase 2 | Complete |
| DISC-05 | Phase 1 | Complete |
| DISC-06 | Phase 1 | Complete |
| WKFL-01 | Phase 2 | Complete |
| WKFL-02 | Phase 2 | Complete |
| WKFL-03 | Phase 3 | Complete |
| WKFL-04 | Phase 3 | Complete |
| WKFL-05 | Phase 3 | Complete |
| WKFL-06 | Phase 3 | Complete |
| TEST-01 | Phase 3 | Complete |
| TEST-02 | Phase 3 | Complete |
| TEST-03 | Phase 3 | Complete |
| TEST-04 | Phase 3 | Complete |
| TEST-05 | Phase 3 | Complete |
| TEST-06 | Phase 2 | Complete |
| DIAG-01 | Phase 4 | Complete |
| DIAG-02 | Phase 4 | Complete |
| DIAG-03 | Phase 4 | Complete |
| DIAG-04 | Phase 4 | Complete |
| UIAX-01 | Phase 4 | Complete |
| UIAX-02 | Phase 4 | Complete |
| UIAX-03 | Phase 4 | Complete |
| UIAX-04 | Phase 4 | Complete |
| UIAX-05 | Phase 3 | Complete |
| UIAX-06 | Phase 3 | Complete |
| RPRT-01 | Phase 5 | Complete |
| RPRT-02 | Phase 5 | Complete |
| RPRT-03 | Phase 5 | Complete |
| RPRT-04 | Phase 5 | Complete |
| RPRT-05 | Phase 5 | Complete |
| RPRT-06 | Phase 5 | Complete |
| RPRT-07 | Phase 5 | Complete |
| RPRT-08 | Phase 5 | Complete |
| CLI-01 | Phase 6 | Complete |
| CLI-02 | Phase 6 | Complete |
| CLI-03 | Phase 1 | Complete |
| CLI-04 | Phase 3 | Complete |
| MCP-01 | Phase 6 | Complete |
| MCP-02 | Phase 6 | Complete |
| CICD-01 | Phase 6 | Complete |
| CICD-02 | Phase 6 | Complete |

**Coverage:**
- v1 requirements: 34 total
- Mapped to phases: 34 (100% coverage)
- Complete: 34 (100%)
- Pending: 0 (0%)

---
*Requirements defined: 2026-02-07*
*Last updated: 2026-02-09 — all 34 requirements marked complete, traceability fully synced*
