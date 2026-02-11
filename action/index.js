// GitHub Action entry point — runs Afterburn and posts results
import * as core from '@actions/core';
import * as github from '@actions/github';
import { DefaultArtifactClient } from '@actions/artifact';
import { runAfterburn } from '../dist/core/index.js';
import { redactSensitiveData, sanitizeForMarkdownInline } from '../dist/utils/sanitizer.js';
/**
 * Build PR comment with health score and top issues
 */
function buildPRComment(result) {
    const healthLabel = result.healthScore.label === 'good' ? 'Good' :
        result.healthScore.label === 'needs-work' ? 'Needs Work' : 'Poor';
    let comment = `## Afterburn Test Results\n\n`;
    comment += `**Health Score:** ${result.healthScore.overall}/100 (${healthLabel})\n\n`;
    comment += `**Issues:** ${result.totalIssues} found (${result.highPriorityCount} high, ${result.mediumPriorityCount} medium, ${result.lowPriorityCount} low)\n\n`;
    // Show top 5 issues in a table
    if (result.prioritizedIssues.length > 0) {
        comment += `### Top Issues\n\n`;
        comment += `| Priority | Issue | Fix |\n`;
        comment += `|----------|-------|-----|\n`;
        const topIssues = result.prioritizedIssues.slice(0, 5);
        for (const issue of topIssues) {
            const priority = issue.priority.toUpperCase();
            const summary = sanitizeForMarkdownInline(issue.summary);
            const fix = sanitizeForMarkdownInline(issue.fixSuggestion);
            comment += `| ${priority} | ${summary} | ${fix} |\n`;
        }
        comment += `\n`;
    }
    comment += `---\n`;
    comment += `*Full reports available as workflow artifacts*\n`;
    comment += `*Powered by [Afterburn](https://github.com/gods-strongest-vibecoder/afterburn)*\n`;
    return comment;
}
/**
 * Main action entry point
 */
async function run() {
    try {
        // Read inputs
        const url = core.getInput('url', { required: true });
        const source = core.getInput('source') || undefined;
        const email = core.getInput('email') || undefined;
        const password = core.getInput('password') || undefined;
        const githubToken = core.getInput('github-token') || undefined;
        // Normalize failOn input (case-insensitive) and validate
        const failOnRaw = (core.getInput('fail-on') || 'high').toLowerCase().trim();
        const validFailOnValues = ['critical', 'high', 'medium', 'low', 'never'];
        if (!validFailOnValues.includes(failOnRaw)) {
            core.warning(`Invalid fail-on value: "${failOnRaw}". Defaulting to "critical". Valid values: ${validFailOnValues.join(', ')}`);
        }
        const failOn = validFailOnValues.includes(failOnRaw) ? failOnRaw : 'critical';
        core.info(`Testing ${url}...`);
        // Run Afterburn
        const result = await runAfterburn({
            targetUrl: url,
            sourcePath: source,
            email,
            password,
            outputDir: `./afterburn-reports/${Date.now()}`,
            onProgress: (stage, message) => {
                core.info(`[${stage}] ${message}`);
            },
        });
        // Set outputs
        core.setOutput('health-score', result.healthScore.overall.toString());
        core.setOutput('total-issues', result.totalIssues.toString());
        core.setOutput('high-issues', result.highPriorityCount.toString());
        // Upload artifacts
        const filesToUpload = [];
        if (result.htmlReportPath)
            filesToUpload.push(result.htmlReportPath);
        if (result.markdownReportPath)
            filesToUpload.push(result.markdownReportPath);
        if (filesToUpload.length > 0) {
            core.info('Uploading reports as artifacts...');
            const artifactClient = new DefaultArtifactClient();
            await artifactClient.uploadArtifact('afterburn-reports', filesToUpload, '.', {
                retentionDays: 7,
            });
            core.info('Reports uploaded successfully');
        }
        // Post PR comment if in PR context
        if (github.context.payload.pull_request && githubToken) {
            core.info('Posting PR comment...');
            const octokit = github.getOctokit(githubToken);
            const comment = redactSensitiveData(buildPRComment(result));
            await octokit.rest.issues.createComment({
                owner: github.context.repo.owner,
                repo: github.context.repo.repo,
                issue_number: github.context.payload.pull_request.number,
                body: comment,
            });
            core.info('PR comment posted successfully');
        }
        // Determine failure based on fail-on threshold
        let shouldFail = false;
        switch (failOn) {
            case 'critical':
            case 'high':
                shouldFail = result.highPriorityCount > 0;
                break;
            case 'medium':
                shouldFail = (result.highPriorityCount + result.mediumPriorityCount) > 0;
                break;
            case 'low':
                shouldFail = result.totalIssues > 0;
                break;
            case 'never':
                shouldFail = false;
                break;
        }
        if (shouldFail) {
            core.setFailed(`Afterburn found ${result.highPriorityCount} high-priority issues`);
        }
        else {
            core.info(`Scan complete! Health score: ${result.healthScore.overall}/100`);
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        core.setFailed(`Action failed: ${errorMessage}`);
    }
}
run();
