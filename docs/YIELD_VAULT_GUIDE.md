# Yield Vault Building Guide

Comprehensive guide to building ERC-4626 tokenized vaults for yield generation.

---

## Table of Contents

1. [ERC-4626 Standard Deep Dive](#erc-4626-standard-deep-dive)
2. [Vault Strategy Patterns](#vault-strategy-patterns)
3. [Yield Source Integration](#yield-source-integration)
4. [Security Considerations](#security-considerations)
5. [Implementation Examples](#implementation-examples)

---

## ERC-4626 Standard Deep Dive

ERC-4626 is the "Tokenized Vault Standard" - a standardized interface for yield-bearing vaults.

### Core Concept

```
User deposits 100 USDC → Vault issues 100 shares
Vault generates 10% yield
User redeems 100 shares → Gets 110 USDC
```

### Interface Overview

```solidity
interface IERC4626 is IERC20 {
    // Underlying asset
    function asset() external view returns (address);
    
    // Total assets held/managed by vault
    function totalAssets() external view returns (uint256);
    
    // Conversion functions
    function convertToShares(uint256 assets) external view returns (uint256);
    function convertToAssets(uint256 shares) external view returns (uint256);
    
    // Max deposit/mint/withdraw/redeem
    function maxDeposit(address) external view returns (uint256);
    function maxMint(address) external view returns (uint256);
    function maxWithdraw(address) external view returns (uint256);
    function maxRedeem(address) external view returns (uint256);
    
    // Preview functions (quote without executing)
    function previewDeposit(uint256 assets) external view returns (uint256);
    function previewMint(uint256 shares) external view returns (uint256);
    function previewWithdraw(uint256 assets) external view returns (uint256);
    function previewRedeem(uint256 shares) external view returns (uint256);
    
    // Core operations
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
    function mint(uint256 shares, address receiver) external returns (uint256 assets);
    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares);
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets);
}
```

### Deposit vs Mint

```solidity
// deposit: "I have 100 USDC, give me shares"
deposit(100 USDC) → returns shares you receive

// mint: "I want 100 shares, tell me the cost"
mint(100 shares) → returns USDC needed
```

### Withdraw vs Redeem

```solidity
// withdraw: "I want 100 USDC out"
withdraw(100 USDC) → returns shares burned

// redeem: "I want to burn 100 shares"
redeem(100 shares) → returns USDC received
```

### Share Accounting

```solidity
// Basic share price calculation
sharePrice = totalAssets() / totalSupply()

// Convert assets to shares
shares = assets * totalSupply() / totalAssets()

// Convert shares to assets
assets = shares * totalAssets() / totalSupply()
```

### Rounding Rules

**Critical**: Always round in favor of the vault (against the user) to prevent value extraction.

```solidity
// Deposits: round DOWN shares (user gets fewer shares)
function convertToShares(uint256 assets) public view returns (uint256) {
    uint256 supply = totalSupply();
    return supply == 0 ? assets : assets.mulDiv(supply, totalAssets(), Math.Rounding.Floor);
}

// Withdrawals: round DOWN assets (user gets fewer assets)
function convertToAssets(uint256 shares) public view returns (uint256) {
    uint256 supply = totalSupply();
    return supply == 0 ? shares : shares.mulDiv(totalAssets(), supply, Math.Rounding.Floor);
}
```

---

## Vault Strategy Patterns

### Pattern 1: Single-Asset Lending Vault

The simplest vault pattern - deposit to a single lending protocol.

```
User → Vault → Aave/Compound/Morpho → Yield
```

**Pros**: Simple, lower risk, easy to audit
**Cons**: Limited yield optimization

```solidity
contract LendingVault is ERC4626 {
    ILendingPool public lendingPool;
    IERC20 public aToken; // Receipt token
    
    function totalAssets() public view override returns (uint256) {
        return aToken.balanceOf(address(this));
    }
    
    function _deposit(address, address, uint256 assets, uint256) internal override {
        IERC20(asset()).approve(address(lendingPool), assets);
        lendingPool.supply(asset(), assets, address(this), 0);
    }
    
    function _withdraw(address, address receiver, address, uint256 assets, uint256) internal override {
        lendingPool.withdraw(asset(), assets, receiver);
    }
}
```

### Pattern 2: LP Vault (Liquidity Provider)

Deposit to DEX liquidity pools, earn trading fees.

```
User → Vault → Uniswap/Curve LP → Trading Fees
```

**Pros**: Can earn higher yields during high volume
**Cons**: Impermanent loss risk

**Key Considerations**:
- Track LP token value (not just quantity)
- Handle impermanent loss in accounting
- Consider auto-compounding fees

### Pattern 3: Multi-Strategy Vault (Yearn-style)

Allocate to multiple strategies based on performance.

```
User → Vault → Strategy A (40%)
             → Strategy B (35%)
             → Strategy C (25%)
```

**Pros**: Risk diversification, yield optimization
**Cons**: Higher complexity, more gas

```solidity
contract MultiStrategyVault is ERC4626 {
    struct Strategy {
        address target;
        uint256 allocation; // basis points (100 = 1%)
        bool active;
    }
    
    Strategy[] public strategies;
    
    function totalAssets() public view override returns (uint256) {
        uint256 total = IERC20(asset()).balanceOf(address(this));
        for (uint i = 0; i < strategies.length; i++) {
            if (strategies[i].active) {
                total += IStrategy(strategies[i].target).balanceOf(address(this));
            }
        }
        return total;
    }
    
    function rebalance() external onlyKeeper {
        // Withdraw from underperforming strategies
        // Deposit to better performing strategies
    }
}
```

### Pattern 4: Leveraged Yield

Use lending to lever up yield exposure.

```
Deposit 100 ETH
  → Supply to Aave (earn 2%)
  → Borrow stablecoins (pay 3%)
  → Supply stablecoins elsewhere (earn 6%)
  → Net: 100 ETH earning boosted yield
```

**Pros**: Higher yields
**Cons**: Liquidation risk, complexity

### Pattern 5: Delta-Neutral Vault

Hedge directional exposure while earning yield.

```
Deposit 100 ETH
  → Long ETH in yield position
  → Short ETH via perps
  → Net: Market-neutral, earn funding/yield
```

**Pros**: Reduced directional risk
**Cons**: Very complex, funding rate risk

---

## Yield Source Integration

### Aave V3 Integration

```solidity
// addresses_getProtocol({ chain: "base", protocol: "aaveV3" })

interface IAavePool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
    function getReserveData(address asset) external view returns (ReserveData memory);
}

contract AaveVault is ERC4626 {
    IAavePool public constant POOL = IAavePool(0xA238Dd80C259a72e81d7e4664a9801593F98d1c5); // Base
    
    function _afterDeposit(uint256 assets) internal {
        IERC20(asset()).approve(address(POOL), assets);
        POOL.supply(asset(), assets, address(this), 0);
    }
    
    function _beforeWithdraw(uint256 assets) internal {
        POOL.withdraw(asset(), assets, address(this));
    }
}
```

### Compound V3 Integration

```solidity
interface IComet {
    function supply(address asset, uint256 amount) external;
    function withdraw(address asset, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
}

contract CompoundVault is ERC4626 {
    IComet public comet;
    
    function totalAssets() public view override returns (uint256) {
        return comet.balanceOf(address(this));
    }
}
```

### Morpho Blue Integration

```solidity
interface IMorpho {
    function supply(
        MarketParams memory marketParams,
        uint256 assets,
        uint256 shares,
        address onBehalf,
        bytes memory data
    ) external returns (uint256, uint256);
    
    function withdraw(
        MarketParams memory marketParams,
        uint256 assets,
        uint256 shares,
        address onBehalf,
        address receiver
    ) external returns (uint256, uint256);
}
```

### Moonwell Integration (Base)

```solidity
// Moonwell Flagship vaults are already ERC-4626!
// You can deposit directly or wrap with additional logic

// addresses_getProtocol({ chain: "base", protocol: "moonwell" })
// flagshipUSDC: 0xc1256Ae5FF1cf2719D4937adb3bbCCab2E00A2Ca
// flagshipETH: 0xa0E430870c4604CcfC7B38Ca7845B1FF653D0ff1

contract MoonwellWrapper is ERC4626 {
    IERC4626 public moonwellVault;
    
    // Wrap Moonwell vault with additional features:
    // - Access control
    // - Fee collection
    // - Strategy switching
}
```

### Pendle Integration (Yield Tokenization)

Pendle splits yield-bearing tokens into Principal (PT) and Yield (YT).

```solidity
// Buy PT at discount, hold to maturity for fixed yield
// Buy YT for leveraged yield exposure

interface IPendleRouter {
    function swapExactTokenForPt(
        address receiver,
        address market,
        uint256 minPtOut,
        ApproxParams calldata guessPtOut,
        TokenInput calldata input,
        LimitOrderData calldata limit
    ) external returns (uint256 netPtOut, uint256 netSyFee, uint256 netSyInterm);
}
```

---

## Security Considerations

### 1. Inflation Attack

**The Problem**: First depositor can manipulate share price.

```
1. Attacker deposits 1 wei, gets 1 share
2. Attacker donates 1000 USDC to vault
3. sharePrice = 1001 USDC / 1 share
4. Victim deposits 1000 USDC, gets 0 shares (rounded down)
5. Attacker redeems, gets 2001 USDC
```

**Mitigations**:

```solidity
// Option 1: Virtual shares/assets (OpenZeppelin default)
function _decimalsOffset() internal pure override returns (uint8) {
    return 3; // Add 1000 virtual shares
}

// Option 2: Mint dead shares on deployment
constructor() {
    _mint(address(0xdead), 1000);
}

// Option 3: Minimum deposit
function deposit(uint256 assets, address receiver) public override returns (uint256) {
    require(assets >= MINIMUM_DEPOSIT, "Below minimum");
    return super.deposit(assets, receiver);
}
```

### 2. Reentrancy

Always use ReentrancyGuard for external calls.

```solidity
contract SecureVault is ERC4626, ReentrancyGuard {
    function deposit(uint256 assets, address receiver) 
        public 
        override 
        nonReentrant 
        returns (uint256) 
    {
        return super.deposit(assets, receiver);
    }
}
```

### 3. Price Oracle Manipulation

Don't use spot DEX prices for critical calculations.

```solidity
// BAD - Easily manipulated
function getPrice() public view returns (uint256) {
    return spotPrice; // Can be flash-loan manipulated
}

// GOOD - Use TWAP or Chainlink
function getPrice() public view returns (uint256) {
    (, int256 price,,,) = chainlinkFeed.latestRoundData();
    return uint256(price);
}
```

### 4. Share Price Manipulation via Donations

**The Problem**: Direct token transfers can manipulate `totalAssets()`.

```solidity
// If someone sends tokens directly to vault:
totalAssets() increases
sharePrice increases
New depositors get fewer shares
```

**Mitigation**: Track deposited assets separately.

```solidity
uint256 private _totalManagedAssets;

function totalAssets() public view override returns (uint256) {
    return _totalManagedAssets; // Not balanceOf
}

function _deposit(...) internal override {
    _totalManagedAssets += assets;
    // ...
}
```

### 5. Slippage Protection

Always include slippage checks on deposits/withdrawals.

```solidity
function depositWithSlippage(
    uint256 assets, 
    address receiver,
    uint256 minShares
) external returns (uint256 shares) {
    shares = deposit(assets, receiver);
    require(shares >= minShares, "Slippage exceeded");
}
```

---

## Implementation Examples

### Minimal Aave Vault

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IAavePool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}

interface IAToken {
    function balanceOf(address account) external view returns (uint256);
}

contract AaveYieldVault is ERC4626, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    IAavePool public immutable aavePool;
    IAToken public immutable aToken;
    
    constructor(
        IERC20 _asset,
        IAavePool _aavePool,
        IAToken _aToken,
        string memory _name,
        string memory _symbol
    ) ERC4626(_asset) ERC20(_name, _symbol) {
        aavePool = _aavePool;
        aToken = _aToken;
        
        // Approve Aave pool to spend our assets
        _asset.approve(address(_aavePool), type(uint256).max);
    }
    
    /// @notice Total assets = aToken balance (includes accrued interest)
    function totalAssets() public view override returns (uint256) {
        return aToken.balanceOf(address(this));
    }
    
    /// @notice Deposit assets and supply to Aave
    function _deposit(
        address caller,
        address receiver,
        uint256 assets,
        uint256 shares
    ) internal override nonReentrant {
        // Transfer assets from caller
        super._deposit(caller, receiver, assets, shares);
        
        // Supply to Aave
        aavePool.supply(asset(), assets, address(this), 0);
    }
    
    /// @notice Withdraw from Aave and send to receiver
    function _withdraw(
        address caller,
        address receiver,
        address owner,
        uint256 assets,
        uint256 shares
    ) internal override nonReentrant {
        // Withdraw from Aave
        aavePool.withdraw(asset(), assets, address(this));
        
        // Transfer to receiver
        super._withdraw(caller, receiver, owner, assets, shares);
    }
    
    /// @dev Add decimal offset to prevent inflation attacks
    function _decimalsOffset() internal pure override returns (uint8) {
        return 3;
    }
}
```

### Using eth-mcp to Build

```
1. Research yields:
   defi_compareYields({ asset: "USDC", chain: "base" })
   
2. Get protocol addresses:
   addresses_getProtocol({ chain: "base", protocol: "aaveV3" })
   
3. Scaffold project:
   stack_init({ template: "scaffold-eth", chain: "base", workspacePath: "/tmp/my-vault" })
   stack_install()
   
4. Write vault contract:
   project_writeFile({ path: "packages/foundry/contracts/MyVault.sol", content: "..." })
   
5. Deploy and test:
   stack_start({ components: ["fork", "deploy", "frontend"] })
```

---

## Yield Research Workflow

### Finding Best Yields

```bash
# 1. Get yields for your target chain
defi_getYields({ chain: "base", minTvl: 1000000 })

# 2. Compare for your specific asset
defi_compareYields({ asset: "USDC", chain: "base" })

# 3. Check protocol TVL/safety
defi_getProtocolTVL({ protocol: "aave" })

# 4. Get integration addresses
addresses_getProtocol({ chain: "base", protocol: "aaveV3" })
```

### Yield vs Risk Assessment

| APY Range | Risk Level | Due Diligence Required |
|-----------|------------|------------------------|
| 1-5% | Low | Basic audit check |
| 5-10% | Medium | Deep audit review, TVL check |
| 10-20% | High | Understand exact yield source |
| 20%+ | Very High | Expert review required |

### Red Flags

- APY comes from token emissions only (not sustainable)
- TVL < $1M with high APY
- No audits
- Complex tokenomics you don't understand
- Yield source is unclear

---

## Resources

- [EIP-4626 Specification](https://eips.ethereum.org/EIPS/eip-4626)
- [OpenZeppelin ERC4626](https://docs.openzeppelin.com/contracts/4.x/erc4626)
- [DefiLlama Yields](https://defillama.com/yields)
- [Yearn V3 Architecture](https://docs.yearn.fi/developers/v3/overview)
