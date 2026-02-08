// Generate self-contained HTML report with Handlebars templates, inline CSS, and base64 screenshots

import Handlebars from 'handlebars';
import fs from 'fs-extra';
import sharp from 'sharp';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculateHealthScore } from './health-scorer.js';
import { prioritizeIssues, deduplicateIssues } from './priority-ranker.js';
import type { ExecutionArtifact } from '../types/execution.js';
import type { AnalysisArtifact } from '../analysis/diagnosis-schema.js';

/**
 * Resolve template path with fallback for both compiled (dist/) and dev (src/) environments
 */
function resolveTemplatePath(relativePath: string): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  // From dist/reports/ -> ../../templates/ (compiled)
  const distPath = join(__dirname, '../../templates', relativePath);
  if (fs.existsSync(distPath)) return distPath;

  // From src/reports/ -> ../../templates/ (tsx/dev - should also be ../../ from src/)
  const srcPath = join(__dirname, '../../templates', relativePath);
  if (fs.existsSync(srcPath)) return srcPath;

  throw new Error(`Template not found: ${relativePath} (tried ${distPath} and ${srcPath})`);
}

/**
 * Load screenshot and convert to base64 data URI with size optimization
 */
async function loadScreenshotAsBase64(screenshotRef: string | undefined): Promise<string | undefined> {
  if (!screenshotRef) return undefined;

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
  } catch (error) {
    // Graceful degradation on error
    console.warn(`Failed to load screenshot ${screenshotRef}:`, error);
    return undefined;
  }
}

/**
 * Generate self-contained HTML report with inline CSS and base64 screenshots
 */
export async function generateHtmlReport(
  executionArtifact: ExecutionArtifact,
  analysisArtifact: AnalysisArtifact
): Promise<string> {
  // Calculate health score
  const healthScore = calculateHealthScore(executionArtifact);

  // Prioritize and deduplicate issues
  const prioritizedIssues = deduplicateIssues(
    prioritizeIssues(
      analysisArtifact.diagnosedErrors,
      analysisArtifact.uiAudits,
      executionArtifact
    )
  );

  // Load screenshots for each prioritized issue that has a screenshotRef
  const issuesWithScreenshots = await Promise.all(
    prioritizedIssues.map(async (issue) => ({
      ...issue,
      screenshotDataUri: await loadScreenshotAsBase64(issue.screenshotRef),
    }))
  );

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

  // Render with data
  const html = template({
    targetUrl: executionArtifact.targetUrl,
    scanDate: new Date(executionArtifact.timestamp).toLocaleString(),
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
export async function writeHtmlReport(html: string, outputPath: string): Promise<void> {
  // Ensure parent directory exists
  await fs.ensureDir(dirname(outputPath));

  // Write HTML string to file
  await fs.writeFile(outputPath, html, 'utf-8');

  console.log('HTML report saved: ' + outputPath);
}
