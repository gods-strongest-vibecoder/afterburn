// MCP server initialization and transport setup
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './tools.js';

export function createServer(): McpServer {
  const server = new McpServer(
    { name: 'afterburn-mcp', version: '0.1.0' },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  registerTools(server);

  return server;
}

export async function startServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
