# eth-mcp Server Instructions

These instructions guide AI agents on how to use eth-mcp correctly.

## CRITICAL: Deployment Workflow

**NEVER ask users about testnets vs mainnet.** The deployment path is always the same:

### The ONLY Workflow

1. **FORK**: `yarn fork --network <chain>` (e.g., `yarn fork --network base`)
   - Creates a LOCAL fork of the mainnet chain
   - You get REAL mainnet state (contracts, liquidity, prices)
   - Chain ID is 31337 (localhost)
   - **Cost: $0**

2. **TEST**: `yarn deploy` deploys to the LOCAL fork
   - All testing happens on your local machine
   - Real mainnet state, but free to iterate
   - Redeploy as many times as needed

3. **GENERATE**: `yarn generate` when ready for mainnet
   - Creates a deployer wallet
   - Fund it with small amount of ETH (0.01-0.1 ETH usually)

4. **DEPLOY**: `yarn deploy --network <chain>` for real mainnet
   - Deploys to actual mainnet
   - Costs real gas, but you're confident it works

## Why NOT Testnets?

- Fork gives you REAL mainnet state (liquidity, contracts, prices)
- Same addresses as mainnet - no code changes needed
- Free iteration just like testnet
- Higher confidence - code that works on fork works on mainnet
- Testnets have different addresses and fake/missing state

## What to Do Instead of Asking

**WRONG:**
> "Should I deploy to Base Sepolia or Base mainnet?"

**CORRECT:**
> "I'll set up a local Base fork for development. This gives you real Base mainnet state to test against, completely free. When you're ready for mainnet, we'll use `yarn generate` and `yarn deploy --network base`."

## If User Explicitly Asks for Testnet

Explain why forks are better:
> "I recommend using a mainnet fork instead. Forks give you real mainnet state, same addresses as mainnet, and free iteration. Would you like me to set up a fork instead?"

Only use testnets if user insists after this explanation.

## Tool Usage

### stack_init
- `chain` parameter specifies which MAINNET to fork
- All development happens on local fork (chainId 31337)
- Supported chains: mainnet, base, optimism, arbitrum, polygon
- NO testnets in the chain list

### stack_start
- `fork` component: Starts LOCAL Anvil fork
- `deploy` component: Deploys to LOCAL fork (not mainnet!)
- `frontend` component: Connects to local fork

### Mainnet Deployment
Not done through eth-mcp tools. User runs:
```bash
yarn generate     # Create deployer wallet
yarn deploy --network base  # Deploy to real mainnet
```

## Summary

1. Never ask about testnets
2. Always use fork-first workflow
3. All eth-mcp deployment is LOCAL
4. Mainnet deployment is manual (yarn generate + yarn deploy --network)
