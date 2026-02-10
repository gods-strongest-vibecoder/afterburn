// Lightweight heuristic checks for common meta tag and SEO issues (no AI needed)
/**
 * Audit a page for common meta tag and structural SEO issues.
 * These are heuristic checks that don't require AI — just DOM inspection.
 */
export async function auditMeta(page) {
    const url = page.url();
    const issues = [];
    try {
        const checks = await page.evaluate(() => {
            const html = document.documentElement;
            const head = document.head;
            // Check lang attribute
            const hasLang = !!html.getAttribute('lang');
            // Check viewport meta tag
            const hasViewport = !!head.querySelector('meta[name="viewport"]');
            // Check meta description
            const hasDescription = !!head.querySelector('meta[name="description"]');
            // Check title
            const title = document.title?.trim();
            const hasTitle = !!title && title.length > 0;
            const titleLength = title?.length || 0;
            // Check H1 count (multiple H1s is a common SEO mistake)
            const h1Count = document.querySelectorAll('h1').length;
            // Check for heading hierarchy gaps (e.g., h1 → h3, skipping h2)
            const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
            let hasSkippedHeading = false;
            for (let i = 1; i < headings.length; i++) {
                const prevLevel = parseInt(headings[i - 1].tagName[1]);
                const currLevel = parseInt(headings[i].tagName[1]);
                if (currLevel > prevLevel + 1) {
                    hasSkippedHeading = true;
                    break;
                }
            }
            // Check for images without alt text (supplements axe-core)
            const imagesWithoutAlt = document.querySelectorAll('img:not([alt])').length;
            // Check for links with empty href
            const emptyHrefLinks = document.querySelectorAll('a[href=""], a[href="#"]').length;
            // Check for external links without rel="noopener"
            const unsafeExternalLinks = Array.from(document.querySelectorAll('a[target="_blank"]'))
                .filter(a => {
                const rel = a.getAttribute('rel') || '';
                return !rel.includes('noopener') && !rel.includes('noreferrer');
            }).length;
            // Check for render-blocking scripts in <head> (no defer or async)
            const renderBlockingScripts = Array.from(head.querySelectorAll('script[src]'))
                .filter(s => !s.hasAttribute('defer') && !s.hasAttribute('async') && !s.getAttribute('type')?.includes('module'))
                .length;
            // Check for potential exposed secrets in inline scripts
            const inlineScripts = Array.from(document.querySelectorAll('script:not([src])'))
                .map(s => s.textContent || '');
            const secretPatterns = [
                /['"]sk-[a-zA-Z0-9]{10,}['"]/, // OpenAI-style keys
                /['"](api[_-]?key|apiKey)['"]?\s*[:=]\s*['"][^'"]{8,}['"]/i, // api_key, api-key, apiKey = "..."
                /['"](secret|secretKey|secret_key)['"]?\s*[:=]\s*['"][^'"]{8,}['"]/i, // secret = "..."
                /['"](password|passwd)['"]?\s*[:=]\s*['"][^'"]{4,}['"]/i, // password = "..."
                /['"](token|accessToken|access_token|auth_token)['"]?\s*[:=]\s*['"][^'"]{10,}['"]/i, // token = "..."
                /['"]AKIA[A-Z0-9]{12,}['"]/, // AWS access keys
                /['"]ghp_[a-zA-Z0-9]{30,}['"]/, // GitHub PATs
            ];
            let exposedSecretsCount = 0;
            for (const script of inlineScripts) {
                for (const pattern of secretPatterns) {
                    if (pattern.test(script)) {
                        exposedSecretsCount++;
                        break; // one secret per script is enough
                    }
                }
            }
            // Check for javascript:void(0) links (dead links)
            const jsVoidLinks = document.querySelectorAll('a[href^="javascript:"]').length;
            // Check for favicon
            const hasFavicon = !!head.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
            // Check for canonical URL
            const hasCanonical = !!head.querySelector('link[rel="canonical"]');
            // Check for Open Graph tags (social sharing previews)
            const hasOgTitle = !!head.querySelector('meta[property="og:title"]');
            const hasOgDescription = !!head.querySelector('meta[property="og:description"]');
            const hasOgImage = !!head.querySelector('meta[property="og:image"]');
            // Check for mixed content (HTTP resources on HTTPS pages)
            let mixedContentCount = 0;
            if (window.location.protocol === 'https:') {
                const httpResources = document.querySelectorAll('img[src^="http:"], script[src^="http:"], link[href^="http:"], iframe[src^="http:"], video[src^="http:"], audio[src^="http:"]');
                mixedContentCount = httpResources.length;
            }
            return {
                hasLang,
                hasViewport,
                hasDescription,
                hasTitle,
                titleLength,
                h1Count,
                hasSkippedHeading,
                imagesWithoutAlt,
                emptyHrefLinks,
                unsafeExternalLinks,
                renderBlockingScripts,
                exposedSecretsCount,
                jsVoidLinks,
                hasFavicon,
                hasCanonical,
                hasOgTitle,
                hasOgDescription,
                hasOgImage,
                mixedContentCount,
            };
        });
        // Evaluate results
        if (!checks.hasViewport) {
            issues.push({
                id: 'missing-viewport',
                severity: 'high',
                description: 'Missing viewport meta tag — page won\'t display correctly on mobile devices',
                suggestion: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to the <head>',
            });
        }
        if (!checks.hasDescription) {
            issues.push({
                id: 'missing-meta-description',
                severity: 'medium',
                description: 'Missing meta description — search engines won\'t have a summary to show',
                suggestion: 'Add <meta name="description" content="Your page description here"> to the <head>',
            });
        }
        if (!checks.hasTitle) {
            issues.push({
                id: 'missing-title',
                severity: 'high',
                description: 'Missing or empty page title',
                suggestion: 'Add a descriptive <title> tag in the <head>',
            });
        }
        else if (checks.titleLength > 60) {
            issues.push({
                id: 'title-too-long',
                severity: 'low',
                description: 'Page title is longer than 60 characters — it may get truncated in search results',
                suggestion: 'Shorten the title to 60 characters or fewer',
            });
        }
        if (checks.h1Count === 0) {
            issues.push({
                id: 'missing-h1',
                severity: 'medium',
                description: 'No H1 heading found — every page should have exactly one H1',
                suggestion: 'Add a single H1 heading that describes the page content',
            });
        }
        else if (checks.h1Count > 1) {
            issues.push({
                id: 'multiple-h1',
                severity: 'medium',
                description: `Found ${checks.h1Count} H1 headings — there should be exactly one per page`,
                suggestion: 'Keep one H1 and change the others to H2 or lower',
            });
        }
        if (checks.hasSkippedHeading) {
            issues.push({
                id: 'skipped-heading-level',
                severity: 'low',
                description: 'Heading levels are skipped (e.g., H1 followed by H3, missing H2)',
                suggestion: 'Use headings in order: H1, then H2, then H3, etc.',
            });
        }
        if (checks.emptyHrefLinks > 0) {
            issues.push({
                id: 'empty-href',
                severity: 'medium',
                description: `Found ${checks.emptyHrefLinks} link(s) with empty or "#" href — they go nowhere`,
                suggestion: 'Add a real URL to each link\'s href attribute, or remove the link',
            });
        }
        if (checks.unsafeExternalLinks > 0) {
            issues.push({
                id: 'unsafe-external-link',
                severity: 'low',
                description: `Found ${checks.unsafeExternalLinks} external link(s) opening in new tab without rel="noopener"`,
                suggestion: 'Add rel="noopener noreferrer" to all links with target="_blank"',
            });
        }
        if (checks.renderBlockingScripts > 0) {
            issues.push({
                id: 'render-blocking-script',
                severity: 'medium',
                description: `Found ${checks.renderBlockingScripts} render-blocking script(s) in <head> — they slow down page load`,
                suggestion: 'Add "defer" or "async" to <script> tags, or move them to the end of <body>',
            });
        }
        if (checks.exposedSecretsCount > 0) {
            issues.push({
                id: 'exposed-secret',
                severity: 'high',
                description: `Found ${checks.exposedSecretsCount} potential API key(s) or secret(s) exposed in inline scripts`,
                suggestion: 'Never put API keys in client-side code — move them to environment variables on the server',
            });
        }
        if (checks.jsVoidLinks > 0) {
            issues.push({
                id: 'javascript-void-link',
                severity: 'medium',
                description: `Found ${checks.jsVoidLinks} link(s) using javascript:void(0) — they don't navigate anywhere`,
                suggestion: 'Replace javascript: links with real URLs or use <button> elements for actions',
            });
        }
        if (!checks.hasLang) {
            issues.push({
                id: 'missing-lang',
                severity: 'medium',
                description: 'Missing lang attribute on <html> — screen readers won\'t know what language to use',
                suggestion: 'Add lang="en" (or your language) to the <html> tag',
            });
        }
        if (checks.imagesWithoutAlt > 0) {
            issues.push({
                id: 'images-missing-alt',
                severity: 'medium',
                description: `Found ${checks.imagesWithoutAlt} image(s) without alt text — screen readers can't describe them`,
                suggestion: 'Add descriptive alt="" attributes to all <img> tags (use alt="" for decorative images)',
            });
        }
        if (!checks.hasFavicon) {
            issues.push({
                id: 'missing-favicon',
                severity: 'low',
                description: 'No favicon found — browsers show a generic icon in the tab',
                suggestion: 'Add <link rel="icon" href="/favicon.ico"> to the <head>',
            });
        }
        if (!checks.hasCanonical) {
            issues.push({
                id: 'missing-canonical',
                severity: 'low',
                description: 'No canonical URL set — search engines may index duplicate versions of this page',
                suggestion: 'Add <link rel="canonical" href="https://yoursite.com/page"> to the <head>',
            });
        }
        if (!checks.hasOgTitle || !checks.hasOgDescription || !checks.hasOgImage) {
            const missing = [];
            if (!checks.hasOgTitle)
                missing.push('og:title');
            if (!checks.hasOgDescription)
                missing.push('og:description');
            if (!checks.hasOgImage)
                missing.push('og:image');
            issues.push({
                id: 'missing-open-graph',
                severity: 'low',
                description: `Missing Open Graph tag(s): ${missing.join(', ')} — social media shares won't have a rich preview`,
                suggestion: 'Add Open Graph meta tags for better social sharing previews',
            });
        }
        if (checks.mixedContentCount > 0) {
            issues.push({
                id: 'mixed-content',
                severity: 'high',
                description: `Found ${checks.mixedContentCount} HTTP resource(s) loaded on an HTTPS page — browsers may block them`,
                suggestion: 'Change all resource URLs from http:// to https:// to avoid mixed content warnings',
            });
        }
    }
    catch (error) {
        // Graceful degradation — meta audit failure doesn't break the pipeline
        console.warn('Meta audit failed:', error);
    }
    return { url, issues };
}
//# sourceMappingURL=meta-auditor.js.map