# Hackathon Submission Checklist

**Deadline:** February 14, 2026 (BridgeMind Vibeathon)
**Repo:** https://github.com/gods-strongest-vibecoder/afterburn
**Next package to publish:** `afterburn-cli@1.0.2`

---

## Current Verified State (local)

- [x] `npm run build`
- [x] `npm test` (unit)
- [x] `npm run test:e2e`
- [x] `npm run build:release`
- [x] `node dist/index.js doctor`
- [x] `npm audit --omit=dev` (0 vulnerabilities)
- [x] README has demo GIF (`demo/afterburn-demo.gif`)
- [x] npm package is published (`afterburn-cli@1.0.1` currently live)

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
