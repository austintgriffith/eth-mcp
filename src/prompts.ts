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
    name: "deployment-workflow",
    description: "CRITICAL: The correct deployment workflow for Scaffold-ETH - fork first, test locally, then mainnet. NEVER use testnets.",
    arguments: [],
  },
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
  {
    name: "education-workflow",
    description: "How to use eth-mcp's education tools to surface Web3 gotchas and teaching moments during development",
    arguments: [],
  },
  {
    name: "frontend-design",
    description: "CRITICAL: How to create professional frontends - NO purple gradients. Use DaisyUI themes, context-appropriate styling, and proper design systems.",
    arguments: [],
  },
  {
    name: "rpc-configuration",
    description: "CRITICAL: How to configure RPC endpoints for production. Public RPCs fail with 429 errors - use BuidlGuidl for Ethereum, get Alchemy keys for other chains.",
    arguments: [],
  },
  {
    name: "test-wallet-funding",
    description: "CRITICAL: How to fund test wallets with tokens (USDC, WETH, etc.) on Anvil forks. Use whale impersonation from Morpho/Aave protocol contracts.",
    arguments: [],
  },
];

/**
 * Get the prompt content for a given prompt name
 */
export function getPromptMessages(name: string): PromptMessage[] | null {
  switch (name) {
    case "deployment-workflow":
      return [
        {
          role: "user",
          content: {
            type: "text",
            text: "How should I deploy my smart contracts?",
          },
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `# The Deployment Workflow

## CRITICAL RULE #1: Interactive Commands - User Must Run Manually

**These commands require password input and CANNOT be run by AI tools:**

| Command | Why Interactive | What AI Should Do |
|---------|-----------------|-------------------|
| \`yarn generate\` | Sets keystore password | Guide user to run manually |
| \`yarn account\` | May need password | Guide user to run manually |
| \`yarn deploy --network <chain>\` | Needs keystore password | Guide user to run manually |

**If you try to run these via MCP tools, they will HANG waiting for input that never arrives.**

## CRITICAL RULE #2: NEVER Ask About Testnets

When a user wants to build on any chain (Base, Ethereum, Optimism, etc.), NEVER ask:
- "Should I deploy to testnet or mainnet?"
- "Do you want to use Base Sepolia?"
- "Which network should I deploy to?"

The answer is ALWAYS the same workflow. No questions needed.

## CRITICAL RULE #3: RPC Configuration for Non-Ethereum Chains

**For Base, Optimism, Arbitrum, Polygon: Public RPCs WILL FAIL in production!**

| Chain | Public RPC | Status |
|-------|-----------|--------|
| Ethereum | mainnet.rpc.buidlguidl.com | ✅ FREE and reliable |
| Base | mainnet.base.org | ❌ 429 rate limit errors |
| Optimism | mainnet.optimism.io | ❌ 429 rate limit errors |
| Arbitrum | arb1.arbitrum.io/rpc | ❌ 429 rate limit errors |
| Polygon | polygon-rpc.com | ❌ 429 rate limit errors |

**BEFORE deploying to any non-Ethereum chain:**
1. Get a FREE API key from https://alchemy.com
2. Add to \`packages/nextjs/.env.local\`: \`NEXT_PUBLIC_ALCHEMY_API_KEY=your_key\`
3. For production hosting (Vercel): Add the same env var to your deployment

**If you skip this step, the production app will show "429 Too Many Requests" errors and be completely unusable.**

## The ONLY Deployment Path

### Step 1: FORK (Development) - AI Can Run
\`\`\`bash
yarn fork --network base
\`\`\`
- Creates a LOCAL fork of Base mainnet on your machine
- You get REAL mainnet state (contracts, liquidity, prices)
- Chain ID is 31337 (localhost), but state mirrors mainnet
- **Cost: $0** - iterate as much as you want

### Step 2: TEST (on the fork) - AI Can Run
\`\`\`bash
yarn deploy
\`\`\`
- Deploys to your LOCAL fork (localhost:8545)
- Frontend connects to localhost
- Test everything: swaps, transfers, interactions with real protocols
- **Cost: $0** - redeploy as many times as needed

### Step 3: GENERATE (when ready for mainnet) - ⚠️ USER MUST RUN
\`\`\`bash
yarn generate
\`\`\`
**⚠️ INTERACTIVE - User must run this manually!**
- Creates a new deployer wallet
- Prompts for password (AI cannot provide this)
- Shows you the address to fund

### Step 4: CHECK ACCOUNT - ⚠️ USER MUST RUN
\`\`\`bash
yarn account
\`\`\`
**⚠️ INTERACTIVE - May prompt for password!**
- Shows deployer address and balances
- User copies address to fund

**Funding by Chain:**
| Chain | Amount Needed | Why |
|-------|---------------|-----|
| Ethereum | 0.01-0.05 ETH | Mainnet is expensive ($20-100) |
| Base/Optimism | 0.001 ETH | L2s are very cheap (<$1) |
| Arbitrum | 0.001-0.005 ETH | Slightly higher than Base/OP |
| Polygon | 0.1-1 MATIC | Uses MATIC, not ETH |

**L2s are CHEAP!** Don't overfund - 0.001 ETH on Base is enough for many deploys!

### Step 5: DEPLOY TO MAINNET - ⚠️ USER MUST RUN
\`\`\`bash
yarn deploy --network base
\`\`\`
**⚠️ INTERACTIVE - Requires keystore password!**
- Deploys to REAL Base mainnet
- Uses the deployer wallet you funded
- **Cost: Real gas** - but L2s cost <$1 per deploy!

## What to Say When User is Ready for Mainnet

When the user has finished testing on the fork and wants to deploy to mainnet, provide these instructions:

> "Great! To deploy to mainnet, you'll need to run a few commands yourself (they require password input that I can't provide):
> 
> \`\`\`bash
> cd /path/to/your/project
> 
> # Step 1: Configure RPC (CRITICAL for Base/Optimism/Arbitrum/Polygon!)
> # Get FREE key from https://alchemy.com
> # Add to packages/nextjs/.env.local:
> echo 'NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_key' >> packages/nextjs/.env.local
> # Also add to Vercel env vars when deploying!
> 
> # Step 2: Create your encrypted deployer account
> yarn generate
> # Enter a secure password - REMEMBER IT!
> 
> # Step 3: Check your deployer address
> yarn account
> # Copy the address shown
> 
> # Step 4: Fund the deployer (see amounts below)
> 
> # Step 5: Deploy contracts to mainnet
> yarn deploy --network [chain]
> # Enter your password when prompted
> 
> # Step 6: Verify your contracts on the block explorer
> yarn verify --network [chain]
> \`\`\`
> 
> **CRITICAL for L2s:** If you skip Step 1 (RPC config), your production app will fail with 429 errors!
> 
> **Funding amounts:**
> - L2s (Base, Optimism, Arbitrum): 0.001-0.002 ETH
> - Ethereum mainnet: 0.01-0.05 ETH
> 
> Let me know when you're done!"

## Why NOT Testnets?

| Aspect | Fork | Testnet |
|--------|------|---------|
| State | Real mainnet state | Fake/empty state |
| Addresses | Same as mainnet | Different addresses |
| Liquidity | Real liquidity | None or fake |
| Cost | Free | Free (but wastes time) |
| Confidence | High - if it works here, it works on mainnet | Low - different environment |

### The Problem with Testnets

1. **Different addresses**: USDC on Base Sepolia ≠ USDC on Base mainnet
2. **No liquidity**: Can't test real swaps, integrations fail
3. **Different behavior**: Protocols behave differently or don't exist
4. **Wasted time**: You'll need to test on fork anyway before mainnet

### Why Forks Are Better

1. **Real state**: Fork has actual USDC, WETH, Uniswap pools, Aave markets
2. **Same addresses**: Code that works on fork works on mainnet unchanged
3. **Free iteration**: Deploy 100 times, costs nothing
4. **Real integrations**: Test against actual protocol deployments

## Example Workflow

User: "Build me a swap app on Base"

**WRONG Response:**
> "Should I deploy to Base Sepolia (testnet) or Base mainnet first?"

**ALSO WRONG Response:**
> "Let me run yarn generate for you..."
(This will HANG because it needs password input!)

**CORRECT Response:**
> "I'll set up a local Base fork for development. This gives you real Base mainnet state to test against, completely free. Let me initialize the project..."
> 
> Then proceed with:
> 1. \`stack_init({ chain: "base", ... })\`
> 2. \`stack_install()\`
> 3. Write contracts
> 4. \`stack_start({ components: ["fork", "deploy", "frontend"] })\`
> 
> Everything runs locally. When you're ready for mainnet, you'll need to run a few commands manually (they require password input). I'll give you the exact steps when you're ready!

## When Someone Asks for Testnet

If a user explicitly asks for testnet deployment, explain:

> "I recommend using a mainnet fork instead of a testnet. Here's why:
> - Forks give you real mainnet state (liquidity, contracts, prices)
> - Same addresses as mainnet - no code changes needed
> - Free to iterate, just like testnet
> - Higher confidence - if it works on fork, it works on mainnet
> 
> Would you like me to set up a fork instead?"

Only use testnets if the user insists after this explanation.`,
          },
        },
      ];

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

### Step 4: Configure external contracts for debug UI
\`\`\`
stack_configureExternalContracts({
  contracts: [
    { name: "USDC", type: "ERC20" },
    { name: "pool", type: "AaveV3Pool" }
  ]
})
\`\`\`
This adds USDC and the Aave pool to the debug UI so you can test interactions directly.

### Step 5: Write the vault contract
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

### Step 6: Deploy and test
\`\`\`
stack_start({ components: ["fork", "deploy", "frontend"] })
\`\`\`

The debug UI will now show your vault contract PLUS USDC and Aave pool for testing.

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
2. Use \`stack_configureExternalContracts\` for any external protocol you integrate with
3. Check docs/YIELD_VAULT_GUIDE.md for detailed patterns
4. Look at protocol-packs/aave-vault for complete implementation`,
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

    case "education-workflow":
      return [
        {
          role: "user",
          content: {
            type: "text",
            text: "How do I use the education tools to help developers learn Web3 concepts?",
          },
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `# Web3 Education Tools

eth-mcp includes education tools that surface critical Web3 concepts as teaching moments during development. These help developers avoid common gotchas that cause exploits and lost funds.

## The Core Philosophy

Web3 development has unique pitfalls that trip up even experienced developers:
- **Decimals vary**: USDC has 6 decimals, not 18!
- **No floating point**: Can't write 5% - use basis points
- **Nothing is automatic**: Smart contracts can't execute themselves
- **Incentives matter**: Why would anyone call your function?

The education tools surface these lessons at the right moment.

## Available Tools

### 1. education_suggestLessons
**Use at the START of any project.** Analyzes a description and suggests relevant lessons.

\`\`\`
education_suggestLessons({ 
  description: "Build a USDC vault with 5% APY distributed daily" 
})
\`\`\`

Returns:
- CRITICAL: USDC has 6 decimals
- CRITICAL: No floats - use basis points for 5%
- CRITICAL: Who triggers "daily" distribution?

### 2. education_getChecklist
**Walk through category-specific questions.** Interactive checklist format.

\`\`\`
education_getChecklist({ category: "automation" })
\`\`\`

Categories:
- \`tokens\`: Decimals, approvals, transfers
- \`math\`: Percentages, rounding, precision
- \`automation\`: Triggers, keepers, incentives (MOST IMPORTANT!)
- \`security\`: Reentrancy, access control, oracles
- \`vaults\`: ERC-4626, inflation attacks, accounting
- \`defi\`: MEV, slippage, protocol integration
- \`all\`: Complete review

### 3. education_explainLesson
**Deep dive into a specific lesson.** Shows the "why" with code examples.

\`\`\`
education_explainLesson({ lessonId: "nothing-automatic" })
\`\`\`

Returns:
- Full explanation of the concept
- Code example of the WRONG way
- Code example of the RIGHT way
- Links to related docs

### 4. education_getCriticalLessons
**Get all critical lessons at once.** The must-know gotchas.

\`\`\`
education_getCriticalLessons({})
\`\`\`

Use before ANY mainnet deployment!

### 5. education_listCategories
**See all categories and lesson counts.**

\`\`\`
education_listCategories({})
\`\`\`

## Recommended Workflow

### When Starting a New Project

1. **Understand the intent**: What is the user trying to build?
2. **Suggest lessons early**: 
   \`\`\`
   education_suggestLessons({ description: "[user's project description]" })
   \`\`\`
3. **Surface critical issues**: Share the warnings BEFORE writing code
4. **Explain when asked**: Use explainLesson for deep dives

### When Building Specific Features

| Feature | Checklist to Use |
|---------|------------------|
| Token handling | \`tokens\` |
| Fee calculations | \`math\` |
| Scheduled tasks | \`automation\` |
| Yield vaults | \`vaults\` |
| DEX integration | \`defi\` |
| Any external calls | \`security\` |

### Before Deployment

ALWAYS run:
\`\`\`
education_getCriticalLessons({})
\`\`\`

Walk through each critical lesson with the developer.

## Example: Teaching Moment

**User says**: "Build me a staking contract that distributes rewards daily"

**You should**:
1. Call \`education_suggestLessons({ description: "staking contract distributes rewards daily" })\`
2. You'll get back the "nothing-automatic" lesson as critical
3. Share with user: "Quick note - in Web3, 'daily' doesn't work like a cron job. Let me explain how to handle this..."
4. If they want details: \`education_explainLesson({ lessonId: "nothing-automatic" })\`

This turns a potential bug into a learning moment!

## Key Lessons to Know

### CRITICAL Lessons (memorize these!)

1. **decimals-vary**: USDC = 6, not 18
2. **approvals**: Must approve before transferFrom, NEVER infinite approvals!
3. **no-decimals**: Use basis points (10000 = 100%)
4. **nothing-automatic**: Who calls? Why? (Reward callers for true decentralization)
5. **reentrancy**: CEI pattern + guards
6. **oracle-manipulation**: Never use spot DEX price
7. **inflation-attack**: First depositor vulnerability

### The Most Important Concept

**INCENTIVES** - The automation category is the most important.

Every on-chain function needs someone to:
1. Send a transaction
2. Pay gas
3. Have a reason to do it

If you can't answer "why would anyone call this?", the function is dead code.

## Teaching Style

- **Short first**: Start with the one-line warning
- **Explain on request**: Offer to go deeper
- **Show code**: Wrong vs right examples are powerful
- **Connect to their project**: "In your vault, this means..."

The goal is not to lecture, but to surface the right lesson at the right moment.`,
          },
        },
      ];

    case "frontend-design":
      return [
        {
          role: "user",
          content: {
            type: "text",
            text: "How should I design the frontend for my dApp?",
          },
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `# Frontend Design Guide

**RULE: NEVER use purple/pink/indigo gradients. Use existing Scaffold-ETH theme tokens (base-100, base-200, base-300, primary, secondary, accent) for all colors.**

## CRITICAL RULE: No Purple Gradients

When building any frontend, NEVER default to:
- Purple, violet, lavender, or indigo colors
- Gradient backgrounds
- Glassmorphism or blur effects
- Glow effects or large shadows

These create generic "vibe coded" UIs that reduce trust and credibility.

## Step 1: Choose a DaisyUI Theme Based on Project Type

Scaffold-ETH 2 includes DaisyUI. Select the RIGHT theme:

| Project Type | Use Theme | Why |
|--------------|-----------|-----|
| DeFi / Finance / Vaults | \`corporate\` | Trust, professional, serious |
| Developer Tools | \`dracula\` | Terminal-like, technical |
| NFT / Consumer | \`retro\` | Friendly, approachable |
| Data Dashboards | \`lofi\` | Clean, information-dense |
| Gaming | \`retro\` or \`bumblebee\` | Fun but controlled |

Set in \`packages/nextjs/tailwind.config.js\`:
\`\`\`js
daisyui: {
  themes: ["corporate"], // ONE theme only
}
\`\`\`

## Step 2: Design Lint Before Coding

Before writing ANY UI code, verify:

- [ ] No purple/violet/indigo colors anywhere
- [ ] No \`bg-gradient-*\` classes
- [ ] All colors from DaisyUI theme tokens
- [ ] No \`backdrop-blur\` or glassmorphism
- [ ] Shadows max \`shadow-md\` (4px)
- [ ] Using DaisyUI components (btn, card, input)

If ANY check fails, revise your plan.

## Step 3: Use Material Descriptions

When the user says "make it modern" or "sleek", translate to:
- "industrial, utilitarian"
- "print-like, newspaper"
- "paper & ink"

DO NOT translate to purple gradients.

## Component Examples

### GOOD: Card
\`\`\`tsx
<div className="card bg-base-100 shadow-sm border border-base-300">
  <div className="card-body">
    <h2 className="card-title">Vault Balance</h2>
    <p className="text-2xl font-mono">$12,345.67</p>
  </div>
</div>
\`\`\`

### BAD: Card (NEVER DO THIS)
\`\`\`tsx
<div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-2xl p-6">
  ...
</div>
\`\`\`

### GOOD: Stats
\`\`\`tsx
<div className="stats bg-base-200 shadow-sm">
  <div className="stat">
    <div className="stat-title">TVL</div>
    <div className="stat-value">$4.2M</div>
  </div>
</div>
\`\`\`

### GOOD: Buttons
\`\`\`tsx
<button className="btn btn-primary">Deposit</button>
<button className="btn btn-outline">Cancel</button>
\`\`\`

## Reference Sites (Design Like These)

- **Etherscan** (light mode) - Dense, utilitarian, trusted
- **GitHub Settings** - Functional, professional
- **Stripe Dashboard** - Clean whitespace
- **GOV.UK** - Accessible, clear hierarchy

NOT like SaaS marketing sites with hero gradients.

## Handling User Requests

**User: "Make it look modern"**
→ Use corporate theme, good spacing, clear hierarchy
→ DO NOT add purple or gradients

**User: "Make it pop"**
→ Strategic accent colors, hover states, icons
→ DO NOT add glow or gradients

**User: "I want purple gradients"**
→ THEN use them. User intent overrides guidelines.

## Why This Matters

1. **Trust**: Purple gradients = "generic AI app" = skepticism
2. **Credibility**: Financial apps need to look serious
3. **Usability**: Flat colors are more readable
4. **Differentiation**: NOT looking generic is a feature

## Quick Reference

\`\`\`
DEFAULT THEME: corporate
FALLBACK: lofi

SAFE ACCENTS: emerald, amber, red (from theme)

BANNED: purple, gradients, glassmorphism, glow, large shadows

REFERENCE: Etherscan, GitHub, Stripe, GOV.UK
\`\`\``,
          },
        },
      ];

    case "rpc-configuration":
      return [
        {
          role: "user",
          content: {
            type: "text",
            text: "How do I configure RPC endpoints for my project?",
          },
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `# RPC Configuration Guide

## CRITICAL: Public RPCs Fail Under Load

Public RPC endpoints like \`mainnet.base.org\` get rate limited immediately with 429 errors. You MUST configure proper RPCs for production.

## Default RPCs by Chain

| Chain | Default RPC | Reliability |
|-------|-------------|-------------|
| Ethereum | \`mainnet.rpc.buidlguidl.com\` | FREE, reliable - use this! |
| Base | \`mainnet.base.org\` | FAILS with 429 under load |
| Optimism | \`mainnet.optimism.io\` | Rate limited |
| Arbitrum | \`arb1.arbitrum.io/rpc\` | Rate limited |
| Polygon | \`polygon-rpc.com\` | Rate limited |

## For Local Development

Local development (forking) may work with public RPCs for a while. If you see 429 errors in the console:

\`\`\`
POST https://mainnet.base.org/ 429 (Too Many Requests)
\`\`\`

This means the public RPC is rate limiting you. You need your own API key.

## Getting an RPC API Key

**Free options:**
- **Alchemy**: https://alchemy.com (recommended - generous free tier)
- **Infura**: https://infura.io
- **QuickNode**: https://quicknode.com

## Configuring RPC in Your Project

**Two files need configuration:**

### 1. packages/foundry/.env (for forking and deployment)

\`\`\`bash
FORK_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY
CHAIN_ID=8453
\`\`\`

### 2. packages/nextjs/.env.local (for frontend RPC calls)

First, copy from the example:
\`\`\`bash
cp packages/nextjs/.env.example packages/nextjs/.env.local
\`\`\`

Then add:
\`\`\`bash
NEXT_PUBLIC_ALCHEMY_API_KEY=YOUR_API_KEY
\`\`\`

## Alchemy RPC URLs by Chain

| Chain | Alchemy RPC URL |
|-------|-----------------|
| Ethereum | \`https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY\` |
| Base | \`https://base-mainnet.g.alchemy.com/v2/YOUR_KEY\` |
| Optimism | \`https://opt-mainnet.g.alchemy.com/v2/YOUR_KEY\` |
| Arbitrum | \`https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY\` |
| Polygon | \`https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY\` |

## SAFETY: Never Overwrite .env Files

When helping users configure RPC, NEVER use \`>\` which overwrites:

\`\`\`bash
# WRONG - destroys existing config
echo 'FORK_URL=...' > packages/foundry/.env

# RIGHT - append to file
echo 'FORK_URL=...' >> packages/foundry/.env

# BEST - ask user to edit manually
"Please add this line to packages/foundry/.env: FORK_URL=..."
\`\`\`

If you cannot read .env files directly (they're often gitignored), ask the user to make the changes manually.

## When to Prompt for RPC Keys

1. **When starting local dev on non-Ethereum chains**: "Note: If you see 429 errors, you'll need an Alchemy API key."

2. **When 429 errors appear**: "You're hitting RPC rate limits. Get a free Alchemy key at https://alchemy.com."

3. **Before mainnet deployment on non-Ethereum chains**: "Before deploying, configure your RPC with an Alchemy key to avoid rate limits."

## For Ethereum Mainnet

Ethereum mainnet can use the free BuidlGuidl RPC without any API key:
\`\`\`
FORK_URL=https://mainnet.rpc.buidlguidl.com
\`\`\`

This is reliable and free - no account needed!`,
          },
        },
      ];

    case "test-wallet-funding":
      return [
        {
          role: "user",
          content: {
            type: "text",
            text: "How do I fund my test wallet with tokens on my fork?",
          },
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `# Funding Test Wallets with Tokens on Forks

When you're building apps that need tokens (USDC vaults, swap interfaces, DeFi), you need to get those tokens into your test wallet. Use Anvil's impersonation feature to transfer from protocol "whale" addresses.

## Key Insight: Protocol Contracts > EOAs

Protocol contracts (Morpho, Aave) are MORE RELIABLE than EOA wallets because:
- They hold funds as part of their core function
- Balances are large and stable (often $100M+)
- Less likely to randomly move funds

## Recommended Whale Addresses

### Base (Most Common)
| Token | Whale Address | Protocol | Balance |
|-------|---------------|----------|---------|
| USDC | \`0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb\` | Morpho Blue | ~131M |
| USDC | \`0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB\` | Aave aBasUSDC | ~97M |

### Ethereum Mainnet
| Token | Whale Address | Protocol | Balance |
|-------|---------------|----------|---------|
| USDC | \`0x37305B1cD40574E4C5Ce33f8e8306Be057fD7341\` | Sky PSM | ~4.1B |
| USDC | \`0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c\` | Aave USDC V3 | ~700M |

### Arbitrum
| Token | Whale Address | Protocol | Balance |
|-------|---------------|----------|---------|
| USDC | \`0x724dc807b04555b71ed48a6896b6F41593b8C637\` | Aave USDCn | ~83M |

## One-Shot Cast Commands

\`\`\`bash
# Variables (adjust as needed)
TOKEN=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913  # USDC on Base
WHALE=0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb  # Morpho Blue
RECIPIENT=0xYourWalletAddress
AMOUNT=10000000000  # 10,000 USDC (6 decimals)
RPC=http://localhost:8545

# Step 1: Verify whale has tokens on your fork
cast call $TOKEN "balanceOf(address)(uint256)" $WHALE --rpc-url $RPC

# Step 2: Give whale ETH for gas (contracts have 0 ETH)
cast rpc anvil_setBalance $WHALE 0x8AC7230489E80000 --rpc-url $RPC

# Step 3: Impersonate the whale
cast rpc anvil_impersonateAccount $WHALE --rpc-url $RPC

# Step 4: Transfer tokens to recipient
cast send $TOKEN "transfer(address,uint256)" $RECIPIENT $AMOUNT \\
  --from $WHALE --unlocked --rpc-url $RPC

# Step 5: Stop impersonation (optional)
cast rpc anvil_stopImpersonatingAccount $WHALE --rpc-url $RPC
\`\`\`

## Why Each Step Matters

| Step | Why It's Needed |
|------|-----------------|
| Verify balance | Block explorer data may not match fork state |
| Set ETH balance | Contract addresses have 0 ETH by default |
| Impersonate first | Anvil needs explicit permission to sign as that address |
| Use --unlocked | Tells cast the account doesn't need a private key |

## Token Decimals Reference

| Token | Decimals | 1,000 tokens = |
|-------|----------|----------------|
| USDC | 6 | 1000000000 |
| USDT | 6 | 1000000000 |
| DAI | 18 | 1000000000000000000000 |
| WETH | 18 | 1000000000000000000000 |

## When to Proactively Help Users

Recognize when users need test tokens:
- "Build me a USDC vault" → User will need USDC to test deposits
- "Create a swap interface" → User will need tokens to test swaps
- Any DeFi project involving tokens

After \`stack_start\`, proactively offer the cast commands with:
1. Correct token address for the chain
2. Correct whale address (prefer Morpho/Aave)
3. User's connected address as recipient
4. Reasonable test amount (e.g., 10,000 USDC)

## Getting User's Address

The user's frontend wallet address comes from RainbowKit/wagmi. They can:
1. Open http://localhost:3000
2. Connect their wallet
3. See their address in the UI

Or use Anvil's pre-funded test account:
\`\`\`
0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266  # Anvil account #0
\`\`\`

## WETH Special Case

For WETH, instead of impersonating a whale, you can mint directly by depositing ETH:
\`\`\`bash
cast send WETH_ADDRESS "deposit()" --value 10ether --from RECIPIENT --unlocked --rpc-url $RPC
\`\`\``,
          },
        },
      ];

    default:
      return null;
  }
}
