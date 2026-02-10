# Demo Cache

Pre-generated Afterburn reports from scanning the FlowSync test site.
These serve as emergency fallback if the live scan fails during demo.

Generated: 2026-02-09 (post-severity-reclassification)
Target: http://localhost:3847 (FlowSync test site via `test-site/server.js`)
Mode: Heuristic (no GEMINI_API_KEY)
Health Score: 62/100
Issues Found: 33 (11 high, 12 medium, 10 low)

## Files

- `report.html` — Human-readable HTML report with health score, prioritized issue list, and fix suggestions
- `report.md` — AI-readable Markdown report with YAML frontmatter for Claude/Cursor consumption
- `terminal-output.txt` — CLI terminal output from the scan

## Fixed Test Site (for before/after demo)

A "fixed" version of the FlowSync test site lives at `test-site/public-fixed/` with `test-site/server-fixed.js`.
Run on port 3848: `cd test-site && node server-fixed.js`

All 23 intentional defects are resolved in the fixed version. Use this for the "re-scan shows improvement" part of the demo video.

## To Regenerate

```bash
cd test-site && node server.js &
npm run build
node dist/index.js http://localhost:3847 --output-dir ./demo-cache-new
cp demo-cache-new/report-*.html demo-cache/report.html
cp demo-cache-new/report-*.md demo-cache/report.md
```
