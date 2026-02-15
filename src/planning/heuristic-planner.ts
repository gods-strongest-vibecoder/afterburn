// Generates basic workflow plans from discovered page elements without AI (fallback when GEMINI_API_KEY is not set)

import type { SitemapNode, WorkflowPlan, WorkflowStep, FormInfo, PageData, InteractiveElement, FormField } from '../types/discovery.js';

/** Maximum number of workflows to generate (keeps runtime manageable) */
const MAX_WORKFLOWS = 8;
const NON_ACTIONABLE_FILL_TYPES = new Set([
  'hidden',
  'submit',
  'button',
  'reset',
  'file',
  'color',
  'range',
  'image',
]);

/**
 * Generates workflow plans from sitemap data using heuristics instead of AI.
 * Produces the same WorkflowPlan[] format that Gemini returns, so downstream
 * pipeline stages (executor, analyzer, reporter) work unchanged.
 */
export function generateHeuristicPlans(sitemap: SitemapNode): WorkflowPlan[] {
  const pages = collectAllPages(sitemap);
  const plans: WorkflowPlan[] = [];
  const seenWorkflowNames = new Set<string>();

  // 1. Form workflows - highest value (signup, login, contact, search)
  for (const page of pages) {
    for (const form of page.pageData.forms) {
      if (plans.length >= MAX_WORKFLOWS) break;
      const plan = buildFormWorkflow(page, form);
      if (plan && !seenWorkflowNames.has(plan.workflowName)) {
        seenWorkflowNames.add(plan.workflowName);
        plans.push(plan);
      }
    }
    if (plans.length >= MAX_WORKFLOWS) break;
  }

  // 2. CTA / prominent button workflows
  for (const page of pages) {
    const ctaButtons = page.pageData.buttons
      .filter(b => b.visible && b.text.trim().length > 0)
      .slice(0, 3); // top 3 visible buttons per page

    for (const button of ctaButtons) {
      if (plans.length >= MAX_WORKFLOWS) break;
      const plan = buildButtonWorkflow(page, button);
      if (plan && !seenWorkflowNames.has(plan.workflowName)) {
        seenWorkflowNames.add(plan.workflowName);
        plans.push(plan);
      }
    }
    if (plans.length >= MAX_WORKFLOWS) break;
  }

  // 3. Navigation workflows - verify key internal links load without errors
  const navPlan = buildNavigationWorkflow(pages);
  if (navPlan && plans.length < MAX_WORKFLOWS) {
    plans.push(navPlan);
  }

  // Sort: critical first, then important, then nice-to-have
  const priorityOrder: Record<string, number> = { critical: 0, important: 1, 'nice-to-have': 2 };
  plans.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return plans;
}

// ---------------- Workflow builders -------------------------------

function buildFormWorkflow(page: SitemapNode, form: FormInfo): WorkflowPlan | null {
  if (form.fields.length === 0) return null;

  const steps: WorkflowStep[] = [];

  // Step 1: Navigate to the page containing the form
  steps.push({
    action: 'navigate',
    selector: page.url,
    value: undefined,
    expectedResult: `Page "${page.pageData.title}" loads successfully`,
    confidence: 1.0,
  });

  const fillableFields = form.fields.filter(isFillActionableField);

  // Step 2-N: Fill each field with synthetic test data
  for (const field of fillableFields) {
    const testValue = syntheticValue(field.type, field.name, field.label);
    const label = normalizeWhitespace(field.label || field.name || field.type || 'field');

    steps.push({
      action: 'fill',
      selector: fieldSelector(form, field),
      value: testValue,
      expectedResult: `Field "${label}" accepts input`,
      confidence: 0.7,
    });
  }

  // Final step: Submit (robustly match common submit controls)
  steps.push({
    action: 'click',
    selector: `${form.selector} button[type="submit"], ${form.selector} input[type="submit"], ${form.selector} button:not([type])`,
    value: undefined,
    expectedResult: 'Form submits without errors',
    confidence: 0.6,
  });

  // Add an expect step to verify no console errors
  steps.push({
    action: 'expect',
    selector: 'body',
    value: undefined,
    expectedResult: 'Page does not show error messages after submission',
    confidence: 0.7,
  });

  const formName = classifyForm(form, page.url);
  const priority = formName.includes('login') || formName.includes('signup') || formName.includes('search')
    ? 'critical' as const
    : 'important' as const;

  // Include page path in workflow name for uniqueness/clarity
  const pagePath = page.path || new URL(page.url).pathname;
  const pathSuffix = pagePath && pagePath !== '/' ? ` (${pagePath})` : '';

  return {
    workflowName: `${capitalize(formName)} Form${pathSuffix}`,
    description: `Fill and submit the ${formName} form on ${page.pageData.title} to verify it works without errors`,
    steps,
    priority,
    estimatedDuration: 10 + fillableFields.length * 2,
    source: 'auto-discovered',
  };
}

function buildButtonWorkflow(page: SitemapNode, button: InteractiveElement): WorkflowPlan | null {
  const text = button.text.trim();
  if (!text) return null;

  const steps: WorkflowStep[] = [
    {
      action: 'navigate',
      selector: page.url,
      value: undefined,
      expectedResult: `Page "${page.pageData.title}" loads successfully`,
      confidence: 1.0,
    },
    {
      action: 'click',
      selector: button.selector,
      value: undefined,
      expectedResult: `Button "${text}" responds to click without errors`,
      confidence: 0.7,
    },
    {
      action: 'expect',
      selector: 'body',
      value: undefined,
      expectedResult: 'Page does not show error state after button click',
      confidence: 0.7,
    },
  ];

  return {
    workflowName: `Click "${text}" Button`,
    description: `Click the "${text}" button on ${page.pageData.title} and verify no errors occur`,
    steps,
    priority: 'nice-to-have',
    estimatedDuration: 8,
    source: 'auto-discovered',
  };
}

function buildNavigationWorkflow(pages: SitemapNode[]): WorkflowPlan | null {
  // Pick up to 5 unique internal pages (prefer shallow depth)
  const navTargets = pages
    .filter(p => p.depth <= 2)
    .slice(0, 5);

  if (navTargets.length === 0) return null;

  const steps: WorkflowStep[] = navTargets.map(page => ({
    action: 'navigate' as const,
    selector: page.url,
    value: undefined,
    expectedResult: `"${page.pageData.title}" loads without errors`,
    confidence: 1.0,
  }));

  return {
    workflowName: 'Core Page Navigation',
    description: `Navigate to ${navTargets.length} key pages and verify they load without errors`,
    steps,
    priority: 'important',
    estimatedDuration: navTargets.length * 5,
    source: 'auto-discovered',
  };
}

// ---------------- Helpers -----------------------------------------

/** Recursively collect all pages from sitemap tree, sorted by importance */
function collectAllPages(node: SitemapNode): SitemapNode[] {
  const pages: SitemapNode[] = [node];
  for (const child of node.children) {
    pages.push(...collectAllPages(child));
  }
  // Sort: pages with forms first, then by number of interactive elements, then by depth
  pages.sort((a, b) => {
    const aScore = a.pageData.forms.length * 10 + a.pageData.buttons.length * 2;
    const bScore = b.pageData.forms.length * 10 + b.pageData.buttons.length * 2;
    if (aScore !== bScore) return bScore - aScore;
    return a.depth - b.depth;
  });
  return pages;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function escapeCssAttributeValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function escapeStepString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function isFillActionableField(field: FormField): boolean {
  const type = (field.type || 'text').toLowerCase();

  if (!field.name && !normalizeWhitespace(field.label || '')) {
    return false;
  }

  if (field.disabled || field.readOnly || field.hidden) {
    return false;
  }

  return !NON_ACTIONABLE_FILL_TYPES.has(type);
}

/** Build a Playwright selector for a form field */
function fieldSelector(form: FormInfo, field: FormField): string {
  if (field.name) {
    return `${form.selector} [name="${escapeCssAttributeValue(field.name)}"]`;
  }

  const label = normalizeWhitespace(field.label);
  if (label) {
    return `getByLabel('${escapeStepString(label)}')`;
  }

  const type = (field.type || 'text').toLowerCase();
  if (type === 'textarea') {
    return `${form.selector} textarea`;
  }
  if (type === 'select' || type === 'select-one') {
    return `${form.selector} select`;
  }

  return `${form.selector} input[type="${escapeCssAttributeValue(type)}"]`;
}

/** Generate synthetic test data based on field type */
function syntheticValue(type: string, name: string, label: string): string {
  const normalizedType = (type || '').toLowerCase();
  const hint = `${normalizedType} ${name} ${label}`.toLowerCase();

  if (normalizedType === 'checkbox' || normalizedType === 'radio') return 'true';
  if (hint.includes('email')) return 'test@example.com';
  if (hint.includes('password') || hint.includes('pass')) return 'TestPass123!';
  if (hint.includes('phone') || hint.includes('tel')) return '555-0100';
  if (hint.includes('url') || hint.includes('website')) return 'https://example.com';
  if (hint.includes('zip') || hint.includes('postal')) return '90210';
  if (hint.includes('name') && hint.includes('first')) return 'Test';
  if (hint.includes('name') && hint.includes('last')) return 'User';
  if (hint.includes('name')) return 'Test User';
  if (hint.includes('search') || hint.includes('query') || hint.includes('q')) return 'test search query';
  if (hint.includes('message') || hint.includes('comment') || hint.includes('textarea')) return 'This is a test message from Afterburn.';
  if (normalizedType === 'number') return '42';
  if (normalizedType === 'date') return '2025-01-15';

  return 'test input';
}

/** Classify a form by its fields, action URL, and page URL */
function classifyForm(form: FormInfo, pageUrl?: string): string {
  const fieldHints = form.fields.map(f => `${f.type} ${f.name} ${f.label}`.toLowerCase()).join(' ');
  const action = (form.action || '').toLowerCase();
  const pagePath = (pageUrl || '').toLowerCase();

  // Signup indicators in field names (firstName, lastName, username, name alongside password)
  const hasSignupFields = /\b(first.?name|last.?name|username|user.?name|full.?name)\b/.test(fieldHints);
  // Signup indicators in form action or page URL
  const hasSignupUrl = /sign.?up|register|signup|create.?account|join/.test(action)
    || /sign.?up|register|signup|create.?account|join/.test(pagePath);
  // Login indicators in form action or page URL — takes priority over signup heuristics
  const hasLoginUrl = /\b(sign.?in|signin|log.?in|login)\b/.test(action)
    || /\/(sign.?in|signin|log.?in|login)\b/.test(pagePath);

  if (fieldHints.includes('password') && fieldHints.includes('email')) {
    // Explicit login URL takes priority over ambiguous signup signals
    if (hasLoginUrl && !hasSignupUrl) return 'login';
    if (fieldHints.includes('confirm') || fieldHints.includes('register') || hasSignupFields || hasSignupUrl) {
      return 'signup';
    }
    return 'login';
  }
  if (action.includes('search') || fieldHints.includes('search') || fieldHints.includes('query')) return 'search';
  if (action.includes('contact') || fieldHints.includes('message') || fieldHints.includes('subject')) return 'contact';
  if (action.includes('subscribe') || fieldHints.includes('newsletter')) return 'subscribe';
  if (fieldHints.includes('password')) {
    // Explicit login URL takes priority
    if (hasLoginUrl && !hasSignupUrl) return 'login';
    // Even without email, check if this is a signup form by URL or fields
    if (hasSignupFields || hasSignupUrl) return 'signup';
    return 'login';
  }

  return 'general';
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
