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

When user is ready for mainnet, tell them:

> "To deploy to mainnet:
> 1. Run `yarn generate` to create an encrypted deployer account
> 2. Run `yarn account` to see the deployer address
> 3. Fund that address with 0.01-0.1 ETH
> 4. Run `yarn deploy --network base` (you'll be prompted for your password)"

**NEVER suggest setting DEPLOYER_PRIVATE_KEY in any file.**

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
   - **Fund the deployer address with 0.01-0.1 ETH**

4. **DEPLOY**: `yarn deploy --network <chain>` for real mainnet
   - Prompts for your password
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
> "I'll set up a local Base fork for development. This gives you real Base mainnet state to test against, completely free. When you're ready for mainnet, run `yarn generate` to create an encrypted deployer, fund it, then `yarn deploy --network base`."

## If User Explicitly Asks for Testnet

Explain why forks are better:
> "I recommend using a mainnet fork instead. Forks give you real mainnet state, same addresses as mainnet, and free iteration. Would you like me to set up a fork instead?"

Only use testnets if user insists after this explanation.

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
3. **NEVER raw private keys**: Always `yarn generate` for encrypted deployers
4. **Fork-first workflow**: Test on local fork, deploy to mainnet when ready
5. **Never ask about testnets**: Forks are strictly better
