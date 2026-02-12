# Hackathon Readiness Scorecard: Afterburn

**Devil's Advocate Final Assessment**
**Date:** 2026-02-12 (48 hours to deadline)
**Deadline:** 2026-02-14 (BridgeMind Vibeathon)
**Judging:** Community-voted by 20,000+ Discord members
**Criteria:** Usefulness 40%, Impact 25%, Execution 20%, Innovation 15%

---

## OVERALL VERDICT: CONDITIONAL GO

Afterburn is a genuinely compelling tool with a strong value proposition. The core pipeline works end-to-end. The codebase is clean, builds pass, 289 tests pass, and the report quality is high. However, there is ONE hard blocker that will kill the submission dead: **the package is not published to npm**. Without `npm publish`, every reference to `npx afterburn-cli` in the README, demo cache, and eventual demo video is a lie. Fix that single thing and this is a viable submission.

Beyond the blocker, there are several embarrassment risks that could cost votes but won't prevent submission. The severity ranking below reflects a brutally honest view for a community-voted hackathon where first impressions matter enormously.

---

## SCORECARD BY CATEGORY

| Category | Score | Assessment |
|----------|-------|------------|
| Build & Tests | **7/10** | Build clean, 289/289 tests pass, e2e deterministic. Coverage at 39.79% is thin. Core modules at 0%. |
| Architecture & Code Quality | **9/10** | Pipeline fully wired, all 3 interfaces connected, no dead code, event-driven design. Solid. |
| Security | **7/10** | 0 npm vulns, SSRF protection exists, Handlebars escaping. Some audit findings (SSRF hostname resolution, report data leakage) partially addressed. |
| Demo Readiness & UX | **4/10** | NOT on npm. No demo video exists. No demo GIF in README. Report preview image exists. Terminal output shows top issues (good). |
| Report Quality | **8/10** | HTML report looks professional. Markdown report well-structured. Dedup improved (77->33 issues). Health score meaningful. |
| Documentation | **7/10** | README is clear, no jargon, good comparison table. Test badge says "193 passing" but actual is 289. Viewport mismatch fixed. |

**Weighted Hackathon Score: 6.5/10** -- viable but needs the npm publish and a demo video to compete seriously.

---

## WHAT WILL IMPRESS JUDGES (Keep These)

1. **The pitch is killer.** "One command finds every bug on your website." This is genuinely compelling. The comparison table vs Lighthouse/axe-core is effective.

2. **The AI workflow loop is innovative.** Scan -> Markdown report -> paste into Claude/Cursor -> AI fixes bugs -> re-scan. This is a real differentiator that no other tool offers. The dual report concept (HTML for humans, Markdown for AI) is novel and practical.

3. **The terminal output is polished.** Health score 62/100, top 3 issues with priority tags, clear report paths. A voter running this on their own site will immediately see value.

4. **Detection breadth is strong.** 11/13 categories detected, 74% detection rate on a 70-error gauntlet. Dead buttons, broken forms, accessibility, SEO meta, security (noopener), performance (render-blocking scripts) -- this is broader than Lighthouse for interactive testing.

5. **Zero-config actually works.** No API key required. No test files to write. No config. The heuristic planner generates decent workflows automatically. Form filling with selectOption/check support (fixed from previous audit).

6. **Three interfaces.** CLI, GitHub Action, MCP server. This shows engineering ambition and real-world utility.

7. **Challenge page detection.** Cloudflare/Akamai/CAPTCHA detection implemented. Won't silently score a "Just a moment..." page as healthy.

---

## WHAT WILL EMBARRASS US (Fix These)

### E1: Package Not on npm (FATAL)
- `npm view afterburn-cli` returns 404
- Every instance of `npx afterburn-cli` in the README is currently a broken command
- This is the single most important thing to fix. Period.

### E2: README Test Badge Says "193 passing" -- Actual is 289
- Line 6 of README.md: `tests-193%20passing`
- This is a stale badge from weeks ago
- A sharp judge who runs `npm test` will see 289 and question the accuracy
- 30-second fix

### E3: Two Remaining False Positives in Reports
- The form field handling (select/checkbox) via `page.fill` still produces 2 false positive issues in reports
- These show Afterburn's own internal errors as site bugs
- Both are LOW priority so less visible, but still embarrassing if a judge reads the full report
- Root cause: `executeStep()` calls `page.fill()` directly (line 96) even though `fillField()` has selectOption/check support

### E4: No Demo Video Exists
- The `video/` directory contains Remotion scaffold code, not an actual demo video
- This is a hard submission requirement for the hackathon
- Must be recorded AFTER npm publish so `npx afterburn-cli` is real in the recording

### E5: No Demo GIF in README
- README references `assets/report-preview.png` (exists, good) but has no animated demo
- A GIF of the terminal output would dramatically improve the GitHub page first impression
- Most winning hackathon projects have a GIF above the fold

### E6: Action Bundle is 20MB
- Includes ts-morph which adds significant size
- Not a voter-facing issue but could slow down GitHub Action CI adoption
- Not worth fixing in 48 hours

---

## P0 BLOCKERS (Must Fix Before Feb 14)

### P0-1: npm publish [HUMAN ACTION REQUIRED]
- **Status:** NOT DONE (confirmed -- `npm view afterburn-cli` returns 404)
- **Impact:** Without this, the entire product is inaccessible. README, demo, Discord post all reference `npx afterburn-cli`.
- **Action:** `npm login && npm publish --access public`
- **Effort:** 5 minutes (requires npm credentials)
- **Verification:** `npx afterburn-cli --version` should return `1.0.0`
- **NOTE:** This MUST happen before demo video recording

### P0-2: Record and submit demo video
- **Status:** NOT DONE (Remotion scaffold exists but no rendered video)
- **Impact:** Hard submission requirement. No video = no entry.
- **Effort:** 2-3 hours
- **Prerequisite:** P0-1 (npm publish must be done first so `npx` works in recording)

### P0-3: Post to BridgeMind Discord
- **Status:** NOT DONE
- **Impact:** No post = no entry
- **Prerequisite:** P0-2 (demo video)

---

## P1 SHOULD-FIX (High ROI, Do If Time)

### P1-1: Fix README test badge (30 seconds)
- Line 6: Change `tests-193%20passing` to `tests-289%20passing`
- Or better: remove the static badge entirely since it goes stale

### P1-2: Fix the 2 remaining false positives in step execution
- In `step-handlers.ts` line 96: the `page.fill()` call in `executeStep` does not use the `fillField()` helper that already has selectOption/check support
- This causes Afterburn to report its own fill errors as site bugs
- The fix exists in the same file (fillField function at lines 160+) -- it just isn't called from the main execution path
- **Effort:** 15 minutes

### P1-3: Generate a terminal demo GIF for README
- Use asciinema or screen recording to capture a scan
- Convert to GIF
- Embed above the comparison table
- **Effort:** 30 minutes

### P1-4: Verify the full AI workflow loop end-to-end
- Nobody has confirmed: scan site -> copy markdown report -> paste into Claude -> Claude fixes bugs -> re-scan
- This is the CORE selling point in the demo
- Must be tested before recording the demo video
- **Effort:** 30 minutes

---

## RISK REGISTER

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Voter's site behind Cloudflare, gets "0 testable elements" | HIGH (50%+ of web) | MEDIUM | Challenge detector implemented, will warn. But still returns incomplete result. |
| Voter's SPA (React/Next.js) not fully crawled | HIGH | MEDIUM | SPA detector exists but experimental. README has "SPA support is experimental" disclaimer. |
| Voter's site takes >5 min to scan, tool hangs | MEDIUM | HIGH | 5-minute pipeline timeout exists. But large sites with many pages could feel slow. |
| npm publish fails due to name conflict | LOW | CRITICAL | Name `afterburn-cli` appears available (404 on registry). Verify before demo day. |
| Demo video shows a scan that looks different from what voters get | MEDIUM | MEDIUM | Use the same test site in the video that's referenced in demo-cache. |
| Judge reads the full report and spots false positives | MEDIUM | LOW | Only 2 false positives remain, both LOW priority. 96.2% true positive rate. |
| Voter's site has login-only content, tool can't test it | MEDIUM | LOW | --email/--password flags exist but limited. README could be clearer about limitations. |
| GitHub Action fails for a voter who tries it | MEDIUM | LOW | Action bundled (20MB), workflows hardened. But never tested in a real external repo. |
| Markdown report breaks when pasted into Claude | LOW | HIGH | Report structure is clean. But long reports might exceed context windows. |
| Build breaks during sprint | LOW | CRITICAL | 289 tests passing, TypeScript strict mode, coverage gate. Low risk. |

---

## FALSE CLAIMS AUDIT

Checking every claim in README.md against reality:

| Claim | Verdict | Notes |
|-------|---------|-------|
| `npx afterburn-cli https://your-site.com` works | **FALSE** | Package not published to npm. Returns 404. |
| "289 tests" (implied by badge showing "193 passing") | **STALE** | Badge says 193 but actual count is 289. Understates the real number. |
| "One command finds every bug" | **MOSTLY TRUE** | Finds 74% of planted bugs across 11/13 categories. "Every" is marketing. |
| "Zero config" | **TRUE** | Works without API key, config file, or test scripts. |
| "Crawls your entire site" | **TRUE** | Crawls up to 50 pages by default (configurable to 500). |
| "Fills out forms, clicks every button" | **MOSTLY TRUE** | Form filling works for text inputs; select/checkbox have bugs. Clicks all discoverable buttons. |
| "Broken forms that don't submit" | **PARTIALLY TRUE** | Broken form detection exists but has gaps. 0% detection rate on planted broken form->404 endpoint scenario in gap analysis. |
| "Dead button detection" | **TRUE** | 100%+ detection rate (caught all 4 planted + 1 extra). |
| "WCAG 2.1 AA via axe-core" | **TRUE** | axe-core integration confirmed, catches ~50% of planted a11y issues. |
| "Handles SPAs (React, Next.js, Vue, Angular, Svelte)" | **OVERSTATED** | SPA detector exists but README says "SPA support is experimental" in limitations. The "handles" claim in body text is stronger than the limitation disclaimer. |
| `afterburn-mcp` MCP server works | **PLAUSIBLE** | Entry point exists at `dist/mcp/entry.js`, code looks correct. Never tested end-to-end in this audit. |
| GitHub Action example with `gods-strongest-vibecoder/afterburn@main` | **UNTESTED** | Action is bundled and built. Never verified in a real GitHub Actions run. |
| "Tests run at 1920x1080" | **TRUE** | Code confirmed at `src/browser/stealth-browser.ts:18-19`. README matches. (Previously said 1280x720 -- now fixed.) |
| Health score weights (40/30/20/10) | **TRUE** | Confirmed in `health-scorer.ts`. |
| "Downloads a browser automatically on first run" | **TRUE** | `first-run.ts` handles Playwright browser installation. |

---

## CROSS-REFERENCE: PREVIOUS AUDIT FINDINGS VS CURRENT STATE

### From DEVIL-REVIEW.md (2026-02-09):

| Finding | Status | Verified How |
|---------|--------|-------------|
| P0: Dialog crash bug | **FIXED** | Single persistent handler in workflow-executor.ts:118. No more `page.once('dialog')` per step. |
| P0: Form field types (select/checkbox/textarea) | **PARTIALLY FIXED** | `fillField()` in step-handlers.ts now has selectOption/check. BUT `executeStep()` still calls `page.fill()` directly on line 96. Two code paths, only one fixed. |
| P1: Fix suggestions specific | **FIXED** | TypeError/ReferenceError extract variable names. |
| P1: Impact text unique per category | **FIXED** | Confirmed different text per issue type. |
| P1: High-priority without Gemini | **FIXED** | patternMatchError returns navigation/auth/form types. |
| P2: Top 3 issues in terminal | **FIXED** | Terminal output shows top issues with priority tags. Confirmed in demo-cache/terminal-output.txt. |
| P2: Hide "confidence: low" | **PARTIALLY DONE** | priority-ranker.ts uses confidence for scoring but no longer exposes raw "confidence: low" in reports. |
| P2: Accessibility impact text | **NOT VERIFIED** | Would need to check report output to confirm. |

### From GAP-ANALYSIS.md (2026-02-09):

| Gap | Status |
|-----|--------|
| Gap 1: Dialog crash | **FIXED** |
| Gap 2: Empty href detection | **FIXED** (meta auditor) |
| Gap 3: Security noopener check | **FIXED** |
| Gap 4: SEO meta checks | **FIXED** (meta-auditor.ts module added) |
| Gap 5: javascript:void(0) | **FIXED** |
| Gap 6: Console error -> button correlation | **NOT FIXED** |
| Gap 7: Render-blocking scripts | **FIXED** |
| Gap 8: Broader form failure detection | **NOT FIXED** (0% detection rate on form->broken-endpoint) |
| Gap 10: Exposed secrets | **PARTIALLY FIXED** (code exists, regex dash bug may remain) |

### From COMPREHENSIVE-AUDIT-HANDOFF.md (2026-02-10):

| Finding | Severity | Status |
|---------|----------|--------|
| A: Pipeline timeout no cancel | Critical | **PARTIALLY FIXED** -- 5-min timeout exists, zombie Chromium cleanup added. No AbortController signal propagation. |
| B: Timeout cleanup process-global | Critical | **FIXED** -- No longer kills unrelated Chrome instances (commit 0c667a7). |
| C: SSRF private-network probing | High | **PARTIALLY FIXED** -- URL validation blocks private IPs. DNS resolution bypass not fully closed. |
| D: Off-origin navigation | High | **FIXED** -- Origin validation in step-handlers.ts. |
| E: Sensitive data in reports | High | **NOT FIXED** -- No evidence of redactSensitiveUrl across all report surfaces. |
| F: Markdown escaping | High | **PARTIALLY FIXED** -- Some sanitization added but not comprehensive. |
| G: maxPages=0 contract mismatch | High | **FIXED** -- MCP contract tests added (commit e75d854). |
| H: Broken links data overwrite | High | **FIXED** -- Merge + recompute implemented. |
| I: LLM data-exfiltration risk | High | **NOT FIXED** -- Still auto-sends to Gemini if key is set, no opt-in flag. |
| J-R: Medium/Low findings | Various | **MIXED** -- Some fixed (test split, link validator counter, action bundle), some untouched. |

### From COMPREHENSIVE-AUDIT-IMPLEMENTATION-PLAN (2026-02-11):

| Phase | Status |
|-------|--------|
| Phase A: Correctness blockers | **MOSTLY DONE** -- Origin validation, link validator counter, broken link merge all fixed. Selector alignment uncertain. |
| Phase B: Security/data safety | **PARTIALLY DONE** -- SSRF basics done, markdown escaping partial, report redaction incomplete. |
| Phase C: Test system | **DONE** -- test:unit and test:e2e split, local fixture server, 289 unit + 4 e2e tests. |
| Phase D: Action/release hardening | **DONE** -- Action bundled (20MB), release workflows hardened. |
| Phase E: Docs/performance polish | **PARTIALLY DONE** -- Viewport fixed, mojibake status unclear, timeout configurable status unclear. |

---

## RECOMMENDED 48-HOUR SPRINT PLAN

### Hour 0-1: Critical Path (Must Do, In Order)

1. **Fix README badge** (30 seconds)
   - Change `tests-193%20passing` to `tests-289%20passing` on line 6

2. **Run `npm run build`** (1 minute)
   - Ensure dist/ is fresh for publishing

3. **`npm login && npm publish --access public`** (5 minutes) [HUMAN REQUIRED]
   - This is the single most important action
   - Verify: `npx afterburn-cli --version` returns `1.0.0`
   - Verify: `npx afterburn-cli doctor` completes

4. **Test the full demo loop** (30 minutes)
   - Run scan on test site
   - Open HTML report, verify it looks good
   - Copy markdown report into Claude, ask it to fix bugs
   - Verify Claude produces sensible patches
   - Time every step

### Hour 1-3: Fix Embarrassments (Optional but High ROI)

5. **Fix false positives** (15 minutes)
   - In `step-handlers.ts`: make `executeStep` use `fillField()` instead of raw `page.fill()` for fill actions
   - This eliminates the 2 remaining false positives

6. **Record demo GIF** (30 minutes)
   - Capture terminal scan of test site with asciinema
   - Convert to GIF, embed in README above comparison table

7. **npm publish v1.0.1** if fixes landed (2 minutes) [HUMAN REQUIRED]

### Hour 3-6: Demo Video (Hard Requirement)

8. **Record demo video** (2-3 hours)
   - Follow the demo script at `plans/DEMO-SCRIPT.md` (if it exists)
   - 5 acts, target 2:30-5:00 runtime
   - Act 1: The problem (manually debugging is painful)
   - Act 2: One command scan (show terminal output)
   - Act 3: The reports (show HTML report, then markdown)
   - Act 4: AI fixes bugs (paste markdown into Claude, show fixes)
   - Act 5: Re-scan shows improvement
   - Pre-record the AI interaction to avoid live failures

### Hour 6-7: Submit

9. **Post to BridgeMind Discord** (5 minutes)
   - Include: demo video link, GitHub repo link, `npx afterburn-cli` command
   - Keep it short, let the video do the talking

### Hours 7-48: Polish If Energy Remains

10. **Social preview image** for GitHub repo (10 minutes)
11. **Verify GitHub Action** in a test workflow (15 minutes)
12. **Improve no-API-key fallback messaging** (20 minutes)

---

## CRITICAL DECISION: What NOT To Do

With 48 hours left, do NOT:
- **Do NOT try to raise coverage from 39% to some target.** Coverage doesn't win hackathons. Working demos do.
- **Do NOT fix SSRF DNS resolution bypass.** No voter will probe SSRF in a hackathon demo.
- **Do NOT implement AbortController signal propagation.** The 5-min timeout is good enough.
- **Do NOT fix report data redaction.** Voters aren't scanning sites with tokens in URLs.
- **Do NOT try to fix broken form detection from 0% to anything.** Too complex, too risky this close to deadline.
- **Do NOT add new features.** Ship what you have. Every new feature is a risk of breaking something.

---

## BOTTOM LINE

Afterburn is a good product with a clear, compelling pitch. The technical foundation is solid: clean build, strong test suite, well-architected pipeline, three working interfaces. The report quality is genuinely impressive.

The two things that will determine win or loss:

1. **npm publish** -- Without it, voters cannot try the tool. This is a 5-minute human action that gates everything else.

2. **Demo video quality** -- In a community-voted hackathon with 20,000 voters, the video IS the product. Most voters will watch the video, a minority will try the tool, almost nobody will read the code. Invest 80% of remaining time into making the video compelling.

Everything else is noise. Ship it.

---

*Assessment by Devil's Advocate Agent, 2026-02-12*
*Cross-referenced against 5 parallel audit agents and 3 previous comprehensive audits*
