// Commander.js CLI program definition with all flags and action handler

import { Command } from 'commander';
import { runAfterburn } from '../core/index.js';
import { ensureBrowserInstalled, createSpinner } from './index.js';
import { runDoctor, printDoctorResults } from './doctor.js';
import type { Ora } from 'ora';
import { getAfterburnVersion } from '../version.js';

export const program = new Command();
const appVersion = getAfterburnVersion();

program
  .name('afterburn')
  .description('Automated testing for vibe-coded websites')
  .version(appVersion)
  .showHelpAfterError(true)
  .argument('<url>', 'URL to test')
  .option('--source <path>', 'Source code directory for pinpointing bugs')
  .option('--email <email>', 'Login email (or set AFTERBURN_EMAIL env var)')
  .option('--password <password>', 'Login password (tip: use AFTERBURN_PASSWORD env var to avoid shell history exposure)')
  .option('--output-dir <path>', 'Custom output directory (default: ./afterburn-reports/{timestamp})')
  .option('--flows <hints>', 'Comma-separated workflow hints (e.g., "signup, checkout")')
  .option('--max-pages <n>', 'Max pages to crawl (default: 50, max: 500)', '50')
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
    // Resolve credentials: CLI flags take priority, env vars are fallback
    const email = opts.email || process.env.AFTERBURN_EMAIL;
    const password = opts.password || process.env.AFTERBURN_PASSWORD;

    // First-run browser check
    await ensureBrowserInstalled();

    // Print banner
    console.log(`Afterburn v${appVersion}\n`);

    // In verbose mode, show credential source without exposing actual values
    if (opts.verbose) {
      if (email) {
        const atIndex = email.indexOf('@');
        const masked = atIndex > 3
          ? email.substring(0, 3) + '***' + email.substring(atIndex)
          : '***' + email.substring(atIndex);
        console.log(`  Auth email: ${masked}`);
      }
      if (password) console.log(`  Auth password: ***`);
    }

    // Create spinner for progress tracking
    let spinner: Ora | undefined;
    let currentStage = '';

    // Parse --flows flag
    const flowHints = opts.flows
      ? opts.flows.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;

    // Parse --max-pages flag (Commander passes string, convert to number)
    // Validation happens in core/engine.ts via validateMaxPages
    const parsedMaxPages = parseInt(opts.maxPages, 10);
    const maxPages = isNaN(parsedMaxPages) ? undefined : parsedMaxPages;

    try {
      const result = await runAfterburn({
        targetUrl: url,
        sourcePath: opts.source,
        email,
        password,
        outputDir: opts.outputDir,
        flowHints,
        maxPages,
        headless: opts.headless,
        onProgress: (stage: string, message: string) => {
          // Detect stage change before updating currentStage
          const stageChanged = stage !== currentStage;

          // Map stage names to ora spinner text
          if (stageChanged) {
            currentStage = stage;

            // Stop previous spinner if exists
            if (spinner) {
              spinner.succeed();
              spinner = undefined;
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

          // Verbose mode: show detailed messages within same stage
          if (opts.verbose && !stageChanged) {
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

      // Print one-liner summary (ASCII-safe for Windows terminals)
      console.log(`\nHealth: ${result.healthScore.overall}/100 - ${result.totalIssues} issues found (${result.highPriorityCount} high, ${result.mediumPriorityCount} medium, ${result.lowPriorityCount} low)`);

      // Print issues grouped by page so the user sees which pages have problems
      if (result.prioritizedIssues.length > 0) {
        // Helper: extract pathname from a location string (full URL, possibly with "(and X other pages)" suffix)
        const extractPathname = (location: string): { pathname: string; suffix: string } => {
          // Check for "(and N other page(s))" suffix
          const otherPagesMatch = location.match(/^(.*?)\s*(\(and \d+ other pages?\))$/);
          const urlPart = otherPagesMatch ? otherPagesMatch[1].trim() : location;
          const suffix = otherPagesMatch ? ` ${otherPagesMatch[2]}` : '';
          try {
            const parsed = new URL(urlPart);
            return { pathname: parsed.pathname, suffix };
          } catch {
            // Not a valid URL — use as-is
            return { pathname: urlPart, suffix };
          }
        };

        // Group issues by page pathname (including suffix like "(and 2 other pages)")
        const pageGroups = new Map<string, { issues: typeof result.prioritizedIssues; highestPriority: number }>();
        const priorityRank = (p: string) => p === 'high' ? 0 : p === 'medium' ? 1 : 2;

        for (const issue of result.prioritizedIssues) {
          const { pathname, suffix } = extractPathname(issue.location);
          const key = pathname + suffix;
          const existing = pageGroups.get(key);
          if (existing) {
            existing.issues.push(issue);
            existing.highestPriority = Math.min(existing.highestPriority, priorityRank(issue.priority));
          } else {
            pageGroups.set(key, { issues: [issue], highestPriority: priorityRank(issue.priority) });
          }
        }

        // Sort groups: pages with highest-priority issues first, then by issue count descending
        const sortedGroups = [...pageGroups.entries()].sort((a, b) => {
          if (a[1].highestPriority !== b[1].highestPriority) return a[1].highestPriority - b[1].highestPriority;
          return b[1].issues.length - a[1].issues.length;
        });

        // Sort issues within each group by priority
        for (const [, group] of sortedGroups) {
          group.issues.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
        }

        // Determine how many groups/issues to show in terminal
        // Always show all HIGH and MEDIUM issues; truncate LOW-only groups if too many
        let lowOnlyGroupsShown = 0;
        const maxLowOnlyGroups = 3;
        let hiddenLowIssueCount = 0;

        for (const [pagePath, group] of sortedGroups) {
          const hasHighOrMed = group.issues.some(i => i.priority === 'high' || i.priority === 'medium');
          if (!hasHighOrMed) {
            lowOnlyGroupsShown++;
            if (lowOnlyGroupsShown > maxLowOnlyGroups) {
              hiddenLowIssueCount += group.issues.length;
              continue;
            }
          }

          const issueWord = group.issues.length === 1 ? 'issue' : 'issues';
          console.log(`\n${pagePath} (${group.issues.length} ${issueWord})`);

          for (const issue of group.issues) {
            const tag = issue.priority === 'high' ? '[HIGH]' : issue.priority === 'medium' ? '[MED] ' : '[LOW] ';
            // Truncate summary to keep lines readable (account for indent + tag)
            const maxSummaryLen = 88;
            const summary = issue.summary.length > maxSummaryLen
              ? issue.summary.slice(0, maxSummaryLen - 3) + '...'
              : issue.summary;
            console.log(`  ${tag} ${summary}`);
          }
        }

        if (hiddenLowIssueCount > 0) {
          console.log(`\n  ... and ${hiddenLowIssueCount} more low-priority issues (see report)`);
        }
      }

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

      console.error('\n[x] Error:', error instanceof Error ? error.message : String(error));
      if (opts.verbose && error instanceof Error && error.stack) {
        console.error('\nStack trace:');
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

// Doctor subcommand: pre-flight environment checks
program
  .command('doctor')
  .description('Check if your environment is ready to run Afterburn')
  .action(async () => {
    const { results, exitCode } = await runDoctor();
    printDoctorResults(results, exitCode);
    process.exit(exitCode);
  });
