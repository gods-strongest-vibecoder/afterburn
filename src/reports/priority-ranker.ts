// Categorize and prioritize issues from diagnosed errors, UI audits, and execution results

import { DiagnosedError, UIAuditResult } from '../analysis/diagnosis-schema.js';
import { ExecutionArtifact } from '../types/execution.js';

/**
 * Convert raw Playwright selectors into human-readable button labels.
 * e.g. 'button:has-text("Subscribe")' → '"Subscribe" button'
 *      'form:nth-of-type(1) [type="submit"]' → 'Submit button'
 */
function humanizeSelector(selector: string): string {
  // Extract button text from :has-text("...") patterns
  const hasTextMatch = selector.match(/:?has-text\("([^"]+)"\)/);
  if (hasTextMatch) return `"${hasTextMatch[1]}" button`;

  // Identify submit buttons
  if (selector.includes('[type="submit"]')) {
    const formMatch = selector.match(/form#([\w-]+)/);
    if (formMatch) return `Submit button (${formMatch[1].replace(/-/g, ' ')} form)`;
    return 'Submit button';
  }

  // Keep simple IDs as-is (e.g. #submit-btn)
  if (/^#[\w-]+$/.test(selector)) return selector;

  // Generic fallback
  return 'A button on the page';
}

/**
 * Convert form selectors to human-readable names.
 * e.g. 'form#contact-form' → 'contact form'
 *      'form.newsletter-form' → 'newsletter form'
 */
function humanizeFormSelector(selector: string): string {
  const idMatch = selector.match(/form#([\w-]+)/);
  if (idMatch) return idMatch[1].replace(/[-_]/g, ' ').replace(/\bform\b/gi, '').trim() + ' form';

  const classMatch = selector.match(/form\.([\w-]+)/);
  if (classMatch) return classMatch[1].replace(/[-_]/g, ' ').replace(/\bform\b/gi, '').trim() + ' form';

  return 'form';
}

/**
 * Strip Playwright call logs and verbose error dumps from issue summaries.
 * Keeps the first meaningful sentence and caps at 120 chars.
 */
function sanitizeIssueSummary(raw: string): string {
  let cleaned = raw;

  // Strip everything after "Call log:" (Playwright verbose call traces)
  const callLogIdx = cleaned.indexOf('Call log:');
  if (callLogIdx !== -1) {
    cleaned = cleaned.substring(0, callLogIdx);
  }

  // Strip everything after "=== logs ===" (Playwright log blocks)
  const logsIdx = cleaned.indexOf('=== logs ===');
  if (logsIdx !== -1) {
    cleaned = cleaned.substring(0, logsIdx);
  }

  // Replace "page.click: Timeout Xms exceeded." with readable message
  cleaned = cleaned.replace(/page\.click:\s*Timeout\s+\d+ms\s+exceeded\.?/gi, 'Click timed out on element');

  // Replace "page.fill: Timeout Xms exceeded." with readable message
  cleaned = cleaned.replace(/page\.fill:\s*Timeout\s+\d+ms\s+exceeded\.?/gi, 'Could not fill form field');

  // Replace other common page.action timeout patterns
  cleaned = cleaned.replace(/page\.\w+:\s*Timeout\s+\d+ms\s+exceeded\.?/gi, 'Action timed out');

  // Trim whitespace and trailing punctuation artifacts
  cleaned = cleaned.trim().replace(/[\s\-:]+$/, '');

  // Cap at 120 chars
  if (cleaned.length > 120) {
    cleaned = cleaned.substring(0, 117) + '...';
  }

  return cleaned || raw.substring(0, 120);
}

/**
 * Extract the pathname from a full URL for readable display.
 */
function extractPathFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname || url;
  } catch {
    return url;
  }
}

/**
 * Build specific fix text for accessibility violations based on the violation ID and description.
 */
function buildAccessibilityFix(violation: { id: string; description: string; helpUrl: string; nodes: number }): string {
  const id = violation.id.toLowerCase();

  if (id.includes('color-contrast') || id.includes('contrast')) {
    return `Increase the contrast ratio between text and background colors. Use a tool like WebAIM's contrast checker to find a pair that passes WCAG AA (4.5:1 for normal text, 3:1 for large text).`;
  }
  if (id.includes('html-has-lang') || id.includes('lang')) {
    return `Add a lang attribute to your <html> tag: <html lang="en">. This tells screen readers which language to use for pronunciation.`;
  }
  if (id.includes('image-alt') || id.includes('alt')) {
    return `Add descriptive alt text to every <img> tag. For decorative images, use alt="" (empty). For informative images, describe what the image shows.`;
  }
  if (id.includes('label') || id.includes('form-field')) {
    return `Add a <label> element linked to each form input using the "for" attribute, or wrap the input inside a <label> tag.`;
  }
  if (id.includes('heading') || id.includes('heading-order')) {
    return `Use headings in order (h1, then h2, then h3) — don't skip levels. Each page should have exactly one <h1>.`;
  }
  if (id.includes('link-name') || id.includes('anchor')) {
    return `Give every link descriptive text that makes sense out of context. Avoid "click here" or "read more" — say what the link leads to.`;
  }
  if (id.includes('button-name')) {
    return `Add visible text or an aria-label to every <button> element so screen readers can announce its purpose.`;
  }
  if (id.includes('aria')) {
    return `Review ARIA attributes on the flagged elements — make sure roles, states, and properties match the element's actual behavior.`;
  }
  if (id.includes('tabindex')) {
    return `Remove positive tabindex values (tabindex="2", etc.) and use tabindex="0" or "-1" instead. Let the natural DOM order control focus.`;
  }
  if (id.includes('landmark') || id.includes('region')) {
    return `Wrap your page sections in landmark elements: <header>, <nav>, <main>, <footer>. This helps screen reader users jump between sections.`;
  }

  // Fallback: still include the help URL but add actionable context
  return `Fix the ${violation.nodes} affected element(s): ${violation.description}. See ${violation.helpUrl} for step-by-step guidance.`;
}

/**
 * Build technical details for accessibility violations, including element samples if available.
 * Truncates long HTML snippets to keep output readable.
 */
function buildAccessibilityDetails(violation: { nodes: number; elementSamples?: string[] }): string {
  const countText = `${violation.nodes} element(s) affected`;
  if (!violation.elementSamples || violation.elementSamples.length === 0) {
    return countText;
  }
  const truncatedSamples = violation.elementSamples.map(html =>
    html.length > 80 ? html.substring(0, 77) + '...' : html
  );
  return `${countText}. Examples: ${truncatedSamples.join(', ')}`;
}

/**
 * Build differentiated impact text for accessibility violations.
 */
function buildAccessibilityImpact(violation: { id: string; impact: string; description: string; nodes: number }): string {
  const id = violation.id.toLowerCase();

  if (id.includes('color-contrast') || id.includes('contrast')) {
    return `${violation.nodes} element(s) have text that's hard to read against the background — users with low vision may not be able to read your content`;
  }
  if (id.includes('html-has-lang') || id.includes('lang')) {
    return `Screen readers won't know what language to use, so they may mispronounce all text on the page`;
  }
  if (id.includes('image-alt') || id.includes('alt')) {
    return `${violation.nodes} image(s) are invisible to screen reader users — they'll hear nothing or a useless filename`;
  }
  if (id.includes('label') || id.includes('form-field')) {
    return `Form fields without labels are confusing for screen reader users — they won't know what to type`;
  }
  if (id.includes('heading') || id.includes('heading-order')) {
    return `Broken heading hierarchy makes it hard for screen reader users to navigate and understand your page structure`;
  }
  if (id.includes('link-name') || id.includes('anchor')) {
    return `Links without descriptive text leave screen reader users guessing where the link goes`;
  }
  if (id.includes('button-name')) {
    return `Buttons without names are invisible to screen reader users — they can't tell what the button does`;
  }

  // Severity-based fallback with node count
  if (violation.impact === 'critical') {
    return `This blocks ${violation.nodes} element(s) from being usable by people with disabilities — some users cannot access this content at all`;
  }
  if (violation.impact === 'serious') {
    return `${violation.nodes} element(s) are significantly harder to use for people with disabilities`;
  }
  return `A minor accessibility gap affecting ${violation.nodes} element(s) — fixing it makes your site more inclusive`;
}

/**
 * Build specific impact text for JavaScript errors based on the error details.
 */
function buildJsErrorImpact(error: DiagnosedError): string {
  const msg = error.originalError.toLowerCase();
  if (msg.includes('typeerror')) {
    return 'This JavaScript crash means a feature on the page is completely broken — buttons, forms, or dynamic content may not work';
  }
  if (msg.includes('referenceerror')) {
    return 'A script on this page references something that doesn\'t exist — any feature depending on it will fail silently';
  }
  if (msg.includes('syntaxerror')) {
    return 'A syntax error prevents the entire script from running — every feature in that script file is dead';
  }
  if (msg.includes('rangeerror')) {
    return 'The page hit an infinite loop or memory limit — this can freeze the browser tab for your users';
  }
  return 'This JavaScript error breaks interactive features — buttons, forms, or dynamic content may stop working';
}

/**
 * Build specific impact text for network errors based on the error details.
 */
function buildNetworkErrorImpact(error: DiagnosedError): string {
  const msg = error.originalError.toLowerCase();
  if (msg.includes('404')) {
    const resourceMatch = error.originalError.match(/([^\s/]+\.[a-z]{2,4})(?:\s|\)|$)/i);
    if (resourceMatch) {
      return `The file "${resourceMatch[1]}" is missing — users will see a broken image, missing style, or failed feature`;
    }
    return 'A resource is missing (404) — users may see broken images, missing styles, or failed features';
  }
  if (msg.includes('500')) {
    return 'The server is crashing on this request — any feature that depends on this API call is broken';
  }
  if (msg.includes('cors')) {
    return 'A cross-origin request is being blocked — the feature that makes this API call won\'t work for any user';
  }
  return 'A resource failed to load — users may see missing content, broken images, or failed features';
}

/**
 * Build differentiated impact text for dead buttons based on what the button does.
 */
function buildDeadButtonImpact(selector: string, buttonName: string): string {
  if (selector.includes('submit') || selector.includes('[type="submit"]')) {
    return `The submit button is dead — users fill out the form and nothing happens when they submit`;
  }
  if (selector.includes('subscribe') || selector.includes('newsletter')) {
    return `Users trying to subscribe will click ${buttonName} and get no response — you're losing newsletter signups`;
  }
  if (selector.includes('cta') || selector.includes('get-started') || selector.includes('free-trial') || selector.includes('hero')) {
    return `Your main call-to-action (${buttonName}) does nothing — potential customers will leave without converting`;
  }
  if (selector.includes('send') || selector.includes('contact') || selector.includes('message')) {
    return `${buttonName} is broken — users who reach out through your contact form will think their message was lost`;
  }
  if (selector.includes('search')) {
    return `The search button doesn't work — users can't find content on your site`;
  }
  if (selector.includes('login') || selector.includes('signin') || selector.includes('sign-in')) {
    return `The login button is dead — users cannot sign into their accounts`;
  }
  return `Users will click ${buttonName} expecting something to happen, but nothing does`;
}

/**
 * Build specific fix suggestion for dead buttons based on selector and reason.
 */
function buildDeadButtonFix(selector: string, reason?: string): string {
  const hasTextMatch = selector.match(/:?has-text\("([^"]+)"\)/);
  const buttonLabel = hasTextMatch ? `the "${hasTextMatch[1]}" button` : 'this button';

  if (selector.includes('submit') || selector.includes('[type="submit"]')) {
    return `The submit button has no working handler. Add a form action URL or a JavaScript submit handler to ${buttonLabel}.`;
  }
  if (selector.includes('cta') || selector.includes('get-started') || selector.includes('hero')) {
    return `${buttonLabel} is a call-to-action with no action. Wire it up to navigate to a signup page or open a modal.`;
  }
  return `Add an onclick handler or addEventListener to make ${buttonLabel} respond to clicks. Currently it does nothing.`;
}

/**
 * Build differentiated impact text for broken forms based on form type.
 */
function buildBrokenFormImpact(selector: string, formName: string): string {
  const s = selector.toLowerCase();
  if (s.includes('contact') || s.includes('message') || s.includes('inquiry')) {
    return `Users who fill out the ${formName} and hit submit get no confirmation — you're losing every customer inquiry`;
  }
  if (s.includes('newsletter') || s.includes('subscribe') || s.includes('email')) {
    return `The ${formName} silently fails — users think they subscribed but their email is never captured`;
  }
  if (s.includes('login') || s.includes('signin') || s.includes('sign-in')) {
    return `The ${formName} doesn't submit — users cannot log into their accounts`;
  }
  if (s.includes('signup') || s.includes('register') || s.includes('sign-up')) {
    return `The ${formName} is broken — new users cannot create accounts on your site`;
  }
  if (s.includes('search')) {
    return `The search form doesn't work — users cannot find content on your site`;
  }
  if (s.includes('checkout') || s.includes('payment') || s.includes('order')) {
    return `The ${formName} is dead — customers cannot complete their purchase`;
  }
  return `Users who fill out the ${formName} and hit submit get nothing — you're losing every submission`;
}

/**
 * Build specific fix suggestion for broken forms.
 */
function buildBrokenFormFix(form: { formSelector: string; reason?: string; filledFields: number; skippedFields: number }): string {
  if (form.reason?.includes('no navigation or network')) {
    return `The form at "${form.formSelector}" has no backend connection. Either set a form action URL (e.g., action="/api/submit") or add a JavaScript handler that sends the data to your server.`;
  }
  if (form.skippedFields > 0) {
    return `The form at "${form.formSelector}" couldn't be fully filled out (${form.skippedFields} fields skipped). Check that all form fields have proper name attributes and are accessible.`;
  }
  return `The form at "${form.formSelector}" doesn't respond to submission. Add a form action attribute or a JavaScript submit handler.`;
}

export type IssuePriority = 'high' | 'medium' | 'low';

export interface PrioritizedIssue {
  priority: IssuePriority;
  category: string;         // e.g., "Workflow Error", "Console Error", "UI Issue", "Accessibility", "Dead Button", "Broken Form"
  summary: string;          // Plain English summary
  impact: string;           // Why it matters (plain English)
  fixSuggestion: string;    // How to fix (plain English)
  location: string;         // URL or file:line
  screenshotRef?: string;   // Path to screenshot if available
  technicalDetails?: string; // For AI report only
  occurrenceCount?: number; // How many times this issue was found (set when > 1)
}

/**
 * Find a page screenshot from workflow results (for issues without their own screenshot)
 */
function findPageScreenshot(workflowResults: ExecutionArtifact['workflowResults']): string | undefined {
  for (const workflow of workflowResults) {
    if (workflow.pageScreenshotRef) {
      return workflow.pageScreenshotRef;
    }
  }
  return undefined;
}

export function prioritizeIssues(
  diagnosedErrors: DiagnosedError[],
  uiAudits: UIAuditResult[],
  executionArtifact: ExecutionArtifact
): PrioritizedIssue[] {
  const issues: PrioritizedIssue[] = [];
  const fallbackScreenshot = findPageScreenshot(executionArtifact.workflowResults);

  // HIGH PRIORITY: Workflow-blocking errors
  // Low-confidence diagnoses are downgraded to medium to avoid false-alarm noise
  for (const error of diagnosedErrors) {
    if (['navigation', 'authentication', 'form'].includes(error.errorType)) {
      const priority = error.confidence === 'low' ? 'medium' as const : 'high' as const;
      issues.push({
        priority,
        category: 'Workflow Error',
        summary: sanitizeIssueSummary(error.summary),
        impact: 'This breaks a core user flow on your site',
        fixSuggestion: error.suggestedFix,
        location: error.sourceLocation ? `${error.sourceLocation.file}:${error.sourceLocation.line}` : (error.pageUrl || 'Unknown'),
        screenshotRef: error.screenshotRef,
        technicalDetails: error.technicalDetails,
      });
    }
  }

  // HIGH PRIORITY: JavaScript errors that crash page functionality
  // Network 404s and broken images stay medium since they're cosmetic, but JS errors break interactivity
  for (const error of diagnosedErrors) {
    if (error.errorType === 'javascript') {
      const priority = error.confidence === 'low' ? 'medium' as const : 'high' as const;
      issues.push({
        priority,
        category: 'Console Error',
        summary: sanitizeIssueSummary(error.summary),
        impact: buildJsErrorImpact(error),
        fixSuggestion: error.suggestedFix,
        location: error.sourceLocation ? `${error.sourceLocation.file}:${error.sourceLocation.line}` : (error.pageUrl || 'Unknown'),
        screenshotRef: error.screenshotRef,
        technicalDetails: error.technicalDetails,
      });
    }
  }

  // MEDIUM PRIORITY: Network errors (missing resources, API failures)
  for (const error of diagnosedErrors) {
    if (error.errorType === 'network') {
      const priority = error.confidence === 'low' ? 'low' as const : 'medium' as const;
      issues.push({
        priority,
        category: 'Console Error',
        summary: sanitizeIssueSummary(error.summary),
        impact: buildNetworkErrorImpact(error),
        fixSuggestion: error.suggestedFix,
        location: error.sourceLocation ? `${error.sourceLocation.file}:${error.sourceLocation.line}` : (error.pageUrl || 'Unknown'),
        screenshotRef: error.screenshotRef,
        technicalDetails: error.technicalDetails,
      });
    }
  }

  // HIGH PRIORITY: Dead buttons — users clicking and getting no response is a core UX failure
  for (const deadButton of executionArtifact.deadButtons) {
    if (deadButton.isDead) {
      const buttonName = humanizeSelector(deadButton.selector);
      issues.push({
        priority: 'high',
        category: 'Dead Button',
        summary: `${buttonName} doesn't do anything when clicked`,
        impact: buildDeadButtonImpact(deadButton.selector, buttonName),
        fixSuggestion: buildDeadButtonFix(deadButton.selector, deadButton.reason),
        location: executionArtifact.targetUrl,
        screenshotRef: fallbackScreenshot,
        technicalDetails: deadButton.reason,
      });
    }
  }

  // HIGH PRIORITY: Broken forms — lost leads, signups, and user data
  for (const brokenForm of executionArtifact.brokenForms) {
    if (brokenForm.isBroken) {
      const formName = humanizeFormSelector(brokenForm.formSelector);
      issues.push({
        priority: 'high',
        category: 'Broken Form',
        summary: `The ${formName} doesn't work — submitting it has no effect`,
        impact: buildBrokenFormImpact(brokenForm.formSelector, formName),
        fixSuggestion: buildBrokenFormFix(brokenForm),
        location: `${executionArtifact.targetUrl} (${brokenForm.formSelector})`,
        screenshotRef: fallbackScreenshot,
        technicalDetails: `Filled fields: ${brokenForm.filledFields}, Skipped fields: ${brokenForm.skippedFields}`,
      });
    }
  }

  // MEDIUM/LOW PRIORITY: Broken links (discovered during crawl)
  // Timeouts are downgraded to LOW — the page may just be slow, not broken
  for (const brokenLink of executionArtifact.brokenLinks) {
    const linkPath = extractPathFromUrl(brokenLink.url);
    const isTimeout = brokenLink.statusCode === 0 &&
      (brokenLink.statusText?.toLowerCase().includes('timeout') || brokenLink.statusText?.toLowerCase().includes('exceeded'));

    if (isTimeout) {
      issues.push({
        priority: 'low',
        category: 'Broken Link',
        summary: `Link to ${linkPath} timed out (may be slow)`,
        impact: `The page at "${linkPath}" took too long to respond — it may be slow or temporarily unavailable`,
        fixSuggestion: `Check that ${brokenLink.url} loads correctly in a browser. If it's slow, consider optimizing the page or increasing server resources.`,
        location: brokenLink.sourceUrl,
        technicalDetails: `Timeout: ${brokenLink.url} (found on ${brokenLink.sourceUrl}). Status text: ${brokenLink.statusText}`,
      });
    } else {
      const statusLabel = brokenLink.statusCode === 0 ? 'unreachable' : `${brokenLink.statusCode}`;
      issues.push({
        priority: 'medium',
        category: 'Broken Link',
        summary: `Link to ${linkPath} is broken (${statusLabel})`,
        impact: `Visitors who click the "${linkPath}" link will see an error page instead of content`,
        fixSuggestion: brokenLink.statusCode === 404
          ? `Create the missing page at ${linkPath}, or update the link to point to an existing page`
          : brokenLink.statusCode === 0
            ? `The page at ${brokenLink.url} could not be reached — check if the URL is spelled correctly`
            : `The server returned ${brokenLink.statusCode} for ${linkPath} — check server logs for the error`,
        location: brokenLink.sourceUrl,
        technicalDetails: `HTTP ${brokenLink.statusCode}: ${brokenLink.url} (found on ${brokenLink.sourceUrl})`,
      });
    }
  }

  // MEDIUM PRIORITY: UI audit layout/contrast issues (high severity)
  for (const audit of uiAudits) {
    for (const layoutIssue of audit.layoutIssues) {
      if (layoutIssue.severity === 'high') {
        issues.push({
          priority: 'medium',
          category: 'UI Issue',
          summary: layoutIssue.description,
          impact: `A layout problem at "${layoutIssue.location}" is making part of your page hard to read or use`,
          fixSuggestion: `Inspect the "${layoutIssue.location}" area in your browser DevTools and fix the CSS causing "${layoutIssue.description.toLowerCase()}"`,
          location: audit.pageUrl,
          screenshotRef: audit.screenshotRef,
          technicalDetails: `Severity: ${layoutIssue.severity}`,
        });
      }
    }

    for (const contrastIssue of audit.contrastIssues) {
      issues.push({
        priority: 'medium',
        category: 'UI Issue',
        summary: `${contrastIssue.element}: ${contrastIssue.issue}`,
        impact: 'Low contrast makes text hard to read, especially for users with vision impairments',
        fixSuggestion: contrastIssue.suggestion,
        location: audit.pageUrl,
        screenshotRef: audit.screenshotRef,
        technicalDetails: undefined,
      });
    }
  }

  // HIGH/MEDIUM PRIORITY: Accessibility violations (critical or serious)
  for (const pageAudit of executionArtifact.pageAudits) {
    if (pageAudit.accessibility) {
      for (const violation of pageAudit.accessibility.violations) {
        if (violation.impact === 'critical') {
          issues.push({
            priority: 'high',
            category: 'Accessibility',
            summary: violation.description,
            impact: buildAccessibilityImpact(violation),
            fixSuggestion: buildAccessibilityFix(violation),
            location: pageAudit.url,
            screenshotRef: fallbackScreenshot,
            technicalDetails: buildAccessibilityDetails(violation),
          });
        } else if (violation.impact === 'serious') {
          issues.push({
            priority: 'medium',
            category: 'Accessibility',
            summary: violation.description,
            impact: buildAccessibilityImpact(violation),
            fixSuggestion: buildAccessibilityFix(violation),
            location: pageAudit.url,
            screenshotRef: fallbackScreenshot,
            technicalDetails: buildAccessibilityDetails(violation),
          });
        }
      }
    }
  }

  // MEDIUM/LOW PRIORITY: Meta and SEO issues (from heuristic auditor)
  for (const pageAudit of executionArtifact.pageAudits) {
    if (pageAudit.metaIssues) {
      for (const metaIssue of pageAudit.metaIssues) {
        const priority = metaIssue.severity === 'high' ? 'medium' as const : 'low' as const;
        issues.push({
          priority,
          category: 'SEO / Meta',
          summary: metaIssue.description,
          impact: metaIssue.severity === 'high'
            ? 'Search engines may not index your site correctly, costing you traffic'
            : 'A small SEO tweak that could improve how your site appears in search results',
          fixSuggestion: metaIssue.suggestion,
          location: pageAudit.url,
          technicalDetails: `Meta issue: ${metaIssue.id}`,
        });
      }
    }
  }

  // LOW PRIORITY: DOM and unknown errors
  for (const error of diagnosedErrors) {
    if (['dom', 'unknown'].includes(error.errorType)) {
      issues.push({
        priority: 'low',
        category: 'Console Error',
        summary: sanitizeIssueSummary(error.summary),
        impact: 'A background error that may not affect users yet, but could cause problems later',
        fixSuggestion: error.suggestedFix,
        location: error.sourceLocation ? `${error.sourceLocation.file}:${error.sourceLocation.line}` : (error.pageUrl || 'Unknown'),
        screenshotRef: error.screenshotRef,
        technicalDetails: error.technicalDetails,
      });
    }
  }

  // LOW PRIORITY: UI audit layout/contrast issues (medium/low severity)
  for (const audit of uiAudits) {
    for (const layoutIssue of audit.layoutIssues) {
      if (layoutIssue.severity === 'medium' || layoutIssue.severity === 'low') {
        issues.push({
          priority: 'low',
          category: 'UI Issue',
          summary: layoutIssue.description,
          impact: `A minor layout quirk at "${layoutIssue.location}" that could look better with a small CSS tweak`,
          fixSuggestion: `Inspect the "${layoutIssue.location}" area in your browser DevTools and adjust the CSS to fix "${layoutIssue.description.toLowerCase()}"`,
          location: audit.pageUrl,
          screenshotRef: audit.screenshotRef,
          technicalDetails: `Severity: ${layoutIssue.severity}`,
        });
      }
    }

    for (const formattingIssue of audit.formattingIssues) {
      issues.push({
        priority: 'low',
        category: 'UI Issue',
        summary: formattingIssue.problem,
        impact: 'A formatting issue that affects the visual polish of your site',
        fixSuggestion: formattingIssue.suggestion,
        location: audit.pageUrl,
        screenshotRef: audit.screenshotRef,
        technicalDetails: undefined,
      });
    }

    for (const improvement of audit.improvements) {
      issues.push({
        priority: 'low',
        category: 'UI Issue',
        summary: improvement,
        impact: 'A nice-to-have improvement that would make your site feel more polished',
        fixSuggestion: 'Consider this improvement to enhance user experience',
        location: audit.pageUrl,
        screenshotRef: audit.screenshotRef,
        technicalDetails: undefined,
      });
    }
  }

  // LOW PRIORITY: Accessibility violations (moderate or minor)
  for (const pageAudit of executionArtifact.pageAudits) {
    if (pageAudit.accessibility) {
      for (const violation of pageAudit.accessibility.violations) {
        if (violation.impact === 'moderate' || violation.impact === 'minor') {
          issues.push({
            priority: 'low',
            category: 'Accessibility',
            summary: violation.description,
            impact: buildAccessibilityImpact(violation),
            fixSuggestion: buildAccessibilityFix(violation),
            location: pageAudit.url,
            screenshotRef: fallbackScreenshot,
            technicalDetails: buildAccessibilityDetails(violation),
          });
        }
      }
    }
  }

  // SORT: high first, then medium, then low (within each priority, maintain insertion order)
  const highPriority = issues.filter(i => i.priority === 'high');
  const mediumPriority = issues.filter(i => i.priority === 'medium');
  const lowPriority = issues.filter(i => i.priority === 'low');

  return [...highPriority, ...mediumPriority, ...lowPriority];
}

/**
 * Extract a resource URL from technicalDetails if present (e.g., "HTTP 404: http://...").
 * Returns the URL if found, undefined otherwise.
 */
function extractResourceUrl(issue: PrioritizedIssue): string | undefined {
  if (!issue.technicalDetails) return undefined;
  const match = issue.technicalDetails.match(/https?:\/\/[^\s)]+/);
  return match?.[0];
}

/**
 * Build a deduplication key for an issue based on its category.
 * Groups issues that represent the same underlying problem, even across different pages.
 */
function buildDedupKey(issue: PrioritizedIssue): string {
  switch (issue.category) {
    case 'Console Error': {
      // For network errors with a specific resource URL (e.g., "HTTP 404: http://..."),
      // deduplicate by the resource URL alone — the same broken resource on multiple pages is one issue.
      const resourceUrl = extractResourceUrl(issue);
      if (resourceUrl) {
        return `${issue.category}|resource:${resourceUrl}`;
      }
      // For other console errors, strip URLs and variable-specific details from summary for grouping
      const normalizedSummary = issue.summary
        .replace(/https?:\/\/[^\s)]+/g, '<URL>')
        .replace(/'[^']*'/g, "'...'");
      return `${issue.category}|${normalizedSummary}`;
    }
    case 'Broken Link':
      // Same broken URL = same issue, regardless of which page the link was found on
      return `${issue.category}|${issue.summary}`;
    case 'Dead Button':
      // Same button summary = same dead button, regardless of which page it was found on
      return `${issue.category}|${issue.summary}`;
    case 'Broken Form':
      return `${issue.category}|${issue.location}`;
    case 'SEO / Meta':
      // Same meta issue across pages = one issue (e.g., missing viewport on every page)
      return `${issue.category}|${issue.summary}`;
    case 'Accessibility':
      // Same accessibility violation across pages = one issue (e.g., missing lang on every page)
      return `${issue.category}|${issue.summary}`;
    case 'UI Issue':
      return `${issue.category}|${issue.summary}|${issue.location}`;
    case 'Workflow Error':
      return `${issue.category}|${issue.summary}|${issue.location}`;
    default:
      return `${issue.category}|${issue.summary}|${issue.location}`;
  }
}

const PRIORITY_RANK: Record<IssuePriority, number> = { high: 0, medium: 1, low: 2 };

/**
 * Deduplicate prioritized issues by grouping identical findings.
 * Within each group, keeps the highest-priority instance and annotates with occurrence count.
 * When issues from different pages are merged, aggregates unique page locations.
 * Returns a new array sorted by priority (high > medium > low).
 */
export function deduplicateIssues(issues: PrioritizedIssue[]): PrioritizedIssue[] {
  if (issues.length === 0) return [];

  const groups = new Map<string, { best: PrioritizedIssue; count: number; locations: Set<string> }>();

  for (const issue of issues) {
    const key = buildDedupKey(issue);
    const existing = groups.get(key);

    if (existing) {
      existing.count++;
      existing.locations.add(issue.location);
      // Keep the higher-priority instance
      if (PRIORITY_RANK[issue.priority] < PRIORITY_RANK[existing.best.priority]) {
        existing.best = issue;
      }
    } else {
      groups.set(key, { best: issue, count: 1, locations: new Set([issue.location]) });
    }
  }

  // Build result with occurrence counts and aggregated locations
  const deduped: PrioritizedIssue[] = [];
  for (const { best, count, locations } of groups.values()) {
    const dedupedIssue = {
      ...best,
      occurrenceCount: count > 1 ? count : undefined,
    };
    // If the issue was found on multiple distinct pages, annotate the location
    if (locations.size > 1) {
      dedupedIssue.location = `${best.location} (and ${locations.size - 1} other page${locations.size - 1 > 1 ? 's' : ''})`;
    }
    deduped.push(dedupedIssue);
  }

  // Re-sort by priority
  const high = deduped.filter(i => i.priority === 'high');
  const medium = deduped.filter(i => i.priority === 'medium');
  const low = deduped.filter(i => i.priority === 'low');

  return [...high, ...medium, ...low];
}
