/**
 * MCP Resources for ethereum-mcp
 * Exposes status and logs as pollable resources
 */

import { stateManager } from "./state.js";
import { processManager } from "./process-manager.js";
import { CHAIN_REGISTRY } from "./addresses/index.js";

export interface Resource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export const resourceDefinitions: Resource[] = [
  {
    uri: "resource://deployment/workflow",
    name: "Deployment Workflow",
    description: "CRITICAL: The correct deployment workflow - fork first, test locally, then mainnet. NEVER use testnets.",
    mimeType: "text/plain",
  },
  {
    uri: "resource://stack/status",
    name: "Stack Status",
    description: "Current status of the Scaffold-ETH stack including components, URLs, and deployed contracts",
    mimeType: "application/json",
  },
  {
    uri: "resource://stack/config",
    name: "Stack Configuration",
    description: "Current stack configuration including chain, RPC URL, and workspace path",
    mimeType: "application/json",
  },
  {
    uri: "resource://addresses/registry",
    name: "Address Registry",
    description: "Complete DeFi protocol and token address registry across all supported chains",
    mimeType: "application/json",
  },
  {
    uri: "resource://process/fork/stdout",
    name: "Fork Process Stdout",
    description: "Standard output from the Anvil fork process",
    mimeType: "text/plain",
  },
  {
    uri: "resource://process/fork/stderr",
    name: "Fork Process Stderr",
    description: "Standard error from the Anvil fork process",
    mimeType: "text/plain",
  },
  {
    uri: "resource://process/frontend/stdout",
    name: "Frontend Process Stdout",
    description: "Standard output from the Next.js dev server",
    mimeType: "text/plain",
  },
  {
    uri: "resource://process/frontend/stderr",
    name: "Frontend Process Stderr",
    description: "Standard error from the Next.js dev server",
    mimeType: "text/plain",
  },
  {
    uri: "resource://contracts/deployed",
    name: "Deployed Contracts",
    description: "List of deployed contracts with addresses",
    mimeType: "application/json",
  },
];

/**
 * Read a resource by URI
 */
export function readResource(uri: string): { content: string; mimeType: string } | null {
  // Deployment workflow - CRITICAL for AI agents
  if (uri === "resource://deployment/workflow") {
    return {
      content: `# DEPLOYMENT WORKFLOW

CRITICAL: NEVER ask users about testnets vs mainnet.

## The ONLY Deployment Path

1. FORK: yarn fork --network <chain>
   - Creates LOCAL fork of mainnet (chainId 31337)
   - Real mainnet state, $0 cost

2. TEST: yarn deploy (to local fork)
   - All testing happens locally
   - Iterate freely, costs nothing

3. GENERATE: yarn generate (when ready)
   - Creates deployer wallet
   - Fund with 0.01-0.1 ETH

4. DEPLOY: yarn deploy --network <chain>
   - Deploys to REAL mainnet
   - Costs gas, but you're confident

## Why NOT Testnets?

- Fork = real mainnet state (liquidity, contracts)
- Same addresses as mainnet
- Free iteration
- Testnets have different addresses, fake state

## For AI Agents

WRONG: "Should I deploy to testnet or mainnet?"
RIGHT: "I'll set up a local fork for development..."

If user asks for testnet, explain forks are better.
Only use testnet if user insists after explanation.`,
      mimeType: "text/plain",
    };
  }

  // Stack status
  if (uri === "resource://stack/status") {
    return {
      content: JSON.stringify(stateManager.getStatusReport(), null, 2),
      mimeType: "application/json",
    };
  }

  // Stack config
  if (uri === "resource://stack/config") {
    const state = stateManager.getState();
    return {
      content: JSON.stringify(
        {
          initialized: state.initialized,
          installed: state.installed,
          workspacePath: state.workspacePath,
          config: state.config,
        },
        null,
        2
      ),
      mimeType: "application/json",
    };
  }

  // Address registry
  if (uri === "resource://addresses/registry") {
    return {
      content: JSON.stringify(CHAIN_REGISTRY, null, 2),
      mimeType: "application/json",
    };
  }

  // Process stdout/stderr
  const processMatch = uri.match(/^resource:\/\/process\/(\w+)\/(stdout|stderr)$/);
  if (processMatch) {
    const [, processId, stream] = processMatch;
    const logs =
      stream === "stdout"
        ? processManager.getStdout(processId)
        : processManager.getStderr(processId);

    if (logs === null) {
      return {
        content: `Process '${processId}' not found`,
        mimeType: "text/plain",
      };
    }

    return {
      content: logs.join("\n"),
      mimeType: "text/plain",
    };
  }

  // Deployed contracts
  if (uri === "resource://contracts/deployed") {
    const state = stateManager.getState();
    return {
      content: JSON.stringify(state.deployedContracts, null, 2),
      mimeType: "application/json",
    };
  }

  return null;
}

/**
 * List all available resources
 */
export function listResources(): Resource[] {
  return resourceDefinitions;
}
