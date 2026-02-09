# Demo Cache

Pre-generated Afterburn reports from scanning the FlowSync test site.
These serve as emergency fallback if the live scan fails during demo.

Generated: 2026-02-08
Target: https://flowsync.demo.dev (FlowSync test site)
Mode: Heuristic (no GEMINI_API_KEY)
Health Score: 62/100
Issues Found: 40 (2 high, 28 medium, 10 low)

## Files

- `report.html` — Human-readable HTML report with health score, prioritized issue list, and fix suggestions
- `report.md` — AI-readable Markdown report with YAML frontmatter for Claude/Cursor consumption
- `terminal-output.txt` — CLI terminal output from the scan

## To Regenerate

```bash
cd test-site && node server.js &
npm run build
npx afterburn-cli https://flowsync.demo.dev
cp afterburn-reports/*/report-*.html demo-cache/report.html
cp afterburn-reports/*/report-*.md demo-cache/report.md
```
