#!/usr/bin/env node
// Main entry point with Phase 2 discovery + Phase 3 execution + Phase 4 analysis + Phase 5 reporting pipeline
import crypto from 'node:crypto';
import { ensureBrowserInstalled, withSpinner } from './cli/index.js';
import { runDiscovery } from './discovery/index.js';
import type { DiscoveryOptions } from './discovery/index.js';
import { WorkflowExecutor } from './execution/index.js';
import type { ExecutionOptions } from './execution/index.js';
import { analyzeErrors, auditUI, mapErrorToSource } from './analysis/index.js';
import type { AnalysisArtifact } from './analysis/index.js';
import { ArtifactStorage } from './artifacts/index.js';
import { generateHtmlReport, writeHtmlReport, generateMarkdownReport, writeMarkdownReport } from './reports/index.js';

async function main(): Promise<void> {
  console.log('Afterburn v0.1.0 - Automated Web Testing\n');

  // First-run browser check
  await ensureBrowserInstalled();

  // Get target URL from command line
  const targetUrl = process.argv[2];
  if (!targetUrl) {
    console.error('Usage: afterburn <url> [--flows "flow1, flow2, ..."] [--email <email>] [--password <password>] [--source ./path]');
    console.error('Example: afterburn https://example.com');
    console.error('         afterburn https://example.com --flows "signup, checkout"');
    console.error('         afterburn https://example.com --email user@example.com --password secret123');
    console.error('         afterburn https://example.com --source ./src');
    process.exit(1);
  }

  // Parse --flows flag
  let flowHints: string[] = [];
  const flowsIndex = process.argv.indexOf('--flows');
  if (flowsIndex !== -1 && process.argv[flowsIndex + 1]) {
    const flowsArg = process.argv[flowsIndex + 1];
    flowHints = flowsArg.split(',').map(hint => hint.trim()).filter(Boolean);
  }

  // Parse --email and --password flags
  let email: string | undefined;
  let password: string | undefined;
  const emailIndex = process.argv.indexOf('--email');
  if (emailIndex !== -1 && process.argv[emailIndex + 1]) {
    email = process.argv[emailIndex + 1];
  }
  const passwordIndex = process.argv.indexOf('--password');
  if (passwordIndex !== -1 && process.argv[passwordIndex + 1]) {
    password = process.argv[passwordIndex + 1];
  }

  // Parse --source flag
  let sourcePath: string | undefined;
  const sourceIndex = process.argv.indexOf('--source');
  if (sourceIndex !== -1 && process.argv[sourceIndex + 1]) {
    sourcePath = process.argv[sourceIndex + 1];
  }

  // Generate session ID
  const sessionId = crypto.randomUUID();

  try {
    // Run Phase 2 discovery pipeline
    console.log('Starting discovery...\n');

    const discoveryOptions: DiscoveryOptions = {
      targetUrl,
      sessionId,
      userHints: flowHints,
      maxPages: 0,  // unlimited
      onProgress: (msg: string) => console.log(`  ${msg}`),
    };

    const result = await runDiscovery(discoveryOptions);

    // Print summary
    console.log('\n✓ Discovery Complete!');
    console.log(`  Session ID: ${sessionId}`);
    console.log(`  Pages found: ${result.crawlResult.totalPagesDiscovered}`);

    // Count interactive elements across all pages
    const totalForms = result.crawlResult.pages.reduce((sum, p) => sum + p.forms.length, 0);
    const totalButtons = result.crawlResult.pages.reduce((sum, p) => sum + p.buttons.length, 0);
    const totalLinks = result.crawlResult.pages.reduce((sum, p) => sum + p.links.length, 0);

    console.log(`  Interactive elements: ${totalForms} forms, ${totalButtons} buttons, ${totalLinks} links`);
    console.log(`  Broken links: ${result.crawlResult.brokenLinks.length} found`);

    const spaInfo = result.crawlResult.spaDetected.framework !== 'none'
      ? `${result.crawlResult.spaDetected.framework}${result.crawlResult.spaDetected.version ? ' v' + result.crawlResult.spaDetected.version : ''}`
      : 'None detected';
    console.log(`  SPA framework: ${spaInfo}`);

    console.log(`  Workflow plans: ${result.workflowPlans.length} generated`);

    // Print broken links if any
    if (result.crawlResult.brokenLinks.length > 0) {
      console.log('\nBroken Links:');
      result.crawlResult.brokenLinks.slice(0, 10).forEach(link => {
        console.log(`  ✗ ${link.url} (${link.statusCode}${link.statusText ? ' - ' + link.statusText : ''})`);
        console.log(`    Found on: ${link.sourceUrl}`);
      });

      if (result.crawlResult.brokenLinks.length > 10) {
        console.log(`  ... and ${result.crawlResult.brokenLinks.length - 10} more`);
      }
    }

    // Print workflows
    if (result.workflowPlans.length > 0) {
      console.log('\nWorkflows:');
      result.workflowPlans.forEach((plan, index) => {
        const source = plan.source === 'user-hint' ? ' [user-specified]' : '';
        console.log(`  ${index + 1}. ${plan.workflowName} (${plan.priority})${source} - ${plan.steps.length} steps`);
      });
    }

    console.log(`\nArtifact saved: .afterburn/artifacts/discovery-${sessionId}.json\n`);

    // Phase 3: Execute workflow plans if any exist
    if (result.workflowPlans.length > 0) {
      console.log('Starting workflow execution...\n');

      const executionOptions: ExecutionOptions = {
        targetUrl,
        sessionId,
        workflowPlans: result.workflowPlans,
        email,
        password,
        onProgress: (msg: string) => console.log(msg),
      };

      const executor = new WorkflowExecutor(executionOptions);
      const executionResult = await executor.execute();

      // Print execution summary
      console.log('\n✓ Execution Complete!');
      console.log(`  Workflows executed: ${executionResult.workflowResults.length}`);

      // Count passed/failed workflows
      const passedWorkflows = executionResult.workflowResults.filter(w => w.overallStatus === 'passed').length;
      const failedWorkflows = executionResult.workflowResults.filter(w => w.overallStatus === 'failed').length;

      console.log(`  Status: ${passedWorkflows} passed, ${failedWorkflows} failed`);

      // Count total issues
      const totalConsoleErrors = executionResult.workflowResults.reduce((sum, w) => sum + w.errors.consoleErrors.length, 0);
      const totalNetworkFailures = executionResult.workflowResults.reduce((sum, w) => sum + w.errors.networkFailures.length, 0);
      const totalBrokenImages = executionResult.workflowResults.reduce((sum, w) => sum + w.errors.brokenImages.length, 0);

      console.log(`  Errors detected: ${totalConsoleErrors} console, ${totalNetworkFailures} network, ${totalBrokenImages} broken images`);
      console.log(`  Dead buttons: ${executionResult.deadButtons.filter(b => b.isDead).length}`);
      console.log(`  Broken forms: ${executionResult.brokenForms.filter(f => f.isBroken).length}`);

      // Count accessibility violations
      const criticalViolations = executionResult.pageAudits.reduce((sum, audit) => {
        if (!audit.accessibility) return sum;
        return sum + audit.accessibility.violations.filter(v => v.impact === 'critical').length;
      }, 0);
      const seriousViolations = executionResult.pageAudits.reduce((sum, audit) => {
        if (!audit.accessibility) return sum;
        return sum + audit.accessibility.violations.filter(v => v.impact === 'serious').length;
      }, 0);

      console.log(`  Accessibility: ${criticalViolations} critical, ${seriousViolations} serious violations`);
      console.log(`  Performance: ${executionResult.pageAudits.length} pages audited`);

      console.log(`\nExecution artifact saved: .afterburn/artifacts/execution-${sessionId}.json`);
      console.log(`Total issues found: ${executionResult.totalIssues}`);

      // Phase 4: Analyze execution results
      console.log('\nStarting analysis...\n');

      // Error diagnosis
      const diagnosedErrors = await analyzeErrors(executionResult);

      // Source code mapping (if --source provided)
      if (sourcePath) {
        console.log(`  Cross-referencing with source code: ${sourcePath}`);
        for (const diagnosed of diagnosedErrors) {
          const sourceLocation = await mapErrorToSource(diagnosed.originalError, sourcePath);
          if (sourceLocation) {
            diagnosed.sourceLocation = sourceLocation;
          }
        }
      }

      // UI auditing (vision analysis of screenshots from execution)
      const uiAudits = await auditUI(executionResult);

      // Print analysis summary
      const aiPowered = !!process.env.GEMINI_API_KEY;
      console.log('\n--- Analysis Complete ---');
      console.log(`  Mode: ${aiPowered ? 'AI-powered (Gemini)' : 'Basic (set GEMINI_API_KEY for AI diagnosis)'}`);
      console.log(`  Errors diagnosed: ${diagnosedErrors.length}`);
      console.log(`  UI audits: ${uiAudits.length} screenshots analyzed`);
      if (sourcePath) {
        const withSource = diagnosedErrors.filter(d => d.sourceLocation).length;
        console.log(`  Source pinpointed: ${withSource}/${diagnosedErrors.length} errors`);
      }

      // Print top diagnosed errors (up to 5)
      if (diagnosedErrors.length > 0) {
        console.log('\nTop Issues:');
        diagnosedErrors.slice(0, 5).forEach((d, i) => {
          console.log(`  ${i + 1}. ${d.summary}`);
          console.log(`     Fix: ${d.suggestedFix}`);
          if (d.sourceLocation) {
            console.log(`     Location: ${d.sourceLocation.file}:${d.sourceLocation.line}`);
          }
        });
      }

      // Save analysis artifact
      const analysisArtifact: AnalysisArtifact = {
        version: '1.0.0',
        stage: 'analysis',
        timestamp: new Date().toISOString(),
        sessionId,
        diagnosedErrors,
        uiAudits,
        sourceAnalysisAvailable: !!sourcePath,
        aiPowered,
      };

      const artifactStorage = new ArtifactStorage();
      await artifactStorage.save(analysisArtifact);
      console.log(`\nAnalysis artifact saved: .afterburn/artifacts/analysis-${sessionId}.json\n`);

      // Phase 5: Generate reports
      console.log('Generating reports...\n');

      try {
        // Generate HTML report (human-readable)
        const htmlReport = await generateHtmlReport(executionResult, analysisArtifact);
        const htmlPath = `.afterburn/reports/report-${sessionId}.html`;
        await writeHtmlReport(htmlReport, htmlPath);

        // Generate Markdown report (AI-readable)
        const markdownReport = generateMarkdownReport(executionResult, analysisArtifact);
        const mdPath = `.afterburn/reports/report-${sessionId}.md`;
        await writeMarkdownReport(markdownReport, mdPath);

        console.log('Reports generated:');
        console.log(`  HTML (human): ${htmlPath}`);
        console.log(`  Markdown (AI): ${mdPath}`);
      } catch (reportError) {
        // Report generation should not crash the pipeline
        console.error('Warning: Report generation failed:', reportError instanceof Error ? reportError.message : String(reportError));
        console.error('Test results are still available in execution and analysis artifacts.');
      }

      console.log('');

      // Exit with code based on execution results
      process.exit(executionResult.exitCode);
    } else {
      console.log('No workflow plans to execute.\n');
      process.exit(0);
    }

  } catch (error) {
    console.error('\n✗ Error:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
