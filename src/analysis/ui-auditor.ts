// Vision LLM-powered UI/UX auditor for screenshot analysis

import { GeminiClient } from '../ai/gemini-client.js';
import { ExecutionArtifact } from '../types/execution.js';
import { UIAuditSchema, UIAuditResult } from './diagnosis-schema.js';
import { redactSensitiveUrl } from '../utils/sanitizer.js';
import fs from 'node:fs';

/**
 * Main export: Audit UI/UX issues from screenshots in execution artifact
 */
export async function auditUI(
  artifact: ExecutionArtifact,
  options?: { apiKey?: string; aiEnabled?: boolean }
): Promise<UIAuditResult[]> {
  const apiKey = options?.apiKey || process.env.GEMINI_API_KEY;
  const aiEnabled = options?.aiEnabled ?? (apiKey ? true : false);

  if (!apiKey || !aiEnabled) {
    console.warn('UI auditing requires GEMINI_API_KEY and AI to be enabled. Skipping visual analysis.');
    return [];
  }

  // Extract screenshots from execution artifact
  const screenshots = extractScreenshots(artifact);

  if (screenshots.length === 0) {
    return [];
  }

  // Initialize Gemini client
  const gemini = new GeminiClient(apiKey);

  // Audit each screenshot
  const auditResults: UIAuditResult[] = [];

  for (const screenshot of screenshots) {
    try {
      const audit = await auditScreenshot(screenshot.pngPath, screenshot.url, gemini);
      auditResults.push(audit);
    } catch (error) {
      console.warn(`Failed to audit screenshot ${screenshot.pngPath}:`, error);
      // Continue with other screenshots
    }
  }

  return auditResults;
}

/**
 * Extract screenshots from execution artifact
 * Collects from workflowResults[].stepResults[].evidence?.screenshotRef
 */
function extractScreenshots(artifact: ExecutionArtifact): Array<{ url: string; pngPath: string }> {
  const screenshotMap = new Map<string, string>(); // pngPath -> url (deduplicate by path)

  for (const workflow of artifact.workflowResults) {
    for (const step of workflow.stepResults) {
      if (step.evidence?.screenshotRef) {
        const { pngPath } = step.evidence.screenshotRef;
        const { pageUrl } = step.evidence;

        // Deduplicate by path, verify file exists
        if (!screenshotMap.has(pngPath) && fs.existsSync(pngPath)) {
          screenshotMap.set(pngPath, pageUrl);
        }
      }
    }
  }

  // Convert map to array
  return Array.from(screenshotMap.entries()).map(([pngPath, url]) => ({
    url,
    pngPath,
  }));
}

/**
 * Audit a single screenshot using Gemini Vision LLM
 */
async function auditScreenshot(
  pngPath: string,
  pageUrl: string,
  gemini: GeminiClient
): Promise<UIAuditResult> {
  // Redact sensitive URL before sending to Gemini
  const safeUrl = redactSensitiveUrl(pageUrl);
  const prompt = buildVisionPrompt(safeUrl);

  // Call Gemini Vision API with structured output
  const audit = await gemini.generateStructuredWithImage(prompt, UIAuditSchema, pngPath);

  return {
    ...audit,
    pageUrl: safeUrl,
    screenshotRef: pngPath,
  };
}

/**
 * Build vision LLM prompt for UI auditing
 */
function buildVisionPrompt(pageUrl: string): string {
  const safeUrl = redactSensitiveUrl(pageUrl);
  return `You are a UI/UX expert reviewing a web page screenshot. Analyze it for visual issues.

Page URL: ${safeUrl}

Look for these specific issues:

1. LAYOUT ISSUES: Elements overlapping, cramped spacing, content cut off at edges,
   misaligned sections, inconsistent margins/padding, elements pushed off-screen

2. CONTRAST & READABILITY: Text hard to read against background, insufficient color
   contrast (WCAG AA requires 4.5:1 for normal text), tiny font sizes, light gray
   text on white background

3. FORMATTING ISSUES: Text truncated with "...", buttons too small to tap on mobile,
   inconsistent font sizes, broken grid layouts, images stretched or squished

4. IMPROVEMENT SUGGESTIONS: What would make this page better for users?
   Write suggestions in plain English as if explaining to someone who built this
   with AI tools and doesn't know CSS deeply.

Be specific about WHERE on the page each issue appears (top, bottom, left sidebar, etc).
Only report issues you are confident about. If the page looks fine, say so.`;
}
