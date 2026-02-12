# VHS Architect Proposal: Demo GIF Implementation

**Author**: VHS Architect agent
**Date**: 2026-02-12
**Status**: PROPOSAL (pending debate)

---

## 1. Installation on Windows

### Primary: Scoop (recommended)

```powershell
scoop install vhs ffmpeg
```

VHS requires two runtime dependencies: **ttyd** (web-based terminal multiplexer that VHS drives internally) and **ffmpeg** (frame encoding). Scoop should handle both as transitive dependencies.

### Secondary: Winget

```powershell
winget install charmbracelet.vhs
```

May still require manual ffmpeg/ttyd setup.

### ttyd Windows Gotcha

ttyd provides a precompiled `.exe` for Windows 10 1809+ via GitHub releases at `https://github.com/tsl0922/ttyd/releases`. If the scoop install doesn't pull it automatically:

1. Download `ttyd.win32.exe` from releases
2. Rename to `ttyd.exe`
3. Place in a directory on PATH (e.g., `C:\Users\<user>\scoop\shims\`)

**Known issue**: Native Windows console programs may have PTY incompatibility. The workaround is `ttyd winpty cmd`, but VHS manages its own ttyd process so this is unlikely to surface in normal operation.

### Fallback: Docker

If Windows native install fails entirely:

```bash
docker run --rm -v "$PWD:/vhs" ghcr.io/charmbracelet/vhs demo.tape
```

The Docker image bundles all dependencies. Downside: slower iteration, volume mount complexity on Windows.

### Verification Command

```bash
vhs --version && ttyd --version && ffmpeg -version
```

All three must succeed before proceeding.

---

## 2. Tape File Syntax Reference

### Commands (Action)

| Command | Syntax | Description |
|---------|--------|-------------|
| `Type` | `Type "text"` | Type characters with configured TypingSpeed |
| `Type@` | `Type@100ms "text"` | Type with per-command speed override |
| `Enter` | `Enter` | Press Enter key |
| `Backspace` | `Backspace [count]` | Press Backspace N times |
| `Tab` | `Tab` | Press Tab key |
| `Space` | `Space` | Press Space key |
| `Ctrl+C` | `Ctrl+C` | Send Ctrl+C |
| `Up/Down/Left/Right` | `Up [count]` | Arrow keys |
| `Sleep` | `Sleep 2s` / `Sleep 500ms` | Pause execution |
| `Hide` | `Hide` | Stop rendering subsequent commands to output |
| `Show` | `Show` | Resume rendering to output |
| `Screenshot` | `Screenshot path.png` | Capture a single frame |
| `Require` | `Require program` | Assert program exists on PATH |
| `Env` | `Env KEY value` | Set environment variable |
| `Source` | `Source other.tape` | Include another tape file |

### Settings (Set)

| Setting | Syntax | Default | Notes |
|---------|--------|---------|-------|
| `Shell` | `Set Shell "bash"` | user's default | Which shell to use |
| `FontSize` | `Set FontSize 22` | 22 | Pixels |
| `FontFamily` | `Set FontFamily "JetBrains Mono"` | system | Monospace recommended |
| `Width` | `Set Width 1200` | 600 | Terminal width in pixels |
| `Height` | `Set Height 600` | 400 | Terminal height in pixels |
| `LetterSpacing` | `Set LetterSpacing 1` | 0 | Tracking |
| `LineHeight` | `Set LineHeight 1.4` | 1.0 | Line spacing multiplier |
| `Padding` | `Set Padding 20` | 0 | Inner terminal padding |
| `Margin` | `Set Margin 10` | 0 | Outer margin (needs MarginFill) |
| `MarginFill` | `Set MarginFill "#1a1b26"` | none | Margin background color |
| `BorderRadius` | `Set BorderRadius 10` | 0 | Rounded corners |
| `WindowBar` | `Set WindowBar Colorful` | none | macOS-style title bar |
| `WindowBarSize` | `Set WindowBarSize 40` | 40 | Title bar height |
| `Theme` | `Set Theme "Dracula"` | default | Named theme or JSON |
| `TypingSpeed` | `Set TypingSpeed 50ms` | 50ms | Delay between keystrokes |
| `Framerate` | `Set Framerate 30` | 50 | FPS for recording |
| `PlaybackSpeed` | `Set PlaybackSpeed 1.0` | 1.0 | >1 = faster playback |
| `LoopOffset` | `Set LoopOffset 60%` | 0% | GIF loop start frame |
| `CursorBlink` | `Set CursorBlink false` | true | Cursor animation |

---

## 3. The Timing Problem: Analysis of Four Approaches

The real scan takes 3-5 minutes. The GIF needs to be 10-15 seconds. This is the critical design decision.

### Option A: VHS Speed Controls (PlaybackSpeed + reduced Sleep)

**How**: Run real command but set `Set PlaybackSpeed 20.0` to compress 3 min into 9 sec.

**Problems**:
- PlaybackSpeed accelerates the entire recording uniformly -- typing becomes impossibly fast
- The spinner/progress text would be a blur
- No way to selectively speed up just the "waiting" parts
- Verdict: **REJECTED** -- PlaybackSpeed is for minor adjustments (1.5-2x), not 20x

### Option B: Mock Output via Shell Script (RECOMMENDED)

**How**: Create a small bash script that `echo`s the output line-by-line with strategically timed `sleep` calls to simulate the progressive reveal.

```bash
#!/usr/bin/env bash
# demo/mock-scan.sh - Simulates afterburn output for demo recording
echo ""
echo "Afterburn v1.0.1"
echo ""
sleep 0.3; echo "  ✔ Checking browser..."
sleep 0.5; echo "  ✔ Crawling site..."
sleep 0.8; echo "  ✔ Testing workflows..."
sleep 0.6; echo "  ✔ Analyzing results..."
sleep 0.4; echo "  ✔ Generating reports..."
echo ""
echo "Health: 50/100 — 52 issues found (13 high, 21 medium, 18 low)"
echo ""
echo "Top issues:"
echo '  1. [HIGH] Dead button: "Get Started Free" does nothing'
echo "  2. [HIGH] Broken form: Newsletter signup fails silently"
echo "  3. [HIGH] JavaScript error: TypeError on page load"
echo ""
echo "Reports saved:"
echo "  HTML:     afterburn-reports/2026-02-12T10-30-00/report.html"
echo "  Markdown: afterburn-reports/2026-02-12T10-30-00/report.md"
```

**Pros**:
- Total control over timing per line (no 3-minute wait)
- Deterministic, repeatable output every run
- GIF looks exactly how we want with zero flakiness
- Can use real Unicode checkmarks and formatting
- No risk of network failures, rate limiting, or Playwright issues during recording

**Cons**:
- Doesn't run the real tool (but it IS the real output format -- verified against `commander-cli.ts` lines 43-153)
- The typed command will show `npx afterburn-cli https://your-site.com` but internally runs the mock

**Verdict**: **RECOMMENDED** -- This is the industry standard approach for CLI demo GIFs

### Option C: Run Real Command Against Fast Target

**How**: Find/create a minimal static site that scans in <10 seconds.

**Problems**:
- Even a trivial site takes 15-30 seconds (browser launch + page load + axe scan + AI analysis)
- Gemini API calls add unpredictable latency
- API key must be present during recording
- Output depends on real site state (non-deterministic)
- Verdict: **REJECTED** -- too slow and too flaky for a polished demo

### Option D: VHS `Hide`/`Show` with Background Real Run

**How**: Use `Hide` to execute real command invisibly, then `Show` and echo cached output.

**Problems**:
- Still waits 3-5 minutes during recording (just hidden)
- Complex script coordination
- No real advantage over Option B
- Verdict: **REJECTED** -- unnecessary complexity

### Recommendation: Option B (Mock Script)

The tape file types `npx afterburn-cli https://your-site.com` visibly, but the actual Enter keystroke is hidden and instead we execute the mock script. The viewer sees authentic-looking typed input and authentic-looking progressive output.

---

## 4. Terminal Theming

### Recommended Theme: Dracula

**Rationale**: High contrast, vibrant colors, universally recognized dark theme. Works well in GIFs where color depth is limited.

Alternative options ranked:
1. **Dracula** -- best for GIF readability, strong brand recognition
2. **catppuccin-mocha** -- softer pastels, trendy, easy on the eyes
3. **TokyoNight** -- clean but lower contrast in GIF compression

### Font Selection

**Primary**: `JetBrains Mono` -- excellent monospace readability, open source
**Fallback**: `Fira Code` or `SF Mono`

### Terminal Dimensions

For a README embed that looks good at various viewport widths:

```
Set Width 1200     # Wide enough for output lines without wrapping
Set Height 600     # Tall enough for full output (~20 lines)
Set FontSize 20    # Large enough to read in a shrunk GIF
Set Padding 20     # Breathing room around content
Set LineHeight 1.3 # Slight spacing for readability
Set BorderRadius 8 # Subtle rounded corners
Set WindowBar Colorful  # macOS-style traffic lights for polish
```

Why 1200x600: The README GIF will be displayed at ~700px wide on GitHub. Starting at 1200px gives 1.7x oversample so text stays crisp even when scaled down.

---

## 5. Output Optimization

### GIF Settings

```
Set Framerate 24       # Cinema-standard, good balance of quality vs size
Set PlaybackSpeed 1.0  # No speedup needed with mock approach
Set LoopOffset 80%     # Loop starts near the end so preview shows results
```

### Expected File Size

- At 1200x600, 24fps, ~12 seconds: roughly 2-4 MB as GIF
- GIF format is inherently large for terminal recordings due to limited palette
- Optimization: run `gifsicle -O3 --lossy=80` post-processing to shrink 30-50%

### Multi-format Output

```
Output demo/afterburn-demo.gif
Output demo/afterburn-demo.mp4
Output demo/afterburn-demo.webm
```

Generate all three. Use GIF for README (universal), MP4 for social media, WebM for website.

### Post-Processing Pipeline

```bash
# Optimize GIF after VHS generates it
# (install gifsicle via scoop: scoop install gifsicle)
gifsicle -O3 --lossy=80 --colors 128 demo/afterburn-demo.gif -o demo/afterburn-demo-opt.gif
```

---

## 6. Complete Draft Tape File

```tape
# afterburn-demo.tape
# Records a polished demo GIF of Afterburn CLI scanning a website
# Usage: vhs afterburn-demo.tape

Output demo/afterburn-demo.gif
Output demo/afterburn-demo.mp4

# --- Terminal Setup ---
Set Shell "bash"
Set FontSize 20
Set FontFamily "JetBrains Mono"
Set Width 1200
Set Height 600
Set Padding 20
Set LineHeight 1.3
Set Framerate 24
Set Theme "Dracula"
Set WindowBar Colorful
Set BorderRadius 8
Set CursorBlink false
Set LoopOffset 80%
Set TypingSpeed 40ms

# --- Recording ---

# Brief pause so the GIF doesn't start mid-frame
Sleep 500ms

# Type the command visibly (this is what the viewer sees)
Type "npx afterburn-cli https://your-site.com"
Sleep 300ms
Enter

# Wait a moment for "command execution"
Sleep 1s

# The shell will run the mock script which outputs the simulated scan
# (The .bashrc or profile aliases npx to our mock, OR we use Hide/Show trick)

# --- Alternative approach: Hide the real command, show mock output ---
# If we can't alias npx, use this pattern:
# After the visible Enter, we Hide, Ctrl+C the fake command,
# then run the mock script, then Show

Sleep 8s

# Pause at the end so viewer can read the results
Sleep 3s
```

**IMPORTANT**: The tape file above assumes the shell will execute a mock script when `npx afterburn-cli` is called. The cleanest way to wire this up:

### Mock Wiring Strategy

Create `demo/mock-scan.sh` (the mock script from Section 3), then set up the tape:

```tape
# afterburn-demo.tape -- FULL WORKING VERSION
Output demo/afterburn-demo.gif
Output demo/afterburn-demo.mp4

Set Shell "bash"
Set FontSize 20
Set FontFamily "JetBrains Mono"
Set Width 1200
Set Height 600
Set Padding 20
Set LineHeight 1.3
Set Framerate 24
Set Theme "Dracula"
Set WindowBar Colorful
Set BorderRadius 8
Set CursorBlink false
Set LoopOffset 80%
Set TypingSpeed 40ms

Sleep 500ms

# Type command the viewer sees
Type "npx afterburn-cli https://your-site.com"
Sleep 300ms

# Hide the actual execution -- viewer won't see this
Hide
Enter
# Wait for prompt to return (the npx command won't exist or will fail)
Sleep 200ms
# Clear and run mock script silently
Type "clear"
Enter
Sleep 200ms
Show

# Now type the mock script execution invisibly by using a trick:
# The prompt is clean. We run mock-scan.sh but make it look like
# the npx command just produced this output.
Hide
Type "bash demo/mock-scan.sh"
Enter
Show

# Wait for mock output to render (total mock runtime is ~3.5 seconds)
Sleep 5s

# Linger on the results
Sleep 4s
```

### Even Cleaner Alternative: Env + PATH Override

```tape
# Set PATH so our mock takes precedence
Env PATH "./demo:$PATH"

# (Where demo/npx is a script that runs mock-scan.sh)
```

This way the typed `npx afterburn-cli https://your-site.com` actually executes our mock.

---

## 7. Risks and Limitations

### HIGH Risk: Windows ttyd Compatibility

**Issue**: ttyd's Windows support is less mature than Linux/macOS. VHS spawns ttyd as a subprocess, and if ttyd can't allocate a PTY on Windows, the entire recording fails.

**Mitigation**: Test `vhs validate demo.tape` first. If it fails, fall back to Docker or WSL2.

### MEDIUM Risk: Font Availability

**Issue**: `JetBrains Mono` may not be installed. VHS will fall back to a system monospace font that may look inconsistent across machines.

**Mitigation**: Install JetBrains Mono before recording, or use a web-safe fallback like `Consolas` (ships with Windows).

### MEDIUM Risk: Unicode/Emoji Rendering

**Issue**: VHS GitHub issue #395 documents that some emojis/Unicode don't render correctly. Our output uses checkmarks (Unicode ✔) and em-dashes (—) which could display as boxes.

**Mitigation**: Test with `✔` first. Fallback: use ASCII alternatives like `[OK]` or `[PASS]`.

### LOW Risk: GIF File Size

**Issue**: At 1200x600, a 12-second GIF could be 3-5 MB. GitHub READMEs cap at 10 MB but large GIFs slow page loads.

**Mitigation**: Post-process with gifsicle. If still too large, reduce to 1000x500 or Framerate 20.

### LOW Risk: Shell Differences

**Issue**: VHS defaults to user's shell. On Windows this might be `cmd.exe` or PowerShell instead of bash, changing prompt appearance.

**Mitigation**: Explicitly `Set Shell "bash"` (requires Git Bash on PATH).

### ZERO Risk: API Keys

Since we're using a mock script, no Gemini API key is needed. No secrets exposed in the recording.

---

## 8. Alternative Approaches (Plan B / Plan C)

### Plan B: asciinema + agg (SVG/GIF pipeline)

If VHS fails on Windows:

1. Install `asciinema` (Python pip or prebuilt binary)
2. Record: `asciinema rec demo.cast` (run mock script manually)
3. Convert to GIF: `agg demo.cast demo.gif --theme dracula`

**Pros**: asciinema is mature, well-tested, no ttyd dependency
**Cons**: Less control over output formatting; two-step process; agg is a separate Go binary

### Plan C: Terminalizer

1. Install: `npm install -g terminalizer`
2. Record: `terminalizer record demo` (execute mock manually)
3. Render: `terminalizer render demo`

**Pros**: npm ecosystem (familiar), works on Windows
**Cons**: Larger output files, less popular, fewer theming options

### Plan D: Manual Screen Recording + Optimization

1. Run mock script in a styled terminal (Windows Terminal with Dracula theme)
2. Screen record with OBS or ShareX
3. Convert to GIF with ffmpeg: `ffmpeg -i demo.mp4 -vf "fps=24,scale=1200:-1" demo.gif`
4. Optimize with gifsicle

**Pros**: Zero tool dependencies, total visual control
**Cons**: Not reproducible, manual process, harder to iterate

### Plan E: SVG Animation (termsvg/svg-term)

Generate an SVG instead of GIF. Renders as vector text (infinitely crisp), smaller file size. GitHub renders SVGs inline.

**Pros**: Tiny file size, crisp at any zoom, accessible
**Cons**: Less universally supported in markdown renderers, can't embed in all contexts

### Recommendation Priority

1. **VHS** (primary) -- best quality, reproducible, great theming
2. **Screen recording** (if VHS fails) -- simplest fallback
3. **asciinema + agg** (if reproducibility matters) -- proven pipeline

---

## Summary

| Decision Point | Recommendation |
|---------------|---------------|
| Install method | `scoop install vhs ffmpeg` + verify ttyd |
| Timing strategy | Mock script (Option B) -- fake the scan, real the output |
| Theme | Dracula |
| Font | JetBrains Mono (fallback: Consolas) |
| Dimensions | 1200x600 @ 20px font |
| Framerate | 24 fps |
| Duration | ~12 seconds |
| Post-processing | gifsicle -O3 |
| Plan B | Manual screen recording with ffmpeg conversion |
| Plan C | asciinema + agg |

The mock script approach is the clear winner: zero flakiness, fast iteration, looks identical to real output (verified against `src/cli/commander-cli.ts`), and no API keys or network required.
