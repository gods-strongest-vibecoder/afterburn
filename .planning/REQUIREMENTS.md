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
- [ ] **WKFL-03**: Tool fills forms with realistic generated data (names, emails, addresses)
- [ ] **WKFL-04**: Tool clicks buttons, follows navigations, handles redirects
- [ ] **WKFL-05**: User can test authenticated flows via `--email` and `--password` flags
- [ ] **WKFL-06**: Tool screenshots every page visited during workflows

### Functional Testing

- [ ] **TEST-01**: Tool detects HTTP errors (500, 404, 403) with context
- [ ] **TEST-02**: Tool detects broken forms (submit with no effect — no request, no navigation, no DOM change)
- [ ] **TEST-03**: Tool captures JavaScript console errors per page
- [ ] **TEST-04**: Tool detects dead buttons (click handlers producing no effect)
- [ ] **TEST-05**: Tool detects broken images and missing assets
- [x] **TEST-06**: Tool detects broken links (internal and external 404s)

### Error Diagnosis

- [ ] **DIAG-01**: Tool analyzes browser evidence for each error (HTTP response, console output, network requests, DOM state)
- [ ] **DIAG-02**: AI infers likely root cause from browser evidence
- [ ] **DIAG-03**: Tool accepts `--source ./path` flag for deeper source code diagnosis
- [ ] **DIAG-04**: Tool pinpoints likely file and line when source code is provided

### UI Audit & Accessibility

- [ ] **UIAX-01**: AI analyzes screenshots for layout issues (cramped elements, overlapping content)
- [ ] **UIAX-02**: AI detects poor contrast and readability problems
- [ ] **UIAX-03**: AI detects formatting issues (text cut off, misaligned elements)
- [ ] **UIAX-04**: AI provides UI improvement suggestions in plain English
- [ ] **UIAX-05**: Tool runs WCAG accessibility audit via axe-core on every page
- [ ] **UIAX-06**: Tool reports basic performance metrics (load time, LCP) per page

### Reporting

- [ ] **RPRT-01**: Tool generates beautiful standalone HTML report (human report)
- [ ] **RPRT-02**: Human report uses plain English — zero jargon, zero raw error codes
- [ ] **RPRT-03**: Human report includes embedded screenshots for every issue
- [ ] **RPRT-04**: Human report has a prioritized to-do list (what to fix first and why)
- [ ] **RPRT-05**: Human report shows overall health score (X/Y checks passed)
- [ ] **RPRT-06**: Tool generates structured Markdown report (AI report)
- [ ] **RPRT-07**: AI report includes technical error details, reproduction steps, suggested fixes
- [ ] **RPRT-08**: AI report references source code files/lines when `--source` was provided

### CLI Interface

- [ ] **CLI-01**: Tool runs via `npx afterburn <url>` with zero install
- [ ] **CLI-02**: Terminal shows live real-time progress during crawl/test
- [x] **CLI-03**: Tool shows progress indicators during first-run browser download
- [ ] **CLI-04**: Exit code 0 = all clear, non-zero = issues found

### MCP Server

- [ ] **MCP-01**: Tool exposes scan functionality as MCP tool for AI coding assistants
- [ ] **MCP-02**: MCP returns structured results that AI tools can act on

### GitHub Action

- [ ] **CICD-01**: Reusable GitHub Action that runs Afterburn on deploy
- [ ] **CICD-02**: Posts report as PR comment or workflow artifact

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
| DISC-01 | Phase 2 | Pending |
| DISC-02 | Phase 2 | Pending |
| DISC-03 | Phase 2 | Pending |
| DISC-04 | Phase 2 | Pending |
| DISC-05 | Phase 1 | Complete |
| DISC-06 | Phase 1 | Complete |
| WKFL-01 | Phase 2 | Pending |
| WKFL-02 | Phase 2 | Pending |
| WKFL-03 | Phase 3 | Pending |
| WKFL-04 | Phase 3 | Pending |
| WKFL-05 | Phase 3 | Pending |
| WKFL-06 | Phase 3 | Pending |
| TEST-01 | Phase 3 | Pending |
| TEST-02 | Phase 3 | Pending |
| TEST-03 | Phase 3 | Pending |
| TEST-04 | Phase 3 | Pending |
| TEST-05 | Phase 3 | Pending |
| TEST-06 | Phase 2 | Pending |
| DIAG-01 | Phase 4 | Pending |
| DIAG-02 | Phase 4 | Pending |
| DIAG-03 | Phase 4 | Pending |
| DIAG-04 | Phase 4 | Pending |
| UIAX-01 | Phase 4 | Pending |
| UIAX-02 | Phase 4 | Pending |
| UIAX-03 | Phase 4 | Pending |
| UIAX-04 | Phase 4 | Pending |
| UIAX-05 | Phase 3 | Pending |
| UIAX-06 | Phase 3 | Pending |
| RPRT-01 | Phase 5 | Pending |
| RPRT-02 | Phase 5 | Pending |
| RPRT-03 | Phase 5 | Pending |
| RPRT-04 | Phase 5 | Pending |
| RPRT-05 | Phase 5 | Pending |
| RPRT-06 | Phase 5 | Pending |
| RPRT-07 | Phase 5 | Pending |
| RPRT-08 | Phase 5 | Pending |
| CLI-01 | Phase 6 | Pending |
| CLI-02 | Phase 6 | Pending |
| CLI-03 | Phase 1 | Complete |
| CLI-04 | Phase 3 | Pending |
| MCP-01 | Phase 6 | Pending |
| MCP-02 | Phase 6 | Pending |
| CICD-01 | Phase 6 | Pending |
| CICD-02 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 34 total
- Mapped to phases: 34 (100% coverage)
- Unmapped: 0

---
*Requirements defined: 2026-02-07*
*Last updated: 2026-02-07 after roadmap creation*
