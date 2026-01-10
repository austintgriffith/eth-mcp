# Web3 Development Guide for AI Agents

This guide helps AI agents understand what makes Web3 development fundamentally different from traditional software engineering. Read this before building Ethereum applications.

---

## The Mental Model Shift

### Traditional Software: "Trust the Server"
In Web2, you build applications where:
- A central server controls state
- Users trust your infrastructure
- You can fix bugs by redeploying
- Data is private by default
- Users have accounts you control

### Web3 Software: "Trust the Code"
In Ethereum, you build applications where:
- **Code IS law** - once deployed, smart contracts are immutable
- **State is public** - everyone can see everything on-chain
- **Users own their identity** - wallets, not accounts
- **Bugs are permanent** - you cannot patch deployed contracts
- **Incentives drive behavior** - users act in their economic self-interest

---

## Thinking in Incentives

**This is the most important concept in Web3 development.**

Every smart contract creates a game. Users will optimize for their benefit, not your intended use case.

### The Incentive Design Framework

When designing any on-chain mechanism, ask:

1. **Who are the actors?**
   - Users, validators, arbitrageurs, protocols, bots
   - What does each actor want?

2. **What can each actor do?**
   - Every public/external function is an action
   - Ordering of transactions matters (MEV)
   - Anyone can call your contract, not just your frontend

3. **What happens at the extremes?**
   - Zero liquidity? Maximum volume?
   - One user? Million users?
   - Price goes 1000x? Price goes to zero?

4. **Where's the money flow?**
   - Who pays? Who receives?
   - Can someone extract value unexpectedly?
   - Are fees sustainable?

### Example: Tax Token Incentives

Consider a 1% tax token:

**Intended behavior:**
- User swaps token, 1% goes to treasury
- Protocol accumulates sustainable revenue

**Adversarial scenarios to consider:**
- **Sandwich attacks**: MEV bot frontruns large swaps
- **Tax avoidance**: Users transfer via intermediary contracts
- **Liquidity extraction**: Whale dumps entire position
- **Flash loan attacks**: Manipulate reserves in single transaction

**Design mitigations:**
- Minimum swap delay between transactions
- Tax on all transfers, not just swaps
- Max transaction percentage limits
- Oracle-based price validation

---

## The Scaffold-ETH Architecture

Scaffold-ETH 2 uses a specific stack optimized for rapid prototyping:

```
┌─────────────────────────────────────────────────────────────┐
│                    packages/nextjs                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Next.js 14 App Router + wagmi + viem + RainbowKit   │  │
│  │  - Wallet connection handled automatically           │  │
│  │  - Contract hooks auto-generated from ABIs          │  │
│  │  - Hot reload on contract changes                    │  │
│  └──────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                   packages/foundry                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Foundry (Forge) - Fast Solidity development        │  │
│  │  - Deploy scripts in Solidity                       │  │
│  │  - Unit tests with forge test                       │  │
│  │  - Local fork with anvil                            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Key Directories

```
scaffold-eth-2/
├── packages/
│   ├── foundry/
│   │   ├── contracts/          # Your Solidity contracts
│   │   ├── script/             # Deployment scripts
│   │   ├── test/               # Foundry tests
│   │   └── foundry.toml        # Foundry config
│   └── nextjs/
│       ├── app/                # Next.js app router pages
│       ├── components/         # React components
│       ├── contracts/          # Generated contract ABIs
│       ├── hooks/              # Custom React hooks
│       └── scaffold.config.ts  # Frontend config
```

### Critical Files to Modify

1. **New contracts**: `packages/foundry/contracts/YourContract.sol`
2. **Deploy script**: `packages/foundry/script/Deploy.s.sol`
3. **Frontend pages**: `packages/nextjs/app/yourpage/page.tsx`
4. **Contract hooks**: Auto-generated, but check `packages/nextjs/contracts/`

### Frontend Anti-Patterns (NEVER DO)

| Anti-Pattern | Why It's Wrong | Correct Approach |
|--------------|----------------|------------------|
| Hardcoding contract addresses | Breaks across environments (local vs mainnet) | Use `useDeployedContractInfo("ContractName")` |
| Raw wagmi hooks for configured contracts | Bypasses scaffold-eth's contract management | Use `useScaffoldReadContract` / `useScaffoldWriteContract` |
| Re-defining ABIs inline | Redundant, error-prone, hard to maintain | ABIs are already in deployedContracts.ts or externalContracts.ts |
| Using old hook names (`useScaffoldContractRead`) | Outdated, won't compile | Use `useScaffoldReadContract` / `useScaffoldWriteContract` |

**Both `deployedContracts.ts` AND `externalContracts.ts` work with scaffold-eth hooks.** Once a contract is in either file, always use scaffold-eth hooks.

---

## Smart Contract Patterns

### Pattern 1: Access Control

```solidity
// Simple owner pattern
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyContract is Ownable {
    function adminOnly() external onlyOwner {
        // Only owner can call
    }
}

// Role-based for complex permissions
import "@openzeppelin/contracts/access/AccessControl.sol";
```

### Pattern 2: Reentrancy Guard

```solidity
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SafeContract is ReentrancyGuard {
    function withdraw() external nonReentrant {
        // Safe from reentrancy
        (bool success,) = msg.sender.call{value: balance}("");
        require(success);
    }
}
```

### Pattern 3: Checks-Effects-Interactions

```solidity
function withdraw(uint256 amount) external {
    // 1. CHECKS - validate inputs
    require(balances[msg.sender] >= amount, "Insufficient");

    // 2. EFFECTS - update state
    balances[msg.sender] -= amount;

    // 3. INTERACTIONS - external calls last
    (bool success,) = msg.sender.call{value: amount}("");
    require(success);
}
```

### Pattern 4: Pull Over Push

```solidity
// BAD - push pattern (can fail, gas issues)
function distribute(address[] memory recipients) external {
    for (uint i = 0; i < recipients.length; i++) {
        payable(recipients[i]).transfer(amount);
    }
}

// GOOD - pull pattern (users withdraw themselves)
mapping(address => uint256) public pendingWithdrawals;

function claimReward() external {
    uint256 amount = pendingWithdrawals[msg.sender];
    pendingWithdrawals[msg.sender] = 0;
    payable(msg.sender).transfer(amount);
}
```

---

## Common Vulnerabilities to Avoid

### 1. Integer Overflow (Pre-0.8)
Solidity 0.8+ has built-in overflow checks. But watch for `unchecked` blocks.

### 2. Reentrancy
Always use ReentrancyGuard for functions that:
- Send ETH
- Call external contracts
- Transfer tokens

### 3. Access Control Mistakes
- Missing `onlyOwner` modifiers
- Public functions that should be internal
- Forgetting to check msg.sender

### 4. Oracle Manipulation
- Never use spot price from DEX as oracle
- Use time-weighted average prices (TWAP)
- Consider Chainlink for critical pricing

### 5. Front-running / MEV
- Users can see pending transactions
- Bots will sandwich profitable swaps
- Use commit-reveal for sensitive operations

---

## Web3 Integration Gotchas

Critical pitfalls when building DeFi frontends.

### 1. ERC20 Approve Before Transfer

Any contract using `transferFrom()` requires prior approval. This includes vaults, staking, DEXs - anything that pulls tokens from users.

```
User → token.approve(vault, amount)
User → vault.deposit(amount) → vault calls transferFrom ✓
```

**Frontend:** Check allowance, show "Approve" button if needed, then "Deposit".

### 2. NEVER Use Infinite Approvals

```tsx
// ❌ BAD - If vault is exploited, attacker drains ALL user's tokens
approve(vaultAddress, maxUint256)

// ✅ GOOD - Only approve what's needed
approve(vaultAddress, depositAmount)
```

If the contract is compromised, attackers can only take what was approved. One extra click beats losing everything.

### 3. Token Decimals Vary

| Token | Decimals | 1.00 = |
|-------|----------|--------|
| ETH, WETH, DAI | 18 | 1e18 |
| USDC, USDT | 6 | 1e6 |
| WBTC | 8 | 1e8 |

Always use `parseUnits(amount, decimals)` and `formatUnits(value, decimals)`.

### 4. Nothing Is Automatic

The blockchain doesn't push - you must poke it:
- Yield doesn't auto-compound → someone calls `harvest()`
- Rewards don't auto-claim → user calls `claim()`
- Time-locks don't auto-release → user calls `withdraw()`

**The Decentralization Pattern:** Make functions callable by ANYONE with a reward. MEV bots and keepers compete to call it 24/7. No admin, runs forever.

---

## Gas Optimization Basics

1. **Storage is expensive** - 20,000 gas to write, 2,100 to read
2. **Memory is cheap** - use for temporary data
3. **Calldata is cheapest** - use for function inputs
4. **Pack structs** - group smaller types together
5. **Cache storage reads** - read once, use memory variable

```solidity
// BAD - multiple storage reads
function bad() external {
    require(balances[msg.sender] > 0);
    require(balances[msg.sender] >= amount);
    balances[msg.sender] -= amount;
}

// GOOD - cached storage read
function good(uint256 amount) external {
    uint256 balance = balances[msg.sender]; // Single read
    require(balance > 0);
    require(balance >= amount);
    balances[msg.sender] = balance - amount;
}
```

---

## Testing Checklist

Before considering a contract "done":

- [ ] Unit tests for all public functions
- [ ] Edge cases: zero values, max values, empty arrays
- [ ] Access control: unauthorized callers rejected
- [ ] Reentrancy: all external calls are safe
- [ ] Math: no overflow in unchecked blocks
- [ ] Events: all state changes emit events
- [ ] Gas: functions work within block gas limit
- [ ] Fork tests: integration with real protocols

---

## Deployment Checklist

Before deploying to mainnet:

- [ ] All tests passing
- [ ] Code audited (or at least self-reviewed)
- [ ] Admin keys secured (multisig recommended)
- [ ] Upgrade path planned (if needed)
- [ ] Monitoring/alerting set up
- [ ] Emergency pause mechanism (if appropriate)
- [ ] Documentation complete

---

## Debugging Tips

### Reading Failed Transactions
1. Get tx hash from error
2. Use block explorer's "Parity Trace" or "Internal Txns"
3. Look for revert reason string
4. Check event logs for partial execution

### Common Error Messages
- `"execution reverted"` - require() failed, no message
- `"out of gas"` - increase gas limit or optimize
- `"insufficient funds"` - wallet needs ETH for gas
- `"nonce too low"` - transaction already sent

### Foundry Debugging
```bash
# Run with verbosity
forge test -vvvv

# Fork mainnet for testing
forge test --fork-url $RPC_URL

# Debug specific test
forge test --match-test testName -vvvv
```

---

## Resources

### Documentation
- [Solidity Docs](https://docs.soliditylang.org/)
- [Foundry Book](https://book.getfoundry.sh/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Scaffold-ETH Docs](https://docs.scaffoldeth.io/)

### Security
- [Smart Contract Security](https://github.com/crytic/building-secure-contracts)
- [SWC Registry](https://swcregistry.io/) - Vulnerability patterns
- [Rekt News](https://rekt.news/) - Learn from hacks

### Tools
- [Tenderly](https://tenderly.co/) - Transaction debugging
- [Etherscan](https://etherscan.io/) - Block explorer
- [Dune Analytics](https://dune.com/) - On-chain data

---

## Summary for AI Agents

When building Ethereum applications:

1. **Think adversarially** - Assume users will exploit any weakness
2. **Design incentives first** - The economics must be sound
3. **Test exhaustively** - Bugs are permanent
4. **Start simple** - Add complexity only when needed
5. **Fork for testing** - Test against real protocol state
6. **Monitor after deploy** - Watch for unexpected behavior

The goal is not just working code, but **economically sound systems** that remain secure under adversarial conditions.
