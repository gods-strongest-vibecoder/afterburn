#!/usr/bin/env node
// Main entry point with Phase 2 discovery pipeline
import crypto from 'node:crypto';
import { ensureBrowserInstalled, withSpinner } from './cli/index.js';
import { runDiscovery } from './discovery/index.js';
import type { DiscoveryOptions } from './discovery/index.js';

async function main(): Promise<void> {
  console.log('Afterburn v0.1.0 - Automated Web Testing\n');

  // First-run browser check
  await ensureBrowserInstalled();

  // Get target URL from command line
  const targetUrl = process.argv[2];
  if (!targetUrl) {
    console.error('Usage: afterburn <url> [--flows "flow1, flow2, ..."]');
    console.error('Example: afterburn https://example.com');
    console.error('         afterburn https://example.com --flows "signup, checkout"');
    process.exit(1);
  }

  // Parse --flows flag
  let flowHints: string[] = [];
  const flowsIndex = process.argv.indexOf('--flows');
  if (flowsIndex !== -1 && process.argv[flowsIndex + 1]) {
    const flowsArg = process.argv[flowsIndex + 1];
    flowHints = flowsArg.split(',').map(hint => hint.trim()).filter(Boolean);
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
