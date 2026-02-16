# Afterburn UX Brainstorm

Deep-dive on how to make Afterburn dramatically better -- the CLI experience, the reports, the workflow loop, new capabilities, and the overall product vision.

---

## 1. Close the Loop: `afterburn fix` (The Single Biggest Win)

Right now the workflow is: scan -> open markdown file -> copy-paste into AI -> AI fixes -> rescan. That's too many manual steps for a tool targeting people who vibe-code.

**Proposal: `afterburn fix`**

```bash
npx afterburn-cli fix https://your-site.com --source ./src
```

This would:
1. Run the normal scan
2. Pipe the markdown report directly into Claude/Cursor/ChatGPT via MCP or API
3. Apply the fixes to the source code automatically
4. Re-scan to verify the fixes worked
5. Print a before/after diff

The user goes from "my site has bugs" to "my site is fixed" in one command. The entire copy-paste-into-AI step disappears. This turns Afterburn from a *reporting tool* into a *fixing tool*.

**Implementation options:**
- Use the existing MCP server to call back into an AI assistant
- Add a `--fix` flag that uses Claude API directly (requires `ANTHROPIC_API_KEY`)
- Generate a git patch file that the user can `git apply`
- At minimum: auto-open the report in the user's `$EDITOR` or browser

**Even simpler first step:** `afterburn fix` could just run the scan and then do `pbcopy` / `xclip` of the markdown report to clipboard, so the user just pastes into their AI tool. One less file-open step.

---

## 2. Watch Mode: Continuous Scanning During Development

Developers don't just scan once. They're iterating. A watch mode that re-scans on file changes would be huge.

```bash
npx afterburn-cli watch https://localhost:3000 --source ./src
```

**Behavior:**
- Initial full scan
- Watch `--source` directory for file changes
- On change: wait for rebuild (detect via HTTP polling or `--wait-for` flag), then re-scan only affected pages
- Show a live-updating terminal dashboard with health score trending up/down
- Diff-style output: "Fixed: dead button on /contact. New: console error on /pricing."

This turns Afterburn into a **continuous testing companion** rather than a one-shot tool. Think of it like `jest --watch` but for your deployed site.

---

## 3. Interactive HTML Report (Make It a Real Dashboard)

The current HTML report is static and read-only. Make it interactive:

### 3a. Filterable/Sortable Issue List
- Click column headers to sort by priority, category, page
- Toggle filters: show only HIGH, only accessibility, only a specific page
- Search bar to find issues by keyword

### 3b. Screenshot Viewer with Annotations
- Click a screenshot to expand it full-size
- Overlay red boxes on the exact element that's broken (you already have selectors)
- Side-by-side: "what we expected" vs "what happened"

### 3c. One-Click Copy for AI
- A "Copy report for AI" button that copies a well-formatted markdown version to clipboard
- A "Copy this issue" button per-issue for targeted fixes
- Pre-formatted prompts: "Fix this accessibility violation in my React codebase"

### 3d. Trend View (Multi-Scan History)
- If multiple reports exist in `afterburn-reports/{domain}/`, show a health score trend line
- "Your health score went from 52 -> 68 -> 81 over the last 3 scans"
- This gives developers a sense of progress and momentum

### 3e. Dark Mode
- Respect `prefers-color-scheme` or add a toggle
- Developers live in dark mode -- a bright white report feels jarring

---

## 4. CLI Output Improvements

### 4a. Site Map Visualization in Terminal
The README shows a tree-style site map, but the actual CLI doesn't print it. This is a missed opportunity -- seeing the structure of your site as a tree is immediately useful and visually satisfying.

```
Site Map:
Credibly - Transform Testimonials into Trust (/)
+-- Blog (/blog)
|   +-- How to Ask for Testimonials (/blog/how-to-ask)
|   +-- Video vs Text Testimonials (/blog/video-vs-text)
+-- Pricing (/pricing)
+-- Tools (/tools)
    +-- Wall of Love Generator (/tools/wall-of-love)
```

Print this after discovery, before execution. It reassures the user that Afterburn found their whole site.

### 4b. Real-Time Progress Per Workflow
Right now the spinner just says "Testing workflows..." -- it should show what's actually happening:

```
Testing workflows...
  [1/4] Homepage hero CTA flow          [PASS]
  [2/4] Contact form submission          [RUNNING] Filling email field...
  [3/4] Pricing page navigation          [PENDING]
  [4/4] Blog search                      [PENDING]
```

This makes the wait feel productive and helps debug when things hang.

### 4c. Summary with Context
Instead of just "8 issues found", give context:

```
Health: 72/100 (needs work)

Compared to typical sites we scan:
  - Your form completion rate is below average
  - Accessibility score is above average
  - No critical JavaScript errors (nice!)

8 issues found (2 high, 3 medium, 3 low)
```

### 4d. Auto-Open Report
After scan completes, offer to open the HTML report:

```
Reports saved:
  HTML:     afterburn-reports/credibly-org/credibly-org-2026-02-15.html
  Markdown: afterburn-reports/credibly-org/credibly-org-2026-02-15.md

Open HTML report in browser? [Y/n]
```

Or with `--open` flag, auto-open it.

### 4e. Color-Coded Priority in Terminal
Use ANSI colors more aggressively:
- RED for HIGH priority issues
- YELLOW for MEDIUM
- DIM/GRAY for LOW
- GREEN checkmark for passed workflows
- Bold for page paths

Makes the terminal output scannable at a glance.

---

## 5. Config File Support: `.afterburnrc`

Power users will want to avoid typing the same flags every time. Support a config file:

```json
// .afterburnrc.json
{
  "url": "https://staging.myapp.com",
  "source": "./src",
  "flows": ["signup", "checkout", "profile edit"],
  "maxPages": 30,
  "email": "${AFTERBURN_EMAIL}",
  "ignore": [
    "meta-description-length",
    "/admin/*"
  ]
}
```

Then running `npx afterburn-cli` with no args reads from the config. This is standard for CLI tools (ESLint, Prettier, etc.) and dramatically improves repeat usage.

### 5a. Ignore Rules
The `ignore` field is critical. Users will always have issues they don't care about (SEO warnings on internal tools, accessibility issues on admin panels, etc.). Without ignore rules, the signal-to-noise ratio degrades over time and users stop looking at reports.

```json
{
  "ignore": {
    "rules": ["seo-meta-description", "seo-og-tags"],
    "paths": ["/admin/*", "/internal/*"],
    "patterns": ["*testimonial*"]
  }
}
```

---

## 6. Smarter Test Intelligence

### 6a. Learn From Previous Scans
Store scan results and use them to inform future scans:
- Don't re-test workflows that passed last time (unless `--full`)
- Focus on pages that had issues before
- Detect regressions: "This form was working last scan, now it's broken"
- Track flaky tests and automatically re-run them

### 6b. Custom Assertions
Let users define their own checks:

```json
{
  "assertions": [
    { "page": "/pricing", "exists": "button:text('Start Free Trial')" },
    { "page": "/", "no-console-errors": true },
    { "page": "/api/health", "status": 200 }
  ]
}
```

This bridges the gap between "zero config" and "I need specific checks" without requiring a full test framework.

### 6c. Smart Form Filling
The current test-data generation is heuristic. Improve it:
- Detect field validation patterns (email format, phone format, zip code)
- Use realistic data that matches the field context (not just "test@example.com" but data that actually exercises validation)
- Remember which form data caused failures and try alternatives
- Support multi-step forms (wizard flows) with state persistence

### 6d. Authentication Flow Intelligence
Currently auth is email/password only. Support:
- OAuth flows (detect and suggest "use --email for OAuth testing")
- Magic link auth (detect the pattern, explain the limitation)
- Multi-factor auth (detect and skip gracefully)
- Session persistence across workflows (login once, test everything)

---

## 7. Performance: Make It Faster

### 7a. Parallel Page Testing
Currently pages are tested sequentially. Test multiple pages in parallel with browser contexts:
- Spin up N browser contexts (default 3)
- Each context handles one workflow
- Massive speedup on sites with many pages
- `--parallel <n>` flag to control concurrency

### 7b. Incremental Scanning
Only scan pages that changed since last scan:
- Compare discovered page hashes against previous scan
- Only re-execute workflows for changed pages
- Report: "Scanned 3 changed pages (skipped 47 unchanged)"
- `--full` flag to force a complete rescan

### 7c. Lightweight Mode
A `--quick` flag that skips expensive checks:
- Skip accessibility auditing
- Skip SEO checks
- Skip performance measurement
- Only check: do forms work? do buttons work? any JS errors?
- Target: under 30 seconds for most sites

---

## 8. Better Error Intelligence

### 8a. Error Grouping and Deduplication
Currently every instance of the same error is a separate issue. Group them:
- "Console error: Failed to fetch /api/analytics" appears on 12 pages -> show once with "Affects 12 pages"
- Group similar accessibility violations: "Missing alt text on images" -> one issue with a count
- This is partially implemented already with `deduplicateIssues` but could be more aggressive

### 8b. Root Cause Chains
Don't just show the error -- show the chain:
```
ROOT CAUSE: API endpoint /api/leads returns 500
  -> fetch() in homepage.js throws
  -> Lead capture form shows "Something went wrong"
  -> Users cannot submit the lead form
```

This helps developers fix the actual problem, not the symptom.

### 8c. Fix Confidence Scoring
Rate how confident we are in each fix suggestion:
- HIGH confidence: "Add alt text to img element" (mechanical fix)
- MEDIUM confidence: "API returning 500 -- check server logs" (we know the symptom but not the server-side cause)
- LOW confidence: "Button click handler may have a race condition" (speculative)

This helps developers prioritize which fixes to trust and which to investigate manually.

---

## 9. New Capabilities

### 9a. Mobile Viewport Testing (Already Planned)
Run every test at multiple viewport sizes:
- Desktop (1920x1080)
- Tablet (768x1024)
- Mobile (375x812)
- Report issues per viewport: "Button overlaps text on mobile"

### 9b. Link Checking on Steroids
Currently checks HTTP status. Go further:
- Check for soft 404s (page returns 200 but shows "not found" content)
- Check external links (with rate limiting)
- Check anchor links (#fragment) actually scroll to an element
- Check mailto: and tel: links are well-formed

### 9c. Security Scanning (Light)
Don't try to be a full security scanner, but catch the low-hanging fruit:
- Mixed content (HTTP resources on HTTPS pages)
- Missing security headers (CSP, X-Frame-Options, etc.)
- Exposed source maps in production
- Open redirects in links
- Forms submitting over HTTP

### 9d. Console Log Audit
Beyond errors, audit console.log usage:
- Flag `console.log` statements left in production (these are debug leftovers)
- Flag deprecation warnings from frameworks
- Flag warnings from React (key prop, etc.)

### 9e. Broken Dependency Detection
Detect common broken CDN/dependency patterns:
- jQuery loaded but not used
- Multiple versions of React
- Failed script loads from CDNs
- Outdated library versions with known vulnerabilities (check against public DBs)

---

## 10. Developer Experience Polish

### 10a. `afterburn init`
A setup wizard that creates `.afterburnrc.json`:
```
$ npx afterburn-cli init
? What URL do you want to scan? > https://staging.myapp.com
? Where is your source code? > ./src
? Any specific flows to test? > signup, checkout
? Enable CI/CD integration? > Yes (GitHub Actions)

Created .afterburnrc.json
Created .github/workflows/afterburn.yml

Run `npx afterburn-cli` to start your first scan.
```

### 10b. `afterburn diff`
Compare two scan reports and show what changed:
```bash
npx afterburn-cli diff report-old.html report-new.html
```
```
+ FIXED: Dead button "Get Started" on /
+ FIXED: Missing alt text on /about (3 images)
- NEW:   Console error on /pricing (TypeError: Cannot read property...)
= UNCHANGED: Form submission broken on /contact (still failing)

Health: 52 -> 68 (+16)
```

### 10c. JSON Output Mode
For programmatic consumption:
```bash
npx afterburn-cli https://your-site.com --format json
```
Returns structured JSON that can be piped into other tools, dashboards, or CI/CD scripts.

### 10d. Exit Code Granularity
Currently: 0 = pass, 1 = issues found. Make it more granular:
- 0 = no issues
- 1 = only low-priority issues
- 2 = medium-priority issues found
- 3 = high-priority issues found
- Or better: `--fail-on <level>` flag (already exists in GH Action, bring to CLI)

### 10e. Baseline Support
"I know about these 5 issues and I'm not fixing them yet. Don't fail CI for them."
```bash
npx afterburn-cli https://your-site.com --baseline ./afterburn-baseline.json
```
First run creates the baseline. Subsequent runs only fail on NEW issues. This is crucial for adoption on existing sites with known issues.

---

## 11. Report Format Improvements

### 11a. Issue Categories That Match How Developers Think
Rename categories from technical jargon to action-oriented language:
- "Workflow Error" -> "Broken User Flow"
- "Console Error" -> "JavaScript Crash"
- "Network Failure" -> "API/Server Error"
- "Accessibility Violation" -> "Accessibility Gap"
- "SEO Issue" -> "Search Visibility Issue"

### 11b. "Impact Score" Per Issue
Instead of just HIGH/MEDIUM/LOW, estimate user impact:
- "This affects the signup flow. If 1000 users visit/day, ~200 would hit this bug."
- "This accessibility issue affects screen reader users (~2% of web traffic)."
- Even rough estimates make prioritization much more concrete.

### 11c. Grouped Fixes
"These 4 issues are all caused by the same missing CSS file" or "These 3 accessibility violations can all be fixed by adding a single ARIA attribute."

Group issues by fix, not just by page. This helps developers batch their work.

### 11d. Code Snippets in Reports
When `--source` is used and we can map to source code, include the relevant code snippet directly in the report:

```markdown
### Issue #1: Form submission broken on /contact

**Source:** `src/components/ContactForm.tsx:42`

```tsx
// Line 42: The onSubmit handler catches the error but doesn't show it to the user
const handleSubmit = async (data) => {
  try {
    await submitForm(data);
  } catch (e) {
    // BUG: Error is swallowed silently
  }
};
```

**Suggested fix:** Add error state handling in the catch block.
```

---

## 12. Ecosystem and Integration

### 12a. VS Code Extension
Show Afterburn results directly in the editor:
- Inline annotations on files with mapped issues
- A sidebar panel showing the issue list
- Click an issue to jump to the source location
- Re-scan button in the status bar

### 12b. Slack/Discord Notifications
After a CI/CD scan, post results to a channel:
```
Afterburn: staging.myapp.com scored 68/100 (was 72)
  2 new issues found, 1 fixed
  See full report: [link]
```

### 12c. Dashboard SaaS (Long-Term)
A hosted dashboard where teams can:
- See scan history across all their sites
- Set up scheduled scans
- Get alerts when health score drops
- Compare branches/environments
- Team-level analytics ("Most common issue types across all our sites")

This is the monetization path: free CLI, paid dashboard.

---

## 13. Onboarding and First-Run Experience

### 13a. Post-Scan "What's Next" Guide
After the first scan, print a contextual guide:
```
Your first scan is done! Here's what to do:

1. Open the HTML report to see issues visually:
   open afterburn-reports/mysite/mysite-2026-02-16.html

2. Copy the markdown report into Claude or Cursor to auto-fix:
   cat afterburn-reports/mysite/mysite-2026-02-16.md | pbcopy

3. Re-scan after fixing to verify:
   npx afterburn-cli https://your-site.com

4. Set up CI/CD to catch issues automatically:
   npx afterburn-cli init --ci

Run with --verbose next time to see exactly what Afterburn is doing.
```

### 13b. Example Reports
Ship example reports in the repo so people can see what they'll get before running a scan. Link to them from the README.

### 13c. Playground URL
Maintain a public intentionally-broken site that people can scan to see Afterburn in action:
```bash
# Try it right now -- this site has intentional bugs for demo purposes
npx afterburn-cli https://demo.afterburn.dev
```

---

## Priority Ranking (What to Build First)

| Priority | Feature | Impact | Effort |
|----------|---------|--------|--------|
| P0 | Config file (`.afterburnrc`) + ignore rules | Enables repeat usage | Medium |
| P0 | Site map tree in CLI output | Immediate UX win, nearly free | Low |
| P0 | Color-coded priority + real-time workflow progress | Makes CLI output 10x more readable | Low |
| P0 | `--open` flag to auto-open HTML report | Removes friction | Low |
| P1 | `--fail-on` flag in CLI (already in GH Action) | Unblocks CI adoption | Low |
| P1 | Interactive HTML report (filter/sort/copy) | Makes reports actually usable | Medium |
| P1 | `afterburn init` setup wizard | Smooths onboarding | Medium |
| P1 | Baseline support (`--baseline`) | Unblocks adoption on existing sites | Medium |
| P1 | Dark mode in HTML report | Table stakes for developer tools | Low |
| P2 | Watch mode | Game-changer for dev workflow | High |
| P2 | `afterburn fix` (clipboard copy as v1) | Closes the loop | Medium |
| P2 | `afterburn diff` (compare scans) | Makes progress visible | Medium |
| P2 | Parallel page testing | Major perf improvement | High |
| P2 | Mobile viewport testing | Already planned, high value | Medium |
| P2 | JSON output mode | Enables ecosystem integrations | Low |
| P3 | VS Code extension | Tight editor integration | High |
| P3 | Incremental scanning | Perf optimization for large sites | High |
| P3 | Light security scanning | Broadens value prop | Medium |
| P3 | Dashboard SaaS | Monetization path | Very High |

---

## Summary

The biggest theme across all of these ideas: **reduce friction in the scan-fix-rescan loop.** Afterburn already does the hard part (finding bugs). The opportunity is in making every step around that faster and smoother:

1. **Before scanning:** Config files, init wizard, sensible defaults
2. **During scanning:** Better progress output, watch mode, parallel execution
3. **After scanning:** Interactive reports, auto-open, clipboard copy, trend tracking
4. **Fixing:** Direct AI integration, baseline support, diff between scans
5. **In CI/CD:** fail-on thresholds, Slack alerts, PR comments (already done)

The north star: a developer runs `npx afterburn-cli` and their site gets better automatically.
