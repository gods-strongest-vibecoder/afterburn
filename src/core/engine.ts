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
import { validateUrl, validatePath, validateMaxPages } from './validation.js';

export interface AfterBurnOptions {
  targetUrl: string;
  sessionId?: string;            // Auto-generate UUID if not provided
  sourcePath?: string;           // --source flag
  email?: string;                // --email flag
  password?: string;             // --password flag
  outputDir?: string;            // defaults to ./afterburn-reports/{timestamp}/
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

export async function runAfterburn(options: AfterBurnOptions): Promise<AfterBurnResult> {
  // Defense in depth: validate inputs even if caller already validated
  const validatedTargetUrl = validateUrl(options.targetUrl);
  const validatedSourcePath = options.sourcePath ? validatePath(options.sourcePath, 'sourcePath') : undefined;
  const validatedMaxPages = validateMaxPages(options.maxPages);

  // Generate sessionId if not provided, and sanitize it for filesystem safety
  let sessionId = options.sessionId || crypto.randomUUID();
  // Issue 17: Sanitize session ID to prevent path traversal in filenames
  sessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '-');

  // Create outputDir if it doesn't exist
  const outputDir = options.outputDir
    ? validatePath(options.outputDir, 'outputDir')
    : `./afterburn-reports/${Date.now()}`;
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
    const result = await Promise.race([runPipeline(options, validatedTargetUrl, validatedSourcePath, validatedMaxPages, sessionId, outputDir, cancellation), timeoutPromise]);
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
  cancellation: { cancelled: boolean },
): Promise<AfterBurnResult> {
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

    // Issue 10: Don't return early — always generate reports even when no workflows found
    // Build minimal execution result for no-workflow case
    let executionResult;
    let diagnosedErrors: any[] = [];
    let uiAudits: any[] = [];

    if (discoveryResult.workflowPlans.length === 0) {
      options.onProgress?.('complete', 'No testable elements found on site — generating report...');

      // Create minimal execution result with all required fields
      executionResult = {
        version: '1.0.0',
        stage: 'execution',
        timestamp: new Date().toISOString(),
        sessionId,
        targetUrl: validatedTargetUrl,
        workflowResults: [],
        pageAudits: [],
        deadButtons: [],
        brokenForms: [],
        brokenLinks: discoveryResult.crawlResult?.brokenLinks?.map(bl => ({
          url: bl.url,
          sourceUrl: bl.sourceUrl,
          statusCode: bl.statusCode,
          statusText: bl.statusText,
        })) || [],
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

      // Issue 8: Merge broken links from discovery with execution results (don't overwrite)
      if (discoveryResult.crawlResult?.brokenLinks?.length > 0) {
        const existingUrls = new Set(executionResult.brokenLinks.map(bl => bl.url));
        for (const bl of discoveryResult.crawlResult.brokenLinks) {
          if (!existingUrls.has(bl.url)) {
            executionResult.brokenLinks.push({
              url: bl.url,
              sourceUrl: bl.sourceUrl,
              statusCode: bl.statusCode,
              statusText: bl.statusText,
            });
          }
        }
      }

      // Issue 1: Check cancellation before analysis
      if (cancellation.cancelled) {
        throw new Error('Scan cancelled by timeout');
      }

      // Stage: analysis
      options.onProgress?.('analysis', 'Analyzing results...');

      // Error diagnosis
      diagnosedErrors = await analyzeErrors(executionResult);

      // Source code mapping (if --source provided)
      if (validatedSourcePath) {
        for (const diagnosed of diagnosedErrors) {
          const sourceLocation = await mapErrorToSource(diagnosed.originalError, validatedSourcePath);
          if (sourceLocation) {
            diagnosed.sourceLocation = sourceLocation;
          }
        }
      }

      // UI auditing (vision analysis of screenshots from execution)
      uiAudits = await auditUI(executionResult);
    }

    // Save analysis artifact
    const analysisArtifact: AnalysisArtifact = {
      version: '1.0.0',
      stage: 'analysis',
      timestamp: new Date().toISOString(),
      sessionId,
      diagnosedErrors,
      uiAudits,
      sourceAnalysisAvailable: !!validatedSourcePath,
      aiPowered: !!process.env.GEMINI_API_KEY,
    };

    const artifactStorage = new ArtifactStorage();
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
        impact: 'Afterburn could not test anything — the site may be empty, under maintenance, or blocking automated access',
        fixSuggestion: 'Verify the site loads correctly in a browser. If the site uses anti-bot protection, results may be incomplete.',
        location: validatedTargetUrl,
      }];
    }

    let htmlReportPath: string | null = null;
    let markdownReportPath: string | null = null;
    const warnings: string[] = [];

    try {
      // Generate HTML report (human-readable)
      const htmlReport = await generateHtmlReport(executionResult, analysisArtifact);
      htmlReportPath = path.join(outputDir, `report-${sessionId}.html`);
      await writeHtmlReport(htmlReport, htmlReportPath);
    } catch (reportError) {
      // Issue 11: Track report generation failures as warnings
      warnings.push(`HTML report generation failed: ${reportError instanceof Error ? reportError.message : String(reportError)}`);
    }

    try {
      // Generate Markdown report (AI-readable)
      const markdownReport = generateMarkdownReport(executionResult, analysisArtifact);
      markdownReportPath = path.join(outputDir, `report-${sessionId}.md`);
      await writeMarkdownReport(markdownReport, markdownReportPath);
    } catch (reportError) {
      // Issue 11: Track report generation failures as warnings
      warnings.push(`Markdown report generation failed: ${reportError instanceof Error ? reportError.message : String(reportError)}`);
    }

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
