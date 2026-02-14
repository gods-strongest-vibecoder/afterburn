#!/usr/bin/env node
// Afterburn MCP server entry point
import { startServer } from './server.js';

startServer().catch(console.error);
