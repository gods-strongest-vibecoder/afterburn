import { describe, it, expect } from 'vitest';
import { generateHeuristicPlans } from '../../src/planning/heuristic-planner.js';
import type { SitemapNode, FormField } from '../../src/types/discovery.js';

function makeField(field: Partial<FormField> & Pick<FormField, 'type' | 'name' | 'label'>): FormField {
  return {
    required: false,
    placeholder: '',
    ...field,
  };
}

function makeSitemap(fields: FormField[], options?: { url?: string; path?: string }): SitemapNode {
  const url = options?.url ?? 'https://example.com/form';
  const path = options?.path ?? '/form';
  return {
    url,
    title: 'Form Page',
    path,
    depth: 0,
    children: [],
    pageData: {
      url,
      title: 'Form Page',
      forms: [
        {
          action: url,
          method: 'POST',
          selector: 'form:nth-of-type(1)',
          fields,
        },
      ],
      buttons: [],
      links: [],
      menus: [],
      otherInteractive: [],
      crawledAt: new Date().toISOString(),
    },
  };
}

describe('heuristic planner form-step safety', () => {
  it('skips non-actionable fields and keeps actionable fill targets', () => {
    const sitemap = makeSitemap([
      makeField({ type: 'select', name: 'my-select', label: 'Dropdown (select)\nOpen this select menu' }),
      makeField({ type: 'checkbox', name: 'my-check', label: 'Default checkbox' }),
      makeField({ type: 'textarea', name: 'my-textarea', label: 'Textarea' }),
      makeField({ type: 'file', name: 'my-file', label: 'File input' }),
      makeField({ type: 'color', name: 'my-colors', label: 'Color picker' }),
      makeField({ type: 'range', name: 'my-range', label: 'Range' }),
      makeField({ type: 'hidden', name: 'my-hidden', label: 'Hidden' }),
      makeField({ type: 'text', name: 'my-disabled', label: 'Disabled input', disabled: true }),
      makeField({ type: 'text', name: 'my-readonly', label: 'Readonly input', readOnly: true }),
      makeField({ type: 'text', name: 'my-aria-hidden', label: 'Aria Hidden', hidden: true }),
    ]);

    const plans = generateHeuristicPlans(sitemap);
    const formPlan = plans.find((plan) => plan.workflowName.includes('Form'));

    expect(formPlan).toBeDefined();

    const fillSteps = (formPlan?.steps || []).filter((step) => step.action === 'fill');
    const selectors = fillSteps.map((step) => step.selector);

    expect(selectors).toContain('form:nth-of-type(1) [name="my-select"]');
    expect(selectors).toContain('form:nth-of-type(1) [name="my-check"]');
    expect(selectors).toContain('form:nth-of-type(1) [name="my-textarea"]');

    expect(selectors.some((selector) => selector.includes('my-file'))).toBe(false);
    expect(selectors.some((selector) => selector.includes('my-colors'))).toBe(false);
    expect(selectors.some((selector) => selector.includes('my-range'))).toBe(false);
    expect(selectors.some((selector) => selector.includes('my-hidden'))).toBe(false);
    expect(selectors.some((selector) => selector.includes('my-disabled'))).toBe(false);
    expect(selectors.some((selector) => selector.includes('my-readonly'))).toBe(false);
    expect(selectors.some((selector) => selector.includes('my-aria-hidden'))).toBe(false);

    const submitStep = formPlan?.steps.find((step) => step.action === 'click');
    expect(submitStep?.selector).toBe(
      'form:nth-of-type(1) button[type="submit"], form:nth-of-type(1) input[type="submit"], form:nth-of-type(1) button:not([type])'
    );
  });

  it('uses normalized getByLabel selectors when a field has no name', () => {
    const sitemap = makeSitemap([
      makeField({
        type: 'text',
        name: '',
        label: 'Billing\nAddress \'Line 1\'',
      }),
    ]);

    const plans = generateHeuristicPlans(sitemap);
    const formPlan = plans.find((plan) => plan.workflowName.includes('Form'));
    const fillStep = formPlan?.steps.find((step) => step.action === 'fill');

    expect(fillStep?.selector).toBe("getByLabel('Billing Address \\\'Line 1\\\'')");
    expect(fillStep?.selector.includes('\n')).toBe(false);
    expect(fillStep?.selector.includes('[aria-label=')).toBe(false);
  });
});

describe('signup detection and deduplication', () => {
  it('detects signup by field names (firstName, lastName, email, password)', () => {
    const sitemap = makeSitemap([
      makeField({ type: 'text', name: 'firstName', label: 'First Name' }),
      makeField({ type: 'text', name: 'lastName', label: 'Last Name' }),
      makeField({ type: 'email', name: 'email', label: 'Email' }),
      makeField({ type: 'password', name: 'password', label: 'Password' }),
    ]);

    const plans = generateHeuristicPlans(sitemap);
    const formPlan = plans.find((plan) => plan.workflowName.includes('Form'));

    expect(formPlan).toBeDefined();
    expect(formPlan!.workflowName).toContain('Signup');
    expect(formPlan!.workflowName).not.toContain('Login');
  });

  it('detects signup by page URL containing sign-up', () => {
    const sitemap = makeSitemap(
      [
        makeField({ type: 'email', name: 'email', label: 'Email' }),
        makeField({ type: 'password', name: 'password', label: 'Password' }),
      ],
      { url: 'https://example.com/sign-up', path: '/sign-up' },
    );

    const plans = generateHeuristicPlans(sitemap);
    const formPlan = plans.find((plan) => plan.workflowName.includes('Form'));

    expect(formPlan).toBeDefined();
    expect(formPlan!.workflowName).toContain('Signup');
    expect(formPlan!.workflowName).not.toContain('Login');
  });

  it('classifies as login when no signup signals are present', () => {
    const sitemap = makeSitemap(
      [
        makeField({ type: 'email', name: 'email', label: 'Email' }),
        makeField({ type: 'password', name: 'password', label: 'Password' }),
      ],
      { url: 'https://example.com/sign-in', path: '/sign-in' },
    );

    const plans = generateHeuristicPlans(sitemap);
    const formPlan = plans.find((plan) => plan.workflowName.includes('Form'));

    expect(formPlan).toBeDefined();
    expect(formPlan!.workflowName).toContain('Login');
    expect(formPlan!.workflowName).not.toContain('Signup');
  });

  it('deduplicates workflows with the same classification across pages', () => {
    // Build a sitemap with two child pages, each having an identical login form
    const loginFields = [
      makeField({ type: 'email', name: 'email', label: 'Email' }),
      makeField({ type: 'password', name: 'password', label: 'Password' }),
    ];

    const childPage1: SitemapNode = {
      url: 'https://example.com/login',
      title: 'Login Page 1',
      path: '/login',
      depth: 1,
      children: [],
      pageData: {
        url: 'https://example.com/login',
        title: 'Login Page 1',
        forms: [
          {
            action: 'https://example.com/login',
            method: 'POST',
            selector: 'form:nth-of-type(1)',
            fields: loginFields,
          },
        ],
        buttons: [],
        links: [],
        menus: [],
        otherInteractive: [],
        crawledAt: new Date().toISOString(),
      },
    };

    const childPage2: SitemapNode = {
      url: 'https://example.com/account/login',
      title: 'Login Page 2',
      path: '/account/login',
      depth: 1,
      children: [],
      pageData: {
        url: 'https://example.com/account/login',
        title: 'Login Page 2',
        forms: [
          {
            action: 'https://example.com/account/login',
            method: 'POST',
            selector: 'form:nth-of-type(1)',
            fields: loginFields,
          },
        ],
        buttons: [],
        links: [],
        menus: [],
        otherInteractive: [],
        crawledAt: new Date().toISOString(),
      },
    };

    // Root page with no forms, two children each with login forms
    const sitemap: SitemapNode = {
      url: 'https://example.com',
      title: 'Home',
      path: '/',
      depth: 0,
      children: [childPage1, childPage2],
      pageData: {
        url: 'https://example.com',
        title: 'Home',
        forms: [],
        buttons: [],
        links: [],
        menus: [],
        otherInteractive: [],
        crawledAt: new Date().toISOString(),
      },
    };

    const plans = generateHeuristicPlans(sitemap);
    const loginPlans = plans.filter((plan) => plan.workflowName.includes('Login'));

    // Dedup: both pages produce "Login Form (/login)" and "Login Form (/account/login)"
    // But the workflow name includes the path, so they are different names.
    // The dedup is on workflowName — let's check we get exactly the workflows we expect.
    // Since paths differ, names differ, so both should appear. Let's verify that.
    // Actually, re-reading the code: workflowName = `${capitalize(formName)} Form${pathSuffix}`
    // So page1 = "Login Form (/login)", page2 = "Login Form (/account/login)" — different names.
    // For true dedup test, both pages need the same path. Let's adjust.
    expect(loginPlans.length).toBe(2); // Different paths = different workflow names
  });

  it('deduplicates workflows with identical workflow names', () => {
    // Both child pages have the same path to force identical workflow names
    const loginFields = [
      makeField({ type: 'email', name: 'email', label: 'Email' }),
      makeField({ type: 'password', name: 'password', label: 'Password' }),
    ];

    const childPage1: SitemapNode = {
      url: 'https://example.com/login',
      title: 'Login Page 1',
      path: '/login',
      depth: 1,
      children: [],
      pageData: {
        url: 'https://example.com/login',
        title: 'Login Page 1',
        forms: [
          {
            action: 'https://example.com/login',
            method: 'POST',
            selector: 'form:nth-of-type(1)',
            fields: loginFields,
          },
        ],
        buttons: [],
        links: [],
        menus: [],
        otherInteractive: [],
        crawledAt: new Date().toISOString(),
      },
    };

    const childPage2: SitemapNode = {
      url: 'https://example.com/login',
      title: 'Login Page 2',
      path: '/login',
      depth: 1,
      children: [],
      pageData: {
        url: 'https://example.com/login',
        title: 'Login Page 2',
        forms: [
          {
            action: 'https://example.com/login',
            method: 'POST',
            selector: 'form:nth-of-type(1)',
            fields: loginFields,
          },
        ],
        buttons: [],
        links: [],
        menus: [],
        otherInteractive: [],
        crawledAt: new Date().toISOString(),
      },
    };

    const sitemap: SitemapNode = {
      url: 'https://example.com',
      title: 'Home',
      path: '/',
      depth: 0,
      children: [childPage1, childPage2],
      pageData: {
        url: 'https://example.com',
        title: 'Home',
        forms: [],
        buttons: [],
        links: [],
        menus: [],
        otherInteractive: [],
        crawledAt: new Date().toISOString(),
      },
    };

    const plans = generateHeuristicPlans(sitemap);
    const loginPlans = plans.filter((plan) => plan.workflowName.includes('Login'));

    // Both pages produce "Login Form (/login)" — dedup should keep only one
    expect(loginPlans.length).toBe(1);
    expect(loginPlans[0].workflowName).toBe('Login Form (/login)');
  });
});
