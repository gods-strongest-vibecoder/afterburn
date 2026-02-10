// Core pipeline engine - reusable function for CLI, MCP, and GitHub Action interfaces
import crypto from 'node:crypto';
import fs from 'fs-extra';
import path from 'node:path';
import { runDiscovery } from '../discovery/index.js';
import { WorkflowExecutor } from '../execution/index.js';
import { analyzeErrors, auditUI, mapErrorToSource } from '../analysis/index.js';
import { ArtifactStorage } from '../artifacts/index.js';
import { generateHtmlReport, writeHtmlReport, generateMarkdownReport, writeMarkdownReport, calculateHealthScore, prioritizeIssues, deduplicateIssues } from '../reports/index.js';
import { validateUrl, validatePath, validateMaxPages } from './validation.js';
// Hard timeout to prevent the pipeline from hanging forever on unresponsive sites
const PIPELINE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
/**
 * Kill all Chromium processes spawned by Playwright.
 * Called on timeout to prevent zombie browser processes.
 */
async function killChromiumProcesses() {
    try {
        const { exec } = await import('node:child_process');
        const { promisify } = await import('node:util');
        const execAsync = promisify(exec);
        // Platform-aware: taskkill on Windows, pkill on Unix
        if (process.platform === 'win32') {
            await execAsync('taskkill /F /IM chromium.exe /T 2>nul').catch(() => { });
            await execAsync('taskkill /F /IM chrome.exe /T 2>nul').catch(() => { });
        }
        else {
            await execAsync('pkill -f chromium 2>/dev/null').catch(() => { });
            await execAsync('pkill -f chrome 2>/dev/null').catch(() => { });
        }
    }
    catch {
        // Best-effort cleanup -- don't crash if kill fails
    }
}
export async function runAfterburn(options) {
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
    // Wrap the entire pipeline in a timeout to prevent infinite hangs
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(async () => {
            // Clean up zombie browser processes before rejecting
            await killChromiumProcesses();
            reject(new Error('Scan timed out after 5 minutes. Try with --max-pages 5 for a faster scan.'));
        }, PIPELINE_TIMEOUT_MS);
    });
    try {
        const result = await Promise.race([runPipeline(options, validatedTargetUrl, validatedSourcePath, validatedMaxPages, sessionId, outputDir), timeoutPromise]);
        clearTimeout(timeoutId);
        return result;
    }
    catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}
async function runPipeline(options, validatedTargetUrl, validatedSourcePath, validatedMaxPages, sessionId, outputDir) {
    // Stage: browser check
    options.onProgress?.('browser', 'Checking browser installation...');
    try {
        // Stage: discovery
        options.onProgress?.('discovery', 'Crawling site and discovering workflows...');
        const discoveryOptions = {
            targetUrl: validatedTargetUrl,
            sessionId,
            userHints: options.flowHints || [],
            maxPages: validatedMaxPages,
            headless: options.headless ?? true,
            onProgress: (msg) => {
                // Pass discovery progress messages through
                options.onProgress?.('discovery', msg);
            },
        };
        const discoveryResult = await runDiscovery(discoveryOptions);
        // If no workflows (site had no discoverable forms, buttons, or links), return early
        // Don't report 100/good — a site with nothing testable is suspicious, not healthy
        if (discoveryResult.workflowPlans.length === 0) {
            options.onProgress?.('complete', 'No testable elements found on site — may be empty, under maintenance, or blocking automated access');
            return {
                healthScore: {
                    overall: 0,
                    label: 'poor',
                    breakdown: { workflows: 0, errors: 100, accessibility: 100, performance: 100 },
                    checksPassed: 0,
                    checksTotal: 0,
                },
                prioritizedIssues: [{
                        priority: 'high',
                        category: 'No Testable Content',
                        summary: 'No forms, buttons, or interactive elements found on the site',
                        impact: 'Afterburn could not test anything — the site may be empty, under maintenance, or blocking automated access',
                        fixSuggestion: 'Verify the site loads correctly in a browser. If the site uses anti-bot protection, results may be incomplete.',
                        location: validatedTargetUrl,
                    }],
                totalIssues: 1,
                highPriorityCount: 1,
                mediumPriorityCount: 0,
                lowPriorityCount: 0,
                workflowsPassed: 0,
                workflowsTotal: 0,
                htmlReportPath: null,
                markdownReportPath: null,
                exitCode: 1,
                sessionId,
            };
        }
        // Stage: execution
        options.onProgress?.('execution', 'Testing workflows...');
        const executionOptions = {
            targetUrl: validatedTargetUrl,
            sessionId,
            workflowPlans: discoveryResult.workflowPlans,
            email: options.email,
            password: options.password,
            headless: options.headless ?? true,
            onProgress: (msg) => {
                // Pass execution progress messages through
                options.onProgress?.('execution', msg);
            },
        };
        const executor = new WorkflowExecutor(executionOptions);
        const executionResult = await executor.execute();
        // Thread broken links from discovery into execution artifact
        // (Discovery finds them during crawl, but executor doesn't re-check them)
        if (discoveryResult.crawlResult?.brokenLinks?.length > 0) {
            executionResult.brokenLinks = discoveryResult.crawlResult.brokenLinks.map(bl => ({
                url: bl.url,
                sourceUrl: bl.sourceUrl,
                statusCode: bl.statusCode,
                statusText: bl.statusText,
            }));
        }
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
        const analysisArtifact = {
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
        const prioritizedIssues = deduplicateIssues(prioritizeIssues(diagnosedErrors, uiAudits, executionResult));
        let htmlReportPath = null;
        let markdownReportPath = null;
        try {
            // Generate HTML report (human-readable)
            const htmlReport = await generateHtmlReport(executionResult, analysisArtifact);
            htmlReportPath = path.join(outputDir, `report-${sessionId}.html`);
            await writeHtmlReport(htmlReport, htmlReportPath);
            // Generate Markdown report (AI-readable)
            const markdownReport = generateMarkdownReport(executionResult, analysisArtifact);
            markdownReportPath = path.join(outputDir, `report-${sessionId}.md`);
            await writeMarkdownReport(markdownReport, markdownReportPath);
        }
        catch (reportError) {
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
        };
    }
    catch (error) {
        // Re-throw errors for caller to handle
        throw error;
    }
}
//# sourceMappingURL=engine.js.map