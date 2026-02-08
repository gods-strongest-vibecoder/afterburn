// GitHub Action entry point — runs Afterburn and posts results
import * as core from '@actions/core';
import * as github from '@actions/github';
import { DefaultArtifactClient } from '@actions/artifact';
import { runAfterburn } from '../dist/core/index.js';
import type { AfterBurnResult } from '../dist/core/index.js';

/**
 * Redact sensitive data from PR comments as defense-in-depth.
 * Duplicated from src/utils/sanitizer.ts because action/ has its own tsconfig
 * and imports from dist/, not src/.
 */
function redactSensitiveData(text: string): string {
  if (!text) return text;
  let r = text;
  r = r.replace(/\b(sk-[a-zA-Z0-9]{20,})/g, '[REDACTED_API_KEY]');
  r = r.replace(/\b(ghp_|ghu_|gho_|ghs_)[a-zA-Z0-9]{36,}/g, '[REDACTED_GITHUB_TOKEN]');
  r = r.replace(/\b(github_pat_[a-zA-Z0-9_]{22,})/g, '[REDACTED_GITHUB_TOKEN]');
  r = r.replace(/\b(AKIA[0-9A-Z]{16})/g, '[REDACTED_AWS_KEY]');
  r = r.replace(/\b(sk-ant-[a-zA-Z0-9-]{20,})/g, '[REDACTED_API_KEY]');
  r = r.replace(/\b(sk_live_|sk_test_|rk_live_|rk_test_)[a-zA-Z0-9]{20,}/g, '[REDACTED_STRIPE_KEY]');
  r = r.replace(/(Bearer\s+)[a-zA-Z0-9._\-]{20,}/gi, '$1[REDACTED_TOKEN]');
  r = r.replace(/((?:password|passwd|secret|token|apikey|api_key|access_token|auth_token)\s*[=:]\s*)("[^"]*"|'[^']*'|\S{8,})/gi, '$1[REDACTED]');
  r = r.replace(/\b[0-9a-f]{40,}\b/gi, '[REDACTED_HEX_TOKEN]');
  return r;
}

/**
 * Build PR comment with health score and top issues
 */
function buildPRComment(result: AfterBurnResult): string {
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
      const summary = issue.summary.replace(/\|/g, '\\|'); // Escape pipes
      const fix = issue.fixSuggestion.replace(/\|/g, '\\|');
      comment += `| ${priority} | ${summary} | ${fix} |\n`;
    }
    comment += `\n`;
  }

  comment += `---\n`;
  comment += `*Full reports available as workflow artifacts*\n`;
  comment += `*Powered by [Afterburn](https://github.com/user/afterburn)*\n`;

  return comment;
}

/**
 * Main action entry point
 */
async function run(): Promise<void> {
  try {
    // Read inputs
    const url = core.getInput('url', { required: true });
    const source = core.getInput('source') || undefined;
    const email = core.getInput('email') || undefined;
    const password = core.getInput('password') || undefined;
    const githubToken = core.getInput('github-token') || undefined;
    const failOn = core.getInput('fail-on') || 'high';

    core.info(`Testing ${url}...`);

    // Run Afterburn
    const result = await runAfterburn({
      targetUrl: url,
      sourcePath: source,
      email,
      password,
      outputDir: `./afterburn-reports/${Date.now()}`,
      onProgress: (stage: string, message: string) => {
        core.info(`[${stage}] ${message}`);
      },
    });

    // Set outputs
    core.setOutput('health-score', result.healthScore.overall.toString());
    core.setOutput('total-issues', result.totalIssues.toString());
    core.setOutput('high-issues', result.highPriorityCount.toString());

    // Upload artifacts
    const filesToUpload: string[] = [];
    if (result.htmlReportPath) filesToUpload.push(result.htmlReportPath);
    if (result.markdownReportPath) filesToUpload.push(result.markdownReportPath);

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
    if (failOn === 'high' && result.highPriorityCount > 0) {
      shouldFail = true;
    } else if (failOn === 'medium' && (result.highPriorityCount + result.mediumPriorityCount) > 0) {
      shouldFail = true;
    } else if (failOn === 'low' && result.totalIssues > 0) {
      shouldFail = true;
    }
    // failOn === 'never' never fails

    if (shouldFail) {
      core.setFailed(`Afterburn found ${result.highPriorityCount} high-priority issues`);
    } else {
      core.info(`Scan complete! Health score: ${result.healthScore.overall}/100`);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    core.setFailed(`Action failed: ${errorMessage}`);
  }
}

run();
