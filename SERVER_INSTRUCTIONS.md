# eth-mcp Server Instructions

These instructions guide AI agents on how to use eth-mcp correctly.

---

## Purpose

eth-mcp helps users build decentralized applications on Ethereum and EVM-compatible chains using Scaffold-ETH 2. Your primary goal is to:

1. **Help users scaffold, develop, and deploy smart contracts** - Guide them through creating projects, writing Solidity, and testing locally
2. **Use the fork-first development workflow** - Always fork mainnet for development, never ask about testnets
3. **Build professional, trustworthy frontends** - Use DaisyUI themes and SE2 components, avoid generic styling
4. **Get them to mainnet when ready** - Guide them through secure deployment with encrypted keystores

---

## Critical Warnings

These issues will cause problems if ignored. Read this section before starting any project.

### 🚨 NEVER Hardcode Contract Addresses (WILL BREAK IN PRODUCTION!)

**NEVER do this in frontend code:**
```typescript
// ❌ WRONG - HARDCODED ADDRESS - WILL BREAK BETWEEN ENVIRONMENTS
const VAULT_ADDRESS = "0x31C2f2Ecd20944557A6fa1e98a8f34433B4E916b";
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
```

**ALWAYS use scaffold-eth hooks:**
```typescript
// ✅ CORRECT - For contracts YOU deployed (in deployedContracts.ts)
const { data: vaultInfo } = useDeployedContractInfo("YieldRedirectVault");
const vaultAddress = vaultInfo?.address;

// ✅ CORRECT - For reading/writing to your deployed contracts
const { data: balance } = useScaffoldReadContract({
  contractName: "YieldRedirectVault",
  functionName: "totalAssets",
});

// ✅ CORRECT - For external contracts (in externalContracts.ts)
const { data: usdcBalance } = useScaffoldReadContract({
  contractName: "USDC",  // Configured via stack_configureExternalContracts
  functionName: "balanceOf",
  args: [address],
});

// ✅ CORRECT - Using an address AS AN ARGUMENT to another contract
// Example: Approving the vault to spend USDC
const { data: vaultInfo } = useDeployedContractInfo("YieldRedirectVault");
const { writeContractAsync } = useScaffoldWriteContract("USDC");

await writeContractAsync({
  functionName: "approve",
  args: [vaultInfo?.address, amount],  // ✅ Dynamic address from hook
});

// ❌ WRONG - NEVER do this even for function arguments!
await writeContractAsync({
  functionName: "approve",
  args: ["0x31C2f2Ecd20944557A6fa1e98a8f34433B4E916b", amount],  // ❌ Hardcoded!
});
```

**ZERO EXCEPTIONS RULE:** If you need an address for ANY reason - as a function argument, for allowance checks, for comparisons, for ANYTHING - get it from `useDeployedContractInfo` or the contracts config. There are ZERO exceptions.

**Why this is CRITICAL:**
- Local fork uses address `0xabc...`
- Mainnet deployment uses address `0xdef...`
- Hardcoded addresses = app works locally, **BREAKS in production**

**The two contract files:**
- `deployedContracts.ts` - Auto-generated when you run `yarn deploy`. Contains YOUR contracts.
- `externalContracts.ts` - Configure via `stack_configureExternalContracts`. Contains external protocols (USDC, Aave, Uniswap).

**BOTH are accessible via scaffold-eth hooks. NEVER hardcode. EVER. ZERO EXCEPTIONS.**

**Common mistake:** "I know the address, I'll just paste it." NO! Even if you have the address, get it dynamically. The address you have is for ONE environment - it will break in others.

---

### 🚨 RPC Configuration (PRODUCTION WILL FAIL WITHOUT THIS!)

**For Base, Optimism, Arbitrum, Polygon: Public RPCs fail with 429 rate limit errors!**

| Chain | Public RPC | Production Status |
|-------|-----------|-------------------|
| **Ethereum** | mainnet.rpc.buidlguidl.com | ✅ Works - FREE BuidlGuidl RPC |
| **Base** | mainnet.base.org | ❌ FAILS - 429 errors immediately |
| **Optimism** | mainnet.optimism.io | ❌ FAILS - 429 errors immediately |
| **Arbitrum** | arb1.arbitrum.io/rpc | ❌ FAILS - 429 errors immediately |
| **Polygon** | polygon-rpc.com | ❌ FAILS - 429 errors immediately |

**Before deploying to ANY non-Ethereum chain, user MUST:**

1. Get a FREE API key from https://alchemy.com
2. Add to `packages/nextjs/.env.local`:
   ```
   NEXT_PUBLIC_ALCHEMY_API_KEY=your_actual_key_here
   ```
3. For Vercel/production hosting: Add `NEXT_PUBLIC_ALCHEMY_API_KEY` to environment variables

**If user skips this step**, their production app will show `POST https://mainnet.base.org/ 429 (Too Many Requests)` errors and be completely unusable.

**When to remind user about RPC:**
- When `stack_start` runs with frontend on a non-Ethereum chain
- When user asks about mainnet deployment
- When `stack_generateAccount` is called
- ALWAYS before they deploy frontend to production

**Use `stack_checkProductionReadiness` to verify RPC configuration before deployment.**

---

### Interactive Commands (Will Cause Hanging)

Some commands require interactive password input and CANNOT be run by AI tools. They will HANG if you try to run them via MCP tools:

| Command | Why Interactive | What to Do |
|---------|-----------------|------------|
| `yarn generate` | Prompts user to SET a keystore password | Guide user to run manually |
| `yarn account` | May prompt for keystore password | Guide user to run manually |
| `yarn deploy --network <chain>` | Prompts for keystore password | Guide user to run manually |

**When user is ready for mainnet**, provide these instructions:

```
To deploy to mainnet, you'll need to run a few commands manually 
(they require password input that I can't provide):

1. CRITICAL - Configure RPC (for Base/Optimism/Arbitrum/Polygon ONLY):
   Get a FREE API key from https://alchemy.com
   Add to packages/nextjs/.env.local:
   NEXT_PUBLIC_ALCHEMY_API_KEY=your_key_here
   (Also add to Vercel env vars for production!)

2. Create your encrypted deployer account:
   cd /path/to/project
   yarn generate
   (Enter a secure password - REMEMBER IT!)

3. Check your deployer address:
   yarn account
   (Copy the address shown)

4. Fund the deployer address:
   - For L2s (Base, Optimism, Arbitrum): Actual cost is $0.01-$0.10. If you have 0.00005+ ETH (~$0.15), try deploying!
   - For Ethereum mainnet: Send 0.01-0.05 ETH ($30-150)

5. Deploy contracts to mainnet:
   yarn deploy --network <chain>
   (Enter your password when prompted)

⚠️  If you skip step 1, your production frontend WILL show 429 errors!

Let me know once you've completed these steps and I can help verify!
```

### No Purple Gradients (Will Cause Bad UX)

Every frontend you build MUST follow these rules. Purple gradients = "generic AI slop" = users don't trust your app.

**BANNED (Never Use):**
- `purple`, `violet`, `lavender`, `indigo` - ANY purple-adjacent colors
- `bg-gradient-*` - ANY gradient backgrounds
- `backdrop-blur`, `backdrop-filter` - NO glassmorphism
- `shadow-lg`, `shadow-xl`, `shadow-2xl` - shadows > 4px
- Glow effects, neon colors, animated color transitions

**REQUIRED (Always Use):**
- DaisyUI theme: `corporate` (DeFi/Finance) or `dracula` (dev tools)
- Theme tokens: `bg-base-100`, `bg-base-200`, `bg-base-300`
- Theme colors: `primary`, `secondary`, `accent` from theme
- DaisyUI components: `btn`, `card`, `input`, `stats`
- Shadows: `shadow-sm` or `shadow-md` ONLY

**Design Lint (Check Before EVERY Component):**
```
[ ] No purple/violet/indigo anywhere in the file
[ ] No bg-gradient-* classes
[ ] No backdrop-blur or glassmorphism
[ ] Shadows are shadow-sm or shadow-md max
[ ] Using DaisyUI components (btn, card, input)
[ ] Colors from theme tokens only
```

Reference sites: Etherscan, GitHub Settings, Stripe Dashboard, GOV.UK.

---

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
> 3. **If you have $0.10+ worth of ETH, try deploying!** Actual cost is usually $0.01-$0.10.
> 4. Run `yarn deploy --network [chain]` (you'll be prompted for your password)
> 
> Don't have enough? Add just $0.50-$1 worth of ETH - that's plenty for many deployments!"

**For Ethereum Mainnet:**
> "To deploy to Ethereum:
> 1. Run `yarn generate` to create an encrypted deployer account
> 2. Run `yarn account` to see the deployer address
> 3. Fund that address with **0.01-0.05 ETH** (mainnet is expensive - $20-100)
> 4. Run `yarn deploy --network mainnet` (you'll be prompted for your password)"

**Gas Cost Reference:**

| Chain | Actual Deploy Cost | Minimum to Try | Comfortable Buffer |
|-------|-------------------|----------------|-------------------|
| Ethereum Mainnet | $20-100 | 0.01 ETH | 0.03-0.05 ETH |
| Base | **$0.01-$0.10** | 0.00005 ETH (~$0.15) | 0.0005 ETH (~$1.50) |
| Optimism | **$0.01-$0.10** | 0.00005 ETH (~$0.15) | 0.0005 ETH (~$1.50) |
| Arbitrum | $0.05-$0.50 | 0.0002 ETH (~$0.60) | 0.001 ETH (~$3) |
| Polygon | $0.01-$0.10 | 0.05 MATIC | 0.5 MATIC |

**CRITICAL FOR L2s**: If user has $0.10+ worth of ETH on Base/Optimism, **TELL THEM TO TRY DEPLOYING**. Don't say they need more money! Actual cost is usually under $0.10.

**WRONG**: "You need $3-5 more for deployment"
**RIGHT**: "You have $0.20 - that should be plenty! Base deploys typically cost $0.01-$0.10. Let's try it!"

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
     - L2s (Base, Optimism): **$0.10 is usually enough!** Actual cost ~$0.01-$0.10
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
> "I'll set up a local Base fork for development. This gives you real Base mainnet state to test against, completely free. When you're ready for mainnet, run `yarn generate` to create an encrypted deployer. Base deployments cost ~$0.01-$0.10 - if you have $0.10+ worth of ETH, just try deploying! Then run `yarn deploy --network base`."

## If User Explicitly Asks for Testnet

Explain why forks are better:
> "I recommend using a mainnet fork instead. Forks give you real mainnet state, same addresses as mainnet, and free iteration. Would you like me to set up a fork instead?"

Only use testnets if user insists after this explanation.

---

## CRITICAL: Burner Wallet Testing (AI Browser Automation)

**On local forks, the frontend uses burner wallets - enabling fully automated UI testing.**

### DO NOT MODIFY `onlyLocalBurnerWallet`

Scaffold-ETH automatically handles this. **NEVER change this setting:**

```typescript
// scaffold.config.ts - DO NOT CHANGE THIS LINE
onlyLocalBurnerWallet: true,  // DEFAULT - LEAVE IT ALONE
```

| Setting | What It Actually Means |
|---------|------------------------|
| `true` (default) | Burner wallets ONLY on local networks (SAFE) |
| `false` | Burner wallets EVERYWHERE including mainnet (DANGEROUS!) |

**The name is counterintuitive!** If you think "I need to disable burner wallets for production" and set it to `false`, you've done the OPPOSITE - you've ENABLED burner wallets on mainnet.

**Scaffold-ETH's default (`true`) is correct.** It automatically:
- Enables burner wallets on local fork (chainId 31337)
- Requires real wallets on mainnet

### AI Behavior Rule

When deploying to production or changing config files:

1. **Only change what was specifically requested** - nothing else
2. **Do NOT "helpfully" change other settings** - even if they seem related
3. **If a setting seems like it should change for production, ASK FIRST**
4. **The name `onlyLocalBurnerWallet` is a trap** - it means the OPPOSITE of what it sounds like

> "The setting name seemed 'obvious' so I didn't verify - which is exactly when mistakes happen."

### What This Means for AI Agents

When testing via browser automation (e.g., cursor-browser-extension MCP):

1. Navigate to `http://localhost:3000`
2. The app shows a pre-connected burner wallet address
3. Click the faucet button (bottom-left) to fund it with local ETH
4. All interactions work without wallet popups - click buttons, submit transactions
5. Test the complete user flow end-to-end

### Why This Matters

- **No wallet extension needed**: The burner wallet is built into the app
- **No confirmation dialogs**: Transactions auto-sign on local fork
- **Full UI testing**: AI can click through the entire app like a real user
- **Real behavior verification**: See actual transaction results, state changes, events

### Mainnet Behavior

When connected to real mainnet (not a fork):

- Users must connect a real wallet (MetaMask, Rainbow, etc.)
- Transactions require user confirmation
- This is the expected production behavior
- **This happens automatically** - no config changes needed!

### Testing Workflow Example

```
1. stack_start({ components: ["fork", "deploy", "frontend"] })
2. Open browser to http://localhost:3000
3. Click faucet button → burner wallet gets ETH
4. Test: click deposit, enter amount, submit → transaction executes immediately
5. Verify: check balances, events, state changes in the UI
6. Repeat for all user flows
```

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

## CRITICAL: Frontend Contract Interaction Rules

### The Golden Rule

**ALL contracts in BOTH `deployedContracts.ts` AND `externalContracts.ts` work with scaffold-eth hooks.**

Once you add a contract to externalContracts.ts, you MUST use scaffold-eth hooks to interact with it:

```tsx
// CORRECT - Use scaffold-eth hooks for USDC (it's in externalContracts!)
const { data: balance } = useScaffoldReadContract({
  contractName: "USDC",
  functionName: "balanceOf",
  args: [address],
});

const { writeContractAsync } = useScaffoldWriteContract("USDC");
```

### NEVER Do These Things

**1. NEVER hardcode contract addresses in frontend code**

```tsx
// ❌ WRONG - Hardcoded address
const VAULT_ADDRESS = "0x058a6bdf12e0c3b5087e8b5990f78aaf437869b2";

// ✅ CORRECT - Dynamic from deployment
const { data: vaultInfo } = useDeployedContractInfo("YieldRedirectVault");
const vaultAddress = vaultInfo?.address;
```

**2. NEVER use raw wagmi hooks for contracts in deployedContracts or externalContracts**

```tsx
// ❌ WRONG - Raw wagmi hooks
import { useReadContract, useWriteContract } from "wagmi";
const { data } = useReadContract({
  address: "0x...",  // hardcoded!
  abi: ERC20_ABI,    // redundant!
  functionName: "balanceOf",
});

// ✅ CORRECT - Scaffold-eth hooks work for externalContracts too!
const { data } = useScaffoldReadContract({
  contractName: "USDC",  // Name from externalContracts.ts
  functionName: "balanceOf",
  args: [address],
});
```

**3. NEVER re-define ABIs that already exist in deployedContracts or externalContracts**

```tsx
// ❌ WRONG - Redundant ABI definition
const ERC20_ABI = [{ name: "approve", ... }] as const;

// ✅ CORRECT - The ABI is already in externalContracts.ts, just use the hook
const { writeContractAsync } = useScaffoldWriteContract("USDC");
```

**4. NEVER use old hook names**

```tsx
// ❌ WRONG - Old hook names (these don't exist anymore!)
useScaffoldContractRead   // OLD - DO NOT USE
useScaffoldContractWrite  // OLD - DO NOT USE

// ✅ CORRECT - Current hook names
useScaffoldReadContract   // ALWAYS use this
useScaffoldWriteContract  // ALWAYS use this
```

### Why This Matters

Hardcoded addresses create bugs that **only appear in production**:
- Local fork uses address `0xabc...`
- Mainnet deployment uses address `0xdef...`
- Frontend still points to `0xabc...` → **App is broken**

Using `useDeployedContractInfo` and scaffold-eth hooks ensures addresses update automatically across environments.

---

## CRITICAL: Funding Test Wallets with Tokens on Forks

When building apps that need tokens (USDC vaults, swap interfaces, etc.), the user's connected wallet needs those tokens to test. Use Anvil's impersonation feature to transfer tokens from protocol "whale" addresses.

### Why Protocol Contracts Are Better Than EOAs

Protocol contracts (Morpho, Aave) are more reliable than EOA wallets because:
- They hold funds as part of their core function
- Balances are large and stable (often $100M+)
- Less likely to randomly move funds

### Recommended Whale Addresses

| Chain | Token | Whale Address | Protocol | Balance |
|-------|-------|---------------|----------|---------|
| Base | USDC | `0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb` | Morpho Blue | ~131M |
| Base | USDC | `0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB` | Aave aBasUSDC | ~97M |
| Ethereum | USDC | `0x37305B1cD40574E4C5Ce33f8e8306Be057fD7341` | Sky PSM | ~4.1B |
| Ethereum | USDC | `0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c` | Aave USDC V3 | ~700M |
| Arbitrum | USDC | `0x724dc807b04555b71ed48a6896b6F41593b8C637` | Aave USDCn | ~83M |

### One-Shot Cast Commands

When the user needs tokens to test, provide these commands:

```bash
# Variables (adjust as needed)
USDC=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
WHALE=0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb  # Morpho Blue
RECIPIENT=0xYourWalletAddress
AMOUNT=10000000000  # 10,000 USDC (6 decimals)
RPC=http://localhost:8545

# Step 1: Verify whale has USDC on your fork
cast call $USDC "balanceOf(address)(uint256)" $WHALE --rpc-url $RPC

# Step 2: Give whale ETH for gas (contracts have 0 ETH)
cast rpc anvil_setBalance $WHALE 0x8AC7230489E80000 --rpc-url $RPC

# Step 3: Impersonate the whale
cast rpc anvil_impersonateAccount $WHALE --rpc-url $RPC

# Step 4: Transfer tokens to recipient
cast send $USDC "transfer(address,uint256)" $RECIPIENT $AMOUNT \
  --from $WHALE --unlocked --rpc-url $RPC

# Step 5: Stop impersonation (optional)
cast rpc anvil_stopImpersonatingAccount $WHALE --rpc-url $RPC
```

### Why Each Step Matters

| Step | Why It's Needed |
|------|-----------------|
| Verify balance | Block explorer data may not match fork state |
| Set ETH balance | Contract addresses have 0 ETH by default |
| Impersonate first | Anvil needs explicit permission to sign as that address |
| Use --unlocked | Tells cast the account doesn't need a private key |

### When to Proactively Help

Recognize when users need test tokens:
- "Build me a USDC vault" → User will need USDC to test deposits
- "Create a swap interface" → User will need tokens to test swaps
- Any DeFi project involving tokens

After `stack_start`, proactively offer:
> "Your fork is running! To test with USDC, you'll need to fund your wallet. Here are the cast commands to get 10,000 USDC from the Morpho whale..."

### Getting the User's Connected Address

The user's frontend wallet address comes from RainbowKit/wagmi. In the browser, they can:
1. Open the app at http://localhost:3000
2. Connect their wallet
3. See their address in the UI

Or they can use one of Anvil's pre-funded test accounts:
```bash
# Anvil account #0 (pre-funded with 10,000 ETH)
0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

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

### stack_generateAccount (INTERACTIVE - Returns Instructions Only)
- **Does NOT execute `yarn generate`** - returns instructions for user
- The command requires interactive password input (TTY)
- Returns step-by-step instructions for user to run manually
- Use when user is ready to create their deployer account

### stack_checkAccount (INTERACTIVE - Returns Instructions Only)
- **Does NOT execute `yarn account`** - returns instructions for user
- The command may prompt for keystore password (TTY)
- Returns step-by-step instructions for user to run manually
- Use when user needs to see their deployer address

### stack_configureExternalContracts
- Configures external contracts for the debug UI
- Use when project interacts with tokens (USDC), DeFi protocols (Aave, Uniswap)
- Supports bundled ABIs: ERC20, ERC721, ERC4626, AaveV3Pool, UniswapV3Router, etc.
- Automatically adds entries for both 31337 (fork) and real chainId
- If ABI not bundled: use Blockscout MCP, search web, or ask user

### Mainnet Deployment (USER RUNS MANUALLY)

**IMPORTANT: Mainnet deployment commands are INTERACTIVE and require password input.**

Do NOT try to run these via MCP tools. Instead, guide the user:

```
These commands require password input, so you'll need to run them yourself:

1. cd /path/to/your/project

2. yarn generate
   (Set a secure password - remember it!)

3. yarn account  
   (Copy the deployer address shown)

4. Fund the address with ETH:
   - L2s (Base, Optimism): If you have $0.10+, try deploying! Actual cost ~$0.01-$0.10
   - Arbitrum: If you have $0.50+, try deploying! Actual cost ~$0.05-$0.50
   - Ethereum mainnet: 0.01-0.05 ETH

5. yarn deploy --network <chain>
   (Enter your password when prompted)

Let me know when you're done and I can help verify!
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
8. **Fund test wallets**: Use whale impersonation (Morpho/Aave) to give users tokens for testing
9. **RPC configuration**: Use BuidlGuidl RPC for Ethereum; prompt for Alchemy key on other chains if 429 errors occur
