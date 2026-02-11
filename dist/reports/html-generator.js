// Generate self-contained HTML report with Handlebars templates, inline CSS, and base64 screenshots
import Handlebars from 'handlebars';
import fs from 'fs-extra';
import sharp from 'sharp';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculateHealthScore } from './health-scorer.js';
import { prioritizeIssues, deduplicateIssues } from './priority-ranker.js';
import { redactSensitiveUrl, redactSensitiveData } from '../utils/sanitizer.js';
/**
 * Redact sensitive data from text before inserting into HTML reports.
 * Strips query params with sensitive keys, truncates stack traces, replaces file paths with basename.
 */
function redactSensitive(text) {
    if (!text)
        return text;
    let result = text;
    // Strip sensitive query params from URLs
    result = result.replace(/\b(https?:\/\/[^\s]+\?[^\s]*)/g, (url) => {
        try {
            const parsed = new URL(url);
            const sensitiveKeys = ['key', 'token', 'secret', 'password', 'auth', 'api', 'apikey', 'api_key', 'access_token', 'auth_token', 'session', 'jwt'];
            for (const key of sensitiveKeys) {
                if (parsed.searchParams.has(key)) {
                    parsed.searchParams.set(key, '[REDACTED]');
                }
            }
            return parsed.toString();
        }
        catch {
            return url;
        }
    });
    // Truncate stack traces to first 3 lines
    const lines = result.split('\n');
    if (lines.length > 3 && lines.some(line => line.match(/^\s*at\s+/))) {
        const stackStart = lines.findIndex(line => line.match(/^\s*at\s+/));
        if (stackStart >= 0 && lines.length > stackStart + 3) {
            result = lines.slice(0, stackStart + 3).join('\n') + '\n... (stack trace truncated)';
        }
    }
    // Replace full file paths with basename only (remove directory info)
    result = result.replace(/([A-Z]:[\/\\]|\/[^\/\s]+\/)[^\s:]+([\/\\][^\s:]+)/g, (match) => {
        const lastSep = Math.max(match.lastIndexOf('/'), match.lastIndexOf('\\'));
        return lastSep >= 0 ? match.substring(lastSep + 1) : match;
    });
    // Apply general sensitive data redaction
    result = redactSensitiveData(result);
    return result;
}
/**
 * Resolve template path with fallback for both compiled (dist/) and dev (src/) environments
 */
function resolveTemplatePath(relativePath) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    // From dist/reports/ -> ../../templates/ (compiled)
    const distPath = join(__dirname, '../../templates', relativePath);
    if (fs.existsSync(distPath))
        return distPath;
    // From src/reports/ -> ../../templates/ (tsx/dev - should also be ../../ from src/)
    const srcPath = join(__dirname, '../../templates', relativePath);
    if (fs.existsSync(srcPath))
        return srcPath;
    throw new Error(`Template not found: ${relativePath} (tried ${distPath} and ${srcPath})`);
}
/**
 * Load screenshot and convert to base64 data URI with size optimization
 */
async function loadScreenshotAsBase64(screenshotRef) {
    if (!screenshotRef)
        return undefined;
    try {
        // Check if file exists
        if (!fs.existsSync(screenshotRef)) {
            return undefined;
        }
        // Read and resize image to max 768px width (prevents base64 bloat)
        let buffer = await sharp(screenshotRef)
            .resize(768, undefined, { withoutEnlargement: true })
            .webp({ quality: 80, effort: 4, smartSubsample: true })
            .toBuffer();
        // If still > 100KB, reduce quality to 60
        if (buffer.length > 100 * 1024) {
            buffer = await sharp(screenshotRef)
                .resize(768, undefined, { withoutEnlargement: true })
                .webp({ quality: 60, effort: 4, smartSubsample: true })
                .toBuffer();
        }
        return `data:image/webp;base64,${buffer.toString('base64')}`;
    }
    catch (error) {
        // Graceful degradation on error
        console.warn(`Failed to load screenshot ${screenshotRef}:`, error);
        return undefined;
    }
}
/**
 * Generate self-contained HTML report with inline CSS and base64 screenshots
 */
export async function generateHtmlReport(executionArtifact, analysisArtifact) {
    // Calculate health score
    const healthScore = calculateHealthScore(executionArtifact);
    // Prioritize and deduplicate issues
    const prioritizedIssues = deduplicateIssues(prioritizeIssues(analysisArtifact.diagnosedErrors, analysisArtifact.uiAudits, executionArtifact));
    // Load screenshots for each prioritized issue that has a screenshotRef, and redact sensitive data
    const issuesWithScreenshots = await Promise.all(prioritizedIssues.map(async (issue) => ({
        ...issue,
        summary: redactSensitive(issue.summary),
        impact: redactSensitive(issue.impact || ''),
        fixSuggestion: redactSensitive(issue.fixSuggestion || ''),
        location: redactSensitive(issue.location),
        screenshotDataUri: await loadScreenshotAsBase64(issue.screenshotRef),
    })));
    // Load CSS from templates/styles/report.css
    const cssPath = resolveTemplatePath('styles/report.css');
    const cssContent = await fs.readFile(cssPath, 'utf-8');
    // Load template from templates/report.hbs
    const templatePath = resolveTemplatePath('report.hbs');
    const templateSource = await fs.readFile(templatePath, 'utf-8');
    // Register Handlebars helpers
    Handlebars.registerHelper('eq', function (a, b) {
        return a === b;
    });
    Handlebars.registerHelper('lt', function (a, b) {
        return a < b;
    });
    // Compile template
    const template = Handlebars.compile(templateSource);
    // Render with data (use ISO format for timestamp)
    const html = template({
        targetUrl: redactSensitiveUrl(executionArtifact.targetUrl),
        scanDate: new Date(executionArtifact.timestamp).toISOString(),
        healthScore,
        prioritizedIssues: issuesWithScreenshots,
        workflowResults: executionArtifact.workflowResults,
        pageAudits: executionArtifact.pageAudits,
        totalIssues: executionArtifact.totalIssues,
        aiPowered: analysisArtifact.aiPowered,
        sourceAnalysisAvailable: analysisArtifact.sourceAnalysisAvailable,
        inlineCSS: cssContent,
    });
    return html;
}
/**
 * Write HTML report to file
 */
export async function writeHtmlReport(html, outputPath) {
    // Ensure parent directory exists
    await fs.ensureDir(dirname(outputPath));
    // Write HTML string to file
    await fs.writeFile(outputPath, html, 'utf-8');
    console.log('HTML report saved: ' + outputPath);
}
//# sourceMappingURL=html-generator.js.map