// Tool definitions and handlers for scan_website
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { z } from 'zod';
import { runAfterburn } from '../core/engine.js';
import type { AfterBurnResult } from '../core/engine.js';
import { validatePublicUrl, validatePath, validateMaxPages } from '../core/validation.js';
import { sanitizeForMarkdownInline, redactSensitiveData, redactSensitiveUrl } from '../utils/sanitizer.js';

export function registerTools(server: McpServer): void {
  // Register scan_website tool
  server.registerTool(
    'scan_website',
    {
      description: 'Scan a website for broken workflows, errors, accessibility issues, and UI/UX problems. Returns both structured JSON data and a markdown summary.',
      inputSchema: z.object({
        url: z.string().describe('The target website URL to scan (required)'),
        source: z.string().optional().describe('Optional path to source code directory for source mapping'),
        email: z.string().optional().describe('Optional email for login workflow testing'),
        password: z.string().optional().describe('Optional password for login workflow testing'),
        outputDir: z.string().optional().describe('Optional custom output directory for reports'),
        maxPages: z.union([z.number(), z.string()]).optional().transform(val => {
          if (val === undefined || val === null) return undefined;
          if (typeof val === 'string') {
            const parsed = parseInt(val, 10);
            if (isNaN(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
              throw new Error(`Invalid maxPages value: "${val}". Must be a non-negative integer.`);
            }
            return parsed;
          }
          if (typeof val === 'number') {
            if (isNaN(val) || val < 0 || !Number.isInteger(val)) {
              throw new Error(`Invalid maxPages value: ${val}. Must be a non-negative integer.`);
            }
            return val;
          }
          return undefined;
        }).describe('Optional maximum number of pages to crawl (default: 50)')
      })
    },
    async (args, extra) => {
      try {
        // Security: validate all string inputs at the MCP boundary
        const validatedUrl = await validatePublicUrl(args.url);
        const validatedSource = args.source ? validatePath(args.source, 'source', process.cwd()) : undefined;
        const validatedOutputDir = args.outputDir ? validatePath(args.outputDir, 'outputDir', process.cwd()) : undefined;
        const validatedMaxPages = validateMaxPages(args.maxPages);

        // Track progress if client supports it
        const progressToken = extra._meta?.progressToken;
        const sendProgress = async (stage: string, message: string) => {
          if (progressToken && server.server) {
            try {
              await server.server.notification({
                method: 'notifications/progress',
                params: {
                  progressToken,
                  progress: 0, // MCP progress is 0-1, but we don't have precise percentages
                  total: 1,
                  message: `[${stage}] ${message}`
                }
              });
            } catch (err) {
              // Progress notifications are best-effort, don't fail on errors
              console.error('Failed to send progress notification:', err);
            }
          }
        };

        // Run Afterburn scan with validated inputs
        const result: AfterBurnResult = await runAfterburn({
          targetUrl: validatedUrl,
          sourcePath: validatedSource,
          email: args.email,
          password: args.password,
          outputDir: validatedOutputDir,
          maxPages: validatedMaxPages,
          onProgress: async (stage: string, message: string) => {
            await sendProgress(stage, message);
          }
        });

        // Build structured JSON response
        const structuredResult = {
          healthScore: result.healthScore.overall,
          healthLabel: result.healthScore.label,
          totalIssues: result.totalIssues,
          workflowsPassed: result.workflowsPassed,
          workflowsTotal: result.workflowsTotal,
          highPriorityIssues: result.highPriorityCount,
          mediumPriorityIssues: result.mediumPriorityCount,
          lowPriorityIssues: result.lowPriorityCount,
          issues: result.prioritizedIssues.slice(0, 20).map(issue => ({
            priority: issue.priority,
            category: issue.category,
            summary: redactSensitiveData(issue.summary),
            fix: redactSensitiveData(issue.fixSuggestion),
            location: redactSensitiveUrl(issue.location)
          })),
          reportPaths: {
            html: result.htmlReportPath,
            markdown: result.markdownReportPath
          },
          sessionId: result.sessionId
        };

        // Build markdown summary
        const markdownSummary = buildMarkdownSummary(result);

        // Return both JSON and markdown content blocks
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(structuredResult, null, 2)
            },
            {
              type: 'text',
              text: markdownSummary
            }
          ]
        };
      } catch (error) {
        // Return error as structured response - server stays responsive
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                isError: true,
                error: errorMessage,
                message: 'Scan failed. Check the error message for details.'
              }, null, 2)
            }
          ],
          isError: true
        };
      }
    }
  );
}

function buildMarkdownSummary(result: AfterBurnResult): string {
  const lines: string[] = [];

  lines.push('# Afterburn Scan Summary\n');
  lines.push(`**Health Score:** ${result.healthScore.overall}/100 (${result.healthScore.label})\n`);
  lines.push(`**Total Issues:** ${result.totalIssues}`);
  lines.push(`**Workflows:** ${result.workflowsPassed}/${result.workflowsTotal} passed\n`);

  if (result.totalIssues > 0) {
    lines.push('## Top Issues\n');
    const topIssues = result.prioritizedIssues.slice(0, 5);
    topIssues.forEach((issue, idx) => {
      lines.push(`### ${idx + 1}. [${issue.priority.toUpperCase()}] ${issue.category}`);
      lines.push(`**Problem:** ${redactSensitiveData(sanitizeForMarkdownInline(issue.summary))}`);
      lines.push(`**Fix:** ${redactSensitiveData(sanitizeForMarkdownInline(issue.fixSuggestion))}`);
      lines.push(`**Location:** ${sanitizeForMarkdownInline(redactSensitiveUrl(issue.location))}\n`);
    });
  } else {
    lines.push('## No Issues Found\n');
    lines.push('All workflows passed and no errors detected. Great job!\n');
  }

  if (result.htmlReportPath) {
    lines.push(`## Reports\n`);
    lines.push(`- **HTML Report:** ${result.htmlReportPath}`);
    if (result.markdownReportPath) {
      lines.push(`- **Markdown Report:** ${result.markdownReportPath}`);
    }
  }

  return lines.join('\n');
}
