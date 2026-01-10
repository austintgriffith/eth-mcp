# ERC-4626 Base Vault Protocol Pack

A secure, extensible ERC-4626 vault template for building yield-generating applications.

## Overview

This protocol pack provides:

1. **BaseVault.sol** - A feature-rich ERC-4626 vault with built-in security
2. **VaultUI.tsx** - A ready-to-use React component for deposits/withdrawals

## Features

### Security
- Inflation attack protection (decimal offset)
- Reentrancy guards on all entry points
- Pausable deposits/withdrawals
- Donation attack protection (tracked assets)

### Extensibility
- Override `_afterDeposit()` to deploy assets to strategies
- Override `_beforeWithdraw()` to retrieve assets
- Override `totalAssets()` to include external balances

### Management
- Configurable management fees (up to 10%)
- Deposit limits
- Minimum deposit amounts
- Emergency token rescue

## Quick Start

### 1. Copy Files

```bash
# Copy contract to your project
cp contracts/BaseVault.sol packages/foundry/contracts/

# Copy UI component
cp components/VaultUI.tsx packages/nextjs/components/
```

### 2. Create Your Vault

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BaseVault.sol";

contract MyYieldVault is BaseVault {
    // Your strategy protocol
    ILendingProtocol public lendingProtocol;
    
    constructor(
        IERC20 _asset,
        ILendingProtocol _protocol
    ) BaseVault(
        _asset,
        "My Yield Vault",
        "myVAULT",
        msg.sender,        // owner
        msg.sender,        // fee recipient
        100                // 1% management fee
    ) {
        lendingProtocol = _protocol;
        _asset.approve(address(_protocol), type(uint256).max);
    }
    
    // Include external protocol balance in total assets
    function totalAssets() public view override returns (uint256) {
        return super.totalAssets() + lendingProtocol.balanceOf(address(this));
    }
    
    // Deploy assets after deposit
    function _afterDeposit(uint256 assets) internal override {
        lendingProtocol.supply(assets);
    }
    
    // Retrieve assets before withdrawal
    function _beforeWithdraw(uint256 assets) internal override {
        lendingProtocol.withdraw(assets);
    }
}
```

### 3. Deploy Script

```solidity
// packages/foundry/script/Deploy.s.sol
import "../contracts/MyYieldVault.sol";

contract DeployScript is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        // Get asset address (e.g., USDC on Base)
        address usdc = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
        
        MyYieldVault vault = new MyYieldVault(
            IERC20(usdc),
            ILendingProtocol(lendingProtocolAddress)
        );
        console.log("Vault deployed to:", address(vault));
    }
}
```

### 4. Add UI (on Home Page)

```tsx
// packages/nextjs/app/page.tsx
import VaultUI from "~~/components/VaultUI";

export default function Home() {
  return (
    <VaultUI
      vaultName="MyYieldVault"
      assetSymbol="USDC"
      assetDecimals={6}
    />
  );
}
```

### 5. Deploy & Run

```bash
yarn deploy
yarn start
```

## Configuration Options

### Constructor Parameters

| Parameter | Description |
|-----------|-------------|
| `_asset` | The underlying ERC-20 token |
| `_name` | Vault token name |
| `_symbol` | Vault token symbol |
| `_owner` | Admin address |
| `_feeRecipient` | Address receiving fees |
| `_managementFeeBps` | Annual fee in basis points (100 = 1%) |

### Admin Functions

| Function | Description |
|----------|-------------|
| `setDepositLimit(uint256)` | Max total assets |
| `setMinDeposit(uint256)` | Minimum deposit amount |
| `setManagementFee(uint256)` | Update fee (max 10%) |
| `setFeeRecipient(address)` | Update fee recipient |
| `pause()` / `unpause()` | Emergency controls |
| `collectFees()` | Trigger fee collection |
| `rescueTokens(token, amount)` | Rescue stuck tokens |

## Example Integrations

### Aave V3 Vault

```solidity
function _afterDeposit(uint256 assets) internal override {
    IAavePool(AAVE_POOL).supply(asset(), assets, address(this), 0);
}

function _beforeWithdraw(uint256 assets) internal override {
    IAavePool(AAVE_POOL).withdraw(asset(), assets, address(this));
}

function totalAssets() public view override returns (uint256) {
    return IAToken(aToken).balanceOf(address(this));
}
```

### Compound V3 Vault

```solidity
function _afterDeposit(uint256 assets) internal override {
    IComet(COMET).supply(asset(), assets);
}

function _beforeWithdraw(uint256 assets) internal override {
    IComet(COMET).withdraw(asset(), assets);
}

function totalAssets() public view override returns (uint256) {
    return IComet(COMET).balanceOf(address(this));
}
```

## Security Considerations

### Inflation Attack Protection

The vault uses a decimal offset of 3, effectively adding 1000 "virtual" shares. This prevents the classic inflation attack where the first depositor manipulates the share price.

### Reentrancy Protection

All deposit/withdraw functions are protected with `nonReentrant`. However, if your strategy interacts with untrusted contracts, consider additional protection.

### Donation Attack Protection

The vault tracks `_totalManagedAssets` separately from actual balance. Override `totalAssets()` carefully to prevent manipulation via direct token transfers.

## Testing

```solidity
// packages/foundry/test/MyVault.t.sol
import "forge-std/Test.sol";
import "../contracts/MyYieldVault.sol";

contract VaultTest is Test {
    MyYieldVault vault;
    IERC20 asset;
    
    function setUp() public {
        // Deploy mock asset and vault
    }
    
    function testDeposit() public {
        uint256 depositAmount = 1000e6; // 1000 USDC
        asset.approve(address(vault), depositAmount);
        
        uint256 shares = vault.deposit(depositAmount, address(this));
        
        assertGt(shares, 0);
        assertEq(vault.balanceOf(address(this)), shares);
    }
    
    function testWithdraw() public {
        // First deposit
        uint256 depositAmount = 1000e6;
        asset.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, address(this));
        
        // Then withdraw
        uint256 shares = vault.balanceOf(address(this));
        uint256 assets = vault.redeem(shares, address(this), address(this));
        
        assertEq(vault.balanceOf(address(this)), 0);
    }
}
```

## Resources

- [EIP-4626 Specification](https://eips.ethereum.org/EIPS/eip-4626)
- [OpenZeppelin ERC4626](https://docs.openzeppelin.com/contracts/4.x/erc4626)
- [eth-mcp YIELD_VAULT_GUIDE.md](../../docs/YIELD_VAULT_GUIDE.md)
