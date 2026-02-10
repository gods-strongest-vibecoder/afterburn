---
tool: afterburn
version: "1.0"
session_id: 3f315a9c-6b9d-488f-b863-598a6ba500d3
timestamp: 2026-02-09T22:54:17.175Z
target_url: "http://localhost:3847/"
health_score: 62
health_label: needs-work
total_issues: 33
workflows_tested: 8
workflows_passed: 8
workflows_failed: 0
ai_powered: false
source_analysis: false
---

# Afterburn Test Report

**Target:** http://localhost:3847
**Health Score:** 62/100 (needs-work)
**Date:** 09.02.2026, 23:54:17
**Mode:** Basic

## Summary

| Metric | Value |
|--------|-------|
| Workflows Tested | 8 |
| Workflows Passed | 8 |
| Workflows Failed | 0 |
| Total Issues | 33 |
| Dead Buttons | 7 |
| Broken Forms | 4 |
| Broken Links | 4 |
| Accessibility Violations | 7 |

## Issues (Prioritized)

| # | Priority | Category | Summary | Location |
|---|----------|----------|---------|----------|
| 1 | HIGH | Console Error | Tried to use .apiUrl on something that is undefined | http://localhost:3847/ |
| 2 | HIGH | Dead Button | Submit button doesn't do anything when clicked | http://localhost:3847 |
| 3 | HIGH | Dead Button | Submit button (contact form form) doesn't do anything when clicked | http://localhost:3847 |
| 4 | HIGH | Dead Button | "Get Started Free" button doesn't do anything when clicked | http://localhost:3847 |
| 5 | HIGH | Dead Button | "Subscribe" button doesn't do anything when clicked | http://localhost:3847 |
| 6 | HIGH | Dead Button | "Send Message" button doesn't do anything when clicked | http://localhost:3847 |
| 7 | HIGH | Dead Button | "Get Started" button doesn't do anything when clicked | http://localhost:3847 |
| 8 | HIGH | Dead Button | "Start Free Trial" button doesn't do anything when clicked | http://localhost:3847 |
| 9 | HIGH | Broken Form | The newsletter form doesn't work — submitting it has no effect (x2) | http://localhost:3847 (form.newsletter-form) |
| 10 | HIGH | Broken Form | The contact form doesn't work — submitting it has no effect (x2) | http://localhost:3847 (form#contact-form) |
| 11 | HIGH | Accessibility | Ensure <img> elements have alternative text or a role of none or presentation | http://localhost:3847/ |
| 12 | MEDIUM | Console Error | Image "icon-deploy.png" failed to load (404) | http://localhost:3847/images/icon-deploy.png |
| 13 | MEDIUM | Console Error | Image "icon-monitor.png" failed to load (404) | http://localhost:3847/images/icon-monitor.png |
| 14 | MEDIUM | Console Error | Image "icon-team.png" failed to load (404) | http://localhost:3847/images/icon-team.png |
| 15 | MEDIUM | Console Error | Image "office-map.png" failed to load (404) | http://localhost:3847/images/office-map.png |
| 16 | MEDIUM | Console Error | Server error | http://localhost:3847/api/data |
| 17 | MEDIUM | Console Error | "about" not found (404) | http://localhost:3847/about |
| 18 | MEDIUM | Console Error | "blog" not found (404) | http://localhost:3847/blog |
| 19 | MEDIUM | Broken Link | Link to /about is broken (404) (x3) | http://localhost:3847/ (and 2 other pages) |
| 20 | MEDIUM | Broken Link | Link to /blog is broken (404) | http://localhost:3847/ |
| 21 | MEDIUM | Accessibility | Ensure the contrast between foreground and background colors meets WCAG 2 AA ... | http://localhost:3847/ (and 1 other page) |
| 22 | MEDIUM | Accessibility | Ensure every HTML document has a lang attribute (x4) | http://localhost:3847/ (and 3 other pages) |
| 23 | MEDIUM | SEO / Meta | Missing viewport meta tag — page won't display correctly on mobile devices | http://localhost:3847/blog |
| 24 | LOW | SEO / Meta | Missing meta description — search engines won't have a summary to show (x4) | http://localhost:3847/ (and 3 other pages) |
| 25 | LOW | SEO / Meta | Missing lang attribute on <html> — screen readers won't know what language to... | http://localhost:3847/ (and 3 other pages) |
| 26 | LOW | SEO / Meta | Found 2 image(s) without alt text — screen readers can't describe them | http://localhost:3847/ |
| 27 | LOW | SEO / Meta | No favicon found — browsers show a generic icon in the tab (x4) | http://localhost:3847/ (and 3 other pages) |
| 28 | LOW | SEO / Meta | No canonical URL set — search engines may index duplicate versions of this pa... | http://localhost:3847/ (and 3 other pages) |
| 29 | LOW | SEO / Meta | Missing Open Graph tag(s): og:title, og:description, og:image — social media ... | http://localhost:3847/ (and 3 other pages) |
| 30 | LOW | SEO / Meta | Heading levels are skipped (e.g., H1 followed by H3, missing H2) (x2) | http://localhost:3847/contact (and 1 other page) |
| 31 | LOW | Console Error | JavaScript error: Failed to load resource: the server responded with a status... | http://localhost:3847/ |
| 32 | LOW | Console Error | JavaScript error: Failed to load resource: the server responded with a status... | http://localhost:3847/pricing |
| 33 | LOW | Console Error | JavaScript error: Failed to load FAQ: Error: API returned 500     at http://l... | http://localhost:3847/pricing |

## Issue Details

### 1. JavaScript error: Failed to load resource: the server responded with a status of 404 (Not Found)

- **Error Type:** unknown
- **Confidence:** medium
- **Root Cause:** Set GEMINI_API_KEY for AI-powered root cause analysis
- **Suggested Fix:** A resource returned 404 — check if the file path or API endpoint URL is correct and the resource exists on the server.
- **Original Error:** `Failed to load resource: the server responded with a status of 404 (Not Found)`
- **Technical Details:** Failed to load resource: the server responded with a status of 404 (Not Found)

### 2. Tried to use .apiUrl on something that is undefined

- **Error Type:** javascript
- **Confidence:** medium
- **Root Cause:** The code calls .apiUrl on a value that is undefined. This usually means an element wasn't found or data hasn't loaded yet.
- **Suggested Fix:** Add a null check before accessing .apiUrl: use "if (variable) { variable.apiUrl }" or optional chaining "variable?.apiUrl"
- **Original Error:** `Uncaught TypeError: Cannot read properties of undefined (reading 'apiUrl')`
- **Technical Details:** Uncaught TypeError: Cannot read properties of undefined (reading 'apiUrl')

### 3. Image "icon-deploy.png" failed to load (404)

- **Error Type:** network
- **Confidence:** high
- **Root Cause:** The image at http://localhost:3847/images/icon-deploy.png returned status 404
- **Suggested Fix:** Check if "icon-deploy.png" exists in your images folder. If the file was renamed or moved, update the <img src> to match.
- **Original Error:** `Broken image: http://localhost:3847/images/icon-deploy.png (status 404)`

### 4. Image "icon-monitor.png" failed to load (404)

- **Error Type:** network
- **Confidence:** high
- **Root Cause:** The image at http://localhost:3847/images/icon-monitor.png returned status 404
- **Suggested Fix:** Check if "icon-monitor.png" exists in your images folder. If the file was renamed or moved, update the <img src> to match.
- **Original Error:** `Broken image: http://localhost:3847/images/icon-monitor.png (status 404)`

### 5. Image "icon-team.png" failed to load (404)

- **Error Type:** network
- **Confidence:** high
- **Root Cause:** The image at http://localhost:3847/images/icon-team.png returned status 404
- **Suggested Fix:** Check if "icon-team.png" exists in your images folder. If the file was renamed or moved, update the <img src> to match.
- **Original Error:** `Broken image: http://localhost:3847/images/icon-team.png (status 404)`

### 6. Image "office-map.png" failed to load (404)

- **Error Type:** network
- **Confidence:** high
- **Root Cause:** The image at http://localhost:3847/images/office-map.png returned status 404
- **Suggested Fix:** Check if "office-map.png" exists in your images folder. If the file was renamed or moved, update the <img src> to match.
- **Original Error:** `Broken image: http://localhost:3847/images/office-map.png (status 404)`

### 7. JavaScript error: Failed to load resource: the server responded with a status of 500 (Internal Server Error)

- **Error Type:** unknown
- **Confidence:** medium
- **Root Cause:** Set GEMINI_API_KEY for AI-powered root cause analysis
- **Suggested Fix:** The server returned a 500 error — check your server logs for the stack trace and fix the backend code.
- **Original Error:** `Failed to load resource: the server responded with a status of 500 (Internal Server Error)`
- **Technical Details:** Failed to load resource: the server responded with a status of 500 (Internal Server Error)

### 8. JavaScript error: Failed to load FAQ: Error: API returned 500     at http://localhost:3847/pricing:95:26

- **Error Type:** unknown
- **Confidence:** medium
- **Root Cause:** Set GEMINI_API_KEY for AI-powered root cause analysis
- **Suggested Fix:** The server returned a 500 error — check your server logs for the stack trace and fix the backend code.
- **Original Error:** `Failed to load FAQ: Error: API returned 500
    at http://localhost:3847/pricing:95:26`
- **Technical Details:** Failed to load FAQ: Error: API returned 500
    at http://localhost:3847/pricing:95:26

### 9. Server error

- **Error Type:** network
- **Confidence:** high
- **Root Cause:** The server encountered an error processing http://localhost:3847/api/data
- **Suggested Fix:** Contact the website administrator or try again later
- **Original Error:** `500 http://localhost:3847/api/data`
- **Technical Details:** HTTP 500: http://localhost:3847/api/data

### 10. "about" not found (404)

- **Error Type:** network
- **Confidence:** high
- **Root Cause:** The URL http://localhost:3847/about doesn't exist on the server
- **Suggested Fix:** Check if "about" exists at the expected path, or update the URL that references it
- **Original Error:** `404 http://localhost:3847/about`
- **Technical Details:** HTTP 404: http://localhost:3847/about

### 11. "blog" not found (404)

- **Error Type:** network
- **Confidence:** high
- **Root Cause:** The URL http://localhost:3847/blog doesn't exist on the server
- **Suggested Fix:** Check if "blog" exists at the expected path, or update the URL that references it
- **Original Error:** `404 http://localhost:3847/blog`
- **Technical Details:** HTTP 404: http://localhost:3847/blog

## Reproduction Steps

All workflows passed successfully.

## UI Audit Results

No UI audits performed.

## Accessibility

| Page | Critical | Serious | Moderate | Minor | Total |
|------|----------|---------|----------|-------|-------|
| http://localhost:3847/ | 1 | 2 | 0 | 0 | 3 |
| http://localhost:3847/contact | 0 | 1 | 0 | 0 | 1 |
| http://localhost:3847/blog | 0 | 1 | 0 | 0 | 1 |
| http://localhost:3847/pricing | 0 | 2 | 0 | 0 | 2 |

**Top Violations:**
- **Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds** (5 elements) - [Learn more](https://dequeuniversity.com/rules/axe/4.11/color-contrast?application=playwright)
- **Ensure every HTML document has a lang attribute** (4 elements) - [Learn more](https://dequeuniversity.com/rules/axe/4.11/html-has-lang?application=playwright)
- **Ensure <img> elements have alternative text or a role of none or presentation** (2 elements) - [Learn more](https://dequeuniversity.com/rules/axe/4.11/image-alt?application=playwright)

## Source Code References

No source code references available. Run with `--source ./path` for source-level diagnosis.

---

> **Tip:** Set `GEMINI_API_KEY` for smarter test planning and AI-powered root cause analysis. Get a free key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).

*Generated by Afterburn v1.0 on 09.02.2026, 23:54:17*
