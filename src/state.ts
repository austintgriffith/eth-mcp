/**
 * State management for ethereum-mcp
 * Tracks workspace, processes, deployed contracts, and stack status
 */

export interface DeployedContract {
  name: string;
  address: string;
  chainId: number;
  deployedAt: number;
  txHash?: string;
}

export interface StackConfig {
  template: "scaffold-eth";
  chain: string;
  chainId: number;
  rpcUrl: string;
  blockExplorer?: string;
}

export interface StackState {
  initialized: boolean;
  installed: boolean;
  config: StackConfig | null;
  workspacePath: string | null;
  components: {
    fork: "stopped" | "starting" | "running" | "error";
    deploy: "idle" | "deploying" | "deployed" | "error";
    frontend: "stopped" | "starting" | "running" | "error";
  };
  deployedContracts: DeployedContract[];
  ports: {
    fork: number;
    frontend: number;
  };
  urls: {
    rpc: string | null;
    frontend: string | null;
  };
  lastError: string | null;
}

/**
 * Supported mainnet chains for forking.
 * 
 * IMPORTANT: No testnets! The development workflow is:
 * 1. Fork mainnet locally (yarn fork --network base)
 * 2. Test everything on the local fork (free, real state)
 * 3. Deploy to mainnet when ready (yarn deploy --network base)
 * 
 * Testnets are NOT recommended because:
 * - Different contract addresses than mainnet
 * - Fake/missing liquidity and state
 * - Forks give you real mainnet state for free
 */
const CHAIN_CONFIGS: Record<string, { chainId: number; rpcUrl: string; blockExplorer: string }> = {
  mainnet: {
    chainId: 1,
    rpcUrl: "https://eth.llamarpc.com",
    blockExplorer: "https://etherscan.io",
  },
  base: {
    chainId: 8453,
    rpcUrl: "https://mainnet.base.org",
    blockExplorer: "https://basescan.org",
  },
  optimism: {
    chainId: 10,
    rpcUrl: "https://mainnet.optimism.io",
    blockExplorer: "https://optimistic.etherscan.io",
  },
  arbitrum: {
    chainId: 42161,
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    blockExplorer: "https://arbiscan.io",
  },
  polygon: {
    chainId: 137,
    rpcUrl: "https://polygon-rpc.com",
    blockExplorer: "https://polygonscan.com",
  },
  // NO TESTNETS - Use fork workflow instead!
  // Forking mainnet gives you real state for free.
};

class StateManager {
  private state: StackState;

  constructor() {
    this.state = this.getInitialState();
  }

  private getInitialState(): StackState {
    return {
      initialized: false,
      installed: false,
      config: null,
      workspacePath: null,
      components: {
        fork: "stopped",
        deploy: "idle",
        frontend: "stopped",
      },
      deployedContracts: [],
      ports: {
        fork: 8545,
        frontend: 3000,
      },
      urls: {
        rpc: null,
        frontend: null,
      },
      lastError: null,
    };
  }

  getState(): StackState {
    return { ...this.state };
  }

  getChainConfig(chain: string) {
    return CHAIN_CONFIGS[chain] || null;
  }

  getSupportedChains(): string[] {
    return Object.keys(CHAIN_CONFIGS);
  }

  setInitialized(workspacePath: string, config: StackConfig) {
    this.state.initialized = true;
    this.state.workspacePath = workspacePath;
    this.state.config = config;
    this.state.lastError = null;
  }

  setInstalled() {
    this.state.installed = true;
    this.state.lastError = null;
  }

  setComponentStatus(
    component: "fork" | "deploy" | "frontend",
    status: StackState["components"]["fork"] | StackState["components"]["deploy"] | StackState["components"]["frontend"]
  ) {
    if (component === "fork") {
      this.state.components.fork = status as StackState["components"]["fork"];
      if (status === "running") {
        this.state.urls.rpc = `http://localhost:${this.state.ports.fork}`;
      } else if (status === "stopped" || status === "error") {
        this.state.urls.rpc = null;
      }
    } else if (component === "deploy") {
      this.state.components.deploy = status as StackState["components"]["deploy"];
    } else if (component === "frontend") {
      this.state.components.frontend = status as StackState["components"]["frontend"];
      if (status === "running") {
        this.state.urls.frontend = `http://localhost:${this.state.ports.frontend}`;
      } else if (status === "stopped" || status === "error") {
        this.state.urls.frontend = null;
      }
    }
  }

  addDeployedContract(contract: DeployedContract) {
    this.state.deployedContracts.push(contract);
  }

  clearDeployedContracts() {
    this.state.deployedContracts = [];
  }

  setError(error: string) {
    this.state.lastError = error;
  }

  clearError() {
    this.state.lastError = null;
  }

  reset() {
    this.state = this.getInitialState();
  }

  getStatusReport(): object {
    const state = this.getState();
    return {
      ready: state.initialized && state.installed,
      workspace: state.workspacePath,
      chain: state.config?.chain || null,
      chainId: state.config?.chainId || null,
      components: state.components,
      urls: state.urls,
      ports: state.ports,
      deployedContracts: state.deployedContracts.map((c) => ({
        name: c.name,
        address: c.address,
      })),
      error: state.lastError,
    };
  }
}

// Singleton instance
export const stateManager = new StateManager();
