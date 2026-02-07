#!/usr/bin/env node
// Main entry point with Phase 2 discovery + Phase 3 execution pipeline
import crypto from 'node:crypto';
import { ensureBrowserInstalled, withSpinner } from './cli/index.js';
import { runDiscovery } from './discovery/index.js';
import type { DiscoveryOptions } from './discovery/index.js';
import { WorkflowExecutor } from './execution/index.js';
import type { ExecutionOptions } from './execution/index.js';

async function main(): Promise<void> {
  console.log('Afterburn v0.1.0 - Automated Web Testing\n');

  // First-run browser check
  await ensureBrowserInstalled();

  // Get target URL from command line
  const targetUrl = process.argv[2];
  if (!targetUrl) {
    console.error('Usage: afterburn <url> [--flows "flow1, flow2, ..."] [--email <email>] [--password <password>]');
    console.error('Example: afterburn https://example.com');
    console.error('         afterburn https://example.com --flows "signup, checkout"');
    console.error('         afterburn https://example.com --email user@example.com --password secret123');
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
      console.log(`Total issues found: ${executionResult.totalIssues}\n`);

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
