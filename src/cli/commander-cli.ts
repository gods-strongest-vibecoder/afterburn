// Commander.js CLI program definition with all flags and action handler

import { Command } from 'commander';
import { runAfterburn } from '../core/index.js';
import { ensureBrowserInstalled, createSpinner } from './index.js';
import type { Ora } from 'ora';

export const program = new Command();

program
  .name('afterburn')
  .description('Automated testing for vibe-coded websites')
  .version('0.1.0')
  .argument('<url>', 'URL to test')
  .option('--source <path>', 'Source code directory for pinpointing bugs')
  .option('--email <email>', 'Login email for authenticated testing')
  .option('--password <password>', 'Login password')
  .option('--output-dir <path>', 'Custom output directory (default: ./afterburn-reports/{timestamp})')
  .option('--flows <hints>', 'Comma-separated workflow hints (e.g., "signup, checkout")')
  .option('--max-pages <n>', 'Max pages to crawl (default: 0 = unlimited)', '0')
  .option('--no-headless', 'Show browser window (useful for debugging)')
  .option('--verbose', 'Show detailed progress output')
  .action(async (url: string, opts: {
    source?: string;
    email?: string;
    password?: string;
    outputDir?: string;
    flows?: string;
    maxPages: string;
    headless: boolean;
    verbose?: boolean;
  }) => {
    // First-run browser check
    await ensureBrowserInstalled();

    // Print banner
    console.log('Afterburn v0.1.0\n');

    // Create spinner for progress tracking
    let spinner: Ora | undefined;
    let currentStage = '';

    // Parse --flows flag
    const flowHints = opts.flows
      ? opts.flows.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;

    // Parse --max-pages flag (Commander passes string, convert to number)
    const maxPages = parseInt(opts.maxPages, 10);

    try {
      const result = await runAfterburn({
        targetUrl: url,
        sourcePath: opts.source,
        email: opts.email,
        password: opts.password,
        outputDir: opts.outputDir,
        flowHints,
        maxPages,
        headless: opts.headless,
        onProgress: (stage: string, message: string) => {
          // Map stage names to ora spinner text
          if (stage !== currentStage) {
            currentStage = stage;

            // Stop previous spinner if exists
            if (spinner) {
              spinner.succeed();
            }

            // Start new spinner for new stage (except 'complete')
            if (stage !== 'complete') {
              const spinnerText = {
                browser: 'Checking browser...',
                discovery: 'Crawling site...',
                execution: 'Testing workflows...',
                analysis: 'Analyzing results...',
                reporting: 'Generating reports...',
              }[stage] || message;

              spinner = createSpinner(spinnerText).start();
            }
          }

          // Verbose mode: show detailed messages
          if (opts.verbose && stage !== currentStage) {
            if (spinner) {
              spinner.text = message;
            }
          }
        },
      });

      // Complete spinner
      if (spinner) {
        spinner.succeed();
      }

      // Print one-liner summary
      console.log(`\nHealth: ${result.healthScore.overall}/100 — ${result.totalIssues} issues found (${result.highPriorityCount} high, ${result.mediumPriorityCount} medium, ${result.lowPriorityCount} low)`);

      // Print report paths if they exist
      if (result.htmlReportPath || result.markdownReportPath) {
        console.log('\nReports saved:');
        if (result.htmlReportPath) {
          console.log(`  HTML:     ${result.htmlReportPath}`);
        }
        if (result.markdownReportPath) {
          console.log(`  Markdown: ${result.markdownReportPath}`);
        }
      }

      console.log('');

      // Exit with code based on execution results
      process.exit(result.exitCode);

    } catch (error) {
      // Fail spinner if active
      if (spinner) {
        spinner.fail();
      }

      console.error('\n✗ Error:', error instanceof Error ? error.message : String(error));
      if (error instanceof Error && error.stack) {
        console.error('\nStack trace:');
        console.error(error.stack);
      }
      process.exit(1);
    }
  });
