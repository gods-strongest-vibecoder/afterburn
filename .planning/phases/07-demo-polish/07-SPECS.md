# Phase 7: Detailed Acceptance Specs

**Author:** Architect
**Status:** APPROVED (critic approved 2026-02-08, all conditions incorporated)
**Last updated:** 2026-02-08

---

## Wave 2: Output Quality Fixes

### Spec 2A: Issue Deduplication

**Problem:** 86 reported issues for ~20 unique findings (~4:1 noise ratio). Same broken image or console error appears once per workflow that visits the same page.

**Root cause:** `priority-ranker.ts` iterates ALL `diagnosedErrors` (which already dedup console/network/image errors internally via `seen` sets in `error-analyzer.ts`), but then also iterates ALL `deadButtons`, `brokenForms`, `uiAudits`, and `pageAudits` from the `ExecutionArtifact` — many of which repeat across workflows visiting the same pages. The ranker creates a `PrioritizedIssue` for each, with no dedup.

**Files to modify:**
- `src/reports/priority-ranker.ts` — Add deduplication logic and `occurrenceCount` field
- `src/reports/html-generator.ts` — Pass through `occurrenceCount` to template data
- `src/reports/markdown-generator.ts` — Show `occurrenceCount` in issue table
- `templates/report.hbs` — Display occurrence count badge when > 1

**Approach:** Add a `deduplicateIssues()` function that runs AFTER `prioritizeIssues()` returns. This keeps the existing prioritization logic untouched (it's well-tested with 15 unit tests). Dedup groups by a composite key of `(category, summary_normalized, location)` where `summary_normalized` strips variable parts like specific selectors. Within each group, keep the highest-priority instance and annotate with count.

**Interface changes:**
```typescript
// Add to PrioritizedIssue interface
export interface PrioritizedIssue {
  // ... existing fields ...
  occurrenceCount?: number;  // How many times this issue was found (default 1, shown when > 1)
}

// New exported function
export function deduplicateIssues(issues: PrioritizedIssue[]): PrioritizedIssue[];
```

**Dedup key logic:**
- For ALL categories: key = `category + summary + location` (simplest correct approach)
- Summary normalization: `summary.toLowerCase().trim()` -- NO URL stripping or regex magic. Accept that near-duplicates with slight wording differences may slip through. The 80/20 rule applies: exact-match dedup gets us from 86 to ~25, which is good enough. Perfect normalization is scope creep.
- NOTE on Dead Buttons: all dead buttons currently get `location = executionArtifact.targetUrl` (same for all, since they're detected on the scan target). If two different pages have a button with the same selector and same summary text, they WOULD dedup. This is acceptable today because the tool scans a single target URL. Document this assumption in a code comment.

**Acceptance criteria:**
1. `deduplicateIssues([])` returns `[]`
2. Given 4 identical issues (same category + summary + location), output is 1 issue with `occurrenceCount: 4`
3. Given issues with same category + summary but DIFFERENT locations, they are NOT deduped (different pages = different issues)
4. The kept issue has the HIGHEST priority from the group (if a group has both `medium` and `high`, keep the `high` one)
5. Output array maintains priority sort order (high > medium > low)
6. `occurrenceCount` is `undefined` (not 1) for issues that appear only once — avoids noise in reports
7. Issues with different categories but same summary are NOT deduped
8. HTML report shows "Found N times" badge next to issues where `occurrenceCount > 1`
9. Markdown report issue table shows "(xN)" suffix in Summary column where `occurrenceCount > 1`
10. Both `generateHtmlReport` and `generateMarkdownReport` must call `deduplicateIssues` on the prioritized list before rendering

**Required test cases:**
```
tests/unit/deduplicator.test.ts:
  - "returns empty array for empty input"
  - "passes through single issue unchanged (no occurrenceCount)"
  - "deduplicates identical issues and keeps highest priority"
  - "annotates deduplicated issues with correct occurrenceCount"
  - "does NOT deduplicate issues with different locations"
  - "does NOT deduplicate issues with different categories"
  - "maintains priority sort order after dedup"
  - "handles mixed: some duplicates, some unique"
  - "deduplicates issues with identical priorities (keeps first, counts all)"
  - "deduplicates Dead Button issues with same summary and location"
  - "deduplicates Accessibility issues by summary + location"
```

**Edge cases:**
- What if ALL issues are identical? Should produce 1 issue with `occurrenceCount: N`
- What if two issues have same summary but different priorities? Keep highest priority, count both
- Empty `location` field (value "Unknown"): treat "Unknown" as a valid location for grouping — two "Unknown" locations ARE considered the same
- `occurrenceCount` must be a positive integer >= 2 when set, never 0 or 1

### CRITICAL: The totalIssues Mismatch Trap

`ExecutionArtifact.totalIssues` is computed by `workflow-executor.ts:calculateTotalIssues()` (line 338) which sums RAW `consoleErrors.length + networkFailures.length + brokenImages.length` across ALL workflows with ZERO dedup. If 3 workflows visit the same page, each console error is counted 3x. This inflated value flows to:

1. `health-scorer.ts:26` -- `errorScore = Math.max(0, 100 - (totalIssues * 2))` -- uses inflated count
2. `markdown-generator.ts:28` -- YAML frontmatter `total_issues`
3. `markdown-generator.ts:275` -- Summary table "Total Issues"
4. `html-generator.ts:118` -- HTML report `totalIssues`
5. `commander-cli.ts:121` -- CLI output "N issues found"
6. `engine.ts:198` -- `AfterBurnResult.totalIssues`

**If dedup only happens in priority-ranker, we get: "86 issues found" header but 20 items in the list. Judges WILL notice.**

**Resolution: Option (B) -- Replace display-context totalIssues with deduplicated count**

After dedup runs, the DISPLAY count should be `deduplicatedIssues.length`, not `executionArtifact.totalIssues`. But the HEALTH SCORE continues using `executionArtifact.totalIssues` (changing health scoring is high-risk with 15+ existing tests, and arguably the raw count is correct for scoring severity).

**Specific changes for count consistency (all user-facing counts must use deduped length):**

1. `src/core/engine.ts:198` -- Change `totalIssues: executionResult.totalIssues` to `totalIssues: deduplicatedIssues.length` (after calling `deduplicateIssues()`). This flows to CLI output at `commander-cli.ts:121` which prints `${result.totalIssues} issues found`.
2. `src/core/engine.ts:188-190` -- Compute `highPriorityCount`, `mediumPriorityCount`, `lowPriorityCount` from the DEDUPLICATED list (not from raw `prioritizedIssues`). This ensures the CLI line `"20 issues found (3 high, 8 medium, 9 low)"` has `3+8+9=20` (no mismatch).
3. `src/cli/commander-cli.ts:121` -- NO CODE CHANGE needed. It already uses `result.totalIssues` and `result.highPriorityCount` etc. from `AfterBurnResult`. Once engine.ts passes deduped values, CLI output is automatically correct.
4. `src/reports/markdown-generator.ts` -- Change YAML `total_issues` and summary table "Total Issues" to use `prioritizedIssues.length` (post-dedup). Since the markdown generator calls `prioritizeIssues()` internally, it must ALSO call `deduplicateIssues()` and use that length.
5. `src/reports/html-generator.ts` -- Change `totalIssues` passed to template to use deduped count. Same pattern: call `deduplicateIssues()` after `prioritizeIssues()`.
6. `health-scorer.ts` -- **NO CHANGE.** Health scorer continues using `executionArtifact.totalIssues` (raw count). This is intentional: health score reflects the SEVERITY of the raw error count, while the report shows the ACTIONABLE deduplicated list.

**Verification: after these changes, ALL user-visible issue counts will show the deduplicated number. The ONLY place the inflated raw count is used is internally by health-scorer.ts for severity weighting.**

**Additional acceptance criteria for count consistency:**
11. CLI output "N issues found" matches the number of items in the report issue list
12. Markdown YAML frontmatter `total_issues` matches the number of rows in the issue table
13. HTML report header issue count matches the number of issue cards rendered
14. `AfterBurnResult.totalIssues` equals `AfterBurnResult.prioritizedIssues.length`
15. Health score calculation is NOT affected by dedup (uses raw `ExecutionArtifact.totalIssues`)

**Additional test cases for count consistency:**
```
tests/unit/deduplicator.test.ts (ADD):
  - "deduplicated count matches output array length"

(Verified manually in demo dry-run):
  - "CLI issue count matches report issue list count"
```

**Scope boundary -- OUT of scope:**
- Do NOT modify `error-analyzer.ts` dedup logic (it already deduplicates at the diagnosis level via `seen` sets)
- Do NOT change the `prioritizeIssues()` function signature or behavior
- Do NOT merge issues across different error types within the same category
- Do NOT change health score calculation (health scorer uses `ExecutionArtifact.totalIssues`, not deduplicated count)
- Do NOT modify `workflow-executor.ts:calculateTotalIssues()` (that's the raw count used for health scoring)

---

### Spec 2B: TypeError/ReferenceError/SyntaxError Elevation to MEDIUM

**Problem:** Console errors like `TypeError: Cannot read properties of undefined` fall through to the `unknown` error type in `patternMatchError()` and get classified as LOW priority by the ranker. They should be MEDIUM.

**Root cause analysis:** Actually, looking at the code more carefully, `patternMatchError()` at `error-analyzer.ts:320-329` already handles `TypeError` and `ReferenceError` with `errorType: 'javascript'`. The ranker at `priority-ranker.ts:43-44` already classifies `javascript` as MEDIUM. So why is the phase plan saying these fall to LOW?

The issue is in the AGGREGATE error path. When a TypeError appears as a `consoleError` in `workflow.errors.consoleErrors` (not as a `failedStep.error`), `fallbackDiagnosis()` at line 268-278 calls `patternMatchError()` which DOES handle TypeError. But the problem is that `patternMatchError` ONLY checks for `typeerror` and `referenceerror` — it's missing `SyntaxError` and `RangeError`. And if the console error message doesn't contain those exact substrings in lowercase (e.g., a message like "Uncaught TypeError: ..."), the lowercase check at line 317 `msg.includes('typeerror')` DOES match "uncaught typeerror".

**So the ACTUAL fix needed is:**
1. Add `SyntaxError` and `RangeError` patterns to `patternMatchError()`
2. Verify that the existing patterns work for common console error formats

**Files to modify:**
- `src/analysis/error-analyzer.ts` — Add SyntaxError and RangeError patterns to `patternMatchError()`

**Acceptance criteria:**
1. `patternMatchError("SyntaxError: Unexpected token '<'")` returns `errorType: 'javascript'`, not `unknown`
2. `patternMatchError("RangeError: Maximum call stack size exceeded")` returns `errorType: 'javascript'`, not `unknown`
3. `patternMatchError("Uncaught SyntaxError: ...")` also matches (case-insensitive)
4. Existing TypeError and ReferenceError patterns still work (regression check)
5. The `summary` field for SyntaxError should be descriptive (e.g., "There's a syntax error in the code")
6. The `summary` field for RangeError should be descriptive (e.g., "The code got stuck in an infinite loop or used too much memory")
7. Both new patterns set `confidence: 'medium'` and `errorType: 'javascript'`

**Required test cases:**
```
tests/unit/error-analyzer.test.ts (ADD to existing file):
  - "diagnoses SyntaxError in console errors"
  - "diagnoses RangeError in console errors"
  - "diagnoses SyntaxError in failed steps"
  - "diagnoses RangeError in failed steps"
```

**Edge cases:**
- Error message with mixed case: "SYNTAXERROR" or "syntaxerror" — should match (already handled by `.toLowerCase()`)
- Error message that contains "syntaxerror" as substring of a longer word — unlikely in practice, acceptable false positive

**Scope boundary — OUT of scope:**
- Do NOT change how the priority ranker handles `errorType: 'javascript'` (it already maps to MEDIUM)
- Do NOT add patterns for EvalError, URIError, or other rare error types
- Do NOT modify the LLM diagnosis path (only the fallback pattern matching)

---

### Spec 2C: Surface Original Error Messages in No-API-Key Fallback

**Problem:** Without GEMINI_API_KEY, 23+ issues say "An error occurred (AI diagnosis unavailable - set GEMINI_API_KEY for detailed analysis)" with identical descriptions. The original error message IS preserved in `DiagnosedError.originalError` but the `summary` field for unrecognized errors is a static string.

**Root cause:** In `error-analyzer.ts:356-363`, the default fallback returns a generic `summary`. The original error message is available in `errorMessage` parameter but not used in the summary.

**Files to modify:**
- `src/analysis/error-analyzer.ts` — Update the default fallback in `patternMatchError()` to include the original error message in the `summary`

**Acceptance criteria:**
1. When `patternMatchError()` falls to the default case, the `summary` includes a truncated version of the actual error message
2. Format: `"{first 100 chars of error message}"` -- plain error text, no "JavaScript error:" prefix (the category column already identifies it). Truncate at 100 chars with "..." suffix if longer.
3. The `(AI diagnosis unavailable - set GEMINI_API_KEY for detailed analysis)` note moves to the `suggestedFix` field -- not in the summary
4. Total summary length is naturally capped at 103 chars max (100 + "...")
5. Error messages containing sensitive-looking data (URLs with tokens, email addresses) should NOT be filtered here — the sanitizer layer handles that downstream
6. The `errorType` remains `'unknown'` for genuinely unrecognized errors
7. The `confidence` remains `'low'` for genuinely unrecognized errors

**Required test cases:**
```
tests/unit/error-analyzer.test.ts (MODIFY existing test):
  - "falls back to unknown for unrecognized errors" — UPDATE: verify summary contains the original error text, not generic "AI unavailable" message
  - "truncates long error messages in fallback summary to 100 chars plus ellipsis"
  - "fallback summary for empty error message returns 'An unknown error occurred'"
```

**Edge cases:**
- Empty error message string: summary should be "An unknown error occurred" (not empty string)
- Very long error message (500+ chars): truncate at 100 chars with "..." suffix
- Error message with newlines: replace `\n` with space in summary

**Scope boundary — OUT of scope:**
- Do NOT change summaries for recognized patterns (TypeError, ReferenceError, etc.) — those already have good summaries
- Do NOT modify the LLM diagnosis path
- Do NOT add the original error message to the HTML report directly — it already flows through `technicalDetails`

---

### Spec 2D: Page Location Attribution

**Problem:** Most issues show "Location: Unknown" because `priority-ranker.ts` only populates location from `sourceLocation.file:line` or `executionArtifact.targetUrl`. Console errors, network failures, and broken images don't get their page URL threaded through.

**Root cause:** The `DiagnosedError` type stores `originalError` but not the page URL where the error occurred. The error analyzer's `fallbackDiagnosis()` function has access to `consoleError.url` and `networkFailure.url` but doesn't store them.

**Files to modify:**
- `src/analysis/diagnosis-schema.ts` — Add optional `pageUrl` field to `DiagnosedError` interface
- `src/analysis/error-analyzer.ts` — Populate `pageUrl` in fallback diagnosis for console errors, network failures, and broken images. Also populate in LLM path (`collectAggregateErrors` already has the URL info).
- `src/reports/priority-ranker.ts` — Use `error.pageUrl` as location fallback before falling through to `'Unknown'`

**Interface changes:**
```typescript
// In diagnosis-schema.ts, add to DiagnosedError interface:
export interface DiagnosedError extends ErrorDiagnosis {
  originalError: string;
  sourceLocation?: SourceLocation;
  screenshotRef?: string;
  pageUrl?: string;  // NEW: URL of the page where this error occurred
}
```

**Acceptance criteria:**
1. Console errors diagnosed in `fallbackDiagnosis()` have `pageUrl` set to `consoleError.url`
2. Network failures diagnosed in `fallbackDiagnosis()` have `pageUrl` set to the failing resource URL (not the page URL — but this is the best we have)
3. Broken images diagnosed in `fallbackDiagnosis()` have `pageUrl` set to the broken image URL
4. Failed workflow steps diagnosed in `fallbackDiagnosis()` have `pageUrl` set to `step.evidence?.pageUrl` when available
5. In `priority-ranker.ts`, location resolution order is: `sourceLocation.file:line` > `error.pageUrl` > `executionArtifact.targetUrl` > `'Unknown'`
6. Dead button issues use `executionArtifact.targetUrl` (already correct, no change needed)
7. Broken form issues use their existing location format (already includes URL + selector)
8. Accessibility issues use `pageAudit.url` (already correct)

**Required test cases:**
```
tests/unit/error-analyzer.test.ts (ADD):
  - "populates pageUrl for console errors in fallback diagnosis"
  - "populates pageUrl for network failures in fallback diagnosis"
  - "populates pageUrl for broken images in fallback diagnosis"
  - "populates pageUrl for failed steps with evidence"

tests/unit/priority-ranker.test.ts (ADD):
  - "uses pageUrl from diagnosed error as issue location"
  - "prefers sourceLocation over pageUrl for issue location"
  - "falls back to targetUrl when no pageUrl or sourceLocation"
```

**Edge cases:**
- `consoleError.url` is empty string: don't set `pageUrl` (let it fall through to "Unknown")
- Network failure URL is a full URL like `https://example.com/api/data` — this IS the correct location to show (it tells the user which resource failed)
- `step.evidence` is undefined (step failed without capturing evidence): `pageUrl` stays undefined

**Scope boundary — OUT of scope:**
- Do NOT add page URL tracking to the LLM diagnosis path's individual step diagnoses (those already have evidence.pageUrl in the prompt but don't store it on the result)
- Do NOT change how dead buttons or broken forms populate their locations
- Do NOT parse/transform URLs (show them as-is)

---

## Wave 3: Demo Infrastructure

### Spec 3A: `--doctor` Pre-flight CLI Command

**Problem:** No way to verify the environment is ready before running a scan. Live demo could fail due to missing browser, wrong Node version, etc.

**Files to create:**
- `src/cli/doctor.ts` — Pre-flight check logic

**Files to modify:**
- `src/cli/commander-cli.ts` — Add `--doctor` command (as a separate Commander command, not an option on the main scan command)

**Approach:** Add `afterburn doctor` as a subcommand (or `afterburn --doctor` as a standalone flag that short-circuits before the URL argument). Since Commander.js requires a URL argument for the main command, the cleanest approach is to add a separate command: `program.command('doctor')`.

Actually, looking at the Commander setup more carefully — the program uses `.argument('<url>', ...)` which makes URL required. Adding `--doctor` as an option would conflict. Better approach: check `process.argv` for `--doctor` before Commander parses, or make the `<url>` argument optional and check for `--doctor` in the action. Simplest: use `program.command('doctor')`.

**Pre-flight checks (in order):**
1. **Node.js version** >= 18 -- Use `process.versions.node`, parse major version
2. **Playwright browser installed** -- Reuse logic from `first-run.ts` (check ms-playwright cache dir for chromium-* or chromium_headless_shell-*)
3. **GEMINI_API_KEY** -- Check `process.env.GEMINI_API_KEY`. If missing, show yellow warning (not red failure) -- AI is optional
4. **Network connectivity** -- Try to resolve `dns.lookup('registry.npmjs.org')` with a 5-second timeout

NOTE: Disk space check is DROPPED. It requires platform-specific code or a new dependency, and running out of disk during a 40-second scan is extremely unlikely. 4 checks is sufficient.

**CLI syntax:** `npx afterburn doctor` (subcommand, NOT `--doctor` flag). This works because Commander.js subcommands don't require the parent command's `<url>` argument.

**Output format:**
```
Afterburn Doctor

  [PASS] Node.js v20.11.0 (>= 18 required)
  [PASS] Chromium browser installed
  [WARN] GEMINI_API_KEY not set (AI features disabled, heuristic mode will be used)
  [PASS] Network connectivity OK

All checks passed! Ready to scan.
```

Use green checkmark for PASS, yellow warning for WARN, red X for FAIL. Use chalk or ora's built-in colors.

**Acceptance criteria:**
1. `npx afterburn doctor` runs without errors and exits with code 0 when all required checks pass
2. Exit code 1 when any REQUIRED check fails (Node version, browser)
3. GEMINI_API_KEY missing is a WARNING, not a failure (exit code still 0)
4. Each check prints its status on a separate line
5. Final summary line says "All checks passed!" or "N check(s) failed."
6. `--doctor` does NOT trigger a browser download — it only checks if one exists
7. `npx afterburn doctor` works even without a URL argument
8. The doctor command completes in < 5 seconds (no long network timeouts)

**Required test cases:**
```
tests/unit/doctor.test.ts:
  - "checkNodeVersion returns pass for Node >= 18"
  - "checkNodeVersion returns fail for Node < 18"
  - "checkBrowserInstalled returns pass when chromium cache exists"
  - "checkBrowserInstalled returns fail when cache dir missing"
  - "checkApiKey returns warn when GEMINI_API_KEY not set"
  - "checkApiKey returns pass when GEMINI_API_KEY is set"
  - "runDoctor returns exit code 0 when all required checks pass"
  - "runDoctor returns exit code 1 when required check fails"
```

Note: Network and disk space checks are hard to unit test. Test the check functions individually with mocked values. The integration of all checks together is tested by the exit code tests.

**Edge cases:**
- Node version is exactly 18.0.0 — should PASS
- Playwright cache dir exists but is empty — should FAIL (no chromium found)
- GEMINI_API_KEY is set to empty string — treat as NOT set (warn)
- DNS resolution takes > 5 seconds — timeout and show WARN (not FAIL — network is nice-to-have for doctor)

**Scope boundary -- OUT of scope:**
- Do NOT check for specific Playwright version compatibility
- Do NOT auto-install anything (doctor is read-only, diagnostic only)
- Do NOT check npm/npx availability (if they got this far, npm works)
- Do NOT add disk space check (dropped -- platform-specific code, not worth the complexity)
- Do NOT support `npx afterburn --doctor` flag syntax (only the `doctor` subcommand)

---

### Spec 3B: Fix Double-Spinner Bug

**Problem:** QA observed "Generating reports..." spinner prints its success checkmark twice during CLI output. Looks unprofessional.

**Root cause analysis:** In `commander-cli.ts:79-112`, the `onProgress` callback handles stage changes. When a new stage starts, it calls `spinner.succeed()` on the previous spinner (line 89), then creates a new one. The `'complete'` stage at line 93 does NOT create a new spinner (correct), but after `runAfterburn()` returns, line 116-118 calls `spinner.succeed()` AGAIN on the last spinner (which was the `reporting` spinner). So the `reporting` spinner gets `.succeed()` called twice:
1. First at line 89 when `onProgress('complete', ...)` fires inside `runAfterburn()`
2. Second at line 116-118 after `runAfterburn()` returns

**Files to modify:**
- `src/cli/commander-cli.ts` — Guard against double-succeed on spinner

**Fix approach:** After calling `spinner.succeed()` inside the stage-change handler, set `spinner = undefined` to prevent the post-run succeed from double-firing. OR: track whether the spinner has already been completed.

**Acceptance criteria:**
1. Running `npx afterburn <url>` shows each stage spinner exactly once with one checkmark
2. The "Generating reports..." line appears exactly once with one green checkmark
3. No visual duplicates in the terminal output
4. Error case still works: if scan fails, the active spinner shows `.fail()` exactly once
5. No functional changes to the progress tracking — only cosmetic fix

**Required test cases:**
No unit tests needed — this is a cosmetic fix in a thin CLI wrapper. Verified by manual demo dry-run.

However, if we want to be thorough:
```
tests/unit/commander-cli.test.ts (NEW, optional):
  - "onProgress handler does not call succeed() twice on same spinner"
```

This test would require mocking ora, which adds complexity. Recommended: skip the unit test, verify manually during demo dry-run (Task #9).

**Edge cases:**
- What if `onProgress` is called with `'complete'` stage but spinner is already undefined? The `if (spinner)` guard at line 88 handles this.
- What if `runAfterburn` throws before the `'complete'` stage fires? The catch block at line 139-143 calls `spinner.fail()` which is correct.

**Scope boundary — OUT of scope:**
- Do NOT refactor the entire spinner/progress system
- Do NOT change the progress stage names or callback signature
- Do NOT add spinner animations or colors

---

### Spec 3C: Improve Error Messages for Common Failures

**Problem:** Error messages are technical/generic. Need plain English for vibe coders.

**Files to create:**
- `src/cli/error-formatter.ts` -- Extract error formatting into a testable pure function: `formatUserError(error: unknown, url?: string): string`. This takes the raw error and returns a user-friendly string. The CLI catch block calls this function instead of doing inline formatting.

**Files to modify:**
- `src/cli/commander-cli.ts` -- Replace inline error formatting in catch block with call to `formatUserError(error, url)`
- `src/cli/first-run.ts` -- Improve browser installation error message (already decent, minor tweak)

**Error message improvements:**

| Failure | Current Message | New Message |
|---------|----------------|-------------|
| Browser not installed | "Failed to install Chromium. Run manually: npx playwright install chromium" | "Afterburn needs a browser to test your site. Run this first:\n\n  npx playwright install chromium\n\nThis downloads Chromium (~200MB, one-time)." |
| No API key (not an error) | No message (silent fallback) | No change needed — already handled gracefully |
| Connection refused | Generic Error object message | "Can't reach {url}. Is the site running? Check the URL and try again.\n\nIf it's a local site, make sure your dev server is started." |
| Invalid URL | Validation error from `validateUrl()` | "That doesn't look like a valid URL. Try something like:\n\n  npx afterburn https://your-site.com" |
| Timeout during crawl | Generic timeout error | "The site took too long to respond. This can happen with slow servers or sites behind firewalls.\n\nTry: npx afterburn {url} --max-pages 5" |

**Acceptance criteria:**
1. Connection refused errors (ECONNREFUSED) show the user-friendly message with the URL
2. Invalid URL errors show the example command
3. Browser not found errors show the install command with context
4. All error messages end with an actionable next step
5. Error messages do NOT include stack traces unless `--verbose` is set
6. The error message pattern matching is done in the CLI catch block (not in the engine — engine throws standard errors, CLI formats them)

**Required test cases (testing the extracted `formatUserError` function directly):**
```
tests/unit/error-formatter.test.ts (NEW):
  - "formats ECONNREFUSED error with URL"
  - "formats invalid URL error with example"
  - "formats timeout error with suggestion"
  - "returns original message for unrecognized errors"
  - "handles non-Error thrown values (strings, objects)"
```

**Edge cases:**
- Error without a `.message` property (non-Error throw): use `String(error)` — already handled at line 145
- Error message containing user credentials: the URL validation already sanitizes, but double-check that the connection refused message doesn't leak `--password` flag value

**Scope boundary — OUT of scope:**
- Do NOT add retry logic for transient errors
- Do NOT add a `--retry` flag
- Do NOT modify error handling inside the engine pipeline (keep it in the CLI layer)

---

## Wave 4: Screenshot Embedding (Investigation COMPLETE + Fix)

### Spec 4A: Screenshot Embedding in HTML Reports

**Problem:** QA confirmed HTML reports do NOT show evidence screenshots despite the engine having screenshot capture capability.

**Root cause (CONFIRMED by builder investigation):**

The end-to-end wiring is correct:
`ScreenshotManager.capture()` -> `ErrorEvidence.screenshotRef` -> `error-analyzer.ts` extracts `.pngPath` -> `PrioritizedIssue.screenshotRef` -> `html-generator.ts loadScreenshotAsBase64()` -> base64 data URI -> `report.hbs` renders `<img>`.

The gap is that screenshots are ONLY captured on step FAILURE (`evidence-capture.ts:20-23` called from `workflow-executor.ts:167-170` only when `result.status === 'failed'`). This means zero screenshots for:
1. **Aggregate errors** (console errors, network failures, broken images) — diagnosed without screenshots
2. **Dead buttons** — `priority-ranker.ts:68` explicitly sets `screenshotRef: undefined`
3. **Broken forms** — `priority-ranker.ts:84` explicitly sets `screenshotRef: undefined`
4. **Accessibility violations** — never have screenshots
5. **UI audit issues** — only get screenshots if vision LLM ran (requires GEMINI_API_KEY)

**Fix approach: Option B (page-level screenshot after each workflow)**

Add a single screenshot capture after each workflow completes (regardless of pass/fail). Store the screenshot ref keyed by page URL on the `WorkflowExecutionResult`. Then wire it through to the priority ranker for issues that lack their own screenshot.

This is LOWER risk than Option A (screenshot at every navigation) because:
- Only adds ONE screenshot call per workflow (not per step)
- Does not modify the step execution loop
- Does not change the failure evidence capture flow
- Page is still open in the `finally` block area — but actually NO, the page closes in `finally`. So the screenshot must be captured BEFORE the finally block, after the step loop completes.

**Files to modify:**
- `src/types/execution.ts` — Add optional `pageScreenshotRef?: string` to `WorkflowExecutionResult`
- `src/execution/workflow-executor.ts` — Capture page screenshot after step loop (line ~202, before `finally`), store on result
- `src/reports/priority-ranker.ts` — When creating issues from dead buttons, broken forms, and accessibility violations, look up a matching page screenshot from `executionArtifact.workflowResults` by URL
- `src/reports/html-generator.ts` — No changes needed (already handles screenshotRef)
- `templates/report.hbs` — No changes needed (already renders screenshotDataUri)

**Interface change:**
```typescript
// In execution.ts, add to WorkflowExecutionResult:
export interface WorkflowExecutionResult {
  // ... existing fields ...
  pageScreenshotRef?: string;  // NEW: screenshot of the page at end of workflow (PNG path)
}
```

**Screenshot lookup logic in priority-ranker.ts:**
```typescript
// Helper: find a page screenshot for a given URL from workflow results
function findPageScreenshot(url: string, workflowResults: WorkflowExecutionResult[]): string | undefined {
  for (const workflow of workflowResults) {
    if (workflow.pageScreenshotRef && /* workflow visited this URL */) {
      return workflow.pageScreenshotRef;
    }
  }
  return undefined;
}
```

The URL matching is approximate: check if the `executionArtifact.targetUrl` matches or if any step in the workflow navigated to a URL containing the issue's location. For dead buttons and broken forms, use `executionArtifact.targetUrl` as the lookup key since they're associated with the target URL.

**Acceptance criteria:**
1. After a workflow completes, a page screenshot is captured and stored as `pageScreenshotRef` on the `WorkflowExecutionResult`
2. Dead button issues in the HTML report show the page screenshot from the workflow that detected them
3. Broken form issues in the HTML report show the page screenshot from the workflow that detected them
4. Failed step issues STILL use their own failure-specific screenshot (not the page screenshot) — the step evidence screenshot takes priority
5. If screenshot capture fails (e.g., page already closed), `pageScreenshotRef` is `undefined` — graceful degradation
6. Screenshots are displayed as inline base64 WebP images (already handled by `loadScreenshotAsBase64`)
7. Screenshots are resized to max 768px width (already handled)
8. Markdown report is NOT affected (Markdown doesn't embed images)
9. At least ONE screenshot appears in the HTML report when scanning a site with dead buttons or broken forms

**Required test cases:**
```
tests/unit/priority-ranker.test.ts (ADD to existing):
  - "uses pageScreenshotRef from workflow result for dead button issues"
  - "uses pageScreenshotRef from workflow result for broken form issues"
  - "prefers step-level screenshotRef over page-level screenshot for diagnosed errors"

tests/unit/html-generator.test.ts (NEW):
  - "includes screenshot img tag when screenshotRef points to valid file"
  - "omits screenshot when screenshotRef is undefined"
  - "omits screenshot when screenshotRef points to missing file"
```

Note: html-generator tests need to mock `sharp` and `fs.existsSync` to avoid needing actual image files.

**Edge cases:**
- Screenshot file exists but is corrupt (0 bytes): `sharp` will throw, caught by `loadScreenshotAsBase64` try/catch -> returns `undefined` (graceful)
- Page navigated away during workflow and final URL is different from targetUrl: screenshot captures whatever page is showing — this is acceptable
- Multiple workflows produce different page screenshots for the same URL: use the FIRST one found (deterministic)
- Very large screenshot (> 5MB): resize + quality reduction already handles this

**Scope boundary — OUT of scope:**
- Do NOT add screenshots at every navigation step (too many screenshots, bloats report)
- Do NOT add screenshot capture for accessibility violation pages (would require re-navigating to those pages)
- Do NOT optimize for duplicate screenshots across issues (premature optimization)
- Do NOT modify the Markdown report to include screenshots
- Do NOT change the failure evidence capture flow (`evidence-capture.ts` stays untouched)

---

## README Polish

### Spec R1: Known Limitations Section

**Problem:** README lacks honest limitations section. Builds trust with judges and prevents surprises.

**Files to modify:**
- `README.md` — Expand existing "Known Limitations" section (it already exists at line 104-109 but needs refinement per demo script)

**Content (exact text):**
The existing section is close but needs these adjustments:
1. Reword "Static sites only" — SPA detection IS implemented (6 frameworks detected), the limitation is about complex client-side routing, not static-only
2. Add "desktop viewport only" limitation
3. Keep it to 4-5 bullet points max

**Acceptance criteria:**
1. "Known Limitations" section exists in README.md
2. Contains 4-5 bullet points
3. Mentions: first-run browser download, visual analysis requires API key, SPA support is experimental, desktop viewport only
4. Tone is honest but not apologetic (per demo script: "don't apologize for limitations")
5. No bullet point exceeds 2 lines of text

**Required test cases:** None (documentation change).

**Scope boundary — OUT of scope:**
- Do NOT add more than 5 limitations (diminishing returns, looks negative)
- Do NOT link to external docs or roadmap from limitations section

---

### Spec R2: Comparison Table

**Problem:** Judges will ask "why not use Lighthouse?" Need a clear differentiator table.

**Files to modify:**
- `README.md` — Add new "How is this different?" section after "Known Limitations"

**Table structure:**

| Feature | Afterburn | Lighthouse | axe-core | mabl |
|---------|-----------|------------|----------|------|
| Zero config (no test writing) | Yes | Yes | Needs integration | No |
| Crawls entire site | Yes | Single page | No | Yes |
| Form filling & submission testing | Yes | No | No | Yes |
| Dead button detection | Yes | No | No | No |
| Plain English reports | Yes | Partial | No | Yes |
| AI report for coding tools | Yes | No | No | No |
| Free & open source | Yes | Yes | Yes | No |
| CI/CD integration | GitHub Action | CI plugin | CI plugin | SaaS |

**Acceptance criteria:**
1. Section titled "## How is this different?" exists in README.md
2. Table has exactly 8 rows (feature rows) + header
3. Compares against Lighthouse, axe-core, and mabl (at minimum)
4. Every cell is "Yes", "No", "Partial", or a short phrase (< 20 chars)
5. Afterburn column shows "Yes" for at least 6 of 8 features
6. Table renders correctly in GitHub Markdown preview (no broken pipes)
7. No feature claims are false or misleading

**Required test cases:** None (documentation change).

**Edge cases:**
- Mabl pricing may change — don't claim specific pricing, just "No" for free/open-source
- Lighthouse does have some performance suggestions in English — "Partial" is fair for plain English reports

**Scope boundary — OUT of scope:**
- Do NOT include Playwright Test Generator in the comparison (different tool category)
- Do NOT include pricing columns (would require research and could become outdated)
- Do NOT add feature comparison for things Afterburn doesn't do (e.g., "Mobile testing: No" — don't highlight weaknesses)

---

## Integration Notes

### Pipeline integration point for dedup
The `deduplicateIssues()` function should be called in THREE places:
1. `src/reports/html-generator.ts` -- After `prioritizeIssues()`, before template rendering. Pass `deduplicatedIssues.length` as the `totalIssues` template variable (not `executionArtifact.totalIssues`).
2. `src/reports/markdown-generator.ts` -- After `prioritizeIssues()`, before report string generation. Use `deduplicatedIssues.length` for YAML `total_issues` and summary table "Total Issues".
3. `src/core/engine.ts` -- After `prioritizeIssues()`, before returning `AfterBurnResult`. Set `totalIssues: deduplicatedIssues.length` and compute priority counts from the deduped list.

This ensures all three consumers (HTML report, Markdown report, engine result returned to CLI/MCP/Action) see deduplicated issues AND consistent counts.

**Count flow after fix:**
```
ExecutionArtifact.totalIssues (raw, inflated) --> health-scorer.ts ONLY
deduplicatedIssues.length (clean)             --> CLI, HTML report, MD report, AfterBurnResult
```

### Test run verification
After all Wave 2 changes land, run `npm test` and verify:
- All existing 155 tests still pass
- New dedup tests pass
- New error-analyzer tests pass
- New priority-ranker tests pass
- `tsc --noEmit` compiles clean

### Demo dry-run verification
After all changes land, run against test site and verify:
- Issue count drops from ~86 to ~20
- No "AI diagnosis unavailable" generic messages (original errors surface)
- TypeErrors appear as MEDIUM priority
- Issue locations show page URLs instead of "Unknown"
- HTML report shows deduplicated issues with "(found N times)" badges
- Doctor command works: `npx afterburn doctor`
- No double-spinner in terminal output

---

## Change Summary

| Spec | Files Modified | Files Created | Tests Added |
|------|---------------|---------------|-------------|
| 2A Dedup | priority-ranker.ts, html-generator.ts, markdown-generator.ts, report.hbs, engine.ts | deduplicator.test.ts | 12 |
| 2B Error Elevation | error-analyzer.ts | — | 4 |
| 2C Error Messages | error-analyzer.ts | — | 3 |
| 2D Location | diagnosis-schema.ts, error-analyzer.ts, priority-ranker.ts | — | 7 |
| 3A Doctor | commander-cli.ts | doctor.ts, doctor.test.ts | 8 |
| 3B Spinner Fix | commander-cli.ts | — | 0 (manual) |
| 3C Error Msgs | commander-cli.ts, first-run.ts | error-formatter.ts, error-formatter.test.ts | 5 |
| 4A Screenshots | execution.ts, workflow-executor.ts, priority-ranker.ts | html-generator.test.ts | 6 |
| R1 Limitations | README.md | — | 0 |
| R2 Comparison | README.md | — | 0 |
| **TOTAL** | **~12 files** | **~4 files** | **~45 tests** |
