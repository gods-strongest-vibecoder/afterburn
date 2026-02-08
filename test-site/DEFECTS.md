# FlowSync Test Site — Intentional Defects Registry

This site is an intentionally broken "vibe-coded startup landing page" used to
validate that Afterburn correctly detects common web defects.

Server: `node server.js` on port **3847**

---

## Defect Inventory

| # | Category | Page | Element / Selector | Description | Afterburn Detector |
|---|----------|------|--------------------|-------------|-------------------|
| 1 | **Broken form** | `/` (index) | `.newsletter-form` | Newsletter signup form has `action="#"` and `onsubmit="return false"` — submitting does nothing | error-detector (form-no-action) |
| 2 | **Broken form** | `/contact` | `#contact-form` | Contact form submit button is `type="button"` with empty `sendMessage()` handler — never submits | error-detector (form-no-action) |
| 3 | **Dead button** | `/` (index) | `#hero-cta` | "Get Started Free" button calls `handleGetStarted()` which is a no-op | error-detector (dead-button) |
| 4 | **Dead button** | `/contact` | `#send-btn` | "Send Message" button calls `sendMessage()` which is a no-op | error-detector (dead-button) |
| 5 | **Dead button** | `/pricing` | Starter/Pro buttons | "Get Started" and "Start Free Trial" call `handleGetStarted()` no-op | error-detector (dead-button) |
| 6 | **Broken image** | `/` (index) | `img[src="/images/icon-deploy.png"]` | Image file does not exist — returns 404 | evidence-capture (broken-resource) |
| 7 | **Broken image** | `/` (index) | `img[src="/images/icon-monitor.png"]` | Image file does not exist — returns 404 | evidence-capture (broken-resource) |
| 8 | **Broken image** | `/` (index) | `img[src="/images/icon-team.png"]` | Image file does not exist — returns 404 | evidence-capture (broken-resource) |
| 9 | **Broken image** | `/contact` | `img[src="/images/office-map.png"]` | Map image does not exist — returns 404 | evidence-capture (broken-resource) |
| 10 | **Console error** | ALL pages | `js/app.js` line 6 | `TypeError: Cannot read properties of undefined (reading 'apiUrl')` on page load | error-detector (console-error) |
| 11 | **Broken link** | `/` (index) | `a[href="/about"]` | `/about` route not served — returns 404 | evidence-capture (broken-link) |
| 12 | **Broken link** | `/` (index) | `a[href="/blog"]` (footer) | `/blog` route not served — returns 404 | evidence-capture (broken-link) |
| 13 | **Broken link** | ALL pages (nav) | `a[href="/about"]` | Nav link to `/about` returns 404 on every page | evidence-capture (broken-link) |
| 14 | **Accessibility** | ALL pages | `<html>` | Missing `lang` attribute on root element | ui-auditor (a11y / axe-core) |
| 15 | **Accessibility** | `/` (index) | `img[src="/images/icon-deploy.png"]` | Missing `alt` attribute entirely | ui-auditor (a11y / axe-core) |
| 16 | **Accessibility** | `/` (index) | `img[src="/images/icon-monitor.png"]` | Missing `alt` attribute entirely | ui-auditor (a11y / axe-core) |
| 17 | **Accessibility** | `/` (index) | `.input-email` | Email input has no associated `<label>` | ui-auditor (a11y / axe-core) |
| 18 | **Accessibility** | `/contact` | `#name`, `#email`, `#message` | Form inputs have no associated `<label>` elements | ui-auditor (a11y / axe-core) |
| 19 | **Accessibility** | `/` (index) | `.low-contrast` | Testimonial text is `#d0d0d0` on white — fails WCAG AA contrast ratio | ui-auditor (a11y / contrast) |
| 20 | **HTTP 500** | `/pricing` | fetch `/api/data` | Pricing page fetches FAQ from `/api/data` which returns HTTP 500 | error-detector (http-error) |
| 21 | **UI: tiny text** | `/` (index) | `.fine-print` | Team Collaboration description is 8px — unreadable | ui-auditor (visual / font-size) |
| 22 | **UI: overlap** | `/` (index) | `.metric-featured` | "3.2M" metric shifted left 80px, overlapping adjacent metric | ui-auditor (visual / overlap) |
| 23 | **UI: cramped** | `/contact` | `.info-grid` | Info cards have 4px gap and 4px padding — extremely cramped (default styling) | ui-auditor (visual / spacing) |

---

## Summary by Detector

| Afterburn Module | Expected Hits |
|---|---|
| `error-detector` (console-error) | 1 (TypeError on every page) |
| `error-detector` (dead-button) | 5 buttons across 3 pages |
| `error-detector` (form-no-action) | 2 forms (newsletter + contact) |
| `error-detector` (http-error) | 1 (500 on /api/data) |
| `evidence-capture` (broken-resource) | 4 broken images |
| `evidence-capture` (broken-link) | 3 unique broken link targets (/about, /blog) |
| `ui-auditor` (a11y) | 6+ (missing lang, missing alt, missing labels, bad contrast) |
| `ui-auditor` (visual) | 3 (tiny text, overlap, cramped spacing) |

**Total distinct defects: 23**
