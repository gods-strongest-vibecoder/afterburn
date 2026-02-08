# Phase 7: Demo Prep & Polish — Execution Plan

**Goal:** Demo is rock-solid with pre-recorded video fallback, cached example reports, and comprehensive error handling for live presentation.

**Timeline:** Feb 8-13, 2026 (submission deadline Feb 14)
**Depends on:** Phase 6 (complete)

---

## Prioritized Work Items

### Priority Framework

Based on QA findings (SCORECARD.md, DEVILS-ADVOCATE.md, REPO-READINESS.md), work is categorized:

- **P0 (BLOCKER):** Demo will fail or repo will embarrass us without this
- **P1 (CRITICAL):** Demo quality drops significantly without this
- **P2 (IMPORTANT):** Makes demo notably better, worth the time
- **P3 (NICE-TO-HAVE):** Only if time permits

---

## Wave 1: Repo Hygiene (must complete first)

### Plan 07-01: Repository Cleanup and Commit Hygiene

**Estimated effort:** 30 minutes
**Priority:** P0

All uncommitted work from Phase 6 and the security review must land on main before anything else. A judge cloning the repo must see a clean, professional codebase.

**Tasks:**

1. **Commit all security hardening changes** (P0)
   - 13 modified source files with input validation, sanitizer expansion, and safety improvements
   - Single commit: "fix(security): harden input validation, data redaction, and runtime safety"
   - Verify: `npm run build && npm test` passes after commit

2. **Add MIT LICENSE file** (P0)
   - Standard MIT license text with "2026 Afterburn" copyright
   - Verify: `ls LICENSE` exists and content is correct

3. **Commit action/index.js** (P0)
   - GitHub Action won't work without the built JS file
   - The action.yml references `index.js` directly

4. **Add .nvmrc file** (P2)
   - Content: `20`
   - Ensures reproducible Node.js version

5. **Clean up .claude/ hooks** (P2)
   - Deleted .js hooks replaced by .cjs equivalents need to be committed
   - Don't ship a messy .claude/ directory

6. **Add `repository` field to package.json** (P2)
   - `"repository": { "type": "git", "url": "https://github.com/gods-strongest-vibecoder/afterburn" }`

**Success criteria:**
- `git status` shows clean working tree on main
- `npm run build && npm test` passes
- LICENSE file exists
- action/index.js is tracked

---

## Wave 2: Output Quality Fixes (the biggest demo risks)

### Plan 07-02: Report Deduplication and Priority Fixes

**Estimated effort:** 2-3 hours
**Priority:** P1

The QA audit identified deduplication as the #1 output quality problem: 86 reported issues for ~20 unique findings (~4:1 noise ratio). A judge reading the report will see the same broken image listed multiple times. This MUST be fixed for a credible demo.

**IMPORTANT:** Test coverage analysis confirms ZERO test coverage for deduplication logic across 7 locations in the codebase (crawler URL dedup, element mapper dedup, link validator dedup, screenshot content-hash dedup, error analyzer dedup, etc). Any fix here MUST include tests or regressions will be invisible.

**Tasks:**

1. **Issue deduplication by URL + error type** (P1)
   - Location: `src/reports/priority-ranker.ts` or a new `src/reports/deduplicator.ts`
   - Logic: Before prioritization, group issues by (URL, error type). Keep the highest-priority instance, annotate with "found on N pages" or "occurred N times"
   - Target: 86 issues -> ~20 unique issues in report
   - **MUST add tests:** At minimum, test that duplicate issues are collapsed and counts are correct
   - Verify: Re-run against test-site, confirm report shows ~20 issues, not 86

2. **Elevate JavaScript TypeError/ReferenceError/SyntaxError to MEDIUM** (P1)
   - Location: `src/analysis/error-analyzer.ts` (pattern-matching fallback)
   - Current behavior: Console errors like "TypeError: Cannot read properties of undefined" fall to LOW/"unknown"
   - Fix: Add regex patterns for common JS runtime errors, classify as "javascript" type with MEDIUM priority
   - Patterns: `/TypeError:/`, `/ReferenceError:/`, `/SyntaxError:/`, `/RangeError:/`
   - Verify: Re-run against test-site, TypeError should appear as MEDIUM priority

3. **Surface original error message in no-API-key fallback** (P2)
   - Location: `src/analysis/error-analyzer.ts` and `src/reports/markdown-generator.ts`
   - Current behavior: 23 issues say "AI diagnosis unavailable" with identical descriptions
   - Fix: Include the original error message in the summary field, even without AI diagnosis
   - Example: "JavaScript error: TypeError: Cannot read properties of undefined (reading 'apiUrl')" instead of "An error occurred (AI diagnosis unavailable)"
   - Verify: Re-run without GEMINI_API_KEY, confirm original error messages visible

4. **Add page location to issues** (P2)
   - Location: `src/reports/priority-ranker.ts`
   - Current behavior: Most issues show "Location: Unknown"
   - Fix: Populate location from the workflow step's page URL (available in StepResult)
   - Verify: Re-run, confirm issues show which page they came from

**Success criteria:**
- Report shows ~20 unique issues (not 77)
- JavaScript TypeError appears as MEDIUM priority
- Original error messages visible without API key
- Issue locations populated where possible

### Plan 07-03: Demo Infrastructure and Cached Artifacts

**Estimated effort:** 1-2 hours
**Priority:** P1

Create the infrastructure for reliable demos: cached reports, a `--doctor` command, and pre-recorded fallbacks.

**Tasks:**

1. **Create demo-cache/ directory with pre-generated reports** (P1)
   - Run Afterburn against test-site AFTER dedup fixes land
   - Copy the HTML and Markdown reports to `demo-cache/`
   - These are the fallback if live scan fails during demo
   - Commit to repo (judges can see sample output without running the tool)

2. **Add `--doctor` flag for pre-flight checks** (P1)
   - Location: `src/cli/commander-cli.ts`
   - Checks:
     - Node.js version >= 18
     - Playwright browser installed (check cache dir)
     - GEMINI_API_KEY set (optional, note if missing)
     - Disk space > 100MB
     - Network connectivity (try to resolve a known host)
   - Output: Green checkmarks for each passing check, red X for failures
   - Exit code: 0 if all required checks pass, 1 otherwise
   - Verify: `npx afterburn --doctor` shows clean output

3. **Improve error messages for common failures** (P2)
   - "Browser not installed" -> "Afterburn needs to download a browser first. Run: npx playwright install chromium"
   - "GEMINI_API_KEY not set" -> "Running in basic mode. For visual analysis, set GEMINI_API_KEY. Details: [link]"
   - "Connection refused" -> "Can't reach [url]. Is the site running? Check the URL and try again."
   - Location: `src/core/engine.ts`, `src/cli/commander-cli.ts`

4. **Fix double-spinner cosmetic bug** (P2)
   - QA observed: "Generating reports..." spinner prints its success checkmark twice
   - Location: likely `src/cli/commander-cli.ts` progress callback (spinner.succeed() called twice)
   - Not a functional bug but looks unprofessional in a live demo
   - Quick fix: guard against double-succeed on the same spinner instance

5. **Investigate --output-dir timing regression** (P3)
   - QA found: default output path takes ~40s, but `--output-dir` flag causes ~4min runtime
   - Root cause unknown -- may be path resolution, fs-extra ensureDir, or coincidence
   - For demo: DO NOT use --output-dir flag. Use default path only.
   - Investigation can wait until post-hackathon unless root cause is obvious

4. **Record terminal session with asciinema or similar** (P2)
   - Record a full scan of the test site
   - This is the "break glass" fallback for the live demo
   - Save recording alongside demo-cache/

**Success criteria:**
- demo-cache/ contains working HTML and Markdown reports
- `npx afterburn --doctor` works and shows clear output
- Error messages are actionable plain English

---

## Wave 3: README and Presentation Polish

### Plan 07-04: README Polish and Demo Video

**Estimated effort:** 2-3 hours
**Priority:** P1

The README is the first thing judges see. It needs a demo GIF/screenshot, honest limitations section, and clear differentiation.

**Tasks:**

1. **Add demo screenshot or GIF to README** (P0)
   - Capture terminal output of Afterburn scanning the test site
   - Options: asciinema recording converted to GIF, or a static screenshot of the HTML report
   - Place at the TOP of the README, right after the one-liner pitch
   - Alt text: "Afterburn scanning a website and finding 20 issues in one command"

2. **Add "Known Limitations" section** (P1)
   - Honest and builds trust. Content:
     - "Visual analysis (overlapping elements, tiny text) requires GEMINI_API_KEY"
     - "First run downloads a browser (~200MB, one-time)"
     - "Best with static and server-rendered sites; SPA support is experimental"
     - "Currently tests at desktop viewport only (mobile testing coming in v2)"

3. **Add "How is this different?" comparison table** (P1)
   - Compare Afterburn vs Lighthouse, axe-core, Playwright Test Generator, mabl
   - Columns: Feature | Afterburn | Lighthouse | axe-core | mabl
   - Rows: Zero config, Workflow testing, Form filling, Dead button detection, Plain English reports, AI report for coding tools, Free/open source
   - Point: Afterburn is the ONLY tool that does the full pipeline for free

4. **Add sample report to repo** (P2)
   - Link from README: "See a [sample report](demo-cache/report.html) from scanning a real site"
   - This lets judges see the output quality without running the tool
   - Use the demo-cache/ reports from Plan 07-03

5. **Record the demo video** (P1)
   - Follow the script from 07-DEMO-SCRIPT.md exactly
   - Tools: OBS Studio or Screen Studio
   - Duration: 3-5 minutes
   - Upload to YouTube (unlisted), link from README
   - This is a hackathon REQUIREMENT (public repo + demo video)

6. **Consider version bump to 1.0.0** (P3)
   - 0.1.0 signals "not ready"
   - 1.0.0 projects confidence for a hackathon demo
   - Only do this if everything else is solid

**Success criteria:**
- README has a visual (GIF or screenshot) at the top
- "Known Limitations" section exists and is honest
- Comparison table shows clear differentiation
- Demo video is recorded, uploaded, and linked

---

## Wave 4: Stability Hardening (if time permits)

### Plan 07-05: Edge Case Hardening (P2-P3)

**Estimated effort:** 2-4 hours
**Priority:** P2

These are improvements identified by QA that make the tool more robust but aren't demo blockers.

**Tasks:**

0. **Investigate missing screenshots in HTML report** (P1 -- ELEVATED from QA finding)
   - QA E2E run confirmed: HTML report does NOT embed evidence screenshots
   - The engine has screenshot capabilities (dual-format PNG+WebP, content-hash dedup)
   - Unclear if screenshots are captured but not embedded, or not captured at all
   - Investigation: Check `src/reports/html-generator.ts` for screenshot embedding logic
   - If not embedded: add base64 embedding using existing `src/screenshots/` infrastructure
   - If not captured: check `src/execution/workflow-executor.ts` evidence capture flow
   - **NOTE:** Screenshot management has ZERO test coverage per test-writer analysis
   - Demo script Act 3 currently avoids mentioning screenshots -- fix enables adding it back

1. **Contact form detection improvement** (P2)
   - QA found: contact form detected as "dead button" not "broken form"
   - Root cause: `type="button"` on submit button bypasses broken-form detection
   - Fix: In `step-handlers.ts`, check for `type="button"` inside forms
   - This is visible in the demo report -- better to fix it

2. **axe-core label rule investigation** (P3)
   - QA found: missing `<label>` violations not flagged (defects #17, #18)
   - May be axe-core configuration (placeholder suppressing label rule)
   - Investigate and fix if simple

3. **Broken form detection fallback** (P3)
   - Current: if form fill step fails, broken-form check skipped entirely
   - Fix: Still test form submission even if fill step failed
   - This catches forms with broken submit handlers regardless of fill success

4. **npm publish** (P3)
   - Makes `npx afterburn <url>` work globally (not just from local install)
   - Run `npm publish --access public`
   - Test: `npx afterburn --version` from a fresh directory
   - Only do this if confident everything works

**Success criteria:**
- Contact form correctly categorized as "broken form" (not just "dead button")
- Form label violations appear in accessibility report (if axe-core fix is simple)

---

## Execution Schedule

### Day 1 (Feb 8-9): Wave 1 + Wave 2 start
- Commit all pending changes (30 min)
- Start deduplication work (2-3 hours)

### Day 2 (Feb 9-10): Wave 2 complete + Wave 3 start
- Complete report quality fixes
- Re-run against test-site to verify
- Start demo-cache generation

### Day 3 (Feb 10-11): Wave 3 (README + Video)
- README polish with screenshot/GIF
- Record demo video
- Upload and link

### Day 4 (Feb 11-12): Wave 4 (if time permits) + Final verification
- Edge case fixes
- Full end-to-end test run
- Final commit and push

### Day 5 (Feb 12-13): Buffer
- Final review, fix any issues found
- Ensure everything is committed to main
- Verify repo looks good from a fresh clone

### Day 6 (Feb 13-14): Submission
- Final push to GitHub
- Submit to hackathon
- Record backup video if primary has issues

---

## MUST FIX vs NICE-TO-HAVE Decision Matrix

Based on QA findings, here's what MUST be fixed for a credible demo vs what's optional:

### MUST FIX (demo fails or embarrasses without these)

| Item | Source | Effort | Why |
|------|--------|--------|-----|
| Commit security fixes to main | REPO-READINESS.md | 5 min | Judges see old code |
| Add LICENSE file | REPO-READINESS.md | 1 min | Professional credibility |
| Commit action/index.js | REPO-READINESS.md | 1 min | GitHub Action won't work |
| Issue deduplication (+ tests) | SCORECARD.md + test-writer | 2-3 hrs | 86 issues looks inflated, destroys credibility. Zero test coverage for dedup -- must add tests alongside fix. |
| Demo GIF/screenshot in README | DEVILS-ADVOCATE.md | 30 min | First impression for judges |
| Demo video (3-5 min) | Hackathon requirement | 2 hrs | Required for submission |

### SHOULD FIX (significantly improves demo quality)

| Item | Source | Effort | Why |
|------|--------|--------|-----|
| Investigate/fix missing screenshots in HTML report | QA E2E verification | 1-2 hrs | HTML report has no embedded screenshots despite engine having capture capability. Major visual gap. |
| Elevate TypeError to MEDIUM priority | SCORECARD.md | 30 min | JavaScript crashes buried in LOW is embarrassing |
| Surface error messages without API key | SCORECARD.md | 30 min | 23 identical "AI unavailable" messages is noise |
| `--doctor` pre-flight command | ROADMAP.md Phase 7 criteria | 1 hr | Confidence before live demo |
| Known Limitations in README | DEVILS-ADVOCATE.md | 15 min | Honesty builds trust |
| Comparison table in README | DEVILS-ADVOCATE.md | 30 min | Answers "why not Lighthouse?" |
| Pre-cached demo reports | Demo reliability | 15 min | Fallback if scan fails live |

### NICE-TO-HAVE (only if time permits)

| Item | Source | Effort | Why |
|------|--------|--------|-----|
| Contact form -> broken form (not dead button) | SCORECARD.md | 1 hr | Correct categorization |
| axe-core label rule fix | SCORECARD.md | 1 hr | 2 more a11y findings |
| npm publish | DEVILS-ADVOCATE.md | 15 min | Global npx works |
| Version bump to 1.0.0 | REPO-READINESS.md | 5 min | Confidence signal |
| .nvmrc file | REPO-READINESS.md | 1 min | Reproducibility |
| Page location attribution | SCORECARD.md | 1 hr | Better issue context |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Live scan crashes during demo | LOW | HIGH | Pre-cached reports in demo-cache/ |
| Network issues during demo | MEDIUM | MEDIUM | Use localhost test-site only |
| Dedup fix introduces regressions | LOW | HIGH | Run full test suite after changes |
| HTML report looks bad on projector | MEDIUM | MEDIUM | Test report at low resolution, ensure large fonts |
| Judge runs `npx afterburn` and it fails | MEDIUM | HIGH | Ensure npm publish works OR add "Quick Start from Source" section |
| Someone asks "why not use Lighthouse?" | HIGH | MEDIUM | Comparison table ready in README, three differentiators memorized |
| Scan too slow for live demo | LOW (QA confirmed ~40s) | MEDIUM | QA E2E measured 40s on warm cache. Do a warm-up run before demo. Pre-cache as emergency fallback only. |
| Report generators have zero test coverage | MEDIUM | HIGH | Dedup changes flow through untested report generators. Manual verification required after any report changes. |
| HTML report missing screenshots | CONFIRMED | MEDIUM | Avoid mentioning screenshots in demo until fix verified. Focus on text-based issue descriptions. |

---

## Phase 7 Success Criteria (from ROADMAP.md)

1. [Wave 3] Pre-recorded demo video shows complete workflow
2. [Wave 3] Cached example reports exist for instant demo
3. [N/A -- using localhost] Stable test targets deployed with known bugs
4. [Wave 2] Offline mode works when LLM APIs unavailable (heuristic mode)
5. [Wave 3] Doctor command runs pre-flight checks
6. [Wave 2] All user-facing error messages are clear and actionable
7. [Wave 3] Help text and documentation are complete and tested

---

## Dependencies Between Waves

```
Wave 1 (Repo Cleanup)
  |
  v
Wave 2 (Output Quality)  -- dedup must land before demo-cache generation
  |
  v
Wave 3 (README + Video)  -- needs fixed reports for demo recording
  |
  v
Wave 4 (Hardening)       -- independent, can run parallel with Wave 3
```

Wave 1 MUST complete first. Wave 2 MUST complete before Wave 3 (demo video needs to show deduplicated reports). Wave 4 can run alongside Wave 3.
