/**
 * Stack tools for ethereum-mcp
 * Tools for initializing, installing, and managing the Scaffold-ETH stack
 */

import { exec } from "child_process";
import { promisify } from "util";
import * as path from "path";
import * as fs from "fs/promises";
import { stateManager } from "../state.js";
import { processManager } from "../process-manager.js";
import { isCommandAllowed } from "../safety.js";
import { getAbiByType, isValidContractType, CONTRACT_TYPES, type ContractType } from "../abis/index.js";
import { CHAIN_BY_NAME, type ChainAddresses } from "../addresses/index.js";

const execAsync = promisify(exec);

/**
 * Check if Foundry toolchain is installed
 */
async function checkFoundryInstalled(): Promise<{
  installed: boolean;
  version?: string;
}> {
  try {
    const { stdout } = await execAsync("forge --version", { timeout: 5000 });
    const version = stdout.trim().split("\n")[0];
    return { installed: true, version };
  } catch {
    return { installed: false };
  }
}

export const stackTools = {
  /**
   * stack.install_foundry - Install the Foundry toolchain
   */
  installFoundry: {
    name: "stack_install_foundry",
    description: `Install the Foundry toolchain (forge, anvil, cast, chisel).
Call this tool if stack_init or stack_start fails with "Foundry not installed" error.
This downloads and runs the official Foundry installer (foundryup).
Requires curl and bash to be available.`,
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
    handler: async () => {
      // Check if already installed
      const existing = await checkFoundryInstalled();
      if (existing.installed) {
        return {
          success: true,
          message: `Foundry already installed: ${existing.version}`,
          alreadyInstalled: true,
        };
      }

      try {
        // Download and run foundryup installer
        await execAsync("curl -L https://foundry.paradigm.xyz | bash", {
          timeout: 60000,
          shell: "/bin/bash",
        });

        // Get the home directory for sourcing the updated PATH
        const homeDir = process.env.HOME || process.env.USERPROFILE || "~";
        
        // Run foundryup to actually install the binaries
        // We need to source the profile first to get foundryup in PATH
        await execAsync(
          `export PATH="$PATH:${homeDir}/.foundry/bin" && foundryup`,
          {
            timeout: 120000,
            shell: "/bin/bash",
          }
        );

        // Verify installation by checking forge version with explicit PATH
        try {
          const { stdout } = await execAsync(
            `export PATH="$PATH:${homeDir}/.foundry/bin" && forge --version`,
            { timeout: 5000, shell: "/bin/bash" }
          );
          const version = stdout.trim().split("\n")[0];
          return {
            success: true,
            message: `Foundry installed successfully: ${version}`,
            version,
            note: "You may need to restart your terminal or run 'source ~/.bashrc' for forge/anvil/cast to be available globally.",
          };
        } catch {
          return {
            success: true,
            message: "Foundry installation completed",
            note: "Restart your terminal or run 'source ~/.bashrc' for forge/anvil/cast to be available.",
          };
        }
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : String(err),
          hint: "Manual install: curl -L https://foundry.paradigm.xyz | bash && foundryup",
        };
      }
    },
  },

  /**
   * stack.init - Create a new Scaffold-ETH project configured for a chain
   */
  init: {
    name: "stack_init",
    description: `Initialize a new Scaffold-ETH 2 project with Foundry, configured for a specific mainnet chain.

IMPORTANT: The chain parameter specifies which MAINNET to fork for local development.
All development happens on a LOCAL Anvil fork (chainId 31337) - you never deploy directly to mainnet from here.

Supported chains: mainnet, base, optimism, arbitrum, polygon.
NO TESTNETS - use fork workflow instead (fork gives you real mainnet state for free).

Development workflow after init:
1. stack_install() - Install dependencies
2. stack_start(["fork"]) - Runs: yarn fork --network <chain>
3. stack_start(["deploy"]) - Deploy to LOCAL fork (free!)
4. stack_start(["frontend"]) - Start frontend connected to local fork
5. When ready: yarn generate && yarn deploy --network <chain> for mainnet

The workspace path should be an empty directory.
Requires Foundry CLI tools (forge, anvil) - call stack_install_foundry first if not installed.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        template: {
          type: "string",
          enum: ["scaffold-eth"],
          description: "Template to use (only scaffold-eth supported)",
        },
        chain: {
          type: "string",
          description: "Target chain for forking (e.g., 'base', 'mainnet', 'optimism')",
        },
        workspacePath: {
          type: "string",
          description: "Path where the project should be created",
        },
      },
      required: ["template", "chain", "workspacePath"],
    },
    handler: async (args: { template: string; chain: string; workspacePath: string }) => {
      const { template, chain, workspacePath } = args;

      // Validate template
      if (template !== "scaffold-eth") {
        return { success: false, error: "Only 'scaffold-eth' template is supported" };
      }

      // Check if Foundry CLI is installed FIRST
      const foundryCheck = await checkFoundryInstalled();
      if (!foundryCheck.installed) {
        return {
          success: false,
          error: "Foundry not installed",
          needsFoundry: true,
          action: "Call stack_install_foundry to install the Foundry toolchain, then retry stack_init.",
        };
      }

      // Get chain config
      const chainConfig = stateManager.getChainConfig(chain);
      if (!chainConfig) {
        return {
          success: false,
          error: `Unsupported chain: ${chain}. Supported: ${stateManager.getSupportedChains().join(", ")}`,
        };
      }

      try {
        // Check if directory already exists
        const parentDir = path.dirname(workspacePath);
        const projectName = path.basename(workspacePath);
        
        try {
          const files = await fs.readdir(workspacePath);
          if (files.length > 0) {
            return { success: false, error: "Workspace directory must be empty" };
          }
          // Directory exists but is empty - remove it so create-eth can create it
          await fs.rmdir(workspacePath);
        } catch {
          // Directory doesn't exist, that's fine - create-eth will create it
        }

        // Ensure parent directory exists
        await fs.mkdir(parentDir, { recursive: true });

        // Use the official create-eth CLI to scaffold the project
        // This produces a clean Foundry-only project (no hardhat remnants)
        // --skip-install: We control when yarn install runs via stack_install
        // -s foundry: Select Foundry as the solidity framework
        const createCmd = `npx -y create-eth@latest ${projectName} -s foundry --skip-install`;
        const safetyCheck = isCommandAllowed(createCmd);
        if (!safetyCheck.safe) {
          return { success: false, error: safetyCheck.reason };
        }

        await execAsync(createCmd, { 
          cwd: parentDir, 
          timeout: 180000,  // 3 minute timeout for npx download + scaffold
        });

        const foundryPath = path.join(workspacePath, "packages", "foundry");
        
        // create-eth with -s foundry produces a clean project with only:
        // - packages/foundry/ (Solidity contracts)
        // - packages/nextjs/ (Frontend)
        // No hardhat folder is created

        // Create .env file for foundry by extending the SE-2 defaults
        // IMPORTANT: Include LOCALHOST_KEYSTORE_ACCOUNT which the Makefile requires
        const envContent = `# Foundry environment - DO NOT COMMIT THIS FILE
# Extended from scaffold-eth-2 .env.example

# Alchemy API key for deploying to networks (see foundry.toml rpc_endpoints)
ALCHEMY_API_KEY=oKxs-03sij-U_N0iOlrSsZFr29-IqbuF

# Etherscan API key for contract verification
ETHERSCAN_API_KEY=DNXJA8RX2Q3VZ4URQIWP7Z68CJXQZSC6AW

# Keystore account for local Anvil deployments (scaffold-eth-default = Anvil account #9)
LOCALHOST_KEYSTORE_ACCOUNT=scaffold-eth-default

# Chain configuration for forking (used by: yarn fork)
FORK_URL=${chainConfig.rpcUrl}

# ============================================================
# DEPLOYER ACCOUNT - DO NOT ADD PRIVATE KEYS HERE
# ============================================================
# For LOCAL development:
#   Uses Anvil's built-in funded accounts automatically.
#
# For MAINNET deployment:
#   1. Run: yarn generate (creates encrypted keystore)
#   2. Run: yarn account (shows address to fund)
#   3. Fund the deployer address with ETH
#   4. Run: yarn deploy --network ${chain}
# ============================================================
`;
        await fs.writeFile(path.join(foundryPath, ".env"), envContent);

        // Note: create-eth CLI handles git init and forge submodules automatically
        // No need for manual git init or forge install fallback

        // Configure scaffold.config.ts to use foundry (localhost/31337)
        const scaffoldConfigPath = path.join(workspacePath, "packages", "nextjs", "scaffold.config.ts");
        const pollingInterval = chain === "mainnet" ? 5000 : 3000;

        try {
          let configContent = await fs.readFile(scaffoldConfigPath, "utf-8");
          
          // Update targetNetworks to use foundry (chains.foundry is chainId 31337)
          // The scaffold-eth-2 config uses chains from viem
          configContent = configContent.replace(
            /targetNetworks:\s*\[[^\]]*\]/,
            "targetNetworks: [chains.foundry]"
          );
          
          // Update pollingInterval based on chain
          configContent = configContent.replace(
            /pollingInterval:\s*\d+/,
            `pollingInterval: ${pollingInterval}`
          );

          // CRITICAL: Ensure onlyLocalBurnerWallet is NEVER set to false
          // This is a common AI mistake - the name is counterintuitive
          // true = safe (burner only on local), false = DANGEROUS (burner on mainnet)
          if (configContent.includes("onlyLocalBurnerWallet: false")) {
            configContent = configContent.replace(
              /onlyLocalBurnerWallet:\s*false/,
              "onlyLocalBurnerWallet: true"
            );
          }
          
          await fs.writeFile(scaffoldConfigPath, configContent);
        } catch (err) {
          // Config file might not exist yet or have different format
          console.error("Could not update scaffold.config.ts:", err);
        }

        // The foundry branch already has correct script mappings in package.json
        // (deploy, chain, fork, etc. all point to @se-2/foundry workspace)
        // No script updates needed

        // Create/update cursor rules for Foundry workflow
        const cursorRulesDir = path.join(workspacePath, ".cursor", "rules");
        const cursorRulesPath = path.join(cursorRulesDir, "scaffold-eth.mdc");
        const cursorRulesContent = `---
description:
globs:
alwaysApply: true
---

## PROTECTED SETTINGS - DO NOT MODIFY

These settings have correct defaults. Changing them causes serious problems.
**If you think any of these need changing, STOP and ask the user first.**

| Setting | File | Correct Value | Why |
|---------|------|---------------|-----|
| onlyLocalBurnerWallet | scaffold.config.ts | true | true=safe (burner only on localhost), false=DANGEROUS (exposes burner wallet on mainnet!) |

## AI BEHAVIOR RULES

1. Only change the specific thing asked. Nothing else.
2. If you think something else needs changing, STOP and ask first.
3. Do NOT change config settings without explaining what they do.
4. When a setting name seems "obvious", that's when you verify - obvious names are often wrong.

---

This codebase contains Scaffold-ETH 2 (SE-2) with Foundry, everything you need to build dApps on Ethereum. Its tech stack is NextJS, RainbowKit, Wagmi and Typescript for the frontend, and Foundry (Forge, Anvil) for smart contract development.

It's a yarn monorepo that contains two main packages:

- Foundry (\`packages/foundry\`): The Solidity framework to write, test and deploy EVM Smart Contracts using Forge.
- NextJS (\`packages/nextjs\`): The UI framework extended with utilities to make interacting with Smart Contracts easy (using Next.js App Router, not Pages Router).

The usual dev flow is:

- Start SE-2 locally:
  - \`yarn fork\`: Starts a local Anvil fork of mainnet (configured for ${chain})
  - \`yarn deploy\`: Deploys contracts to the local fork
  - \`yarn start\`: Starts the frontend
- Write Smart Contracts in \`packages/foundry/contracts/\`
- Modify the deployment script in \`packages/foundry/script/Deploy.s.sol\` if needed
- Deploy locally (\`yarn deploy\`)
- Go to \`http://localhost:3000/debug\` page to interact with your contract with a nice UI
- Iterate until you get the functionality you want in your contract
- Write tests for the contract in \`packages/foundry/test/\`
- Create your custom UI using all the SE-2 components, hooks, and utilities
- Deploy to mainnet when ready:
  1. \`yarn generate\` - Create encrypted deployer wallet
  2. \`yarn account\` - Get deployer address to fund
  3. \`yarn deploy --network ${chain}\` - Deploy to real ${chain}
- Deploy your UI (\`yarn vercel\` or \`yarn ipfs\`)

## Smart Contract UI interactions guidelines

SE-2 provides a set of hooks that facilitates contract interactions from the UI. It reads the contract data from \`deployedContracts.ts\` and \`externalContracts.ts\`, located in \`packages/nextjs/contracts\`.

### Reading data from a contract

Use the \`useScaffoldReadContract\` hook:

\`\`\`typescript
const { data: someData } = useScaffoldReadContract({
  contractName: "YourContract",
  functionName: "functionName",
  args: [arg1, arg2], // optional
});
\`\`\`

### Writing data to a contract

Use the \`useScaffoldWriteContract\` hook:

\`\`\`typescript
const { writeContractAsync: writeYourContractAsync } = useScaffoldWriteContract(
  { contractName: "YourContract" }
);

// Usage (this will send a write transaction to the contract)
await writeContractAsync({
  functionName: "functionName",
  args: [arg1, arg2], // optional
  value: parseEther("0.1"), // optional, for payable functions
});
\`\`\`

### Reading events from a contract

Use the \`useScaffoldEventHistory\` hook:

\`\`\`typescript
const { data: events, isLoading, error } = useScaffoldEventHistory({
  contractName: "YourContract",
  eventName: "GreetingChange",
  watch: true, // optional, if true, the hook will watch for new events
});
\`\`\`

## Display Components

SE-2 provides pre-built React components for common Ethereum use cases:

- \`Address\`: Always use this when displaying an ETH address
- \`AddressInput\`: Always use this when users need to input an ETH address
- \`Balance\`: Display the ETH/USDC balance of a given address
- \`EtherInput\`: An extended number input with ETH/USD conversion
`;
        try {
          await fs.mkdir(cursorRulesDir, { recursive: true });
          await fs.writeFile(cursorRulesPath, cursorRulesContent);
        } catch (err) {
          console.error("Could not create cursor rules:", err);
        }

        // Update state
        stateManager.setInitialized(workspacePath, {
          template: "scaffold-eth",
          chain,
          chainId: chainConfig.chainId,
          rpcUrl: chainConfig.rpcUrl,
          blockExplorer: chainConfig.blockExplorer,
        });

        return {
          success: true,
          message: `Scaffold-ETH initialized for ${chain} at ${workspacePath}`,
          foundryVersion: foundryCheck.version,
          structure: {
            frontend: "packages/nextjs/",
            contracts: "packages/foundry/contracts/",
            scripts: "packages/foundry/script/",
            tests: "packages/foundry/test/",
          },
          chain: {
            name: chain,
            chainId: chainConfig.chainId,
            rpcUrl: chainConfig.rpcUrl,
            localChainId: 31337,
          },
          nextStep: "Run stack_install to install dependencies",
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        stateManager.setError(error);
        return { success: false, error };
      }
    },
  },

  /**
   * stack.install - Install project dependencies
   */
  install: {
    name: "stack_install",
    description: `Install dependencies for the Scaffold-ETH project.
This runs 'yarn install' in the workspace. Must run stack.init first.`,
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
    handler: async () => {
      const state = stateManager.getState();

      if (!state.initialized || !state.workspacePath) {
        return { success: false, error: "Stack not initialized. Run stack.init first." };
      }

      try {
        // Run yarn install
        await execAsync("yarn install", {
          cwd: state.workspacePath,
          timeout: 300000, // 5 minute timeout
        });

        stateManager.setInstalled();

        return {
          success: true,
          message: "Dependencies installed successfully",
          nextStep: "Run stack.start() to start the development environment",
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        stateManager.setError(error);
        return { success: false, error };
      }
    },
  },

  /**
   * stack.start - Start stack components
   */
  start: {
    name: "stack_start",
    description: `Start one or more stack components for LOCAL development.

Components:
- fork: Start LOCAL Anvil fork of the chain configured during stack_init (chainId 31337)
  RUNS: yarn fork --network <chain>
  Example: If you initialized with chain "base", this runs: yarn fork --network base
  Anvil understands chain names and resolves them to RPC URLs automatically.
  This creates a local copy of mainnet state - all testing happens here for FREE.
- deploy: Deploy contracts to the LOCAL fork (NOT to mainnet!)
  This is safe and costs nothing - iterate as many times as needed.
- frontend: Start the Next.js dev server connected to the local fork

IMPORTANT: All deployment via this tool goes to localhost:8545 (the local fork).
This is the development workflow - test everything locally before mainnet.

For MAINNET deployment (after testing):
1. yarn generate - Create deployer wallet
2. yarn deploy --network <chain> - Deploy to real mainnet

You can start multiple components at once. Order matters: fork should start before deploy.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        components: {
          type: "array",
          items: { type: "string", enum: ["fork", "deploy", "frontend"] },
          description: "Components to start: fork, deploy, frontend",
        },
      },
      required: ["components"],
    },
    handler: async (args: { components: string[] }) => {
      const state = stateManager.getState();

      if (!state.initialized || !state.workspacePath) {
        return { success: false, error: "Stack not initialized. Run stack.init first." };
      }

      if (!state.installed) {
        return { success: false, error: "Dependencies not installed. Run stack.install first." };
      }

      const results: Record<string, { success: boolean; error?: string }> = {};
      const workspacePath = state.workspacePath;

      for (const component of args.components) {
        switch (component) {
          case "fork": {
            // Check if Foundry (anvil) is installed
            const foundryCheck = await checkFoundryInstalled();
            if (!foundryCheck.installed) {
              stateManager.setComponentStatus("fork", "error");
              results.fork = {
                success: false,
                error: "Foundry not installed",
                needsFoundry: true,
                action: "Call stack_install_foundry to install Foundry, then retry stack_start",
              } as { success: boolean; error?: string };
              break;
            }

            stateManager.setComponentStatus("fork", "starting");
            // Run: yarn fork --network <chain>
            // Anvil understands chain names (base, mainnet, optimism, etc.) and resolves them to RPC URLs
            const chain = state.config?.chain || "mainnet";
            const chainConfig = stateManager.getChainConfig(chain);
            const result = await processManager.start(
              "fork",
              "yarn",
              ["fork", "--network", chain],
              workspacePath
            );
            if (result.success) {
              // Wait a moment for anvil to start
              await new Promise((resolve) => setTimeout(resolve, 5000));
              
              // Enable auto-mining at chain's natural block time
              // This ensures time advances naturally for yield accrual, vesting, etc.
              const blockTime = chainConfig?.blockTime || 12;
              try {
                await execAsync(
                  `cast rpc anvil_setIntervalMining ${blockTime} --rpc-url http://localhost:8545`,
                  { timeout: 5000 }
                );
              } catch (err) {
                // Log but don't fail - fork still works, just without auto-mining
                console.error("Failed to enable interval mining:", err);
              }
              
              stateManager.setComponentStatus("fork", "running");
            } else {
              stateManager.setComponentStatus("fork", "error");
            }
            results.fork = result;
            break;
          }

          case "deploy": {
            // Check if Foundry (forge) is installed
            const forgeCheck = await checkFoundryInstalled();
            if (!forgeCheck.installed) {
              stateManager.setComponentStatus("deploy", "error");
              results.deploy = {
                success: false,
                error: "Foundry not installed",
                needsFoundry: true,
                action: "Call stack_install_foundry to install Foundry, then retry stack_start",
              } as { success: boolean; error?: string };
              break;
            }

            stateManager.setComponentStatus("deploy", "deploying");
            // Deploy using foundry (forge script) from the foundry package
            const deployPath = path.join(workspacePath, "packages", "foundry");
            try {
              // Use yarn deploy which runs the foundry deploy script
              const { stdout } = await execAsync("yarn deploy", {
                cwd: deployPath,
                timeout: 120000, // 2 minute timeout
                env: {
                  ...process.env,
                  FOUNDRY_PROFILE: "default",
                },
              });

              // Parse deployed contract addresses from forge output
              // Forge outputs: "Contract deployed at: 0x..."
              const addressMatches = stdout.matchAll(/(?:deployed (?:to|at)|Contract)[:|\s]+(0x[a-fA-F0-9]{40})/gi);
              for (const match of addressMatches) {
                stateManager.addDeployedContract({
                  name: "Contract",
                  address: match[1],
                  chainId: state.config!.chainId,
                  deployedAt: Date.now(),
                });
              }

              stateManager.setComponentStatus("deploy", "deployed");
              results.deploy = { success: true };
            } catch (err) {
              const error = err instanceof Error ? err.message : String(err);
              stateManager.setComponentStatus("deploy", "error");
              stateManager.setError(error);
              results.deploy = { success: false, error };
            }
            break;
          }

          case "frontend": {
            stateManager.setComponentStatus("frontend", "starting");
            const result = await processManager.start(
              "frontend",
              "yarn",
              ["start"],
              workspacePath
            );
            if (result.success) {
              // Wait for Next.js to start
              await new Promise((resolve) => setTimeout(resolve, 5000));
              stateManager.setComponentStatus("frontend", "running");
            } else {
              stateManager.setComponentStatus("frontend", "error");
            }
            results.frontend = result;
            break;
          }

          default:
            results[component] = { success: false, error: `Unknown component: ${component}` };
        }
      }

      const allSuccess = Object.values(results).every((r) => r.success);
      
      // Inject frontend design rules when frontend component is started
      const frontendStarted = args.components.includes("frontend") && results.frontend?.success;
      const frontendDesignRules = frontendStarted ? {
        FRONTEND_DESIGN_RULES: {
          CRITICAL: "NEVER use purple/pink/indigo gradients. This is MANDATORY.",
          theme: "Use DaisyUI theme: 'corporate' for DeFi/Finance, 'dracula' for dev tools",
          colors: "Use ONLY theme tokens: base-100, base-200, base-300, primary, secondary, accent",
          banned: [
            "purple, violet, lavender, indigo colors",
            "bg-gradient-* classes",
            "backdrop-blur, glassmorphism",
            "shadow-lg, shadow-xl, shadow-2xl (max is shadow-md)",
            "glow effects"
          ],
          components: "Use DaisyUI: btn, card, input, stats - NOT custom gradient styles",
          reference: "Design like Etherscan, GitHub Settings, Stripe Dashboard - NOT like SaaS marketing sites",
          lint_before_writing: "Before ANY .tsx file: verify no purple, no gradients, using DaisyUI components"
        }
      } : {};

      // CRITICAL RPC WARNING for non-Ethereum chains
      // Chains that need custom RPC: Base (8453), Optimism (10), Arbitrum (42161), Polygon (137)
      // Chains that are fine: localhost (31337), Ethereum mainnet (1 - has BuidlGuidl RPC)
      const chain = state.config?.chain?.toLowerCase() || "";
      const chainId = state.config?.chainId || 31337;
      const needsCustomRpc = frontendStarted && 
        chainId !== 31337 && // Not localhost
        chainId !== 1 && // Not Ethereum mainnet (has BuidlGuidl RPC)
        ["base", "optimism", "arbitrum", "polygon"].includes(chain);
      
      const rpcWarning = needsCustomRpc ? {
        CRITICAL_RPC_WARNING: {
          severity: "CRITICAL",
          message: `Your frontend is configured for ${chain.charAt(0).toUpperCase() + chain.slice(1)} mainnet (chainId ${chainId}). Public RPCs like mainnet.base.org WILL FAIL with 429 errors in production!`,
          action: "Before deploying to Vercel/production, you MUST set NEXT_PUBLIC_ALCHEMY_API_KEY",
          steps: [
            "1. Get a FREE API key from https://alchemy.com",
            "2. For local dev: Add to packages/nextjs/.env.local: NEXT_PUBLIC_ALCHEMY_API_KEY=your_key",
            "3. For production: Add NEXT_PUBLIC_ALCHEMY_API_KEY to your Vercel/hosting environment variables"
          ],
          consequence: "Without this, your production app will show 429 (Too Many Requests) errors and be unusable",
          alchemyUrl: "https://alchemy.com"
        }
      } : {};

      return {
        success: allSuccess,
        results,
        urls: stateManager.getState().urls,
        message: allSuccess
          ? "All components started successfully"
          : "Some components failed to start",
        ...frontendDesignRules,
        ...rpcWarning,
      };
    },
  },

  /**
   * stack.stop - Stop stack components
   */
  stop: {
    name: "stack_stop",
    description: "Stop one or more running stack components (fork, frontend).",
    inputSchema: {
      type: "object" as const,
      properties: {
        components: {
          type: "array",
          items: { type: "string", enum: ["fork", "frontend"] },
          description: "Components to stop",
        },
      },
      required: ["components"],
    },
    handler: async (args: { components: string[] }) => {
      const results: Record<string, { success: boolean; error?: string }> = {};

      for (const component of args.components) {
        if (component === "fork" || component === "frontend") {
          const result = processManager.stop(component);
          if (result.success) {
            stateManager.setComponentStatus(component, "stopped");
          }
          results[component] = result;
        } else {
          results[component] = { success: false, error: `Unknown component: ${component}` };
        }
      }

      return {
        success: Object.values(results).every((r) => r.success),
        results,
      };
    },
  },

  /**
   * stack.status - Get stack health report
   */
  status: {
    name: "stack_status",
    description: `Get the current status of the Scaffold-ETH stack.
Returns initialization state, component status, URLs, and deployed contracts.`,
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
    handler: async () => {
      return stateManager.getStatusReport();
    },
  },

  /**
   * stack.generateAccount - Guide user to create encrypted deployer account
   * 
   * INTERACTIVE COMMAND - Cannot be run by AI tools!
   * This command prompts for password input which requires a TTY.
   */
  generateAccount: {
    name: "stack_generateAccount",
    description: `INTERACTIVE COMMAND - Returns instructions for the user to run manually.

'yarn generate' creates an encrypted deployer keystore but REQUIRES interactive password input.
AI tools CANNOT run this command - it will hang waiting for input.

This tool returns step-by-step instructions for the user to run in their terminal.`,
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
    handler: async () => {
      const state = stateManager.getState();

      if (!state.initialized || !state.workspacePath) {
        return { success: false, error: "Stack not initialized. Run stack_init first." };
      }

      if (!state.installed) {
        return { success: false, error: "Dependencies not installed. Run stack_install first." };
      }

      // Get chain from state to provide chain-specific funding guidance
      const chain = state.config?.chain || "unknown";
      const isL2 = ["base", "optimism", "arbitrum"].includes(chain.toLowerCase());
      const needsCustomRpc = ["base", "optimism", "arbitrum", "polygon"].includes(chain.toLowerCase());
      const fundingAmount = isL2 
        ? "0.001-0.002 ETH (L2s are cheap - deployments cost <$1!)"
        : chain === "mainnet" 
          ? "0.01-0.05 ETH (mainnet is expensive - $20-100)"
          : "appropriate ETH for your chain (L2s: ~0.001 ETH, mainnet: ~0.01-0.05 ETH)";

      // Build RPC configuration instructions for L2s
      const rpcInstructions = needsCustomRpc ? [
        ``,
        `⚠️  CRITICAL: Configure RPC for ${chain.charAt(0).toUpperCase() + chain.slice(1)} (REQUIRED!)`,
        `   Public RPCs like mainnet.base.org WILL FAIL with 429 errors in production.`,
        ``,
        `   a. Get a FREE API key from https://alchemy.com`,
        `   b. Add to packages/nextjs/.env.local:`,
        `      NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_key`,
        `   c. For Vercel/production: Add the same env var in your hosting dashboard`,
        ``,
      ] : [];

      // Return instructions instead of executing
      return {
        success: true,
        requiresUserAction: true,
        message: "INTERACTIVE COMMAND - User must run manually",
        reason: "yarn generate prompts for a password, which requires terminal input. AI tools cannot provide interactive input.",
        ...(needsCustomRpc ? {
          CRITICAL_RPC_PREREQUISITE: {
            message: `BEFORE deploying to ${chain}, you MUST configure your RPC endpoint`,
            problem: "Public RPCs (mainnet.base.org) will fail with 429 rate limit errors in production",
            solution: [
              "1. Get a FREE API key from https://alchemy.com",
              "2. Add to packages/nextjs/.env.local: NEXT_PUBLIC_ALCHEMY_API_KEY=your_key",
              "3. Add to packages/foundry/.env: FORK_URL=https://" + chain + "-mainnet.g.alchemy.com/v2/your_key",
              "4. For production hosting (Vercel): Add NEXT_PUBLIC_ALCHEMY_API_KEY to environment variables"
            ],
            alchemySignup: "https://alchemy.com",
          },
        } : {}),
        userInstructions: [
          `1. Open a terminal in your project directory:`,
          `   cd ${state.workspacePath}`,
          ...rpcInstructions,
          `2. Run the generate command:`,
          `   yarn generate`,
          ``,
          `3. When prompted, enter a SECURE password`,
          `   IMPORTANT: Remember this password! You'll need it for every deployment.`,
          ``,
          `4. After generating, check your deployer address:`,
          `   yarn account`,
          ``,
          `5. Fund the deployer address with ${fundingAmount}`,
          ``,
          `6. Deploy to mainnet:`,
          `   yarn deploy --network ${chain}`,
          `   (You'll be prompted for your password again)`,
        ],
        copyPasteCommands: {
          step1_cd: `cd ${state.workspacePath}`,
          ...(needsCustomRpc ? {
            step2_env_local: `echo 'NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_key_here' >> ${state.workspacePath}/packages/nextjs/.env.local`,
          } : {}),
          step3_generate: "yarn generate",
          step4_account: "yarn account",
          step5_deploy: `yarn deploy --network ${chain}`,
        },
      };
    },
  },

  /**
   * stack.checkAccount - Guide user to check deployer account info
   * 
   * INTERACTIVE COMMAND - May require password input!
   * This command may prompt for the keystore password which requires a TTY.
   */
  checkAccount: {
    name: "stack_checkAccount",
    description: `INTERACTIVE COMMAND - Returns instructions for the user to run manually.

'yarn account' shows the deployer address and balances but MAY prompt for the keystore password.
AI tools should NOT run this command as it may hang waiting for password input.

This tool returns step-by-step instructions for the user to run in their terminal.`,
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
    handler: async () => {
      const state = stateManager.getState();

      if (!state.initialized || !state.workspacePath) {
        return { success: false, error: "Stack not initialized. Run stack_init first." };
      }

      if (!state.installed) {
        return { success: false, error: "Dependencies not installed. Run stack_install first." };
      }

      // Get chain from state to provide chain-specific funding guidance
      const chain = state.config?.chain || "unknown";
      const isL2 = ["base", "optimism", "arbitrum"].includes(chain.toLowerCase());
      const needsCustomRpc = ["base", "optimism", "arbitrum", "polygon"].includes(chain.toLowerCase());
      const fundingAmount = isL2 
        ? "0.001-0.002 ETH (L2s are cheap - deployments cost <$1!)"
        : chain === "mainnet" 
          ? "0.01-0.05 ETH (mainnet is expensive - $20-100)"
          : "appropriate ETH for your chain (L2s: ~0.001 ETH, mainnet: ~0.01-0.05 ETH)";

      // Return instructions instead of executing
      return {
        success: true,
        requiresUserAction: true,
        message: "INTERACTIVE COMMAND - User must run manually",
        reason: "yarn account may prompt for the keystore password, which requires terminal input. AI tools cannot provide interactive input.",
        ...(needsCustomRpc ? {
          CRITICAL_RPC_REMINDER: {
            message: `Don't forget to configure RPC for ${chain.charAt(0).toUpperCase() + chain.slice(1)} before deploying!`,
            problem: "Public RPCs will fail with 429 rate limit errors in production",
            action: "Set NEXT_PUBLIC_ALCHEMY_API_KEY in .env.local and Vercel env vars",
            alchemySignup: "https://alchemy.com (free tier available)",
          },
        } : {}),
        userInstructions: [
          `1. Open a terminal in your project directory:`,
          `   cd ${state.workspacePath}`,
          ``,
          `2. Check your deployer account:`,
          `   yarn account`,
          ``,
          `3. If prompted, enter your keystore password`,
          ``,
          `4. Copy the deployer address shown`,
          ``,
          `5. Fund the deployer address with ${fundingAmount}`,
          ``,
          ...(needsCustomRpc ? [
            `6. IMPORTANT: Configure RPC before deploying frontend!`,
            `   - Get FREE key from https://alchemy.com`,
            `   - Add to .env.local: NEXT_PUBLIC_ALCHEMY_API_KEY=your_key`,
            `   - Add to Vercel env vars for production`,
            ``,
          ] : []),
          `${needsCustomRpc ? "7" : "6"}. Once funded, deploy to mainnet:`,
          `   yarn deploy --network ${chain}`,
        ],
        copyPasteCommands: {
          step1_cd: `cd ${state.workspacePath}`,
          step2_account: "yarn account",
          step3_deploy: `yarn deploy --network ${chain}`,
        },
        prerequisite: "If you haven't created a deployer account yet, run 'yarn generate' first.",
      };
    },
  },

  /**
   * stack.configureExternalContracts - Configure external contracts for debug UI
   */
  configureExternalContracts: {
    name: "stack_configureExternalContracts",
    description: `Configure external contracts for the Scaffold-ETH debug UI.

Adds contract addresses and ABIs to packages/nextjs/contracts/externalContracts.ts
so you can interact with external protocols (USDC, Aave, Uniswap) in the debug UI.

WHEN TO USE: When building projects that interact with external contracts:
- Token interactions: "build a USDC vault" → add USDC with type: "ERC20"
- DeFi integrations: "integrate with Aave" → add Aave pool with type: "AaveV3Pool"
- DEX swaps: "swap on Uniswap" → add router with type: "UniswapV3Router"

BUNDLED ABIs (no external fetch needed):
- ERC20: Standard tokens (USDC, DAI, WETH, etc.)
- ERC721: NFT contracts
- ERC4626: Tokenized vaults
- AaveV3Pool: Aave lending pool
- AaveV3PoolDataProvider: Aave data queries
- UniswapV3Router: Uniswap V3 swaps
- UniswapV3Quoter: Swap quotes
- UniswapV2Router: V2-style DEX swaps

If a contract type is not bundled and no ABI is provided:
- Try using Blockscout MCP to fetch the ABI
- Or instruct the user to get the ABI from Etherscan/Blockscout manually

CHAIN IDs: Adds entries for BOTH 31337 (local fork) AND the real chainId,
so contracts work during local dev and after mainnet deployment.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        contracts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Display name for the contract (e.g., 'USDC', 'AavePool')",
              },
              type: {
                type: "string",
                description: "Contract type for bundled ABI: ERC20, ERC721, ERC4626, AaveV3Pool, AaveV3PoolDataProvider, UniswapV3Router, UniswapV3Quoter, UniswapV2Router",
              },
              address: {
                type: "string",
                description: "Contract address. If not provided, will look up from eth-mcp registry using name and chain.",
              },
              abi: {
                type: "array",
                description: "Custom ABI array. Only needed if type is not provided or contract is not in bundled ABIs.",
              },
            },
            required: ["name"],
          },
          description: "List of external contracts to configure",
        },
        chain: {
          type: "string",
          description: "Chain name for address lookup (mainnet, base, optimism, arbitrum, polygon). Defaults to project's configured chain.",
        },
      },
      required: ["contracts"],
    },
    handler: async (args: {
      contracts: Array<{
        name: string;
        type?: string;
        address?: string;
        abi?: unknown[];
      }>;
      chain?: string;
    }) => {
      const state = stateManager.getState();

      if (!state.initialized || !state.workspacePath) {
        return { success: false, error: "Stack not initialized. Run stack_init first." };
      }

      // Get chain config
      const chainName = args.chain || state.config?.chain || "mainnet";
      const chainData = CHAIN_BY_NAME[chainName.toLowerCase()] as ChainAddresses | undefined;
      if (!chainData) {
        return {
          success: false,
          error: `Unknown chain: ${chainName}. Supported: mainnet, base, optimism, arbitrum, polygon`,
        };
      }

      const realChainId = chainData.chainId;
      const forkChainId = 31337; // Local Anvil fork always uses 31337

      const configured: Array<{ name: string; address: string; abiSource: string }> = [];
      const needsManualAbi: Array<{ name: string; address?: string; reason: string }> = [];

      // Build contract entries
      const contractEntries: Record<string, { address: string; abi: unknown[] }> = {};

      for (const contract of args.contracts) {
        let address = contract.address;
        let abi: unknown[] | null = null;
        let abiSource = "custom";

        // Try to get address from registry if not provided
        if (!address) {
          // Check tokens first
          const token = chainData.tokens[contract.name];
          if (token) {
            address = token.address;
          } else {
            // Check protocol addresses
            for (const [protocolName, protocolAddresses] of Object.entries(chainData.protocols)) {
              const matchingKey = Object.keys(protocolAddresses).find(
                (key) => key.toLowerCase() === contract.name.toLowerCase()
              );
              if (matchingKey) {
                address = (protocolAddresses as Record<string, string>)[matchingKey];
                break;
              }
            }
          }
        }

        // If still no address, we can't configure this contract
        if (!address) {
          needsManualAbi.push({
            name: contract.name,
            reason: `Address not found in registry. Please provide the address explicitly.`,
          });
          continue;
        }

        // Get ABI
        if (contract.abi && Array.isArray(contract.abi) && contract.abi.length > 0) {
          abi = contract.abi;
          abiSource = "provided";
        } else if (contract.type && isValidContractType(contract.type)) {
          const bundledAbi = getAbiByType(contract.type as ContractType);
          if (bundledAbi) {
            abi = bundledAbi as unknown[];
            abiSource = `bundled (${contract.type})`;
          }
        }

        // If no ABI, add to needs manual list
        if (!abi) {
          const availableTypes = Object.keys(CONTRACT_TYPES).join(", ");
          needsManualAbi.push({
            name: contract.name,
            address,
            reason: `No bundled ABI found. Either provide a 'type' (${availableTypes}), provide a custom 'abi', or fetch from Blockscout/Etherscan.`,
          });
          continue;
        }

        contractEntries[contract.name] = { address, abi };
        configured.push({ name: contract.name, address, abiSource });
      }

      // If we have contracts to configure, write the file
      if (Object.keys(contractEntries).length > 0) {
        const externalContractsPath = path.join(
          state.workspacePath,
          "packages",
          "nextjs",
          "contracts",
          "externalContracts.ts"
        );

        // Build the externalContracts object for both chain IDs
        const buildChainEntry = (chainId: number) => {
          const entries = Object.entries(contractEntries)
            .map(([name, { address, abi }]) => {
              return `    ${name}: {
      address: "${address}",
      abi: ${JSON.stringify(abi, null, 6).replace(/\n/g, "\n      ")},
    }`;
            })
            .join(",\n");
          return `  ${chainId}: {\n${entries}\n  }`;
        };

        const fileContent = `import { GenericContractsDeclaration } from "~~/utils/scaffold-eth/contract";

/**
 * External contracts configuration
 * 
 * These are external protocol contracts (not deployed by you) that you want
 * to interact with in the debug UI.
 * 
 * Generated by eth-mcp stack_configureExternalContracts
 * Chain: ${chainName} (${realChainId})
 */
const externalContracts = {
${buildChainEntry(forkChainId)},
${buildChainEntry(realChainId)},
} as const;

export default externalContracts satisfies GenericContractsDeclaration;
`;

        try {
          // Ensure the contracts directory exists
          await fs.mkdir(path.dirname(externalContractsPath), { recursive: true });
          await fs.writeFile(externalContractsPath, fileContent);
        } catch (err) {
          return {
            success: false,
            error: `Failed to write externalContracts.ts: ${err instanceof Error ? err.message : String(err)}`,
          };
        }
      }

      // Build response
      const response: {
        success: boolean;
        message: string;
        configured: typeof configured;
        needsManualAbi?: typeof needsManualAbi;
        instructions?: string;
        filePath?: string;
      } = {
        success: configured.length > 0,
        message:
          configured.length > 0
            ? `Configured ${configured.length} external contract(s) for ${chainName}`
            : "No contracts were configured",
        configured,
        filePath: configured.length > 0
          ? "packages/nextjs/contracts/externalContracts.ts"
          : undefined,
      };

      if (needsManualAbi.length > 0) {
        response.needsManualAbi = needsManualAbi;
        response.instructions = `For contracts without bundled ABIs, you can:
1. Use Blockscout MCP: get_contract_abi({ chain_id: ${realChainId}, address: "0x..." })
2. Get from Etherscan: Go to the contract address, click "Contract" tab, copy ABI
3. Search the web for "[contract name] ABI"
Then call this tool again with the abi parameter.`;
      }

      return response;
    },
  },

  /**
   * stack.checkProductionReadiness - Verify RPC and env configuration before production deployment
   */
  checkProductionReadiness: {
    name: "stack_checkProductionReadiness",
    description: `Check if the project is ready for production deployment.

CRITICAL: Call this BEFORE deploying to Vercel or any production hosting.

This tool verifies:
1. RPC Configuration - Checks if NEXT_PUBLIC_ALCHEMY_API_KEY is set (required for non-Ethereum chains)
2. Environment files - Checks if .env.local exists with required variables
3. Chain compatibility - Warns about chains that need custom RPC

For chains like Base, Optimism, Arbitrum, Polygon:
- Public RPCs (mainnet.base.org) WILL fail with 429 rate limits in production
- You MUST set up your own RPC via Alchemy (free tier available)

Returns a pass/fail checklist with specific instructions for any failed items.`,
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
    handler: async () => {
      const state = stateManager.getState();

      if (!state.initialized || !state.workspacePath) {
        return { success: false, error: "Stack not initialized. Run stack_init first." };
      }

      const chain = state.config?.chain?.toLowerCase() || "";
      const chainId = state.config?.chainId || 31337;
      
      // Chains that need custom RPC (public RPCs fail with 429)
      const chainsNeedingCustomRpc = ["base", "optimism", "arbitrum", "polygon"];
      const needsCustomRpc = chainsNeedingCustomRpc.includes(chain);
      
      // Default Alchemy key from Scaffold-ETH (truncated, rate-limited)
      const DEFAULT_ALCHEMY_KEY = "cR4WnXePioePZ5fFrnSiR";
      
      const checks: Array<{
        name: string;
        status: "pass" | "fail" | "warning";
        message: string;
        action?: string;
      }> = [];

      // Check 1: .env.local exists
      const envLocalPath = path.join(state.workspacePath, "packages", "nextjs", ".env.local");
      let envLocalContent = "";
      let envLocalExists = false;
      try {
        envLocalContent = await fs.readFile(envLocalPath, "utf-8");
        envLocalExists = true;
        checks.push({
          name: "Environment File",
          status: "pass",
          message: ".env.local exists",
        });
      } catch {
        checks.push({
          name: "Environment File",
          status: needsCustomRpc ? "fail" : "warning",
          message: ".env.local does not exist",
          action: `Create packages/nextjs/.env.local (copy from .env.example)`,
        });
      }

      // Check 2: NEXT_PUBLIC_ALCHEMY_API_KEY is set and not the default
      if (needsCustomRpc) {
        const alchemyKeyMatch = envLocalContent.match(/NEXT_PUBLIC_ALCHEMY_API_KEY\s*=\s*([^\s\n]+)/);
        const alchemyKey = alchemyKeyMatch?.[1];
        
        if (!alchemyKey || alchemyKey === DEFAULT_ALCHEMY_KEY) {
          checks.push({
            name: "Alchemy RPC Key",
            status: "fail",
            message: alchemyKey 
              ? "Using default Alchemy key (rate-limited, will cause 429 errors)"
              : "NEXT_PUBLIC_ALCHEMY_API_KEY not set",
            action: [
              "1. Get a FREE API key from https://alchemy.com",
              "2. Add to packages/nextjs/.env.local:",
              "   NEXT_PUBLIC_ALCHEMY_API_KEY=your_actual_key_here",
              "3. For production: Add the same key to Vercel environment variables"
            ].join("\n"),
          });
        } else {
          checks.push({
            name: "Alchemy RPC Key",
            status: "pass",
            message: "Custom Alchemy API key is configured",
          });
        }
      } else if (chain === "mainnet" || chainId === 1) {
        checks.push({
          name: "Alchemy RPC Key",
          status: "pass",
          message: "Ethereum mainnet uses BuidlGuidl RPC by default (no custom key needed)",
        });
      } else {
        checks.push({
          name: "Alchemy RPC Key",
          status: "pass",
          message: "Local development (chainId 31337) - no custom RPC needed",
        });
      }

      // Check 3: scaffold.config.ts targetNetworks
      const scaffoldConfigPath = path.join(state.workspacePath, "packages", "nextjs", "scaffold.config.ts");
      try {
        const configContent = await fs.readFile(scaffoldConfigPath, "utf-8");
        const targetNetworksMatch = configContent.match(/targetNetworks:\s*\[([^\]]+)\]/);
        if (targetNetworksMatch) {
          const networks = targetNetworksMatch[1];
          const isLocalOnly = networks.includes("foundry") || networks.includes("hardhat") || networks.includes("31337");
          const hasMainnet = networks.includes("chains.base") || networks.includes("chains.optimism") || 
                           networks.includes("chains.arbitrum") || networks.includes("chains.polygon") ||
                           networks.includes("chains.mainnet");
          
          if (isLocalOnly) {
            checks.push({
              name: "Target Networks",
              status: "warning",
              message: "Currently targeting local network (foundry/hardhat)",
              action: "For production, update targetNetworks in scaffold.config.ts to your production chain",
            });
          } else if (hasMainnet) {
            checks.push({
              name: "Target Networks",
              status: "pass",
              message: `Configured for production chain: ${networks.trim()}`,
            });
          }
        }
      } catch {
        checks.push({
          name: "Target Networks",
          status: "warning",
          message: "Could not read scaffold.config.ts",
        });
      }

      // Build summary
      const failedChecks = checks.filter(c => c.status === "fail");
      const warningChecks = checks.filter(c => c.status === "warning");
      const passedChecks = checks.filter(c => c.status === "pass");

      const isReady = failedChecks.length === 0;

      return {
        success: true,
        productionReady: isReady,
        summary: isReady 
          ? `✓ Ready for production deployment (${passedChecks.length} checks passed)`
          : `✗ NOT ready for production (${failedChecks.length} critical issues)`,
        chain: {
          name: chain || "localhost",
          chainId,
          needsCustomRpc,
        },
        checks,
        ...(failedChecks.length > 0 ? {
          CRITICAL_ISSUES: {
            count: failedChecks.length,
            message: "You MUST fix these issues before deploying to production",
            issues: failedChecks.map(c => ({
              name: c.name,
              problem: c.message,
              solution: c.action,
            })),
          },
        } : {}),
        ...(warningChecks.length > 0 ? {
          WARNINGS: warningChecks.map(c => ({
            name: c.name,
            message: c.message,
            suggestion: c.action,
          })),
        } : {}),
        nextSteps: isReady
          ? [
              "1. Deploy frontend: yarn vercel (or your hosting provider)",
              "2. Set environment variables in your hosting dashboard",
              "3. Deploy contracts: yarn deploy --network " + chain,
            ]
          : [
              "1. Fix the critical issues listed above",
              "2. Run stack_checkProductionReadiness again to verify",
              "3. Then proceed with deployment",
            ],
      };
    },
  },
};
