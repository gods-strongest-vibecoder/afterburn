# Phase 3: Execution & Testing - Research

**Researched:** 2026-02-07
**Domain:** Browser test automation and workflow execution
**Confidence:** HIGH

## Summary

Phase 3 executes AI-generated workflow test plans using Playwright's automation APIs. This involves programmatic form filling, button clicking, navigation handling, and comprehensive error detection across multiple dimensions (console errors, HTTP failures, dead buttons, broken images). The phase captures evidence (screenshots on errors, network logs, performance metrics) and produces structured execution logs for downstream analysis.

The standard approach uses Playwright's action APIs (fill, click, selectOption, setChecked) with built-in auto-waiting and retry logic. Error detection combines event listeners (page.on('console'), page.on('requestfailed')), response monitoring (waitForResponse), and DOM state inspection (waitFor, waitForLoadState). Accessibility and performance metrics are captured using @axe-core/playwright and browser Performance APIs.

**Key technical challenges:** Dead button detection requires comparing pre/post-click state (DOM changes, network activity, navigation); custom form controls (date pickers, rich dropdowns) need skip-and-flag strategy; popup/modal handling distinguishes native dialogs (auto-dismissed) from DOM modals (require explicit interaction).

**Primary recommendation:** Build executor around Playwright's action timeout model (10s per step default), use try-catch with continue-on-failure for step resilience, capture evidence only on failures to minimize artifact size, and integrate @axe-core/playwright for WCAG audits on workflow pages only (not every crawled page).

## User Constraints (from CONTEXT.md)

<user_constraints>

### Locked Decisions

**Form filling strategy:**
- Use fixed predefined test data set (test@example.com, John Doe, 555-0100, etc.) — predictable and reproducible
- Actually submit forms to test full flow (detects server-side errors, broken redirects, validation failures)
- Skip unrecognized fields (custom dropdowns, date pickers, rich text editors) and flag them in the report as "could not fill"
- For authenticated flows (--email/--password): fill login forms with provided credentials; signup handling at Claude's discretion

**Error detection scope:**
- Dead button = no visible change after click (no DOM change, no network request, no navigation) — strict detection
- Console errors: capture console.error() only — ignore warnings and logs to reduce noise
- Broken images: detect via HTTP load status only (404s, failed loads) — no visual placeholder detection
- HTTP errors: flag both client errors (4xx) and server errors (5xx) — catches broken links, missing pages, permission issues, and server bugs

**Workflow step behavior:**
- On step failure: skip the failed step, log it, continue with remaining workflow steps — maximize coverage
- Popups/modals/new tabs: auto-dismiss and continue workflow on main page
- Step timeout: 10 seconds per step (page load, element appearance, etc.) — fast, catches truly broken pages
- Accessibility audit (axe-core) and performance metrics (LCP, load time): run on key workflow pages only, not every page visited

**Evidence capture depth:**
- Screenshots: capture only on errors — no screenshots for successful steps
- Network logs: capture failed requests only (4xx, 5xx responses) — focused evidence for AI analyzer
- DOM snapshots: none — screenshots + console errors + network failures provide sufficient context
- Exit codes: Claude's discretion on severity threshold (what counts as pass vs fail for CI/CD)

### Claude's Discretion

- Exit code severity threshold (what error types cause non-zero exit)
- Signup form handling in authenticated flows
- Exact fixed test data values for each field type
- How to detect and dismiss popups/modals reliably

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Playwright | 1.49+ | Browser automation | Industry-standard E2E framework with auto-waiting, built-in retry logic, cross-browser support |
| @axe-core/playwright | 4.10+ | WCAG accessibility audits | Official axe-core integration, catches ~50% of WCAG issues automatically |
| TypeScript | 5.0+ | Type safety | Already in stack (Phase 1), provides autocomplete for Playwright APIs |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| web-vitals | 4.2+ | Performance metrics (LCP, CLS, INP) | Alternative to manual PerformanceObserver for Core Web Vitals tracking |
| zod | 3.23+ | Workflow step validation | Already in stack (Phase 2), validates AI-generated workflow schemas before execution |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Playwright | Puppeteer | Playwright has better retry logic, multi-browser support, and web-first assertions (superior for resilient tests) |
| @axe-core/playwright | Manual WCAG checks | Axe catches 50% of issues automatically; manual checks require accessibility expertise |
| Fixed test data | faker.js / @faker-js/faker | Fixed data = reproducible tests; generated data = more realistic but harder to debug failures |

**Installation:**
```bash
npm install playwright @axe-core/playwright
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── execution/
│   ├── workflow-executor.ts     # Main executor: runs workflow steps
│   ├── step-handlers.ts         # Step action handlers (fill, click, navigate, etc.)
│   ├── error-detector.ts        # Console/network/HTTP/image error capture
│   ├── evidence-capture.ts      # Screenshot + network log capture on errors
│   ├── test-data.ts             # Fixed test data constants
│   └── index.ts                 # Barrel exports
├── testing/
│   ├── accessibility-auditor.ts # Axe-core integration
│   ├── performance-monitor.ts   # LCP/load time/web vitals capture
│   └── index.ts
└── types/
    └── artifacts.ts             # ExecutionResult, StepResult, ErrorEvidence types
```

### Pattern 1: Step Executor with Try-Catch Recovery
**What:** Execute each workflow step in isolation with error recovery to maximize coverage
**When to use:** Workflow execution where step failures shouldn't halt entire test
**Example:**
```typescript
// Source: User requirement (continue on failure) + Playwright best practices
async function executeWorkflowStep(
  page: Page,
  step: WorkflowStep,
  stepIndex: number
): Promise<StepResult> {
  const startTime = Date.now();

  try {
    // Set per-step timeout (user specified 10s)
    const timeout = 10_000;

    switch (step.action) {
      case 'fill':
        await page.locator(step.selector).fill(step.value!, { timeout });
        break;
      case 'click':
        await page.locator(step.selector).click({ timeout });
        break;
      case 'select':
        await page.locator(step.selector).selectOption(step.value!, { timeout });
        break;
      case 'navigate':
        await page.goto(step.value!, { timeout: 30_000 }); // Navigation gets longer timeout
        break;
      case 'expect':
        await expect(page.locator(step.selector)).toBeVisible({ timeout });
        break;
    }

    return {
      stepIndex,
      action: step.action,
      selector: step.selector,
      status: 'passed',
      duration: Date.now() - startTime,
    };

  } catch (error) {
    // Capture evidence on failure, then continue
    const evidence = await captureErrorEvidence(page, step, error);

    return {
      stepIndex,
      action: step.action,
      selector: step.selector,
      status: 'failed',
      duration: Date.now() - startTime,
      error: error.message,
      evidence,
    };
  }
}
```

### Pattern 2: Event-Driven Error Collection
**What:** Register page listeners to capture errors passively during workflow execution
**When to use:** Console error and network failure detection without blocking workflow
**Example:**
```typescript
// Source: https://playwright.dev/docs/api/class-page (page.on events)
// and https://medium.com/@prateek291992/playwright-with-typescript-how-to-capture-and-validate-browser-console-logs-a7c1f3622eb4
interface ErrorCollector {
  consoleErrors: Array<{ message: string; url: string; timestamp: string }>;
  networkFailures: Array<{ url: string; status: number; method: string }>;
  brokenImages: Array<{ url: string; selector: string }>;
}

function setupErrorListeners(page: Page): ErrorCollector {
  const errors: ErrorCollector = {
    consoleErrors: [],
    networkFailures: [],
    brokenImages: [],
  };

  // Console error capture (user requirement: console.error only, ignore warnings)
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.consoleErrors.push({
        message: msg.text(),
        url: page.url(),
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Network failure capture (user requirement: 4xx and 5xx)
  page.on('response', async response => {
    const status = response.status();
    if (status >= 400) {
      errors.networkFailures.push({
        url: response.url(),
        status,
        method: response.request().method(),
      });
    }
  });

  // Broken image detection (user requirement: HTTP status only)
  page.on('response', async response => {
    const url = response.url();
    const isImage = /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(url);

    if (isImage && response.status() >= 400) {
      errors.brokenImages.push({
        url,
        selector: `img[src="${url}"]`, // Approximate selector
      });
    }
  });

  return errors;
}
```

### Pattern 3: Dead Button Detection via State Comparison
**What:** Compare pre/post-click state to detect buttons that have no effect
**When to use:** User requirement for dead button detection (no DOM change, no network request, no navigation)
**Example:**
```typescript
// Source: User requirement + https://playwright.dev/docs/navigations
async function detectDeadButton(
  page: Page,
  selector: string,
  timeout: number = 10_000
): Promise<{ isDead: boolean; reason?: string }> {
  const preClickUrl = page.url();
  const preClickHTML = await page.content();

  // Track network activity during click
  let networkActivityDetected = false;
  const requestListener = () => { networkActivityDetected = true; };
  page.on('request', requestListener);

  // Perform click
  await page.locator(selector).click({ timeout });

  // Wait brief moment for any async changes
  await page.waitForTimeout(500);

  // Check for state changes
  const postClickUrl = page.url();
  const postClickHTML = await page.content();

  page.off('request', requestListener);

  // Dead if: same URL, same DOM, no network activity
  const urlChanged = postClickUrl !== preClickUrl;
  const domChanged = postClickHTML !== preClickHTML;

  if (!urlChanged && !domChanged && !networkActivityDetected) {
    return {
      isDead: true,
      reason: 'No navigation, DOM change, or network request detected after click'
    };
  }

  return { isDead: false };
}
```

### Pattern 4: Accessibility Audit on Workflow Pages Only
**What:** Run axe-core audit selectively on workflow pages, not every crawled page
**When to use:** User requirement to audit key workflow pages only (performance optimization)
**Example:**
```typescript
// Source: https://playwright.dev/docs/accessibility-testing
import AxeBuilder from '@axe-core/playwright';

async function auditPageAccessibility(
  page: Page,
  pageUrl: string
): Promise<AccessibilityReport> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']) // WCAG 2.0/2.1 A/AA standards
    .analyze();

  return {
    url: pageUrl,
    violationCount: results.violations.length,
    violations: results.violations.map(v => ({
      id: v.id,
      impact: v.impact, // 'critical', 'serious', 'moderate', 'minor'
      description: v.description,
      nodes: v.nodes.length, // How many elements affected
      helpUrl: v.helpUrl, // Link to remediation docs
    })),
    passes: results.passes.length,
    incomplete: results.incomplete.length, // Needs manual review
  };
}
```

### Pattern 5: Performance Metrics via Performance Observer
**What:** Capture LCP and load time using browser Performance API
**When to use:** User requirement for performance metrics on workflow pages
**Example:**
```typescript
// Source: https://www.checklyhq.com/docs/learn/playwright/performance/
async function capturePerformanceMetrics(page: Page): Promise<PerformanceMetrics> {
  // Wait for page to fully load
  await page.waitForLoadState('load');

  // Capture LCP (Largest Contentful Paint)
  const lcp = await page.evaluate(() => {
    return new Promise<number>((resolve) => {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        resolve(lastEntry.startTime);
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    });
  });

  // Capture navigation timing (load time)
  const navTiming = await page.evaluate(() => {
    const perf = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return {
      domContentLoaded: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
      loadComplete: perf.loadEventEnd - perf.loadEventStart,
      totalLoadTime: perf.loadEventEnd - perf.fetchStart,
    };
  });

  return {
    lcp: Math.round(lcp),
    domContentLoaded: Math.round(navTiming.domContentLoaded),
    loadComplete: Math.round(navTiming.loadComplete),
    totalLoadTime: Math.round(navTiming.totalLoadTime),
  };
}
```

### Anti-Patterns to Avoid
- **Manual waits (waitForTimeout):** Use web-first assertions (toBeVisible, toHaveText) instead — auto-retry and reduce flakiness
- **CSS class selectors:** Use role-based selectors (getByRole, getByLabel) — resilient to UI changes
- **Skipping awaits:** Missing `await` on async Playwright calls causes race conditions and flaky tests
- **Testing without isolation:** Shared state between tests causes cascading failures — use beforeEach for clean slate
- **Hard assertions for async state:** `expect(await locator.isVisible()).toBe(true)` doesn't retry — use `await expect(locator).toBeVisible()` instead

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Waiting for elements to be ready | Custom polling loops with sleep() | Playwright's auto-waiting + web-first assertions | Playwright automatically waits for actionability (visible, enabled, stable) before actions; manual polling is error-prone and slower |
| Form field detection | Custom DOM traversal for input types | Playwright locators: getByLabel(), getByRole('textbox') | Playwright's locators handle label association, ARIA roles, and hidden fields automatically; custom code misses edge cases |
| Accessibility testing | Manual WCAG checks via DOM inspection | @axe-core/playwright with AxeBuilder | Axe-core catches ~50% of WCAG issues automatically; manual checks require accessibility expertise and miss subtle violations |
| Performance monitoring | Custom Date.now() timing and heuristics | Browser Performance API + PerformanceObserver | Performance API provides standardized metrics (LCP, CLS, FCP) used by Chrome DevTools and Lighthouse; custom timing misses browser-level optimizations |
| Retry logic for flaky steps | Custom try-catch with for-loop retries | Playwright's built-in expect timeout and test retries | Playwright's assertion timeout retries intelligently; custom loops don't distinguish transient failures from real bugs |
| Test data generation | Building custom fake data generators | Fixed predefined test data (per user requirement) | Fixed data = reproducible tests and easier debugging; custom generators introduce non-determinism |

**Key insight:** Playwright is purpose-built for resilient browser automation. Its auto-waiting, retry logic, and locator strategies handle edge cases that custom solutions miss (element detachment, animation delays, framework re-renders, shadow DOM). Use Playwright's batteries-included approach instead of rebuilding these primitives.

## Common Pitfalls

### Pitfall 1: Race Conditions from Missing Awaits
**What goes wrong:** Test code runs ahead of browser actions, causing "element not found" or stale element errors
**Why it happens:** Playwright APIs are async but TypeScript doesn't enforce `await` — easy to forget
**How to avoid:**
- Enable TypeScript strict mode (`"strict": true` in tsconfig.json)
- Use ESLint rule `@typescript-eslint/no-floating-promises`
- Run `tsc --noEmit` frequently to catch missing awaits
**Warning signs:** Intermittent "locator.click: Target closed" or "element is not attached to the DOM" errors

### Pitfall 2: Fragile Selectors Breaking on UI Changes
**What goes wrong:** Tests fail when CSS classes or DOM structure changes, even though functionality works
**Why it happens:** CSS class selectors (`.btn-primary`) and XPath (`//div[3]/button`) are tied to implementation details
**How to avoid:**
- Prioritize role-based selectors: `page.getByRole('button', { name: 'Submit' })`
- Use test IDs for dynamic elements: `page.getByTestId('checkout-button')`
- Chain locators for specificity: `page.getByRole('dialog').getByRole('button', { name: 'Close' })`
**Warning signs:** Tests break after harmless CSS refactoring or framework upgrades

### Pitfall 3: Timeout Mismatches for SPAs
**What goes wrong:** Playwright times out waiting for navigation in SPAs because `networkidle` never occurs (live data feeds, polling)
**Why it happens:** Default `waitForLoadState('networkidle')` waits for 500ms of no network activity — SPAs with real-time updates never idle
**How to avoid:**
- Use `waitForLoadState('domcontentloaded')` for SPAs
- Wait for specific elements instead of load state: `await page.getByRole('heading', { name: 'Dashboard' }).waitFor()`
- Override navigation timeout for known slow pages: `page.goto(url, { timeout: 30_000 })`
**Warning signs:** "page.goto: Timeout 30000ms exceeded" errors on functioning SPAs

### Pitfall 4: Custom Dropdown/Date Picker Detection Failures
**What goes wrong:** Standard form filling (fill, selectOption) doesn't work on custom React/Vue components (Material-UI, Ant Design)
**Why it happens:** Custom components render `<div>` with JavaScript handlers, not native `<select>` or `<input type="date">`
**How to avoid:**
- Per user requirement: Skip unrecognized fields and flag in report as "could not fill"
- Detect via selector type: if `page.locator(selector).evaluate(el => el.tagName)` is not INPUT/SELECT/TEXTAREA, skip
- Log skipped fields with metadata: `{ selector, reason: 'custom control', recommendedAction: 'manual test required' }`
**Warning signs:** "locator.fill: Error: Element is not an <input>, <textarea> or [contenteditable]" on form pages

### Pitfall 5: Dialog/Modal Confusion (Native vs DOM)
**What goes wrong:** Code to dismiss dialogs doesn't work on DOM-based modals, or modal close logic blocks on native dialogs
**Why it happens:** Playwright's `page.on('dialog')` handles native `alert()`/`confirm()` only — Material-UI/Bootstrap modals are just divs
**How to avoid:**
- Native dialogs auto-dismiss by default (no handler needed unless accepting/rejecting)
- DOM modals: locate close button and click: `await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click()`
- Distinguish by checking for dialog event: native dialogs fire `page.on('dialog')`, DOM modals don't
**Warning signs:** "page.click: Timeout" when clicking in presence of modal, or unhandled dialog stalling page

### Pitfall 6: Broken Image False Negatives
**What goes wrong:** Broken images report `img.complete = true` despite 404 load failure
**Why it happens:** Browser sets `complete = true` when image loading finishes, even if loading failed
**How to avoid:**
- Check `naturalWidth === 0` in addition to HTTP status (per user requirement: HTTP status only, but naturalWidth is safety check)
- Use response listener: `page.on('response')` to track image HTTP status codes
- Filter for image MIME types or file extensions: `/\.(jpg|jpeg|png|gif|svg|webp)$/i.test(url)`
**Warning signs:** Tests pass despite visible broken image placeholders in screenshots

### Pitfall 7: Performance Metric Timing Issues
**What goes wrong:** LCP/CLS metrics return 0 or undefined when captured too early
**Why it happens:** Performance observers need time to buffer entries after page load
**How to avoid:**
- Wait for 'load' state before capturing: `await page.waitForLoadState('load')`
- Use `buffered: true` in PerformanceObserver options to include past entries
- For LCP, wait for observer callback (it fires when largest paint detected, not immediately)
**Warning signs:** Performance metrics in logs show 0 or NaN for metrics like LCP

## Code Examples

Verified patterns from official sources:

### Form Filling with Input Types
```typescript
// Source: https://playwright.dev/docs/input
async function fillFormField(page: Page, selector: string, value: string, type?: string) {
  const locator = page.locator(selector);

  switch (type) {
    case 'text':
    case 'email':
    case 'password':
    case 'tel':
    case 'url':
      await locator.fill(value); // Works for all text-like inputs
      break;

    case 'date':
      await locator.fill('2020-02-02'); // ISO format YYYY-MM-DD
      break;

    case 'time':
      await locator.fill('13:15'); // 24-hour format HH:mm
      break;

    case 'datetime-local':
      await locator.fill('2020-02-02T13:15'); // ISO combined
      break;

    case 'checkbox':
    case 'radio':
      await locator.setChecked(true); // Or false to uncheck
      break;

    case 'select':
      await locator.selectOption(value); // By value
      // OR: await locator.selectOption({ label: 'Display Text' }); // By label
      break;

    case 'file':
      await locator.setInputFiles('./path/to/file.pdf');
      break;

    default:
      // Per user requirement: skip unrecognized fields
      console.warn(`Skipping unrecognized field type: ${type} at ${selector}`);
  }
}
```

### Fixed Test Data (Per User Requirement)
```typescript
// Source: User requirement (fixed predefined test data)
export const TEST_DATA = {
  personal: {
    firstName: 'John',
    lastName: 'Doe',
    fullName: 'John Doe',
    email: 'test@example.com',
    phone: '555-0100',
    phoneFormatted: '(555) 010-0100',
  },
  address: {
    street: '123 Test Street',
    city: 'Testville',
    state: 'California',
    stateCode: 'CA',
    zip: '90210',
    country: 'United States',
    countryCode: 'US',
  },
  account: {
    username: 'testuser',
    password: 'Test1234!',
    securityQuestion: 'What is your favorite color?',
    securityAnswer: 'Blue',
  },
  payment: {
    // Note: Use test card numbers only (https://stripe.com/docs/testing)
    cardNumber: '4242424242424242', // Stripe test card
    cardExpiry: '12/34',
    cardCVV: '123',
    cardholderName: 'John Doe',
  },
};
```

### Continue-on-Failure Workflow Execution
```typescript
// Source: User requirement (skip failed step, continue with remaining)
async function executeWorkflow(
  page: Page,
  workflow: WorkflowPlan,
  errorCollector: ErrorCollector
): Promise<WorkflowExecutionResult> {
  const stepResults: StepResult[] = [];

  for (let i = 0; i < workflow.steps.length; i++) {
    const step = workflow.steps[i];

    try {
      const result = await executeWorkflowStep(page, step, i);
      stepResults.push(result);

      if (result.status === 'failed') {
        console.warn(`Step ${i} failed, continuing with next step:`, result.error);
        // Continue loop despite failure (user requirement)
      }
    } catch (error) {
      // Unexpected error (not caught by executeWorkflowStep)
      console.error(`Critical error in step ${i}:`, error);
      stepResults.push({
        stepIndex: i,
        action: step.action,
        selector: step.selector,
        status: 'error',
        duration: 0,
        error: error.message,
      });
      // Still continue (maximize coverage per user requirement)
    }
  }

  const failedSteps = stepResults.filter(r => r.status === 'failed' || r.status === 'error');

  return {
    workflowName: workflow.workflowName,
    totalSteps: workflow.steps.length,
    passedSteps: stepResults.filter(r => r.status === 'passed').length,
    failedSteps: failedSteps.length,
    stepResults,
    errors: errorCollector,
    overallStatus: failedSteps.length === 0 ? 'passed' : 'failed',
  };
}
```

### Auto-Dismiss Native Dialogs (Default Behavior)
```typescript
// Source: https://playwright.dev/docs/dialogs
// Native dialogs (alert, confirm, prompt) are auto-dismissed by default
// No handler needed UNLESS you want to accept/reject/inspect them

// If you need to handle dialogs:
page.once('dialog', async dialog => {
  console.log(`Dialog type: ${dialog.type()}, message: ${dialog.message()}`);
  await dialog.dismiss(); // Or dialog.accept() for confirms
});

// For DOM modals (Material-UI, Bootstrap), close explicitly:
async function dismissDOMModal(page: Page) {
  const modal = page.getByRole('dialog');

  if (await modal.isVisible()) {
    // Try close button
    const closeBtn = modal.getByRole('button', { name: /close|cancel|dismiss/i });
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      return;
    }

    // Try Escape key fallback
    await page.keyboard.press('Escape');

    // Verify dismissed
    await expect(modal).toBeHidden({ timeout: 2000 });
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual wait chains (sleep, waitForTimeout) | Web-first assertions (toBeVisible, toHaveText) | Playwright v1.8+ (2020) | Auto-retry reduces flakiness; tests adapt to app timing variations |
| CSS class/XPath selectors | Role-based locators (getByRole, getByLabel) | Playwright v1.27 (2022) | Resilient to UI refactoring; mirrors user/assistive tech perspective |
| Page objects with rigid page.click() | Locator chaining with auto-waiting | Playwright v1.14+ (2021) | Handles dynamic UIs (React, Vue re-renders) without manual synchronization |
| Custom accessibility checks | @axe-core/playwright integration | @axe-core/playwright v4.0+ (2021) | Automated WCAG coverage (~50% of issues); reduces need for manual audits |
| FID (First Input Delay) | INP (Interaction to Next Paint) | Chrome 96+ (2021), official metric 2024 | Better captures responsiveness throughout page lifecycle, not just first interaction |

**Deprecated/outdated:**
- `page.waitForNavigation()`: Deprecated in Playwright v1.18+ — use `page.waitForURL()` or rely on auto-waiting in actions
- `page.$$eval()` for bulk element checks: Prefer locator chains with filtering for better error messages and auto-retry
- `networkidle2` wait: Unreliable for SPAs — use `domcontentloaded` or element-specific waits

## Open Questions

1. **Exit code severity threshold for CI/CD**
   - What we know: Playwright returns exit code 1 for any test failure; industry standard is 0 = success, non-zero = failure
   - What's unclear: Should we distinguish severity levels (e.g., exit 2 for critical errors vs exit 1 for warnings)?
   - Recommendation: Start with binary (0 = all passed, 1 = any failure); add severity levels in Phase 4 if user feedback requests it

2. **Signup form handling in authenticated flows**
   - What we know: User provides --email/--password for login; signup is at Claude's discretion
   - What's unclear: Should we attempt signup if login fails? Risk creating duplicate accounts on real sites
   - Recommendation: Do NOT attempt signup automatically (destructive action); flag in report if login fails with suggested manual action

3. **Popup/modal auto-dismiss reliability**
   - What we know: Native dialogs auto-dismiss; DOM modals need explicit close button click or Escape key
   - What's unclear: How to reliably detect "is this a modal blocking workflow?" without false positives on sidebars/tooltips
   - Recommendation: Use role="dialog" as primary signal; add heuristic for z-index > 1000 and position: fixed as fallback

4. **Custom dropdown detection vs skip threshold**
   - What we know: Skip unrecognized fields (custom dropdowns, date pickers)
   - What's unclear: Should we attempt interaction on ambiguous cases (e.g., `<div role="combobox">`)?
   - Recommendation: Attempt fill/select only on native elements (INPUT, SELECT, TEXTAREA); flag everything else as "custom control" to minimize false failures

## Sources

### Primary (HIGH confidence)
- [Playwright Actions (Form Filling)](https://playwright.dev/docs/input) - Text inputs, checkboxes, selects, file uploads
- [Playwright Accessibility Testing](https://playwright.dev/docs/accessibility-testing) - @axe-core/playwright integration and AxeBuilder API
- [Playwright Dialogs](https://playwright.dev/docs/dialogs) - Native dialog handling and auto-dismiss behavior
- [Playwright Test Retries](https://playwright.dev/docs/test-retries) - Retry mechanism, worker processes, error recovery
- [Playwright Test Timeouts](https://playwright.dev/docs/test-timeouts) - Action timeout, navigation timeout, global configuration
- [Playwright Best Practices](https://playwright.dev/docs/best-practices) - Selector strategies, waiting patterns, test isolation
- [Checkly: Measuring Page Performance Using Playwright](https://www.checklyhq.com/docs/learn/playwright/performance/) - LCP, CLS, Performance API examples

### Secondary (MEDIUM confidence)
- [Playwright Network Interception (OneUpTime)](https://oneuptime.com/blog/post/2026-02-02-playwright-network-interception/view) - Network event listeners and request tracking (verified with official docs)
- [Capturing Browser Console Logs (Medium - Prateek Parashar)](https://medium.com/@prateek291992/playwright-with-typescript-how-to-capture-and-validate-browser-console-logs-a7c1f3622eb4) - Console error filtering pattern (verified with official Page API)
- [BrowserStack: Playwright Timeout Guide 2026](https://www.browserstack.com/guide/playwright-timeout) - Timeout types and per-action configuration (cross-verified with official docs)
- [BrowserStack: Playwright Best Practices 2026](https://www.browserstack.com/guide/playwright-best-practices) - Common pitfalls and anti-patterns (aligned with official best practices)
- [Better Stack: 9 Playwright Best Practices and Pitfalls](https://betterstack.com/community/guides/testing/playwright-best-practices/) - Fragile selectors, flaky tests, test isolation (verified patterns)

### Tertiary (LOW confidence)
- WebSearch results on test data generation tools (Mockaroo, OnlineDataGenerator) - User requirement specifies fixed data, so these are not actively used
- WebSearch results on test execution engine architecture patterns - Generic patterns not Playwright-specific; need validation during implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Playwright, @axe-core/playwright, and TypeScript are well-documented and industry-standard for this use case
- Architecture: HIGH - All patterns verified against official Playwright documentation and user requirements from CONTEXT.md
- Pitfalls: HIGH - Sourced from official Playwright best practices docs and cross-verified with community experiences (BrowserStack, Better Stack)
- Test data: HIGH - User requirement locks down fixed predefined data (no generation needed)
- Exit codes: MEDIUM - User requirement leaves severity threshold at Claude's discretion; binary approach (0 vs 1) is standard but not explicitly documented in Playwright

**Research date:** 2026-02-07
**Valid until:** 2026-03-07 (30 days - Playwright releases monthly but APIs are stable; @axe-core updates quarterly)
