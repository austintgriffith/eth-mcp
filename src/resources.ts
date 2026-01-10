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

// Cache for SE2 docs fetched from remote
let se2DocsCache: string | null = null;
let se2DocsCacheTime: number = 0;
const SE2_DOCS_CACHE_TTL = 3600000; // 1 hour

/**
 * Fetch SE2 LLM documentation from docs.scaffoldeth.io
 */
async function fetchSE2Docs(): Promise<string> {
  const now = Date.now();
  if (se2DocsCache && now - se2DocsCacheTime < SE2_DOCS_CACHE_TTL) {
    return se2DocsCache;
  }

  try {
    const response = await fetch("https://docs.scaffoldeth.io/llms-full.txt");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    se2DocsCache = await response.text();
    se2DocsCacheTime = now;
    return se2DocsCache;
  } catch (error) {
    // Return cached version if available, otherwise return error message
    if (se2DocsCache) {
      return se2DocsCache;
    }
    return `Error fetching SE2 docs: ${error}. Visit https://docs.scaffoldeth.io/llms-full.txt directly.`;
  }
}

/**
 * Official Scaffold-ETH 2 cursor rules content
 * From: https://github.com/scaffold-eth/scaffold-eth-2/blob/main/.cursor/rules/scaffold-eth.mdc
 */
const SE2_CURSOR_RULES = `# Scaffold-ETH 2 Development Rules

This codebase contains Scaffold-ETH 2 (SE-2), everything you need to build dApps on Ethereum.
Tech stack: NextJS, RainbowKit, Wagmi, TypeScript. Supports Hardhat and Foundry.

It's a yarn monorepo with two main packages:
- Hardhat/Foundry (packages/hardhat or packages/foundry): Solidity framework for smart contracts
- NextJS (packages/nextjs): UI framework with Next.js App Router (NOT Pages Router)

## Development Flow

1. Start locally:
   - yarn chain: Starts local blockchain
   - yarn deploy: Deploys contracts
   - yarn start: Starts frontend
2. Write contracts, deploy locally, iterate
3. Go to http://localhost:3000/debug to interact with contracts
4. Write tests in packages/hardhat/test or packages/foundry/test
5. Create custom UI using SE-2 components and hooks

## CRITICAL: Contract Interaction Hooks

ALWAYS use these SE-2 hooks - NEVER use wagmi hooks directly for contract interaction:

### Reading Contract Data
\`\`\`typescript
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

const { data: someData } = useScaffoldReadContract({
  contractName: "YourContract",
  functionName: "functionName",
  args: [arg1, arg2], // optional
});
\`\`\`

### Writing to Contracts
\`\`\`typescript
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const { writeContractAsync } = useScaffoldWriteContract({ contractName: "YourContract" });

// Usage:
await writeContractAsync({
  functionName: "functionName",
  args: [arg1, arg2], // optional
  value: parseEther("0.1"), // optional, for payable functions
});
\`\`\`

### Reading Events
\`\`\`typescript
import { useScaffoldEventHistory } from "~~/hooks/scaffold-eth";

const { data: events } = useScaffoldEventHistory({
  contractName: "YourContract",
  eventName: "EventName",
  watch: true, // optional
});
\`\`\`

## CRITICAL: Display Components

ALWAYS use these SE-2 components:

- \`Address\`: Display ETH addresses (with ENS, blockie, copy)
- \`AddressInput\`: Input for ETH addresses (with ENS resolution)
- \`Balance\`: Display ETH/USD balance
- \`EtherInput\`: Input for ETH amounts (with USD conversion)

Import from: \`~~/components/scaffold-eth\`

## CRITICAL: Deployer Account Security

NEVER put raw private keys in .env files. NEVER suggest DEPLOYER_PRIVATE_KEY=0x...

The ONLY correct workflow for mainnet deployment:

### For Foundry:
\`\`\`bash
yarn generate     # Creates encrypted keystore in ~/.foundry/keystore
yarn account      # Shows deployer address and balances
yarn deploy --network base  # Deploys using keystore (prompts for password)
\`\`\`

### For Hardhat:
\`\`\`bash
yarn generate     # Creates DEPLOYER_PRIVATE_KEY_ENCRYPTED in .env
yarn account      # Decrypts and shows address/balances
yarn deploy --network base  # Uses encrypted key (prompts for password)
\`\`\`

The private key is ALWAYS encrypted with a password. Never stored in plain text.
`;

export const resourceDefinitions: Resource[] = [
  {
    uri: "resource://scaffold-eth/rules",
    name: "Scaffold-ETH 2 Rules",
    description: "CRITICAL: Official SE2 development patterns - hooks, components, and deployer security. READ THIS FIRST.",
    mimeType: "text/plain",
  },
  {
    uri: "resource://scaffold-eth/docs",
    name: "Scaffold-ETH 2 Full Documentation",
    description: "Complete SE2 documentation for LLMs - all hooks, components, deployment guides",
    mimeType: "text/plain",
  },
  {
    uri: "resource://deployment/workflow",
    name: "Deployment Workflow",
    description: "CRITICAL: The correct deployment workflow - fork first, test locally, then mainnet with ENCRYPTED deployer.",
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
  // SE2 Cursor Rules - CRITICAL for AI agents
  if (uri === "resource://scaffold-eth/rules") {
    return {
      content: SE2_CURSOR_RULES,
      mimeType: "text/plain",
    };
  }

  // SE2 Full Documentation (fetched async, return cached or placeholder)
  if (uri === "resource://scaffold-eth/docs") {
    // Note: This is sync, so we return cached version or instruction to fetch
    if (se2DocsCache) {
      return {
        content: se2DocsCache,
        mimeType: "text/plain",
      };
    }
    return {
      content: `SE2 documentation not yet cached. Fetching from https://docs.scaffoldeth.io/llms-full.txt...
      
For immediate reference, use resource://scaffold-eth/rules which contains the essential patterns.`,
      mimeType: "text/plain",
    };
  }

  // Deployment workflow - CRITICAL for AI agents
  if (uri === "resource://deployment/workflow") {
    return {
      content: `# DEPLOYMENT WORKFLOW

CRITICAL: NEVER ask users about testnets vs mainnet.
CRITICAL: NEVER tell users to put private keys in .env files.

## The ONLY Deployment Path

### Phase 1: Local Development (FREE)

1. FORK: yarn fork --network <chain>
   - Creates LOCAL fork of mainnet (chainId 31337)
   - Real mainnet state, $0 cost

2. TEST: yarn deploy (to local fork)
   - All testing happens locally
   - Iterate freely, costs nothing

### Phase 2: Mainnet Deployment (SECURE)

3. GENERATE: yarn generate
   - Creates ENCRYPTED deployer account
   - Foundry: keystore in ~/.foundry/keystore (password-protected)
   - Hardhat: DEPLOYER_PRIVATE_KEY_ENCRYPTED in .env (password-protected)
   - You set the encryption password - REMEMBER IT

4. ACCOUNT: yarn account
   - Shows your deployer address and balances
   - Fund this address with 0.01-0.1 ETH

5. DEPLOY: yarn deploy --network <chain>
   - Deploys to REAL mainnet
   - Prompts for your encryption password
   - Costs gas, but you're confident it works

## SECURITY: Why NOT Raw Private Keys?

WRONG (DANGEROUS):
  DEPLOYER_PRIVATE_KEY=0xac0974bec...
  
RIGHT (SECURE):
  DEPLOYER_PRIVATE_KEY_ENCRYPTED=encrypted:...
  
Raw private keys get:
- Committed to git accidentally
- Leaked in logs
- Stolen by malware scanning .env files

Encrypted keys require your password to use.

## Why NOT Testnets?

- Fork = real mainnet state (liquidity, contracts)
- Same addresses as mainnet
- Free iteration
- Testnets have different addresses, fake state

## For AI Agents

WRONG: "Set DEPLOYER_PRIVATE_KEY in .env"
RIGHT: "Run yarn generate to create an encrypted deployer account"

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

/**
 * Read a resource by URI (async version for fetching remote resources)
 */
export async function readResourceAsync(uri: string): Promise<{ content: string; mimeType: string } | null> {
  // SE2 Full Documentation - fetch from remote
  if (uri === "resource://scaffold-eth/docs") {
    const content = await fetchSE2Docs();
    return {
      content,
      mimeType: "text/plain",
    };
  }

  // Fall back to sync version for other resources
  return readResource(uri);
}

/**
 * Pre-fetch SE2 docs on startup (call this when server starts)
 */
export async function prefetchResources(): Promise<void> {
  try {
    await fetchSE2Docs();
    console.log("SE2 documentation cached successfully");
  } catch (error) {
    console.warn("Failed to prefetch SE2 docs:", error);
  }
}
