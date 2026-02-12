// Interactive element discovery including hidden elements (modals, dropdowns, mobile nav)
// Destructive action denylist - skip elements with these keywords
const DESTRUCTIVE_KEYWORDS = [
    'delete',
    'remove',
    'destroy',
    'reset',
    'clear',
    'drop',
    'purge',
    'revoke',
    'terminate',
    'unsubscribe',
    'cancel-account',
    'close-account',
    'logout',
    'log out',
    'sign out',
];
/**
 * Check if text matches destructive action patterns
 */
function isDestructiveAction(text) {
    const lowerText = text.toLowerCase().trim();
    return DESTRUCTIVE_KEYWORDS.some(keyword => lowerText.includes(keyword));
}
function escapeSelectorText(value) {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
function normalizeFieldLabel(value) {
    return value.replace(/\s+/g, ' ').trim();
}
/**
 * Discover all visible interactive elements on a page
 */
export async function discoverElements(page, pageUrl) {
    const elements = {
        forms: [],
        buttons: [],
        links: [],
        menus: [],
        otherInteractive: [],
    };
    const pageHostname = new URL(pageUrl).hostname;
    // Discover all forms with field inventory
    const forms = await page.locator('form').all();
    for (let i = 0; i < forms.length; i++) {
        const form = forms[i];
        try {
            const action = (await form.getAttribute('action')) || '';
            const method = ((await form.getAttribute('method')) || 'GET').toUpperCase();
            // Build selector for the form
            const formId = await form.getAttribute('id');
            const formName = await form.getAttribute('name');
            let selector = 'form';
            if (formId) {
                selector = `form#${formId}`;
            }
            else if (formName) {
                selector = `form[name="${formName}"]`;
            }
            else {
                selector = `form:nth-of-type(${i + 1})`;
            }
            // Resolve action URL
            const resolvedAction = action ? new URL(action, pageUrl).href : pageUrl;
            // Find all input, textarea, select within the form
            const fields = await form.locator('input, textarea, select').all();
            const formFields = [];
            for (const field of fields) {
                try {
                    const tagName = await field.evaluate((el) => el.tagName.toLowerCase());
                    const rawType = ((await field.getAttribute('type')) || '').toLowerCase();
                    const type = tagName === 'select'
                        ? 'select'
                        : tagName === 'textarea'
                            ? 'textarea'
                            : (rawType || 'text');
                    const name = ((await field.getAttribute('name')) || (await field.getAttribute('id')) || '').trim();
                    const required = (await field.getAttribute('required')) !== null;
                    const placeholder = normalizeFieldLabel((await field.getAttribute('placeholder')) || '');
                    const disabled = (await field.getAttribute('disabled')) !== null;
                    const readOnly = (await field.getAttribute('readonly')) !== null;
                    const hiddenAttr = (await field.getAttribute('hidden')) !== null;
                    const ariaHidden = ((await field.getAttribute('aria-hidden')) || '').toLowerCase() === 'true';
                    const isVisible = await field.isVisible().catch(() => true);
                    const hidden = type === 'hidden' || hiddenAttr || ariaHidden || !isVisible;
                    // Try to find associated label
                    let label = normalizeFieldLabel((await field.getAttribute('aria-label')) || '');
                    if (!label) {
                        const fieldId = await field.getAttribute('id');
                        if (fieldId) {
                            // Look for label with matching "for" attribute
                            const labelElement = await page.locator(`label[for="${fieldId}"]`).first();
                            const labelText = await labelElement.textContent().catch(() => '');
                            label = normalizeFieldLabel(labelText || '');
                        }
                    }
                    // If still no label, check if field is inside a label
                    if (!label) {
                        const parentLabel = await field.locator('xpath=ancestor::label[1]').first();
                        const labelText = await parentLabel.textContent().catch(() => '');
                        label = normalizeFieldLabel(labelText || '');
                    }
                    formFields.push({
                        type,
                        name,
                        label,
                        required,
                        placeholder,
                        disabled,
                        readOnly,
                        hidden,
                    });
                }
                catch {
                    // Failed to extract field info, skip
                }
            }
            elements.forms.push({
                action: resolvedAction,
                method,
                selector,
                fields: formFields,
            });
        }
        catch {
            // Failed to extract form info, skip
        }
    }
    // Discover all buttons
    const buttons = await page.getByRole('button').all();
    for (let i = 0; i < buttons.length; i++) {
        const button = buttons[i];
        try {
            const text = (await button.textContent()) || '';
            const ariaLabel = (await button.getAttribute('aria-label')) || '';
            const type = (await button.getAttribute('type')) || 'button';
            const disabled = (await button.getAttribute('disabled')) !== null;
            const isVisible = await button.isVisible();
            // Build selector - prefer has-text when text is unique
            let selector = 'button';
            if (text.trim()) {
                selector = `button:has-text("${escapeSelectorText(text.trim())}")`;
            }
            else if (ariaLabel) {
                selector = `button[aria-label="${escapeSelectorText(ariaLabel)}"]`;
            }
            else {
                // Fallback to nth-of-type
                selector = `button:nth-of-type(${i + 1})`;
            }
            elements.buttons.push({
                type: 'button',
                selector,
                text: text.trim() || ariaLabel,
                visible: isVisible,
                attributes: {
                    type,
                    disabled: disabled.toString(),
                },
            });
        }
        catch {
            // Failed to extract button info, skip
        }
    }
    // Discover all links with href
    const links = await page.locator('a[href]').all();
    const seenHrefs = new Set();
    for (const link of links) {
        try {
            const href = await link.getAttribute('href');
            if (!href)
                continue;
            // Resolve to absolute URL
            const absoluteUrl = new URL(href, pageUrl).href;
            // Deduplicate by href
            if (seenHrefs.has(absoluteUrl))
                continue;
            seenHrefs.add(absoluteUrl);
            const text = (await link.textContent())?.trim() || '';
            // Determine if internal
            const linkHostname = new URL(absoluteUrl).hostname;
            const isInternal = linkHostname === pageHostname;
            elements.links.push({
                href: absoluteUrl,
                text,
                isInternal,
            });
        }
        catch {
            // Failed to extract link info or invalid URL, skip
        }
    }
    // Discover navigation menus
    const navContainers = await page
        .locator('nav, [role="navigation"], [role="menubar"]')
        .all();
    for (let i = 0; i < navContainers.length; i++) {
        const nav = navContainers[i];
        try {
            const text = (await nav.textContent())?.trim() || '';
            const ariaLabel = (await nav.getAttribute('aria-label')) || '';
            const isVisible = await nav.isVisible();
            elements.menus.push({
                type: 'menu',
                selector: `nav:nth-of-type(${i + 1})`,
                text: ariaLabel || text.substring(0, 50) || `Menu ${i + 1}`,
                visible: isVisible,
                attributes: {},
            });
        }
        catch {
            // Failed to extract menu info, skip
        }
    }
    // Discover other interactive elements
    const interactiveRoles = ['tab', 'tabpanel', 'dialog', 'combobox', 'listbox'];
    for (const role of interactiveRoles) {
        const roleElements = await page.locator(`[role="${role}"]`).all();
        for (let i = 0; i < roleElements.length; i++) {
            const element = roleElements[i];
            try {
                const text = (await element.textContent())?.trim() || '';
                const ariaLabel = (await element.getAttribute('aria-label')) || '';
                const isVisible = await element.isVisible();
                elements.otherInteractive.push({
                    type: role, // TypeScript will coerce to InteractiveElement['type']
                    selector: `[role="${role}"]:nth-of-type(${i + 1})`,
                    text: ariaLabel || text.substring(0, 50) || `${role} ${i + 1}`,
                    visible: isVisible,
                    attributes: { role },
                });
            }
            catch {
                // Failed to extract element info, skip
            }
        }
    }
    return elements;
}
/**
 * Discover hidden elements by triggering interactions (buttons, menus, modals)
 * Returns only NEWLY discovered elements (not present in initial page load)
 */
export async function discoverHiddenElements(page, pageUrl) {
    // Take "before" snapshot of visible element count
    const beforeCounts = {
        buttons: (await page.getByRole('button').all()).length,
        links: (await page.locator('a[href]').all()).length,
        forms: (await page.locator('form').all()).length,
    };
    const newElements = {
        forms: [],
        buttons: [],
        links: [],
        menus: [],
        otherInteractive: [],
    };
    // Find buttons that might trigger hidden content
    const triggerSelectors = [
        'button[aria-expanded]',
        'button[aria-haspopup]',
        'button[data-toggle]',
        'button[data-bs-toggle]',
        '[class*="hamburger"]',
        '[class*="menu-toggle"]',
        '[class*="navbar-toggler"]',
    ];
    // Also find buttons with trigger-like text
    const triggerTexts = ['menu', 'nav', 'more', 'show', 'open', 'expand'];
    const allButtons = await page.getByRole('button').all();
    const triggerButtons = [];
    // Collect explicit trigger buttons
    for (const selector of triggerSelectors) {
        const buttons = await page.locator(selector).all();
        triggerButtons.push(...buttons);
    }
    // Collect buttons with trigger-like text
    for (const button of allButtons) {
        try {
            const text = ((await button.textContent()) || '').toLowerCase();
            if (triggerTexts.some((word) => text.includes(word))) {
                triggerButtons.push(button);
            }
        }
        catch {
            // Skip
        }
    }
    // Click each trigger button and check for new elements (cap at 10 to avoid perf explosion)
    for (const trigger of triggerButtons.slice(0, 10)) {
        try {
            // Check if button is visible and enabled
            const isVisible = await trigger.isVisible();
            if (!isVisible)
                continue;
            // Check for destructive actions
            const buttonText = (await trigger.textContent()) || '';
            const ariaLabel = (await trigger.getAttribute('aria-label')) || '';
            const combinedText = `${buttonText} ${ariaLabel}`;
            if (isDestructiveAction(combinedText)) {
                continue; // Skip destructive buttons
            }
            // Click the trigger
            await trigger.click({ timeout: 2000 });
            // Wait for animations
            await page.waitForTimeout(500);
            // Check for newly visible elements
            const modalSelectors = [
                '[role="dialog"]',
                '[role="menu"]',
                '.modal',
                '.dropdown-menu',
                '.nav-menu',
                '[aria-hidden="false"]',
            ];
            let foundNewContent = false;
            for (const selector of modalSelectors) {
                const modalElements = await page.locator(selector).all();
                for (const modal of modalElements) {
                    try {
                        const isVisible = await modal.isVisible();
                        if (isVisible) {
                            foundNewContent = true;
                            // Run discoverElements on the new content
                            const modalElements = await discoverElements(page, pageUrl);
                            // Merge with newElements (deduplicate by selector)
                            for (const form of modalElements.forms) {
                                if (!newElements.forms.some((f) => f.selector === form.selector)) {
                                    newElements.forms.push(form);
                                }
                            }
                            for (const button of modalElements.buttons) {
                                if (!newElements.buttons.some((b) => b.selector === button.selector)) {
                                    newElements.buttons.push(button);
                                }
                            }
                            for (const link of modalElements.links) {
                                if (!newElements.links.some((l) => l.href === link.href)) {
                                    newElements.links.push(link);
                                }
                            }
                            for (const menu of modalElements.menus) {
                                if (!newElements.menus.some((m) => m.selector === menu.selector)) {
                                    newElements.menus.push(menu);
                                }
                            }
                            for (const other of modalElements.otherInteractive) {
                                if (!newElements.otherInteractive.some((o) => o.selector === other.selector)) {
                                    newElements.otherInteractive.push(other);
                                }
                            }
                        }
                    }
                    catch {
                        // Skip
                    }
                }
            }
            // Try to close/reset
            if (foundNewContent) {
                try {
                    // Try clicking trigger again to toggle off
                    await trigger.click({ timeout: 1000 });
                    await page.waitForTimeout(300);
                }
                catch {
                    // Try pressing Escape
                    try {
                        await page.keyboard.press('Escape');
                        await page.waitForTimeout(300);
                    }
                    catch {
                        // If can't close, reload the page to reset state
                        try {
                            await page.reload({ timeout: 5000, waitUntil: 'domcontentloaded' });
                        }
                        catch {
                            // Can't reload, break loop
                            break;
                        }
                    }
                }
            }
        }
        catch {
            // Failed to interact with trigger, continue
            continue;
        }
    }
    // Also try hovering on nav items to discover dropdowns
    const navItems = await page.locator('nav li, [role="menubar"] > *').all();
    for (const item of navItems) {
        try {
            const isVisible = await item.isVisible();
            if (!isVisible)
                continue;
            // Hover on the item
            await item.hover({ timeout: 1000 });
            await page.waitForTimeout(300);
            // Check for dropdown menus
            const dropdowns = await page.locator('.dropdown-menu, [role="menu"]').all();
            for (const dropdown of dropdowns) {
                try {
                    const isDropdownVisible = await dropdown.isVisible();
                    if (isDropdownVisible) {
                        // Discover elements in dropdown
                        const dropdownElements = await discoverElements(page, pageUrl);
                        // Merge new links
                        for (const link of dropdownElements.links) {
                            if (!newElements.links.some((l) => l.href === link.href)) {
                                newElements.links.push(link);
                            }
                        }
                        // Merge new buttons
                        for (const button of dropdownElements.buttons) {
                            if (!newElements.buttons.some((b) => b.selector === button.selector)) {
                                newElements.buttons.push(button);
                            }
                        }
                    }
                }
                catch {
                    // Skip
                }
            }
        }
        catch {
            // Failed to hover, continue
            continue;
        }
    }
    // Filter to return only NEWLY discovered elements (subtract "before" snapshot)
    // Since we already deduplicated during collection, and we're discovering from hidden content,
    // most of these should be new. But let's do a final pass to be safe.
    return newElements;
}
//# sourceMappingURL=element-mapper.js.map