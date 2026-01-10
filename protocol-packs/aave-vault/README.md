# Aave V3 Yield Vault Protocol Pack

A simple ERC-4626 vault that deposits to Aave V3 for lending yield.

## Overview

This vault automatically deposits user funds into Aave V3, earning the current supply APY. Users receive vault shares representing their proportional ownership of the deposited assets plus accrued interest.

## Quick Start with eth-mcp

### 1. Research Yields

```
defi_compareYields({ asset: "USDC", chain: "base" })
→ See current Aave V3 APY on Base
```

### 2. Get Addresses

```
addresses_getProtocol({ chain: "base", protocol: "aaveV3" })
→ pool: 0xA238Dd80C259a72e81d7e4664a9801593F98d1c5

addresses_getToken({ chain: "base", symbol: "USDC" })
→ 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

### 3. Scaffold Project

```
stack_init({ template: "scaffold-eth", chain: "base", workspacePath: "/tmp/aave-vault" })
stack_install()
```

### 4. Copy Contract

```
project_writeFile({
  path: "packages/foundry/contracts/AaveVault.sol",
  content: "<contents of AaveVault.sol>"
})
```

### 5. Create Deploy Script

```solidity
// packages/foundry/script/Deploy.s.sol
import "../contracts/AaveVault.sol";

contract DeployScript is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        // Base addresses
        address usdc = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
        address aavePool = 0xA238Dd80C259a72e81d7e4664a9801593F98d1c5;
        
        AaveVault vault = new AaveVault(
            IERC20(usdc),
            IAavePool(aavePool),
            "Aave USDC Vault",
            "aUSDC-V"
        );
        
        console.log("AaveVault deployed to:", address(vault));
    }
}
```

### 6. Deploy & Test

```
stack_start({ components: ["fork", "deploy", "frontend"] })
```

## Deployment Addresses by Chain

### Aave V3 Pool Addresses

| Chain | Pool Address |
|-------|--------------|
| Mainnet | `0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2` |
| Base | `0xA238Dd80C259a72e81d7e4664a9801593F98d1c5` |
| Arbitrum | `0x794a61358D6845594F94dc1DB02A252b5b4814aD` |
| Optimism | `0x794a61358D6845594F94dc1DB02A252b5b4814aD` |
| Polygon | `0x794a61358D6845594F94dc1DB02A252b5b4814aD` |

### Recommended Assets

| Chain | Asset | Address |
|-------|-------|---------|
| Base | USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| Base | WETH | `0x4200000000000000000000000000000000000006` |
| Mainnet | USDC | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` |
| Mainnet | WETH | `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2` |

## Contract Interface

### View Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `totalAssets()` | uint256 | Total assets including yield |
| `getCurrentAPY()` | uint256 | Current APY in ray (1e27 = 100%) |
| `getAPYPercent()` | uint256 | APY as percentage (500 = 5.00%) |
| `convertToShares(assets)` | uint256 | Preview shares for deposit |
| `convertToAssets(shares)` | uint256 | Preview assets for withdrawal |

### User Functions

| Function | Description |
|----------|-------------|
| `deposit(assets, receiver)` | Deposit assets, receive shares |
| `mint(shares, receiver)` | Mint exact shares |
| `withdraw(assets, receiver, owner)` | Withdraw exact assets |
| `redeem(shares, receiver, owner)` | Redeem exact shares |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    User                              │
│           deposits USDC, gets shares                │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│                  AaveVault                          │
│         ERC-4626 compliant vault                    │
│     Tracks shares, handles deposits/withdrawals     │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│                  Aave V3 Pool                       │
│            Lending protocol                         │
│      Generates yield from borrowers                 │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│                    aToken                           │
│         Receipt token (balance = yield)             │
│      Interest accrues automatically                 │
└─────────────────────────────────────────────────────┘
```

## Security Features

1. **Inflation Attack Protection** - Uses decimal offset of 3
2. **Reentrancy Guards** - All entry points protected
3. **Immutable Pool** - Pool address cannot be changed
4. **Auto aToken Discovery** - Fetches correct aToken from pool

## Example Frontend Integration

```tsx
// Check current APY
const { data: apyPercent } = useScaffoldReadContract({
  contractName: "AaveVault",
  functionName: "getAPYPercent",
});

// Display: "Current APY: 4.25%"
const formattedAPY = apyPercent ? (Number(apyPercent) / 100).toFixed(2) : "0";
```

## Testing on Fork

The vault works best tested against a mainnet fork:

```bash
# Fork Base mainnet
anvil --fork-url https://mainnet.base.org

# Run tests
forge test --fork-url http://localhost:8545
```

## Customization Ideas

1. **Add Management Fees** - Extend with fee collection
2. **Multi-Asset Support** - Create vault factory for different assets
3. **Auto-Compound Rewards** - If Aave rewards are active
4. **Leverage** - Borrow against supplied assets for leveraged yield

## Resources

- [Aave V3 Documentation](https://docs.aave.com/developers/getting-started/readme)
- [eth-mcp YIELD_VAULT_GUIDE.md](../../docs/YIELD_VAULT_GUIDE.md)
- [ERC-4626 Base Vault](../erc4626-vault/README.md)
