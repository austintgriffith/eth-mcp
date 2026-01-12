# Deployment Workflow

The correct deployment workflow for Scaffold-ETH projects.

---

## First Question: Do You Need Custom Contracts?

**Not every project requires deploying smart contracts.** Before starting the deployment workflow, ask:

```
Do you need CUSTOM smart contract logic?
│
├── YES (custom vault, staking, new protocol, etc.)
│   └── Follow the full deployment workflow below
│
└── NO (frontend for existing contracts)
    └── Skip to "Frontend-Only Deployment" section
```

| Project Type | Custom Contract Needed? |
|--------------|-------------------------|
| Swap UI for Uniswap | NO - Uniswap exists |
| Aave position dashboard | NO - Aave exists |
| Portfolio tracker | NO - just reads existing contracts |
| NFT gallery | NO - NFTs already exist |
| Custom yield vault | YES - your vault logic |
| Staking contract | YES - your staking logic |
| Tax token | YES - custom token logic |

**If you're building a frontend for existing protocols, skip the contract deployment workflow entirely - see the "Frontend-Only Deployment" section at the end.**

---

## The Golden Rule (For Custom Contracts)

**NEVER ask users about testnets vs mainnet.**

The answer is always:
1. Fork mainnet locally
2. Test everything on the fork
3. Deploy to mainnet when ready

---

## Why This Workflow?

### Fork Advantages

| Feature | Fork | Testnet |
|---------|------|---------|
| Cost | Free | Free |
| State | Real mainnet state | Fake/missing |
| Addresses | Same as mainnet | Different |
| Liquidity | Real pools, real prices | None |
| Confidence | High | Low |

### The Problem with Testnets

1. **Different addresses**: USDC on Sepolia ≠ USDC on mainnet
2. **No liquidity**: Can't test real swaps or DeFi integrations
3. **Missing protocols**: Many protocols don't deploy to testnets
4. **Wasted effort**: You need to test on fork anyway before mainnet

### Why Forks Work

1. **Real state**: Your fork has actual USDC, WETH, Uniswap pools, Aave markets
2. **Same addresses**: Code that works on fork works on mainnet unchanged
3. **Free iteration**: Deploy 100 times, costs nothing
4. **Real integrations**: Test against actual protocol deployments

---

## The Deployment Path

### Step 1: Initialize Project

```bash
# This configures which mainnet to fork (e.g., Base)
yarn create scaffold-eth@latest my-project
cd my-project
```

Or via eth-mcp:
```
stack_init({ template: "scaffold-eth", chain: "base", workspacePath: "/path/to/project" })
```

### Step 2: Start Local Fork

```bash
yarn fork --network base
```

This creates a LOCAL Anvil fork:
- Runs on localhost:8545
- Chain ID: 31337 (local)
- State: Mirrors Base mainnet
- Cost: $0

### Step 3: Deploy to Fork

```bash
yarn deploy
```

Deploys to your LOCAL fork:
- Contracts go to localhost
- Frontend connects to localhost
- Iterate freely - costs nothing

### Step 4: Test Everything

- Test swaps against real Uniswap pools
- Test lending against real Aave markets
- Test token transfers with real token contracts
- All using REAL mainnet state, but locally

### Burner Wallets: Frictionless Local Testing

When running on a local fork (chainId 31337), Scaffold-ETH uses **burner wallets** automatically:

- **Auto-connected**: You have a `connectedAddress` immediately - no wallet popup
- **Fund from faucet**: Click the faucet button to get local ETH instantly
- **No transaction popups**: All transactions sign automatically

This means you (or an AI agent) can:

1. Open Chrome to `http://localhost:3000`
2. Click the faucet to fund the burner wallet
3. Interact with the app - click buttons, submit forms, test flows
4. All without a single wallet popup or confirmation dialog

**When you deploy to mainnet**, users connect real wallets (MetaMask, etc.) and confirm transactions as expected. This happens automatically - no config changes needed!

**⚠️ DO NOT modify `onlyLocalBurnerWallet` in scaffold.config.ts!**

The default setting (`true`) is correct:
- `true` = burner wallets ONLY on local (safe for production)
- `false` = burner wallets EVERYWHERE including mainnet (DANGEROUS!)

The name is counterintuitive - setting it to `false` doesn't "disable" burner wallets, it ENABLES them on mainnet.

### Step 5: Generate Deployer (When Ready) - ⚠️ INTERACTIVE

```bash
yarn generate
```

**⚠️ INTERACTIVE COMMAND - User must run manually!**

This command prompts for password input and CANNOT be run by AI tools.

Creates a new **ENCRYPTED** deployer account:
- You'll be prompted to set a password
- **REMEMBER THIS PASSWORD** - you need it for every deployment
- For Foundry: Creates keystore in `~/.foundry/keystore`
- For Hardhat: Creates `DEPLOYER_PRIVATE_KEY_ENCRYPTED` in `.env`

**Your private key is NEVER stored in plain text.**

### Step 6: Check Deployer Address & Fund It - ⚠️ INTERACTIVE

```bash
yarn account
```

**⚠️ INTERACTIVE COMMAND - May prompt for password! User should run manually.**

Shows your deployer address and balances:
- Copy the address
- Fund it based on your target chain (see table below)

#### How Much ETH Do I Need?

⚠️ **GAS IS MUCH CHEAPER THAN YOU THINK!** Ethereum mainnet gas is now typically 0.1-2 gwei (not 20-100 gwei like in 2021-2023). Deploying to mainnet is affordable for everyone!

| Chain | Typical Gas Price | Contract Deploy (~1M gas) | Minimum to Try |
|-------|-------------------|---------------------------|----------------|
| **Ethereum Mainnet** | 0.1-2 gwei | **$0.50-$6** | 0.001 ETH (~$3) |
| **Base** | 0.01-0.02 gwei | **$0.02-$0.05** | 0.00002 ETH (~$0.06) |
| **Optimism** | 0.01-0.05 gwei | **$0.02-$0.10** | 0.00002 ETH (~$0.06) |
| **Arbitrum** | 0.01-0.1 gwei | **$0.03-$0.30** | 0.0001 ETH (~$0.30) |
| **Polygon** | 30-100 gwei | **$0.01-$0.05** | 0.1 MATIC (~$0.05) |

**CRITICAL**: The "$20-100 for mainnet" estimates are OUTDATED from 2021-2023 when gas was 20-100+ gwei. Now mainnet is typically **$0.50-$6 per deployment!**

**Real example**: A complex vault contract deployment on Base costs ~$0.03. On Ethereum mainnet ~$0.50-$2 at normal gas prices.

Use Blockscout MCP `direct_api_call` with `/api/v2/stats` to check live gas prices.

### Step 6.5: Configure Production RPC (Non-Ethereum Chains)

**IMPORTANT**: For any chain except Ethereum mainnet, you need a reliable RPC endpoint. Public RPCs like `mainnet.base.org` will fail with 429 rate limit errors.

**Get a free API key from:**
- Alchemy: https://alchemy.com (recommended)
- Infura: https://infura.io
- QuickNode: https://quicknode.com

**Configure the RPC in two places:**

1. **packages/foundry/.env** (for deployment):
```bash
FORK_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY
CHAIN_ID=8453
```

2. **packages/nextjs/.env.local** (for frontend - copy from .env.example first):
```bash
NEXT_PUBLIC_ALCHEMY_API_KEY=YOUR_API_KEY
```

**RPC URLs by chain (Alchemy format):**
| Chain | URL |
|-------|-----|
| Ethereum | `https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY` |
| Base | `https://base-mainnet.g.alchemy.com/v2/YOUR_KEY` |
| Optimism | `https://opt-mainnet.g.alchemy.com/v2/YOUR_KEY` |
| Arbitrum | `https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY` |
| Polygon | `https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY` |

**Note**: Ethereum mainnet can use the free BuidlGuidl RPC (`mainnet.rpc.buidlguidl.com`) without an API key.

### Step 7: Deploy to Mainnet - ⚠️ INTERACTIVE

```bash
yarn deploy --network base
```

**⚠️ INTERACTIVE COMMAND - User must run manually!**

This command prompts for the keystore password and CANNOT be run by AI tools.

Deploys to REAL mainnet:
- Prompts for your encryption password
- Uses your funded deployer wallet
- Costs real gas
- But you're confident it works!

### Step 8: Verify Contracts (Recommended)

```bash
yarn verify --network base
```

Verifies your contracts on the block explorer (Basescan, Etherscan, etc.):
- Makes your contract source code publicly readable
- Enables users to interact with your contract directly on the explorer
- Builds trust by showing your code is open
- Runs automatically - no interaction needed

---

## SECURITY: Why Encrypted Deployers?

**NEVER put raw private keys in .env files!**

```bash
# WRONG - DANGEROUS
DEPLOYER_PRIVATE_KEY=0xac0974bec...

# RIGHT - Scaffold-ETH way
yarn generate  # Creates encrypted keystore
yarn account   # Shows address to fund
yarn deploy --network base  # Uses keystore
```

Raw private keys get:
- Committed to git accidentally
- Leaked in CI/CD logs  
- Stolen by malware scanning .env files

Encrypted keystores require your password to use.

---

## Commands Reference

| Command | What It Does | Interactive? |
|---------|--------------|--------------|
| `yarn fork --network base` | Start local Base fork | No - AI can run |
| `yarn deploy` | Deploy to local fork | No - AI can run |
| `yarn start` | Start frontend (connects to local) | No - AI can run |
| `yarn generate` | Create encrypted deployer account | **YES** - User must run |
| `yarn account` | Show deployer address and balances | **YES** - User must run |
| `yarn deploy --network base` | Deploy to real Base mainnet | **YES** - User must run |
| `yarn deploy --network mainnet` | Deploy to real Ethereum mainnet | **YES** - User must run |
| `yarn deploy --network optimism` | Deploy to real Optimism mainnet | **YES** - User must run |
| `yarn verify --network base` | Verify contracts on block explorer | No - AI can run |

**Interactive commands** require password input and will HANG if run by AI tools.

---

## For AI Agents

### CRITICAL: Interactive Commands

**These commands require password input and CANNOT be run by AI tools:**

| Command | Why | What to Do |
|---------|-----|------------|
| `yarn generate` | Sets keystore password | Guide user to run manually |
| `yarn account` | May need password | Guide user to run manually |
| `yarn deploy --network <chain>` | Needs keystore password | Guide user to run manually |

**If you try to run these via MCP tools, they will HANG waiting for input that never arrives.**

When the user is ready for mainnet deployment, STOP and provide step-by-step instructions:

```
To deploy to mainnet, you'll need to run these commands yourself 
(they require password input):

1. cd /path/to/your/project

2. yarn generate
   → Set a secure password (REMEMBER IT!)

3. yarn account
   → Copy the deployer address shown

4. Fund the deployer (GAS IS CHEAP NOW!):
   - L2s (Base/Optimism): $0.30 is plenty! Actual cost ~$0.02-$0.10
   - Arbitrum: $0.50 is plenty! Actual cost ~$0.03-$0.30
   - Ethereum mainnet: 0.001-0.005 ETH (~$3-15)

5. yarn deploy --network <chain>
   → Enter your password when prompted

Let me know when you're done and I can help verify!
```

### NEVER Say This

- "Should I deploy to testnet or mainnet?"
- "Do you want to use Base Sepolia first?"
- "Which network should I deploy to?"
- "Set DEPLOYER_PRIVATE_KEY in .env"
- "Add your private key to the .env file"
- "Let me run yarn generate for you" (IT WILL HANG!)

### ALWAYS Do This

When user says "build me an app on Base":

1. Initialize for Base: `stack_init({ chain: "base", ... })`
2. Install: `stack_install()`
3. Write contracts
4. Start local fork and deploy: `stack_start({ components: ["fork", "deploy", "frontend"] })`
5. Tell user: "Everything is running locally. When ready for mainnet, you'll need to run a few commands manually (they require password input)..." and provide the instructions above.

### For Mainnet Deployment Instructions

**⚠️ These commands are INTERACTIVE - guide user to run them manually!**

ALWAYS:
1. Explain the commands require password input
2. Give chain-specific funding amounts
3. Provide copy-paste ready commands

**For L2s (Base, Optimism, Arbitrum):**
> "To deploy to [chain], you'll need to run these commands yourself (they require password input that I can't provide):
> 
> ```bash
> cd /path/to/your/project
> yarn generate          # Set a secure password - REMEMBER IT!
> yarn account           # Copy the deployer address shown
> ```
> 
> **If you have $0.30+ worth of ETH, try deploying!** Actual cost is ~$0.02-$0.10.
> 
> ```bash
> yarn deploy --network [chain]   # Enter your password when prompted
> ```
> 
> Let me know when you're done and I can help verify!"

**For Ethereum Mainnet:**
> "To deploy to Ethereum mainnet, you'll need to run these commands yourself (they require password input that I can't provide):
> 
> ```bash
> cd /path/to/your/project
> yarn generate          # Set a secure password - REMEMBER IT!
> yarn account           # Copy the deployer address shown
> ```
> 
> Fund that address with **0.001-0.005 ETH** (~$3-15) - gas is much cheaper now!
> 
> ```bash
> yarn deploy --network mainnet   # Enter your password when prompted
> ```
> 
> Let me know when you're done and I can help verify!"

**IMPORTANT**: Don't tell L2 users to fund with "0.01-0.1 ETH" - that's 10-100x more than needed!

**For non-Ethereum chains (Base, Optimism, etc.)**, also say:
> "You'll also need a reliable RPC endpoint. Get a free API key from Alchemy (https://alchemy.com) and add it to:
> - `packages/foundry/.env`: `FORK_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY`
> - `packages/nextjs/.env.local`: `NEXT_PUBLIC_ALCHEMY_API_KEY=YOUR_KEY`"

NEVER suggest putting private keys in .env files.

### If User Asks for Testnet

Explain why forks are better:

> "I recommend using a mainnet fork instead. Forks give you real mainnet state (liquidity, contracts, prices), same addresses as mainnet, and free iteration. When your code works on a fork, it works on mainnet with no changes. Would you like me to set up a fork instead?"

Only use testnets if user insists after this explanation.

---

## Common Questions

### "But what if I make a mistake on mainnet?"

That's why you test on the fork first! The fork has real mainnet state. If your contract works there, it works on mainnet.

### "Don't I need testnet ETH?"

No. Fork development costs nothing. When ready for mainnet, you fund your deployer with real ETH:
- **L2s (Base, Optimism)**: $0.30 is plenty! Actual cost ~$0.02-$0.10
- **Arbitrum**: $0.50 is plenty! Actual cost ~$0.03-$0.30
- **Ethereum mainnet**: 0.001-0.005 ETH (~$3-15) - gas is cheap now!

### "What about contract verification?"

Verify on mainnet after deployment:
```bash
yarn verify --network base
```

### "Can I still use testnets if I want?"

Yes, but it's not recommended. Forks are strictly better for development. Only exception: if you're testing something that specifically behaves differently on testnet vs mainnet (rare).

---

## Summary

```
┌──────────────────────────────────────────────────────────────────┐
│                     DEVELOPMENT (FREE)                            │
│  ┌─────────┐    ┌──────────┐    ┌──────────────────────────────┐ │
│  │  Fork   │ -> │  Deploy  │ -> │  Test with real mainnet state │ │
│  │ mainnet │    │ to fork  │    │  (Uniswap, Aave, tokens)      │ │
│  └─────────┘    └──────────┘    └──────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                            │
                            │ When ready
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                   PRODUCTION (COSTS GAS)                          │
│  ┌────────────┐    ┌────────────┐    ┌─────────────────────────┐ │
│  │  yarn      │ -> │  yarn      │ -> │  Fund deployer:         │ │
│  │  generate  │    │  account   │    │  L2: $0.30 is plenty!   │ │
│  │ (encrypted)│    │ (get addr) │    │  Mainnet: 0.001-0.005 ETH│ │
│  └────────────┘    └────────────┘    └─────────────────────────┘ │
│         │                                                         │
│         ▼                                                         │
│  ┌────────────────────────────────┐    ┌───────────────────────┐ │
│  │  Configure RPC (non-ETH only)  │ -> │  yarn deploy          │ │
│  │  Get Alchemy key, update .env  │    │  --network base       │ │
│  └────────────────────────────────┘    └───────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

**Deployment is EXTREMELY cheap now!** Base/Optimism cost $0.02-$0.10. Ethereum mainnet $0.50-$6. The "$20-100" myth is outdated!

**Private keys are NEVER stored in plain text. Always encrypted with your password.**

**RPC keys needed for non-Ethereum chains (Base, Optimism, etc.) - get free at alchemy.com**

This is the way (for custom contracts).

---

## Frontend-Only Deployment (No Custom Contracts)

**If your project only needs a frontend for existing contracts, skip the entire contract deployment workflow.**

### When This Applies

- Building a UI for an existing protocol (Uniswap, Aave, Compound, etc.)
- Creating a dashboard or analytics tool
- Building an interface for an already-deployed contract
- Portfolio trackers, NFT galleries, etc.

### The Simplified Workflow

```
┌──────────────────────────────────────────────────────────────────┐
│                   DEVELOPMENT (SIMPLE)                            │
│  ┌─────────────────┐    ┌──────────────────────────────────────┐ │
│  │  Configure      │ -> │  Write frontend + yarn start          │ │
│  │  External       │    │  (connects to mainnet RPC directly)   │ │
│  │  Contracts      │    │                                        │ │
│  └─────────────────┘    └──────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                            │
                            │ Ready for production
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                   PRODUCTION (NO GAS COSTS!)                      │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  1. Update targetNetworks in scaffold.config.ts            │  │
│  │  2. Configure RPC (Alchemy key for non-Ethereum)           │  │
│  │  3. Deploy frontend to Vercel/Netlify                      │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Step-by-Step

#### 1. Initialize Project
```bash
npx create scaffold-eth@latest my-app
cd my-app
yarn install
```

#### 2. Configure External Contracts

Use `stack_configureExternalContracts` to add the contracts you're interacting with:

```
stack_configureExternalContracts({
  contracts: [
    { name: "USDC", type: "ERC20" },
    { name: "SwapRouter", type: "UniswapV3Router" },
    { name: "pool", type: "AaveV3Pool" }
  ]
})
```

This populates `externalContracts.ts` so scaffold-eth hooks work with these contracts.

#### 3. Write Your Frontend

Build your UI in `packages/nextjs/app/page.tsx` using scaffold-eth hooks:

```typescript
// Read from existing contracts
const { data: balance } = useScaffoldReadContract({
  contractName: "USDC",
  functionName: "balanceOf",
  args: [userAddress],
});

// Write to existing contracts
const { writeContractAsync } = useScaffoldWriteContract("SwapRouter");
```

#### 4. Test Locally

```bash
yarn start
```

Your frontend connects directly to mainnet RPCs. For **read-only** operations, this works without a fork.

**If you need to test write operations** (swaps, approvals, etc.), start a fork:
```bash
yarn fork --network base
```

#### 5. Deploy Frontend to Production

**a) Update target network in `packages/nextjs/scaffold.config.ts`:**
```typescript
targetNetworks: [chains.base], // Point to real mainnet
```

**b) Configure RPC (non-Ethereum chains only):**

Get a free API key from https://alchemy.com and add to `.env.local`:
```
NEXT_PUBLIC_ALCHEMY_API_KEY=your_key
```

**c) Deploy to Vercel:**
```bash
cd packages/nextjs
vercel
```

Add `NEXT_PUBLIC_ALCHEMY_API_KEY` to Vercel environment variables.

### What You Skip

| Step | Skip? | Why |
|------|-------|-----|
| `yarn fork` | Maybe | Only needed for testing writes |
| `yarn deploy` | YES | No contracts to deploy |
| `yarn generate` | YES | No deployer account needed |
| `yarn account` | YES | No deployer to fund |
| `yarn deploy --network` | YES | Nothing to deploy |
| `yarn verify` | YES | Nothing to verify |

### Cost Comparison

| Approach | Development Cost | Production Cost |
|----------|------------------|-----------------|
| Custom contracts | Free (fork) | Gas fees ($0.02-$6) |
| Frontend-only | Free | **$0** (just hosting) |

### Example: Aave Dashboard

User wants to see their Aave positions across chains.

**No custom contracts needed!** Just:
1. Configure AaveV3Pool and AaveV3PoolDataProvider as external contracts
2. Build a frontend that reads position data
3. Deploy to Vercel

Total blockchain costs: **$0**
