// Workflow step action handlers: fill, click, navigate, select, wait, expect with error recovery

import type { Page } from 'playwright-core';
import type { StepResult, DeadButtonResult, BrokenFormResult } from '../types/execution.js';
import type { WorkflowStep, FormInfo, FormField } from '../types/discovery.js';
import { getTestValueForField } from './test-data.js';
import { validateUrl, validateNavigationUrl, validateSelector, sanitizeValue } from '../core/validation.js';

// Step execution timeouts
const STEP_TIMEOUT = 10_000;
const NAV_TIMEOUT = 30_000;
export const DEAD_BUTTON_WAIT = 500;
const ANSI_ESCAPE_PATTERN = /\u001B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;
const RAW_ANSI_STYLE_PATTERN = /\[(?:\d{1,3};?)+m/g;
const NON_ACTIONABLE_FILL_TYPES = new Set([
  'hidden',
  'file',
  'color',
  'range',
  'submit',
  'button',
  'reset',
  'image',
]);

class StepSkippedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StepSkippedError';
  }
}

function sanitizeErrorMessage(message: string): string {
  return message
    .replace(ANSI_ESCAPE_PATTERN, '')
    .replace(RAW_ANSI_STYLE_PATTERN, '')
    .trim();
}

function toErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return sanitizeErrorMessage(message);
}

function isNonActionableFillField(field: { type: string; disabled?: boolean; readOnly?: boolean; hidden?: boolean }): boolean {
  const normalizedType = (field.type || '').toLowerCase();
  return Boolean(field.disabled || field.readOnly || field.hidden || NON_ACTIONABLE_FILL_TYPES.has(normalizedType));
}

function shouldUncheckCheckbox(value?: string): boolean {
  if (value === undefined) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return (
    normalized === '' ||
    normalized === '0' ||
    normalized === 'false' ||
    normalized === 'off' ||
    normalized === 'no' ||
    normalized === 'unchecked'
  );
}

interface StepFillFieldInfo {
  type: string;
  name: string;
  label: string;
  required: boolean;
  placeholder: string;
  disabled?: boolean;
  readOnly?: boolean;
  hidden?: boolean;
}

function inferFieldFromSelector(selector: string): StepFillFieldInfo | null {
  const nameMatch = selector.match(/\[name\s*=\s*['\"]?([^'\"\]]+)['\"]?\]/i);
  const idMatch = selector.match(/#([A-Za-z_][A-Za-z0-9_:-]*)/);
  const fieldName = nameMatch?.[1] || idMatch?.[1] || '';

  if (!fieldName) {
    return null;
  }

  const lowerSelector = selector.toLowerCase();
  let type = 'text';

  if (lowerSelector.includes('select')) {
    type = 'select';
  } else if (lowerSelector.includes('textarea')) {
    type = 'textarea';
  } else if (lowerSelector.includes('checkbox')) {
    type = 'checkbox';
  } else if (lowerSelector.includes('radio')) {
    type = 'radio';
  } else if (lowerSelector.includes('password')) {
    type = 'password';
  } else if (lowerSelector.includes('email')) {
    type = 'email';
  }

  return {
    type,
    name: fieldName,
    label: fieldName,
    required: false,
    placeholder: '',
  };
}

async function resolveFillTargetSelector(
  page: Page,
  preferredSelector: string,
  fieldName: string
): Promise<string | null> {
  const candidates = [preferredSelector, `[name="${fieldName}"]`, `#${fieldName}`];
  const visited = new Set<string>();

  for (const candidate of candidates) {
    if (!candidate || visited.has(candidate)) {
      continue;
    }
    visited.add(candidate);

    if (await page.locator(candidate).count().then(count => count > 0).catch(() => false)) {
      return candidate;
    }
  }

  return null;
}

async function applyFillValue(
  page: Page,
  selector: string,
  field: StepFillFieldInfo,
  timeout: number,
  value?: string
): Promise<void> {
  if (typeof value !== 'string') {
    return;
  }

  if (field.type === 'checkbox' || field.type === 'radio') {
    if (shouldUncheckCheckbox(value)) {
      await page.uncheck(selector, { timeout });
    } else {
      await page.check(selector, { timeout });
    }
    return;
  }

  if (field.type === 'select' || field.type === 'select-one') {
    try {
      await page.selectOption(selector, value, { timeout });
    } catch {
      // Keep fillField-selected value if explicit option does not exist.
    }
    return;
  }

  await page.fill(selector, value, { timeout });
}

function getSkippedFillReason(field: { type: string; disabled?: boolean; readOnly?: boolean; hidden?: boolean }): string {
  if (field.disabled) return 'Skipping disabled field';
  if (field.readOnly) return 'Skipping readonly field';
  if (field.hidden) return 'Skipping hidden field';
  return `Skipping unsupported fill field type: ${field.type}`;
}

async function tryFillSpecialField(
  page: Page,
  selector: string,
  timeout: number,
  value?: string
): Promise<boolean> {
  const locator = page.locator(selector).first();
  const maybeLocator = locator as {
    count?: () => Promise<number>;
    evaluate?: <T>(fn: (element: Element) => T) => Promise<T>;
  };

  if (typeof maybeLocator.count !== 'function' || typeof maybeLocator.evaluate !== 'function') {
    return false;
  }

  let count = 0;
  try {
    count = await maybeLocator.count();
  } catch {
    count = 0;
  }

  if (count === 0) {
    const inferredField = inferFieldFromSelector(selector);
    if (!inferredField) {
      return false;
    }

    if (isNonActionableFillField(inferredField)) {
      throw new StepSkippedError(getSkippedFillReason(inferredField));
    }

    const inferredResult = await fillField(page, inferredField, timeout);
    if (inferredResult.skipped) {
      throw new StepSkippedError(sanitizeErrorMessage(inferredResult.reason || 'Skipping unresolved field'));
    }

    const inferredSelector = await resolveFillTargetSelector(page, selector, inferredField.name);
    if (inferredSelector) {
      await applyFillValue(page, inferredSelector, inferredField, timeout, value);
      return true;
    }

    throw new StepSkippedError('Skipping unresolved field selector');
  }

  const field = await maybeLocator.evaluate((element): StepFillFieldInfo => {
    const formElement = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    const tagName = formElement.tagName.toLowerCase();
    const type = tagName === 'select'
      ? 'select'
      : tagName === 'textarea'
        ? 'textarea'
        : ((formElement as HTMLInputElement).type || 'text').toLowerCase();
    const placeholder = formElement.getAttribute('placeholder') || '';
    const hiddenAttr = formElement.hasAttribute('hidden');
    const ariaHidden = (formElement.getAttribute('aria-hidden') || '').toLowerCase() === 'true';

    return {
      type,
      name: formElement.name || formElement.id || '',
      label:
        (formElement.labels && formElement.labels.length > 0
          ? formElement.labels[0]?.textContent
          : null) ||
        formElement.getAttribute('aria-label') ||
        placeholder ||
        formElement.name ||
        formElement.id ||
        '',
      required: formElement.required || false,
      placeholder,
      disabled: formElement.hasAttribute('disabled') || (formElement as HTMLInputElement).disabled || false,
      readOnly: (formElement as HTMLInputElement).readOnly || false,
      hidden: type === 'hidden' || hiddenAttr || ariaHidden,
    };
  });

  if (isNonActionableFillField(field)) {
    throw new StepSkippedError(getSkippedFillReason(field));
  }

  const isSpecialFill =
    field.type === 'select' ||
    field.type === 'select-one' ||
    field.type === 'checkbox' ||
    field.type === 'radio';

  if (!isSpecialFill) {
    return false;
  }

  if (!field.name) {
    if (field.type === 'checkbox' || field.type === 'radio') {
      if (shouldUncheckCheckbox(value)) {
        await page.uncheck(selector, { timeout });
      } else {
        await page.check(selector, { timeout });
      }
    } else {
      await page.selectOption(selector, value || '', { timeout });
    }
    return true;
  }

  const result = await fillField(page, field, timeout);
  if (result.skipped) {
    throw new StepSkippedError(sanitizeErrorMessage(result.reason || `Could not fill field: ${selector}`));
  }

  const fillSelector = (await resolveFillTargetSelector(page, selector, field.name)) || selector;
  await applyFillValue(page, fillSelector, field, timeout, value);

  return true;
}
/**
 * Convert legacy LLM selector strings into Playwright selector engines.
 * Supports getByRole/getByLabel/getByText compatibility for older plans.
 */
export function normalizeStepSelector(selector: string): string {
  const trimmed = selector.trim();

  const roleMatch = trimmed.match(
    /^(?:page\.)?getByRole\(\s*['"]([^'"]+)['"]\s*(?:,\s*\{\s*name\s*:\s*['"]([^'"]+)['"]\s*\})?\s*\)$/
  );
  if (roleMatch) {
    const role = roleMatch[1];
    const name = roleMatch[2]?.replace(/"/g, '\\"');
    return name ? `role=${role}[name="${name}"]` : `role=${role}`;
  }

  const labelMatch = trimmed.match(/^(?:page\.)?getByLabel\(\s*['"]([^'"]+)['"]\s*\)$/);
  if (labelMatch) {
    const label = labelMatch[1].replace(/"/g, '\\"');
    return `label=${label}`;
  }

  const textMatch = trimmed.match(/^(?:page\.)?getByText\(\s*['"]([^'"]+)['"]\s*\)$/);
  if (textMatch) {
    const text = textMatch[1].replace(/"/g, '\\"');
    return `text=${text}`;
  }

  return selector;
}

/**
 * Main dispatcher - executes a workflow step and returns structured result
 */
export async function executeStep(
  page: Page,
  step: WorkflowStep,
  stepIndex: number,
  baseUrl?: string
): Promise<StepResult> {
  const startTime = Date.now();
  const normalizedSelector = normalizeStepSelector(step.selector);

  try {
    // Dismiss any modals that might interfere
    await dismissModalIfPresent(page);

    // Security: validate selector length to prevent injection via oversized strings
    validateSelector(normalizedSelector);

    // Security: sanitize value to strip script injections from AI-generated content
    const safeValue = step.value ? sanitizeValue(step.value) : undefined;

    switch (step.action) {
      case 'navigate':
        // Security: validate navigation targets; enforce same-origin when baseUrl is known
        const targetInput = safeValue || normalizedSelector;
        const targetUrl = baseUrl ? new URL(targetInput, baseUrl).href : targetInput;
        if (baseUrl) {
          validateNavigationUrl(targetUrl, baseUrl);
        } else {
          validateUrl(targetUrl);
        }
        const baseOrigin = baseUrl ? new URL(baseUrl).origin : null;

        await page.goto(targetUrl, {
          waitUntil: 'domcontentloaded',
          timeout: NAV_TIMEOUT,
        });

        // Verify we stayed on the same origin
        const afterOrigin = new URL(page.url()).origin;
        if (baseOrigin && afterOrigin !== baseOrigin) {
          throw new Error(`Navigation blocked: left origin ${baseOrigin} to ${afterOrigin}`);
        }
        break;

      case 'click':
        await page.click(normalizedSelector, { timeout: STEP_TIMEOUT });
        break;

      case 'fill':
        if (!(await tryFillSpecialField(page, normalizedSelector, STEP_TIMEOUT, safeValue))) {
          await page.fill(normalizedSelector, safeValue || '', { timeout: STEP_TIMEOUT });
        }
        break;

      case 'select':
        await page.selectOption(normalizedSelector, safeValue || '', { timeout: STEP_TIMEOUT });
        break;

      case 'wait':
        await page.waitForSelector(normalizedSelector, { timeout: STEP_TIMEOUT });
        break;

      case 'expect':
        // Verify element is visible
        const isVisible = await page.isVisible(normalizedSelector);
        if (!isVisible) {
          throw new Error(`Expected element not found: ${normalizedSelector}`);
        }
        break;

      default:
        throw new Error(`Unknown action: ${step.action}`);
    }

    return {
      stepIndex,
      action: step.action,
      selector: step.selector,
      status: 'passed',
      duration: Date.now() - startTime,
    };
  } catch (error) {
    if (error instanceof StepSkippedError) {
      return {
        stepIndex,
        action: step.action,
        selector: step.selector,
        status: 'skipped',
        duration: Date.now() - startTime,
        error: toErrorMessage(error),
      };
    }

    return {
      stepIndex,
      action: step.action,
      selector: step.selector,
      status: 'failed',
      duration: Date.now() - startTime,
      error: toErrorMessage(error),
    };
  }
}

/**
 * Fill an individual form field with test data
 * Returns { skipped: boolean, reason?: string }
 */
async function fillField(
  page: Page,
  field: FormField,
  timeout: number
): Promise<{ skipped: boolean; reason?: string }> {
  const testValue = getTestValueForField(field.name, field.type);

  // Skip unrecognized fields
  if (testValue === null) {
    return { skipped: true, reason: `No test data for type: ${field.type}` };
  }

  try {
    // Build selector - try by name first, fall back to id
    let selector = field.name.startsWith('#') ? field.name : `[name="${field.name}"]`;

    // Check if field exists and is visible
    let exists = await page.locator(selector).count();
    if (exists === 0) {
      // Fallback: try by id
      selector = `#${field.name}`;
      exists = await page.locator(selector).count();
    }
    if (exists === 0) {
      return { skipped: true, reason: 'Field not found' };
    }

    // Handle different field types
    if (field.type === 'checkbox' || field.type === 'radio') {
      await page.check(selector, { timeout });
    } else if (field.type === 'select' || field.type === 'select-one') {
      // Try the test value first; if no matching option exists, pick the first non-empty option
      try {
        await page.selectOption(selector, testValue, { timeout });
      } catch {
        const firstOption = await page.evaluate((sel: string) => {
          const select = document.querySelector(sel) as HTMLSelectElement;
          if (!select) return null;
          const option = Array.from(select.options).find(o => o.value && o.value !== '');
          return option?.value ?? null;
        }, selector);
        if (firstOption) {
          await page.selectOption(selector, firstOption, { timeout });
        }
      }
    } else if (field.type === 'textarea') {
      await page.fill(selector, testValue, { timeout });
    } else {
      // text, email, password, tel, date, etc.
      await page.fill(selector, testValue, { timeout });
    }

    return { skipped: false };
  } catch (error) {
    return {
      skipped: true,
      reason: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Fill all fields in a form with test data
 */
export async function fillFormFields(
  page: Page,
  form: FormInfo
): Promise<{ filled: number; skipped: Array<{ selector: string; reason: string }> }> {
  let filled = 0;
  const skipped: Array<{ selector: string; reason: string }> = [];

  for (const field of form.fields) {
    const result = await fillField(page, field, STEP_TIMEOUT);
    if (result.skipped) {
      skipped.push({
        selector: `[name="${field.name}"]`,
        reason: result.reason || 'Unknown',
      });
    } else {
      filled++;
    }
  }

  return { filled, skipped };
}

/**
 * Snapshot of page state used for dead-button comparison (no re-click needed)
 */
export interface ClickStateSnapshot {
  url: string;
  domSize: number;
  hadNetworkActivity: boolean;
}

/**
 * Capture current page state for dead-button comparison
 */
export async function captureClickState(page: Page): Promise<ClickStateSnapshot> {
  return {
    url: page.url(),
    domSize: await page.evaluate(() => document.body.innerHTML.length),
    hadNetworkActivity: false, // Caller sets this via network listener
  };
}

/**
 * Compare pre/post click state to detect dead buttons (no re-click)
 */
export function checkDeadButton(
  selector: string,
  before: ClickStateSnapshot,
  after: ClickStateSnapshot
): DeadButtonResult {
  const urlChanged = before.url !== after.url;
  const domChanged = Math.abs(after.domSize - before.domSize) > 100;
  const hasNetwork = after.hadNetworkActivity;

  if (!urlChanged && !domChanged && !hasNetwork) {
    return { isDead: true, selector, reason: 'No URL change, DOM change, or network activity detected' };
  }
  return { isDead: false, selector };
}

/**
 * Detect broken forms by checking if submit has any effect
 */
export async function detectBrokenForm(
  page: Page,
  formSelector: string
): Promise<BrokenFormResult> {
  try {
    // Find the form
    const formExists = await page.locator(formSelector).count();
    if (formExists === 0) {
      return {
        isBroken: false,
        formSelector,
        reason: 'Form not found',
        filledFields: 0,
        skippedFields: 0,
      };
    }

    // Extract form info
    const formData = await page.evaluate((selector) => {
      const form = document.querySelector(selector) as HTMLFormElement;
      if (!form) return null;

      const fields: FormField[] = [];
      const inputs = form.querySelectorAll('input, select, textarea');
      inputs.forEach((input: any) => {
        const fieldName = input.name || input.id;
        if (fieldName && input.type !== 'submit' && input.type !== 'button') {
          fields.push({
            type: input.type || 'text',
            name: fieldName,
            label: input.placeholder || input.name || input.id || '',
            required: input.required || false,
            placeholder: input.placeholder || '',
          });
        }
      });

      return {
        action: form.action,
        method: form.method || 'GET',
        selector,
        fields,
      };
    }, formSelector);

    if (!formData) {
      return {
        isBroken: false,
        formSelector,
        reason: 'Could not extract form data',
        filledFields: 0,
        skippedFields: 0,
      };
    }

    // Fill form fields
    const fillResult = await fillFormFields(page, formData);

    // Capture pre-submit state
    const urlBefore = page.url();
    let networkActivity = false;
    const networkListener = () => { networkActivity = true; };
    page.on('request', networkListener);

    // Submit form
    const submitButton = await page.locator(
      `${formSelector} button[type="submit"], ${formSelector} input[type="submit"], ${formSelector} button[type="button"], ${formSelector} button:not([type])`
    ).first();
    if (await submitButton.count() > 0) {
      await submitButton.click({ timeout: STEP_TIMEOUT });
    } else {
      // Try form.submit() as fallback
      await page.evaluate((selector) => {
        const form = document.querySelector(selector) as HTMLFormElement;
        if (form) form.submit();
      }, formSelector);
    }

    // Wait for any effects
    await page.waitForTimeout(DEAD_BUTTON_WAIT);

    // Capture post-submit state
    const urlAfter = page.url();

    // Clean up listener
    page.off('request', networkListener);

    // Check if anything happened
    const hasNavigation = urlBefore !== urlAfter;
    const hasNetworkActivity = networkActivity;

    if (!hasNavigation && !hasNetworkActivity) {
      return {
        isBroken: true,
        formSelector,
        reason: 'Form submission caused no navigation or network request',
        filledFields: fillResult.filled,
        skippedFields: fillResult.skipped.length,
      };
    }

    return {
      isBroken: false,
      formSelector,
      filledFields: fillResult.filled,
      skippedFields: fillResult.skipped.length,
    };
  } catch (error) {
    return {
      isBroken: false,
      formSelector,
      reason: `Detection failed: ${toErrorMessage(error)}`,
      filledFields: 0,
      skippedFields: 0,
    };
  }
}

/**
 * Dismiss modals/popups that might block interaction
 * Tries multiple strategies: close button, Escape key, native dialog dismissal
 */
export async function dismissModalIfPresent(page: Page): Promise<void> {
  try {
    // Note: Native dialog handling (alert/confirm/prompt) is done by a single persistent
    // handler registered in workflow-executor.ts — NOT here. Registering per-step handlers
    // caused stacked handlers to crash when multiple tried to dismiss the same dialog.

    // Try to find and click common modal close buttons
    const closeSelectors = [
      '[aria-label*="close" i]',
      '[aria-label*="dismiss" i]',
      'button.close',
      'button.modal-close',
      '.modal-close-button',
      '[data-dismiss="modal"]',
    ];

    for (const selector of closeSelectors) {
      const closeButton = page.locator(selector).first();
      if (await closeButton.isVisible({ timeout: 500 }).catch(() => false)) {
        await closeButton.click({ timeout: 1000 });
        return;
      }
    }

    // Fallback: press Escape
    await page.keyboard.press('Escape');
  } catch {
    // Fail silently - modal dismissal is best-effort
  }
}







