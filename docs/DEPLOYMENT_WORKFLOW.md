# Deployment Workflow

The correct deployment workflow for Scaffold-ETH projects. This is the ONLY path - no exceptions.

---

## The Golden Rule

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

**When you deploy to mainnet**, users connect real wallets (MetaMask, etc.) and confirm transactions as expected.

### Step 5: Generate Deployer (When Ready)

```bash
yarn generate
```

Creates a new **ENCRYPTED** deployer account:
- You'll be prompted to set a password
- **REMEMBER THIS PASSWORD** - you need it for every deployment
- For Foundry: Creates keystore in `~/.foundry/keystore`
- For Hardhat: Creates `DEPLOYER_PRIVATE_KEY_ENCRYPTED` in `.env`

**Your private key is NEVER stored in plain text.**

### Step 6: Check Deployer Address & Fund It

```bash
yarn account
```

Shows your deployer address and balances:
- Copy the address
- Fund it based on your target chain (see table below)

#### How Much ETH Do I Need?

**L2s are CHEAP!** Don't overfund based on mainnet prices.

| Chain | Recommended Funding | Typical Deploy Cost | Notes |
|-------|---------------------|---------------------|-------|
| **Ethereum Mainnet** | 0.01-0.05 ETH | $20-100 | Expensive - varies with gas price |
| **Base** | 0.0005-0.002 ETH | $0.01-0.50 | Very cheap! |
| **Optimism** | 0.0005-0.002 ETH | $0.01-0.50 | Very cheap! |
| **Arbitrum** | 0.001-0.005 ETH | $0.10-1.00 | Slightly higher than OP/Base |
| **Polygon** | 0.1-1 MATIC | $0.01-0.10 | Uses MATIC, not ETH |

**Real example**: A complex vault contract deployment on Base costs ~0.000003 ETH (~$0.01). You could deploy 300+ contracts with just 0.001 ETH!

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

### Step 7: Deploy to Mainnet

```bash
yarn deploy --network base
```

Deploys to REAL mainnet:
- Prompts for your encryption password
- Uses your funded deployer wallet
- Costs real gas
- But you're confident it works!

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

| Command | What It Does |
|---------|--------------|
| `yarn fork --network base` | Start local Base fork |
| `yarn deploy` | Deploy to local fork |
| `yarn start` | Start frontend (connects to local) |
| `yarn generate` | Create encrypted deployer account |
| `yarn account` | Show deployer address and balances |
| `yarn deploy --network base` | Deploy to real Base mainnet |
| `yarn deploy --network mainnet` | Deploy to real Ethereum mainnet |
| `yarn deploy --network optimism` | Deploy to real Optimism mainnet |

---

## For AI Agents

### NEVER Say This

- "Should I deploy to testnet or mainnet?"
- "Do you want to use Base Sepolia first?"
- "Which network should I deploy to?"
- "Set DEPLOYER_PRIVATE_KEY in .env"
- "Add your private key to the .env file"

### ALWAYS Do This

When user says "build me an app on Base":

1. Initialize for Base: `stack_init({ chain: "base", ... })`
2. Install: `stack_install()`
3. Write contracts
4. Start local fork and deploy: `stack_start({ components: ["fork", "deploy", "frontend"] })`
5. Tell user: "Everything is running locally. When ready for mainnet, run `yarn generate` to create an encrypted deployer, `yarn account` to see the address, fund it, then `yarn deploy --network base`."

### For Mainnet Deployment Instructions

ALWAYS give chain-specific funding amounts:

**For L2s (Base, Optimism, Arbitrum):**
> "To deploy to [chain]:
> 1. Run `yarn generate` to create an encrypted deployer account
> 2. Run `yarn account` to see your deployer address  
> 3. Fund that address with **0.001-0.002 ETH** (L2 deployments are very cheap - typically <$1)
> 4. Run `yarn deploy --network [chain]`"

**For Ethereum Mainnet:**
> "To deploy to Ethereum mainnet:
> 1. Run `yarn generate` to create an encrypted deployer account
> 2. Run `yarn account` to see your deployer address  
> 3. Fund that address with **0.01-0.05 ETH** (mainnet is expensive - $20-100 depending on gas)
> 4. Run `yarn deploy --network mainnet`"

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
- **L2s (Base, Optimism, Arbitrum)**: 0.001 ETH is plenty (~$3, enough for many deploys)
- **Ethereum mainnet**: 0.01-0.05 ETH ($30-150, mainnet is expensive)

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
│  │  generate  │    │  account   │    │  L2: 0.001 ETH (~$3)    │ │
│  │ (encrypted)│    │ (get addr) │    │  Mainnet: 0.01-0.05 ETH │ │
│  └────────────┘    └────────────┘    └─────────────────────────┘ │
│         │                                                         │
│         ▼                                                         │
│  ┌────────────────────────────────┐    ┌───────────────────────┐ │
│  │  Configure RPC (non-ETH only)  │ -> │  yarn deploy          │ │
│  │  Get Alchemy key, update .env  │    │  --network base       │ │
│  └────────────────────────────────┘    └───────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

**L2s are cheap!** Base/Optimism/Arbitrum deployments cost <$1. Don't overfund!

**Private keys are NEVER stored in plain text. Always encrypted with your password.**

**RPC keys needed for non-Ethereum chains (Base, Optimism, etc.) - get free at alchemy.com**

This is the way.
