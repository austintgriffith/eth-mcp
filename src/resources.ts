/**
 * MCP Resources for ethereum-mcp
 * Exposes status and logs as pollable resources
 */

import { stateManager } from "./state.js";
import { processManager } from "./process-manager.js";
import { CHAIN_REGISTRY, TOKEN_WHALES, type WhaleInfo } from "./addresses/index.js";

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

/**
 * Frontend Design System - prevents generic purple gradient SaaS styling
 */
const FRONTEND_DESIGN_SYSTEM = `# Frontend Design System

**RULE: NEVER use purple/pink/indigo gradients. Use existing Scaffold-ETH theme tokens (base-100, base-200, base-300, primary, secondary, accent) for all colors.**

CRITICAL: Create professional, context-appropriate frontends. NEVER default to purple gradients.

## Design Anti-Patterns (BANNED)

### Banned Colors
- NO purple, violet, lavender, indigo, or blue-purple hues
- NO neon colors (hot pink, electric blue, lime green)
- NO pastel rainbow combinations

### Banned Effects
- NO gradient backgrounds (bg-gradient-*)
- NO glassmorphism (backdrop-blur, frosted glass)
- NO blur effects
- NO glow effects or shadows larger than shadow-md (4px)
- NO animated gradients

### Why?
Purple gradients reduce perceived seriousness and make apps feel generic.
The goal is trust, durability, and technical credibility.

## DaisyUI Theme Selection

ALWAYS use a DaisyUI theme. NEVER create custom color schemes.

### Theme by Project Type

| Project Type | Theme | Alternative | Rationale |
|--------------|-------|-------------|-----------|
| DeFi/Finance | corporate | business | Trust, professional |
| Yield Vaults | corporate | lofi | Financial credibility |
| Token Swaps | corporate | emerald | Clean, transactional |
| Developer Tools | dracula | black | Terminal-like |
| NFT Marketplace | retro | garden | Friendly, not garish |
| Gaming/Social | retro | bumblebee | Approachable |
| Data Dashboards | lofi | wireframe | Readable, dense |
| Admin Panels | corporate | lofi | Utilitarian |

### Safe Themes (NO purple)
- corporate (RECOMMENDED DEFAULT)
- business, lofi, retro, bumblebee
- emerald, garden, dracula, black

### Themes to AVOID
- synthwave (purple/pink neon)
- cyberpunk (can drift purple)
- valentine (pink/purple)

## Design Lint Checklist

Before generating UI, verify:
- [ ] No purple/violet/indigo anywhere
- [ ] No gradient backgrounds
- [ ] All colors from DaisyUI theme tokens
- [ ] Works in grayscale
- [ ] No glassmorphism or blur
- [ ] Shadows are shadow-sm or shadow-md max
- [ ] Using DaisyUI components (btn, card, input)

If ANY check fails, revise before responding.

## Material Descriptions (Use These)

Instead of "modern" → "industrial, utilitarian"
Instead of "sleek" → "print-like, newspaper"
Instead of "futuristic" → "terminal-inspired"
Instead of "clean" → "paper & ink"
Instead of "minimal" → "brutalist"

## Real-World References

Design like these tools (NOT like SaaS marketing sites):
- Etherscan (light mode) - dense, utilitarian
- GitHub Settings pages - functional
- Stripe Dashboard - clean whitespace
- GOV.UK Design System - accessible, clear
- Bloomberg Terminal - information density

## Component Patterns

### GOOD Card
\`\`\`tsx
<div className="card bg-base-100 shadow-sm border border-base-300">
  <div className="card-body">...</div>
</div>
\`\`\`

### BAD Card (NEVER DO THIS)
\`\`\`tsx
<div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-2xl">
\`\`\`

### GOOD Button
\`\`\`tsx
<button className="btn btn-primary">Deposit</button>
\`\`\`

### BAD Button (NEVER DO THIS)
\`\`\`tsx
<button className="bg-gradient-to-r from-indigo-500 to-purple-600 shadow-purple-500/50">
\`\`\`

## Handling Requests

If user says "make it modern/sleek":
→ Use corporate theme, good whitespace, clear hierarchy
→ DO NOT add purple or gradients

If user says "make it pop":
→ Use accent color strategically, hover states, icons
→ DO NOT add gradients or glow

If user EXPLICITLY requests purple/gradients:
→ Then use them. User intent overrides guidelines.

## Quick Reference

DEFAULT THEME: corporate
FALLBACK: lofi

SAFE ACCENTS: emerald (#10B981), amber (#F59E0B), red (#EF4444)

BANNED: purple, violet, indigo, gradients, glassmorphism, glow, shadows > 4px

REFERENCE: Etherscan, GitHub Settings, Stripe Dashboard, GOV.UK
`;

/**
 * Uniswap V4 Integration Guide - Battle-tested patterns and gotchas
 */
const UNISWAP_V4_GUIDE = `# Uniswap V4 Integration Guide

Use this guide to build V4 swap functionality without trial and error.
These patterns are battle-tested from real debugging sessions.

---

## The #1 Gotcha: settle() Has NO Parameters!

This is the most common V4 bug. The error \`0x5212cba1\` means wrong function signature.

\`\`\`solidity
// WRONG - will fail with error 0x5212cba1
poolManager.settle(currency);

// CORRECT - V4's actual signature
poolManager.settle();  // No parameter!
\`\`\`

The \`sync()\` function tells PoolManager which currency you're about to pay.
Then \`settle()\` (with no args) settles that synced currency.

---

## Correct Payment Pattern

Order matters! This is the only sequence that works:

\`\`\`solidity
poolManager.sync(currency);                    // 1. Tell PM which currency
IERC20(token).transfer(poolManager, amount);   // 2. Transfer tokens
poolManager.settle();                          // 3. Settle (NO PARAM!)
\`\`\`

---

## V4 Architecture: Unlock/Callback Pattern

You CANNOT call \`swap()\` directly on PoolManager. Must use unlock pattern:

\`\`\`
User -> SwapHelper.swap()
         -> poolManager.unlock(data)
              -> SwapHelper.unlockCallback()
                   -> poolManager.swap()
                   -> sync/transfer/settle
                   -> poolManager.take()
         <- returns result
\`\`\`

Your contract must implement \`unlockCallback(bytes calldata) external returns (bytes memory)\`.

---

## Complete IPoolManager Interface

\`\`\`solidity
interface IPoolManager {
    struct SwapParams {
        bool zeroForOne;
        int256 amountSpecified;  // Negative = exact input
        uint160 sqrtPriceLimitX96;
    }

    function unlock(bytes calldata data) external returns (bytes memory);
    function swap(PoolKey memory key, SwapParams memory params, bytes calldata hookData) 
        external returns (BalanceDelta);
    function sync(Currency currency) external;
    function settle() external payable returns (uint256);  // NO CURRENCY PARAM!
    function take(Currency currency, address to, uint256 amount) external;
}
\`\`\`

---

## PoolKey Construction

Currency0 MUST be less than Currency1 (sorted by address):

\`\`\`solidity
(address c0, address c1) = tokenA < tokenB 
    ? (tokenA, tokenB) 
    : (tokenB, tokenA);

PoolKey memory poolKey = PoolKey({
    currency0: Currency.wrap(c0),
    currency1: Currency.wrap(c1),
    fee: 3000,        // 0.3%
    tickSpacing: 60,  // Standard for 0.3% fee tier
    hooks: IHooks(address(0)) // No hooks
});
\`\`\`

---

## Swap Direction Logic

\`\`\`solidity
bool zeroForOne = tokenIn < tokenOut;

if (zeroForOne) {
    // Swapping currency0 -> currency1
    // delta.amount0() is negative (we pay)
    // delta.amount1() is positive (we receive)
    _payToken(tokenIn, uint256(-delta.amount0()), currency0);
    poolManager.take(currency1, recipient, uint256(delta.amount1()));
} else {
    // Swapping currency1 -> currency0
    // delta.amount1() is negative (we pay)
    // delta.amount0() is positive (we receive)
    _payToken(tokenIn, uint256(-delta.amount1()), currency1);
    poolManager.take(currency0, recipient, uint256(delta.amount0()));
}
\`\`\`

---

## Stack Too Deep Fix

V4 callbacks hit "stack too deep" easily. Split into helper functions:

\`\`\`solidity
function unlockCallback(bytes calldata data) external returns (bytes memory) {
    // Decode, build poolKey, execute swap
    BalanceDelta delta = poolManager.swap(poolKey, swapParams, "");
    return _settleSwap(params, delta, currency0, currency1);  // Separate function!
}

function _settleSwap(...) internal returns (bytes memory) {
    // Handle settlement logic here
}

function _payToken(address token, uint256 amount, Currency currency) internal {
    poolManager.sync(currency);
    IERC20(token).transfer(address(poolManager), amount);
    poolManager.settle();
}
\`\`\`

---

## V4 Contract Addresses

### Base Mainnet (Chain ID: 8453)
\`\`\`solidity
address constant POOL_MANAGER     = 0x498581fF718922c3f8e6A244956aF099B2652b2b;
address constant POSITION_MANAGER = 0x7C5f5A4bBd8fD63184577525326123B519429bDc;
address constant QUOTER           = 0x0d5e0f971ed27fbff6c2837bf31316121532048d;
address constant STATE_VIEW       = 0xa3c0c9b65bad0b08107aa264b0f3db444b867a71;
address constant PERMIT2          = 0x000000000022D473030F116dDEE9F6B43aC78BA3;
\`\`\`

### Ethereum Mainnet (Chain ID: 1)
\`\`\`solidity
address constant POOL_MANAGER     = 0x000000000004444c5dc75cB358380D2e3dE08A90;
address constant POSITION_MANAGER = 0x4529a01c7a0410167c5740c487a8de60232617bf;
address constant QUOTER           = 0x333e3c607b141b18ff6de9f258db6e77fe7491e0;
address constant PERMIT2          = 0x000000000022D473030F116dDEE9F6B43aC78BA3;
\`\`\`

---

## Gas Limits

| Operation | Recommended Gas |
|-----------|----------------|
| V4 Swap | 500,000 |
| Pool initialization + liquidity add | 2,000,000 - 2,500,000 |
| ERC20 approve | 50,000 |

---

## Frontend Integration (Scaffold-ETH 2)

\`\`\`typescript
// Setup
const { writeContractAsync: writeSwapHelper } = useScaffoldWriteContract({ 
    contractName: "SwapHelper" 
});

// Execute swap
await writeContractAsync({
    functionName: "swap",
    args: [
        USDC_ADDRESS,      // tokenIn
        tokenAddress,      // tokenOut
        3000,              // fee (0.3%)
        amountIn,
        0n,                // minAmountOut - use 0 for testing!
    ],
    gas: 500_000n,
});
\`\`\`

---

## Common Errors and Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| \`0x5212cba1\` | Wrong settle() signature | Use \`settle()\` not \`settle(currency)\` |
| "Insufficient output" | minAmountOut too strict | Use 0 for testing, add slippage later |
| "Stack too deep" | Too many local variables | Split into helper functions |
| Silent revert | Wrong sync/settle order | Must be: sync -> transfer -> settle |
| Pool not found | Wrong currency order | Ensure currency0 < currency1 |

---

## Testing Workflow

1. \`yarn deploy\` - Deploy contracts including SwapHelper
2. Create token via TokenFactory (if applicable)
3. Fund wallet with USDC (impersonate whale on fork)
4. Test swap functionality
5. **Test CLI first:**
   \`\`\`bash
   cast send $SWAP_HELPER "swap(address,address,uint24,uint256,uint256)" \\
       $USDC $TOKEN 3000 100000 0 \\
       --private-key $KEY --gas-limit 500000 --rpc-url http://localhost:8545
   \`\`\`
6. Then test frontend

---

## Key Takeaways

1. **settle() has NO parameters** - sync() sets currency, settle() uses it
2. **Order matters**: sync -> transfer -> settle
3. **Currency0 < Currency1** - Always sort addresses
4. **V4 is callback-based** - Use unlock pattern, not direct calls
5. **Gas is higher** - V4 swaps ~300k-500k, pool init ~2M
6. **Test CLI first** - Debug contracts before frontend
7. **Use 0 for minAmountOut** - Add slippage protection after it works
8. **Split functions** - Avoid stack too deep errors

---

## Example SwapHelper Contract

\`\`\`solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPoolManager} from "@uniswap/v4-core/contracts/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/contracts/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/contracts/types/Currency.sol";
import {BalanceDelta} from "@uniswap/v4-core/contracts/types/BalanceDelta.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SwapHelper {
    IPoolManager public immutable poolManager;
    
    constructor(address _poolManager) {
        poolManager = IPoolManager(_poolManager);
    }
    
    function swap(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint256 minAmountOut
    ) external returns (uint256 amountOut) {
        // Transfer tokens from user
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Encode swap params for callback
        bytes memory data = abi.encode(
            msg.sender,
            tokenIn,
            tokenOut,
            fee,
            amountIn,
            minAmountOut
        );
        
        // Unlock triggers our callback
        bytes memory result = poolManager.unlock(data);
        amountOut = abi.decode(result, (uint256));
    }
    
    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        require(msg.sender == address(poolManager), "Only PoolManager");
        
        (
            address recipient,
            address tokenIn,
            address tokenOut,
            uint24 fee,
            uint256 amountIn,
            uint256 minAmountOut
        ) = abi.decode(data, (address, address, address, uint24, uint256, uint256));
        
        // Build pool key (currencies must be sorted!)
        (address c0, address c1) = tokenIn < tokenOut 
            ? (tokenIn, tokenOut) 
            : (tokenOut, tokenIn);
        
        PoolKey memory poolKey = PoolKey({
            currency0: Currency.wrap(c0),
            currency1: Currency.wrap(c1),
            fee: fee,
            tickSpacing: 60,
            hooks: IHooks(address(0))
        });
        
        bool zeroForOne = tokenIn < tokenOut;
        
        // Execute swap
        BalanceDelta delta = poolManager.swap(
            poolKey,
            IPoolManager.SwapParams({
                zeroForOne: zeroForOne,
                amountSpecified: -int256(amountIn), // Negative = exact input
                sqrtPriceLimitX96: zeroForOne ? MIN_SQRT_PRICE + 1 : MAX_SQRT_PRICE - 1
            }),
            ""
        );
        
        // Settle: pay input token
        Currency currencyIn = Currency.wrap(tokenIn);
        poolManager.sync(currencyIn);
        IERC20(tokenIn).transfer(address(poolManager), amountIn);
        poolManager.settle();  // NO PARAM!
        
        // Take: receive output token
        Currency currencyOut = Currency.wrap(tokenOut);
        uint256 amountOut = zeroForOne 
            ? uint256(int256(delta.amount1())) 
            : uint256(int256(delta.amount0()));
        
        require(amountOut >= minAmountOut, "Insufficient output");
        poolManager.take(currencyOut, recipient, amountOut);
        
        return abi.encode(amountOut);
    }
}
\`\`\`
`;

/**
 * Token Whale Funding Guide - For funding test wallets on forks
 */
const WHALE_FUNDING_GUIDE = `# Funding Test Wallets with Tokens on Forks

When users build apps that need tokens (USDC vaults, swap interfaces, DeFi), they need tokens in their test wallet.
Use Anvil's impersonation feature to transfer from protocol "whale" addresses.

## Key Insight: Protocol Contracts > EOAs

Protocol contracts (Morpho, Aave) are MORE RELIABLE than EOA wallets because:
- They hold funds as part of their core function
- Balances are large and stable (often $100M+)
- Less likely to randomly move funds

## Recommended Whale Addresses by Chain

### Base (Chain ID: 8453)
| Token | Whale Address | Protocol | Balance |
|-------|---------------|----------|---------|
| USDC | 0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb | Morpho Blue | ~131M |
| USDC | 0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB | Aave aBasUSDC | ~97M |

### Ethereum Mainnet (Chain ID: 1)
| Token | Whale Address | Protocol | Balance |
|-------|---------------|----------|---------|
| USDC | 0x37305B1cD40574E4C5Ce33f8e8306Be057fD7341 | Sky PSM | ~4.1B |
| USDC | 0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c | Aave USDC V3 | ~700M |
| USDC | 0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb | Morpho Blue | ~200M |

### Arbitrum (Chain ID: 42161)
| Token | Whale Address | Protocol | Balance |
|-------|---------------|----------|---------|
| USDC | 0x724dc807b04555b71ed48a6896b6F41593b8C637 | Aave USDCn | ~83M |
| USDC | 0x2Df1c51E09aECF9cacB7bc98cB1742757f163dF7 | Hyperliquid | ~4B |

### Optimism (Chain ID: 10)
| Token | Whale Address | Protocol | Balance |
|-------|---------------|----------|---------|
| USDC | 0x794a61358D6845594F94dc1DB02A252b5b4814aD | Aave V3 Pool | ~50M |

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

## When to Proactively Help

Recognize when users need test tokens:
- "Build me a USDC vault" → User will need USDC to test deposits
- "Create a swap interface" → User will need tokens to test swaps
- Any DeFi project involving tokens

After stack_start, proactively offer the cast commands with:
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
    uri: "resource://frontend/design-system",
    name: "Frontend Design System",
    description: "CRITICAL: UI design rules - NO purple gradients. Use DaisyUI themes, closed palettes, context-appropriate styling.",
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
  {
    uri: "resource://funding/whales",
    name: "Token Whale Registry",
    description: "CRITICAL: Whale addresses for funding test wallets with tokens (USDC, WETH, etc.) on Anvil forks. Includes one-shot cast commands.",
    mimeType: "text/plain",
  },
  {
    uri: "resource://uniswap/v4-guide",
    name: "Uniswap V4 Integration Guide",
    description: "CRITICAL: Complete V4 swap integration guide with gotchas, correct patterns, and addresses. READ THIS before building any V4 integration. Includes the #1 bug: settle() has NO parameters!",
    mimeType: "text/plain",
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

  // Frontend Design System - CRITICAL for UI generation
  if (uri === "resource://frontend/design-system") {
    return {
      content: FRONTEND_DESIGN_SYSTEM,
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

  // Token whale registry for funding test wallets
  if (uri === "resource://funding/whales") {
    return {
      content: WHALE_FUNDING_GUIDE,
      mimeType: "text/plain",
    };
  }

  // Uniswap V4 integration guide
  if (uri === "resource://uniswap/v4-guide") {
    return {
      content: UNISWAP_V4_GUIDE,
      mimeType: "text/plain",
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
    console.error("SE2 documentation cached successfully");
  } catch (error) {
    console.error("Failed to prefetch SE2 docs:", error);
  }
}
