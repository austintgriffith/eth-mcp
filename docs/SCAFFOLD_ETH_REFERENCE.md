# Scaffold-ETH 2 Quick Reference

Quick reference for AI agents working with Scaffold-ETH 2 projects.

---

## Project Structure

```
scaffold-eth-2/
├── packages/
│   ├── foundry/                    # Smart contracts (Foundry)
│   │   ├── contracts/              # Solidity contracts
│   │   │   └── YourContract.sol    # Main contract
│   │   ├── script/                 # Deployment scripts
│   │   │   └── Deploy.s.sol        # Main deploy script
│   │   ├── test/                   # Foundry tests
│   │   └── foundry.toml            # Foundry configuration
│   │
│   └── nextjs/                     # Frontend (Next.js 14)
│       ├── app/                    # App router pages
│       │   ├── page.tsx            # Home page
│       │   ├── debug/              # Contract debug UI
│       │   └── blockexplorer/      # Local block explorer
│       ├── components/             # React components
│       │   └── scaffold-eth/       # SE2 components
│       ├── contracts/              # Generated ABIs
│       │   └── deployedContracts.ts
│       ├── hooks/                  # React hooks
│       │   └── scaffold-eth/       # Contract hooks
│       ├── utils/                  # Utilities
│       └── scaffold.config.ts      # Frontend config
│
├── package.json                    # Root package.json
└── yarn.lock
```

---

## Key Commands

```bash
# Install dependencies
yarn install

# Start local chain (Anvil)
yarn chain

# Fork a network
yarn fork --network base

# Deploy contracts
yarn deploy

# Deploy with reset (redeploy all)
yarn deploy --reset

# Start frontend
yarn start

# Run contract tests
yarn foundry:test

# Compile contracts
yarn foundry:build

# Create encrypted deployer account (for mainnet)
yarn generate

# Show deployer address and balances
yarn account
```

---

## Common Contract Patterns

### Basic Contract with Owner

```solidity
// packages/foundry/contracts/YourContract.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract YourContract is Ownable {
    string public greeting = "Hello!";
    uint256 public counter;
    
    event GreetingChanged(string newGreeting);
    event CounterIncremented(uint256 newValue);
    
    constructor(address _owner) Ownable(_owner) {}
    
    function setGreeting(string memory _greeting) public {
        greeting = _greeting;
        emit GreetingChanged(_greeting);
    }
    
    function increment() public {
        counter++;
        emit CounterIncremented(counter);
    }
}
```

### Deploy Script

```solidity
// packages/foundry/script/Deploy.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./DeployHelpers.s.sol";
import "../contracts/YourContract.sol";

contract DeployScript is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        YourContract yourContract = new YourContract(deployer);
        console.log("YourContract deployed to:", address(yourContract));
    }
}
```

---

## Frontend Hooks

### Reading Contract State

```tsx
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

function MyComponent() {
  const { data: greeting } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "greeting",
  });
  
  return <div>{greeting}</div>;
}
```

### Writing to Contract

```tsx
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

function MyComponent() {
  const { writeAsync: setGreeting, isLoading } = useScaffoldWriteContract({
    contractName: "YourContract",
    functionName: "setGreeting",
    args: ["New greeting!"],
  });
  
  return (
    <button onClick={() => setGreeting()} disabled={isLoading}>
      {isLoading ? "Setting..." : "Set Greeting"}
    </button>
  );
}
```

### Watching Events

```tsx
import { useScaffoldEventHistory } from "~~/hooks/scaffold-eth";

function MyComponent() {
  const { data: events } = useScaffoldEventHistory({
    contractName: "YourContract",
    eventName: "GreetingChanged",
    fromBlock: 0n,
  });
  
  return (
    <ul>
      {events?.map((event, i) => (
        <li key={i}>{event.args.newGreeting}</li>
      ))}
    </ul>
  );
}
```

### Using Contract Address

```tsx
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";

function MyComponent() {
  const { data: contractInfo } = useDeployedContractInfo("YourContract");
  
  return <div>Contract: {contractInfo?.address}</div>;
}
```

### External Contracts (USDC, Aave, etc.)

Contracts added to `externalContracts.ts` work **exactly like** deployed contracts with scaffold-eth hooks:

```tsx
// USDC is in externalContracts.ts - use scaffold-eth hooks!
const { data: balance } = useScaffoldReadContract({
  contractName: "USDC",
  functionName: "balanceOf",
  args: [address],
});

const { writeContractAsync: writeUSDC } = useScaffoldWriteContract("USDC");

// Approve vault to spend USDC - get vault address dynamically!
const { data: vaultInfo } = useDeployedContractInfo("YieldRedirectVault");
await writeUSDC({
  functionName: "approve",
  args: [vaultInfo?.address, amount],
});
```

**NEVER use raw wagmi hooks (`useReadContract`, `useWriteContract`) for contracts in externalContracts.ts. NEVER hardcode addresses.**

---

## Creating the Main UI (Home Page)

**For your app's primary feature, replace the home page content:**

```tsx
// packages/nextjs/app/page.tsx
"use client";

import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { Address } from "~~/components/scaffold-eth";

const Home: NextPage = () => {
  const { address } = useAccount();
  
  return (
    <div className="flex flex-col items-center pt-10">
      <h1 className="text-4xl font-bold">My App</h1>
      
      {address ? (
        <div className="mt-4">
          Connected: <Address address={address} />
        </div>
      ) : (
        <div className="mt-4">Please connect wallet</div>
      )}
    </div>
  );
};

export default Home;
```

The user expects to see your app at `http://localhost:3000`, not a default landing page.

---

## Creating Secondary Pages (Sub-routes)

**Only create sub-routes for secondary features** like settings, history, or admin:

```tsx
// packages/nextjs/app/settings/page.tsx
"use client";

import type { NextPage } from "next";

const SettingsPage: NextPage = () => {
  return (
    <div className="flex flex-col items-center pt-10">
      <h1 className="text-4xl font-bold">Settings</h1>
      {/* Secondary feature content */}
    </div>
  );
};

export default SettingsPage;
```

---

## Scaffold-ETH Components

### Address Display

```tsx
import { Address } from "~~/components/scaffold-eth";

<Address address="0x..." />
<Address address="0x..." format="short" />
```

### Balance Display

```tsx
import { Balance } from "~~/components/scaffold-eth";

<Balance address="0x..." />
```

### Block Number

```tsx
import { useBlockNumber } from "wagmi";

const { data: blockNumber } = useBlockNumber();
```

### Input Components

```tsx
import { AddressInput, IntegerInput, EtherInput } from "~~/components/scaffold-eth";

<AddressInput value={address} onChange={setAddress} />
<IntegerInput value={amount} onChange={setAmount} />
<EtherInput value={eth} onChange={setEth} />
```

---

## Configuration

### scaffold.config.ts

```typescript
// packages/nextjs/scaffold.config.ts
import { defineChain } from "viem";

export const scaffoldConfig = {
  targetNetworks: [chains.foundry], // or chains.mainnet, chains.base, etc.
  pollingInterval: 30000,
  alchemyApiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
  walletConnectProjectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
  onlyLocalBurnerWallet: true,
};
```

### Burner Wallet (Local Development)

**DO NOT CHANGE THIS SETTING.** Scaffold-ETH handles this automatically.

```typescript
onlyLocalBurnerWallet: true,  // DEFAULT - DO NOT CHANGE
```

| Setting | What It Means | When Burner Wallets Are Available |
|---------|---------------|-----------------------------------|
| `true` (default) | Burner wallets ONLY on local networks | Local fork only (safe for production) |
| `false` | Burner wallets EVERYWHERE | Including mainnet (DANGEROUS!) |

**The name is counterintuitive!** Setting it to `false` does NOT "disable" burner wallets - it ENABLES them on mainnet, which would let anyone use your app without a real wallet.

**What happens automatically:**
- **On local fork (chainId 31337)**: Auto-connected burner wallet, no popups, fund from faucet
- **On mainnet**: Real wallet connection required (MetaMask, etc.)

This lets you test the entire app flow locally without any wallet friction, then seamlessly transition to real wallet UX on mainnet. AI agents can use browser automation to click through the app, fund the burner wallet from the faucet, and test all user flows without any wallet extension or confirmation dialogs.

**NEVER set `onlyLocalBurnerWallet: false`** - Scaffold-ETH's default is correct.

### foundry.toml

```toml
# packages/foundry/foundry.toml
[profile.default]
src = 'contracts'
out = 'out'
libs = ['lib']
solc_version = '0.8.20'

[rpc_endpoints]
mainnet = "${MAINNET_RPC_URL}"
base = "https://mainnet.base.org"
```

---

## Testing Contracts

```solidity
// packages/foundry/test/YourContract.t.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/YourContract.sol";

contract YourContractTest is Test {
    YourContract public yourContract;
    address public owner = address(1);
    
    function setUp() public {
        yourContract = new YourContract(owner);
    }
    
    function testInitialGreeting() public {
        assertEq(yourContract.greeting(), "Hello!");
    }
    
    function testSetGreeting() public {
        yourContract.setGreeting("New greeting");
        assertEq(yourContract.greeting(), "New greeting");
    }
    
    function testIncrement() public {
        yourContract.increment();
        assertEq(yourContract.counter(), 1);
    }
}
```

---

## Environment Variables

```bash
# packages/foundry/.env
FORK_URL=https://mainnet.base.org
ETHERSCAN_API_KEY=...

# packages/nextjs/.env.local (for frontend)
NEXT_PUBLIC_ALCHEMY_API_KEY=...
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=...
```

**NEVER put raw private keys in .env files!**

---

## Deployer Account (Mainnet Deployment)

```bash
# Create encrypted deployer account
yarn generate

# Show deployer address and balances
yarn account

# Fund the deployer address, then deploy
yarn deploy --network base
```

The `yarn generate` command creates a password-protected keystore.
Your private key is NEVER stored in plain text.

---

## Useful Patterns

### Payable Function

```solidity
function deposit() public payable {
    require(msg.value > 0, "Must send ETH");
    balances[msg.sender] += msg.value;
}
```

### Withdraw Pattern

```solidity
function withdraw(uint256 amount) public {
    require(balances[msg.sender] >= amount, "Insufficient balance");
    balances[msg.sender] -= amount;
    (bool success,) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed");
}
```

### Access Control

```solidity
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyContract is Ownable {
    function adminOnly() public onlyOwner {
        // Only owner can call
    }
}
```

---

## Debugging Tips

1. **Check deployment**: Visit `/debug` in the frontend to see all contract functions
2. **Check events**: Visit `/blockexplorer` to see transactions and events
3. **Console logs**: Use `console.log` in Solidity (from forge-std)
4. **Fork testing**: Use `yarn fork --network mainnet` to test against real state
