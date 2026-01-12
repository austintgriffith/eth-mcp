# eth-mcp Server Instructions

Build dApps on Ethereum using Scaffold-ETH 2. Fork mainnet for dev, deploy when ready.

---

## RULES (Will Break Things If Ignored)

### 1. Never Hardcode Addresses

```tsx
// ❌ WRONG
const VAULT = "0x31C2f2...";

// ✅ CORRECT
const { data: vaultInfo } = useDeployedContractInfo("VaultContract");
const vaultAddress = vaultInfo?.address;
```

Zero exceptions. Even for function args. Local fork and mainnet have different addresses.

### 2. Use Scaffold-ETH Hooks (Not Raw Wagmi)

```tsx
// ❌ WRONG
import { useReadContract } from "wagmi";

// ✅ CORRECT
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

const { data } = useScaffoldReadContract({
  contractName: "YourContract",
  functionName: "getValue",
});
```

Hooks: `useScaffoldReadContract`, `useScaffoldWriteContract`, `useDeployedContractInfo`

### 3. Approve-Then-Action: Wait for Mining

**#1 cause of broken mainnet UX.** TX hash ≠ confirmation.

```tsx
// ❌ WRONG: Enable deposit after wallet signs
const hash = await approve();
setCanDeposit(true); // BUG: tx not mined yet!

// ✅ CORRECT: Wait for mining, re-read state
import { useWaitForTransactionReceipt } from "wagmi";

const { isSuccess } = useWaitForTransactionReceipt({ hash });

useEffect(() => {
  if (isSuccess) {
    refetchAllowance(); // Re-read on-chain state
    setTxState("ready");
  }
}, [isSuccess]);
```

Button states: `Approve` → `Approve in Wallet...` → `Confirming...` → `Deposit`

### 4. RPC Config for Non-Ethereum Chains

Public RPCs fail with 429 errors on Base/Optimism/Arbitrum/Polygon.

**Before production:** Get free Alchemy key, add to `.env.local`:

```
NEXT_PUBLIC_ALCHEMY_API_KEY=your_key
```

Ethereum mainnet uses free BuidlGuidl RPC - no config needed.

### 5. No Purple Gradients

**BANNED:** purple, violet, indigo, `bg-gradient-*`, glassmorphism, `shadow-lg`+

**USE:** DaisyUI `corporate` theme, `bg-base-100/200/300`, `shadow-sm/md` max

### 6. Never Infinite Approvals

```tsx
// ❌ WRONG
approve(spender, MaxUint256);

// ✅ CORRECT
approve(spender, exactAmountNeeded);
```

### 7. Never Raw Private Keys in .env

```bash
# ❌ WRONG
DEPLOYER_PRIVATE_KEY=0xac0974...

# ✅ CORRECT
yarn generate  # Creates encrypted keystore
yarn deploy --network base  # Prompts for password
```

### 8. Fork-First Workflow (Not Testnets)

```bash
yarn fork --network base  # Local fork with real mainnet state
yarn deploy               # Deploy to local fork (free)
yarn deploy --network base  # Deploy to real mainnet (costs gas)
```

Never ask "testnet or mainnet?" - forks are better.

### 9. Main UI on Home Page

Put your app's main feature on `packages/nextjs/app/page.tsx`, not a sub-route.

### 10. Don't Change onlyLocalBurnerWallet

```tsx
// scaffold.config.ts - LEAVE THIS ALONE
onlyLocalBurnerWallet: true; // Default is correct!
```

Setting to `false` ENABLES burner wallets on mainnet (dangerous).

---

## Gas Prices (January 2026)

LLMs have outdated info. Gas is CHEAP now:

| Chain         | Deploy Cost |
| ------------- | ----------- |
| Ethereum      | $0.50-$6    |
| Base/Optimism | $0.02-$0.10 |
| Arbitrum      | $0.03-$0.30 |

Check live: `direct_api_call({ chain_id: "1", endpoint_path: "/api/v2/stats" })`

---

## Quick Patterns

### Read Contract

```tsx
const { data } = useScaffoldReadContract({
  contractName: "Contract",
  functionName: "getValue",
});
```

### Write Contract

```tsx
const { writeContractAsync } = useScaffoldWriteContract("Contract");
await writeContractAsync({ functionName: "setValue", args: [123] });
```

### Get Contract Address

```tsx
const { data: info } = useDeployedContractInfo("Contract");
const address = info?.address;
```

### External Contracts (USDC, Aave, etc.)

```
stack_configureExternalContracts({
  contracts: [{ name: "USDC", type: "ERC20" }]
})
```

Then use `useScaffoldReadContract({ contractName: "USDC", ... })`

---

## Interactive Commands (User Runs Manually)

These hang if run via MCP - they need password input:

```
yarn generate              # Create encrypted deployer
yarn account               # Show deployer address
yarn deploy --network base # Deploy to mainnet
```

---

## Detailed Docs

For comprehensive guides, see:

- `docs/WEB3_DEVELOPMENT_GUIDE.md` - Patterns, security, gotchas
- `docs/FRONTEND_DESIGN_GUIDE.md` - UI design system
- `docs/SCAFFOLD_ETH_REFERENCE.md` - SE2 hooks and components
- `protocol-packs/erc4626-vault/components/VaultUI.tsx` - Approve flow example
