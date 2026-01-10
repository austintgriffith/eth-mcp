# eth-mcp Server Instructions

These instructions guide AI agents on how to use eth-mcp correctly.

## CRITICAL: Scaffold-ETH 2 Patterns

**ALWAYS use SE2's custom hooks and components. NEVER use raw wagmi hooks for contract interaction.**

### Reading Contract Data

```typescript
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

const { data: someData } = useScaffoldReadContract({
  contractName: "YourContract",
  functionName: "functionName",
  args: [arg1, arg2], // optional
});
```

### Writing to Contracts

```typescript
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const { writeContractAsync } = useScaffoldWriteContract({ contractName: "YourContract" });

// Usage:
await writeContractAsync({
  functionName: "functionName",
  args: [arg1, arg2],
  value: parseEther("0.1"), // optional, for payable functions
});
```

### Reading Events

```typescript
import { useScaffoldEventHistory } from "~~/hooks/scaffold-eth";

const { data: events } = useScaffoldEventHistory({
  contractName: "YourContract",
  eventName: "EventName",
  watch: true,
});
```

### Display Components

**ALWAYS use these for displaying blockchain data:**

```typescript
import { Address, AddressInput, Balance, EtherInput } from "~~/components/scaffold-eth";

<Address address="0x..." />           // Display address with ENS, blockie, copy
<AddressInput value={addr} onChange={setAddr} />  // Address input with ENS
<Balance address="0x..." />           // Display ETH/USD balance
<EtherInput value={eth} onChange={setEth} />      // ETH input with USD conversion
```

---

## CRITICAL: Frontend Design

**RULE: NEVER use purple/pink/indigo gradients. Use existing Scaffold-ETH theme tokens (base-100, base-200, base-300, primary, secondary, accent) for all colors.**

**NEVER use purple gradients or generic "SaaS" styling.**

Purple gradients reduce perceived seriousness and make apps feel like "yet another AI-generated app." The goal is trust, durability, and technical credibility.

### Banned Patterns

- NO purple, violet, lavender, indigo colors
- NO gradient backgrounds (`bg-gradient-*`)
- NO glassmorphism or blur effects
- NO glow effects or large shadows (max `shadow-md`)

### Choose DaisyUI Theme by Project Type

| Project Type | Theme | Rationale |
|--------------|-------|-----------|
| DeFi / Finance / Vaults | `corporate` | Trust, professional |
| Developer Tools | `dracula` | Terminal-like |
| Consumer / NFT | `retro` | Friendly, approachable |
| Data Dashboards | `lofi` | Clean, readable |

Set in `packages/nextjs/tailwind.config.js`:
```js
daisyui: {
  themes: ["corporate"], // Use ONE theme
}
```

### Design Lint (Check Before Coding)

- [ ] No purple/violet/indigo anywhere
- [ ] No `bg-gradient-*` classes
- [ ] All colors from DaisyUI theme tokens
- [ ] Shadows max `shadow-md`
- [ ] Using DaisyUI components (btn, card, input)

### When User Says "Make It Modern"

Translate to: professional spacing, clear hierarchy, subtle shadows.
DO NOT translate to: purple gradients, glow effects, glassmorphism.

### Reference Sites (Design Like These)

- Etherscan (light mode) - utilitarian, trusted
- GitHub Settings - functional
- Stripe Dashboard - clean
- GOV.UK - accessible

See `resource://frontend/design-system` for full guidelines.

---

## CRITICAL: Main UI Goes on the Home Page

**ALWAYS put the main application UI on `packages/nextjs/app/page.tsx`.**

When building a scaffold-eth app, the primary feature should be on the home page:

- A vault app → vault UI on `/` (page.tsx)
- A swap app → swap UI on `/` (page.tsx)
- An NFT mint app → mint UI on `/` (page.tsx)

**WRONG:**

- Creating `packages/nextjs/app/swap/page.tsx` and leaving home page untouched
- Building the main feature on a sub-route like `/vault` or `/dashboard`

**RIGHT:**

- Replace the default content in `packages/nextjs/app/page.tsx` with your app's main UI
- Only create sub-routes for secondary features (settings, history, admin, etc.)

The user expects to see the app when they visit `http://localhost:3000`, not a default scaffold-eth landing page.

---

## CRITICAL: Deployer Account Security

**NEVER tell users to put raw private keys in .env files.**

### WRONG (DANGEROUS - NEVER DO THIS):
```
DEPLOYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

### RIGHT (SECURE):
```bash
yarn generate   # Creates ENCRYPTED deployer account
yarn account    # Shows address to fund
yarn deploy --network base  # Uses encrypted key (prompts for password)
```

### Why This Matters

Raw private keys in .env files:
- Get accidentally committed to git
- Leak in CI/CD logs
- Get stolen by malware scanning for hex strings
- Result in STOLEN FUNDS

Encrypted keys (via `yarn generate`) require a password you set.

### Mainnet Deployment Instructions

When user is ready for mainnet, give **chain-specific** funding amounts:

**For L2s (Base, Optimism, Arbitrum):**
> "To deploy to [chain]:
> 1. Run `yarn generate` to create an encrypted deployer account
> 2. Run `yarn account` to see the deployer address
> 3. Fund that address with **0.001-0.002 ETH** (L2 deployments cost <$1!)
> 4. Run `yarn deploy --network [chain]` (you'll be prompted for your password)"

**For Ethereum Mainnet:**
> "To deploy to Ethereum:
> 1. Run `yarn generate` to create an encrypted deployer account
> 2. Run `yarn account` to see the deployer address
> 3. Fund that address with **0.01-0.05 ETH** (mainnet is expensive - $20-100)
> 4. Run `yarn deploy --network mainnet` (you'll be prompted for your password)"

**Gas Cost Reference:**

| Chain | Recommended Funding | Typical Deploy Cost |
|-------|---------------------|---------------------|
| Ethereum Mainnet | 0.01-0.05 ETH | $20-100 |
| Base | 0.0005-0.002 ETH | $0.01-0.50 |
| Optimism | 0.0005-0.002 ETH | $0.01-0.50 |
| Arbitrum | 0.001-0.005 ETH | $0.10-1.00 |
| Polygon | 0.1-1 MATIC | $0.01-0.10 |

**IMPORTANT**: Don't tell L2 users to fund with "0.01-0.1 ETH" - that's 10-100x more than needed!

**NEVER suggest setting DEPLOYER_PRIVATE_KEY in any file.**

---

## CRITICAL: RPC Configuration

**Public RPCs get rate limited immediately.** Do NOT rely on default public RPCs for production.

### Default RPCs (Local Development)

| Chain | Default RPC | Reliability |
|-------|-------------|-------------|
| Ethereum | `mainnet.rpc.buidlguidl.com` | FREE, reliable - use this! |
| Base | `mainnet.base.org` | FAILS with 429 under any load |
| Optimism | `mainnet.optimism.io` | Rate limited |
| Arbitrum | `arb1.arbitrum.io/rpc` | Rate limited |
| Polygon | `polygon-rpc.com` | Rate limited |

### When You See 429 Errors

If the frontend shows `429 (Too Many Requests)` errors:

1. **Check the browser console** - you'll see POST requests failing to the RPC URL
2. **This is an RPC rate limit issue** - the public RPC is rejecting requests
3. **Solution**: User needs their own RPC API key

Tell the user:
> "You're hitting RPC rate limits. Get a free API key from Alchemy (https://alchemy.com) and I'll help you configure it."

### Production RPC Setup (Required for Non-Ethereum Chains)

When deploying to production on **any chain except Ethereum mainnet**:

> "Before deploying to [chain], you need a reliable RPC endpoint. The public RPC will fail under load.
>
> **Get a free API key from:**
> - Alchemy: https://alchemy.com (recommended)
> - Infura: https://infura.io
> - QuickNode: https://quicknode.com
>
> Once you have your key, I'll help you add it to the project."

### Configuring RPC Keys

**Two files need configuration:**

1. **packages/foundry/.env** (for forking and deployment):
```
FORK_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY
CHAIN_ID=8453
```

2. **packages/nextjs/.env.local** (for frontend RPC calls):
```
NEXT_PUBLIC_ALCHEMY_API_KEY=YOUR_API_KEY
```

### SAFETY: Never Overwrite .env Files!

**WRONG** (will destroy existing config):
```bash
echo 'FORK_URL=...' > packages/foundry/.env
```

**RIGHT** (append or prompt user):
```bash
echo 'FORK_URL=...' >> packages/foundry/.env
```

**BEST** (ask user to edit manually):
> "Please add this line to `packages/foundry/.env`:
> ```
> FORK_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
> ```"

If you cannot read `.env` files directly, always prompt the user to make the changes manually.

### Alchemy RPC URL Format

| Chain | Alchemy RPC URL |
|-------|-----------------|
| Ethereum | `https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY` |
| Base | `https://base-mainnet.g.alchemy.com/v2/YOUR_KEY` |
| Optimism | `https://opt-mainnet.g.alchemy.com/v2/YOUR_KEY` |
| Arbitrum | `https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY` |
| Polygon | `https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY` |

---

## CRITICAL: Deployment Workflow

**NEVER ask users about testnets vs mainnet.** The deployment path is always:

### Phase 1: Local Development (FREE)

1. **FORK**: `yarn fork --network <chain>` (e.g., `yarn fork --network base`)
   - Creates a LOCAL fork of the mainnet chain
   - You get REAL mainnet state (contracts, liquidity, prices)
   - Chain ID is 31337 (localhost)
   - **Cost: $0**

2. **TEST**: `yarn deploy` deploys to the LOCAL fork
   - All testing happens on your local machine
   - Real mainnet state, but free to iterate
   - Redeploy as many times as needed

### Phase 2: Mainnet Deployment (SECURE)

3. **GENERATE**: `yarn generate` when ready for mainnet
   - Creates an ENCRYPTED deployer wallet
   - You set a password to protect it
   - **Fund the deployer based on chain:**
     - L2s (Base, Optimism, Arbitrum): **0.001 ETH is plenty** (~$3, enough for many deploys)
     - Ethereum mainnet: **0.01-0.05 ETH** ($30-150, mainnet is expensive)

4. **DEPLOY**: `yarn deploy --network <chain>` for real mainnet
   - Prompts for your password
   - Deploys to actual mainnet
   - Costs real gas (but L2s are <$1 per deploy!)

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
> "I'll set up a local Base fork for development. This gives you real Base mainnet state to test against, completely free. When you're ready for mainnet, run `yarn generate` to create an encrypted deployer, fund it with ~0.001 ETH (Base deployments are very cheap - under $1), then `yarn deploy --network base`."

## If User Explicitly Asks for Testnet

Explain why forks are better:
> "I recommend using a mainnet fork instead. Forks give you real mainnet state, same addresses as mainnet, and free iteration. Would you like me to set up a fork instead?"

Only use testnets if user insists after this explanation.

---

## CRITICAL: External Contracts Configuration

When building projects that interact with **external contracts** (not contracts the user deploys), you MUST configure them for the debug UI.

### What Are External Contracts?

External contracts are protocols/tokens that already exist on-chain:
- **Tokens**: USDC, DAI, WETH, WBTC
- **DeFi Protocols**: Aave pools, Uniswap routers, Compound markets
- **Vaults**: ERC-4626 vaults you're integrating with

### When to Configure External Contracts

Detect external contract usage from:

1. **User request**: "build a USDC vault", "swap on Uniswap", "integrate with Aave"
2. **Solidity imports**: `IERC20`, `IAavePool`, `ISwapRouter`
3. **Hardcoded addresses** in their contract code

### How to Configure

Use `stack_configureExternalContracts` with the appropriate contract type:

```
stack_configureExternalContracts({
  contracts: [
    { name: "USDC", type: "ERC20" },
    { name: "pool", type: "AaveV3Pool", address: "0x..." }
  ]
})
```

### Bundled ABIs (No External Fetch Needed)

| Type | Covers |
|------|--------|
| `ERC20` | USDC, DAI, WETH, USDT, all standard tokens |
| `ERC721` | NFT contracts |
| `ERC4626` | Tokenized vaults |
| `AaveV3Pool` | Aave lending pool (supply, borrow, withdraw) |
| `AaveV3PoolDataProvider` | Aave reserve/user data queries |
| `UniswapV3Router` | Uniswap V3 swaps |
| `UniswapV3Quoter` | Swap quotes |
| `UniswapV2Router` | V2-style DEX (also Sushi, Quick, etc.) |

### If ABI Is Not Bundled

When a contract type is not bundled and the user didn't provide an ABI:

1. **Try Blockscout MCP** (if available):
   ```
   get_contract_abi({ chain_id: 8453, address: "0x..." })
   ```

2. **Search the web** for "[contract name] ABI"

3. **Tell the user** to get the ABI manually:
   > "I need the ABI for [contract]. You can get it from:
   > - Etherscan: Search the contract address, click 'Contract' tab, copy ABI
   > - Blockscout: Same process
   > Once you have it, paste it here and I'll add it to externalContracts.ts"

### Chain ID Handling

The tool automatically adds entries for **BOTH**:
- `31337` - Local Anvil fork (so debug UI works during development)
- Real chainId (8453, 1, etc.) - So it works after mainnet deployment

### Example Workflow

**User**: "Build me a USDC yield vault on Base that deposits to Aave"

**AI Actions**:
```
1. stack_init({ template: "scaffold-eth", chain: "base", ... })
2. stack_install()
3. stack_configureExternalContracts({
     contracts: [
       { name: "USDC", type: "ERC20" },
       { name: "pool", type: "AaveV3Pool" }
     ]
   })
4. Write the vault contract
5. stack_start({ components: ["fork", "deploy", "frontend"] })
```

Now the debug UI shows USDC and Aave Pool alongside the user's vault.

---

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

### stack_generateAccount
- Creates an encrypted deployer account via `yarn generate`
- User sets encryption password
- Use this before mainnet deployment

### stack_checkAccount
- Shows deployer address and balances via `yarn account`
- Requires the encryption password
- Use to verify account is funded before mainnet deploy

### stack_configureExternalContracts
- Configures external contracts for the debug UI
- Use when project interacts with tokens (USDC), DeFi protocols (Aave, Uniswap)
- Supports bundled ABIs: ERC20, ERC721, ERC4626, AaveV3Pool, UniswapV3Router, etc.
- Automatically adds entries for both 31337 (fork) and real chainId
- If ABI not bundled: use Blockscout MCP, search web, or ask user

### Mainnet Deployment
Not done through eth-mcp tools directly. Guide user to run:
```bash
yarn generate     # Create encrypted deployer (if not done)
yarn account      # Check address and balance
yarn deploy --network base  # Deploy to real mainnet
```

---

## Summary

1. **Use SE2 hooks**: `useScaffoldReadContract`, `useScaffoldWriteContract`, `useScaffoldEventHistory`
2. **Use SE2 components**: `Address`, `AddressInput`, `Balance`, `EtherInput`
3. **No purple gradients**: Use DaisyUI themes (`corporate` for DeFi, `dracula` for dev tools)
4. **NEVER raw private keys**: Always `yarn generate` for encrypted deployers
5. **Fork-first workflow**: Test on local fork, deploy to mainnet when ready
6. **Never ask about testnets**: Forks are strictly better
7. **Configure external contracts**: Use `stack_configureExternalContracts` when integrating with tokens/protocols
8. **RPC configuration**: Use BuidlGuidl RPC for Ethereum; prompt for Alchemy key on other chains if 429 errors occur
