# Error Gauntlet — Planted Error Manifest

This document lists every intentional error planted in the NimbusAI test site.
Use this as ground truth when evaluating Afterburn's detection capabilities.

## Site Structure
- **Port**: 3850
- **Pages**: 7 (index, about, pricing, blog, contact, login, dashboard)
- **Theme**: NimbusAI — fictional AI writing assistant SaaS

---

## Accessibility Errors (13 total)

| # | Error | Page | Element |
|---|-------|------|---------|
| A1 | Missing `lang` attribute on `<html>` | ALL pages | `<html>` tag |
| A2 | No skip navigation link | ALL pages | body start |
| A3 | Image missing `alt` text | index | icon-write.svg feature icon |
| A4 | Image missing `alt` text | about | team Priya photo |
| A5 | Image missing `alt` text | blog | blog-ai.svg card image |
| A6 | Image with empty `alt=""` (non-decorative) | about | team Sarah photo |
| A7 | Heading hierarchy skip (h1 → h3) | index | features section |
| A8 | Heading hierarchy skip (h1 → h4) | about | Our Story / Our Mission |
| A9 | Heading hierarchy skip (h3 → h5) | blog | SEO article subtitle |
| A10 | Low contrast text (#c0c0c0 on white) | index, pricing, contact, dashboard | `.low-contrast` class |
| A11 | Form input without label | index | newsletter email input |
| A12 | Form input without label | contact | company input, subject select |
| A13 | Form input without label | login | password field |
| A14 | Label `for` doesn't match input `id` | contact | email field (for="user-email" vs id="email") |
| A15 | Table without headers (`<th>`) | dashboard | recent documents table |
| A16 | Empty `aria-label=""` on button | dashboard | New Document button |
| A17 | Checkbox without proper label association | contact, login | newsletter/remember checkboxes |
| A18 | Tiny text (8px font-size) | index, about, login, pricing | `.tiny-text` class |
| A19 | Missing alt on blog "Featured in" logo | blog | 3rd logo image |

## SEO Errors (10 total)

| # | Error | Page |
|---|-------|------|
| S1 | No meta description | ALL pages |
| S2 | No Open Graph tags | ALL pages |
| S3 | No canonical link | ALL pages |
| S4 | Duplicate H1 tags | index (2x), pricing (2x) |
| S5 | Generic page title (no brand) | about ("About"), dashboard ("Dashboard") |
| S6 | No sitemap reference | ALL |
| S7 | Broken structured data (invalid JSON-LD) | about |
| S8 | No robots.txt | server level |
| S9 | Empty href links (not crawlable) | index, pricing, blog |
| S10 | Links to non-existent pages | index (/careers, /terms, /privacy), blog (/blog/*), login (/forgot-password, /signup), dashboard (/documents/*), about (/founding-story, /press-kit), pricing (/billing-explained), contact (/support-center, /status-page) |

## Performance Errors (7 total)

| # | Error | Page |
|---|-------|------|
| P1 | Render-blocking script in `<head>` | ALL pages (app.js) |
| P2 | Large inline base64 image | index (hidden 2000x2000 SVG) |
| P3 | No lazy loading on below-fold images | blog ("Featured in" logos) |
| P4 | Excessive DOM depth (10 nested divs) | index |
| P5 | Large unused CSS (~30 unused selectors) | style.css |
| P6 | Synchronous heavy computation on load | app.js (heavyComputation) |
| P7 | BMP image format (should be WebP/PNG) | index (hero-bg.bmp) |

## Security Errors (6 total)

| # | Error | Page |
|---|-------|------|
| X1 | No security headers (CSP, X-Frame-Options, etc.) | server level |
| X2 | External links without `rel="noopener"` | ALL pages (Twitter link) |
| X3 | Inline scripts with sensitive data | index (fake API key in config) |
| X4 | Mixed content reference (HTTP URL) | dashboard (analyticsUrl), blog (RSS link) |
| X5 | `javascript:void(0)` link | dashboard |
| X6 | Inline event handlers (onclick) | multiple pages |

## Broken Functionality (8 total)

| # | Error | Page |
|---|-------|------|
| B1 | 404 links (/careers, /terms, /privacy) | index footer/nav |
| B2 | 404 links (/blog/*, /forgot-password, /signup) | blog, login |
| B3 | 404 links (/documents/*) | dashboard |
| B9 | 404 links (/founding-story, /press-kit) | about (inline + footer) |
| B10 | 404 link (/billing-explained) | pricing (FAQ section) |
| B11 | 404 links (/support-center, /status-page) | contact (info section) |
| B4 | Broken images (team-alex.jpg, blog-productivity.jpg, icon-analytics.png) | about, blog, index |
| B5 | Empty href="" links | index, pricing, blog |
| B6 | Form submits to broken endpoint (500 error) | index newsletter |
| B7 | onclick calls undefined functions | index (handleGetStarted), pricing (handleCheckout), dashboard (exportAll, showDetailedStats) |
| B8 | JS console errors on every page load | app.js (APP_VERSION, visitor-counter, currentUser) |

## Form Errors (7 total)

| # | Error | Page |
|---|-------|------|
| F1 | Input without label | index (email), contact (company, subject) |
| F2 | No input validation | contact form |
| F3 | Missing autocomplete attributes | contact, login forms |
| F4 | Label/input id mismatch | contact (email field) |
| F5 | Form action to broken endpoint | index newsletter, login |
| F6 | Checkbox without label association | contact, login |
| F7 | Misleading label ("Username" for email input) | login |

## Mobile Errors (4 total)

| # | Error | Page |
|---|-------|------|
| M1 | No viewport meta tag | ALL pages |
| M2 | Fixed-width element (1200px banner) | index |
| M3 | Tiny tap targets (btn-tiny: 4px padding) | pricing (Contact Sales) |
| M4 | Text too small to read (8px) | multiple pages |

## Image Errors (6 total)

| # | Error | Page |
|---|-------|------|
| I1 | Missing alt text | index, about, blog (see A3-A5) |
| I2 | Empty alt on non-decorative image | about (see A6) |
| I3 | Broken image src (404) | index, about, blog (see B4) |
| I4 | BMP format (should be modern format) | index (hero-bg.bmp) |
| I5 | Missing width/height attributes | index feature icons |
| I6 | No lazy loading | blog (below-fold logos) |

---

**Total planted errors: ~65+ distinct issues across 8 categories**
