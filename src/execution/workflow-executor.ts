// Workflow execution orchestrator: runs workflow plans with error capture, evidence collection, and page auditing

import type { Page } from 'playwright';
import type { WorkflowPlan, WorkflowStep } from '../types/discovery.js';
import type {
  ExecutionArtifact,
  WorkflowExecutionResult,
  StepResult,
  AccessibilityReport,
  PerformanceMetrics,
  DeadButtonResult,
  BrokenFormResult,
} from '../types/execution.js';
import { BrowserManager } from '../browser/index.js';
import { ScreenshotManager } from '../screenshots/index.js';
import { ArtifactStorage } from '../artifacts/index.js';
import { setupErrorListeners } from './error-detector.js';
import { executeStep, captureClickState, checkDeadButton, detectBrokenForm } from './step-handlers.js';
import type { ClickStateSnapshot } from './step-handlers.js';
import { captureErrorEvidence } from './evidence-capture.js';
import { auditAccessibility } from '../testing/accessibility-auditor.js';
import { capturePerformanceMetrics } from '../testing/performance-monitor.js';

export interface ExecutionOptions {
  targetUrl: string;
  sessionId: string;
  workflowPlans: WorkflowPlan[];
  email?: string;
  password?: string;
  headless?: boolean;        // defaults to true
  onProgress?: (message: string) => void;
}

/**
 * Executes all workflow plans with comprehensive error detection and auditing
 */
export class WorkflowExecutor {
  private browserManager: BrowserManager;
  private screenshotManager: ScreenshotManager;
  private artifactStorage: ArtifactStorage;
  private options: ExecutionOptions;

  constructor(options: ExecutionOptions) {
    this.options = options;
    this.browserManager = new BrowserManager({ headless: options.headless ?? true });
    this.screenshotManager = new ScreenshotManager();
    this.artifactStorage = new ArtifactStorage();
  }

  /**
   * Main execution flow: runs all workflows and produces execution artifact
   */
  async execute(): Promise<ExecutionArtifact> {
    const startTime = Date.now();

    this.log('Launching browser...');
    await this.browserManager.launch();

    const workflowResults: WorkflowExecutionResult[] = [];
    const pageAudits: Array<{ url: string; accessibility?: AccessibilityReport; performance?: PerformanceMetrics }> = [];
    const allDeadButtons: DeadButtonResult[] = [];
    const allBrokenForms: BrokenFormResult[] = [];

    try {
      // Execute each workflow sequentially
      for (const plan of this.options.workflowPlans) {
        this.log(`\nExecuting workflow: ${plan.workflowName}`);

        const result = await this.executeWorkflow(plan, pageAudits, allDeadButtons, allBrokenForms);
        workflowResults.push(result);

        this.log(`  Status: ${result.overallStatus} (${result.passedSteps}/${result.totalSteps} passed)`);
      }

    } finally {
      await this.browserManager.close();
    }

    // Calculate total issues and exit code
    const totalIssues = this.calculateTotalIssues(workflowResults, pageAudits, allDeadButtons, allBrokenForms);
    const exitCode = (workflowResults.some(r => r.overallStatus === 'failed') || totalIssues > 0) ? 1 : 0;

    // Build execution artifact
    const artifact: ExecutionArtifact = {
      version: '1.0.0',
      stage: 'execution',
      timestamp: new Date().toISOString(),
      sessionId: this.options.sessionId,
      targetUrl: this.options.targetUrl,
      workflowResults,
      pageAudits,
      deadButtons: allDeadButtons,
      brokenForms: allBrokenForms,
      totalIssues,
      exitCode,
    };

    // Save artifact
    await this.artifactStorage.save(artifact);
    this.log(`\n✓ Execution artifact saved`);

    return artifact;
  }

  /**
   * Execute a single workflow plan
   */
  private async executeWorkflow(
    plan: WorkflowPlan,
    pageAudits: Array<{ url: string; accessibility?: AccessibilityReport; performance?: PerformanceMetrics }>,
    allDeadButtons: DeadButtonResult[],
    allBrokenForms: BrokenFormResult[]
  ): Promise<WorkflowExecutionResult> {
    const workflowStart = Date.now();

    // Create a fresh page for this workflow
    const page = await this.browserManager.newPage();

    // Set up error listeners
    const { collector, cleanup } = setupErrorListeners(page);

    const stepResults: StepResult[] = [];
    let firstNavUrl: string | null = null;
    let lastUrl = '';
    let pageScreenshotPath: string | undefined;

    try {
      // Execute each step sequentially
      for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i];

        this.log(`  Step ${i + 1}/${plan.steps.length}: ${step.action} ${step.selector}`);

        // Inject credentials if this is a login workflow
        const stepWithCreds = this.injectCredentialsIfNeeded(step, plan);

        // Capture pre-click state for dead-button detection (before executeStep clicks)
        let preClickState: ClickStateSnapshot | undefined;
        let networkActivity = false;
        let networkListener: (() => void) | undefined;

        if (step.action === 'click') {
          preClickState = await captureClickState(page);
          networkListener = () => { networkActivity = true; };
          page.on('request', networkListener);
        }

        // Execute the step
        const result = await executeStep(page, stepWithCreds, i, this.options.targetUrl);

        // After step, check for dead button using pre/post state comparison (no re-click)
        if (step.action === 'click' && result.status === 'passed' && preClickState) {
          await page.waitForTimeout(1000);
          const postState = await captureClickState(page);
          postState.hadNetworkActivity = networkActivity;
          if (networkListener) page.off('request', networkListener);

          const deadResult = checkDeadButton(step.selector, preClickState, postState);
          if (deadResult.isDead) {
            allDeadButtons.push(deadResult);
            this.log(`    Warning: Dead button detected`);
          }
        } else if (networkListener) {
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
        const isFormFillThenSubmit =
          step.action === 'fill' &&
          i + 1 < plan.steps.length &&
          plan.steps[i + 1].action === 'click' &&
          plan.steps[i + 1].selector.includes('submit');

        const isClickInsideForm =
          step.action === 'click' && result.status === 'passed';

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
      } catch {
        // Graceful degradation — screenshot failure doesn't break workflow
      }

    } finally {
      // Clean up error listeners
      cleanup();
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
  private async auditPage(
    page: Page,
    url: string,
    pageAudits: Array<{ url: string; accessibility?: AccessibilityReport; performance?: PerformanceMetrics }>
  ): Promise<void> {
    // Check if we already audited this URL
    if (pageAudits.some(a => a.url === url)) {
      return;
    }

    this.log(`  Auditing page: ${url}`);

    const accessibility = await auditAccessibility(page);
    const performance = await capturePerformanceMetrics(page);

    pageAudits.push({ url, accessibility, performance });

    if (accessibility.violationCount > 0) {
      this.log(`    Accessibility: ${accessibility.violationCount} violations found`);
    }
    if (performance.lcp > 0) {
      this.log(`    Performance: LCP ${Math.round(performance.lcp)}ms`);
    }
  }

  /**
   * Find the parent form selector for a field
   */
  private async findFormSelector(page: Page, fieldSelector: string): Promise<string | null> {
    try {
      return await page.evaluate((selector) => {
        const field = document.querySelector(selector);
        if (!field) return null;

        const form = field.closest('form');
        if (!form) return null;

        // Try to build a unique selector
        if (form.id) return `form#${form.id}`;
        if (form.className) return `form.${form.className.split(' ')[0]}`;
        return 'form';
      }, fieldSelector);
    } catch {
      return null;
    }
  }

  /**
   * Inject --email and --password into login form fields
   */
  private injectCredentialsIfNeeded(step: WorkflowStep, plan: WorkflowPlan): WorkflowStep {
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
  private isEmailField(selector: string): boolean {
    const lower = selector.toLowerCase();
    return lower.includes('email') || lower.includes('username') || lower.includes('user');
  }

  /**
   * Check if selector looks like a password field
   */
  private isPasswordField(selector: string): boolean {
    const lower = selector.toLowerCase();
    return lower.includes('password') || lower.includes('pass');
  }

  /**
   * Calculate total issues across all results
   */
  private calculateTotalIssues(
    workflowResults: WorkflowExecutionResult[],
    pageAudits: Array<{ url: string; accessibility?: AccessibilityReport; performance?: PerformanceMetrics }>,
    deadButtons: DeadButtonResult[],
    brokenForms: BrokenFormResult[]
  ): number {
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

    // Accessibility violations (only critical and serious)
    total += pageAudits.reduce((sum, audit) => {
      if (!audit.accessibility) return sum;
      return sum + audit.accessibility.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      ).length;
    }, 0);

    return total;
  }

  /**
   * Log message with optional progress callback
   */
  private log(message: string): void {
    if (this.options.onProgress) {
      this.options.onProgress(message);
    }
  }
}
