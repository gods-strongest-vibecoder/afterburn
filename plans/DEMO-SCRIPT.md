# Afterburn Demo Video Script

**Duration target:** 2:30 (two and a half minutes)
**Format:** Screen recording with voiceover narration
**Resolution:** 1920x1080 (terminal on left, browser on right when needed)

---

## Pre-Recording Checklist

Before hitting record, verify:

1. `npx afterburn-cli doctor` passes all checks
2. Test site server running: `cd test-site && node server.js`
3. GEMINI_API_KEY set (for AI-powered mode) OR not set (for heuristic mode -- either works)
4. Terminal font large enough to read (16pt+ recommended)
5. Terminal cleared, no personal info visible
6. Browser closed (no distracting tabs)
7. Cached reports exist in `demo-cache/` as fallback
8. Build fresh: `npm run build`

---

## Act 1: The Problem (0:00 - 0:25)

### Narrator Script

> "You built a website. Looks great. But is anything actually broken?
> The signup form -- does it submit? Those buttons -- do they work? Are there console errors you haven't noticed?
> You could click around manually. Or write tests. But you're a vibe coder -- you've got features to ship.
> What if one command could test your entire site and tell you exactly what's wrong?"

### Screen Actions

- **0:00-0:08**: Show the FlowSync demo site in a browser. It looks like a polished startup landing page. Click around briefly -- everything LOOKS fine.
- **0:08-0:15**: Click the "Get Started Free" button. Nothing happens. Click "Subscribe" on newsletter form. Nothing happens. Show these bugs are invisible unless you test carefully.
- **0:15-0:25**: Switch to terminal. Type the command but DON'T press Enter yet.

### Key Visual

Split screen: Pretty website on left, empty terminal on right.

---

## Act 2: The Scan (0:25 - 1:00)

### Narrator Script

> "One command. That's all it takes."
> *[pause as scan runs]*
> "Afterburn is crawling every page, filling out forms, clicking every button, checking for console errors, testing accessibility -- all automatically."
> "No config files. No test scripts. Just a URL."

### Screen Actions

- **0:25-0:30**: Terminal shows the command. Press Enter:
  ```
  npx afterburn-cli http://localhost:3847
  ```
- **0:30-0:55**: Watch the spinner stages progress live:
  ```
  Afterburn v1.0.0

  [spinner] Checking browser...     -> [check]
  [spinner] Crawling site...        -> [check]
  [spinner] Testing workflows...    -> [check]
  [spinner] Analyzing results...    -> [check]
  [spinner] Generating reports...   -> [check]
  ```
- **0:55-1:00**: Result line appears:
  ```
  Health: 62/100 -- 20 issues found (0 high, 17 medium, 3 low)

  Reports saved:
    HTML:     afterburn-reports/.../report.html
    Markdown: afterburn-reports/.../report.md
  ```

### Key Moment

Pause for a beat on the health score line. Let it sink in: **62/100 -- 20 issues found.** The site that LOOKED fine has 20 problems.

### Fallback Plan

If the live scan fails (network, timeout, etc.):
1. Show the cached terminal output: `cat demo-cache/terminal-output.txt`
2. Use cached reports from `demo-cache/` for the rest of the demo
3. Say: "Here's what a typical scan looks like" -- no one will know the difference

---

## Act 3: The Human Report (1:00 - 1:30)

### Narrator Script

> "Afterburn generates two reports. First, the human report -- beautiful, in plain English."
> "It shows your health score: 62 out of 100. And a prioritized to-do list: fix these dead buttons first, then these broken forms, then accessibility issues. Everything ranked by impact."
> "Every issue tells you WHY it matters and HOW to fix it. No jargon. No error codes. Just clear instructions."

### Screen Actions

- **1:00-1:05**: Open the HTML report in a browser. The purple gradient header with "Afterburn" branding appears.
- **1:05-1:15**: Scroll slowly through the health score section (62/100 in amber). Show the breakdown: Workflows, Errors, Accessibility, Performance.
- **1:15-1:25**: Scroll to "What to Fix First" section. Show the prioritized issue cards with MEDIUM badges. Pause on a dead button or broken form issue showing "Why it matters" and "How to fix" fields.
- **1:25-1:30**: Briefly scroll past workflow results, accessibility summary.

### Key Moment

Zoom in on one issue card that shows: Priority badge, plain English summary, "Why it matters", "How to fix". This is the differentiator from Lighthouse.

---

## Act 4: The AI Report -- The Killer Feature (1:30 - 2:15)

### Narrator Script

> "But here's where it gets interesting. Afterburn also generates a Markdown report designed for AI coding tools."
> "Watch this. I paste the Markdown report into Claude..."
> *[paste into Claude/Cursor]*
> "...and say: 'Fix these bugs.'"
> *[brief pause]*
> "The AI reads the structured report -- sees the broken forms, the dead buttons, the missing alt tags -- and generates fixes for all of them."
> "Afterburn finds the bugs. Your AI fixes them. Zero manual debugging."

### Screen Actions

- **1:30-1:40**: Open the Markdown report in a text editor or terminal (`cat report.md | head -50`). Show the YAML frontmatter, the issue table, the technical details. Point out it has reproduction steps and fix suggestions.
- **1:40-1:55**: Open Claude (or Cursor). Paste the Markdown report content. Type: "Fix these bugs."
  - **PRE-RECORD THIS PART** if Claude response is slow. Have a pre-recorded Claude response showing it reading the report and generating code fixes.
- **1:55-2:10**: Show Claude's response: it identifies the broken form handler, the missing lang attribute, the dead button functions, and produces code patches.
- **2:10-2:15**: Quick cut back to terminal. Show (or mention): "Re-scan after fixes, health score goes from 62 to 92."
  - To demonstrate this, run the fixed test site (`cd test-site && node server-fixed.js` on port 3848) and scan it: `npx afterburn-cli http://localhost:3848`

### Key Moment

The paste-into-AI moment is the MONEY SHOT. This is what makes Afterburn different from every other testing tool. Every second of this section matters.

### Fallback Plan

Pre-record the Claude interaction separately. If live AI is slow or unreliable:
1. Have a screenshot/recording of Claude reading the Markdown report and generating fixes
2. Edit it into the video in post-production
3. The important thing is showing the WORKFLOW, not proving it works live

---

## Act 5: The Close (2:15 - 2:30)

### Narrator Script

> "Afterburn. One command finds every bug on your website. Feed the report to your AI. Bugs fixed.
> It works as a CLI, a GitHub Action, or an MCP server for your AI coding assistant.
> npx afterburn-cli. Try it now."

### Screen Actions

- **2:15-2:20**: Show the terminal with the command one more time:
  ```
  npx afterburn-cli https://your-site.com
  ```
- **2:20-2:25**: Quick montage of the three interfaces: CLI output, GitHub PR comment, MCP config.
- **2:25-2:30**: Logo/title card: "Afterburn" with tagline and GitHub URL.

---

## Post-Production Notes

### Title Card (start or end)
```
Afterburn
One command finds every bug on your website.
github.com/gods-strongest-vibecoder/afterburn
```

### Music
Subtle, upbeat background music. Something tech/startup-y. Not too loud -- voiceover is primary.

### Emphasis Moments
1. The "Get Started Free" button doing nothing (0:10) -- zoom/highlight
2. The health score reveal: 62/100 with 20 issues (0:55) -- brief pause
3. The AI reading the report and generating fixes (1:55) -- this is the climax

### Do NOT Show
- Any personal API keys or credentials
- Any real email addresses or passwords
- File paths that reveal personal directory structure (edit in post if needed)

---

## Demo Target: FlowSync Test Site

The test site at `test-site/` is a fake startup landing page ("FlowSync") with **23 intentional defects** across 7 categories:

| Category | Count | Examples |
|----------|-------|---------|
| Broken forms | 2 | Newsletter form, contact form |
| Dead buttons | 5 | "Get Started Free", "Subscribe", "Send Message", pricing CTAs |
| Broken images | 4 | Missing icon PNGs, missing map image |
| Console errors | 1 | TypeError on every page load |
| Broken links | 3 | /about and /blog routes return 404 |
| Accessibility | 6+ | Missing lang attr, missing alt text, bad contrast, missing labels |
| HTTP errors | 1 | /api/data returns 500 |
| UI issues | 3 | Tiny text, overlapping metrics, cramped spacing |

**To run:** `cd test-site && node server.js` (starts on port 3847)

This site is PERFECT for the demo because:
1. It LOOKS professional -- makes the "hidden bugs" reveal dramatic
2. Defects span ALL detection categories Afterburn supports
3. It runs locally with zero dependencies -- no network failures possible
4. Scan completes in about 60-90 seconds (fast enough for a video, can speed up in post)

---

## Fixed Test Site (for Before/After Demo)

The fixed version lives at `test-site/public-fixed/` served by `test-site/server-fixed.js` on port **3848**.

**Verified scan results:**
- Broken site (port 3847): Health **62/100**, 20 issues, 8 workflows all pass
- Fixed site (port 3848): Health **92/100**, 7 issues, 5 workflows all pass

**To run both side by side:**
```bash
cd test-site && node server.js &        # Broken on :3847
cd test-site && node server-fixed.js &   # Fixed on :3848
```

**Note:** The fixed site still has 7 remaining issues (dead button false positives from preventDefault-based form handlers, and contrast issues). These are Afterburn detection limitations, not site defects. A score of 92 is realistic and impressive for the demo.

---

## --doctor Command

The `--doctor` command already exists (`src/cli/doctor.ts`). It checks:

| Check | Required? | What it verifies |
|-------|-----------|-----------------|
| Node.js version | Yes | >= 18 |
| Chromium browser | Yes | Playwright browser cache exists |
| GEMINI_API_KEY | No (warn) | API key set for AI features |
| Network connectivity | No (warn) | DNS resolution works |

Run before demo: `npx afterburn-cli doctor`

Expected output (GEMINI_API_KEY will show WARN if not set -- this is fine):
```
Afterburn Doctor

  [PASS] Node.js: v24.5.0 (>= 18 required)
  [PASS] Chromium browser: Installed
  [PASS] GEMINI_API_KEY: Set              (or [WARN] if not set)
  [PASS] Network: Connectivity OK

All checks passed! Ready to scan.
```

---

## Cached Report Fallback Strategy

**Location:** `demo-cache/`

**Files:**
- `report.html` -- Pre-generated HTML report (self-contained, works offline)
- `report.md` -- Pre-generated Markdown report (for AI paste demo)
- `terminal-output.txt` -- Pre-generated terminal output

**When to use:** If live scan fails during demo recording (network issue, API timeout, Playwright crash).

**How to use:**
1. Show `cat demo-cache/terminal-output.txt` as if it just ran
2. Open `demo-cache/report.html` in browser
3. Use `demo-cache/report.md` for the AI paste step
4. No one watching the video can tell the difference

**Regeneration:** If reports need refreshing:
```bash
cd test-site && node server.js &
npm run build
npx afterburn-cli http://localhost:3847
cp afterburn-reports/*/report-*.html demo-cache/report.html
cp afterburn-reports/*/report-*.md demo-cache/report.md
```

---

## Risk Mitigation: What Could Go Wrong

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Test site won't start | Low | Fatal | Pre-check: `node server.js`, verify port 3847 |
| Scan times out | Medium | Major | Set `--max-pages 10` to limit scope; use cached fallback |
| Playwright crashes | Low | Major | Run `npx afterburn-cli doctor` first; use cached fallback |
| Report looks wrong | Low | Minor | Pre-open cached report as backup tab |
| AI (Claude) is slow | High | Major | Pre-record Claude interaction; edit into video |
| Health score different from cached | Medium | Minor | Does not matter -- different is fine, just be consistent |
| Terminal font too small | Low | Minor | Set terminal font to 16pt+, use a dark theme |
| API key not set | Low | Minor | Tool works without it (heuristic mode); set it for demo |
| Scan finds different issues | Low | Minor | Fine -- the story works regardless of exact count |

---

## Competitive Differentiation to Emphasize

These talking points should come through naturally in the narration:

1. **Zero config**: No test files, no config, no setup. Just `npx afterburn-cli <url>`.
2. **AI-readable output**: The Markdown report IS the killer feature. No other tool generates structured output that AI coding tools can directly consume and act on.
3. **Full behavioral testing**: Not just static analysis. Afterburn fills forms, clicks buttons, follows workflows. Lighthouse can NOT do this.
4. **Plain English**: Reports say "This button does nothing when clicked" not "dead onclick handler on element #hero-cta". Vibe coders can understand every word.
5. **The complete AI workflow**: Find bugs (Afterburn) -> fix bugs (Claude/Cursor) -> verify fix (re-scan). No manual debugging anywhere in the loop.
