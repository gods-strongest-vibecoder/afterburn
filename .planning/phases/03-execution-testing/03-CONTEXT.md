# Phase 3: Execution & Testing - Context

**Gathered:** 2026-02-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Execute AI-generated workflow test plans against real websites. Fill forms with test data, click buttons, follow navigation, handle redirects, and capture errors, screenshots, and performance metrics. Produces comprehensive execution logs for Phase 4 analysis.

This phase does NOT include: AI analysis/diagnosis (Phase 4), report generation (Phase 5), or new discovery capabilities (Phase 2).

</domain>

<decisions>
## Implementation Decisions

### Form filling strategy
- Use fixed predefined test data set (test@example.com, John Doe, 555-0100, etc.) — predictable and reproducible
- Actually submit forms to test full flow (detects server-side errors, broken redirects, validation failures)
- Skip unrecognized fields (custom dropdowns, date pickers, rich text editors) and flag them in the report as "could not fill"
- For authenticated flows (--email/--password): fill login forms with provided credentials; signup handling at Claude's discretion

### Error detection scope
- Dead button = no visible change after click (no DOM change, no network request, no navigation) — strict detection
- Console errors: capture console.error() only — ignore warnings and logs to reduce noise
- Broken images: detect via HTTP load status only (404s, failed loads) — no visual placeholder detection
- HTTP errors: flag both client errors (4xx) and server errors (5xx) — catches broken links, missing pages, permission issues, and server bugs

### Workflow step behavior
- On step failure: skip the failed step, log it, continue with remaining workflow steps — maximize coverage
- Popups/modals/new tabs: auto-dismiss and continue workflow on main page
- Step timeout: 10 seconds per step (page load, element appearance, etc.) — fast, catches truly broken pages
- Accessibility audit (axe-core) and performance metrics (LCP, load time): run on key workflow pages only, not every page visited

### Evidence capture depth
- Screenshots: capture only on errors — no screenshots for successful steps
- Network logs: capture failed requests only (4xx, 5xx responses) — focused evidence for AI analyzer
- DOM snapshots: none — screenshots + console errors + network failures provide sufficient context
- Exit codes: Claude's discretion on severity threshold (what counts as pass vs fail for CI/CD)

### Claude's Discretion
- Exit code severity threshold (what error types cause non-zero exit)
- Signup form handling in authenticated flows
- Exact fixed test data values for each field type
- How to detect and dismiss popups/modals reliably

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-execution-testing*
*Context gathered: 2026-02-07*
