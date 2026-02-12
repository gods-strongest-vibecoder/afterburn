# Demo GIF Final Spec

**Author:** Synthesizer (resolving Strategist + Architect + Devil's Advocate debate)
**Date:** 2026-02-12
**Status:** FINAL -- ready for execution

---

## Section 1: Tool Strategy (with Fallback Chain)

### Decision: Terminalizer first, VHS as stretch goal

The devil's advocate proved the point: VHS requires scoop + VHS + ttyd + ffmpeg on a Windows machine that has NONE of them. Estimated 15-30 min install with a 30-40% first-try success rate. Terminalizer is a single `npm install -g terminalizer` on a machine that already has npm. We optimize for certainty.

**Primary: Terminalizer**
```bash
npm install -g terminalizer
```
- Estimated setup: 3-5 minutes (npm install + verify)
- Works on Windows natively (uses node-pty, well-tested)
- YAML config for theming, renders directly to GIF
- Risk: Slightly larger GIFs than VHS, less polish. Acceptable for hackathon.

**Fallback 1: Windows Terminal + Screen Record + ezgif (15 min budget)**
1. Style Windows Terminal with dark theme (already installed on Win11)
2. Run mock script fullscreen
3. Record with Win+G (Xbox Game Bar, built into Win11)
4. Upload MP4 to ezgif.com, convert to GIF, download
5. Zero tool installation required

**Fallback 2: Static annotated screenshot (5 min budget)**
1. Run mock script in Windows Terminal
2. Screenshot with Win+Shift+S
3. Add callout annotations in Paint/browser tool
4. Embed static image in README
5. Guaranteed to work. A polished static image beats a bad GIF.

**Decision justification:** Hackathon with 2 days left = optimize for certainty. Terminalizer is npm-native, no foreign toolchain. If it fails, screen recording is built into Windows 11. VHS can be attempted AFTER a working GIF exists.

---

## Section 2: Content Spec

### First Frame (THIS IS THE GITHUB THUMBNAIL)

The devil's advocate nailed the thumbnail problem: if frame 1 is a blank terminal with a cursor, we lose scrolling hackathon voters. The first frame must be visually interesting.

**First frame content (visible for 1.5s):**
```
$ npx afterburn https://myapp.dev
```

The command is PRE-TYPED on frame 1, cursor at the end, ready to press Enter. This means:
- Thumbnail shows the tool name "afterburn" and a URL -- immediate context
- No wasted time watching characters appear one by one
- Voter sees the tool name in the static thumbnail before the GIF even plays

### Frame-by-Frame Content

**Beat 1: The Command (0.0s - 1.5s)**
```
$ npx afterburn https://myapp.dev
```
- Pre-typed on screen from frame 1 (the thumbnail)
- At 1.0s: Enter is pressed
- 0.5s pause for "execution to start"

**Beat 2: The Engine Working (1.5s - 5.5s)**
```
Afterburn v1.0.1

  ✔ Checking browser...
  ✔ Crawling site...
  ✔ Testing workflows...
  ✔ Analyzing results...
  ✔ Generating reports...
```
- Banner appears instantly at 1.5s
- Each checkmark line appears with 0.7s gap (3.5s total for 5 lines)
- Green checkmarks cascade downward -- satisfying progress feel

**Beat 3: The Payoff (5.5s - 9.0s)**
```
Health: 47/100 - 52 issues found (13 high, 21 medium, 18 low)

Top issues:
  1. [HIGH] "Get Started Free" button does nothing when clicked
  2. [HIGH] Newsletter signup form fails silently
  3. [HIGH] JavaScript error: TypeError on page load
  ... and 49 more (see report)
```
- Health score line appears at 5.5s -- this is the emotional climax
- Each issue line appears with 0.4s gap
- "... and 49 more" appears after a 0.3s pause -- creates FOMO
- Use ASCII dash `-` not em-dash `—` to avoid Unicode rendering risk

**Beat 4: The AI Hook (9.0s - 10.5s)**
```
Reports saved:
  HTML:     afterburn-reports/report.html
  Markdown: afterburn-reports/report.md  <-- paste into AI to auto-fix
```
- Report paths appear
- The `<-- paste into AI to auto-fix` annotation is the innovation differentiator
- This connects to the Innovation judging criterion (15%) that the strategist missed
- Short paths (no timestamp) for readability

**Beat 5: Linger (10.5s - 12.0s)**
- Hold final frame for 1.5s
- Viewer's eye rests on full output, absorbs health score and AI angle
- This final frame is also what shows when the GIF is paused/ended

### Last Frame Content
The full terminal output from Beats 1-4, all visible at once. The eye naturally goes to "Health: 47/100" (the bold number) and the "paste into AI" annotation.

### Total Duration: ~12 seconds

---

## Section 3: Visual Design

### Resolution: 960x540 @ 12fps

**Decision:** The devil's advocate won this one. 960x540 is exactly 16:9, reduces pixel count by 32% vs 1200x600, and at GitHub's ~700px display width the effective font size is still 14.6px (readable). 12fps is sufficient for terminal recordings where 95% of frames are static.

| Property | Value | Rationale |
|----------|-------|-----------|
| Resolution | 960x540 | 16:9, fits GitHub + Discord, smaller file size |
| FPS | 12 | Terminal recordings are mostly static. 12fps = half the frames, zero quality loss |
| Font | Consolas, 20px | Ships with Windows (zero install), excellent GIF rendering, ClearType-hinted |
| Theme | Dracula-inspired dark | #282a36 background, high contrast, survives GIF 256-color palette |
| Window bar | macOS-style colored dots (if tool supports) | Adds polish, recognizable terminal chrome |
| Border radius | 8px | Subtle rounded corners |
| Padding | 20px | Breathing room around content |
| Cursor | Block, no blink | Blink adds frames, block is more visible |

### Color Palette
- Background: `#282a36` (Dracula)
- Foreground text: `#f8f8f2` (Dracula fg)
- Green checkmarks: `#50fa7b` (Dracula green)
- `[HIGH]` tags: `#ff5555` (Dracula red)
- Health score number: `#f1fa8c` (Dracula yellow) -- pops visually
- Command prompt `$`: `#bd93f9` (Dracula purple)
- AI annotation: `#8be9fd` (Dracula cyan)

### Post-Processing
1. If GIF > 2MB: reduce colors to 128 with dithering
2. If still > 3MB: reduce to 10fps
3. Target: under 2MB for fast GitHub page loads

---

## Section 4: Mock Script

File: `demo/mock-scan.sh`

```bash
#!/usr/bin/env bash
# mock-scan.sh - Simulates afterburn CLI output for demo recording
# Matches real output format from src/cli/commander-cli.ts

echo ""
echo "Afterburn v1.0.1"
echo ""
sleep 0.3
echo "  ✔ Checking browser..."
sleep 0.7
echo "  ✔ Crawling site..."
sleep 0.8
echo "  ✔ Testing workflows..."
sleep 0.7
echo "  ✔ Analyzing results..."
sleep 0.5
echo "  ✔ Generating reports..."
sleep 0.3
echo ""
echo "Health: 47/100 - 52 issues found (13 high, 21 medium, 18 low)"
echo ""
sleep 0.3
echo "Top issues:"
sleep 0.2
echo '  1. [HIGH] "Get Started Free" button does nothing when clicked'
sleep 0.4
echo "  2. [HIGH] Newsletter signup form fails silently"
sleep 0.4
echo "  3. [HIGH] JavaScript error: TypeError on page load"
sleep 0.3
echo "  ... and 49 more (see report)"
echo ""
sleep 0.3
echo "Reports saved:"
echo "  HTML:     afterburn-reports/report.html"
echo "  Markdown: afterburn-reports/report.md  <-- paste into AI to auto-fix"
echo ""
```

### Output Verification
The mock script matches the real CLI output format:
- `commander-cli.ts:43` prints `Afterburn v1.0.0\n` (we use v1.0.1 to match package.json)
- `commander-cli.ts:97-103` uses stage spinners with `.succeed()` which renders as `✔ Stage...`
- `commander-cli.ts:124` prints `Health: X/100 - N issues found (H high, M medium, L low)`
- `commander-cli.ts:129-139` prints top 3 issues with `[HIGH]`/`[MED]`/`[LOW]` tags
- `commander-cli.ts:143-151` prints report paths
- One deviation: we add `<-- paste into AI to auto-fix` to the markdown line. This is the innovation hook. Not in the real output, but acceptable for a demo.

---

## Section 5: Recording Scripts

### Primary: Terminalizer Config

File: `demo/terminalizer-config.yml`

```yaml
# Terminalizer recording config for Afterburn demo GIF

command: bash -c "echo '$ npx afterburn https://myapp.dev' && sleep 1.0 && bash demo/mock-scan.sh"
cwd: C:/afterburn
env:
  recording: true

cols: 80
rows: 24

repeat: 0
quality: 100
frameDelay: auto
maxIdleTime: 2000
frameBox:
  type: floating
  title: "afterburn"
  style:
    border: 0px black solid
    boxShadow: none
    margin: 0px

watermark:
  imagePath: null
  style:
    position: absolute

cursorStyle: block
fontFamily: "Consolas, monospace"
fontSize: 20
lineHeight: 1.3
letterSpacing: 0

theme:
  background: "#282a36"
  foreground: "#f8f8f2"
  cursor: "#f8f8f2"
  black: "#21222c"
  red: "#ff5555"
  green: "#50fa7b"
  yellow: "#f1fa8c"
  blue: "#bd93f9"
  magenta: "#ff79c6"
  cyan: "#8be9fd"
  white: "#f8f8f2"
  brightBlack: "#6272a4"
  brightRed: "#ff6e6e"
  brightGreen: "#69ff94"
  brightYellow: "#ffffa5"
  brightBlue: "#d6acff"
  brightMagenta: "#ff92df"
  brightCyan: "#a4ffff"
  brightWhite: "#ffffff"
```

**Recording command:**
```bash
terminalizer record demo/afterburn-demo --config demo/terminalizer-config.yml
# Then inside the recording, run: bash demo/mock-scan.sh
# Press Ctrl+D to stop recording

terminalizer render demo/afterburn-demo --output demo/afterburn-demo.gif
```

**Alternative recording approach (simpler):**
```bash
# Record non-interactively by piping commands
terminalizer record demo/afterburn-demo --config demo/terminalizer-config.yml -k
# This runs the command from config automatically
```

### Fallback: VHS Tape File (stretch goal only)

File: `demo/afterburn-demo.tape`

```tape
# afterburn-demo.tape
# Usage: vhs demo/afterburn-demo.tape
# Only attempt after Terminalizer GIF exists as baseline

Output demo/afterburn-demo-vhs.gif

Set Shell "bash"
Set FontSize 20
Set FontFamily "Consolas"
Set Width 960
Set Height 540
Set Padding 20
Set LineHeight 1.3
Set Framerate 12
Set Theme "Dracula"
Set WindowBar Colorful
Set BorderRadius 8
Set CursorBlink false
Set TypingSpeed 30ms

Sleep 500ms

# Show command pre-typed then execute
Type "npx afterburn https://myapp.dev"
Sleep 800ms

# Hide real Enter, run mock instead
Hide
Enter
Sleep 200ms
Type "clear && bash demo/mock-scan.sh"
Enter
Show

# Wait for mock output (total mock runtime ~5s)
Sleep 6s

# Linger on results
Sleep 3s
```

---

## Section 6: Acceptance Criteria

### Hard Requirements (must-have to ship)

| Criterion | Target | Rationale |
|-----------|--------|-----------|
| File size | < 3MB (goal: < 2MB) | Fast GitHub page load, Discord inline preview |
| Duration | 10-13 seconds | Under 15s attention threshold |
| Resolution | 960x540 minimum | Readable at GitHub's ~700px display width |
| Readability | All text legible at 700px width | Test by viewing README on GitHub |
| Content | Shows: command, progress, health score, issues, reports | Full value story in one GIF |
| First frame | Shows tool name "afterburn" | Thumbnail must communicate what this is |
| Loop | Clean loop (no visual glitch at boundary) | Professional feel |

### Soft Requirements (nice-to-have)

| Criterion | Target |
|-----------|--------|
| Window chrome | macOS-style title bar dots |
| Color theme | Dracula or similar dark theme |
| AI annotation | "paste into AI to auto-fix" visible |
| Font | Consolas or JetBrains Mono |

### "Done" Definition

The GIF is done when:
1. It renders correctly when embedded in README.md via `![Afterburn demo](demo/afterburn-demo.gif)`
2. A person viewing the GitHub README understands what Afterburn does within 5 seconds
3. The file is under 3MB
4. The team lead approves the visual quality

### "Good Enough" Definition

If we hit the 45-minute time budget and have a GIF that meets hard requirements but not soft ones (e.g., no window chrome, plain theme, slightly over 2MB), we ship it. A 7/10 GIF in the README beats a missing GIF.

---

## Section 7: Execution Timeline

### Total estimated time: 30-50 minutes

| Step | Time Est. | Description |
|------|-----------|-------------|
| 1. Create mock script | 3 min | Write `demo/mock-scan.sh`, test it runs correctly in bash |
| 2. Install Terminalizer | 5 min | `npm install -g terminalizer`, verify with `terminalizer --version` |
| 3. Write config | 3 min | Create `demo/terminalizer-config.yml` with Dracula theme |
| 4. Record | 5 min | Run recording, verify output captures full mock |
| 5. Render to GIF | 3 min | `terminalizer render`, check output file |
| 6. Check quality | 2 min | View GIF, verify readability, check file size |
| 7. Optimize if needed | 5 min | Reduce colors/fps if over 3MB |
| 8. Embed in README | 3 min | Add GIF to README.md with surrounding context |
| 9. Verify on GitHub | 2 min | Push, check README renders correctly |
| **Total (happy path)** | **~31 min** | |

### Fallback Timeline (if Terminalizer fails at step 2-5)

| Step | Time Est. | Description |
|------|-----------|-------------|
| F1. Style Windows Terminal | 3 min | Set dark theme, increase font size |
| F2. Run mock script | 1 min | `bash demo/mock-scan.sh` in fullscreen terminal |
| F3. Screen record | 2 min | Win+G to record, stop after output complete |
| F4. Convert to GIF | 5 min | Upload MP4 to ezgif.com, configure settings, download |
| F5. Embed in README | 3 min | Same as step 8 above |
| **Fallback total** | **~14 min** | |

### Decision Point

At the **15-minute mark**, if Terminalizer is not installed and recording, STOP and switch to Fallback 1 (screen recording). Do not debug Terminalizer installation issues. The 15-minute mark is a hard cutoff.

At the **45-minute mark**, if no acceptable GIF exists, STOP and use Fallback 2 (static screenshot). Ship what exists. Return to improve later only if other hackathon tasks are complete.
