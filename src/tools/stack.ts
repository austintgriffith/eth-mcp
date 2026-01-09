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

const execAsync = promisify(exec);

export const stackTools = {
  /**
   * stack.init - Clone Scaffold-ETH and configure for a chain
   */
  init: {
    name: "stack_init",
    description: `Initialize a new Scaffold-ETH project configured for a specific chain.
This clones the scaffold-eth-2 repository with FOUNDRY (not hardhat) + Next.js and sets up the environment.
Supported chains: mainnet, base, optimism, arbitrum, polygon, sepolia.
The workspace path should be an empty directory.
Always uses Foundry for smart contract development (forge, anvil, cast).`,
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

      // Get chain config
      const chainConfig = stateManager.getChainConfig(chain);
      if (!chainConfig) {
        return {
          success: false,
          error: `Unsupported chain: ${chain}. Supported: ${stateManager.getSupportedChains().join(", ")}`,
        };
      }

      try {
        // Check if directory exists and is empty
        try {
          const files = await fs.readdir(workspacePath);
          if (files.length > 0) {
            return { success: false, error: "Workspace directory must be empty" };
          }
        } catch {
          // Directory doesn't exist, create it
          await fs.mkdir(workspacePath, { recursive: true });
        }

        // Clone scaffold-eth-2 with foundry extension
        const cloneCmd = `git clone https://github.com/scaffold-eth/scaffold-eth-2.git ${workspacePath}`;
        const safetyCheck = isCommandAllowed(cloneCmd);
        if (!safetyCheck.safe) {
          return { success: false, error: safetyCheck.reason };
        }

        await execAsync(cloneCmd);

        // Remove .git to make it a fresh project
        await fs.rm(path.join(workspacePath, ".git"), { recursive: true, force: true });

        // Remove hardhat package to ensure foundry is used
        await fs.rm(path.join(workspacePath, "packages", "hardhat"), { recursive: true, force: true }).catch(() => {});

        // Initialize new git repo
        await execAsync("git init", { cwd: workspacePath });

        // Create .env file for foundry with chain RPC
        const envContent = `# Foundry environment\nFORK_URL=${chainConfig.rpcUrl}\nCHAIN_ID=${chainConfig.chainId}\n`;
        await fs.writeFile(path.join(workspacePath, "packages", "foundry", ".env"), envContent);

        // Configure scaffold.config.ts with correct polling interval
        // Mainnet: 5000ms (slower blocks), L2s: 3000ms (faster blocks)
        const pollingInterval = chain === "mainnet" ? 5000 : 3000;
        const scaffoldConfigPath = path.join(workspacePath, "packages", "nextjs", "scaffold.config.ts");
        
        try {
          let configContent = await fs.readFile(scaffoldConfigPath, "utf-8");
          // Update targetNetworks to use the selected chain
          // Update pollingInterval based on chain
          configContent = configContent.replace(
            /pollingInterval:\s*\d+/,
            `pollingInterval: ${pollingInterval}`
          );
          await fs.writeFile(scaffoldConfigPath, configContent);
        } catch (err) {
          // Config file might not exist yet or have different format
          console.error("Could not update scaffold.config.ts:", err);
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
          chain: {
            name: chain,
            chainId: chainConfig.chainId,
            rpcUrl: chainConfig.rpcUrl,
          },
          nextStep: "Run stack.install() to install dependencies",
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
    description: `Start one or more stack components.
Components:
- fork: Start local Anvil fork of the configured chain
- deploy: Deploy contracts to the local fork
- frontend: Start the Next.js development server

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
            stateManager.setComponentStatus("fork", "starting");
            // Use yarn fork with the network flag to fork the configured chain
            const chainName = state.config!.chain;
            const result = await processManager.start(
              "fork",
              "yarn",
              ["fork", "--network", chainName],
              workspacePath
            );
            if (result.success) {
              // Wait a moment for anvil to start
              await new Promise((resolve) => setTimeout(resolve, 5000));
              stateManager.setComponentStatus("fork", "running");
            } else {
              stateManager.setComponentStatus("fork", "error");
            }
            results.fork = result;
            break;
          }

          case "deploy": {
            stateManager.setComponentStatus("deploy", "deploying");
            // Deploy using foundry (forge script)
            try {
              // Use yarn deploy which runs the foundry deploy script
              const { stdout } = await execAsync("yarn deploy", {
                cwd: workspacePath,
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
      return {
        success: allSuccess,
        results,
        urls: stateManager.getState().urls,
        message: allSuccess
          ? "All components started successfully"
          : "Some components failed to start",
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
};
