import { beforeEach, describe, expect, it, vi } from 'vitest';

const { runAfterburnMock } = vi.hoisted(() => ({
  runAfterburnMock: vi.fn(),
}));

vi.mock('../../src/core/engine.js', () => ({
  runAfterburn: runAfterburnMock,
}));

import { registerTools } from '../../src/mcp/tools.js';

interface RegisteredTool {
  name: string;
  config: { inputSchema: { parse: (input: unknown) => any } };
  handler: (args: any, extra: any) => Promise<any>;
}

function registerScanWebsiteTool(): RegisteredTool {
  let registered: RegisteredTool | null = null;

  const mockServer = {
    server: null,
    registerTool: (name: string, config: any, handler: any) => {
      registered = { name, config, handler };
    },
  } as any;

  registerTools(mockServer);

  if (!registered) {
    throw new Error('scan_website tool was not registered');
  }

  return registered;
}

describe('MCP tool contract', () => {
  beforeEach(() => {
    runAfterburnMock.mockReset();
  });

  it('registers scan_website with maxPages integer-only validation', () => {
    const tool = registerScanWebsiteTool();

    expect(tool.name).toBe('scan_website');
    expect(tool.config.inputSchema.parse({ url: 'https://8.8.8.8', maxPages: '7' }).maxPages).toBe(7);
    expect(tool.config.inputSchema.parse({ url: 'https://8.8.8.8', maxPages: 9 }).maxPages).toBe(9);

    expect(() => tool.config.inputSchema.parse({ url: 'https://8.8.8.8', maxPages: '3.14' })).toThrow();
    expect(() => tool.config.inputSchema.parse({ url: 'https://8.8.8.8', maxPages: '-1' })).toThrow();
    expect(() => tool.config.inputSchema.parse({ url: 'https://8.8.8.8', maxPages: '10abc' })).toThrow();
  });

  it('returns both structured JSON and markdown summary blocks', async () => {
    runAfterburnMock.mockResolvedValue({
      healthScore: { overall: 88, label: 'good' },
      prioritizedIssues: [
        {
          priority: 'high',
          category: 'Workflow Error',
          summary: 'Checkout button fails',
          impact: 'Checkout is broken',
          fixSuggestion: 'Fix click handler',
          location: 'https://8.8.8.8/checkout',
        },
      ],
      totalIssues: 1,
      highPriorityCount: 1,
      mediumPriorityCount: 0,
      lowPriorityCount: 0,
      workflowsPassed: 2,
      workflowsTotal: 3,
      htmlReportPath: 'afterburn-reports/123/report.html',
      markdownReportPath: 'afterburn-reports/123/report.md',
      exitCode: 1,
      sessionId: 'session-123',
    });

    const tool = registerScanWebsiteTool();
    const response = await tool.handler({ url: 'https://8.8.8.8' }, { _meta: {} });

    expect(response.isError).toBeUndefined();
    expect(Array.isArray(response.content)).toBe(true);
    expect(response.content).toHaveLength(2);

    const structured = JSON.parse(response.content[0].text);
    expect(structured.healthScore).toBe(88);
    expect(structured.totalIssues).toBe(1);
    expect(structured.reportPaths.html).toContain('report.html');
    expect(response.content[1].text).toContain('# Afterburn Scan Summary');
  });

  it('returns structured errors when scan fails', async () => {
    runAfterburnMock.mockRejectedValue(new Error('simulated scan failure'));

    const tool = registerScanWebsiteTool();
    const response = await tool.handler({ url: 'https://8.8.8.8' }, { _meta: {} });

    expect(response.isError).toBe(true);
    const payload = JSON.parse(response.content[0].text);
    expect(payload.isError).toBe(true);
    expect(payload.error).toContain('simulated scan failure');
  });
});
