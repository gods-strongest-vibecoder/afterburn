---
tool: afterburn
version: "1.0"
session_id: eaaaa9a7-87d9-4c28-b84c-f613ae95c3e7
timestamp: 2026-02-09T16:47:47.320Z
target_url: "http://localhost:3847/"
health_score: 62
health_label: needs-work
total_issues: 20
workflows_tested: 8
workflows_passed: 8
workflows_failed: 0
ai_powered: false
source_analysis: false
---

# Afterburn Test Report

**Target:** http://localhost:3847
**Health Score:** 62/100 (needs-work)
**Date:** 09.02.2026, 17:47:47
**Mode:** Basic

## Summary

| Metric | Value |
|--------|-------|
| Workflows Tested | 8 |
| Workflows Passed | 8 |
| Workflows Failed | 0 |
| Total Issues | 20 |
| Dead Buttons | 7 |
| Broken Forms | 4 |
| Accessibility Violations | 7 |

## Issues (Prioritized)

| # | Priority | Category | Summary | Location |
|---|----------|----------|---------|----------|
| 1 | MEDIUM | Console Error | Tried to access something that doesn't exist in the code | http://localhost:3847/ |
| 2 | MEDIUM | Console Error | An image failed to load (x4) | http://localhost:3847/images/icon-deploy.png (and 3 other pages) |
| 3 | MEDIUM | Console Error | Server error | http://localhost:3847/api/data |
| 4 | MEDIUM | Console Error | Page or resource not found | http://localhost:3847/about |
| 5 | MEDIUM | Console Error | Page or resource not found | http://localhost:3847/blog |
| 6 | MEDIUM | Dead Button | Submit button doesn't do anything when clicked | http://localhost:3847 |
| 7 | MEDIUM | Dead Button | Submit button (contact form form) doesn't do anything when clicked | http://localhost:3847 |
| 8 | MEDIUM | Dead Button | "Get Started Free" button doesn't do anything when clicked | http://localhost:3847 |
| 9 | MEDIUM | Dead Button | "Subscribe" button doesn't do anything when clicked | http://localhost:3847 |
| 10 | MEDIUM | Dead Button | "Send Message" button doesn't do anything when clicked | http://localhost:3847 |
| 11 | MEDIUM | Dead Button | "Get Started" button doesn't do anything when clicked | http://localhost:3847 |
| 12 | MEDIUM | Dead Button | "Start Free Trial" button doesn't do anything when clicked | http://localhost:3847 |
| 13 | MEDIUM | Broken Form | A form on your site doesn't work when submitted (x2) | http://localhost:3847 (form.newsletter-form) |
| 14 | MEDIUM | Broken Form | A form on your site doesn't work when submitted (x2) | http://localhost:3847 (form#contact-form) |
| 15 | MEDIUM | Accessibility | Ensure the contrast between foreground and background colors meets WCAG 2 AA ... | http://localhost:3847/ (and 1 other page) |
| 16 | MEDIUM | Accessibility | Ensure every HTML document has a lang attribute (x4) | http://localhost:3847/ (and 3 other pages) |
| 17 | MEDIUM | Accessibility | Ensure <img> elements have alternative text or a role of none or presentation | http://localhost:3847/ |
| 18 | LOW | Console Error | JavaScript error: Failed to load resource: the server responded with a status... | http://localhost:3847/ |
| 19 | LOW | Console Error | JavaScript error: Failed to load resource: the server responded with a status... | http://localhost:3847/pricing |
| 20 | LOW | Console Error | JavaScript error: Failed to load FAQ: Error: API returned 500     at http://l... | http://localhost:3847/pricing |

## Issue Details

### 1. JavaScript error: Failed to load resource: the server responded with a status of 404 (Not Found)

- **Error Type:** unknown
- **Confidence:** low
- **Root Cause:** Unable to determine root cause without AI analysis
- **Suggested Fix:** Review the error in the browser console and check the surrounding code
- **Original Error:** `Failed to load resource: the server responded with a status of 404 (Not Found)`
- **Technical Details:** Failed to load resource: the server responded with a status of 404 (Not Found)

### 2. Tried to access something that doesn't exist in the code

- **Error Type:** javascript
- **Confidence:** medium
- **Root Cause:** The code is trying to use a property or method on something that is null or undefined
- **Suggested Fix:** Check that all variables are properly initialized before use
- **Original Error:** `Uncaught TypeError: Cannot read properties of undefined (reading 'apiUrl')`
- **Technical Details:** Uncaught TypeError: Cannot read properties of undefined (reading 'apiUrl')

### 3. An image failed to load

- **Error Type:** network
- **Confidence:** medium
- **Root Cause:** The image at http://localhost:3847/images/icon-deploy.png is missing or inaccessible
- **Suggested Fix:** Check if the image file exists and the URL is correct
- **Original Error:** `Broken image: http://localhost:3847/images/icon-deploy.png (status 404)`

### 4. An image failed to load

- **Error Type:** network
- **Confidence:** medium
- **Root Cause:** The image at http://localhost:3847/images/icon-monitor.png is missing or inaccessible
- **Suggested Fix:** Check if the image file exists and the URL is correct
- **Original Error:** `Broken image: http://localhost:3847/images/icon-monitor.png (status 404)`

### 5. An image failed to load

- **Error Type:** network
- **Confidence:** medium
- **Root Cause:** The image at http://localhost:3847/images/icon-team.png is missing or inaccessible
- **Suggested Fix:** Check if the image file exists and the URL is correct
- **Original Error:** `Broken image: http://localhost:3847/images/icon-team.png (status 404)`

### 6. An image failed to load

- **Error Type:** network
- **Confidence:** medium
- **Root Cause:** The image at http://localhost:3847/images/office-map.png is missing or inaccessible
- **Suggested Fix:** Check if the image file exists and the URL is correct
- **Original Error:** `Broken image: http://localhost:3847/images/office-map.png (status 404)`

### 7. JavaScript error: Failed to load resource: the server responded with a status of 500 (Internal Server Error)

- **Error Type:** unknown
- **Confidence:** low
- **Root Cause:** Unable to determine root cause without AI analysis
- **Suggested Fix:** Review the error in the browser console and check the surrounding code
- **Original Error:** `Failed to load resource: the server responded with a status of 500 (Internal Server Error)`
- **Technical Details:** Failed to load resource: the server responded with a status of 500 (Internal Server Error)

### 8. JavaScript error: Failed to load FAQ: Error: API returned 500     at http://localhost:3847/pricing:95:26

- **Error Type:** unknown
- **Confidence:** low
- **Root Cause:** Unable to determine root cause without AI analysis
- **Suggested Fix:** Review the error in the browser console and check the surrounding code
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

### 10. Page or resource not found

- **Error Type:** network
- **Confidence:** high
- **Root Cause:** The URL http://localhost:3847/about doesn't exist on the server
- **Suggested Fix:** Check if the URL is correct or if the resource has been moved
- **Original Error:** `404 http://localhost:3847/about`
- **Technical Details:** HTTP 404: http://localhost:3847/about

### 11. Page or resource not found

- **Error Type:** network
- **Confidence:** high
- **Root Cause:** The URL http://localhost:3847/blog doesn't exist on the server
- **Suggested Fix:** Check if the URL is correct or if the resource has been moved
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

*Generated by Afterburn v1.0 on 09.02.2026, 17:47:47*
