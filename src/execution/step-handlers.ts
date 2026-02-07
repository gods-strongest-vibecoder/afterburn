// Workflow step action handlers: fill, click, navigate, select, wait, expect with error recovery

import type { Page } from 'playwright-core';
import type { StepResult, DeadButtonResult, BrokenFormResult } from '../types/execution.js';
import type { WorkflowStep, FormInfo, FormField } from '../types/discovery.js';
import { getTestValueForField } from './test-data.js';

// Step execution timeouts
const STEP_TIMEOUT = 10_000;
const NAV_TIMEOUT = 30_000;
const DEAD_BUTTON_WAIT = 1000;

/**
 * Main dispatcher - executes a workflow step and returns structured result
 */
export async function executeStep(
  page: Page,
  step: WorkflowStep,
  stepIndex: number
): Promise<StepResult> {
  const startTime = Date.now();

  try {
    // Dismiss any modals that might interfere
    await dismissModalIfPresent(page);

    switch (step.action) {
      case 'navigate':
        await page.goto(step.value || step.selector, {
          waitUntil: 'domcontentloaded',
          timeout: NAV_TIMEOUT,
        });
        break;

      case 'click':
        await page.click(step.selector, { timeout: STEP_TIMEOUT });
        break;

      case 'fill':
        await page.fill(step.selector, step.value || '', { timeout: STEP_TIMEOUT });
        break;

      case 'select':
        await page.selectOption(step.selector, step.value || '', { timeout: STEP_TIMEOUT });
        break;

      case 'wait':
        await page.waitForSelector(step.selector, { timeout: STEP_TIMEOUT });
        break;

      case 'expect':
        // Verify element is visible
        const isVisible = await page.isVisible(step.selector);
        if (!isVisible) {
          throw new Error(`Expected element not found: ${step.selector}`);
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
    return {
      stepIndex,
      action: step.action,
      selector: step.selector,
      status: 'failed',
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
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
    // Build selector - try by name first, fall back to label
    const selector = `[name="${field.name}"]`;

    // Check if field exists and is visible
    const exists = await page.locator(selector).count();
    if (exists === 0) {
      return { skipped: true, reason: 'Field not found' };
    }

    // Handle different field types
    if (field.type === 'checkbox' || field.type === 'radio') {
      await page.check(selector, { timeout });
    } else if (field.type === 'select' || field.type === 'select-one') {
      await page.selectOption(selector, testValue, { timeout });
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
 * Detect dead buttons using 3-way state comparison
 * Checks: URL, DOM structure, network activity
 */
export async function detectDeadButton(
  page: Page,
  selector: string
): Promise<DeadButtonResult> {
  try {
    // Capture pre-click state
    const urlBefore = page.url();
    const domBefore = await page.evaluate(() => document.body.innerHTML.length);

    // Set up network activity listener
    let networkActivity = false;
    const networkListener = () => { networkActivity = true; };
    page.on('request', networkListener);

    // Click and wait for any effects
    await page.click(selector, { timeout: STEP_TIMEOUT });
    await page.waitForTimeout(DEAD_BUTTON_WAIT);

    // Capture post-click state
    const urlAfter = page.url();
    const domAfter = await page.evaluate(() => document.body.innerHTML.length);

    // Clean up listener
    page.off('request', networkListener);

    // Check if anything changed
    const urlChanged = urlBefore !== urlAfter;
    const domChanged = Math.abs(domAfter - domBefore) > 100; // Allow small DOM mutations
    const hasNetworkActivity = networkActivity;

    if (!urlChanged && !domChanged && !hasNetworkActivity) {
      return {
        isDead: true,
        selector,
        reason: 'No URL change, DOM change, or network activity detected',
      };
    }

    return {
      isDead: false,
      selector,
    };
  } catch (error) {
    return {
      isDead: false,
      selector,
      reason: `Detection failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
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
        if (input.name && input.type !== 'submit' && input.type !== 'button') {
          fields.push({
            type: input.type || 'text',
            name: input.name,
            label: input.placeholder || input.name,
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
    const submitButton = await page.locator(`${formSelector} button[type="submit"], ${formSelector} input[type="submit"]`).first();
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
      reason: `Detection failed: ${error instanceof Error ? error.message : String(error)}`,
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
    // Handle native dialogs (alert, confirm, prompt)
    page.once('dialog', async (dialog) => {
      await dialog.dismiss();
    });

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
