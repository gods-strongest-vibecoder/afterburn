# Afterburn Stress Test — Run Summary

## Execution Details

| Field               | Value                                      |
|---------------------|--------------------------------------------|
| **Date**            | 2026-02-08 ~14:20 UTC                      |
| **Target URL**      | http://localhost:3847                       |
| **Target Site**     | FlowSync (intentionally broken test site)  |
| **Exit Code**       | 0 (success)                                |
| **Runtime**         | 249 seconds (~4 min 9 sec)                 |
| **Afterburn Mode**  | Basic (heuristic, no GEMINI_API_KEY set)   |

## Crawl Results

| Metric            | Value |
|-------------------|-------|
| Pages discovered  | 5     |
| Pages crawled     | 5     |
| 404 pages found   | 2 (/about, /blog) |
| Valid pages        | 3 (/, /contact, /pricing) |

### Pages
1. `FlowSync — Automate Your Workflow` — `/`
2. `404` — `/about`
3. `404` — `/blog`
4. `Contact — FlowSync` — `/contact`
5. `Pricing — FlowSync` — `/pricing`

## Workflow Testing

| Metric              | Value |
|---------------------|-------|
| Workflows generated | 8     |
| Workflows passed    | 8     |
| Workflows failed    | 0     |

### Workflows Tested
1. General Form Submission (important) — 4 steps
2. Contact Form Submission (important) — 6 steps
3. Core Page Navigation (important) — 5 steps
4. Click "Get Started Free" Button (nice-to-have) — 3 steps
5. Click "Subscribe" Button (nice-to-have) — 3 steps
6. Click "Send Message" Button (nice-to-have) — 3 steps
7. Click "Get Started" Button (nice-to-have) — 3 steps
8. Click "Start Free Trial" Button (nice-to-have) — 3 steps

## Issues Found

| Metric                  | Value |
|-------------------------|-------|
| **Health Score**        | 61/100 (needs-work) |
| **Total Issues**        | 77    |
| High priority           | 1     |
| Medium priority         | 53    |
| Low priority            | 31    |
| Dead buttons detected   | 7     |
| Broken forms detected   | 1     |
| Accessibility violations| 8     |

### Issue Breakdown by Category
- **Console Errors (404s, image failures, server errors)**: ~38 issues
- **Dead Buttons**: 7 issues
- **Broken Forms**: 1 issue (newsletter form)
- **Accessibility Violations**: 8 issues
- **Other (low priority)**: remaining issues

### High Priority Issue
- Form `form.newsletter-form` submission isn't working

## Report Files

| Report   | Path                                                                                     | Size   |
|----------|------------------------------------------------------------------------------------------|--------|
| HTML     | `C:/Afterburn/afterburn-reports/1770556794126/report-96d116a8-6239-47d1-9533-0ed21f588d8c.html` | 85.6 KB |
| Markdown | `C:/Afterburn/afterburn-reports/1770556794126/report-96d116a8-6239-47d1-9533-0ed21f588d8c.md`   | 40.3 KB |
| Log      | `C:/Afterburn/test-site/afterburn-output.log`                                            | ~46 lines |

## Session Info
- Session ID: `96d116a8-6239-47d1-9533-0ed21f588d8c`
- AI-powered analysis: No (no GEMINI_API_KEY)
- Source analysis: No
- Crashes or fatal errors: **None**

## Run 2: Source-Mapping Mode (`--source ./test-site`)

| Field               | Value                                      |
|---------------------|--------------------------------------------|
| **Exit Code**       | 0 (success)                                |
| **Runtime**         | 263 seconds (~4 min 23 sec)                |
| **Source Analysis**  | Yes (`source_analysis: true`)             |
| **Session ID**      | ffa49d4b-4dbd-4752-9337-86d8824fcff2      |

### Source-Mapping Results
- Same 77 issues, same 61/100 health score
- Source mapping **did** pinpoint some issues to file locations:
  - `server.js:25` — Server errors (3 issues)
  - `server.js:27` — Undiagnosed errors (6 issues)
- Most console errors still show "Unknown" location (404s from missing static assets can't be mapped to source)
- No additional issues found vs the basic run

### Run 2 Report Files
| Report   | Path                                                                                     |
|----------|------------------------------------------------------------------------------------------|
| HTML     | `C:/Afterburn/afterburn-reports/1770557203750/report-ffa49d4b-4dbd-4752-9337-86d8824fcff2.html` |
| Markdown | `C:/Afterburn/afterburn-reports/1770557203750/report-ffa49d4b-4dbd-4752-9337-86d8824fcff2.md` |
| Log      | `C:/Afterburn/test-site/afterburn-source-run.log` |

## Notes
- Afterburn ran in heuristic mode (no Gemini API key set), so UI visual analysis was skipped
- All 8 workflows passed despite the site having intentional defects — workflows test user flows, not page correctness
- The 77 issues come primarily from console errors (broken images, 404 resources) and dead buttons
- The tool correctly identified 2 dead pages (/about, /blog returning 404)
- The broken newsletter form was flagged as the only HIGH priority issue
- Source mapping adds value for server-side errors but can't resolve static asset 404s to source files
- Both runs produced identical issue counts (77) and health scores (61/100), confirming deterministic behavior
