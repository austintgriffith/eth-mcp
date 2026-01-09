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

### Step 5: Generate Deployer (When Ready)

```bash
yarn generate
```

Creates a new deployer wallet:
- Shows you the address
- Fund it with 0.01-0.1 ETH (usually enough)

### Step 6: Deploy to Mainnet

```bash
yarn deploy --network base
```

Deploys to REAL mainnet:
- Uses your funded deployer wallet
- Costs real gas
- But you're confident it works!

---

## Commands Reference

| Command | What It Does |
|---------|--------------|
| `yarn fork --network base` | Start local Base fork |
| `yarn deploy` | Deploy to local fork |
| `yarn start` | Start frontend (connects to local) |
| `yarn generate` | Create deployer wallet |
| `yarn deploy --network base` | Deploy to real Base mainnet |
| `yarn deploy --network mainnet` | Deploy to real Ethereum mainnet |
| `yarn deploy --network optimism` | Deploy to real Optimism mainnet |

---

## For AI Agents

### NEVER Say This

- "Should I deploy to testnet or mainnet?"
- "Do you want to use Base Sepolia first?"
- "Which network should I deploy to?"

### ALWAYS Do This

When user says "build me an app on Base":

1. Initialize for Base: `stack_init({ chain: "base", ... })`
2. Install: `stack_install()`
3. Write contracts
4. Start local fork and deploy: `stack_start({ components: ["fork", "deploy", "frontend"] })`
5. Tell user: "Everything is running locally. When you're ready for mainnet, we'll use `yarn generate` and `yarn deploy --network base`."

### If User Asks for Testnet

Explain why forks are better:

> "I recommend using a mainnet fork instead. Forks give you real mainnet state (liquidity, contracts, prices), same addresses as mainnet, and free iteration. When your code works on a fork, it works on mainnet with no changes. Would you like me to set up a fork instead?"

Only use testnets if user insists after this explanation.

---

## Common Questions

### "But what if I make a mistake on mainnet?"

That's why you test on the fork first! The fork has real mainnet state. If your contract works there, it works on mainnet.

### "Don't I need testnet ETH?"

No. Fork development costs nothing. When ready for mainnet, you fund your deployer with real ETH (usually 0.01-0.1 ETH is enough).

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
┌─────────────────────────────────────────────────────────────┐
│                    DEVELOPMENT (FREE)                        │
│  ┌─────────┐    ┌──────────┐    ┌─────────────────────────┐ │
│  │  Fork   │ -> │  Deploy  │ -> │  Test with real state   │ │
│  │ mainnet │    │ to fork  │    │  (Uniswap, Aave, etc.)  │ │
│  └─────────┘    └──────────┘    └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ When ready
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   PRODUCTION (COSTS GAS)                     │
│  ┌────────────┐    ┌─────────────────┐    ┌──────────────┐  │
│  │  Generate  │ -> │  Fund deployer  │ -> │  Deploy to   │  │
│  │  deployer  │    │  (0.01-0.1 ETH) │    │   mainnet    │  │
│  └────────────┘    └─────────────────┘    └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

This is the way.
