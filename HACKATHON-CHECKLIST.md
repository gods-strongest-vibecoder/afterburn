# Hackathon Submission Checklist

**Deadline:** February 14, 2026 (BridgeMind Vibeathon)
**Repo:** https://github.com/gods-strongest-vibecoder/afterburn
**Next package to publish:** `afterburn-cli@1.0.2`

---

## Current Verified State (Feb 13 re-verification)

- [x] `npm run build` — 0 TypeScript errors
- [x] `npm test` (unit) — 293/293 passing
- [x] `npm run test:e2e` — passed locally (browser required)
- [x] `npm run build:release`
- [x] `node dist/index.js doctor`
- [x] `npm audit --omit=dev` (0 vulnerabilities)
- [x] README has demo GIF (`demo/afterburn-demo.gif`)
- [x] npm package is published (`afterburn-cli@1.0.1` currently live)
- [x] `npm pack --dry-run` — 191 files, 153.5 kB, includes dist/ + templates/
- [x] `dist/index.js` has shebang (`#!/usr/bin/env node`)
- [x] False positive investigation — 0 Playwright errors leaking into reports
- [x] Demo cache verified: buggy=62/100 (33 issues), fixed=92/100 (12 issues)
- [x] Demo cache version string updated to v1.0.2

---

## Blocking Before Final Submission Push

- [ ] **Publish patch release** with the latest fixes
  - `npm publish --access public`
  - Expected version: `1.0.2`
- [ ] **Verify install from npm outside repo**
  - `npm exec --yes --package afterburn-cli@1.0.2 -- afterburn --version`
  - `npm exec --yes --package afterburn-cli@1.0.2 -- afterburn https://en.wikipedia.org/wiki/Main_Page --max-pages 1`
- [ ] **Record demo video** (3-5 min)
- [ ] **Post to BridgeMind Discord** with repo + video

---

## High-Impact Extras

- [ ] Add demo GIF asset to GitHub release (`v1.0.2`)
- [ ] Run one scan with `GEMINI_API_KEY` enabled and capture output
- [ ] Add/refresh social preview image in GitHub repo settings

---

## Quick Commands

```bash
# Final verification
npm run build
npm test
npm run test:e2e
npm run build:release
node dist/index.js doctor
npm audit --omit=dev

# Publish and smoke test package
npm publish --access public
npm exec --yes --package afterburn-cli@1.0.2 -- afterburn --version
npm exec --yes --package afterburn-cli@1.0.2 -- afterburn https://en.wikipedia.org/wiki/Main_Page --max-pages 1
```
