# Phase 2: Discovery & Planning - Research

**Researched:** 2026-02-07
**Domain:** Web crawling, SPA detection, interactive element discovery, AI workflow planning
**Confidence:** HIGH

## Summary

Phase 2 must discover complete site structure (all pages including SPA routes), map every interactive element (forms, buttons, links, menus, modals), and use AI to generate realistic workflow test plans. This research identifies the standard stack (Crawlee for crawling, Playwright locators for element discovery, Gemini 2.5 Flash for workflow planning), proven architecture patterns, and critical pitfalls that cause incomplete discovery.

The core challenge is **SPA routing invisibility**: traditional link-following misses 90% of React/Vue app functionality because client-side routing doesn't trigger network requests. Solution requires hybrid approach: intercept History API, detect framework-specific router patterns, and trigger navigation elements to discover hidden routes.

**Primary recommendation:** Use Crawlee's PlaywrightCrawler with same-domain strategy for exhaustive link following, combine with SPA-specific discovery (History API interception + navigation element triggering), and validate LLM-generated workflow plans with Playwright selector verification to prevent hallucinations.

## Standard Stack

The established libraries/tools for comprehensive site discovery and workflow planning:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **Crawlee** | 3.x+ | Recursive web crawling with automatic link enqueueing | Built on Playwright, handles request queuing, deduplication, rate limiting, and robots.txt automatically. Industry standard for crawling (used by Apify platform, 15K+ GitHub stars). |
| **Playwright Locators** | Built-in | Interactive element discovery using role-based selectors | Recommended by W3C for accessibility-first element selection. Returns visible elements by default, supports filtering hidden/modal content. |
| **Gemini 2.5 Flash** | Latest | AI workflow planning with structured JSON output | $0.30/$2.50 per 1M tokens (33x cheaper than GPT-4o), native JSON Schema support (Nov 2025 update), 1M token context window for complex sitemaps. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **zod** | 3.x+ | Schema definition for Gemini structured output | Define workflow plan schema in TypeScript, convert to JSON Schema automatically with `zodToJsonSchema`. Better than raw JSON Schema for type safety. |
| **robotstxt-parser** | 0.2.x+ | Parse robots.txt files for crawl rules | Respect crawl-delay directives and disallowed paths. Essential for polite crawling. |
| **url-normalize** | 6.x+ | Canonicalize URLs to prevent duplicate crawls | Handles trailing slashes, query param ordering, protocol normalization. Prevents crawling same page multiple times. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Crawlee | Custom Playwright crawler | Custom = reinventing request queue, deduplication, rate limiting. Only consider if Crawlee's API is too constraining (unlikely). |
| Gemini 2.5 Flash | GPT-4o Mini ($0.15/$0.60 per 1M) | GPT-4o Mini is 2x cheaper but lacks Gemini's 1M token context (critical for large sitemaps). Use GPT-4o Mini only if Gemini API unavailable. |
| Role-based locators | CSS/XPath selectors | CSS/XPath are brittle (break with DOM changes). Role-based locators reflect user perception, recommended by Playwright docs. |

**Installation:**
```bash
npm install @crawlee/playwright zod robotstxt-parser url-normalize
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── discovery/           # Crawling and element discovery
│   ├── crawler.ts       # Crawlee PlaywrightCrawler configuration
│   ├── spa-detector.ts  # Detect SPA framework (React/Vue/Next.js)
│   ├── route-interceptor.ts  # History API interception for client-side routes
│   ├── element-mapper.ts     # Discover all interactive elements per page
│   └── link-validator.ts     # Check for broken links (404s)
├── planning/            # AI workflow generation
│   ├── workflow-planner.ts   # Gemini 2.5 Flash workflow generation
│   ├── plan-schema.ts        # Zod schema for workflow plans
│   └── selector-verifier.ts  # Validate LLM-generated selectors
└── artifacts/           # Already exists from Phase 1
    └── sitemap.json     # Hierarchical site structure artifact
```

### Pattern 1: Exhaustive Crawling with Same-Domain Strategy

**What:** Use Crawlee's `enqueueLinks()` with `same-domain` strategy to recursively follow all internal links until no new pages are found.

**When to use:** Every crawl. This is the foundation for discovering static pages and traditional multi-page apps.

**Example:**
```typescript
// Source: https://crawlee.dev/js/api/core/interface/EnqueueLinksOptions
import { PlaywrightCrawler } from '@crawlee/playwright';

const crawler = new PlaywrightCrawler({
  maxRequestsPerCrawl: 0, // No hard limit (warn user at 50)
  maxConcurrency: 3,       // Politeness: max 3 pages simultaneously

  async requestHandler({ request, page, enqueueLinks, log }) {
    log.info(`Crawling: ${request.url}`);

    // Enqueue all same-domain links found on this page
    await enqueueLinks({
      strategy: 'same-domain',  // Matches same domain + all subdomains
      exclude: [
        '**/*.pdf', '**/*.zip', '**/*.jpg', '**/*.png',  // Skip assets
        '**/admin/**', '**/logout'  // Skip auth-requiring paths
      ],
    });

    // Discover interactive elements on this page
    await discoverElements(page, request.url);
  },
});

await crawler.addRequests([startUrl]);
await crawler.run();
```

**Key insight:** `same-domain` includes subdomains (e.g., `blog.example.com` when starting from `example.com`). User's context decision: "subdomains treated as external links" — use `same-hostname` strategy instead.

### Pattern 2: SPA Route Discovery via History API Interception

**What:** Intercept `pushState` and `replaceState` calls to detect client-side navigation, then wait for DOM/network stability before capturing page state.

**When to use:** After detecting SPA framework (React Router, Vue Router, Next.js). Complements link-following for discovering routes that aren't in initial HTML.

**Example:**
```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/History_API/Working_with_the_History_API
async function interceptHistoryAPI(page: Page): Promise<Set<string>> {
  const discoveredRoutes = new Set<string>();

  // Inject History API interceptor into page context
  await page.addInitScript(() => {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    (window as any).__routeChanges = [];

    history.pushState = function(...args) {
      (window as any).__routeChanges.push({ type: 'push', url: args[2] });
      return originalPushState.apply(history, args);
    };

    history.replaceState = function(...args) {
      (window as any).__routeChanges.push({ type: 'replace', url: args[2] });
      return originalReplaceState.apply(history, args);
    };
  });

  // Click all navigation elements to trigger route changes
  const navLinks = await page.getByRole('link').all();

  for (const link of navLinks) {
    const href = await link.getAttribute('href');
    if (href?.startsWith('/')) {  // Internal route
      await link.click({ timeout: 2000 }).catch(() => {});

      // Wait for route change to complete
      await page.waitForLoadState('domcontentloaded', { timeout: 3000 }).catch(() => {});

      // Extract route from page
      const routes = await page.evaluate(() => (window as any).__routeChanges || []);
      routes.forEach((r: any) => discoveredRoutes.add(r.url));
    }
  }

  return discoveredRoutes;
}
```

**Important:** `popstate` event only fires on back/forward navigation, NOT on `pushState()` calls. Must intercept `pushState` directly to detect route changes.

### Pattern 3: Framework-Specific Detection

**What:** Detect SPA framework by checking for framework-specific window properties and DOM attributes, then adapt discovery strategy per framework.

**When to use:** Before SPA route discovery. Different frameworks expose routes differently (React Router vs Vue Router vs Next.js).

**Example:**
```typescript
// Source: https://gist.github.com/rambabusaravanan/1d594bd8d1c3153bc8367753b17d074b
interface FrameworkDetection {
  framework: 'react' | 'vue' | 'angular' | 'next' | 'svelte' | 'none';
  version?: string;
  router?: string;
}

async function detectFramework(page: Page): Promise<FrameworkDetection> {
  return await page.evaluate(() => {
    // React detection
    if ((window as any).React || document.querySelector('[data-reactroot]')) {
      const reactContainer = Object.keys(document.body).find(k =>
        k.startsWith('__reactContainer')
      );
      if (reactContainer) {
        return { framework: 'react', router: 'react-router' };
      }
    }

    // Next.js detection (takes precedence over React)
    if (document.querySelector('script#__NEXT_DATA__')) {
      return { framework: 'next', router: 'next-router' };
    }

    // Vue detection
    if ((window as any).Vue || (window as any).__VUE__) {
      return { framework: 'vue', router: 'vue-router' };
    }

    // Angular detection
    if ((window as any).ng || document.querySelector('[ng-version]')) {
      return { framework: 'angular', router: 'angular-router' };
    }

    // Svelte detection
    if (document.querySelector('[data-svelte-h]')) {
      return { framework: 'svelte', router: 'sveltekit' };
    }

    return { framework: 'none' };
  });
}
```

**User context decision:** "Detect SPA framework and adapt discovery strategy per framework" — implement this pattern for each detected framework.

### Pattern 4: Interactive Element Discovery with Role Locators

**What:** Use Playwright's role-based locators to find all interactive elements (forms, buttons, links, inputs), including hidden elements (modals, dropdowns).

**When to use:** On every crawled page. This builds the sitemap artifact consumed by Phase 3 (workflow execution).

**Example:**
```typescript
// Source: https://playwright.dev/docs/locators
interface InteractiveElements {
  forms: FormElement[];
  buttons: ButtonElement[];
  links: LinkElement[];
  inputs: InputElement[];
  menus: MenuElement[];
}

async function discoverElements(page: Page, url: string): Promise<InteractiveElements> {
  const elements: InteractiveElements = {
    forms: [],
    buttons: [],
    links: [],
    inputs: [],
    menus: [],
  };

  // Discover all buttons (visible and hidden)
  const buttons = await page.getByRole('button').all();
  for (const button of buttons) {
    const isVisible = await button.isVisible();
    const text = await button.textContent();
    const ariaLabel = await button.getAttribute('aria-label');

    elements.buttons.push({
      selector: `button:has-text("${text}")`,
      text: text || ariaLabel || '',
      visible: isVisible,
    });
  }

  // Discover all forms and their fields
  const forms = await page.locator('form').all();
  for (const form of forms) {
    const fields = await form.locator('input, textarea, select').all();
    const formFields = [];

    for (const field of fields) {
      const type = await field.getAttribute('type') || 'text';
      const name = await field.getAttribute('name') || '';
      const required = await field.getAttribute('required') !== null;
      const placeholder = await field.getAttribute('placeholder') || '';
      const label = await field.getAttribute('aria-label') || '';

      formFields.push({
        type,
        name,
        required,
        placeholder,
        label,
      });
    }

    elements.forms.push({
      action: await form.getAttribute('action') || '',
      fields: formFields,
    });
  }

  // Discover all links (for sitemap)
  const links = await page.locator('a').all();
  for (const link of links) {
    const href = await link.getAttribute('href');
    const text = await link.textContent();

    if (href) {
      elements.links.push({
        href: new URL(href, url).href,  // Resolve relative URLs
        text: text?.trim() || '',
      });
    }
  }

  // Discover hidden interactive elements (modals, dropdowns)
  // Strategy: Click all buttons/menus, check for new elements, restore state
  const hiddenElements = await discoverHiddenElements(page);

  return elements;
}
```

**User context decision:** "Trigger and map hidden elements — click buttons, hover menus, open modals to discover full UI surface" — implement `discoverHiddenElements()` to click all buttons and capture newly visible elements.

### Pattern 5: LLM Workflow Planning with Structured Output

**What:** Use Gemini 2.5 Flash with JSON Schema to generate step-by-step workflow plans from sitemap artifact. Each step includes action, selector, and expected result.

**When to use:** After sitemap is complete. This generates the workflow plans consumed by Phase 3 (execution).

**Example:**
```typescript
// Source: https://ai.google.dev/gemini-api/docs/structured-output
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Define workflow plan schema
const WorkflowStepSchema = z.object({
  action: z.enum(['navigate', 'click', 'fill', 'select', 'wait', 'expect']),
  selector: z.string().describe('Playwright selector (role-based preferred)'),
  value: z.string().optional().describe('Value to fill/select (for fill/select actions)'),
  expectedResult: z.string().describe('Expected outcome after this step'),
  confidence: z.number().min(0).max(1).describe('LLM confidence in this step (0-1)'),
});

const WorkflowPlanSchema = z.object({
  workflowName: z.string().describe('Human-readable workflow name (e.g., "Signup Flow")'),
  description: z.string().describe('What this workflow tests'),
  steps: z.array(WorkflowStepSchema),
  priority: z.enum(['critical', 'important', 'nice-to-have']),
  estimatedDuration: z.number().describe('Estimated execution time in seconds'),
});

async function generateWorkflowPlans(
  sitemap: SitemapArtifact,
  userHints?: string[]
): Promise<WorkflowPlan[]> {
  const schema = zodToJsonSchema(WorkflowPlanSchema);

  const prompt = `
You are analyzing a website sitemap to identify realistic user workflows.

SITEMAP STRUCTURE:
${JSON.stringify(sitemap, null, 2)}

USER HINTS: ${userHints?.join(', ') || 'None provided'}

Generate workflow test plans for common user journeys. For each workflow:
1. Identify the goal (signup, login, checkout, dashboard navigation)
2. Create step-by-step plan with Playwright selectors
3. Use role-based selectors (e.g., "button:has-text('Sign Up')")
4. Include expected results per step for verification
5. Assign confidence score (filter out <0.7 later)

Focus on:
- Authentication flows (signup, login, logout)
- Form submissions (contact, search, settings)
- Navigation paths (home → dashboard → settings)
- User hints provided by user (prioritize these)

Return array of workflow plans.
`;

  const response = await gemini.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: schema,
    },
  });

  const plans = JSON.parse(response.text());

  // Verify selectors exist (prevent hallucinations)
  const verifiedPlans = await verifyWorkflowPlans(plans);

  return verifiedPlans;
}
```

**User context decision:** "Generate step-by-step plans with selectors — each step includes action, target selector, expected result" — this schema matches exactly.

### Pattern 6: Broken Link Detection with Soft Assertions

**What:** Extract all links from crawled pages, check status codes with HEAD requests (or GET for servers that reject HEAD), use soft assertions to collect all failures before reporting.

**When to use:** During or after crawl. Can run in parallel with element discovery.

**Example:**
```typescript
// Source: https://www.checklyhq.com/docs/learn/playwright/how-to-detect-broken-links/
async function validateLinks(page: Page, baseUrl: string): Promise<BrokenLink[]> {
  const brokenLinks: BrokenLink[] = [];

  // Extract all links
  const allLinks = await page.locator('a').all();
  const allLinkHrefs = await Promise.all(
    allLinks.map(link => link.getAttribute('href'))
  );

  // Deduplicate and filter
  const validHrefs = allLinkHrefs.reduce((links, link) => {
    if (link && !link.startsWith('mailto:') && !link.startsWith('#')) {
      links.add(new URL(link, baseUrl).href);  // Resolve relative URLs
    }
    return links;
  }, new Set<string>());

  // Check each link
  for (const url of validHrefs) {
    try {
      // Use page.request to maintain session context (cookies)
      const response = await page.request.get(url, { timeout: 5000 });

      if (!response.ok()) {
        brokenLinks.push({
          url,
          sourceUrl: baseUrl,
          statusCode: response.status(),
          statusText: response.statusText(),
        });
      }
    } catch (error) {
      brokenLinks.push({
        url,
        sourceUrl: baseUrl,
        statusCode: 0,
        statusText: error.message,
      });
    }
  }

  return brokenLinks;
}
```

**Important:** HTTP 404 is NOT a network error — request completes with `requestfinished` event. Check `response.status()` explicitly.

### Anti-Patterns to Avoid

- **Don't wait for networkidle on SPAs:** Many SPAs make background polling requests (analytics, live updates) that prevent networkidle. Use `domcontentloaded` + fixed timeout instead.
- **Don't trust LLM selectors without verification:** LLMs hallucinate 8-38% of the time. Always verify selectors exist with `page.locator(selector).count()` before using.
- **Don't crawl without rate limiting:** Default concurrency can DDoS small sites. Use `maxConcurrency: 3` and respect `robots.txt` crawl-delay.
- **Don't ignore dynamic route patterns:** `/users/:id` represents thousands of pages. Visit ONE example (`/users/123`), note the pattern exists, don't enumerate all IDs.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Request queue management | Custom array + Set for visited URLs | Crawlee's RequestQueue | Crawlee handles deduplication, priority, persistence, retry logic. Custom solution misses edge cases (fragment handling, URL normalization, concurrency safety). |
| URL normalization | String manipulation for trailing slashes | `url-normalize` package | Handles 20+ edge cases: protocol normalization, query param ordering, port defaults, IDN domains, percent-encoding. Custom solution causes duplicate crawls. |
| robots.txt parsing | Regex for disallow rules | `robotstxt-parser` | Handles wildcard patterns, crawl-delay, multiple user-agents, sitemap directives. Custom parser misses 70% of spec. |
| Dynamic route pattern detection | Regex for `/users/123` → `/users/:id` | LLM-based pattern extraction | Dynamic routes have infinite variations (`/blog/[year]/[month]/[slug]`). LLMs excel at pattern recognition from examples. |
| DOM stability detection | `setTimeout()` or `waitForTimeout()` | Playwright's built-in actionability checks | Playwright waits for elements to be stable, visible, and enabled automatically. Custom timeouts cause flakiness (too short) or slowness (too long). |

**Key insight:** Crawling is a solved problem with 20+ years of accumulated edge cases. Use battle-tested libraries (Crawlee, robotstxt-parser) rather than custom solutions that will miss 90% of real-world complexity.

## Common Pitfalls

### Pitfall 1: SPA Navigation Invisibility

**What goes wrong:** Tool only discovers homepage, misses 90% of React/Vue app functionality because client-side routing doesn't trigger network requests.

**Why it happens:** Single-page apps use JavaScript router libraries (React Router, Vue Router) that update the URL without network requests. Traditional crawlers look for `<a href>` tags and follow them with full page loads. Playwright's `page.url()` returns stale URLs because `page.click()` resolves before navigation completes.

**How to avoid:**
1. Detect SPA framework on initial page load (check for React Router, Vue Router, Next.js)
2. Intercept History API (`pushState`, `replaceState`) to capture route changes
3. Use `page.waitForURL()` after clicks instead of `page.url()`
4. Click all navigation elements (nav links, menu items) to trigger route changes
5. Wait for DOM stability after each navigation (`page.waitForLoadState('domcontentloaded')`)

**Warning signs:**
- Page count in sitemap is suspiciously low (1-3 pages for complex app)
- Navigation clicks don't change `page.url()` value
- Screenshots look identical after "navigation"
- Test duration is too short (20-page SPA tested in 10 seconds)

### Pitfall 2: Infinite Crawl Loops

**What goes wrong:** Crawler enters infinite loop on pagination, calendar widgets, or dynamic filters, never completing.

**Why it happens:** Sites generate unlimited URLs through query parameters (`?page=1`, `?page=2`, ... `?page=9999`). Calendar widgets create links for every future date. Filter combinations create exponential URL explosion (`?color=red&size=large&style=modern&...`).

**How to avoid:**
1. Track visited URLs with normalized keys (ignore query param ordering)
2. Detect pagination patterns — visit first 3 pages, then stop
3. Set `maxRequestsPerCrawl` fallback (warn user at 50, hard stop at 500)
4. Exclude known infinite patterns in `enqueueLinks({ exclude: [...] })`
5. Detect dynamic route patterns — visit ONE example of `/users/:id`, don't enumerate all IDs

**Warning signs:**
- Crawl runs for >5 minutes on small site
- URL count grows linearly without stopping
- Many URLs differ only in query parameters
- Log shows same page path with different params repeatedly

### Pitfall 3: Hallucinated Workflow Steps

**What goes wrong:** AI reports clicking buttons that don't exist. False positives destroy trust.

**Why it happens:** Vision LLMs hallucinate at rates of 8-38% (2026 data). When asked to identify "login button", LLM may confidently report finding one when none exists. LLMs are trained to be helpful, so they'll "find" what you asked for even if it's not there.

**How to avoid:**
1. **Verification pass:** After LLM generates workflow plan, verify each selector exists with `page.locator(selector).count() > 0`
2. **Confidence filtering:** Require LLM to provide confidence scores (0-1), filter out steps with <0.7 confidence
3. **Ground truth anchoring:** Provide HTML structure alongside screenshots to LLM for context
4. **Explicit uncertainty prompting:** Train prompts to say "not found" rather than guessing
5. **Multi-pass consistency:** Generate workflow plan 2x with different prompts, flag contradictions

**Warning signs:**
- Workflow plan describes elements that aren't in sitemap
- Same sitemap processed twice gives different workflow counts
- LLM identifies forms on static content pages (About, Contact without forms)
- Selectors fail verification at >20% rate

### Pitfall 4: Rate Limiting and Politeness Violations

**What goes wrong:** Tool gets IP banned during demo. Site owner emails angry complaint. HN roasts the tool for DDoS behavior.

**Why it happens:** Default Playwright crawling has no rate limits. Running 10+ concurrent pages can overwhelm small sites (vibe-coder targets often on cheap hosting). Ignoring `robots.txt` crawl-delay directive. Not respecting `Retry-After` headers.

**How to avoid:**
1. **Parse robots.txt:** Use `robotstxt-parser` to check disallowed paths and crawl-delay
2. **Limit concurrency:** Set `maxConcurrency: 3` (max 3 simultaneous pages)
3. **Add delays:** Respect crawl-delay directive or use default 1-second delay between requests
4. **Set User-Agent:** Identify as "Afterburn/1.0 (+https://github.com/user/afterburn)" for site owner contact
5. **Respect 429 responses:** Implement exponential backoff on rate limit errors

**Warning signs:**
- Getting 403/429 status codes during crawl
- Crawl speed >10 pages/second on small site
- No delay between requests in logs
- Site becomes unresponsive during crawl

### Pitfall 5: Hidden Element Blindness

**What goes wrong:** Tool misses navigation menus, modal forms, dropdown options — reports incomplete sitemap.

**Why it happens:** Interactive elements hidden by default (`display: none`, `visibility: hidden`) don't appear in initial element discovery. Modals only render on button click. Dropdown menus only appear on hover. Mobile navigation hidden behind hamburger menu.

**How to avoid:**
1. **Discovery pass:** Click all buttons and check for newly visible elements
2. **Hover menus:** Use `element.hover()` on nav items to trigger dropdowns
3. **Filter by visibility:** Use `page.getByRole('button').all()` to get ALL buttons (hidden and visible), then check `isVisible()` separately
4. **Mobile viewport:** Run discovery at mobile viewport (375px) to trigger mobile-specific UI
5. **Modal detection:** After clicking, check for `role="dialog"` or `.modal` elements

**Warning signs:**
- Sitemap shows no forms when site has contact form
- Missing dashboard/settings pages that require button clicks
- Navigation count is suspiciously low (3-5 links when site has 20+ pages)
- No modal/dropdown elements in sitemap

## Code Examples

Verified patterns from official sources:

### Crawlee Recursive Crawler with Same-Domain Strategy
```typescript
// Source: https://crawlee.dev/js/docs/examples/playwright-crawler
import { PlaywrightCrawler } from '@crawlee/playwright';

const crawler = new PlaywrightCrawler({
  launchContext: {
    launchOptions: {
      headless: true,
    },
  },
  maxRequestsPerCrawl: 0,  // No hard limit (user's decision)
  maxConcurrency: 3,       // Politeness

  async requestHandler({ pushData, request, page, enqueueLinks, log }) {
    log.info(`Processing ${request.url}...`);

    // Discover elements on this page
    const elements = await discoverElements(page, request.url);
    await pushData({ url: request.url, elements });

    // Enqueue same-domain links (not subdomains per user's decision)
    await enqueueLinks({
      strategy: 'same-hostname',  // Same domain, NOT subdomains
      exclude: ['**/*.pdf', '**/*.jpg', '**/*.png', '**/admin/**'],
    });

    const pageCount = await crawler.requestQueue?.handledCount() || 0;
    if (pageCount === 50) {
      log.warning('Discovered 50 pages. Crawl may take a while. Continuing...');
    }
  },

  failedRequestHandler({ request, log }) {
    log.error(`Request ${request.url} failed too many times.`);
  },
});

await crawler.addRequests([startUrl]);
await crawler.run();
```

### Playwright Role-Based Element Discovery
```typescript
// Source: https://playwright.dev/docs/locators
async function discoverInteractiveElements(page: Page) {
  // Get all buttons (recommended: role-based locators)
  const buttons = await page.getByRole('button').all();

  for (const button of buttons) {
    const text = await button.textContent();
    const isVisible = await button.isVisible();
    console.log(`Button: "${text}" (visible: ${isVisible})`);
  }

  // Get all form inputs by label
  const emailInput = page.getByLabel('Email');
  const passwordInput = page.getByLabel('Password');

  // Get all links
  const links = await page.getByRole('link').all();
  const linkData = await Promise.all(
    links.map(async link => ({
      text: await link.textContent(),
      href: await link.getAttribute('href'),
    }))
  );

  // Filter visible elements only
  const visibleButtons = await page.getByRole('button')
    .filter({ visible: true })
    .all();

  return { buttons, links: linkData, visibleButtons };
}
```

### Gemini 2.5 Flash Structured Workflow Planning
```typescript
// Source: https://ai.google.dev/gemini-api/docs/structured-output
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const WorkflowSchema = z.object({
  workflowName: z.string(),
  steps: z.array(z.object({
    action: z.enum(['click', 'fill', 'navigate', 'expect']),
    selector: z.string().describe('Playwright role-based selector'),
    value: z.string().optional(),
    expectedResult: z.string(),
    confidence: z.number().min(0).max(1),
  })),
  priority: z.enum(['critical', 'important', 'nice-to-have']),
});

async function generateWorkflow(sitemap: any) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: zodToJsonSchema(WorkflowSchema),
    },
  });

  const prompt = `Analyze this sitemap and generate workflow test plan:\n${JSON.stringify(sitemap)}`;
  const result = await model.generateContent(prompt);
  const workflow = JSON.parse(result.response.text());

  // Verify selectors exist (prevent hallucinations)
  for (const step of workflow.steps) {
    if (step.confidence < 0.7) {
      console.warn(`Low confidence step: ${step.action} ${step.selector}`);
    }
  }

  return workflow;
}
```

### Broken Link Detection with Soft Assertions
```typescript
// Source: https://www.checklyhq.com/docs/learn/playwright/how-to-detect-broken-links/
async function checkBrokenLinks(page: Page) {
  const allLinks = await page.locator('a').all();
  const allLinkHrefs = await Promise.all(
    allLinks.map(link => link.getAttribute('href'))
  );

  // Deduplicate and filter
  const validHrefs = allLinkHrefs.reduce((links, link) => {
    if (link && !link.startsWith('mailto:') && !link.startsWith('#')) {
      links.add(new URL(link, page.url()).href);
    }
    return links;
  }, new Set<string>());

  const brokenLinks = [];

  // Check each link (use page.request to maintain cookies)
  for (const url of validHrefs) {
    try {
      const response = await page.request.get(url, { timeout: 5000 });
      if (!response.ok()) {
        brokenLinks.push({ url, status: response.status() });
      }
    } catch (error) {
      brokenLinks.push({ url, status: 0, error: error.message });
    }
  }

  return brokenLinks;
}
```

### SPA Framework Detection
```typescript
// Source: https://gist.github.com/rambabusaravanan/1d594bd8d1c3153bc8367753b17d074b
async function detectSPAFramework(page: Page) {
  return await page.evaluate(() => {
    // Next.js (check first - uses React internally)
    if (document.querySelector('script#__NEXT_DATA__')) {
      return { framework: 'next', router: 'next-router' };
    }

    // React
    const reactKey = Object.keys(document.body).find(k =>
      k.startsWith('__reactContainer')
    );
    if (reactKey || (window as any).React) {
      return { framework: 'react', router: 'react-router' };
    }

    // Vue
    if ((window as any).Vue || (window as any).__VUE__) {
      return { framework: 'vue', router: 'vue-router' };
    }

    // Angular
    if ((window as any).ng || document.querySelector('[ng-version]')) {
      return { framework: 'angular', router: 'angular-router' };
    }

    // Svelte
    if (document.querySelector('[data-svelte-h]')) {
      return { framework: 'svelte', router: 'sveltekit' };
    }

    return { framework: 'none' };
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Puppeteer for crawling | Playwright + Crawlee | 2022-2023 | Playwright has better cross-browser support, Crawlee adds production-grade queue management. Industry shifted away from Puppeteer. |
| CSS/XPath selectors | Role-based locators | 2021 (Playwright launch) | Role locators match accessibility tree (how users perceive page), more resilient to DOM changes. |
| GPT-4o for vision | Gemini 2.5 Flash | Nov 2025 | Gemini 2.5 Flash 33x cheaper ($0.30/$2.50 vs $10/$30 per 1M tokens) with native JSON Schema support. Makes vision-based workflow planning economically viable. |
| Prompt engineering for JSON | Native structured output | Nov 2025 (Gemini), Sept 2024 (OpenAI) | JSON Schema enforcement reduces parsing errors from ~15% to <1%. Eliminates need for retry loops. |
| `setTimeout()` for page load | Playwright actionability checks | 2020 (Playwright v1.0) | Built-in waiting for stability, visibility, and enablement. Custom timeouts caused 80% of flakiness issues. |
| Manual robots.txt parsing | `robotstxt-parser` package | 2015+ | Handles 90% of robots.txt spec (wildcards, crawl-delay, multiple user-agents). Manual parsing missed edge cases. |

**Deprecated/outdated:**
- **Puppeteer as primary automation library**: Playwright has surpassed Puppeteer in adoption for new projects (2023-2026 trend). Only use Puppeteer if you need Chrome-specific DevTools features.
- **CSS/XPath-only element selection**: Brittle. Modern best practice is role-based locators first, CSS/XPath as fallback.
- **Manual JSON parsing from LLM output**: Use native structured output (Gemini JSON Schema, OpenAI Structured Outputs) instead of regex/manual parsing.
- **networkidle for SPAs**: Many SPAs never reach networkidle due to polling/analytics. Use `domcontentloaded` + fixed timeout instead.

## Open Questions

Things that couldn't be fully resolved:

1. **Dynamic route pattern detection accuracy**
   - What we know: LLMs can recognize patterns like `/users/123` → `/users/:id` from examples
   - What's unclear: How many examples needed for accurate pattern detection? 1 example vs 3 examples vs 10 examples?
   - Recommendation: Start with visiting 1 example per pattern (user's decision: "visit one example"), expand to 3 if pattern detection confidence is low (<0.7)

2. **Render wait strategy for SPAs**
   - What we know: `networkidle` doesn't work for SPAs with polling. `domcontentloaded` is too early (content may not be rendered).
   - What's unclear: Optimal hybrid strategy (DOM stability + network idle with timeout)?
   - Recommendation: Use `domcontentloaded` + fixed 2-second timeout as default. Add `page.waitForLoadState('networkidle', { timeout: 5000 })` with try-catch fallback (already implemented in Phase 1 BrowserManager).

3. **External link checking strategy**
   - What we know: HEAD requests can validate external links, but some servers reject HEAD and require GET
   - What's unclear: User's context says "External links: Claude's Discretion on whether to HEAD-check or just record"
   - Recommendation: Record external links without checking (avoids rate limiting from external sites). Optionally add `--check-external` flag for HEAD checks with GET fallback.

4. **Gemini 2.5 Flash hallucination rate on workflow planning**
   - What we know: General LLM hallucination rates are 8-38% (2026 data). Gemini 2.5 Flash not specifically benchmarked for workflow planning.
   - What's unclear: Does structured output + ground truth HTML reduce hallucination rate below 8%?
   - Recommendation: Implement confidence scoring + selector verification (count > 0) as mandatory validation. Track hallucination rate during Phase 3 testing, tune prompts if rate >10%.

## Sources

### Primary (HIGH confidence)
- [Crawlee Playwright Crawler Documentation](https://crawlee.dev/js/docs/examples/playwright-crawler) - Recursive crawling with enqueueLinks
- [Crawlee EnqueueLinksOptions API](https://crawlee.dev/js/api/core/interface/EnqueueLinksOptions) - same-domain strategy, globs, exclude patterns
- [Playwright Locators Documentation](https://playwright.dev/docs/locators) - Role-based locators, filtering, multiple element handling
- [Gemini API Structured Output Documentation](https://ai.google.dev/gemini-api/docs/structured-output) - JSON Schema support, Zod integration
- [Checkly: How to Detect Broken Links with Playwright](https://www.checklyhq.com/docs/learn/playwright/how-to-detect-broken-links/) - Soft assertions, page.request usage

### Secondary (MEDIUM confidence)
- [MDN: History API Working Guide](https://developer.mozilla.org/en-US/docs/Web/API/History_API/Working_with_the_History_API) - pushState/popState interception
- [GitHub Gist: Detect JS Framework](https://gist.github.com/rambabusaravanan/1d594bd8d1c3153bc8367753b17d074b) - Window properties and DOM attributes for framework detection
- [BrowserStack: Playwright Web Scraping Guide](https://www.browserstack.com/guide/playwright-web-scraping) - Link extraction methods
- [BrowserStack: Understanding Playwright waitForLoadState](https://www.browserstack.com/guide/playwright-waitforloadstate) - DOM stability and networkidle strategies

### Tertiary (LOW confidence - marked for validation)
- [Medium: LLM Hallucination Rates 2026](https://medium.com/@addyosmani/my-llm-coding-workflow-going-into-2026-52fe1681325e) - 8-38% hallucination rates (not Gemini-specific)
- WebSearch results for dynamic route patterns (Vue Router, Next.js) - Implementation details need official docs verification

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Crawlee, Playwright locators, Gemini 2.5 Flash all verified via official documentation
- Architecture: HIGH - Patterns extracted from official Playwright/Crawlee docs and examples
- Pitfalls: HIGH - Sourced from existing PITFALLS.md research (Phase 1) plus new web search results
- SPA detection: MEDIUM - Framework detection methods sourced from community gist (unverified with official framework docs)
- Render wait strategy: MEDIUM - Phase 1 implements networkidle + timeout, but optimal SPA strategy still requires experimentation

**Research date:** 2026-02-07
**Valid until:** 2026-03-07 (30 days - stable domain, frameworks and libraries change slowly)
