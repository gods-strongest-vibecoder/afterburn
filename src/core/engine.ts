// Core pipeline engine - reusable function for CLI, MCP, and GitHub Action interfaces

import crypto from 'node:crypto';
import fs from 'fs-extra';
import path from 'node:path';
import { runDiscovery } from '../discovery/index.js';
import type { DiscoveryOptions } from '../discovery/index.js';
import { WorkflowExecutor } from '../execution/index.js';
import type { ExecutionOptions } from '../execution/index.js';
import { analyzeErrors, auditUI, mapErrorToSource } from '../analysis/index.js';
import type { AnalysisArtifact } from '../analysis/index.js';
import { ArtifactStorage } from '../artifacts/index.js';
import { generateHtmlReport, writeHtmlReport, generateMarkdownReport, writeMarkdownReport, calculateHealthScore, prioritizeIssues, deduplicateIssues } from '../reports/index.js';
import type { HealthScore, PrioritizedIssue } from '../reports/index.js';
import { validatePublicUrl, validatePath, validateMaxPages } from './validation.js';
import type { ExecutionArtifact } from '../types/execution.js';
import type { BrokenLink } from '../types/discovery.js';
import { getAfterburnVersion } from '../version.js';

export interface AfterBurnOptions {
  targetUrl: string;
  sessionId?: string;            // Auto-generate UUID if not provided
  sourcePath?: string;           // --source flag
  email?: string;                // --email flag
  password?: string;             // --password flag
  outputDir?: string;            // defaults to ./afterburn-reports/{domain}/
  flowHints?: string[];          // --flows flag parsed
  maxPages?: number;             // --max-pages flag, 0 = unlimited
  headless?: boolean;            // defaults true
  onProgress?: (stage: string, message: string) => void;  // Progress callback for all interfaces
}

export interface AfterBurnResult {
  healthScore: HealthScore;
  prioritizedIssues: PrioritizedIssue[];
  totalIssues: number;
  highPriorityCount: number;
  mediumPriorityCount: number;
  lowPriorityCount: number;
  workflowsPassed: number;
  workflowsTotal: number;
  htmlReportPath: string | null;
  markdownReportPath: string | null;
  exitCode: number;              // 0 = all pass, 1 = issues found
  sessionId: string;
  warnings?: string[];           // Non-fatal issues during scan (e.g., report generation failures)
}

// Hard timeout to prevent the pipeline from hanging forever on unresponsive sites
const PIPELINE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

function toBrokenLinkIssue(link: BrokenLink): ExecutionArtifact['brokenLinks'][number] {
  return {
    url: link.url,
    sourceUrl: link.sourceUrl,
    statusCode: link.statusCode,
    statusText: link.statusText,
  };
}

export function mergeDiscoveryBrokenLinks(
  executionArtifact: ExecutionArtifact,
  discoveryBrokenLinks: BrokenLink[]
): void {
  const existingKeys = new Set(
    executionArtifact.brokenLinks.map(link => `${link.url}|${link.sourceUrl}|${link.statusCode}`)
  );

  for (const link of discoveryBrokenLinks) {
    const key = `${link.url}|${link.sourceUrl}|${link.statusCode}`;
    if (!existingKeys.has(key)) {
      executionArtifact.brokenLinks.push(toBrokenLinkIssue(link));
      existingKeys.add(key);
    }
  }
}

export function recalculateExecutionSummary(executionArtifact: ExecutionArtifact): void {
  let totalIssues = 0;

  totalIssues += executionArtifact.workflowResults.reduce((sum, result) => sum + result.failedSteps, 0);
  totalIssues += executionArtifact.workflowResults.reduce((sum, result) => sum + result.errors.consoleErrors.length, 0);
  totalIssues += executionArtifact.workflowResults.reduce((sum, result) => sum + result.errors.networkFailures.length, 0);
  totalIssues += executionArtifact.workflowResults.reduce((sum, result) => sum + result.errors.brokenImages.length, 0);
  totalIssues += executionArtifact.deadButtons.filter(button => button.isDead).length;
  totalIssues += executionArtifact.brokenForms.filter(form => form.isBroken).length;
  totalIssues += executionArtifact.brokenLinks.length;
  totalIssues += executionArtifact.pageAudits.reduce((sum, audit) => {
    if (!audit.accessibility) return sum;
    return sum + audit.accessibility.violations.filter(
      violation => violation.impact === 'critical' || violation.impact === 'serious'
    ).length;
  }, 0);

  executionArtifact.totalIssues = totalIssues;
  executionArtifact.exitCode = (executionArtifact.workflowResults.some(result => result.overallStatus === 'failed') || totalIssues > 0) ? 1 : 0;
}

/**
 * Extract a filesystem-safe domain slug from a URL.
 * Strips protocol, www., trailing slashes, and replaces dots with hyphens.
 * e.g. "https://www.getcredibly.org/foo" -> "getcredibly-org"
 */
function domainSlug(targetUrl: string): string {
  try {
    const hostname = new URL(targetUrl).hostname
      .replace(/^www\./, '')   // strip www.
      .replace(/\./g, '-');    // dots to hyphens
    return hostname || 'unknown-site';
  } catch {
    return 'unknown-site';
  }
}

/**
 * Build a human-readable timestamp string for filenames: YYYY-MM-DD-HHmmss
 */
function fileTimestamp(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${date}-${hh}${mm}${ss}`;
}

export async function runAfterburn(options: AfterBurnOptions): Promise<AfterBurnResult> {
  // Defense in depth: validate inputs even if caller already validated
  const validatedTargetUrl = await validatePublicUrl(options.targetUrl);
  const validatedSourcePath = options.sourcePath ? validatePath(options.sourcePath, 'sourcePath') : undefined;
  const validatedMaxPages = validateMaxPages(options.maxPages);

  // Generate sessionId if not provided, and sanitize it for filesystem safety
  let sessionId = options.sessionId || crypto.randomUUID();
  // Issue 17: Sanitize session ID to prevent path traversal in filenames
  // Security: Ensure session ID cannot be an absolute path or contain path traversal sequences
  sessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '-');

  // Additional validation: reject session IDs that look like paths
  if (sessionId.startsWith('-') || sessionId.includes('--')) {
    throw new Error('Invalid session ID: cannot start with hyphen or contain double hyphens');
  }

  // Ensure it's a simple identifier, not too long for filesystem safety
  if (sessionId.length > 64) {
    sessionId = sessionId.slice(0, 64);
  }

  // Minimum length for uniqueness
  if (sessionId.length < 8) {
    throw new Error('Invalid session ID: must be at least 8 characters');
  }

  // Build human-readable default output directory: afterburn-reports/{domain}/
  const slug = domainSlug(validatedTargetUrl);
  const outputDir = options.outputDir
    ? validatePath(options.outputDir, 'outputDir')
    : `./afterburn-reports/${slug}`;
  await fs.ensureDir(outputDir);

  // Cancellation flag for timeout handling (Issue 1)
  const cancellation = { cancelled: false };

  // Wrap the entire pipeline in a timeout to prevent infinite hangs
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      // Issue 1: Set cancellation flag to stop work between pipeline stages
      cancellation.cancelled = true;
      reject(new Error(
        'Scan timed out after 5 minutes. Try with --max-pages 5 for a faster scan.'
      ));
    }, PIPELINE_TIMEOUT_MS);
  });

  try {
    const result = await Promise.race([runPipeline(options, validatedTargetUrl, validatedSourcePath, validatedMaxPages, sessionId, outputDir, slug, cancellation), timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

async function runPipeline(
  options: AfterBurnOptions,
  validatedTargetUrl: string,
  validatedSourcePath: string | undefined,
  validatedMaxPages: number,
  sessionId: string,
  outputDir: string,
  slug: string,
  cancellation: { cancelled: boolean },
): Promise<AfterBurnResult> {
  const appVersion = getAfterburnVersion();

  // Stage: browser check
  options.onProgress?.('browser', 'Checking browser installation...');

  try {
    // Issue 1: Check cancellation before each major stage
    if (cancellation.cancelled) {
      throw new Error('Scan cancelled by timeout');
    }

    // Stage: discovery
    options.onProgress?.('discovery', 'Crawling site and discovering workflows...');

    const discoveryOptions: DiscoveryOptions = {
      targetUrl: validatedTargetUrl,
      sessionId,
      userHints: options.flowHints || [],
      maxPages: validatedMaxPages,
      headless: options.headless ?? true,
      onProgress: (msg: string) => {
        // Pass discovery progress messages through
        options.onProgress?.('discovery', msg);
      },
    };

    const discoveryResult = await runDiscovery(discoveryOptions);

    // Issue 1: Check cancellation after discovery
    if (cancellation.cancelled) {
      throw new Error('Scan cancelled by timeout');
    }

    // Issue 10: Don't return early - always generate reports even when no workflows found
    // Build minimal execution result for no-workflow case
    let executionResult;
    let diagnosedErrors: any[] = [];
    let uiAudits: any[] = [];

    if (discoveryResult.workflowPlans.length === 0) {
      options.onProgress?.('complete', 'No testable elements found on site - generating report...');

      // Create minimal execution result with all required fields
      executionResult = {
        version: appVersion,
        stage: 'execution',
        timestamp: new Date().toISOString(),
        sessionId,
        targetUrl: validatedTargetUrl,
        workflowResults: [],
        pageAudits: [],
        deadButtons: [],
        brokenForms: [],
        brokenLinks: discoveryResult.crawlResult?.brokenLinks?.map(toBrokenLinkIssue) || [],
        totalIssues: 0,
        exitCode: 1,
      };
    } else {
      // Issue 1: Check cancellation before execution
      if (cancellation.cancelled) {
        throw new Error('Scan cancelled by timeout');
      }

      // Stage: execution
      options.onProgress?.('execution', 'Testing workflows...');

      const executionOptions: ExecutionOptions = {
        targetUrl: validatedTargetUrl,
        sessionId,
        workflowPlans: discoveryResult.workflowPlans,
        email: options.email,
        password: options.password,
        headless: options.headless ?? true,
        onProgress: (msg: string) => {
          // Pass execution progress messages through
          options.onProgress?.('execution', msg);
        },
      };

      const executor = new WorkflowExecutor(executionOptions);
      executionResult = await executor.execute();
      mergeDiscoveryBrokenLinks(executionResult, discoveryResult.crawlResult?.brokenLinks || []);
      recalculateExecutionSummary(executionResult);

      // Issue 1: Check cancellation before analysis
      if (cancellation.cancelled) {
        throw new Error('Scan cancelled by timeout');
      }

      // Stage: analysis
      options.onProgress?.('analysis', 'Analyzing results...');

      // Run error diagnosis and UI auditing in parallel (they share no mutable state)
      const [rawDiagnosedErrors, uiAuditsResult] = await Promise.all([
        analyzeErrors(executionResult),
        auditUI(executionResult),
      ]);
      diagnosedErrors = rawDiagnosedErrors;
      uiAudits = uiAuditsResult;

      // Source code mapping runs after both complete (only depends on diagnosedErrors)
      if (validatedSourcePath) {
        for (const diagnosed of diagnosedErrors) {
          const sourceLocation = await mapErrorToSource(diagnosed.originalError, validatedSourcePath);
          if (sourceLocation) {
            diagnosed.sourceLocation = sourceLocation;
          }
        }
      }
    }

    // Persist final execution artifact after post-processing merges/recalculations.
    const artifactStorage = new ArtifactStorage();
    await artifactStorage.save(executionResult);

    // Save analysis artifact
    const analysisArtifact: AnalysisArtifact = {
      version: appVersion,
      stage: 'analysis',
      timestamp: new Date().toISOString(),
      sessionId,
      diagnosedErrors,
      uiAudits,
      sourceAnalysisAvailable: !!validatedSourcePath,
      aiPowered: !!process.env.GEMINI_API_KEY,
    };

    await artifactStorage.save(analysisArtifact);

    // Stage: reporting
    options.onProgress?.('reporting', 'Generating reports...');

    // Calculate health score and prioritize issues
    const healthScore = calculateHealthScore(executionResult);
    let prioritizedIssues = deduplicateIssues(
      prioritizeIssues(diagnosedErrors, uiAudits, executionResult)
    );

    // Issue 10: If no workflows were found, add a single high-priority issue
    if (discoveryResult.workflowPlans.length === 0) {
      prioritizedIssues = [{
        priority: 'high' as const,
        category: 'No Testable Content',
        summary: 'No forms, buttons, or interactive elements found on the site',
        impact: 'Afterburn could not test anything - the site may be empty, under maintenance, or blocking automated access',
        fixSuggestion: 'Verify the site loads correctly in a browser. If the site uses anti-bot protection, results may be incomplete.',
        location: validatedTargetUrl,
      }];
    }

    let htmlReportPath: string | null = null;
    let markdownReportPath: string | null = null;
    const warnings: string[] = [];

    // Human-readable report filenames: {domain}-{YYYY-MM-DD}-{HHmmss}.{ext}
    const reportBaseName = `${slug}-${fileTimestamp()}`;

    // Generate HTML and Markdown reports in parallel (independent outputs)
    await Promise.all([
      (async () => {
        try {
          const htmlReport = await generateHtmlReport(executionResult, analysisArtifact);
          htmlReportPath = path.join(outputDir, `${reportBaseName}.html`);
          await writeHtmlReport(htmlReport, htmlReportPath);
        } catch (reportError) {
          // Issue 11: Track report generation failures as warnings
          warnings.push(`HTML report generation failed: ${reportError instanceof Error ? reportError.message : String(reportError)}`);
        }
      })(),
      (async () => {
        try {
          const markdownReport = generateMarkdownReport(executionResult, analysisArtifact);
          markdownReportPath = path.join(outputDir, `${reportBaseName}.md`);
          await writeMarkdownReport(markdownReport, markdownReportPath);
        } catch (reportError) {
          // Issue 11: Track report generation failures as warnings
          warnings.push(`Markdown report generation failed: ${reportError instanceof Error ? reportError.message : String(reportError)}`);
        }
      })(),
    ]);

    // Stage: complete
    const statusMessage = warnings.length > 0
      ? `Scan complete with warnings: ${warnings.join(', ')}`
      : 'Scan complete';
    options.onProgress?.('complete', statusMessage);

    // Calculate issue counts
    const highPriorityCount = prioritizedIssues.filter(i => i.priority === 'high').length;
    const mediumPriorityCount = prioritizedIssues.filter(i => i.priority === 'medium').length;
    const lowPriorityCount = prioritizedIssues.filter(i => i.priority === 'low').length;

    const workflowsPassed = executionResult.workflowResults.filter(w => w.overallStatus === 'passed').length;
    const workflowsTotal = executionResult.workflowResults.length;

    return {
      healthScore,
      prioritizedIssues,
      totalIssues: prioritizedIssues.length,
      highPriorityCount,
      mediumPriorityCount,
      lowPriorityCount,
      workflowsPassed,
      workflowsTotal,
      htmlReportPath,
      markdownReportPath,
      exitCode: executionResult.exitCode,
      sessionId,
      warnings: warnings.length > 0 ? warnings : undefined,
    };

  } catch (error) {
    // Re-throw errors for caller to handle
    throw error;
  }
}
