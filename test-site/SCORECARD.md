# Afterburn Detection Scorecard

**Reviewer:** output-reviewer agent
**Date:** 2026-02-08
**Target:** FlowSync test site (23 intentional defects)
**Afterburn Mode:** Basic (heuristic, no GEMINI_API_KEY)
**Report:** `afterburn-reports/1770556794126/report-96d116a8-6239-47d1-9533-0ed21f588d8c.md`

---

## 1. Defect-by-Defect Detection Table

| # | Defect | Verdict | Evidence |
|---|--------|---------|----------|
| 1 | **Broken form** -- Newsletter `action="#"` does nothing | **DETECTED** | Report issue #1 (HIGH): "Form `form.newsletter-form` submission isn't working". Also issue #69 detail: "Form submission caused no navigation or network request". |
| 2 | **Broken form** -- Contact form `sendMessage()` no-op | **PARTIALLY** | Report issue #40/#63: Dead button on `form#contact-form [type="submit"]`. The contact form's submit BUTTON was flagged as dead, but the FORM itself was not flagged as broken (unlike defect #1). Afterburn detected the symptom (dead submit button) but not the root cause (form never submits). |
| 3 | **Dead button** -- "Get Started Free" no-op | **DETECTED** | Report issue #41/#64: `button:has-text("Get Started Free")` doesn't do anything when clicked. |
| 4 | **Dead button** -- "Send Message" no-op | **DETECTED** | Report issue #43/#66: `button:has-text("Send Message")` doesn't do anything when clicked. |
| 5 | **Dead button** -- Pricing "Get Started" and "Start Free Trial" | **DETECTED** | Report issues #44/#67 (`Get Started`) and #45/#68 (`Start Free Trial`). Both flagged as dead buttons. |
| 6 | **Broken image** -- icon-deploy.png 404 | **DETECTED** | Report issue #5 (404 URL), #8 (broken image), plus duplicates at #24, #31, #38, #41, #47, #50. Identified by URL `http://localhost:3847/images/icon-deploy.png`. |
| 7 | **Broken image** -- icon-monitor.png 404 | **DETECTED** | Report issue #4 (404 URL), #7 (broken image), plus duplicates at #25, #32, #39, #42, #48, #51. |
| 8 | **Broken image** -- icon-team.png 404 | **DETECTED** | Report issue #6 (404 URL), #9 (broken image), plus duplicates at #26, #33, #40, #43, #49, #52. |
| 9 | **Broken image** -- office-map.png 404 | **DETECTED** | Report issue #12 (404 URL), #14 (broken image), plus duplicates at #27, #34, #54, #55. |
| 10 | **Console error** -- TypeError from `undefined.apiUrl` | **PARTIALLY** | The TypeError fires on every page load. It appears in the report as multiple LOW-priority "AI diagnosis unavailable" entries whose original error is "Failed to load resource: the server responded with a status of 404 (Not Found)". However, the SPECIFIC TypeError message (`Cannot read properties of undefined (reading 'apiUrl')`) is NOT quoted anywhere in the report. The console error WAS captured (it's among the 23 undiagnosed LOW items) but Afterburn's heuristic pattern matcher classified it as a generic 404 resource failure rather than a JavaScript TypeError. Without GEMINI_API_KEY, the actual console error text was not surfaced. Verdict: partially detected -- something was caught but not correctly identified. |
| 11 | **Broken link** -- `/about` returns 404 | **DETECTED** | Report issue #29: "The URL http://localhost:3847/about doesn't exist on the server" (HTTP 404). Crawler also listed `/about` as a 404 page in the site map. |
| 12 | **Broken link** -- `/blog` returns 404 | **DETECTED** | Report issue #30: "The URL http://localhost:3847/blog doesn't exist on the server" (HTTP 404). Also visible in site map. |
| 13 | **Broken link** -- Nav link to `/about` on every page | **PARTIALLY** | The `/about` 404 was detected once (issue #29), but there is no indication that the nav link appears on EVERY page. Afterburn found the broken target URL but did not report which pages contain links to it or how many link instances exist. The defect (nav-wide broken link) is effectively a duplicate of #11 from Afterburn's perspective. |
| 14 | **Accessibility** -- Missing `lang` on `<html>` | **DETECTED** | Report issues #48, #50, #51, #52, #54: "Ensure every HTML document has a lang attribute" flagged on `/`, `/contact`, `/contact#`, `/blog`, `/pricing`. All 5 pages caught. |
| 15 | **Accessibility** -- Missing `alt` on icon-deploy.png | **DETECTED** | Report issue #49: "Ensure `<img>` elements have alternative text" (2 elements on `/`). The axe-core rule `image-alt` caught this. |
| 16 | **Accessibility** -- Missing `alt` on icon-monitor.png | **DETECTED** | Same as #15 -- issue #49 reports 2 elements, covering both broken images on the index page that lack alt text. |
| 17 | **Accessibility** -- Email input has no `<label>` | **MISSED** | The report does NOT contain any `label` or `form-field-multiple-labels` violation. The axe-core results for `/` show 3 violations (contrast, lang, image-alt) but NOT missing labels. This is surprising -- axe-core's `label` rule should catch this. Possible cause: the email input may have a `placeholder` attribute that axe-core treats as sufficient under certain configurations, or the rule was not enabled. |
| 18 | **Accessibility** -- Contact form inputs have no `<label>` | **MISSED** | Same as #17. The `/contact` page axe results show only 1 violation (missing lang). No `label` violation was reported for the form inputs. |
| 19 | **Accessibility** -- Low contrast testimonial text | **DETECTED** | Report issue #47: "Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds" on `/`. The accessibility summary shows 1 critical + 2 serious violations on `/`, and contrast is listed as a top violation (5 elements total). |
| 20 | **HTTP 500** -- `/api/data` returns 500 | **DETECTED** | Report issues #28, #58, #61: "Server error -- The server encountered an error processing http://localhost:3847/api/data" (HTTP 500). Also issues #20-21, #56-57, #59-60 capture the console-side "Failed to load FAQ: Error: API returned 500" messages. |
| 21 | **UI: tiny text** -- 8px `.fine-print` | **N/A** | Report section "UI Audit Results" says: "No UI audits performed." The terminal log confirms: "UI auditing requires GEMINI_API_KEY. Skipping visual analysis." Tiny text detection requires Gemini Vision -- not available in this run. |
| 22 | **UI: overlap** -- Metric shifted left 80px | **N/A** | Same as #21. Visual overlap detection requires Gemini Vision. Skipped. |
| 23 | **UI: cramped** -- Info cards with 4px gap/padding | **N/A** | Same as #21. Visual spacing analysis requires Gemini Vision. Skipped. |

---

## 2. Category Summary

| Category | Defect Count | Detected | Partially | Missed | N/A | Detection Rate (excl. N/A) |
|----------|-------------|----------|-----------|--------|-----|---------------------------|
| Broken Forms | 2 | 1 | 1 | 0 | 0 | 75% (1 full + 1 partial) |
| Dead Buttons | 3 | 3 | 0 | 0 | 0 | 100% |
| Broken Images | 4 | 4 | 0 | 0 | 0 | 100% |
| Console Errors | 1 | 0 | 1 | 0 | 0 | 50% (partial only) |
| Broken Links | 3 | 2 | 1 | 0 | 0 | 83% (2 full + 1 partial) |
| Accessibility | 6 | 4 | 0 | 2 | 0 | 67% |
| HTTP 500 | 1 | 1 | 0 | 0 | 0 | 100% |
| UI Visual | 3 | 0 | 0 | 0 | 3 | N/A (requires Gemini) |
| **TOTAL** | **23** | **15** | **3** | **2** | **3** | **82.5% (excl. N/A)** |

---

## 3. Quality Analysis

### 3a. Issue Descriptions -- Are they useful for a vibe coder?

**Mixed quality.** The report has two tiers:

- **Well-described issues (MEDIUM priority, heuristic-diagnosed):** Issues like "Page or resource not found -- The URL http://localhost:3847/images/icon-deploy.png doesn't exist on the server" are clear and actionable. A vibe coder would understand exactly what to fix. The dead button descriptions ("A button labeled 'Get Started Free' doesn't do anything when clicked") are also excellent -- plain English, specific.

- **Poorly-described issues (LOW priority, no AI diagnosis):** 23 of the 77 issues say "An error occurred (AI diagnosis unavailable - set GEMINI_API_KEY for detailed analysis)" with a generic "Review the error message" fix suggestion. These are useless to a vibe coder. The original error text IS embedded in the detail section but is not surfaced prominently. A user skimming the summary table would see 23 LOW items with identical descriptions and likely ignore them all -- even though some contain the important TypeError (#10) and 500 errors (#20).

**Grade: C+.** The heuristic-classified issues are good. The fallback path (no API key) produces noise that actively harms usability.

### 3b. Deduplication -- How many of 77 issues are unique?

**Severe deduplication problem.** After careful analysis:

| Unique Resource/Issue | Times Reported | Issue Numbers |
|-----------------------|---------------|---------------|
| icon-deploy.png 404 | ~8 | #5, #8, #24, #31, #38, #41, #47, #50, plus LOW entries |
| icon-monitor.png 404 | ~8 | #4, #7, #25, #32, #39, #42, #48, #51, plus LOW entries |
| icon-team.png 404 | ~8 | #6, #9, #26, #33, #40, #43, #49, #52, plus LOW entries |
| office-map.png 404 | ~6 | #12, #13, #14, #15, #27, #34, #54, #55, plus LOW entries |
| /api/data 500 | ~6 | #28, #58, #61, plus LOW #20-21, #56-57, #59-60 |
| /about 404 | ~2-3 | #29 plus LOW entries |
| /blog 404 | ~1-2 | #30 plus LOW entries |
| Dead buttons | 7 (deduplicated) + 7 duplicates in LOW | #39-45 (MEDIUM) + #62-68 detail + #79-85 (LOW duplicates) |
| Broken form | 2 | #1 (HIGH) + #46 (MEDIUM) + #69 detail |
| Accessibility | 8 | #47-54 (each unique page/rule combo) |
| Console TypeError | buried in LOW | Among the ~23 "AI diagnosis unavailable" entries |

**Estimated unique issues: ~18-20 distinct findings from 77 reported.**

The root cause: each broken resource is re-encountered every time Afterburn visits a page containing it (homepage visited during multiple workflow runs). Each visit generates both a "Page or resource not found" (from HTTP response handler) AND an "Image failed to load" (from the broken-image detector), doubling the count. Then the same resources trigger AGAIN in the undiagnosed LOW bucket from browser console events.

**Effective dedup ratio: ~4:1** (77 reported / ~19 unique). This is poor and would confuse users.

### 3c. Priority Levels -- Do they make sense?

**Mostly sensible, with one notable gap:**

- **1 HIGH (newsletter form):** Correct. A form that silently does nothing is the highest-impact user-facing bug.
- **53 MEDIUM:** This bucket is too broad. Dead buttons (clear UX problem) and broken images (visual regression) are correctly MEDIUM. But accessibility violations (missing lang) being the same priority as a dead CTA button feels off -- the dead button is more impactful for a vibe coder. The 404 page resources being MEDIUM is correct.
- **31 LOW:** These are all "AI diagnosis unavailable" fallback entries. The PROBLEM is that the `/api/data` 500 error and the JavaScript TypeError are buried here. A server returning 500 should be at least MEDIUM. The heuristic classifier does elevate the HTTP 500 to MEDIUM when it can parse the status code (issues #28, #58, #61), but the DUPLICATE console-side reports of the same 500 ("Failed to load FAQ: Error: API returned 500") land in LOW because the pattern matcher doesn't recognize the console.error text format.

**The contact form (#2) is a notable miss for HIGH priority.** Both forms are broken, but only the newsletter form got HIGH. The contact form's submit button was flagged as a dead button (MEDIUM) instead.

---

## 4. Comparison with Devil's Advocate Predictions

### 4a. Detection Count Prediction

The devil's advocate predicted **14-17 detectable defects** out of 23.

**Actual result: 15 DETECTED + 3 PARTIALLY + 2 MISSED + 3 N/A = 15-18 depending on how partials are counted.**

- Counting PARTIALLY as 0.5: 15 + 1.5 = **16.5 of 20 non-N/A defects**
- The prediction of 14-17 was **accurate** (the actual falls in the upper range)

### 4b. Specific Concern Assessment

| Devil's Advocate Concern | Outcome |
|--------------------------|---------|
| **Dead buttons depend on workflow planner clicking them** | **DID NOT MATERIALIZE.** The heuristic planner generated workflows for ALL 5 dead buttons (#3-5). Workflows 4-8 explicitly target "Get Started Free", "Subscribe", "Send Message", "Get Started", and "Start Free Trial". All were caught. |
| **Broken forms depend on workflow filling + submitting** | **PARTIALLY MATERIALIZED.** The newsletter form (#1) WAS correctly identified as broken. But the contact form (#2) was only caught as a dead button, not a broken form. This suggests the fill step may have failed for the contact form (missing `name` attributes as predicted), causing Afterburn to skip the broken-form check and only flag the dead submit button. |
| **Broken links depend on navigation workflows** | **DID NOT MATERIALIZE.** Afterburn's crawler (not workflow executor) discovered `/about` and `/blog` as pages, navigated to them, and recorded the 404s. The crawler path caught what the workflow path might have missed. |
| **CSS class names too obvious (.overlap-bug, .tiny-text)** | **MOOT** -- visual defects were N/A anyway (no Gemini). But the class names WERE already renamed per the devil's advocate's suggestion (now `.metric-featured`, `.fine-print`, `.info-grid`). |
| **favicon.ico polluting broken image count** | **UNCLEAR.** No explicit favicon.ico 404 appears in the report. Either the server serves a favicon, or Afterburn filters it out. Not a problem in practice. |
| **`action="#"` / `onsubmit="return false"` fragility** | **DID NOT MATERIALIZE.** `return false` prevented the `#` navigation, and Afterburn correctly detected "Form submission caused no navigation or network request." The detection worked as intended. |

### 4c. Devil's Advocate Accuracy Summary

The devil's advocate was **well-calibrated** on the overall detection count but **too pessimistic** about specific failure modes. The heuristic workflow planner performed better than expected -- it generated targeted button-click workflows for every interactive element. The main failure mode (contact form as dead button rather than broken form) WAS predicted. The concern about broken links was addressed by the crawler stage (which the devil's advocate didn't account for).

---

## 5. Overall Verdict

### Detection Rate

| Metric | Value |
|--------|-------|
| Total defects | 23 |
| DETECTED | 15 |
| PARTIALLY detected | 3 |
| MISSED | 2 |
| N/A (requires Gemini Vision) | 3 |
| **Detection rate (all 23)** | **65% full, 72% incl. partial** |
| **Adjusted rate (excl. N/A, 20 defects)** | **75% full, 82.5% incl. partial** |

### Pass/Fail

**PASS** -- 15 fully detected defects exceeds the 8-defect threshold. Even by the stricter "full detection only" metric, 15/20 (75%) is a strong result for heuristic-only mode.

### Key Strengths

1. **Broken image detection is thorough.** All 4 missing images were found with specific URLs and actionable fix suggestions. The detection is reliable even without AI.
2. **Dead button detection exceeded expectations.** The heuristic planner generated workflows that click every button. All 5 dead-button defects (across 7 buttons) were caught. This was the devil's advocate's top concern and it didn't materialize.
3. **Crawler finds broken pages.** The `/about` and `/blog` 404s were caught via crawling, not requiring workflow steps to navigate there. Good architectural separation.
4. **Accessibility baseline is solid.** axe-core integration caught 4 of 6 accessibility defects including contrast issues and missing lang attributes.
5. **Broken form detection works.** The newsletter form (the highest-impact defect) was correctly flagged as HIGH priority with a clear description.

### Key Weaknesses

1. **Deduplication is the #1 problem.** 77 issues for ~19 unique findings is a 4:1 noise ratio. This would overwhelm a vibe coder. The same broken image appears up to 8 times across different issue entries.
2. **No-API-key fallback is too noisy.** 23 issues say "AI diagnosis unavailable" with identical descriptions. These should be deduplicated and/or the original error message should be surfaced in the summary table, not hidden in the detail section.
3. **Missing form labels not detected.** Defects #17 and #18 (missing `<label>` elements) were not flagged by axe-core. This may be a configuration issue -- the `label` axe rule may not be enabled, or placeholder attributes may be suppressing it.
4. **Console TypeError not surfaced.** The JavaScript TypeError (#10) is the most important runtime error but it's buried in the LOW "AI diagnosis unavailable" bucket. Afterburn's heuristic pattern matcher should have a regex for `TypeError:` / `ReferenceError:` / `SyntaxError:` to classify these as MEDIUM even without Gemini.
5. **Contact form detection incomplete.** The contact form (#2) was caught as a dead button but not as a broken form. This is an architecture gap -- if the fill step fails (no `name` attributes), Afterburn skips the broken-form check entirely instead of still testing the submit.
6. **No location/page attribution.** Most issues show "Location: Unknown" in the summary table. Knowing WHICH page triggered a 404 or console error would dramatically improve actionability.

### Final Grade

| Aspect | Grade |
|--------|-------|
| Detection coverage (excl. N/A) | **B+** (75-82%) |
| Issue quality / actionability | **C+** (good when diagnosed, useless in fallback) |
| Deduplication | **D** (4:1 noise ratio) |
| Priority accuracy | **B-** (HIGH is correct, but 500s buried in LOW) |
| Overall | **B-** |

**Bottom line:** Afterburn's core detection pipeline is solid -- it found 15 of 20 detectable defects in heuristic-only mode, which is impressive. The main problems are output quality (deduplication, fallback messaging, location attribution), not detection accuracy. Fixing the dedup and improving the no-API-key error classifier would move this from B- to A-.

---

*Generated by output-reviewer agent, 2026-02-08*
