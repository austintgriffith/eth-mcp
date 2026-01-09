# DeFi Building Blocks

Reference guide for common DeFi primitives and how they compose together.

---

## Core Primitives

### 1. Tokens

| Standard | Use Case | Key Feature |
|----------|----------|-------------|
| ERC-20 | Fungible tokens | Divisible, interchangeable |
| ERC-721 | NFTs | Unique, indivisible |
| ERC-1155 | Multi-token | Batch operations, fungible + NFT |
| ERC-4626 | Yield vaults | Standardized vault interface |

### 2. DEXs (Decentralized Exchanges)

**Constant Product AMM (Uniswap v2 style)**
- Formula: `x * y = k`
- Simple, battle-tested
- Capital inefficient

**Concentrated Liquidity (Uniswap v3/v4)**
- LPs provide liquidity in price ranges
- Much higher capital efficiency
- More complex to manage

**Order Book (on L2s)**
- Traditional matching
- Better for stable pairs
- Requires faster chains

### 3. Lending

**Over-collateralized (Aave, Compound)**
- Deposit collateral, borrow less
- Liquidation if health factor drops
- Interest rates based on utilization

**Flash Loans**
- Borrow without collateral
- Must repay in same transaction
- Used for arbitrage, liquidations

### 4. Oracles

**Chainlink**
- Off-chain data on-chain
- Decentralized network of nodes
- Most trusted for price feeds

**TWAP (Time-Weighted Average Price)**
- On-chain oracle from DEX
- Resistant to manipulation
- Lags behind spot price

---

## Composability Patterns

### Pattern: Yield Aggregation

```
User → Vault → Strategy → Protocol A
                      ↘ Protocol B
                      ↘ Protocol C

1. User deposits into vault
2. Vault allocates to strategies
3. Strategies farm yields across protocols
4. Profits auto-compound
```

### Pattern: Leveraged Yield

```
User deposits $100 ETH
  ↓
Deposit ETH as collateral (Aave)
  ↓
Borrow $70 stablecoin
  ↓
Swap to ETH (Uniswap)
  ↓
Deposit again as collateral
  ↓
Repeat (loop)

Result: ~2-3x leverage on ETH yield
```

### Pattern: Arbitrage

```
DEX A: ETH = $2000
DEX B: ETH = $2010

Flash loan $1M
  ↓
Buy ETH on DEX A
  ↓
Sell ETH on DEX B
  ↓
Repay flash loan + fee
  ↓
Profit: ~$5000 minus gas
```

### Pattern: Liquidation

```
User has unhealthy position:
- Collateral: $1000 ETH
- Debt: $800 USDC
- Health: < 1 (underwater)

Liquidator:
1. Flash loan $400 USDC
2. Repay part of user's debt
3. Receive $440 collateral (10% bonus)
4. Sell collateral for USDC
5. Repay flash loan
6. Profit: ~$40
```

---

## Token Economics (Tokenomics)

### Supply Mechanics

**Fixed Supply**
- Total supply capped (e.g., Bitcoin)
- Deflationary if tokens burned
- Simple, predictable

**Elastic Supply**
- Supply adjusts to target price
- Rebasing affects all holders
- Complex, can be confusing

**Emission Schedule**
- New tokens minted over time
- Usually decreasing rate
- Incentivizes early participation

### Value Capture

**Transaction Fees**
- Protocol takes cut of activity
- Sustainable if volume exists
- Examples: Uniswap, Opensea

**Staking/Governance**
- Lock tokens for rewards/voting
- Reduces circulating supply
- Examples: Curve, Aave

**Buyback & Burn**
- Protocol buys tokens with revenue
- Burns them (removes from supply)
- Examples: BNB, MKR

---

## Risk Framework

### Smart Contract Risk
- **Audits**: Reduce but don't eliminate bugs
- **Time**: Battle-tested code is safer
- **Upgradability**: Can fix bugs but adds trust

### Economic Risk
- **Liquidity**: Can you exit your position?
- **Impermanent Loss**: AMM LP risk
- **Liquidation**: Leveraged position risk

### Oracle Risk
- **Manipulation**: Can price be moved?
- **Downtime**: What if oracle fails?
- **Centralization**: Single point of failure?

### Governance Risk
- **Malicious proposals**: 51% attacks
- **Voter apathy**: Low participation
- **Time delays**: Emergency response time

---

## Integration Checklist

When integrating with external protocols:

1. **Read the docs** - Understand the interface
2. **Check audits** - Review security reports
3. **Test on fork** - Use mainnet state
4. **Handle failures** - External calls can fail
5. **Monitor TVL** - Large TVL = more security
6. **Check governance** - Who controls the protocol?

### Common Integration Points

**Uniswap V3**
```solidity
// Get quote
IQuoterV2.quoteExactInputSingle(params);

// Execute swap
ISwapRouter.exactInputSingle(params);
```

**Aave V3**
```solidity
// Supply
IPool.supply(asset, amount, onBehalfOf, referralCode);

// Borrow
IPool.borrow(asset, amount, interestRateMode, referralCode, onBehalfOf);

// Repay
IPool.repay(asset, amount, interestRateMode, onBehalfOf);
```

**Chainlink**
```solidity
// Get latest price
(, int256 price,,,) = AggregatorV3Interface.latestRoundData();
```

---

## MEV Considerations

### What is MEV?
Maximal Extractable Value - profit validators/searchers can make by:
- Reordering transactions
- Inserting transactions
- Censoring transactions

### Common MEV Attacks

**Sandwich Attack**
```
1. User submits swap (large)
2. Attacker frontruns: buys token
3. User swap executes at worse price
4. Attacker backruns: sells token
5. Attacker profits from price impact
```

**JIT (Just-In-Time) Liquidity**
```
1. Large swap pending
2. LP adds concentrated liquidity
3. Swap executes through new liquidity
4. LP removes liquidity
5. LP captures fees with minimal exposure
```

### MEV Protection

- **Private mempools**: Flashbots Protect
- **Batch auctions**: CoW Protocol
- **Time delays**: Commit-reveal schemes
- **Slippage limits**: Reject if price moved

---

## Gas Optimization for DeFi

### Batch Operations
- Multicall for multiple reads
- Batch swaps instead of sequential

### Approval Patterns
- Use `permit` when available
- Approve max to save future gas
- Consider permit2 for better UX

### Storage vs Memory
- Cache repeated storage reads
- Use calldata for input arrays
- Pack structs to save slots

---

## Protocol Categories

### Money Markets
- Aave, Compound, Morpho
- Deposit, borrow, earn interest

### DEXs
- Uniswap, Curve, Balancer
- Swap tokens, provide liquidity

### Derivatives
- GMX, dYdX, Synthetix
- Perpetuals, options, synthetic assets

### Yield
- Yearn, Convex, Beefy
- Auto-compound, optimize yields

### Liquid Staking
- Lido, Rocket Pool, Frax
- Stake ETH, get liquid token

### Bridges
- Stargate, Hop, Across
- Move assets cross-chain

---

## Quick Reference: Key Addresses (Mainnet)

```
// Tokens
WETH:  0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
USDC:  0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
USDT:  0xdAC17F958D2ee523a2206206994597C13D831ec7
DAI:   0x6B175474E89094C44Da98b954EesedB6ef1D7C
WBTC:  0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599

// Uniswap V3
Router:  0xE592427A0AEce92De3Edee1F18E0157C05861564
Factory: 0x1F98431c8aD98523631AE4a59f267346ea31F984
Quoter:  0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6

// Aave V3
Pool:           0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2
PoolDataProvider: 0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3

// Chainlink
ETH/USD: 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419
BTC/USD: 0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c
```
