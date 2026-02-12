# Demo GIF Strategy Proposal

**Author:** Demo Strategist
**Date:** 2026-02-12
**Format:** VHS (.tape) -> animated GIF for README

---

## 1. The ONE Thing (10-15 seconds)

**Core message:** "One command finds every bug on your website — no setup, no test files, no config."

The viewer must feel three things in sequence:
1. **Simplicity** — they see a single, memorable command
2. **Discovery** — the tool autonomously finds real, recognizable bugs
3. **Actionability** — the output is immediately useful (health score + plain English issues)

The GIF does NOT need to show the full AI workflow (scan -> paste into Claude -> bugs fixed). That story is told in the README text below the GIF. The GIF's job is singular: **make the viewer believe the tool works and is effortless.**

---

## 2. Content Structure (Frame by Frame)

### Beat 1: The Command (0-3s)
```
$ npx afterburn-cli https://demo.afterburn.dev
```
- Fast typing speed (50ms per char) — confident, not hesitant
- Brief pause (0.5s) after Enter to let the command register visually
- URL should be a real-looking domain (not localhost)

### Beat 2: The Engine Working (3-7s)
```
Afterburn v1.0.1

✔ Checking browser...
✔ Crawling site...
✔ Testing workflows...
✔ Analyzing results...
✔ Generating reports...
```
- Each checkmark appears with ~0.8s gap — fast enough to feel automatic, slow enough to read
- Green checkmarks create a satisfying cascade of progress
- This section communicates **comprehensiveness** without the viewer doing anything

### Beat 3: The Payoff (7-12s)
```
Health: 47/100 — 52 issues found (13 high, 21 medium, 18 low)

Top issues:
  1. [HIGH] "Get Started Free" button does nothing when clicked
  2. [HIGH] Newsletter signup form fails silently
  3. [HIGH] JavaScript error: TypeError on page load
  ... and 49 more (see report)
```
- **Health score is the hook** — a low score creates urgency ("my site might be this bad")
- **Top issues use plain English** — no jargon, immediately recognizable problems
- The "and 49 more" line creates FOMO — there's more value in the full report

### Beat 4: Reports Saved (12-14s)
```
Reports saved:
  HTML:     afterburn-reports/2026-02-12/report.html
  Markdown: afterburn-reports/2026-02-12/report.md
```
- Quick appearance, then hold for 2s so the viewer sees TWO report types
- The Markdown line is the bridge to the README's "AI workflow" section below

### Beat 5: Linger (14-15s)
- Hold final frame for 1.5s before loop
- Viewer's eye rests on the full output, absorbs the "52 issues found" number

---

## 3. Emotional Arc

```
Curiosity -> Anticipation -> Surprise -> "I need this"
   |              |              |            |
  Beat 1       Beat 2        Beat 3       Beat 4-5
  "hmm?"      "wait..."     "whoa"       "where do I get this"
```

**Key psychological lever:** The health score creates a mirror effect. Every developer thinks "what would MY site score?" That question is the conversion mechanism. The GIF doesn't need to answer it — it just needs to plant the question.

**The "wow" moment** is Beat 3. The transition from spinners to a concrete health score + plain English bugs is the emotional climax. The issues should be ones that EVERY vibe coder recognizes: dead buttons, broken forms, JS errors. Not obscure a11y violations.

---

## 4. Pacing (Precise Timing)

| Section | Duration | Technique |
|---------|----------|-----------|
| Command typing | 2.0s | 50ms per char, fast and confident |
| Post-enter pause | 0.5s | Let command register |
| Banner + spinners | 3.5s | 0.7s per checkmark line |
| Transition pause | 0.3s | Brief breath before payoff |
| Health score line | 0.5s | Appears instantly, hold |
| Top issues reveal | 2.5s | Each line appears with 0.5s gap |
| Reports saved | 1.5s | Appears, holds |
| Final linger | 1.5s | Rest on full output |
| **Total** | **~12.3s** | Under 15s target |

**Loop strategy:** GIF should loop with a 2s black/blank frame or terminal-clear before restarting. This prevents visual confusion at the loop boundary.

---

## 5. What NOT to Show

| Omit | Reason |
|------|--------|
| `npm install` or global install | Adds friction to the "zero config" story |
| Browser downloading message | First-run setup noise, breaks the magic |
| `--verbose` flag output | Site map, workflow list — too much detail, breaks pacing |
| AI-powered mode / GEMINI_API_KEY | Adds complexity, implies dependency |
| localhost URL | Looks fake, breaks trust |
| The HTML report opening | The GIF is about the CLI, not the report UI |
| Error/failure states | Confidence killer — the tool should look bulletproof |
| Long issue summaries | Truncated text looks messy; curate short, punchy issues |
| More than 3 top issues | Information overload — 3 is the magic number |
| Colors that don't survive GIF compression | Subtle gradients will band; use solid colors |

---

## 6. Competitive Analysis: Winning Hackathon GIFs

**Pattern from top GitHub/DevPost winners:**

1. **Single command, instant payoff** — The best demo GIFs show ONE command that produces impressive output. No multi-step setup. Examples: `npx create-next-app`, `cargo shuttle deploy`, `wrangler publish`.

2. **Under 15 seconds** — Attention drops sharply after 10s. Winners front-load the hook.

3. **Real output, not mockups** — Authentic terminal output with real data beats polished mockups. Typos and imperfections can actually help (though we should avoid them).

4. **Dark terminal theme** — 90%+ of winning demos use dark backgrounds. Light themes look washed out in GIF compression. Dracula, One Dark, or Tokyo Night are safe choices.

5. **No mouse interaction** — Pure keyboard. Terminal GIFs with mouse movement look amateur.

6. **Fixed-width, large font** — 18-20px minimum. Small text is unreadable on mobile Discord and GitHub preview cards.

7. **The "scroll-stopper" is always the output, not the input** — What makes people stop scrolling is surprising, impressive OUTPUT. The command is just setup.

8. **Consistent, fast pacing** — No awkward pauses. Winners feel rehearsed and polished.

**Anti-patterns to avoid:**
- Wall of text (more than ~20 visible lines)
- Scrolling output (if it scrolls, you've lost them)
- Multiple commands in sequence
- Showing file contents or config
- Switching between terminal and browser

---

## 7. Specific Recommendations

### Terminal Theme
- **Background:** #1a1b26 (Tokyo Night) or #282a36 (Dracula) — both survive GIF compression
- **Text:** #a9b1d6 (soft white, easier on eyes than pure #fff)
- **Green checkmarks:** #9ece6a (bright, visible green)
- **Red [HIGH] tags:** #f7768e (attention-grabbing but not alarming)
- **Health score number:** Bold white or yellow (#e0af68) to pop

### Font
- **JetBrains Mono** or **Fira Code** at 20px — large enough for mobile, monospaced for terminal authenticity

### Terminal Size
- **80 columns x 24 rows** — standard terminal, no horizontal scroll risk
- GIF dimensions: **960x540** or **1200x675** — fits GitHub README width and Discord embeds

### Command Text
```
npx afterburn-cli https://myapp.dev
```
- Short, memorable URL (not a long subdomain)
- `myapp.dev` feels like "your" site — creates identification
- No flags — zero config is the message

### Issue Text (Curated for Impact)
Use issues that every web dev recognizes:
1. `[HIGH] "Get Started Free" button does nothing when clicked` — everyone has this button
2. `[HIGH] Newsletter signup form fails silently` — universal pain point
3. `[HIGH] JavaScript error: TypeError on page load` — instantly recognizable

Avoid obscure issues like "Missing lang attribute" or "WCAG contrast ratio" — save those for the report.

### Watermark
- Small `afterburn-cli` text in bottom-right corner, 30% opacity
- Ensures brand visibility even when GIF is shared out of context

---

## 8. Success Criteria

The GIF succeeds if a hackathon voter:
1. Understands what the tool does within 5 seconds
2. Thinks "what would MY site score?" by second 10
3. Sees the `npx` command and thinks "I can try this right now"

The GIF fails if:
- It requires reading the README to understand what happened
- The viewer's first thought is "that's complicated"
- The output is too dense to parse at GIF playback speed

---

## 9. Alternative Considered and Rejected

**Split-screen GIF (terminal + browser):** Shows the browser being automated alongside terminal output. Rejected because:
- Doubles visual complexity
- GIF file size balloons (>5MB)
- Dilutes the "one command" simplicity story
- VHS doesn't natively support split-screen

**Two-part GIF (scan + paste into AI):** Shows the full workflow. Rejected because:
- Doubles duration (25-30s)
- The AI-paste step needs context to understand
- Better told as a static diagram or second GIF below the fold

**ASCII art banner on startup:** Fun but adds 2-3 seconds of non-value time. Rejected in favor of clean, fast output.
