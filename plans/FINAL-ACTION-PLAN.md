# Final Action Plan: Afterburn Hackathon Sprint

**Created:** 2026-02-09
**Deadline:** 2026-02-14 (BridgeMind Vibeathon)
**Status:** ACTIVE

---

## Judging Criteria (from BridgeMind Vibeathon)

| Criterion | Weight | Our Strategy |
|-----------|--------|-------------|
| Usefulness | 40% | Report quality, zero-config UX, voter can try it themselves |
| Impact | 25% | Closes the AI loop: find bugs -> AI fixes -> re-scan verifies |
| Execution | 20% | 189 tests, 22 implementation plans, clean codebase |
| Innovation | 15% | Dual reports (human + AI), AI workflow discovery, MCP integration |

**Key insight:** Community-voted by 20,000+ Discord members. "Practical beats flashy." Voters who can run `npx afterburn-cli` on their own site and see real results will vote for us.

---

## Priority Levels

- **P0 (Must Do):** Without these, we lose. Hard submission requirements or deal-breakers.
- **P1 (Should Do):** Significantly improves our chances. High ROI for effort.
- **P2 (Nice to Have):** Polish items. Do if time permits after P0 and P1.

---

## P0: MUST DO (Without these we lose)

### P0-1: Verify and execute npm publish [HUMAN ACTION REQUIRED]
**Owner:** team-lead (requires npm credentials -- agents cannot do this)
**Effort:** 5 minutes
**Why:** Without this, `npx afterburn-cli` fails with `npm ERR! 404`. The entire README, demo video, and Discord post reference this command. NOTHING works without it. Devil confirmed the package is NOT currently published (npm returns 404).
**Action:**
1. Run `npm run build` to ensure dist/ is fresh
2. Run `npm login` with the project owner's npm credentials
3. Run `npm publish --access public`
4. Verify: `npx afterburn-cli --version` returns `1.0.0`
5. Verify: `npx afterburn-cli doctor` completes successfully
**BLOCKER:** This MUST happen before demo video recording (P0-2) and before voters can try the tool. It requires human credentials -- no agent can do this.

### P0-2: Record demo video (3-5 min)
**Owner:** demo-planner (script), team-lead (recording)
**Effort:** 2-3 hours (including setup, recording, re-takes)
**Why:** Hard submission requirement. No video = disqualified.
**Action:**
1. Follow script at `plans/DEMO-SCRIPT.md`
2. 5 acts, target 2:30 runtime
3. Pre-record Claude interaction (Act 4) separately -- live AI is unreliable
4. Include Lighthouse differentiation in first 30 seconds: "Lighthouse checks ONE page. Afterburn crawls your ENTIRE site."
5. Must be recorded AFTER npm publish so `npx afterburn-cli` is real
**Prerequisite:** P0-1 (npm publish), P0-4 (test full loop)

### P0-3: Post to BridgeMind Discord
**Owner:** team-lead
**Effort:** 5 minutes
**Why:** Submission channel. No post = no entry.
**Action:** Use the Discord post template from `HACKATHON-CHECKLIST.md` (Option A if GIF ready, Option B if not)
**Prerequisite:** P0-2 (demo video)

### P0-4: Test the full demo loop end-to-end
**Owner:** auditor
**Effort:** 30 minutes
**Why:** Devil's advocate challenge: nobody has verified the full workflow (scan -> report -> paste into Claude -> fix -> re-scan). If it doesn't work, the demo video is fiction.
**Action:**
1. Start test site: `cd test-site && node server.js`
2. Run scan: `npx afterburn-cli http://localhost:3847` (or `node dist/index.js`)
3. Open HTML report -- verify it looks professional
4. Copy Markdown report, paste into Claude, ask "fix these bugs"
5. Verify Claude produces useful code patches
6. Document timing (how long does each step take?)
7. Document any failures or rough edges

---

## P1: SHOULD DO (Significantly improves chances)

### P1-1: Add pipeline timeout (5-minute hard cap)
**Owner:** devil
**Effort:** 10 minutes
**Why:** Devil's finding A5. If a voter's site hangs (infinite redirects, never-loading SPA), the tool runs forever. A hang is worse than a crash -- at least a crash gives an error message. A hang gives NOTHING.
**Action:**
1. In `engine.ts`, wrap `runAfterburn()` in a `Promise.race` with a 5-minute timeout
2. On timeout, emit clear message: "Scan timed out after 5 minutes. Try with --max-pages 5 for a faster scan."
3. Clean up browser resources on timeout
4. Return exit code 1

### P1-2: Fix report deduplication
**Owner:** devil (Task #21) -- reassigned from auditor, devil has root cause diagnosis
**Effort:** 30 minutes
**Why:** Current reports show 40 issues but only ~29 are unique. Two specific bugs identified:
- Bug 1: Dead buttons reported twice (once as "Dead Button" MEDIUM, once as "Console Error" LOW). Root cause: error-analyzer fallback creates DiagnosedErrors for dead button console messages even though priority-ranker handles them directly.
- Bug 2: Broken images reported twice (once as "network 404", once as "broken image"). Root cause: both network failure collector and broken image collector fire for same resource URL.
**Action:**
1. Filter dead button console errors from error-analyzer fallback diagnosis path
2. Add URL-based dedup for network 404 + broken image entries sharing same URL
3. Target: < 25 unique issues from the test site (down from 40)

### P1-3: Fix viewport mismatch in README
**Owner:** polisher
**Effort:** 30 seconds
**Why:** Devil's finding A3. README says "1280x720" but code uses "1920x1080". A judge who checks will see the documentation is wrong.
**Action:** Update README "Known limitations" section to say "Tests run at 1920x1080" or match the actual viewport in code.

### P1-4: Update requirements traceability table
**Owner:** devil
**Effort:** 5 minutes
**Why:** Devil's finding A1. The traceability table in REQUIREMENTS.md shows 30/34 requirements as "Pending" even though the checkboxes at top are `[x]`. A judge reading this file will think we didn't finish.
**Action:** Update all completed requirements in the traceability table from "Pending" to "Complete" to match the checkbox status.

### P1-5: Add Cloudflare challenge page detection
**Owner:** devil
**Effort:** 15 minutes
**Why:** Devil's "most embarrassing demo scenario": voter's site has Cloudflare, tool parses challenge page as content, returns Health 95/100 for a page that says "Checking your browser..." The audience laughs.
**Action:**
1. After page.goto(), check for common challenge page indicators (Cloudflare "Just a moment", Akamai, hCaptcha)
2. If detected, report as "Site blocked automated testing (anti-bot protection detected)" instead of parsing the challenge HTML
3. Return a meaningful exit code / health score caveat

### P1-6: Fix blank page health score
**Owner:** devil
**Effort:** 5 minutes
**Why:** Devil's finding B3. A blank page or error page with zero workflows returns health 100 "good". This is misleading.
**Action:** In `health-scorer.ts`, if totalWorkflows is 0 AND totalPages <= 1 AND no interactive elements found, cap score at 50 and add warning "Very few interactive elements found -- score may not reflect actual quality."

### P1-7: Regenerate cached reports with correct URLs
**Owner:** demo-planner
**Effort:** 15 minutes
**Why:** Current demo-cache reports reference `flowsync.demo.dev` but test site runs on `localhost:3847`. Inconsistent URLs in the demo look unprofessional.
**Action:** Already assigned as Task #13. Run fresh scan against localhost:3847, copy reports to demo-cache/.

### P1-8: Create fixed test site for before/after demo
**Owner:** demo-planner
**Effort:** 30 minutes
**Why:** Demo story arc needs before/after: scan broken site (62/100) -> fix bugs -> re-scan (90+/100). Need a "fixed" version of FlowSync.
**Action:** Already assigned as Task #13. Create `test-site/server-fixed.js` that fixes enough defects for a dramatically higher health score.

---

## P2: NICE TO HAVE (If time permits)

### P2-1: Demo GIF for README
**Owner:** demo-planner
**Effort:** 30 minutes
**Why:** A looping GIF showing terminal scan output (command -> spinners -> health score) is powerful first-impression content. The README currently has no visual demo.
**Action:** Extract Act 2 of the demo video as a standalone GIF, or record separately with asciinema + agg.

### P2-2: Improve no-API-key fallback messaging
**Owner:** auditor
**Effort:** 20 minutes
**Why:** Without GEMINI_API_KEY, 23 issues show "AI diagnosis unavailable" with identical descriptions. These are useless and noisy.
**Action:**
1. In the heuristic error classifier, add regex patterns for `TypeError:`, `ReferenceError:`, `SyntaxError:` to classify as MEDIUM
2. Surface the original error message in the issue summary instead of "AI diagnosis unavailable"
3. Add "Set GEMINI_API_KEY for detailed analysis" as a footer note, not per-issue

### P2-3: Screenshot HTML report and embed in README
**Owner:** polisher
**Effort:** 5 minutes
**Why:** The linked `demo-cache/report.html` renders as raw HTML on GitHub. A screenshot of the health score section embedded as an image gives judges visual proof.
**Action:** Take a screenshot of the HTML report header (health score + priority breakdown), save as `assets/report-preview.png`, embed in README.

### P2-4: Social preview image for GitHub
**Owner:** polisher
**Effort:** 10 minutes
**Why:** When the GitHub link is shared on Discord, a 1280x640 social preview image makes the link stand out vs a generic preview.
**Action:** Create a simple social preview image with Afterburn logo/name and tagline. Upload via GitHub Settings > Social Preview.

### P2-5: Verify GitHub Action works
**Owner:** auditor
**Effort:** 15 minutes
**Why:** Devil's finding C3. The README shows a GitHub Action example but it's unverified. If a voter tries it and it fails, credibility is damaged.
**Action:** Create a test workflow in the repo that runs the action against the test site. Verify it posts a PR comment.

---

## Execution Order (Dependency-Aware)

**Revised 2026-02-09:** npm publish moved to Wave 2 (after all code fixes land). Rationale: publish ONCE with all fixes, not publish now and need a second publish.

### Wave 1: Code Fixes (all agents in parallel, start NOW)
| Task | Owner | Effort | Status |
|------|-------|--------|--------|
| P1-1: Pipeline timeout | devil (Task #15) | 10 min | IN PROGRESS |
| P1-4: Update requirements table | devil (Task #15) | 5 min | IN PROGRESS |
| P1-5: Cloudflare detection | devil (Task #15) | 15 min | IN PROGRESS |
| P1-6: Blank page health score | devil (Task #15) | 5 min | IN PROGRESS |
| P1-3: Fix viewport mismatch | polisher (Task #14) | 30 sec | IN PROGRESS |
| P2-3: Report screenshot | polisher (Task #14) | 5 min | IN PROGRESS |
| P1-7: Regenerate cached reports | demo-planner (Task #13) | 15 min | IN PROGRESS |
| P1-8: Fixed test site | demo-planner (Task #13) | 30 min | IN PROGRESS |
| P1-2: Investigate/fix report dedup | auditor (Task #16) | 30-60 min | ASSIGNED |

### Wave 2: Publish (after ALL code fixes land + build is clean)
| Task | Owner | Effort | Status |
|------|-------|--------|--------|
| P0-1: npm publish | team-lead [HUMAN ACTION] | 5 min | BLOCKED on Wave 1 |

### Wave 3: Validation (after npm publish)
| Task | Owner | Effort | Status |
|------|-------|--------|--------|
| P0-4: Test full demo loop | auditor (Task #16) | 30 min | BLOCKED on Wave 2 |

### Wave 4: Demo (after validation)
| Task | Owner | Effort | Status |
|------|-------|--------|--------|
| P0-2: Record demo video | demo-planner + team-lead | 2-3 hours | BLOCKED on Wave 3 |
| P0-3: Discord post | team-lead | 5 min | BLOCKED on Wave 4 video |

### Wave 5: Polish (after critical path complete)
| Task | Owner | Effort | Status |
|------|-------|--------|--------|
| P2-1: Demo GIF | demo-planner | 30 min | TODO |
| P2-2: Fallback messaging | auditor | 20 min | TODO |
| P2-4: Social preview | polisher | 10 min | TODO |
| P2-5: Verify GitHub Action | auditor | 15 min | TODO |

---

## Agent Assignments Summary

| Agent | P0 Tasks | P1 Tasks | P2 Tasks |
|-------|----------|----------|----------|
| **auditor** | test full loop (after publish) | fix dedup | fallback messaging, verify GH Action |
| **devil** | -- | pipeline timeout, requirements table, Cloudflare detection, blank page score | -- |
| **demo-planner** | demo video (script) | cached reports, fixed test site | demo GIF |
| **polisher** | -- | viewport mismatch | report screenshot, social preview |
| **team-lead** | npm publish [HUMAN], Discord post, demo recording | -- | -- |

---

## Win/Lose Analysis

### TOP 3 Ways to WIN
1. **Killer demo video** showing the full AI loop (find bugs -> AI fixes -> re-scan passes)
2. **Voters can try it themselves** via `npx afterburn-cli` on their own site
3. **Clean, useful reports** that prove the "usefulness" criterion (40% weight)

### TOP 3 Ways to LOSE
1. **No demo video** = automatic disqualification
2. **`npx afterburn-cli` fails** because npm not published = broken first impression
3. **Tool hangs or produces garbage** on voter's site = no vote

### Key Talking Points for Demo
1. "Lighthouse checks ONE page. Afterburn crawls your ENTIRE site, fills every form, clicks every button."
2. "The Markdown report IS the killer feature -- paste it into Claude and your bugs get fixed automatically."
3. "Zero config. No test files. No signup. Just a URL."

---

## Completed Tasks (for reference)

- [x] Task #1: Hackathon strategy research (strategist)
- [x] Task #3: README first-impressions audit (polisher)
- [x] Task #4: Demo video plan (demo-planner)
- [x] Task #5: Devil's advocate weakness analysis (devil)
- [x] Task #12: README quick wins -- inline terminal output, reorder sections (polisher)
- [x] Task #13: Cached reports + fixed test site (demo-planner)
- [x] Task #14: Viewport fix + report screenshot (polisher)
- [ ] Task #2: Deep codebase audit (auditor -- in progress)
- [ ] Task #15: Pipeline timeout, blank page score, Cloudflare detection, requirements table (devil -- in progress)
- [ ] Task #16: Test full demo loop + dedup fix (auditor -- pending, after Task #2)
- [ ] Task #17: No-API-key fallback messaging (auditor/polisher -- in progress, P2-2 picked up early)

---

*Plan compiled by strategist based on findings from all 5 agents.*
*Last updated: 2026-02-09 -- revised execution order (npm publish after fixes).*
