---
tool: afterburn
version: "1.0"
session_id: dbc43e0c-d82a-4631-ae20-e950d3c560dc
timestamp: 2026-02-08T15:25:22.212Z
target_url: "http://localhost:3847/"
health_score: 62
health_label: needs-work
total_issues: 40
workflows_tested: 8
workflows_passed: 8
workflows_failed: 0
ai_powered: false
source_analysis: false
---

# Afterburn Test Report

**Target:** http://localhost:3847
**Health Score:** 62/100 (needs-work)
**Date:** 08.02.2026, 16:25:22
**Mode:** Basic

## Summary

| Metric | Value |
|--------|-------|
| Workflows Tested | 8 |
| Workflows Passed | 8 |
| Workflows Failed | 0 |
| Total Issues | 40 |
| Dead Buttons | 7 |
| Broken Forms | 4 |
| Accessibility Violations | 7 |

## Issues (Prioritized)

| # | Priority | Category | Summary | Location |
|---|----------|----------|---------|----------|
| 1 | HIGH | Workflow Error | Form "form.newsletter-form" submission isn't working (x2) | Unknown |
| 2 | HIGH | Workflow Error | Form "form#contact-form" submission isn't working (x2) | Unknown |
| 3 | MEDIUM | Console Error | Tried to access something that doesn't exist in the code | http://localhost:3847/ |
| 4 | MEDIUM | Console Error | Page or resource not found | http://localhost:3847/images/icon-deploy.png |
| 5 | MEDIUM | Console Error | Page or resource not found | http://localhost:3847/images/icon-monitor.png |
| 6 | MEDIUM | Console Error | Page or resource not found | http://localhost:3847/images/icon-team.png |
| 7 | MEDIUM | Console Error | An image failed to load | http://localhost:3847/images/icon-deploy.png |
| 8 | MEDIUM | Console Error | An image failed to load | http://localhost:3847/images/icon-monitor.png |
| 9 | MEDIUM | Console Error | An image failed to load | http://localhost:3847/images/icon-team.png |
| 10 | MEDIUM | Console Error | Page or resource not found | http://localhost:3847/images/office-map.png |
| 11 | MEDIUM | Console Error | An image failed to load | http://localhost:3847/images/office-map.png |
| 12 | MEDIUM | Console Error | Server error | http://localhost:3847/api/data |
| 13 | MEDIUM | Console Error | Page or resource not found | http://localhost:3847/about |
| 14 | MEDIUM | Console Error | Page or resource not found | http://localhost:3847/blog |
| 15 | MEDIUM | Dead Button | A button labeled 'form:nth-of-type(1) [type="submit"], form:nth-of-type(1) bu... | http://localhost:3847 |
| 16 | MEDIUM | Dead Button | A button labeled 'form#contact-form [type="submit"], form#contact-form button... | http://localhost:3847 |
| 17 | MEDIUM | Dead Button | A button labeled 'button:has-text("Get Started Free")' doesn't do anything wh... | http://localhost:3847 |
| 18 | MEDIUM | Dead Button | A button labeled 'button:has-text("Subscribe")' doesn't do anything when clicked | http://localhost:3847 |
| 19 | MEDIUM | Dead Button | A button labeled 'button:has-text("Send Message")' doesn't do anything when c... | http://localhost:3847 |
| 20 | MEDIUM | Dead Button | A button labeled 'button:has-text("Get Started")' doesn't do anything when cl... | http://localhost:3847 |
| 21 | MEDIUM | Dead Button | A button labeled 'button:has-text("Start Free Trial")' doesn't do anything wh... | http://localhost:3847 |
| 22 | MEDIUM | Broken Form | A form on your site doesn't work when submitted (x2) | http://localhost:3847 (form.newsletter-form) |
| 23 | MEDIUM | Broken Form | A form on your site doesn't work when submitted (x2) | http://localhost:3847 (form#contact-form) |
| 24 | MEDIUM | Accessibility | Ensure the contrast between foreground and background colors meets WCAG 2 AA ... | http://localhost:3847/ |
| 25 | MEDIUM | Accessibility | Ensure every HTML document has a lang attribute | http://localhost:3847/ |
| 26 | MEDIUM | Accessibility | Ensure <img> elements have alternative text or a role of none or presentation | http://localhost:3847/ |
| 27 | MEDIUM | Accessibility | Ensure every HTML document has a lang attribute | http://localhost:3847/contact |
| 28 | MEDIUM | Accessibility | Ensure every HTML document has a lang attribute | http://localhost:3847/blog |
| 29 | MEDIUM | Accessibility | Ensure the contrast between foreground and background colors meets WCAG 2 AA ... | http://localhost:3847/pricing |
| 30 | MEDIUM | Accessibility | Ensure every HTML document has a lang attribute | http://localhost:3847/pricing |
| 31 | LOW | Console Error | JavaScript error: Failed to load resource: the server responded with a status... | http://localhost:3847/ |
| 32 | LOW | Console Error | JavaScript error: Failed to load resource: the server responded with a status... | http://localhost:3847/pricing |
| 33 | LOW | Console Error | JavaScript error: Failed to load FAQ: Error: API returned 500     at http://l... | http://localhost:3847/pricing |
| 34 | LOW | Console Error | Button "form:nth-of-type(1) [type="submit"], form:nth-of-type(1) button:last-... | Unknown |
| 35 | LOW | Console Error | Button "form#contact-form [type="submit"], form#contact-form button:last-of-t... | Unknown |
| 36 | LOW | Console Error | Button "button:has-text("Get Started Free")" doesn't do anything when clicked | Unknown |
| 37 | LOW | Console Error | Button "button:has-text("Subscribe")" doesn't do anything when clicked | Unknown |
| 38 | LOW | Console Error | Button "button:has-text("Send Message")" doesn't do anything when clicked | Unknown |
| 39 | LOW | Console Error | Button "button:has-text("Get Started")" doesn't do anything when clicked | Unknown |
| 40 | LOW | Console Error | Button "button:has-text("Start Free Trial")" doesn't do anything when clicked | Unknown |

## Issue Details

### 1. JavaScript error: Failed to load resource: the server responded with a status of 404 (Not Found)

- **Error Type:** unknown
- **Confidence:** low
- **Root Cause:** Unable to determine root cause without AI analysis
- **Suggested Fix:** Set GEMINI_API_KEY for detailed AI diagnosis, or review the error in the browser console
- **Original Error:** `Failed to load resource: the server responded with a status of 404 (Not Found)`
- **Technical Details:** Failed to load resource: the server responded with a status of 404 (Not Found)

### 2. Tried to access something that doesn't exist in the code

- **Error Type:** javascript
- **Confidence:** medium
- **Root Cause:** The code is trying to use a property or method on something that is null or undefined
- **Suggested Fix:** Check that all variables are properly initialized before use
- **Original Error:** `Uncaught TypeError: Cannot read properties of undefined (reading 'apiUrl')`
- **Technical Details:** Uncaught TypeError: Cannot read properties of undefined (reading 'apiUrl')

### 3. Page or resource not found

- **Error Type:** network
- **Confidence:** high
- **Root Cause:** The URL http://localhost:3847/images/icon-deploy.png doesn't exist on the server
- **Suggested Fix:** Check if the URL is correct or if the resource has been moved
- **Original Error:** `404 http://localhost:3847/images/icon-deploy.png`
- **Technical Details:** HTTP 404: http://localhost:3847/images/icon-deploy.png

### 4. Page or resource not found

- **Error Type:** network
- **Confidence:** high
- **Root Cause:** The URL http://localhost:3847/images/icon-monitor.png doesn't exist on the server
- **Suggested Fix:** Check if the URL is correct or if the resource has been moved
- **Original Error:** `404 http://localhost:3847/images/icon-monitor.png`
- **Technical Details:** HTTP 404: http://localhost:3847/images/icon-monitor.png

### 5. Page or resource not found

- **Error Type:** network
- **Confidence:** high
- **Root Cause:** The URL http://localhost:3847/images/icon-team.png doesn't exist on the server
- **Suggested Fix:** Check if the URL is correct or if the resource has been moved
- **Original Error:** `404 http://localhost:3847/images/icon-team.png`
- **Technical Details:** HTTP 404: http://localhost:3847/images/icon-team.png

### 6. An image failed to load

- **Error Type:** network
- **Confidence:** medium
- **Root Cause:** The image at http://localhost:3847/images/icon-deploy.png is missing or inaccessible
- **Suggested Fix:** Check if the image file exists and the URL is correct
- **Original Error:** `Broken image: http://localhost:3847/images/icon-deploy.png (status 404)`

### 7. An image failed to load

- **Error Type:** network
- **Confidence:** medium
- **Root Cause:** The image at http://localhost:3847/images/icon-monitor.png is missing or inaccessible
- **Suggested Fix:** Check if the image file exists and the URL is correct
- **Original Error:** `Broken image: http://localhost:3847/images/icon-monitor.png (status 404)`

### 8. An image failed to load

- **Error Type:** network
- **Confidence:** medium
- **Root Cause:** The image at http://localhost:3847/images/icon-team.png is missing or inaccessible
- **Suggested Fix:** Check if the image file exists and the URL is correct
- **Original Error:** `Broken image: http://localhost:3847/images/icon-team.png (status 404)`

### 9. Page or resource not found

- **Error Type:** network
- **Confidence:** high
- **Root Cause:** The URL http://localhost:3847/images/office-map.png doesn't exist on the server
- **Suggested Fix:** Check if the URL is correct or if the resource has been moved
- **Original Error:** `404 http://localhost:3847/images/office-map.png`
- **Technical Details:** HTTP 404: http://localhost:3847/images/office-map.png

### 10. An image failed to load

- **Error Type:** network
- **Confidence:** medium
- **Root Cause:** The image at http://localhost:3847/images/office-map.png is missing or inaccessible
- **Suggested Fix:** Check if the image file exists and the URL is correct
- **Original Error:** `Broken image: http://localhost:3847/images/office-map.png (status 404)`

### 11. JavaScript error: Failed to load resource: the server responded with a status of 500 (Internal Server Error)

- **Error Type:** unknown
- **Confidence:** low
- **Root Cause:** Unable to determine root cause without AI analysis
- **Suggested Fix:** Set GEMINI_API_KEY for detailed AI diagnosis, or review the error in the browser console
- **Original Error:** `Failed to load resource: the server responded with a status of 500 (Internal Server Error)`
- **Technical Details:** Failed to load resource: the server responded with a status of 500 (Internal Server Error)

### 12. JavaScript error: Failed to load FAQ: Error: API returned 500     at http://localhost:3847/pricing:95:26

- **Error Type:** unknown
- **Confidence:** low
- **Root Cause:** Unable to determine root cause without AI analysis
- **Suggested Fix:** Set GEMINI_API_KEY for detailed AI diagnosis, or review the error in the browser console
- **Original Error:** `Failed to load FAQ: Error: API returned 500
    at http://localhost:3847/pricing:95:26`
- **Technical Details:** Failed to load FAQ: Error: API returned 500
    at http://localhost:3847/pricing:95:26

### 13. Server error

- **Error Type:** network
- **Confidence:** high
- **Root Cause:** The server encountered an error processing http://localhost:3847/api/data
- **Suggested Fix:** Contact the website administrator or try again later
- **Original Error:** `500 http://localhost:3847/api/data`
- **Technical Details:** HTTP 500: http://localhost:3847/api/data

### 14. Page or resource not found

- **Error Type:** network
- **Confidence:** high
- **Root Cause:** The URL http://localhost:3847/about doesn't exist on the server
- **Suggested Fix:** Check if the URL is correct or if the resource has been moved
- **Original Error:** `404 http://localhost:3847/about`
- **Technical Details:** HTTP 404: http://localhost:3847/about

### 15. Page or resource not found

- **Error Type:** network
- **Confidence:** high
- **Root Cause:** The URL http://localhost:3847/blog doesn't exist on the server
- **Suggested Fix:** Check if the URL is correct or if the resource has been moved
- **Original Error:** `404 http://localhost:3847/blog`
- **Technical Details:** HTTP 404: http://localhost:3847/blog

### 16. Button "form:nth-of-type(1) [type="submit"], form:nth-of-type(1) button:last-of-type" doesn't do anything when clicked

- **Error Type:** dom
- **Confidence:** high
- **Root Cause:** The button is not connected to any functionality
- **Suggested Fix:** Connect the button to a click handler or navigation action
- **Original Error:** `Dead button: form:nth-of-type(1) [type="submit"], form:nth-of-type(1) button:last-of-type`

### 17. Button "form#contact-form [type="submit"], form#contact-form button:last-of-type" doesn't do anything when clicked

- **Error Type:** dom
- **Confidence:** high
- **Root Cause:** The button is not connected to any functionality
- **Suggested Fix:** Connect the button to a click handler or navigation action
- **Original Error:** `Dead button: form#contact-form [type="submit"], form#contact-form button:last-of-type`

### 18. Button "button:has-text("Get Started Free")" doesn't do anything when clicked

- **Error Type:** dom
- **Confidence:** high
- **Root Cause:** The button is not connected to any functionality
- **Suggested Fix:** Connect the button to a click handler or navigation action
- **Original Error:** `Dead button: button:has-text("Get Started Free")`

### 19. Button "button:has-text("Subscribe")" doesn't do anything when clicked

- **Error Type:** dom
- **Confidence:** high
- **Root Cause:** The button is not connected to any functionality
- **Suggested Fix:** Connect the button to a click handler or navigation action
- **Original Error:** `Dead button: button:has-text("Subscribe")`

### 20. Button "button:has-text("Send Message")" doesn't do anything when clicked

- **Error Type:** dom
- **Confidence:** high
- **Root Cause:** The button is not connected to any functionality
- **Suggested Fix:** Connect the button to a click handler or navigation action
- **Original Error:** `Dead button: button:has-text("Send Message")`

### 21. Button "button:has-text("Get Started")" doesn't do anything when clicked

- **Error Type:** dom
- **Confidence:** high
- **Root Cause:** The button is not connected to any functionality
- **Suggested Fix:** Connect the button to a click handler or navigation action
- **Original Error:** `Dead button: button:has-text("Get Started")`

### 22. Button "button:has-text("Start Free Trial")" doesn't do anything when clicked

- **Error Type:** dom
- **Confidence:** high
- **Root Cause:** The button is not connected to any functionality
- **Suggested Fix:** Connect the button to a click handler or navigation action
- **Original Error:** `Dead button: button:has-text("Start Free Trial")`

### 23. Form "form.newsletter-form" submission isn't working

- **Error Type:** form
- **Confidence:** high
- **Root Cause:** Form submission caused no navigation or network request
- **Suggested Fix:** Check the form submit handler and network requests
- **Original Error:** `Broken form: form.newsletter-form - Form submission caused no navigation or network request`

### 24. Form "form.newsletter-form" submission isn't working

- **Error Type:** form
- **Confidence:** high
- **Root Cause:** Form submission caused no navigation or network request
- **Suggested Fix:** Check the form submit handler and network requests
- **Original Error:** `Broken form: form.newsletter-form - Form submission caused no navigation or network request`

### 25. Form "form#contact-form" submission isn't working

- **Error Type:** form
- **Confidence:** high
- **Root Cause:** Form submission caused no navigation or network request
- **Suggested Fix:** Check the form submit handler and network requests
- **Original Error:** `Broken form: form#contact-form - Form submission caused no navigation or network request`

### 26. Form "form#contact-form" submission isn't working

- **Error Type:** form
- **Confidence:** high
- **Root Cause:** Form submission caused no navigation or network request
- **Suggested Fix:** Check the form submit handler and network requests
- **Original Error:** `Broken form: form#contact-form - Form submission caused no navigation or network request`

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

*Generated by Afterburn v1.0 on 08.02.2026, 16:25:22*
