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

function makeSitemap(fields: FormField[]): SitemapNode {
  return {
    url: 'https://example.com/form',
    title: 'Form Page',
    path: '/form',
    depth: 0,
    children: [],
    pageData: {
      url: 'https://example.com/form',
      title: 'Form Page',
      forms: [
        {
          action: 'https://example.com/form',
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
