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
import { generateHtmlReport, writeHtmlReport, generateMarkdownReport, writeMarkdownReport, calculateHealthScore, prioritizeIssues } from '../reports/index.js';
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
}

export async function runAfterburn(options: AfterBurnOptions): Promise<AfterBurnResult> {
  // Defense in depth: validate inputs even if caller already validated
  const validatedTargetUrl = validateUrl(options.targetUrl);
  const validatedSourcePath = options.sourcePath ? validatePath(options.sourcePath, 'sourcePath') : undefined;
  const validatedMaxPages = validateMaxPages(options.maxPages);

  // Generate sessionId if not provided
  const sessionId = options.sessionId || crypto.randomUUID();

  // Create outputDir if it doesn't exist
  const outputDir = options.outputDir
    ? validatePath(options.outputDir, 'outputDir')
    : `./afterburn-reports/${Date.now()}`;
  await fs.ensureDir(outputDir);

  // Stage: browser check
  options.onProgress?.('browser', 'Checking browser installation...');

  try {
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

    // If no workflows (site had no discoverable forms, buttons, or links), return early
    if (discoveryResult.workflowPlans.length === 0) {
      options.onProgress?.('complete', 'No testable elements found on site - scan complete');
      return {
        healthScore: {
          overall: 100,
          label: 'good',
          breakdown: { workflows: 100, errors: 100, accessibility: 100, performance: 100 },
          checksPassed: 0,
          checksTotal: 0,
        },
        prioritizedIssues: [],
        totalIssues: 0,
        highPriorityCount: 0,
        mediumPriorityCount: 0,
        lowPriorityCount: 0,
        workflowsPassed: 0,
        workflowsTotal: 0,
        htmlReportPath: null,
        markdownReportPath: null,
        exitCode: 0,
        sessionId,
      };
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
    const executionResult = await executor.execute();

    // Stage: analysis
    options.onProgress?.('analysis', 'Analyzing results...');

    // Error diagnosis
    const diagnosedErrors = await analyzeErrors(executionResult);

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
    const uiAudits = await auditUI(executionResult);

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
    const prioritizedIssues = prioritizeIssues(diagnosedErrors, uiAudits, executionResult);

    let htmlReportPath: string | null = null;
    let markdownReportPath: string | null = null;

    try {
      // Generate HTML report (human-readable)
      const htmlReport = await generateHtmlReport(executionResult, analysisArtifact);
      htmlReportPath = path.join(outputDir, `report-${sessionId}.html`);
      await writeHtmlReport(htmlReport, htmlReportPath);

      // Generate Markdown report (AI-readable)
      const markdownReport = generateMarkdownReport(executionResult, analysisArtifact);
      markdownReportPath = path.join(outputDir, `report-${sessionId}.md`);
      await writeMarkdownReport(markdownReport, markdownReportPath);
    } catch (reportError) {
      // Report generation should not crash the pipeline - graceful degradation
      // Errors are logged by caller if needed
    }

    // Stage: complete
    options.onProgress?.('complete', 'Scan complete');

    // Calculate issue counts
    const highPriorityCount = prioritizedIssues.filter(i => i.priority === 'high').length;
    const mediumPriorityCount = prioritizedIssues.filter(i => i.priority === 'medium').length;
    const lowPriorityCount = prioritizedIssues.filter(i => i.priority === 'low').length;

    const workflowsPassed = executionResult.workflowResults.filter(w => w.overallStatus === 'passed').length;
    const workflowsTotal = executionResult.workflowResults.length;

    return {
      healthScore,
      prioritizedIssues,
      totalIssues: executionResult.totalIssues,
      highPriorityCount,
      mediumPriorityCount,
      lowPriorityCount,
      workflowsPassed,
      workflowsTotal,
      htmlReportPath,
      markdownReportPath,
      exitCode: executionResult.exitCode,
      sessionId,
    };

  } catch (error) {
    // Re-throw errors for caller to handle
    throw error;
  }
}
