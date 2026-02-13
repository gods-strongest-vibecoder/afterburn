// MCP server initialization and transport setup
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './tools.js';
import { getAfterburnVersion } from '../version.js';
export function createServer() {
    const appVersion = getAfterburnVersion();
    const server = new McpServer({ name: 'afterburn-mcp', version: appVersion }, {
        capabilities: {
            tools: {}
        }
    });
    registerTools(server);
    return server;
}
export async function startServer() {
    const server = createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
//# sourceMappingURL=server.js.map