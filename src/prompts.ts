/**
 * MCP Prompts for eth-mcp
 * 
 * These prompts provide AI agents with guidance on using eth-mcp
 * effectively, including recommendations for companion MCP servers.
 */

export interface Prompt {
  name: string;
  description: string;
  arguments: Array<{
    name: string;
    description: string;
    required: boolean;
  }>;
}

export interface PromptMessage {
  role: "user" | "assistant";
  content: {
    type: "text";
    text: string;
  };
}

/**
 * Available prompts that can be listed by the MCP client
 */
export const prompts: Prompt[] = [
  {
    name: "blockchain-exploration",
    description: "Guidance on using Blockscout MCP alongside eth-mcp for blockchain exploration, transaction analysis, and contract verification",
    arguments: [],
  },
  {
    name: "recommended-setup",
    description: "Recommended MCP configuration for comprehensive Ethereum development with eth-mcp and companion servers",
    arguments: [],
  },
  {
    name: "development-workflow",
    description: "Best practices for using eth-mcp with other MCP servers in a complete development workflow",
    arguments: [],
  },
  {
    name: "companion-mcps",
    description: "Guide on using eth-mcp with ENS MCP and Blockscout MCP for complete Ethereum development - when to use each server",
    arguments: [],
  },
  {
    name: "vault-building",
    description: "Guide for building ERC-4626 yield vaults with eth-mcp - strategy patterns, yield sources, and security considerations",
    arguments: [],
  },
  {
    name: "yield-comparison",
    description: "How to find and compare the best yields using eth-mcp's DefiLlama tools - APY research for vault strategies",
    arguments: [],
  },
];

/**
 * Get the prompt content for a given prompt name
 */
export function getPromptMessages(name: string): PromptMessage[] | null {
  switch (name) {
    case "blockchain-exploration":
      return [
        {
          role: "user",
          content: {
            type: "text",
            text: "When should I use Blockscout MCP with eth-mcp?",
          },
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `# Using Blockscout MCP with eth-mcp

eth-mcp handles **local development**: scaffolding projects, running Anvil forks, deploying contracts, and serving frontends.

Blockscout MCP handles **blockchain exploration**: reading on-chain data, analyzing transactions, and verifying contract state.

## When to Use Blockscout MCP

Use Blockscout MCP alongside eth-mcp when you need to:

1. **Verify Deployed Contracts** - After deploying with eth-mcp, use Blockscout to verify the contract is live and check its state
2. **Check Transaction Status** - Analyze transaction details, gas usage, and event logs
3. **Explore On-Chain State** - Read token balances, NFT ownership, contract storage
4. **Debug Failed Transactions** - Get detailed error information and trace execution
5. **Research Existing Contracts** - Before building, explore how existing protocols work
6. **Verify Token/Protocol Addresses** - Look up official contract addresses on mainnet

## Example Workflow

\`\`\`
1. Use eth-mcp to scaffold a Uniswap integration project
2. Use Blockscout to look up Uniswap V3 Router address on your target chain
3. Use eth-mcp to write contracts that integrate with Uniswap
4. Use eth-mcp to deploy to local Anvil fork
5. Use Blockscout to verify mainnet state your fork is based on
6. Use eth-mcp to start frontend and test
\`\`\`

## Blockscout MCP Tools

Key Blockscout tools that complement eth-mcp:
- \`get_address_info\` - Check if contract exists, get balance, verify status
- \`get_transaction_info\` - Detailed transaction analysis
- \`get_contract_abi\` - Fetch ABI for existing contracts
- \`lookup_token_by_symbol\` - Find token addresses
- \`get_tokens_by_address\` - Check wallet token holdings
- \`transaction_summary\` - Human-readable transaction descriptions`,
          },
        },
      ];

    case "recommended-setup":
      return [
        {
          role: "user",
          content: {
            type: "text",
            text: "What MCP servers should I use for Ethereum development?",
          },
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `# Recommended MCP Stack for Ethereum Development

For comprehensive Ethereum development, we recommend using eth-mcp alongside these companion MCP servers:

## Core Stack (All Three Recommended)

### 1. eth-mcp (this server)
**Purpose**: Local development environment
- Scaffold-ETH project management
- Anvil fork management
- Contract deployment
- Frontend development
- DeFi yield data queries

### 2. mcp-server-ens
**Purpose**: ENS name resolution
- Resolve .eth names to addresses
- Get ENS records (avatar, socials, etc.)
- Reverse resolution (address → name)
- Essential for user-facing dApps

### 3. Blockscout MCP
**Purpose**: Blockchain exploration and analysis
- Transaction analysis
- Contract verification
- On-chain data queries
- Multi-chain support

## Configuration

Add all three to your \`~/.cursor/mcp.json\`:

\`\`\`json
{
  "mcpServers": {
    "eth-mcp": {
      "command": "npx",
      "args": ["-y", "eth-mcp@latest"]
    },
    "ens": {
      "command": "npx",
      "args": ["-y", "mcp-server-ens"]
    },
    "blockscout": {
      "command": "npx",
      "args": ["-y", "@blockscout/mcp-server"]
    }
  }
}
\`\`\`

## Division of Responsibilities

| Task | eth-mcp | ENS MCP | Blockscout |
|------|:-------:|:-------:|:----------:|
| Create project | ✅ | | |
| Deploy contracts | ✅ | | |
| Run local fork | ✅ | | |
| Start frontend | ✅ | | |
| Resolve vitalik.eth | | ✅ | |
| Get ENS records | | ✅ | |
| Check mainnet state | | | ✅ |
| Analyze transactions | | | ✅ |
| Get contract ABIs | | | ✅ |
| Verify deployments | | | ✅ |
| Look up addresses | ✅ (registry) | | ✅ (live) |
| Query DeFi yields | ✅ | | |`,
          },
        },
      ];

    case "development-workflow":
      return [
        {
          role: "user",
          content: {
            type: "text",
            text: "How do I use eth-mcp and Blockscout together in a development workflow?",
          },
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `# Multi-MCP Development Workflow

Here's how to effectively use eth-mcp and Blockscout MCP together when building Ethereum applications.

## Phase 1: Research (Blockscout)

Before building, use Blockscout to understand what you're integrating with:

\`\`\`
1. Look up protocol addresses: blockscout.lookup_token_by_symbol("USDC", "8453")
2. Get contract ABIs: blockscout.get_contract_abi("8453", "0x...")
3. Analyze example transactions: blockscout.transaction_summary("8453", "0x...")
\`\`\`

## Phase 2: Build (eth-mcp)

Use eth-mcp to create your project:

\`\`\`
1. Initialize: eth-mcp.stack_init({ template: "scaffold-eth", chain: "base" })
2. Install: eth-mcp.stack_install()
3. Write contracts: eth-mcp.project_writeFile({ path: "...", content: "..." })
4. Deploy locally: eth-mcp.stack_start({ components: ["fork", "deploy"] })
\`\`\`

## Phase 3: Verify (Blockscout)

After deploying, verify your fork's state matches mainnet:

\`\`\`
1. Check forked contract state: blockscout.read_contract(...)
2. Verify token balances: blockscout.get_tokens_by_address(...)
3. Compare with your local state
\`\`\`

## Phase 4: Test & Iterate

\`\`\`
1. Start frontend: eth-mcp.stack_start({ components: ["frontend"] })
2. Test interactions manually
3. Check logs: eth-mcp.process_logs({ id: "frontend" })
4. Make changes: eth-mcp.project_writeFile(...)
5. Redeploy if needed: eth-mcp.stack_start({ components: ["deploy"] })
\`\`\`

## Example: Building a Token Swap

\`\`\`
// Research phase
1. blockscout.lookup_token_by_symbol("8453", "WETH") → 0x4200...
2. blockscout.get_contract_abi("8453", "0x4200...") → ERC20 ABI

// Build phase  
3. eth-mcp.stack_init({ template: "scaffold-eth", chain: "base" })
4. eth-mcp.project_writeFile({ path: ".../SwapContract.sol", content: "..." })
5. eth-mcp.stack_start({ components: ["fork", "deploy", "frontend"] })

// Verify phase
6. blockscout.get_address_info("8453", "0x4200...") → Verify WETH exists
7. Test swap on localhost:3000
\`\`\`

## Tips

- Always verify mainnet addresses before hardcoding them
- Use Blockscout to understand gas costs of similar transactions
- Check Blockscout for contract verification status before integrating`,
          },
        },
      ];

    case "companion-mcps":
      return [
        {
          role: "user",
          content: {
            type: "text",
            text: "What MCP servers should I use alongside eth-mcp for Ethereum development?",
          },
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `# Companion MCPs for eth-mcp

eth-mcp is designed to work alongside two essential companion MCP servers for complete Ethereum development.

## The Recommended Stack

| MCP Server | Package | Purpose |
|------------|---------|---------|
| **eth-mcp** | eth-mcp | Build, deploy, run local dev |
| **ENS MCP** | mcp-server-ens | Resolve .eth names to addresses |
| **Blockscout MCP** | @blockscout/mcp-server | Blockchain exploration & analysis |

## Installation

Add all three to your \`~/.cursor/mcp.json\`:

\`\`\`json
{
  "mcpServers": {
    "eth-mcp": {
      "command": "npx",
      "args": ["-y", "eth-mcp@latest"]
    },
    "ens": {
      "command": "npx",
      "args": ["-y", "mcp-server-ens"]
    },
    "blockscout": {
      "command": "npx",
      "args": ["-y", "@blockscout/mcp-server"]
    }
  }
}
\`\`\`

## When to Use Each

### ENS MCP - Name Resolution
Use when you need to:
- Resolve \`vitalik.eth\` → \`0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045\`
- Get ENS records (avatar, Twitter, email, etc.)
- Reverse resolve address → ENS name
- Build user-facing apps that accept .eth names

### Blockscout MCP - Blockchain Exploration
Use when you need to:
- Look up transaction details and traces
- Get contract ABIs from verified contracts
- Check token balances and holdings
- Analyze gas usage patterns
- Research existing protocol implementations

### eth-mcp - Local Development
Use when you need to:
- Scaffold new projects
- Deploy contracts to local fork
- Manage development processes
- Look up known token/protocol addresses
- Query DeFi yield data

## Example Workflow: Building a Donation App

\`\`\`
1. ENS: Resolve "vitalik.eth" to get recipient address
   → ens.resolve_name("vitalik.eth")
   → 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045

2. Blockscout: Check what tokens they hold
   → blockscout.get_tokens_by_address("1", "0xd8dA...")
   → USDC, ETH, various NFTs

3. eth-mcp: Scaffold the donation dApp
   → stack_init({ template: "scaffold-eth", chain: "mainnet" })

4. eth-mcp: Write donation contract
   → project_writeFile({ path: "contracts/Donate.sol", ... })

5. eth-mcp: Deploy and start frontend
   → stack_start({ components: ["fork", "deploy", "frontend"] })

6. Blockscout: Verify contract interactions look correct
   → blockscout.get_contract_abi(...)
\`\`\`

## Division of Responsibilities

| Task | eth-mcp | ENS | Blockscout |
|------|:-------:|:---:|:----------:|
| Scaffold project | ✅ | | |
| Deploy contracts | ✅ | | |
| Resolve .eth names | | ✅ | |
| Get ENS avatar/records | | ✅ | |
| Analyze transactions | | | ✅ |
| Get contract ABIs | | | ✅ |
| Token/protocol addresses | ✅ | | ✅ |
| Live yield data | ✅ | | |`,
          },
        },
      ];

    case "vault-building":
      return [
        {
          role: "user",
          content: {
            type: "text",
            text: "How do I build an ERC-4626 yield vault with eth-mcp?",
          },
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `# Building ERC-4626 Yield Vaults with eth-mcp

ERC-4626 is the standard for tokenized vaults. Here's how to build one with eth-mcp.

## ERC-4626 Overview

The standard defines a vault that:
- Accepts deposits of an underlying asset (e.g., USDC)
- Issues shares representing ownership
- Generates yield from some strategy
- Allows redemption of shares for underlying + yield

### Key Functions
\`\`\`solidity
// Deposits
deposit(uint256 assets, address receiver) → shares
mint(uint256 shares, address receiver) → assets

// Withdrawals  
withdraw(uint256 assets, address receiver, address owner) → shares
redeem(uint256 shares, address receiver, address owner) → assets

// Accounting
convertToShares(uint256 assets) → shares
convertToAssets(uint256 shares) → assets
totalAssets() → total underlying held
\`\`\`

## Building a Simple Aave Vault

### Step 1: Research yields with eth-mcp
\`\`\`
defi_getYields({ chain: "base", protocol: "aave-v3" })
→ USDC: 4.2% APY, WETH: 2.1% APY
\`\`\`

### Step 2: Get protocol addresses
\`\`\`
addresses_getProtocol({ chain: "base", protocol: "aaveV3" })
→ pool: 0xA238Dd80C259a72e81d7e4664a9801593F98d1c5
\`\`\`

### Step 3: Scaffold project
\`\`\`
stack_init({ template: "scaffold-eth", chain: "base", workspacePath: "/tmp/aave-vault" })
stack_install()
\`\`\`

### Step 4: Write the vault contract
\`\`\`solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IAavePool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}

contract AaveVault is ERC4626 {
    using SafeERC20 for IERC20;
    
    IAavePool public immutable aavePool;
    IERC20 public immutable aToken;
    
    constructor(
        IERC20 asset_,
        IAavePool aavePool_,
        IERC20 aToken_
    ) ERC4626(asset_) ERC20("Aave Yield Vault", "aVault") {
        aavePool = aavePool_;
        aToken = aToken_;
        asset_.approve(address(aavePool_), type(uint256).max);
    }
    
    function totalAssets() public view override returns (uint256) {
        return aToken.balanceOf(address(this));
    }
    
    function _deposit(address caller, address receiver, uint256 assets, uint256 shares) internal override {
        super._deposit(caller, receiver, assets, shares);
        aavePool.supply(asset(), assets, address(this), 0);
    }
    
    function _withdraw(address caller, address receiver, address owner, uint256 assets, uint256 shares) internal override {
        aavePool.withdraw(asset(), assets, receiver);
        // Note: shares are burned in parent _withdraw
        super._withdraw(caller, receiver, owner, assets, shares);
    }
}
\`\`\`

### Step 5: Deploy and test
\`\`\`
stack_start({ components: ["fork", "deploy", "frontend"] })
\`\`\`

## Security Considerations

1. **Inflation Attack**: First depositor can manipulate share price
   - Mitigation: Mint dead shares on deployment or use virtual shares

2. **Rounding**: Always round in favor of the vault
   - \`convertToShares\`: round down
   - \`convertToAssets\`: round down

3. **Reentrancy**: Use ReentrancyGuard on deposit/withdraw

4. **Oracle Manipulation**: If using external prices, use TWAPs

## Common Vault Patterns

| Pattern | Yield Source | Complexity |
|---------|--------------|------------|
| Lending Vault | Aave/Compound supply | Low |
| LP Vault | Uniswap/Curve LP fees | Medium |
| Strategy Vault | Multiple sources | High |
| Delta-Neutral | Long + short positions | Very High |

## Next Steps

1. Use \`defi_compareYields\` to find best yield sources
2. Check docs/YIELD_VAULT_GUIDE.md for detailed patterns
3. Look at protocol-packs/aave-vault for complete implementation`,
          },
        },
      ];

    case "yield-comparison":
      return [
        {
          role: "user",
          content: {
            type: "text",
            text: "How do I find the best yields for my vault strategy?",
          },
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `# Finding Best Yields with eth-mcp

eth-mcp includes DeFi tools that query DefiLlama for live yield data. Here's how to use them effectively.

## Available Tools

### defi_getYields
Query top yields by chain and/or protocol:
\`\`\`
defi_getYields({ chain: "base" })
→ Returns top yield opportunities on Base

defi_getYields({ chain: "base", protocol: "aave-v3" })
→ Returns Aave V3 yields on Base specifically

defi_getYields({ asset: "USDC" })
→ Returns best USDC yields across all chains
\`\`\`

### defi_compareYields
Compare yields for a specific asset across protocols:
\`\`\`
defi_compareYields({ asset: "USDC", chain: "base" })
→ Aave V3: 4.2% APY, $50M TVL
→ Moonwell: 5.1% APY, $20M TVL  
→ Morpho: 6.3% APY, $8M TVL
\`\`\`

### defi_getProtocolTVL
Check protocol health via TVL:
\`\`\`
defi_getProtocolTVL({ protocol: "aave" })
→ Total: $12.5B across all chains
→ Ethereum: $8B, Base: $500M, Arbitrum: $2B
\`\`\`

## Yield Research Workflow

### Step 1: Identify your constraints
- What chain? (Base, Arbitrum, Mainnet)
- What asset? (USDC, ETH, etc.)
- Risk tolerance? (Higher APY = higher risk usually)

### Step 2: Query yields
\`\`\`
// Find all USDC yields on your target chain
defi_getYields({ chain: "base", asset: "USDC" })
\`\`\`

### Step 3: Compare top options
\`\`\`
defi_compareYields({ asset: "USDC", chain: "base" })
\`\`\`

### Step 4: Verify protocol safety
\`\`\`
// Check TVL (higher = more battle-tested)
defi_getProtocolTVL({ protocol: "moonwell" })

// Use Blockscout to analyze recent transactions
blockscout.get_transactions_by_address(...)
\`\`\`

### Step 5: Get integration addresses
\`\`\`
addresses_getProtocol({ chain: "base", protocol: "moonwell" })
→ comptroller, mWETH, mUSDbC, flagshipETH vault
\`\`\`

## Yield vs Risk Framework

| APY Range | Typical Sources | Risk Level |
|-----------|-----------------|------------|
| 1-5% | Blue chip lending (Aave, Compound) | Low |
| 5-10% | Smaller lending, LP fees | Medium |
| 10-20% | Incentivized pools, newer protocols | Medium-High |
| 20%+ | Points farming, complex strategies | High |

## Red Flags

- APY seems too good to be true (50%+ sustained)
- Very low TVL (< $1M) with high APY
- No audit history
- Anonymous team
- Complex tokenomics you don't understand

## Example: Building a USDC Vault on Base

\`\`\`
1. Research: defi_compareYields({ asset: "USDC", chain: "base" })
   → Moonwell Flagship USDC: 5.2% APY, $25M TVL ✓

2. Get addresses: addresses_getProtocol({ chain: "base", protocol: "moonwell" })
   → flagshipUSDC: 0xc1256Ae5FF1cf2719D4937adb3bbCCab2E00A2Ca

3. Scaffold: stack_init({ template: "scaffold-eth", chain: "base" })

4. Since Moonwell Flagship is already ERC-4626, you can:
   - Use it directly
   - Or wrap it with additional logic (fees, access control)

5. Deploy and test: stack_start({ components: ["fork", "deploy", "frontend"] })
\`\`\`

## Pro Tips

1. **Diversify**: Don't put all funds in highest APY
2. **Monitor**: Yields change - what's best today may not be tomorrow
3. **Gas costs**: Factor in deposit/withdraw gas when comparing
4. **IL risk**: LP positions have impermanent loss risk
5. **Smart contract risk**: Higher TVL = more eyes = safer (usually)`,
          },
        },
      ];

    default:
      return null;
  }
}
