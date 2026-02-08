# Devil's Advocate Review

**Reviewer:** devils-advocate agent
**Date:** 2026-02-08
**Goal:** Stress-test every decision the team makes. Be harsh but constructive.

---

## Phase 1: Test Site Design Challenges

### Overall Assessment

The site-builder created a plausible startup landing page ("FlowSync") with 23 documented defects across 3 pages. The HTML/CSS is clean and the defect registry is well-organized. That said, I have **serious concerns** about whether this test site actually validates what Afterburn claims to do.

---

### Challenge 1: DEFECT REALISM (Are these bugs vibe-coders actually produce?)

**Problem:** Several defects are TOO CLEAN. Real vibe-coded sites don't have `<!-- DEFECT: broken image -->` comments (obviously those won't ship, but the defects themselves are overly synthetic).

Specific realism concerns:

| Defect | Realism Score | Issue |
|--------|--------------|-------|
| #10 (TypeError from `undefined.apiUrl`) | **GOOD** | This is exactly what GPT-generated code does -- accessing properties on uninitialized config objects. Realistic. |
| #1-2 (Broken forms) | **MEDIUM** | Real broken forms don't use `action="#"` + `onsubmit="return false"`. They use `fetch()` to a backend that doesn't exist yet, or POST to `/api/submit` that 404s. The current setup is too obviously intentional. |
| #3-5 (Dead buttons with empty handlers) | **MEDIUM** | `handleGetStarted()` doing `var x = 1 + 1` is a valid dead button, but real vibe-coded dead buttons often do `console.log('TODO')` or call a function that doesn't exist (ReferenceError). The current approach is fine for detection but not representative. |
| #6-9 (Missing images) | **GOOD** | Images referencing paths that don't exist is extremely common in vibe-coded sites. Perfect. |
| #14-18 (Accessibility) | **GOOD** | Missing `lang`, missing `alt`, missing `<label>` -- all classic AI-generated HTML sins. |
| #19 (Low contrast) | **GOOD** | `#d0d0d0` on white is a great defect. Real contrast issue. |
| #20 (API 500) | **GOOD** | Fetching from an endpoint that errors is realistic. |
| #21-23 (Tiny text, overlap, cramped) | **QUESTIONABLE** | CSS classes named `.tiny-text`, `.overlap-bug`, and `.cramped` feel manufactured. Real vibe-coded sites have these bugs because of conflicting CSS rules, not because someone deliberately named a class "overlap-bug". This matters because Afterburn's UI auditor uses Gemini Vision to look at screenshots -- if the visual defect doesn't look natural, the demo loses credibility if a judge inspects the source. |

**Fix:** Rename `.overlap-bug` to something neutral like `.metric-featured` or just inline the bad CSS. Rename `.tiny-text` to `.feature-details` or `.fine-print`. Remove `.cramped` as a standalone class and instead make the cramped spacing the DEFAULT for info cards (which is what actually happens in bad code -- people forget to add spacing, they don't add a class called "cramped").

---

### Challenge 2: DETECTION GAPS (Will Afterburn actually catch these?)

After reading Afterburn's source code (`error-detector.ts`, `step-handlers.ts`, `workflow-executor.ts`, `ui-auditor.ts`), I have concerns about several defects:

#### Dead Buttons (#3, #4, #5) -- HIGH RISK OF FALSE NEGATIVE

Afterburn's dead button detection (`step-handlers.ts:189-202`) works by comparing pre/post click state: URL change, DOM size delta > 100 chars, or network activity. The `handleGetStarted()` function does `var x = 1 + 1` which produces NO DOM change, NO URL change, and NO network activity. So the heuristic SHOULD catch it.

BUT here's the problem: **Afterburn needs to CLICK these buttons as part of a workflow**. The workflow executor runs AI-generated workflow plans. If the AI planner doesn't generate a "click #hero-cta" step, the dead button detection NEVER FIRES. Dead button detection is NOT a page-wide scan -- it only triggers on workflow click steps.

**Risk:** If the heuristic planner (no-API-key mode) doesn't generate workflows that click these specific buttons, defects #3-5 will be completely missed.

**Fix:** Ensure the test runner uses a mode that generates workflows targeting these interactive elements. Or acknowledge this as a known limitation in the scorecard.

#### Broken Forms (#1, #2) -- MODERATE RISK

The `detectBrokenForm()` function in `step-handlers.ts:207-320` has a critical limitation: it only triggers when a workflow step FILLS a form AND the next step SUBMITS it (line 183-196 of `workflow-executor.ts`). The newsletter form on index.html has no `name` attributes on inputs, so `fillField()` will fail to find fields by name selector. The contact form inputs also lack `name` attributes (they have `id` but not `name`).

**Impact:** The form detection relies on `[name="..."]` selectors (line 114). Without `name` attributes on form inputs, the fill step will skip all fields, and broken form detection may report 0 filled / 0 skipped instead of correctly identifying the form as broken.

**Fix:** Either add `name` attributes to the form inputs (which is more realistic -- most HTML generators do include names), or accept that this tests a different failure mode (unfillable forms).

#### Broken Links (#11, #12, #13) -- UNCERTAIN

Afterburn's error-detector captures HTTP 4xx/5xx responses passively through the response handler (line 30-75 of `error-detector.ts`). But broken LINKS specifically (/about, /blog) will only be detected if Afterburn navigates to them. If the workflow just loads the homepage, the `/about` and `/blog` links won't produce 404 responses because Playwright hasn't clicked them.

The 404 images WILL be caught because the browser fetches them automatically. But link targets are only fetched when clicked or navigated to.

**Risk:** Defects #11-13 may only be detected if the workflow planner generates click steps for nav/footer links.

---

### Challenge 3: MISSING DEFECT CATEGORIES (What real vibe-coded sites break that this site doesn't)

The test site covers the basics well but MISSES several categories that Afterburn should be tested against:

| Missing Category | Why It Matters | Example |
|-----------------|----------------|---------|
| **Mobile responsiveness** | The CSS uses `grid-template-columns: repeat(3, 1fr)` with no media queries. On mobile viewport, content will be crushed. Afterburn takes screenshots -- would it flag this? | Add no `@media` breakpoints so the 3-column grid breaks at small widths |
| **Slow/hanging resources** | The server returns all responses instantly. Real broken sites have requests that hang for 30+ seconds. Afterburn has a 10s step timeout -- would a hanging fetch crash the executor? | Make `/api/data` delay 45 seconds before responding instead of immediately returning 500 |
| **Mixed content / insecure resources** | Not applicable for localhost, but worth noting for real-world testing |  |
| **JavaScript memory leaks / infinite loops** | Real AI-generated code sometimes creates `setInterval` without cleanup or recursive functions that stack overflow | Add `setInterval(() => { document.querySelectorAll('*') }, 100)` |
| **Empty states** | The FAQ section shows "Loading FAQ..." forever. This IS documented (#20) but the visual rendering of a permanent loading spinner is a UX defect the Vision LLM should flag independently | Already partially covered |
| **Redirect loops** | Not present but would be a good edge case -- `/login` redirects to `/auth` which redirects to `/login` | Could be added as a server-side route |
| **Missing favicon** | Server serves no favicon.ico -- browsers will 404 on it. This is a free defect that tests 404 detection on common resources | Already happens implicitly |

**Most important missing defect:** The site has NO JavaScript that manipulates the DOM after page load (except the FAQ fetch on pricing). Real vibe-coded React/Next.js sites have hydration mismatches, client-side routing that breaks back-button, and elements that render then immediately disappear. A static HTML site with one `fetch()` call doesn't stress-test Afterburn's ability to handle dynamic SPAs.

**Verdict:** This is acceptable for a hackathon demo (scope is limited) but the team should be honest that this tests a STATIC site, not a modern SPA. Afterburn's real value proposition is for dynamic sites.

---

### Challenge 4: THINGS THAT COULD CRASH AFTERBURN

Based on my reading of the codebase, here are scenarios that could cause Afterburn to fail rather than gracefully degrade:

1. **TypeError in app.js BLOCKING subsequent JS execution:** The IIFE at the top of `app.js` throws immediately. This means `handleGetStarted()` and `sendMessage()` ARE defined (they're function declarations, hoisted above the IIFE), so buttons won't throw ReferenceErrors. HOWEVER -- any code that was supposed to run after the IIFE is dead. If the site-builder adds more initialization code below the IIFE, it won't run. Currently fine.

2. **No favicon.ico:** The browser will request `/favicon.ico`, get a 404, and Afterburn will log it as a network failure. This is a free detection but could also pollute the "broken images" count if Afterburn's image detector regex matches `.ico` files (it does -- see `error-detector.ts:47`). This means the "broken images" count might be 5 instead of 4.

3. **The `action="#"` form issue:** The newsletter form's `action="#"` means submitting it navigates to the current page with `#` appended. Afterburn's form detection checks for URL change -- navigating from `http://localhost:3847/` to `http://localhost:3847/#` IS a URL change. This could make Afterburn think the form WORKS when it doesn't. The `onsubmit="return false"` prevents default submission, so the `#` navigation doesn't happen. But this is fragile -- if the browser handles `return false` differently, the detection breaks.

---

### Phase 1 Summary: Overall Grade

| Aspect | Grade | Rationale |
|--------|-------|-----------|
| Defect variety | **B+** | Good spread across 7 categories. Missing dynamic/SPA defects. |
| Defect realism | **B-** | Most defects are plausible but CSS class names give away the intent. Some forms missing `name` attrs unrealistically. |
| Detection alignment | **C+** | Several defects depend on workflow planner generating the right clicks. No guarantee of coverage. |
| Edge case coverage | **C** | No slow responses, no redirects, no DOM mutation after load. |
| Hackathon appropriateness | **A-** | For a demo, this is solid. Professional-looking site with clear defect categories. |

**Bottom line:** Good enough for a hackathon demo, but the team should NOT claim "23 out of 23 defects detected" unless they verify the workflow planner actually exercises all the relevant paths. The real number of DETECTABLE defects (given Afterburn's architecture) is probably 14-17 of the 23.

---

## Phase 2: Detection Results Review

**Source:** Afterburn report `report-96d116a8-6239-47d1-9533-0ed21f588d8c.md` and `RUN-SUMMARY.md`

### Overall: Afterburn detected SOME defects, but the report quality is concerning

Afterburn reported 61/100 health score with 77 issues (1 high, 53 medium, 31 low).
At first glance this looks impressive. Looking closer, it's problematic.

---

### Challenge 5: MASSIVE ISSUE DUPLICATION (77 issues is inflated)

**Problem:** The report lists 77 issues but many are the SAME defect reported multiple times. Each of the 8 workflows visits the same pages, so the same 4 broken images and the same 404 CSS/JS resources get reported once per workflow.

Evidence from the report:
- "Page or resource not found" appears as issues #2-#5, #8-#9, #12-#15, #17-#18, #22-#25, #29-#31, #35 (about 18 entries)
- "An image failed to load" appears as issues #6-#7, #10-#11, #19-#21, #26-#28, #32-#34, #36 (about 15 entries)
- These are the SAME 4 broken images + /about + /blog + /favicon + /api/data, just encountered in different workflow contexts

**Actual unique issues:** Roughly 15-20 unique problems, not 77. The 77 number inflates Afterburn's apparent effectiveness by ~4x.

**Impact on hackathon demo:** A judge who actually reads the report will see 77 rows of "Page or resource not found" repeated and question the tool's deduplication logic. This makes the tool look less mature.

**Fix (for Afterburn):** Deduplicate issues by URL + error type before reporting. Show "Broken image: icon-deploy.png (found on 8 page loads)" instead of 8 separate entries. This is a real product improvement, not just a test issue.

---

### Challenge 6: CONTACT FORM NOT DETECTED AS BROKEN

**Problem:** The DEFECTS.md lists 2 broken forms (newsletter #1 and contact #2). Afterburn only flagged ONE broken form (newsletter, issue #46). The contact form was missed entirely.

**Why this happened:** The contact form's submit button is `type="button"` (not `type="submit"`). Afterburn's `detectBrokenForm()` looks for `button[type="submit"]` or `input[type="submit"]` inside the form (see `step-handlers.ts:271`). Since the contact form uses `type="button"`, the submit detection falls through to the `form.submit()` fallback -- but even then, the `onclick="sendMessage()"` handler fires instead of form submission, and Afterburn's dead button detection catches it as a dead button rather than a broken form.

**Verdict:** The contact form IS partially detected (as a dead button, issues #40 and #43) but NOT correctly categorized as a broken form. A vibe coder reading "dead button" might not realize the entire form is broken. This is a real UX gap in the report.

**Fix:** Afterburn should look for `type="button"` buttons inside forms and flag them as a form usability concern, not just a dead button.

---

### Challenge 7: CONSOLE TypeError (Defect #10) BURIED AS LOW-PRIORITY "UNKNOWN"

**Problem:** The most diagnostic defect -- `TypeError: Cannot read properties of undefined (reading 'apiUrl')` -- appears in the report as multiple LOW-priority items saying "An error occurred (AI diagnosis unavailable - set GEMINI_API_KEY for detailed analysis)". The original error message IS present in the detail ("Failed to load resource" or the TypeError) but it's classified as "unknown" type with "low" confidence.

**Why:** Without Gemini API key, the error analyzer falls back to pattern matching. The console `TypeError` is a JAVASCRIPT error, not a network error. The pattern matcher correctly identifies 404s as "network" type with high confidence, but the TypeError falls through to the "unknown" bucket.

**This is a significant weakness:** The TypeError is arguably the MOST important defect on the site (it means JavaScript is broken on every page load), yet Afterburn ranks it as LOW priority with "unknown" type. A 404 on a decorative image is MEDIUM but a crashing JavaScript error is LOW? The priority ranking is inverted.

**Fix (for Afterburn):** Console errors containing "TypeError", "ReferenceError", "SyntaxError" should be auto-classified as HIGH priority even without AI analysis. These are always bugs, never cosmetic.

---

### Challenge 8: VISUAL DEFECTS COMPLETELY MISSED (#21-#23)

**Problem:** Without GEMINI_API_KEY, the UI auditor is completely skipped. This means:
- Defect #21 (8px tiny text) -- NOT DETECTED
- Defect #22 (overlapping metrics) -- NOT DETECTED
- Defect #23 (cramped card spacing) -- NOT DETECTED

**Why it matters:** These are the kinds of defects that are MOST valuable for vibe coders. A vibe coder can see a 404 in their browser console. They CANNOT easily spot that their text is too small or elements overlap on some screen sizes. The visual analysis is Afterburn's killer feature and it was completely absent from this test.

**Fix:** For the hackathon demo, either:
1. Set GEMINI_API_KEY and re-run, OR
2. Be transparent in the demo that visual analysis requires an API key and show a separate run WITH the key

If the hackathon demo runs without Gemini, 3 of 23 defects are fundamentally undetectable.

---

### Challenge 9: ACCESSIBILITY DETECTIONS ARE GOOD BUT INCOMPLETE

**What worked:**
- Missing `lang` attribute detected on 5 pages (defect #14) -- GOOD
- Missing `alt` text detected (defect #15-16) -- GOOD
- Color contrast violations detected on / and /pricing (defect #19) -- GOOD

**What's missing:**
- Missing `<label>` on form inputs (defects #17-18) -- NOT in the report's accessibility section. Axe-core should flag `input` elements without associated labels, but I see no "label" violations in the report. Either axe-core didn't flag them (unlikely) or the results were filtered out.

**Verdict:** Accessibility detection is the strongest part of the report. 5 out of ~6 accessibility defects detected. The missing label detection may be a gap in how Afterburn maps axe-core results to report entries.

---

### Challenge 10: DEAD BUTTON OVER-REPORTING (7 found vs 5 expected)

**Problem:** DEFECTS.md lists 5 dead buttons (#3-#5). Afterburn found 7. The extra 2 are:
- Issue #39: `form:nth-of-type(1) [type="submit"]` -- this is the NEWSLETTER SUBSCRIBE button detected as both a broken form AND a dead button
- Issue #40: `form#contact-form [type="submit"]` -- the contact form button

These are correct detections but they overlap with the broken form category. The same button appearing as both "dead button" and "broken form" without cross-referencing creates confusion.

**Fix:** Afterburn should correlate dead buttons inside forms with broken form detections and consolidate them into a single "broken form" finding rather than reporting both.

---

### Phase 2 Summary: Detection Scorecard

| Defect Category | Expected | Detected | Missed | Notes |
|----------------|----------|----------|--------|-------|
| Broken forms | 2 | 1 | 1 | Contact form only detected as dead button |
| Dead buttons | 5 | 7 | 0 | Over-reported (includes form submit buttons) |
| Broken images | 4 | 4+ | 0 | Correctly detected, massively duplicated in report |
| Console TypeError | 1 | 1 | 0 | Detected but mis-prioritized as LOW/unknown |
| Broken links (404 pages) | 3 | 2 | 1? | /about and /blog found by crawler; nav link 404s caught passively |
| Accessibility | 6+ | 5+ | 1+ | Missing label violations not in report |
| HTTP 500 (API) | 1 | 1 | 0 | Server error detected |
| Visual (tiny/overlap/cramped) | 3 | 0 | 3 | Requires Gemini API key (not set) |
| **TOTAL** | **23** | **~15 unique** | **~8** | **Detection rate: ~65%** |

**The real detection rate is about 65%, not the 100% one might assume from "77 issues found."**

The output-reviewer should NOT count duplicated issues as separate detections. And the 8/11 PASS threshold is meaningless if we're counting defect categories vs individual issues inconsistently.

---

## Phase 3: Repo Readiness Review

**Source:** REPO-READINESS.md (repo-checker audit) + my own analysis of README, package.json, and repo structure

### Overall: The repo-checker was thorough but TOO GENEROUS on some checks

The repo-checker gave 12/14 PASS. I disagree with several of those passes. Here is my challenge.

---

### Challenge 11: README OVERPROMISES (repo-checker said PASS, I say WARN)

**Problem:** The README makes several claims that are not fully true in the current state:

1. **"npx afterburn https://your-site.com" -- "Zero config"**: This fails on first run because Playwright needs to download browsers (~200MB). The README does say "downloads a browser automatically on first run" but a judge running `npx afterburn` will wait 30+ seconds before anything happens. That's not "zero config" -- it's "surprise config."

2. **"Handles SPAs (React, Next.js, Vue, Angular, Svelte)"**: The README claims SPA support in the "How it works" section, but the test site is static HTML. Has SPA handling actually been tested? The crawler code uses `domcontentloaded` wait strategy, which may not wait for React hydration. Without evidence of SPA testing, this is a bold claim.

3. **GitHub Action reference uses `gods-strongest-vibecoder/afterburn@main`**: This is a real GitHub username reference. If the repo isn't actually at that path, the Action example is broken for anyone copy-pasting it. The repo-checker didn't verify the Action works end-to-end.

4. **"health score (0-100) is weighted" table**: The weights (40% workflows, 30% errors, 20% accessibility, 10% performance) are documented but I haven't verified they match the actual implementation. If a judge computes the score manually from the report, does it match 61?

**Fix:** Add a "Known Limitations" section to the README. Be honest. Vibe coders RESPECT honesty. Example: "Best results with GEMINI_API_KEY set. Without it, visual analysis is skipped. Browser download required on first run (~200MB, one-time)."

---

### Challenge 12: 60-SECOND FIRST IMPRESSION TEST (Would fail)

**The scenario:** A hackathon judge clones the repo. They have Node.js installed. They run:
```
git clone <repo>
cd afterburn
npx afterburn https://example.com
```

**What actually happens:**
1. `npx afterburn` resolves to `dist/index.js` but `dist/` is in `.gitignore` -- **it doesn't exist in a fresh clone**
2. Judge would need to run `npm install && npm run build` first
3. Even then, Playwright browser download adds another 30-60 seconds
4. Total time to first scan: **3-5 minutes**, not 60 seconds

**Counterargument:** The README says `npx afterburn` which would fetch from npm, not from a local clone. But the package isn't published to npm yet (version 0.1.0, no `repository` field).

**Fix:** Either:
1. Publish to npm before the hackathon so `npx afterburn` works globally, OR
2. Add a "Quick Start from Source" section: `git clone && npm install && npm run build && node dist/index.js https://your-site.com`, OR
3. Include `dist/` in the repo (remove from .gitignore) so it works from a clone

---

### Challenge 13: MISSING LICENSE FILE (repo-checker correctly flagged FAIL)

I agree with the repo-checker: no LICENSE file despite MIT claim. Easy fix but embarrassing to miss. Add it.

---

### Challenge 14: UNCOMMITTED SECURITY FIXES (repo-checker correctly flagged WARN)

I agree this is critical. The main branch is missing the security hardening from Phase 7. If a judge reviews the code on GitHub, they'll see the older, less-secure version. This MUST be committed before submission.

---

### Challenge 15: WHAT A HACKATHON JUDGE WOULD LOOK FOR (that's missing)

Based on common hackathon judging criteria:

| Missing Item | Impact | Fix |
|-------------|--------|-----|
| **Demo video or GIF** | HIGH -- judges skim repos in 2-3 minutes. A 30-second GIF showing Afterburn finding bugs on a real site would be worth more than 1000 words of README. | Record a terminal GIF with `asciinema` or `vhs` |
| **Live demo URL** | HIGH -- "try it now" link lets judges test without installing. Could be a simple hosted version or a Replit/CodeSandbox. | Deploy a web wrapper or provide a hosted demo |
| **Comparison to alternatives** | MEDIUM -- judges want to know "why not just use Lighthouse?" A comparison table showing what Afterburn does that Lighthouse/axe-core/Playwright Test Generator don't would clinch it. | Add "How is this different?" section |
| **Architecture diagram** | LOW -- the README's text pipeline explanation is good but a visual diagram would help. | Not critical for hackathon |
| **Sample report** | HIGH -- show what the output looks like without requiring judges to run it. Embed a screenshot of the HTML report or link to a hosted example. | Include a screenshot in the README or commit a sample report |

---

### Challenge 16: THE "WHY AFTERBURN" QUESTION

A skeptical judge will ask: "This is Playwright + axe-core + Gemini glued together. What's the innovation?"

The answer should be: **The innovation is the PIPELINE, not the components.** No existing tool crawls -> plans workflows -> executes -> diagnoses -> reports in one command. Lighthouse checks performance. Axe-core checks accessibility. Playwright Test Generator records actions. But none of them:
- Autonomously plan what to test based on discovered forms and buttons
- Fill forms with test data and detect broken submissions
- Detect dead buttons that look clickable but do nothing
- Generate both human-readable and AI-parseable reports

**This differentiation MUST be in the demo pitch.** If the README or presentation just lists "finds broken forms, dead buttons, accessibility issues," judges will think "I can do that with existing tools." The pitch needs to be "ONE COMMAND does what would take 5 different tools and manual configuration."

---

### Phase 3 Summary: Repo Grade

| Aspect | Grade | Rationale |
|--------|-------|-----------|
| Build quality | **A** | Compiles cleanly, passes tests, zero security advisories |
| README quality | **B+** | Comprehensive but overpromises on SPA support and "zero config" |
| First impression | **C** | No demo GIF, no sample report, can't run from fresh clone |
| Judge-proofing | **C+** | Missing LICENSE, no comparison to alternatives, no live demo |
| Security posture | **B** (committed) / **A-** (with uncommitted fixes) | Good patterns but fixes not on main branch |

---

## Final Verdict: All Phases

### What's Genuinely Good
1. The codebase is solid. Clean TypeScript, 99 passing tests, zero vulnerabilities.
2. The README is one of the best I've seen for a hackathon project. Clear, well-structured, honest about AI being optional.
3. The pipeline architecture (crawl -> plan -> execute -> analyze -> report) is a genuinely useful product idea.
4. Security practices are strong (input validation, data redaction, no hardcoded secrets).
5. The test site covers the major defect categories a vibe coder would encounter.

### What Needs Fixing Before Submission (prioritized)

| Priority | Action | Effort | Impact |
|----------|--------|--------|--------|
| P0 | Commit all security fixes to main | 5 min | Judges see clean code |
| P0 | Add LICENSE file | 1 min | Professional credibility |
| P0 | Record a demo GIF/screenshot for README | 15 min | Judges understand the product in 30 seconds |
| P1 | Run demo WITH Gemini API key | 5 min | Shows the visual analysis killer feature |
| P1 | Add "Known Limitations" to README | 5 min | Honesty builds trust |
| P1 | Fix issue deduplication in reports | 30 min | Report looks professional, not inflated |
| P2 | Improve TypeError console error priority | 15 min | JavaScript crashes should be HIGH, not LOW |
| P2 | Add sample report to repo | 10 min | Judges see output without running tool |
| P3 | Publish to npm | 10 min | `npx afterburn` actually works |

---

## Addendum: SCORECARD Review (Phase 2 cross-check)

After reading the output-reviewer's SCORECARD.md, two additional challenges:

### Challenge 17: PASS THRESHOLD IS TOO LENIENT

The SCORECARD uses an "8 defect" absolute threshold for PASS. But 8/23 = 35%. This means Afterburn could miss 65% of defects and still pass the stress test. A better threshold: "detect at least 75% of testable defects (excluding N/A)." Under this metric, 15/20 = 75% -- Afterburn barely passes, which feels more honest.

### Challenge 18: TypeError "PARTIALLY DETECTED" IS GENEROUS

The SCORECARD counts defect #10 (TypeError: `undefined.apiUrl`) as "PARTIALLY detected" because something was caught in the LOW-priority bucket. But the actual `TypeError` message never appears in the report summary. A vibe coder reading the report would have no idea their JavaScript crashes on every page load. This should be scored as MISSED, not PARTIALLY.

If we re-score: 14 DETECTED + 2 PARTIALLY + 4 MISSED + 3 N/A = 70% full detection of testable defects. Still passes the 75% threshold (barely) when partials are counted as 0.5.

### Final Note on SCORECARD Quality

The output-reviewer's analysis was excellent. The deduplication analysis (4:1 noise ratio), the prediction validation section, and the weakness identification were all rigorous. The SCORECARD is the strongest deliverable this team produced -- it's honest about both strengths and weaknesses. Well done.
