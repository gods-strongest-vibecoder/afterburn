// Workflow execution orchestrator: runs workflow plans with error capture, evidence collection, and page auditing
import { BrowserManager } from '../browser/index.js';
import { ScreenshotManager } from '../screenshots/index.js';
import { setupErrorListeners } from './error-detector.js';
import { executeStep, captureClickState, checkDeadButton, detectBrokenForm, DEAD_BUTTON_WAIT } from './step-handlers.js';
import { captureErrorEvidence } from './evidence-capture.js';
import { auditAccessibility } from '../testing/accessibility-auditor.js';
import { capturePerformanceMetrics } from '../testing/performance-monitor.js';
import { auditMeta } from '../testing/meta-auditor.js';
import { getAfterburnVersion } from '../version.js';
/**
 * Executes all workflow plans with comprehensive error detection and auditing
 */
export class WorkflowExecutor {
    browserManager;
    screenshotManager;
    options;
    constructor(options) {
        this.options = options;
        this.browserManager = new BrowserManager({ headless: options.headless ?? true });
        this.screenshotManager = new ScreenshotManager();
    }
    /**
     * Main execution flow: runs all workflows and produces execution artifact
     */
    async execute() {
        const appVersion = getAfterburnVersion();
        this.log('Launching browser...');
        await this.browserManager.launch();
        const workflowResults = [];
        const pageAudits = [];
        const allDeadButtons = [];
        const allBrokenForms = [];
        try {
            // Execute each workflow sequentially
            for (const plan of this.options.workflowPlans) {
                this.log(`\nExecuting workflow: ${plan.workflowName}`);
                const result = await this.executeWorkflow(plan, pageAudits, allDeadButtons, allBrokenForms);
                workflowResults.push(result);
                this.log(`  Status: ${result.overallStatus} (${result.passedSteps}/${result.totalSteps} passed)`);
            }
        }
        finally {
            await this.browserManager.close();
        }
        // Calculate total issues and exit code
        const totalIssues = this.calculateTotalIssues(workflowResults, pageAudits, allDeadButtons, allBrokenForms);
        const exitCode = (workflowResults.some(r => r.overallStatus === 'failed') || totalIssues > 0) ? 1 : 0;
        // Build execution artifact
        const artifact = {
            version: appVersion,
            stage: 'execution',
            timestamp: new Date().toISOString(),
            sessionId: this.options.sessionId,
            targetUrl: this.options.targetUrl,
            workflowResults,
            pageAudits,
            deadButtons: allDeadButtons,
            brokenForms: allBrokenForms,
            brokenLinks: [], // Populated by engine from discovery phase
            totalIssues,
            exitCode,
        };
        return artifact;
    }
    /**
     * Execute a single workflow plan
     */
    async executeWorkflow(plan, pageAudits, allDeadButtons, allBrokenForms) {
        const workflowStart = Date.now();
        // Create a fresh page for this workflow
        const page = await this.browserManager.newPage();
        // Set up error listeners
        const { collector, cleanup } = setupErrorListeners(page);
        // Set up a single persistent dialog handler to auto-dismiss alert/confirm/prompt.
        // This MUST be a single handler per page — stacking page.once('dialog') per step
        // caused crashes when multiple handlers tried to dismiss the same dialog.
        const dialogHandler = async (dialog) => {
            try {
                await dialog.dismiss();
            }
            catch {
                // Dialog may already be handled — safe to ignore
            }
        };
        page.on('dialog', dialogHandler);
        const stepResults = [];
        let firstNavUrl = null;
        let lastUrl = '';
        let pageScreenshotPath;
        try {
            // Execute each step sequentially
            for (let i = 0; i < plan.steps.length; i++) {
                const step = plan.steps[i];
                this.log(`  Step ${i + 1}/${plan.steps.length}: ${step.action} ${step.selector}`);
                // Inject credentials if this is a login workflow
                const stepWithCreds = this.injectCredentialsIfNeeded(step, plan);
                // Capture pre-click state for dead-button detection (before executeStep clicks)
                let preClickState;
                let networkActivity = false;
                let networkListener;
                if (step.action === 'click') {
                    preClickState = await captureClickState(page);
                    networkListener = () => { networkActivity = true; };
                    page.on('request', networkListener);
                }
                // Execute the step
                const result = await executeStep(page, stepWithCreds, i, this.options.targetUrl);
                // After step, check for dead button using pre/post state comparison (no re-click)
                if (step.action === 'click' && result.status === 'passed' && preClickState) {
                    await page.waitForTimeout(DEAD_BUTTON_WAIT);
                    const postState = await captureClickState(page);
                    postState.hadNetworkActivity = networkActivity;
                    if (networkListener)
                        page.off('request', networkListener);
                    const deadResult = checkDeadButton(step.selector, preClickState, postState);
                    if (deadResult.isDead) {
                        allDeadButtons.push(deadResult);
                        this.log(`    Warning: Dead button detected`);
                    }
                }
                else if (networkListener) {
                    page.off('request', networkListener);
                }
                // Capture evidence on failure
                if (result.status === 'failed') {
                    this.log(`    Failed: ${result.error}`);
                    result.evidence = await captureErrorEvidence(page, collector, this.screenshotManager, i);
                }
                stepResults.push(result);
                // Track first navigation URL for auditing
                if (step.action === 'navigate' && !firstNavUrl) {
                    firstNavUrl = page.url();
                }
                // Track last URL
                lastUrl = page.url();
                // Form detection: check if this step interacts with a form
                const isFormFillThenSubmit = step.action === 'fill' &&
                    i + 1 < plan.steps.length &&
                    plan.steps[i + 1].action === 'click' &&
                    plan.steps[i + 1].selector.includes('submit');
                const isClickInsideForm = step.action === 'click' && result.status === 'passed';
                if (isFormFillThenSubmit || isClickInsideForm) {
                    const formSelector = await this.findFormSelector(page, step.selector);
                    if (formSelector) {
                        const brokenResult = await detectBrokenForm(page, formSelector);
                        if (brokenResult.isBroken) {
                            allBrokenForms.push(brokenResult);
                            this.log(`    Warning: Broken form detected`);
                        }
                    }
                }
            }
            // Audit key pages (first navigation + final URL)
            if (firstNavUrl) {
                await this.auditPage(page, firstNavUrl, pageAudits);
            }
            if (lastUrl && lastUrl !== firstNavUrl) {
                await this.auditPage(page, lastUrl, pageAudits);
            }
            // Capture page-level screenshot for report embedding (before page closes)
            try {
                const pageScreenshot = await this.screenshotManager.capture(page, `workflow-${plan.workflowName.replace(/\s+/g, '-').toLowerCase()}`);
                pageScreenshotPath = pageScreenshot.pngPath;
            }
            catch {
                // Graceful degradation — screenshot failure doesn't break workflow
            }
        }
        finally {
            // Clean up error listeners and dialog handler
            cleanup();
            page.off('dialog', dialogHandler);
            await page.close();
        }
        // Calculate workflow result
        const passedSteps = stepResults.filter(r => r.status === 'passed').length;
        const failedSteps = stepResults.filter(r => r.status === 'failed').length;
        const skippedSteps = stepResults.filter(r => r.status === 'skipped').length;
        const overallStatus = failedSteps > 0 ? 'failed' : 'passed';
        return {
            workflowName: plan.workflowName,
            description: plan.description,
            totalSteps: plan.steps.length,
            passedSteps,
            failedSteps,
            skippedSteps,
            stepResults,
            errors: collector,
            overallStatus,
            duration: Date.now() - workflowStart,
            pageScreenshotRef: pageScreenshotPath,
        };
    }
    /**
     * Audit a page with accessibility and performance checks
     */
    async auditPage(page, url, pageAudits) {
        // Check if we already audited this URL
        if (pageAudits.some(a => a.url === url)) {
            return;
        }
        this.log(`  Auditing page: ${url}`);
        // Ensure audit data is captured from the URL being recorded.
        if (page.url() !== url) {
            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15_000 });
            }
            catch (error) {
                this.log(`    Skipping audit: unable to load ${url} (${error instanceof Error ? error.message : String(error)})`);
                return;
            }
        }
        const [accessibility, performance, metaAudit] = await Promise.all([
            auditAccessibility(page),
            capturePerformanceMetrics(page),
            auditMeta(page),
        ]);
        pageAudits.push({
            url,
            accessibility,
            performance,
            metaIssues: metaAudit.issues.length > 0 ? metaAudit.issues : undefined,
        });
        if (accessibility.violationCount > 0) {
            this.log(`    Accessibility: ${accessibility.violationCount} violations found`);
        }
        if (metaAudit.issues.length > 0) {
            this.log(`    Meta/SEO: ${metaAudit.issues.length} issues found`);
        }
        if (performance.lcp > 0) {
            this.log(`    Performance: LCP ${Math.round(performance.lcp)}ms`);
        }
    }
    /**
     * Find the parent form selector for a field
     */
    async findFormSelector(page, fieldSelector) {
        try {
            return await page.evaluate((selector) => {
                const field = document.querySelector(selector);
                if (!field)
                    return null;
                const form = field.closest('form');
                if (!form)
                    return null;
                // Try to build a unique selector
                if (form.id)
                    return `form#${form.id}`;
                if (form.className)
                    return `form.${form.className.split(' ')[0]}`;
                return 'form';
            }, fieldSelector);
        }
        catch {
            return null;
        }
    }
    /**
     * Inject --email and --password into login form fields
     */
    injectCredentialsIfNeeded(step, plan) {
        // Only inject if this is a fill action and we have credentials
        if (step.action !== 'fill') {
            return step;
        }
        // Check if this looks like a login workflow
        const isLoginWorkflow = plan.workflowName.toLowerCase().includes('login') ||
            plan.workflowName.toLowerCase().includes('sign in') ||
            plan.description.toLowerCase().includes('authentication');
        if (!isLoginWorkflow) {
            return step;
        }
        // Inject email
        if (this.options.email && this.isEmailField(step.selector)) {
            return { ...step, value: this.options.email };
        }
        // Inject password
        if (this.options.password && this.isPasswordField(step.selector)) {
            return { ...step, value: this.options.password };
        }
        return step;
    }
    /**
     * Check if selector looks like an email field
     */
    isEmailField(selector) {
        const lower = selector.toLowerCase();
        return lower.includes('email') || lower.includes('username') || lower.includes('user');
    }
    /**
     * Check if selector looks like a password field
     */
    isPasswordField(selector) {
        const lower = selector.toLowerCase();
        return lower.includes('password') || lower.includes('pass');
    }
    /**
     * Calculate total issues across all results
     */
    calculateTotalIssues(workflowResults, pageAudits, deadButtons, brokenForms) {
        let total = 0;
        // Failed workflow steps
        total += workflowResults.reduce((sum, r) => sum + r.failedSteps, 0);
        // Console errors
        total += workflowResults.reduce((sum, r) => sum + r.errors.consoleErrors.length, 0);
        // Network failures
        total += workflowResults.reduce((sum, r) => sum + r.errors.networkFailures.length, 0);
        // Broken images
        total += workflowResults.reduce((sum, r) => sum + r.errors.brokenImages.length, 0);
        // Dead buttons
        total += deadButtons.filter(b => b.isDead).length;
        // Broken forms
        total += brokenForms.filter(f => f.isBroken).length;
        // Note: broken links are added post-execution by engine.ts from discovery data
        // Accessibility violations (only critical and serious)
        total += pageAudits.reduce((sum, audit) => {
            if (!audit.accessibility)
                return sum;
            return sum + audit.accessibility.violations.filter(v => v.impact === 'critical' || v.impact === 'serious').length;
        }, 0);
        return total;
    }
    /**
     * Log message with optional progress callback
     */
    log(message) {
        if (this.options.onProgress) {
            this.options.onProgress(message);
        }
    }
}
//# sourceMappingURL=workflow-executor.js.map