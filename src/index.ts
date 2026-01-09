#!/usr/bin/env node
/**
 * ethereum-mcp
 * MCP server for AI-driven Ethereum development with Scaffold-ETH
 *
 * This server enables AI agents to:
 * - Initialize and manage Scaffold-ETH projects
 * - Run local blockchain forks
 * - Deploy and interact with smart contracts
 * - Build full-stack dApps from natural language
 */

import { runServer } from "./server.js";

console.error("ethereum-mcp: Starting MCP server...");

runServer().catch((err) => {
  console.error("ethereum-mcp: Fatal error:", err);
  process.exit(1);
});
