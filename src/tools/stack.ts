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

/**
 * Create the Foundry package structure from scratch
 * Called when the cloned scaffold-eth-2 doesn't have a foundry package
 */
async function createFoundryPackage(
  workspacePath: string,
  chainConfig: { rpcUrl: string; chainId: number }
): Promise<void> {
  const foundryPath = path.join(workspacePath, "packages", "foundry");

  // Create directory structure
  await fs.mkdir(path.join(foundryPath, "contracts"), { recursive: true });
  await fs.mkdir(path.join(foundryPath, "script"), { recursive: true });
  await fs.mkdir(path.join(foundryPath, "test"), { recursive: true });
  await fs.mkdir(path.join(foundryPath, "deployments"), { recursive: true });

  // Create foundry.toml
  const foundryToml = `[profile.default]
src = "contracts"
out = "out"
libs = ["lib"]
fs_permissions = [{ access = "read-write", path = "./"}]

[rpc_endpoints]
default_network = "http://127.0.0.1:8545"
localhost = "http://127.0.0.1:8545"

[fmt]
line_length = 120
tab_width = 2
bracket_spacing = true
`;
  await fs.writeFile(path.join(foundryPath, "foundry.toml"), foundryToml);

  // Create remappings.txt
  const remappings = `forge-std/=lib/forge-std/src/
@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/
`;
  await fs.writeFile(path.join(foundryPath, "remappings.txt"), remappings);

  // Create package.json
  const packageJson = {
    name: "@se-2/foundry",
    version: "0.0.1",
    scripts: {
      account: "node script/ListAccount.js",
      chain: "anvil --config-out localhost.json",
      compile: "forge compile",
      deploy: "forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast",
      "deploy:verify": "forge script script/Deploy.s.sol --rpc-url ${1:-default_network} --broadcast --verify",
      flatten: "forge flatten",
      fork: `anvil --fork-url \${FORK_URL:-${chainConfig.rpcUrl}} --chain-id 31337`,
      format: "forge fmt",
      lint: "forge fmt --check",
      test: "forge test",
      verify: "forge verify-contract",
    },
    dependencies: {
      dotenv: "~16.3.1",
      envfile: "~6.18.0",
      ethers: "~5.7.2",
      qrcode: "~1.5.3",
      toml: "~3.0.0",
    },
  };
  await fs.writeFile(
    path.join(foundryPath, "package.json"),
    JSON.stringify(packageJson, null, 2)
  );

  // Create DeployHelpers.s.sol
  // NOTE: This uses Anvil's default account for LOCAL development only.
  // For mainnet deployment, users should run: yarn generate && yarn deploy --network <chain>
  const deployHelpers = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "forge-std/Vm.sol";

/**
 * @title ScaffoldETHDeploy
 * @notice Deployment helper for Scaffold-ETH 2 projects
 * 
 * LOCAL DEVELOPMENT (chainId 31337):
 *   Uses Anvil's default funded account - no configuration needed.
 * 
 * MAINNET DEPLOYMENT:
 *   DO NOT use this directly. Instead run:
 *   1. yarn generate - creates encrypted deployer keystore
 *   2. yarn account - shows deployer address (fund this)
 *   3. yarn deploy --network base - deploys with keystore
 */
contract ScaffoldETHDeploy is Script {
    error InvalidChain(string);

    struct Deployment {
        string name;
        address addr;
    }

    // Anvil's default account #0 - ONLY for local development
    uint256 constant ANVIL_DEFAULT_KEY = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;

    string root;
    string path;
    Deployment[] public deployments;

    modifier ScaffoldEthDeployerRunner() {
        uint256 deployerPrivateKey = getDeployerKey();
        vm.startBroadcast(deployerPrivateKey);
        _;
        vm.stopBroadcast();
        exportDeployments();
    }

    function getDeployerKey() internal view returns (uint256) {
        // For local development (Anvil), use the default funded account
        if (block.chainid == 31337) {
            return ANVIL_DEFAULT_KEY;
        }
        
        // For live networks, this script should NOT be used directly.
        // Users should run: yarn deploy --network <chain>
        // which handles keystore-based deployment securely.
        revert InvalidChain(
            "For mainnet deployment, use: yarn generate && yarn deploy --network <chain>"
        );
    }

    function exportDeployments() internal {
        string memory chainId = vm.toString(block.chainid);
        root = vm.projectRoot();
        path = string.concat(root, "/deployments/", chainId, ".json");

        string memory jsonKey = "deployments";

        uint256 len = deployments.length;
        for (uint256 i = 0; i < len; i++) {
            vm.serializeString(jsonKey, deployments[i].name, vm.toString(deployments[i].addr));
        }

        string memory finalJson = vm.serializeString(jsonKey, "chainId", chainId);
        vm.writeJson(finalJson, path);
    }

    function deployer() internal view returns (address) {
        if (block.chainid == 31337) {
            return vm.addr(ANVIL_DEFAULT_KEY);
        }
        // For live networks, deployer address comes from keystore
        return msg.sender;
    }
}
`;
  await fs.writeFile(
    path.join(foundryPath, "script", "DeployHelpers.s.sol"),
    deployHelpers
  );

  // Create empty Deploy.s.sol
  const deploySol = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";

contract DeployScript is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        // Deploy your contracts here
        // Example:
        // MyContract myContract = new MyContract();
        // console.log("MyContract deployed to:", address(myContract));
        // deployments.push(Deployment({ name: "MyContract", addr: address(myContract) }));
    }
}
`;
  await fs.writeFile(path.join(foundryPath, "script", "Deploy.s.sol"), deploySol);

  // Create .gitignore
  const gitignore = `cache/
out/
.env
broadcast/
`;
  await fs.writeFile(path.join(foundryPath, ".gitignore"), gitignore);
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
   * stack.init - Clone Scaffold-ETH and configure for a chain
   */
  init: {
    name: "stack_init",
    description: `Initialize a new Scaffold-ETH project configured for a specific mainnet chain.

IMPORTANT: The chain parameter specifies which MAINNET to fork for local development.
All development happens on a LOCAL Anvil fork (chainId 31337) - you never deploy directly to mainnet from here.

Supported chains: mainnet, base, optimism, arbitrum, polygon.
NO TESTNETS - use fork workflow instead (fork gives you real mainnet state for free).

Development workflow after init:
1. stack_install() - Install dependencies
2. stack_start(["fork"]) - Start local fork of the chain
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

        // Clone scaffold-eth-2
        const cloneCmd = `git clone https://github.com/scaffold-eth/scaffold-eth-2.git ${workspacePath}`;
        const safetyCheck = isCommandAllowed(cloneCmd);
        if (!safetyCheck.safe) {
          return { success: false, error: safetyCheck.reason };
        }

        await execAsync(cloneCmd, { timeout: 120000 });

        // Remove .git to make it a fresh project
        await fs.rm(path.join(workspacePath, ".git"), { recursive: true, force: true });

        const foundryPath = path.join(workspacePath, "packages", "foundry");
        const hardhatPath = path.join(workspacePath, "packages", "hardhat");

        // Check if foundry package exists in the cloned repo
        const foundryPackageExists = await fs
          .access(foundryPath)
          .then(() => true)
          .catch(() => false);

        // If foundry package doesn't exist, create it
        if (!foundryPackageExists) {
          await createFoundryPackage(workspacePath, chainConfig);
        }

        // Remove hardhat package if it exists (we want foundry-only)
        await fs.rm(hardhatPath, { recursive: true, force: true }).catch(() => {});

        // Create/update .env file for foundry - NO PRIVATE KEYS
        // Local development uses Anvil's built-in funded accounts
        // Mainnet deployment uses yarn generate (encrypted keystore)
        const envContent = `# Foundry environment - DO NOT COMMIT THIS FILE
# Chain configuration for forking
FORK_URL=${chainConfig.rpcUrl}
CHAIN_ID=${chainConfig.chainId}

# ============================================================
# DEPLOYER ACCOUNT SECURITY
# ============================================================
# DO NOT add DEPLOYER_PRIVATE_KEY here!
#
# For LOCAL development:
#   Uses Anvil's built-in funded accounts automatically.
#
# For MAINNET deployment:
#   1. Run: yarn generate (creates encrypted keystore)
#   2. Run: yarn account (shows address to fund)
#   3. Fund the deployer address with ETH
#   4. Run: yarn deploy --network base
# ============================================================
`;
        await fs.writeFile(path.join(foundryPath, ".env"), envContent);

        // Install forge dependencies (forge-std, OpenZeppelin) if not present
        const forgeStdPath = path.join(foundryPath, "lib", "forge-std");
        const forgeStdExists = await fs
          .access(forgeStdPath)
          .then(() => true)
          .catch(() => false);

        if (!forgeStdExists) {
          try {
            // Initialize git in foundry folder for forge install to work
            await execAsync("git init", { cwd: foundryPath });
            await execAsync(
              "forge install foundry-rs/forge-std OpenZeppelin/openzeppelin-contracts --no-commit",
              { cwd: foundryPath, timeout: 120000 }
            );
          } catch (err) {
            // Don't fail init - user can install manually
            console.error("Warning: Could not install forge dependencies:", err);
          }
        }

        // Initialize new git repo for the whole project
        await execAsync("git init", { cwd: workspacePath });

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
- fork: Start LOCAL Anvil fork of the configured mainnet (chainId 31337)
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
            // Run anvil fork from the foundry package directory
            const foundryPath = path.join(workspacePath, "packages", "foundry");
            const result = await processManager.start(
              "fork",
              "yarn",
              ["fork"],
              foundryPath
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

  /**
   * stack.generateAccount - Create encrypted deployer account
   */
  generateAccount: {
    name: "stack_generateAccount",
    description: `Create an encrypted deployer account for mainnet deployment.

This runs 'yarn generate' which:
- For Foundry: Creates a new keystore in ~/.foundry/keystore (password-protected)
- For Hardhat: Creates DEPLOYER_PRIVATE_KEY_ENCRYPTED in .env (password-protected)

The user will be prompted to set an encryption password.
REMEMBER: This password is needed for all future deployments.

After generating, run stack_checkAccount to see the deployer address, then fund it with ETH.`,
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

      try {
        const { stdout, stderr } = await execAsync("yarn generate", {
          cwd: state.workspacePath,
          timeout: 60000,
        });

        return {
          success: true,
          message: "Deployer account created successfully",
          output: stdout,
          note: stderr || undefined,
          nextSteps: [
            "Run stack_checkAccount to see your deployer address",
            "Fund the deployer address with 0.01-0.1 ETH",
            "Then run: yarn deploy --network <chain>",
          ],
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        return {
          success: false,
          error,
          hint: "You can also run 'yarn generate' manually in the project directory",
        };
      }
    },
  },

  /**
   * stack.checkAccount - Show deployer account info
   */
  checkAccount: {
    name: "stack_checkAccount",
    description: `Show the deployer account address and balances.

This runs 'yarn account' which displays:
- Deployer address
- ETH balance on various networks

Use this to:
1. Get the address to fund before mainnet deployment
2. Verify the account has enough ETH for gas

Note: May prompt for the encryption password set during yarn generate.`,
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

      try {
        const { stdout, stderr } = await execAsync("yarn account", {
          cwd: state.workspacePath,
          timeout: 30000,
        });

        // Try to extract the address from output
        const addressMatch = stdout.match(/0x[a-fA-F0-9]{40}/);
        const address = addressMatch ? addressMatch[0] : null;

        return {
          success: true,
          address,
          output: stdout,
          note: stderr || undefined,
          nextSteps: address
            ? [
                `Fund ${address} with 0.01-0.1 ETH`,
                "Then run: yarn deploy --network <chain>",
              ]
            : ["Run stack_generateAccount first to create a deployer account"],
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        
        // Check if this is a "no account" error
        if (error.includes("No deployer") || error.includes("generate")) {
          return {
            success: false,
            error: "No deployer account found",
            hint: "Run stack_generateAccount first to create an encrypted deployer account",
          };
        }

        return {
          success: false,
          error,
          hint: "You can also run 'yarn account' manually in the project directory",
        };
      }
    },
  },
};
