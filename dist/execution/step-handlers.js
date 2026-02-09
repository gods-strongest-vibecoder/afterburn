// Workflow step action handlers: fill, click, navigate, select, wait, expect with error recovery
import { getTestValueForField } from './test-data.js';
import { validateUrl, validateNavigationUrl, validateSelector, sanitizeValue } from '../core/validation.js';
// Step execution timeouts
const STEP_TIMEOUT = 10_000;
const NAV_TIMEOUT = 30_000;
const DEAD_BUTTON_WAIT = 1000;
/**
 * Main dispatcher - executes a workflow step and returns structured result
 */
export async function executeStep(page, step, stepIndex, baseUrl) {
    const startTime = Date.now();
    try {
        // Dismiss any modals that might interfere
        await dismissModalIfPresent(page);
        // Security: validate selector length to prevent injection via oversized strings
        validateSelector(step.selector);
        // Security: sanitize value to strip script injections from AI-generated content
        const safeValue = step.value ? sanitizeValue(step.value) : undefined;
        switch (step.action) {
            case 'navigate':
                // Security: validate navigation targets; enforce same-origin when baseUrl is known
                if (baseUrl) {
                    validateNavigationUrl(safeValue || step.selector, baseUrl);
                }
                else {
                    validateUrl(safeValue || step.selector);
                }
                await page.goto(safeValue || step.selector, {
                    waitUntil: 'domcontentloaded',
                    timeout: NAV_TIMEOUT,
                });
                break;
            case 'click':
                await page.click(step.selector, { timeout: STEP_TIMEOUT });
                break;
            case 'fill':
                await page.fill(step.selector, safeValue || '', { timeout: STEP_TIMEOUT });
                break;
            case 'select':
                await page.selectOption(step.selector, safeValue || '', { timeout: STEP_TIMEOUT });
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
    }
    catch (error) {
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
async function fillField(page, field, timeout) {
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
        }
        else if (field.type === 'select' || field.type === 'select-one') {
            await page.selectOption(selector, testValue, { timeout });
        }
        else {
            // text, email, password, tel, date, etc.
            await page.fill(selector, testValue, { timeout });
        }
        return { skipped: false };
    }
    catch (error) {
        return {
            skipped: true,
            reason: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
/**
 * Fill all fields in a form with test data
 */
export async function fillFormFields(page, form) {
    let filled = 0;
    const skipped = [];
    for (const field of form.fields) {
        const result = await fillField(page, field, STEP_TIMEOUT);
        if (result.skipped) {
            skipped.push({
                selector: `[name="${field.name}"]`,
                reason: result.reason || 'Unknown',
            });
        }
        else {
            filled++;
        }
    }
    return { filled, skipped };
}
/**
 * Capture current page state for dead-button comparison
 */
export async function captureClickState(page) {
    return {
        url: page.url(),
        domSize: await page.evaluate(() => document.body.innerHTML.length),
        hadNetworkActivity: false, // Caller sets this via network listener
    };
}
/**
 * Compare pre/post click state to detect dead buttons (no re-click)
 */
export function checkDeadButton(selector, before, after) {
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
export async function detectBrokenForm(page, formSelector) {
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
            const form = document.querySelector(selector);
            if (!form)
                return null;
            const fields = [];
            const inputs = form.querySelectorAll('input, select, textarea');
            inputs.forEach((input) => {
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
        const submitButton = await page.locator(`${formSelector} button[type="submit"], ${formSelector} input[type="submit"], ${formSelector} button[type="button"], ${formSelector} button:not([type])`).first();
        if (await submitButton.count() > 0) {
            await submitButton.click({ timeout: STEP_TIMEOUT });
        }
        else {
            // Try form.submit() as fallback
            await page.evaluate((selector) => {
                const form = document.querySelector(selector);
                if (form)
                    form.submit();
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
    }
    catch (error) {
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
export async function dismissModalIfPresent(page) {
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
    }
    catch {
        // Fail silently - modal dismissal is best-effort
    }
}
//# sourceMappingURL=step-handlers.js.map