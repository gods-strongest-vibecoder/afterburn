# Phase 7: Demo Script

**Target:** 5-minute live demo for BridgeMind Vibeathon judges
**Audience:** Mix of experienced devs and non-technical builders (20,000+ Discord community)
**Judging:** Usefulness 40%, Impact 25%, Execution 20%, Innovation 15%

---

## Pre-Demo Checklist (do these BEFORE going live)

- [ ] Test site running: `cd test-site && node server.js` (port 3847)
- [ ] `npm run build` passes with zero errors
- [ ] `npx afterburn --version` returns `0.1.0` (or bumped version)
- [ ] **Warm-up run:** Run `npx afterburn http://localhost:3847` once BEFORE the demo (first run warms browser cache, ~40s; without warm-up could be ~4min)
- [ ] **DO NOT use --output-dir flag** during demo (QA confirmed it causes ~4min runtime vs ~40s with default path)
- [ ] Terminal font size 18+ (readable on screen share / recording)
- [ ] Browser open to about:blank (ready to open HTML report)
- [ ] Pre-generated reports cached in `demo-cache/` as emergency fallback only
- [ ] WiFi stable (or use localhost-only demo path)
- [ ] GEMINI_API_KEY: **Not available in current environment.** Plan for heuristic mode (82% detection rate). If key becomes available before demo, set it for visual analysis.
- [ ] Screen resolution: 1920x1080 with terminal on left, browser on right

---

## Act 1: The Problem (45 seconds)

### Talking Points

> "If you're a vibe coder -- you use Cursor, Bolt, v0, Lovable to build apps -- you ship fast. But you probably don't test. When forms break or pages crash, you don't find out until a user bounces."

> "There's no free tool that tests a running website end-to-end. Lighthouse checks performance. axe checks accessibility. But nothing crawls your site, fills out your forms, clicks your buttons, and tells you what's broken -- in plain English."

> "That's Afterburn. One command. Zero config. Instant bug report."

### Visual

Show the FlowSync test site briefly in the browser (3 seconds). It LOOKS professional -- clean startup landing page. The point is: you can't tell it's broken by looking at it.

```
[Open browser to http://localhost:3847]
[Quick scroll down the page -- looks legit]
```

> "This looks great, right? Let's see what Afterburn finds."

---

## Act 2: The Scan (90 seconds)

### The Command

```bash
npx afterburn http://localhost:3847
```

**TIMING NOTES (updated from QA verification):**
- Fresh E2E run completes in ~40 seconds against localhost test-site (warm browser cache)
- This is fast enough for a LIVE demo -- no need to cut to cached results
- Keep pre-cached reports as emergency fallback only
- First-ever run may be slower (browser download) -- always do a warm-up run before demo

### What to Say While It Runs (~40 seconds)

> "Afterburn is doing five things right now:"
> 1. "Crawling every page on the site -- it'll find every page, including dead links"
> 2. "Mapping every form, button, and link"
> 3. "Planning test workflows -- what would a real user do?"
> 4. "Executing those workflows -- filling forms, clicking buttons, checking responses"
> 5. "Analyzing results -- errors, accessibility, broken resources"

**The scan should complete live while you're talking. When it finishes:**

> "Done. Let's see what it found."

### Terminal Output to Highlight

```
Afterburn v0.1.0

✔ Checking browser...
✔ Crawling site...
✔ Testing workflows...
✔ Analyzing results...
✔ Generating reports...

Health: 62/100 — issues found across 7 categories (broken forms, dead buttons, missing images, console errors, server errors, broken links, accessibility)

Reports saved:
  HTML:     ./afterburn-reports/.../report-....html
  Markdown: ./afterburn-reports/.../report-....md
```

### Key Callouts

> "62 out of 100 health score. Issues across 7 categories. And two reports -- one for you in plain English, one for your AI coding tool."

**NOTE:** Do NOT read the raw issue count aloud. Before dedup fix, the count is inflated (~86 issues for ~20 unique findings). After dedup fix, use the deduplicated count. Either way, emphasize CATEGORIES not raw numbers.

---

## Act 3: The Human Report (60 seconds)

### Open the HTML Report

```
[Open the HTML report in browser -- it's a single self-contained file]
```

### What to Point Out (ordered by test coverage confidence)

**LEAD WITH THESE** (backed by 30+ unit tests each -- won't break):

1. **Health Score** (top of page): "62/100 -- Needs Work. This is a weighted score: 40% workflow success, 30% errors, 20% accessibility, 10% performance. Any failed workflow caps you at 50."

2. **Priority-ranked to-do list**: "Issues sorted by impact. HIGH first: a broken newsletter form -- your users type their email, click Subscribe, nothing happens. MEDIUM: dead buttons, missing images, server errors. LOW: cosmetic issues."

**THEN SHOW THESE** (solid detection, well-tested):

3. **Dead buttons**: "Seven buttons across three pages that do absolutely nothing when clicked. The 'Get Started Free' button on the homepage -- a vibe coder's AI probably left a TODO in the click handler."

4. **Broken images**: "Four images that don't exist. The site references icon-deploy.png, icon-monitor.png, icon-team.png -- none of them were actually created."

5. **Accessibility**: "Missing lang attribute on every page, missing alt text on images, a contrast issue with light gray text on white background. WCAG violations caught automatically."

> "All of this in plain English. No error codes, no stack traces. Just 'here's what's broken and here's how to fix it.'"

**NOTE ON SCREENSHOTS:** QA found that the HTML report currently does NOT embed evidence screenshots. Do NOT mention "screenshots for every issue" in the demo. If screenshot embedding is fixed before the demo, add it back as a talking point. Otherwise, focus on the text-based issue descriptions which are strong.

---

## Act 4: The AI Report (60 seconds)

### Show the Markdown Report

```
[Switch to VS Code or editor with Markdown PREVIEW mode showing the .md file]
```

**TIP:** Use an editor with Markdown preview (VS Code split view) rather than showing raw text. The raw file has escaped pipe characters (`\|`) in table cells that look noisy. The rendered preview looks clean and professional.

### What to Point Out

1. **YAML frontmatter**: "Machine-readable metadata. Session ID, health score, whether AI was used, whether source code was analyzed."

2. **Structured issue table**: "Every issue with priority, category, description, and fix suggestion -- formatted so Claude or Cursor can parse it directly."

3. **Reproduction steps**: "For every failed workflow, the exact steps to reproduce -- navigate here, click this, fill that field. An AI tool can read this and know exactly what to fix."

### The Handoff

> "Now here's the magic. I take this Markdown report and feed it to Claude Code..."

```bash
# Show the concept (don't need to actually run Claude live)
cat afterburn-reports/.../report-....md | claude "Fix all the issues in this Afterburn report"
```

> "Claude reads the report, understands every issue, and generates fixes. Then we re-run Afterburn to verify. Before/after: anxiety to confidence."

**NOTE:** If time permits and Claude Code is available, actually demonstrate feeding the report. But a conceptual walkthrough is sufficient -- the point is the WORKFLOW, not a live Claude demo.

---

## Act 5: The Pitch (45 seconds)

### Three Differentiators

> "Three things make Afterburn different:"

> 1. **"Zero config."** "You don't write tests. You don't configure anything. Point it at a URL, get a report. That's it."

> 2. **"Dual reports."** "One for you in plain English, one for your AI tool in structured Markdown. No other tool does this."

> 3. **"The full pipeline."** "Lighthouse checks performance. axe checks accessibility. Afterburn does everything: crawls, plans workflows, fills forms, clicks buttons, checks errors, audits accessibility -- in one command. What would take 5 tools and manual configuration, Afterburn does automatically."

### Call to Action

> "Afterburn is free, open source, MIT licensed. `npx afterburn` and you're done. Questions?"

---

## Fallback Plans

### Fallback 1: Scan Takes Too Long (> 60 seconds)

Pre-generate reports and have them ready:
```
demo-cache/
  report.html     (copy from latest afterburn-reports run)
  report.md       (copy from latest afterburn-reports run)
```

Start the scan, show the spinner for 15-20 seconds, then say:
> "While this runs, let me show you what a finished report looks like..."
Open the cached HTML report.

### Fallback 2: Network Issues

The test site runs on localhost. No network needed for the core demo. If WiFi drops:
- Test site still works (localhost:3847)
- Afterburn still works (Playwright headless, local)
- Reports still generate (all local)

The ONLY network dependency is GEMINI_API_KEY for visual analysis. Without it, heuristic mode still finds 15+ defects.

### Fallback 3: Afterburn Crashes

Pre-recorded terminal output (asciinema recording or screen recording) as absolute last resort. Show the recording, then open the pre-cached HTML report live.

### Fallback 4: No GEMINI_API_KEY Available (THIS IS THE CURRENT REALITY)

**QA confirmed: No API key is available in this environment.** This is NOT a fallback -- it's the DEFAULT demo path. Plan accordingly.

Heuristic mode works. ~82% detection rate of non-visual defects. Say:
> "Afterburn works out of the box with zero API keys. It found broken forms, dead buttons, missing images, server errors, broken links, and accessibility violations -- all using built-in heuristics. If you add a Gemini API key, it also analyzes screenshots for visual issues like overlapping elements and tiny unreadable text."

**DO NOT frame heuristic mode as limited.** Frame it as the CORE product. AI is the enhancement, not the baseline. This aligns with the "zero config" pitch.

---

## Demo Don'ts

1. **DON'T show 86 issues and claim they're all unique.** The dedup problem is real. Focus on the categories (broken forms, dead buttons, broken images, accessibility) not the raw count. Say "found issues across 7 categories" not "86 issues."

2. **DON'T dive into the code.** Judges have 3-5 minutes. The demo is about the PRODUCT, not the TypeScript architecture.

3. **DON'T apologize for limitations.** Don't mention "this is heuristic mode" or "deduplication needs work." Sell what works.

4. **DON'T try to demo MCP or GitHub Action live.** Mention them ("it also works as an MCP tool for AI coding assistants and a GitHub Action for CI/CD") but don't try to set up an MCP client or GitHub workflow live.

5. **DON'T demo against a real external site.** Anti-bot detection, rate limiting, and network issues could kill the demo. Localhost only.

---

## Timing Summary

| Act | Duration | Content |
|-----|----------|---------|
| 1. The Problem | 45s | Pitch the pain point, show the "looks fine" site |
| 2. The Scan | 90s | Run the command, explain what's happening |
| 3. Human Report | 60s | Walk through HTML report highlights |
| 4. AI Report | 60s | Show Markdown report, explain Claude handoff |
| 5. The Pitch | 45s | Three differentiators, call to action |
| **Total** | **5:00** | |

---

## Key Phrases to Memorize

- "One command. Zero config. Instant bug report."
- "Point it at a URL. Get a report."
- "Plain English for you. Structured Markdown for your AI tool."
- "What would take 5 tools and manual configuration, Afterburn does in one command."
- "Free. Open source. MIT licensed."
- "Before: you ship and pray. After: you ship and know."

---

## Recording the Demo Video (3-5 minute submission)

The hackathon requires a public GitHub repo + 3-5 minute demo video. Record this using:

1. **OBS Studio** or **Screen Studio** for screen recording
2. Terminal on left (70% width), browser on right (30% width)
3. Follow the exact act structure above
4. Post-production: speed up the scan waiting time (4 min -> 15 seconds with a "fast forward" visual)
5. Add text overlays for key points if using Screen Studio
6. Upload to YouTube (unlisted) and link from README

### Video Script Matches Live Script

The video script is identical to the live demo script above. The only difference is that you can edit out wait times and add post-production polish.
