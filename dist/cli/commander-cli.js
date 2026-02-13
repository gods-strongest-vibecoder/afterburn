// Commander.js CLI program definition with all flags and action handler
import { Command } from 'commander';
import { runAfterburn } from '../core/index.js';
import { ensureBrowserInstalled, createSpinner } from './index.js';
import { runDoctor, printDoctorResults } from './doctor.js';
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
    .action(async (url, opts) => {
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
        if (password)
            console.log(`  Auth password: ***`);
    }
    // Create spinner for progress tracking
    let spinner;
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
            onProgress: (stage, message) => {
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
        // Print top 3 issues in terminal so the user sees value immediately
        if (result.prioritizedIssues.length > 0) {
            console.log('\nTop issues:');
            const topIssues = result.prioritizedIssues.slice(0, 3);
            for (let i = 0; i < topIssues.length; i++) {
                const issue = topIssues[i];
                const priorityTag = issue.priority === 'high' ? '[HIGH]' : issue.priority === 'medium' ? '[MED]' : '[LOW]';
                // Truncate summary for terminal readability
                const summary = issue.summary.length > 80 ? issue.summary.slice(0, 77) + '...' : issue.summary;
                console.log(`  ${i + 1}. ${priorityTag} ${summary}`);
            }
            if (result.prioritizedIssues.length > 3) {
                console.log(`  ... and ${result.prioritizedIssues.length - 3} more (see report)`);
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
    }
    catch (error) {
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
//# sourceMappingURL=commander-cli.js.map