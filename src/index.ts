#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './tools/index.js';
import { isSvnInstalled } from './utils/svn-executor.js';

const server = new McpServer({
  name: 'svn-mcp',
  version: '1.0.0',
});

// Register all SVN tools
registerTools(server);

async function main() {
  // Check if SVN is installed
  const svnAvailable = await isSvnInstalled();
  if (!svnAvailable) {
    console.error('Warning: SVN command not found. Please ensure SVN is installed and in your PATH.');
    console.error('Some operations may fail until SVN is available.');
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('SVN MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
