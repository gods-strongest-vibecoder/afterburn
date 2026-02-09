# Hackathon Final Checklist

**Deadline:** Feb 14, 2026 (BridgeMind Vibeathon)
**Package:** `afterburn-cli@1.0.0`
**Repo:** https://github.com/gods-strongest-vibecoder/afterburn

---

## CRITICAL (must do before submission)

- [ ] **Publish to npm** — `npm login && npm publish --access public`
- [ ] **Verify global install works** — `npx afterburn-cli https://en.wikipedia.org/wiki/Main_Page`
- [ ] **Record demo video** (3-5 min) — follow script at `plans/DEMO-SCRIPT.md`
- [ ] **Post to BridgeMind Discord** — showcase channel with repo link + video

## HIGH PRIORITY (significantly improves chances)

- [ ] **Record demo GIF** for README hero — replace `<!-- TODO: Add demo GIF here -->` on line 11
  - Show: `npx afterburn-cli` -> spinners -> health score -> HTML report
  - ~10 seconds, looping, record AFTER npm publish so output is real
  - Tools: asciinema + agg, or screen recording + ezgif
- [ ] **Set GEMINI_API_KEY and test** — `export GEMINI_API_KEY=your-key` then run against test site
- [ ] **Update GitHub Release** — add demo GIF as release asset (`gh release upload v1.0.0 assets/demo.gif`)
- [ ] **Reddit launch** — use `REDDIT-POST.md`, r/SideProject Tuesday 9am EST, r/webdev Wednesday 10am EST

## NICE TO HAVE (if time permits)

- [ ] **Social preview image** — 1280x640 for GitHub link embeds (Settings > Social Preview)
- [ ] **Regenerate demo-cache** with live tool output (current has find-replaced URLs)
- [ ] **Dev.to article** — "How I Built Afterburn" for sustained traffic

---

## Discord Post (copy-paste ready)

### Option A: GIF-first (use this if GIF is ready)

```
[attach demo GIF]

Built this for the vibeathon: one command that crawls your site, clicks every button, fills out your forms, and tells you what's broken.

npx afterburn-cli https://your-site.com

It generates two reports -- one in plain English for you, one in Markdown you can paste into Claude/Cursor to auto-fix the bugs.

Zero config. No API key needed. Free and open source.

https://github.com/gods-strongest-vibecoder/afterburn

Would love to know what you think -- try it on your own site and tell me what breaks
```

### Option B: Text-first (use this if no GIF yet)

```
You ship with Cursor/Bolt/v0 but you don't write tests. So I built a CLI that tests for you.

npx afterburn-cli https://your-site.com

It crawls your site, fills forms, clicks buttons, and generates a bug report in plain English. Then you paste the Markdown report into your AI tool and it fixes the bugs automatically.

No config. No API key. No signup. Free.

https://github.com/gods-strongest-vibecoder/afterburn

Built for the vibeathon -- try it on your site and lmk what you think
```

---

## Quick Reference

```bash
# Publish
npm login && npm publish --access public

# Test the published package
npx afterburn-cli https://en.wikipedia.org/wiki/Main_Page

# Start test site for demo recording
cd test-site && node server.js

# Run against test site
npx afterburn-cli http://localhost:3847

# Doctor pre-flight
npx afterburn-cli doctor

# Create GIF from asciinema recording
asciinema rec demo.cast
agg demo.cast assets/demo.gif
```

---

## What the team shipped today

| Commit | Description |
|--------|-------------|
| `720df3f` | v1.0.0 bump, screenshot fallback, demo-cache cleanup |
| `d4c83f0` | Fix demo-cache version mismatch |
| `cac4712` | Humanize button labels in reports |
| `d21562f` | Root-cause dedup fix (-39 net lines) |
| `6ca3fd0` | Rename package to afterburn-cli |
| `352be6d` | README polish v1 |
| `1685eb3` | README polish v2: Vibeathon badge, AI hook, Try-it-now |

**Verification:** Build clean, 189/189 tests pass, CLI v1.0.0, doctor passes, git clean and pushed.
