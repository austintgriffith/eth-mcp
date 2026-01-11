/**
 * Web3 Education Knowledge Base
 *
 * A structured collection of lessons covering common Web3 gotchas,
 * designed to surface teaching moments during development.
 */

export interface Lesson {
  id: string;
  category: Category;
  question: string; // What to ask the developer
  short: string; // One-line warning
  explanation: string; // Deep "why" explanation
  wrongExample?: string; // Code that's wrong
  rightExample?: string; // Code that's right
  severity: "critical" | "high" | "medium";
  keywords: string[]; // For suggestion matching
  relatedDocs?: string[]; // Links to docs
}

export type Category = "tokens" | "math" | "automation" | "security" | "vaults" | "defi" | "scaffold-eth" | "uniswap-v4";

export const CATEGORY_INFO: Record<Category, { name: string; description: string }> = {
  tokens: {
    name: "Token Handling",
    description: "Decimals, approvals, transfers, and token standards",
  },
  math: {
    name: "Math in Solidity",
    description: "Percentages, rounding, precision, and fixed-point arithmetic",
  },
  automation: {
    name: "Automation & Incentives",
    description: "Triggers, keepers, and why someone would call your functions",
  },
  security: {
    name: "Security Patterns",
    description: "Reentrancy, access control, oracles, and common vulnerabilities",
  },
  vaults: {
    name: "Vault Design",
    description: "ERC-4626, share accounting, inflation attacks, and yield",
  },
  defi: {
    name: "DeFi Integration",
    description: "MEV, slippage, liquidity, and protocol composability",
  },
  "scaffold-eth": {
    name: "Scaffold-ETH Workflow",
    description: "Debug UI, external contracts, and SE2 development patterns",
  },
  "uniswap-v4": {
    name: "Uniswap V4 Integration",
    description: "V4 swap patterns, unlock callbacks, settle() gotchas, and currency ordering",
  },
};

export const LESSONS: Lesson[] = [
  // ============================================
  // TOKENS
  // ============================================
  {
    id: "decimals-vary",
    category: "tokens",
    question: "What decimals does your token use? Have you verified it's not assumed to be 18?",
    short: "USDC has 6 decimals, not 18. 1 USDC = 1_000_000, not 1e18.",
    explanation: `Different tokens use different decimal places. Most ERC-20s use 18 (like ETH), but major stablecoins differ:

- USDC: 6 decimals
- USDT: 6 decimals  
- DAI: 18 decimals
- WBTC: 8 decimals

Assuming 18 decimals when working with USDC means you're off by 10^12 - a catastrophic bug. Always call token.decimals() and scale amounts appropriately.

This is one of the most common bugs in DeFi - entire protocols have been drained because of decimal assumptions.`,
    wrongExample: `// WRONG: Assuming 18 decimals for USDC
uint256 usdcAmount = 100 * 10**18; // This is 100 TRILLION USDC!

function deposit(uint256 amount) external {
    // If amount is in 18 decimals but USDC uses 6...
    usdc.transferFrom(msg.sender, address(this), amount);
}`,
    rightExample: `// RIGHT: Check decimals dynamically
uint256 decimals = IERC20Metadata(usdc).decimals();
uint256 usdcAmount = 100 * 10**decimals; // Correct: 100 USDC

// Or use a constant if you KNOW the token
uint256 constant USDC_DECIMALS = 6;
uint256 usdcAmount = 100 * 10**USDC_DECIMALS;`,
    severity: "critical",
    keywords: ["usdc", "usdt", "token", "decimal", "stablecoin", "erc20", "transfer"],
    relatedDocs: ["docs/SOLIDITY_PATTERNS.md"],
  },
  {
    id: "eth-wei",
    category: "tokens",
    question: "Are you handling ETH amounts in wei? Remember 1 ETH = 10^18 wei.",
    short: "ETH is measured in wei. 1 ETH = 1e18 wei. Use '1 ether' syntax.",
    explanation: `ETH and all native currency amounts in Solidity are in wei, the smallest unit:

- 1 ETH = 1,000,000,000,000,000,000 wei (10^18)
- msg.value is always in wei
- address.balance is always in wei

Solidity provides handy suffixes: 1 ether, 1 gwei, 1 wei

Common mistake: thinking msg.value of 1 means 1 ETH when it's actually 1 wei (essentially zero).`,
    wrongExample: `// WRONG: Thinking 1 means 1 ETH
function deposit() external payable {
    require(msg.value >= 1, "Min 1 ETH"); // Actually min 1 wei!
}

// WRONG: Manual calculation errors
uint256 oneEth = 1000000000000000000; // Easy to miscount zeros`,
    rightExample: `// RIGHT: Use ether suffix
function deposit() external payable {
    require(msg.value >= 1 ether, "Min 1 ETH");
}

// RIGHT: Clear and readable
uint256 minDeposit = 0.1 ether;
uint256 fee = 0.001 ether;`,
    severity: "critical",
    keywords: ["eth", "ether", "wei", "gwei", "value", "native", "msg.value"],
    relatedDocs: ["docs/SOLIDITY_PATTERNS.md"],
  },
  {
    id: "approvals",
    category: "tokens",
    question: "How are you handling token approvals? Does the user need to approve before your contract can transfer?",
    short: "ERC-20 transfers require prior approval. NEVER use infinite approvals - approve exact amounts only!",
    explanation: `Before your contract can transfer tokens FROM a user, that user must approve your contract:

1. User calls token.approve(yourContract, amount)
2. Then your contract can call token.transferFrom(user, ..., amount)

**SECURITY: Always approve exact amounts, NEVER infinite!**

- Exact approval: approve(contract, exactAmount) - RECOMMENDED, limits risk
- Permit (EIP-2612): Gasless approval via signature - best UX, still use exact amounts
- Infinite approval: approve(contract, type(uint256).max) - DANGEROUS! If contract is exploited, attacker drains ALL user tokens, not just what they deposited

The extra approval transaction is worth it. One click vs losing everything.

Always check the transfer succeeded - some tokens don't revert on failure!`,
    wrongExample: `// WRONG: Assuming approval exists
function deposit(uint256 amount) external {
    // Will revert if user hasn't approved
    token.transferFrom(msg.sender, address(this), amount);
}

// WRONG: Not checking return value (some tokens return false instead of reverting)
function unsafeDeposit(uint256 amount) external {
    token.transferFrom(msg.sender, address(this), amount);
    // USDT doesn't revert - it returns false!
}`,
    rightExample: `// RIGHT: Use SafeERC20 for all transfers
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

using SafeERC20 for IERC20;

function deposit(uint256 amount) external {
    token.safeTransferFrom(msg.sender, address(this), amount);
}

// BETTER: Support permit for gasless approvals
function depositWithPermit(
    uint256 amount,
    uint256 deadline,
    uint8 v, bytes32 r, bytes32 s
) external {
    IERC20Permit(address(token)).permit(
        msg.sender, address(this), amount, deadline, v, r, s
    );
    token.safeTransferFrom(msg.sender, address(this), amount);
}`,
    severity: "critical",
    keywords: ["approve", "allowance", "transferFrom", "permit", "erc20", "infinite", "max"],
    relatedDocs: ["docs/SOLIDITY_PATTERNS.md"],
  },

  // ============================================
  // MATH
  // ============================================
  {
    id: "no-decimals",
    category: "math",
    question: "How are you calculating percentages? Remember Solidity has no floating point.",
    short: "Solidity has no floats. 5% = 500 basis points = 500/10000.",
    explanation: `You cannot write 0.05 or 5% in Solidity - there are no floating point numbers. Common approaches:

1. Basis Points (BPS): 10000 = 100%, so 5% = 500 bps
2. WAD: 1e18 = 100%, used by MakerDAO, many DeFi protocols
3. RAY: 1e27 = 100%, used by Aave for precision

The key insight: represent percentages as fractions with a known denominator.

Division truncates toward zero in Solidity, so order matters!
(a * b) / c ≠ (a / c) * b when dealing with integers.`,
    wrongExample: `// WRONG: Can't use decimals
uint256 fee = amount * 0.05; // Syntax error!
uint256 fee = amount * 5%; // Syntax error!

// WRONG: Division before multiplication loses precision
uint256 fee = amount / 100 * 5; // If amount=99, fee=0!

// BAD: Magic numbers
uint256 fee = amount * 5 / 100; // Works but unclear`,
    rightExample: `// RIGHT: Basis points (most common)
uint256 constant FEE_BPS = 500; // 5%
uint256 constant BPS_DENOMINATOR = 10000;
uint256 fee = (amount * FEE_BPS) / BPS_DENOMINATOR;

// RIGHT: WAD math (1e18 scale)
uint256 constant WAD = 1e18;
uint256 constant FEE_WAD = 0.05e18; // 5%
uint256 fee = (amount * FEE_WAD) / WAD;

// RIGHT: Named constants are self-documenting
uint256 constant ONE_PERCENT_BPS = 100;
uint256 constant PROTOCOL_FEE = 3 * ONE_PERCENT_BPS; // 3%`,
    severity: "critical",
    keywords: ["percent", "fee", "interest", "rate", "apy", "ratio", "calculate"],
    relatedDocs: ["docs/SOLIDITY_PATTERNS.md", "docs/DEFI_BUILDING_BLOCKS.md"],
  },
  {
    id: "division-order",
    category: "math",
    question: "Are you multiplying before dividing? Division truncates in Solidity.",
    short: "Always multiply before divide: (a * b) / c, not (a / c) * b.",
    explanation: `Integer division in Solidity truncates (rounds toward zero). This means:

99 / 100 = 0 (not 0.99)
1 / 2 = 0 (not 0.5)

Order of operations matters enormously:
- (a * b) / c: Multiply first, keeps precision
- (a / c) * b: Divide first, loses precision

For maximum precision, multiply ALL numerators first, then divide by ALL denominators.

When dividing, think about which direction rounding should go for safety.`,
    wrongExample: `// WRONG: Dividing first loses precision
function calculateShare(uint256 amount, uint256 totalShares, uint256 totalAssets) 
    returns (uint256) 
{
    // If amount=100, totalAssets=1000, totalShares=500
    // Wrong: 100/1000 * 500 = 0 * 500 = 0
    return (amount / totalAssets) * totalShares;
}`,
    rightExample: `// RIGHT: Multiply first
function calculateShare(uint256 amount, uint256 totalShares, uint256 totalAssets) 
    returns (uint256) 
{
    // If amount=100, totalAssets=1000, totalShares=500  
    // Right: 100 * 500 / 1000 = 50000 / 1000 = 50
    return (amount * totalShares) / totalAssets;
}

// For complex calculations, use a math library
import "@openzeppelin/contracts/utils/math/Math.sol";
uint256 result = Math.mulDiv(a, b, c); // Safe a*b/c`,
    severity: "high",
    keywords: ["divide", "multiply", "precision", "truncate", "round", "share"],
    relatedDocs: ["docs/SOLIDITY_PATTERNS.md"],
  },
  {
    id: "rounding-direction",
    category: "math",
    question: "When rounding, are you rounding in the protocol's favor?",
    short: "Always round in the protocol's favor: down for user gains, up for protocol gains.",
    explanation: `In financial contracts, rounding direction matters for security:

- When USER receives something: round DOWN (less for user)
- When USER pays something: round UP (more from user)
- When PROTOCOL receives: round UP
- When PROTOCOL pays: round DOWN

This prevents economic attacks where users exploit rounding to extract value.

OpenZeppelin's Math library provides mulDiv with rounding modes.`,
    wrongExample: `// DANGEROUS: Rounding in user's favor
function withdraw(uint256 shares) external returns (uint256 assets) {
    // If this rounds UP, users get more than their fair share
    assets = (shares * totalAssets()) / totalSupply();
    // Attacker can make many small withdrawals to extract extra value
}`,
    rightExample: `// SAFE: Round DOWN when user receives
import "@openzeppelin/contracts/utils/math/Math.sol";

function withdraw(uint256 shares) external returns (uint256 assets) {
    // Round down - user gets slightly less, protocol protected
    assets = Math.mulDiv(shares, totalAssets(), totalSupply(), Math.Rounding.Floor);
}

function deposit(uint256 assets) external returns (uint256 shares) {
    // Round down - user gets slightly fewer shares, protocol protected  
    shares = Math.mulDiv(assets, totalSupply(), totalAssets(), Math.Rounding.Floor);
}`,
    severity: "high",
    keywords: ["round", "floor", "ceil", "truncate", "vault", "share"],
    relatedDocs: ["docs/YIELD_VAULT_GUIDE.md"],
  },

  // ============================================
  // AUTOMATION & INCENTIVES
  // ============================================
  {
    id: "nothing-automatic",
    category: "automation",
    question: "Who calls this function? Smart contracts can't execute themselves.",
    short: "Smart contracts can't execute themselves. Who calls this function? Why?",
    explanation: `This is perhaps the MOST important concept for Web3 developers to understand.

Unlike servers with cron jobs, smart contracts are completely passive. They ONLY execute when someone sends a transaction. This means:

1. No scheduled tasks
2. No automatic triggers
3. No background processes

Every single state change requires an external transaction, which costs gas.

For every function, ask:
- WHO would call this?
- WHY would they pay gas to call it?
- WHAT do they get in return?

If there's no good answer, your function won't get called.

**The Decentralization Pattern:** Want a truly decentralized system that runs forever? Make the function callable by ANYONE and give them a reward for calling it. MEV bots, keepers, and arbitrageurs will compete to call it 24/7. No admin needed, no centralized server, no single point of failure - just pure incentives running the system forever.`,
    wrongExample: `// PROBLEMATIC: Who calls this? Why?
function distributeRewards() external {
    for (uint i = 0; i < stakers.length; i++) {
        uint256 reward = calculateReward(stakers[i]);
        rewardToken.transfer(stakers[i], reward);
    }
    // This costs gas... who pays? Why would they?
}

// PROBLEMATIC: "Daily" doesn't mean anything on-chain
function claimDailyReward() external {
    require(block.timestamp >= lastClaim[msg.sender] + 1 days);
    // But nothing TRIGGERS this at day boundary...
}`,
    rightExample: `// GOOD: Caller gets rewarded
function harvest() external returns (uint256 callerReward) {
    uint256 harvested = _collectYield();
    callerReward = (harvested * CALLER_FEE_BPS) / 10000; // 1% to caller
    
    _distributeToStakers(harvested - callerReward);
    rewardToken.transfer(msg.sender, callerReward);
    // Now MEV bots and keepers have incentive to call!
}

// GOOD: User has natural incentive
function claimReward() external {
    uint256 reward = pendingRewards[msg.sender];
    pendingRewards[msg.sender] = 0;
    rewardToken.transfer(msg.sender, reward);
    // User wants their money - they'll call it!
}`,
    severity: "critical",
    keywords: ["automatic", "trigger", "schedule", "daily", "cron", "keeper", "harvest", "distribute"],
    relatedDocs: ["docs/WEB3_DEVELOPMENT_GUIDE.md"],
  },
  {
    id: "incentive-design",
    category: "automation",
    question: "What incentive does the caller have? Why would they pay gas for this?",
    short: "Design incentives: caller fees, MEV opportunities, or natural user interest.",
    explanation: `Every on-chain action needs someone to pay gas. Incentive patterns:

1. **Natural User Interest**: User claims their own rewards, withdraws their funds
   - No extra incentive needed - they want their money

2. **Caller Rewards**: Give a % of harvested yield to whoever calls
   - Common: 0.1-1% of harvested amount
   - Attracts MEV bots and keeper networks

3. **Keeper Networks**: Chainlink Keepers, Gelato, OpenZeppelin Defender
   - Pay subscription, they call your functions
   - Good for critical operations

4. **MEV Opportunity**: If calling creates arbitrage opportunity
   - Liquidations, rebalancing, oracle updates
   - Searchers will compete to call

Without incentives, your "public" function is effectively dead code.`,
    wrongExample: `// NO INCENTIVE: Why would anyone call this?
function rebalancePool() external {
    // Complex rebalancing logic...
    // Costs gas, benefits the protocol, but caller gets nothing
}

// NO INCENTIVE: "Anyone can call" but no one will
function updatePrice() external {
    price = oracle.getPrice();
    // Who pays gas to update YOUR price feed?
}`,
    rightExample: `// CALLER REWARD: Incentivize the call
function rebalancePool() external returns (uint256 reward) {
    require(_needsRebalance(), "No rebalance needed");
    
    _executeRebalance();
    
    // Reward caller from protocol treasury
    reward = REBALANCE_REWARD;
    treasury.transfer(msg.sender, reward);
}

// MEV OPPORTUNITY: Profitable to call
function liquidate(address user) external returns (uint256 profit) {
    require(_isLiquidatable(user), "Not liquidatable");
    
    // Liquidator gets the liquidation bonus (e.g., 5% of collateral)
    profit = _executeLiquidation(user, msg.sender);
    // Searchers will compete to find liquidatable positions!
}`,
    severity: "critical",
    keywords: ["incentive", "reward", "caller", "keeper", "gas", "mev", "bot"],
    relatedDocs: ["docs/WEB3_DEVELOPMENT_GUIDE.md", "docs/DEFI_BUILDING_BLOCKS.md"],
  },
  {
    id: "keeper-patterns",
    category: "automation",
    question: "Do you need scheduled execution? Consider keeper networks or caller incentives.",
    short: "For scheduled tasks, use Chainlink Keepers, Gelato, or incentivized calls.",
    explanation: `If you need "scheduled" or "periodic" execution, you have options:

1. **Chainlink Automation (Keepers)**
   - Decentralized, reliable
   - Pay in LINK
   - Good for critical operations

2. **Gelato Network**
   - Flexible trigger conditions
   - Pay per execution
   - Good for complex logic

3. **OpenZeppelin Defender**
   - Managed service
   - Good for ops teams
   - Centralized but reliable

4. **Incentivized Calls**
   - Let anyone call, reward them
   - Most decentralized
   - Relies on economic incentives

For most DeFi, incentivized calls are preferred - they're permissionless and self-sustaining.`,
    wrongExample: `// WISHFUL THINKING: This doesn't work
contract BadVault {
    // "This should run every day" - but HOW?
    function dailyCompound() external {
        require(block.timestamp >= lastCompound + 1 days);
        _compound();
        lastCompound = block.timestamp;
    }
    // Nothing ensures this gets called!
}`,
    rightExample: `// CHAINLINK AUTOMATION COMPATIBLE
import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

contract AutoVault is AutomationCompatibleInterface {
    function checkUpkeep(bytes calldata) 
        external view override 
        returns (bool upkeepNeeded, bytes memory) 
    {
        upkeepNeeded = block.timestamp >= lastCompound + 1 days;
    }
    
    function performUpkeep(bytes calldata) external override {
        require(block.timestamp >= lastCompound + 1 days);
        _compound();
        lastCompound = block.timestamp;
    }
}

// OR: INCENTIVIZED (simpler, more decentralized)
contract IncentivizedVault {
    function compound() external returns (uint256 reward) {
        require(block.timestamp >= lastCompound + 1 hours, "Too soon");
        
        uint256 harvested = _harvest();
        reward = harvested / 100; // 1% to caller
        
        _reinvest(harvested - reward);
        payable(msg.sender).transfer(reward);
        
        lastCompound = block.timestamp;
    }
}`,
    severity: "high",
    keywords: ["keeper", "chainlink", "gelato", "schedule", "cron", "automate", "periodic"],
    relatedDocs: ["docs/DEFI_BUILDING_BLOCKS.md"],
  },

  // ============================================
  // SECURITY
  // ============================================
  {
    id: "reentrancy",
    category: "security",
    question: "Are you making external calls? Have you protected against reentrancy?",
    short: "Use ReentrancyGuard + CEI pattern for all functions with external calls.",
    explanation: `Reentrancy is when an external call allows the called contract to call back into your contract before the first call finishes.

Classic attack flow:
1. Attacker calls withdraw()
2. Your contract sends ETH to attacker
3. Attacker's receive() calls withdraw() AGAIN
4. Your contract hasn't updated balances yet
5. Attacker drains funds

Prevention:
1. Checks-Effects-Interactions (CEI) pattern
2. OpenZeppelin ReentrancyGuard
3. Use BOTH for critical functions

The DAO hack (2016) lost $60M to reentrancy. It's still the #1 smart contract vulnerability.`,
    wrongExample: `// VULNERABLE: Classic reentrancy
function withdraw(uint256 amount) external {
    require(balances[msg.sender] >= amount);
    
    // INTERACTION before EFFECT - vulnerable!
    (bool success,) = msg.sender.call{value: amount}("");
    require(success);
    
    // Attacker's receive() can call withdraw() again
    // before this line executes
    balances[msg.sender] -= amount;
}`,
    rightExample: `// SAFE: CEI pattern + ReentrancyGuard
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SafeContract is ReentrancyGuard {
    function withdraw(uint256 amount) external nonReentrant {
        // CHECKS
        require(balances[msg.sender] >= amount, "Insufficient");
        
        // EFFECTS (update state BEFORE external call)
        balances[msg.sender] -= amount;
        
        // INTERACTIONS (external calls LAST)
        (bool success,) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }
}`,
    severity: "critical",
    keywords: ["reentrancy", "external", "call", "transfer", "withdraw", "send"],
    relatedDocs: ["docs/WEB3_DEVELOPMENT_GUIDE.md", "docs/SOLIDITY_PATTERNS.md"],
  },
  {
    id: "access-control",
    category: "security",
    question: "Who can call admin functions? Is it a multisig? Is there a timelock?",
    short: "Use Ownable/AccessControl. Consider multisig + timelock for admin functions.",
    explanation: `Every privileged function needs access control. Questions to ask:

1. Who can call this? (owner, role, anyone?)
2. What's the key management? (EOA, multisig, DAO?)
3. Is there a timelock? (gives users time to react)

Best practices:
- Use OpenZeppelin Ownable or AccessControl
- Production: use multisig (Gnosis Safe)
- Critical changes: add timelock
- Document all admin capabilities

A single compromised admin key can drain entire protocols.`,
    wrongExample: `// DANGEROUS: No access control
function setFee(uint256 newFee) external {
    fee = newFee; // Anyone can call!
}

// RISKY: Single EOA owner
contract RiskyProtocol is Ownable {
    function withdrawAll() external onlyOwner {
        // If owner key is compromised, everything is lost
        payable(owner()).transfer(address(this).balance);
    }
}`,
    rightExample: `// BETTER: Role-based access
import "@openzeppelin/contracts/access/AccessControl.sol";

contract SafeProtocol is AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR");
    
    function setFee(uint256 newFee) external onlyRole(ADMIN_ROLE) {
        require(newFee <= MAX_FEE, "Fee too high");
        fee = newFee;
    }
}

// BEST: Timelock for critical changes
// Deploy with TimelockController as admin
// All admin calls go through 24-48h delay
// Users can exit before changes take effect`,
    severity: "high",
    keywords: ["owner", "admin", "access", "role", "permission", "multisig", "timelock"],
    relatedDocs: ["docs/SOLIDITY_PATTERNS.md"],
  },
  {
    id: "oracle-manipulation",
    category: "security",
    question: "How are you getting prices? Never use spot DEX prices as oracles.",
    short: "Never use spot DEX price. Use Chainlink or TWAP for price feeds.",
    explanation: `Price oracles are critical and easily manipulated:

DANGEROUS: Spot prices from DEX
- Can be manipulated in a single transaction
- Flash loan attacks can move prices temporarily
- Attacker borrows, manipulates, exploits, repays

SAFER: Chainlink price feeds
- Decentralized oracle network
- Aggregates multiple sources
- Has staleness checks

SAFER: TWAP (Time-Weighted Average Price)
- Average price over time window
- Resistant to flash loan manipulation
- But lags behind actual price

For any price-dependent logic, use established oracles, not spot prices.`,
    wrongExample: `// VULNERABLE: Using spot DEX price
function getPrice() public view returns (uint256) {
    // This can be manipulated in a single transaction!
    uint256 reserve0 = pair.reserve0();
    uint256 reserve1 = pair.reserve1();
    return (reserve1 * 1e18) / reserve0;
}

function liquidate(address user) external {
    uint256 price = getPrice(); // Manipulatable!
    require(getCollateralValue(user, price) < debt[user]);
    // Attacker: flash loan → manipulate price → liquidate → repay
}`,
    rightExample: `// SAFE: Chainlink oracle
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

AggregatorV3Interface public priceFeed;

function getPrice() public view returns (uint256) {
    (
        ,
        int256 price,
        ,
        uint256 updatedAt,
    ) = priceFeed.latestRoundData();
    
    // Check for stale data
    require(block.timestamp - updatedAt < 1 hours, "Stale price");
    require(price > 0, "Invalid price");
    
    return uint256(price);
}`,
    severity: "critical",
    keywords: ["oracle", "price", "chainlink", "twap", "feed", "reserve", "spot"],
    relatedDocs: ["docs/DEFI_BUILDING_BLOCKS.md"],
  },

  // ============================================
  // VAULTS
  // ============================================
  {
    id: "inflation-attack",
    category: "vaults",
    question: "How do you handle the first depositor? Are you vulnerable to inflation attacks?",
    short: "First depositor can manipulate share price. Use dead shares or virtual offsets.",
    explanation: `The ERC-4626 inflation attack:

1. Vault is empty: totalSupply = 0, totalAssets = 0
2. Attacker deposits 1 wei, gets 1 share
3. Attacker donates 1e18 tokens directly to vault
4. Now: totalSupply = 1, totalAssets = 1e18
5. Victim deposits 1.9e18 tokens
6. Victim gets: 1.9e18 * 1 / 1e18 = 1 share (rounded down!)
7. Attacker redeems 1 share, gets ~1.45e18 tokens

Mitigations:
1. Mint "dead shares" to address(0) on deployment
2. Use virtual shares/assets offset
3. Require minimum first deposit`,
    wrongExample: `// VULNERABLE: Standard ERC-4626 without protection
contract VulnerableVault is ERC4626 {
    constructor(IERC20 asset_) ERC4626(asset_) ERC20("Vault", "vTKN") {}
    
    // First depositor can inflate share price
    // and steal from subsequent depositors
}`,
    rightExample: `// SAFE: Virtual shares offset (OpenZeppelin 4.9+)
contract SafeVault is ERC4626 {
    constructor(IERC20 asset_) ERC4626(asset_) ERC20("Vault", "vTKN") {}
    
    // Override to add virtual offset
    function _decimalsOffset() internal pure override returns (uint8) {
        return 3; // Adds 1000 virtual shares
    }
}

// ALTERNATIVE: Mint dead shares on first deposit
contract DeadShareVault is ERC4626 {
    uint256 constant DEAD_SHARES = 1000;
    
    function _deposit(address caller, address receiver, uint256 assets, uint256 shares) 
        internal override 
    {
        if (totalSupply() == 0) {
            // Mint dead shares to prevent inflation attack
            _mint(address(0xdead), DEAD_SHARES);
        }
        super._deposit(caller, receiver, assets, shares);
    }
}`,
    severity: "critical",
    keywords: ["vault", "4626", "share", "first", "depositor", "inflation", "attack"],
    relatedDocs: ["docs/YIELD_VAULT_GUIDE.md"],
  },
  {
    id: "total-assets",
    category: "vaults",
    question: "Is your totalAssets() manipulation-resistant? Can it be inflated via donation?",
    short: "totalAssets() must resist manipulation. Direct token transfers can inflate it.",
    explanation: `In ERC-4626 vaults, totalAssets() determines share value. If it can be manipulated, attackers can:

1. Inflate totalAssets() to get more shares than deserved
2. Deflate totalAssets() before others deposit
3. Sandwich attacks around deposits/withdrawals

Common vulnerability: totalAssets = token.balanceOf(address(this))

Anyone can transfer tokens directly to inflate this!

Solutions:
- Track deposits internally, ignore donations
- Use only tokens from known sources (Aave aTokens, etc.)
- Have mechanism to sweep unexpected tokens`,
    wrongExample: `// VULNERABLE: Relies on raw balance
function totalAssets() public view override returns (uint256) {
    return asset().balanceOf(address(this));
    // Attacker can donate tokens to manipulate share price!
}`,
    rightExample: `// SAFE: Track deposits internally
uint256 private _totalManagedAssets;

function totalAssets() public view override returns (uint256) {
    return _totalManagedAssets + _calculateYield();
}

function _deposit(...) internal override {
    _totalManagedAssets += assets;
    super._deposit(...);
}

function _withdraw(...) internal override {
    _totalManagedAssets -= assets;
    super._withdraw(...);
}

// Optional: Sweep unexpected donations to treasury
function sweep() external onlyOwner {
    uint256 excess = asset().balanceOf(address(this)) - _totalManagedAssets;
    if (excess > 0) {
        asset().transfer(treasury, excess);
    }
}`,
    severity: "high",
    keywords: ["totalAssets", "balance", "donation", "vault", "manipulate"],
    relatedDocs: ["docs/YIELD_VAULT_GUIDE.md"],
  },

  // ============================================
  // DEFI
  // ============================================
  {
    id: "mev-sandwich",
    category: "defi",
    question: "Are you swapping tokens? Users will get sandwiched without slippage protection.",
    short: "Set slippage limits on swaps. MEV bots WILL sandwich unprotected trades.",
    explanation: `MEV (Maximal Extractable Value) sandwich attacks:

1. Your swap tx sits in mempool
2. Bot sees it, frontruns with a buy (price goes up)
3. Your swap executes at worse price
4. Bot backruns with a sell (profits from price impact)

You lose value to the "sandwich."

Protection:
- Always set amountOutMin (minimum tokens to receive)
- Use private mempools (Flashbots Protect)
- Use DEX aggregators with MEV protection
- Smaller trades get sandwiched less`,
    wrongExample: `// VULNERABLE: No slippage protection
function swap(uint256 amountIn) external {
    router.swapExactTokensForTokens(
        amountIn,
        0, // amountOutMin = 0, accepts ANY output!
        path,
        msg.sender,
        deadline
    );
    // Bot WILL sandwich this and extract value
}`,
    rightExample: `// PROTECTED: Enforce minimum output
function swap(uint256 amountIn, uint256 amountOutMin) external {
    require(amountOutMin > 0, "Set slippage");
    
    router.swapExactTokensForTokens(
        amountIn,
        amountOutMin, // Revert if output below this
        path,
        msg.sender,
        deadline
    );
}

// BETTER: Calculate slippage from oracle
function swapWithOracleProtection(uint256 amountIn, uint256 maxSlippageBps) external {
    uint256 expectedOut = oracle.getQuote(tokenIn, tokenOut, amountIn);
    uint256 amountOutMin = expectedOut * (10000 - maxSlippageBps) / 10000;
    
    router.swapExactTokensForTokens(
        amountIn,
        amountOutMin,
        path,
        msg.sender,
        deadline
    );
}`,
    severity: "high",
    keywords: ["swap", "slippage", "mev", "sandwich", "frontrun", "amountOutMin"],
    relatedDocs: ["docs/DEFI_BUILDING_BLOCKS.md"],
  },
  {
    id: "flash-loan-attacks",
    category: "defi",
    question: "Could your contract be exploited via flash loan? Any single-tx manipulation?",
    short: "Flash loans enable single-tx attacks. Time-lock or multi-block logic for safety.",
    explanation: `Flash loans let anyone borrow unlimited funds with no collateral - IF repaid in same transaction.

This enables attacks that were previously impossible:
- Manipulate prices with massive trades
- Exploit governance with temporary voting power  
- Attack undercollateralized positions
- Combine multiple exploits atomically

If any state in your contract can be profitably manipulated within one transaction, flash loans make it exploitable.

Mitigations:
- Use time-weighted values (TWAPs)
- Require actions span multiple blocks
- Limit single-transaction impact`,
    wrongExample: `// VULNERABLE: Governance based on current balance
function vote(uint256 proposalId) external {
    uint256 votes = token.balanceOf(msg.sender);
    // Attacker: flash loan tokens → vote → return tokens
    proposals[proposalId].votes += votes;
}

// VULNERABLE: Price from single block
function liquidate(address user) external {
    uint256 price = getSpotPrice(); // Current price, manipulatable
    require(isUndercollateralized(user, price));
    // Attacker: flash loan → manipulate price → liquidate → profit
}`,
    rightExample: `// SAFE: Snapshot voting power
function vote(uint256 proposalId) external {
    // Voting power from PAST block, can't be flash-loaned
    uint256 votes = token.getPastVotes(msg.sender, proposals[proposalId].snapshot);
    proposals[proposalId].votes += votes;
}

// SAFE: TWAP price oracle
function liquidate(address user) external {
    uint256 price = twapOracle.getPrice(); // Time-weighted average
    require(isUndercollateralized(user, price));
    // Flash loan can't manipulate TWAP significantly
}

// SAFE: Multi-block delay
mapping(address => uint256) public lastDeposit;

function withdraw() external {
    require(block.number > lastDeposit[msg.sender] + 1, "Wait 1 block");
    // Can't deposit and withdraw in same transaction/block
}`,
    severity: "high",
    keywords: ["flash", "loan", "attack", "atomic", "single", "transaction", "block"],
    relatedDocs: ["docs/DEFI_BUILDING_BLOCKS.md"],
  },
  {
    id: "protocol-integration",
    category: "defi",
    question: "Are you integrating with external protocols? What if they're paused, hacked, or upgraded?",
    short: "External protocols can fail, pause, or upgrade. Handle failures gracefully.",
    explanation: `When you integrate with external DeFi protocols, you inherit their risks:

1. **Pause risk**: Protocols can pause (Aave has circuit breakers)
2. **Upgrade risk**: Proxy contracts can change behavior
3. **Hack risk**: They get hacked, you lose funds
4. **Economic risk**: Bad debt, depegs, insolvency

Best practices:
- Use try/catch for external calls
- Have emergency withdrawal paths
- Monitor protocol health
- Consider protocol insurance (Nexus Mutual)
- Diversify across protocols when possible`,
    wrongExample: `// FRAGILE: Assumes protocol always works
function deposit(uint256 amount) external {
    aavePool.supply(asset, amount, address(this), 0);
    // What if Aave is paused? Transaction reverts!
    // Users' funds stuck in your contract.
}

function withdraw(uint256 amount) external {
    // If Aave is paused or insolvent...
    aavePool.withdraw(asset, amount, msg.sender);
    // ...users can never get funds back!
}`,
    rightExample: `// ROBUST: Handle external failures
bool public emergencyMode;

function deposit(uint256 amount) external {
    require(!emergencyMode, "Deposits paused");
    
    try aavePool.supply(asset, amount, address(this), 0) {
        // Success
    } catch {
        // Aave is paused or failed
        // Keep funds in contract, emit event
        emit DepositFailed(msg.sender, amount);
    }
}

// Emergency escape hatch
function emergencyWithdraw() external {
    require(emergencyMode, "Not emergency");
    uint256 balance = userBalance[msg.sender];
    userBalance[msg.sender] = 0;
    
    // Try external protocol first
    try aavePool.withdraw(asset, balance, msg.sender) {
        return;
    } catch {}
    
    // Fallback: send whatever we have
    uint256 available = asset.balanceOf(address(this));
    uint256 toSend = balance > available ? available : balance;
    asset.transfer(msg.sender, toSend);
}`,
    severity: "medium",
    keywords: ["integration", "external", "protocol", "aave", "compound", "uniswap", "pause", "fail"],
    relatedDocs: ["docs/DEFI_BUILDING_BLOCKS.md"],
  },
  {
    id: "immutable-code",
    category: "security",
    question: "Remember: deployed contracts are immutable. Have you tested thoroughly?",
    short: "Deployed code is permanent. Test exhaustively on fork before mainnet.",
    explanation: `Unlike web2 where you can hotfix bugs, smart contract code is IMMUTABLE once deployed.

If you deploy buggy code:
- You CANNOT patch it
- You CANNOT change logic
- You CAN deploy a new version, but migrating users/funds is hard

This is why:
1. Test extensively on mainnet fork (real state!)
2. Get audited for significant value
3. Consider upgradeable patterns (proxy) for flexibility
4. Have emergency pause mechanisms
5. Start with limited TVL, increase over time

Every deployed bug is permanent. The DAO hack, the Parity wallet freeze, countless DeFi exploits - all permanent.`,
    wrongExample: `// Deployed without testing token decimal handling
// Too late to fix when someone deposits USDC and loses funds!
contract BuggyVault {
    function deposit(uint256 amount) external {
        shares = amount * 1e18 / totalAssets; // Assumes 18 decimals!
    }
}`,
    rightExample: `// TESTING CHECKLIST before mainnet deploy:
// 
// 1. Unit tests: forge test (all passing)
// 2. Fork tests: forge test --fork-url $RPC
//    - Test with REAL tokens (USDC, WETH, etc)
//    - Test with REAL protocols (Aave, Uniswap)
// 3. Edge cases: zero values, max values, empty arrays
// 4. Access control: all admin functions protected
// 5. Reentrancy: external calls use CEI + guards
// 6. Math: no overflow, correct rounding
// 7. Integration: external protocol failures handled
//
// Only after ALL tests pass: yarn deploy --network mainnet`,
    severity: "high",
    keywords: ["deploy", "test", "mainnet", "bug", "immutable", "permanent"],
    relatedDocs: ["docs/WEB3_DEVELOPMENT_GUIDE.md", "docs/DEPLOYMENT_WORKFLOW.md"],
  },

  // ============================================
  // SCAFFOLD-ETH
  // ============================================
  {
    id: "external-contracts",
    category: "scaffold-eth",
    question: "Are you integrating with external contracts? Have you configured them for the debug UI?",
    short: "Debug UI only shows YOUR deployed contracts. External protocols need explicit configuration.",
    explanation: `When building projects that interact with external contracts (USDC, Aave, Uniswap, etc.), the Scaffold-ETH debug UI won't show them by default.

The debug UI only displays:
1. Contracts YOU deployed (from deployedContracts.ts)
2. Contracts you EXPLICITLY configure (in externalContracts.ts)

For testing and debugging, you want to interact with external contracts too!

Configuration file: packages/nextjs/contracts/externalContracts.ts

Use the stack_configureExternalContracts tool to automatically:
- Look up addresses from the registry
- Add bundled ABIs (ERC20, ERC4626, Aave, Uniswap)
- Create entries for both local fork (31337) and mainnet

This is important because during local development, you're on chainId 31337 (the fork), but the contract addresses are from mainnet.`,
    wrongExample: `// User builds a USDC vault without configuring USDC
// Result: Debug UI only shows their vault contract
// They can't test USDC.approve() or USDC.balanceOf() from the UI!

// Missing file: packages/nextjs/contracts/externalContracts.ts
// Or file exists but is empty`,
    rightExample: `// After running stack_configureExternalContracts with USDC:
// packages/nextjs/contracts/externalContracts.ts

const externalContracts = {
  31337: {  // Local fork
    USDC: {
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      abi: [...ERC20_ABI],
    },
  },
  8453: {  // Base mainnet  
    USDC: {
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      abi: [...ERC20_ABI],
    },
  },
} as const;

// Now debug UI shows USDC alongside user's contracts!
// Can test approve, transfer, balanceOf directly in browser`,
    severity: "medium",
    keywords: ["external", "usdc", "aave", "uniswap", "debug", "ui", "scaffold", "contracts", "integrate", "protocol"],
    relatedDocs: ["docs/SCAFFOLD_ETH_REFERENCE.md"],
  },

  // ============================================
  // UNISWAP V4
  // ============================================
  {
    id: "v4-settle-no-params",
    category: "uniswap-v4",
    question: "Are you calling settle() correctly? V4's settle() has NO parameters!",
    short: "Error 0x5212cba1 means wrong signature. Use settle(), NOT settle(currency).",
    explanation: `This is the #1 Uniswap V4 gotcha that causes hours of debugging.

The error \`0x5212cba1\` means you're calling the wrong function signature.

In V4, the payment pattern is:
1. Call sync(currency) to tell PoolManager which currency you're paying
2. Transfer tokens to PoolManager
3. Call settle() with NO PARAMETERS

The sync() function "sets up" which currency will be settled. Then settle() finalizes it.

This is completely different from what you might expect (passing the currency to settle).`,
    wrongExample: `// WRONG - will fail with error 0x5212cba1
poolManager.settle(currency);  // V4 settle() has no params!

// WRONG - common assumption
poolManager.settle(Currency.wrap(tokenAddress));`,
    rightExample: `// RIGHT - V4's actual pattern
poolManager.sync(currency);                    // 1. Tell PM which currency
IERC20(token).transfer(poolManager, amount);   // 2. Transfer tokens
poolManager.settle();                          // 3. Settle (NO PARAM!)

// The sync() "primes" the settlement, settle() finalizes it`,
    severity: "critical",
    keywords: ["uniswap", "v4", "settle", "sync", "0x5212cba1", "swap", "pool", "manager"],
    relatedDocs: ["resource://uniswap/v4-guide"],
  },
  {
    id: "v4-payment-order",
    category: "uniswap-v4",
    question: "Are you paying tokens in the correct order? sync -> transfer -> settle",
    short: "V4 requires: sync(currency), transfer tokens, then settle(). Order matters!",
    explanation: `The order of operations for paying tokens in V4 is strict:

1. sync(currency) - Tells PoolManager which currency you're about to pay
2. transfer() - Actually send the tokens to PoolManager
3. settle() - Finalize the payment (with NO parameters!)

If you get this order wrong, the transaction will silently revert or fail.

This pattern exists because V4 uses a "flash accounting" system where all debits and credits must balance within the unlock callback.`,
    wrongExample: `// WRONG - transfer before sync
IERC20(token).transfer(poolManager, amount);
poolManager.sync(currency);
poolManager.settle();

// WRONG - missing sync entirely
IERC20(token).transfer(poolManager, amount);
poolManager.settle(currency);  // Also wrong: settle has no params!`,
    rightExample: `// RIGHT - correct order
function _payToken(address token, uint256 amount, Currency currency) internal {
    poolManager.sync(currency);                           // 1. Sync first
    IERC20(token).transfer(address(poolManager), amount); // 2. Transfer
    poolManager.settle();                                 // 3. Settle (no params!)
}`,
    severity: "critical",
    keywords: ["uniswap", "v4", "sync", "settle", "transfer", "order", "payment", "token"],
    relatedDocs: ["resource://uniswap/v4-guide"],
  },
  {
    id: "v4-unlock-pattern",
    category: "uniswap-v4",
    question: "Are you using the unlock/callback pattern? You CANNOT call swap() directly on PoolManager.",
    short: "V4 requires unlock() -> unlockCallback() pattern. No direct swap() calls.",
    explanation: `Uniswap V4 uses a callback-based architecture. You CANNOT call swap() directly.

The flow is:
1. Your contract calls poolManager.unlock(data)
2. PoolManager calls back to YOUR contract's unlockCallback(data)
3. Inside unlockCallback, you call swap(), sync(), settle(), take()
4. PoolManager verifies all debits/credits balance before returning

Your contract MUST implement:
\`function unlockCallback(bytes calldata data) external returns (bytes memory)\`

This "flash accounting" pattern allows for gas-efficient multi-hop swaps and complex DeFi operations.`,
    wrongExample: `// WRONG - cannot call swap directly
function doSwap() external {
    poolManager.swap(poolKey, params, "");  // This will FAIL!
}

// WRONG - trying to settle outside of callback
function doSwap() external {
    poolManager.settle();  // Not in unlock context!
}`,
    rightExample: `// RIGHT - use unlock/callback pattern
function swap(address tokenIn, address tokenOut, uint256 amountIn) external {
    bytes memory data = abi.encode(msg.sender, tokenIn, tokenOut, amountIn);
    poolManager.unlock(data);  // This triggers our callback
}

function unlockCallback(bytes calldata data) external returns (bytes memory) {
    require(msg.sender == address(poolManager), "Only PoolManager");
    
    // NOW we can call swap, settle, take, etc.
    BalanceDelta delta = poolManager.swap(poolKey, params, "");
    
    // Pay input token
    poolManager.sync(currencyIn);
    IERC20(tokenIn).transfer(address(poolManager), amountIn);
    poolManager.settle();
    
    // Receive output token
    poolManager.take(currencyOut, recipient, amountOut);
    
    return abi.encode(amountOut);
}`,
    severity: "critical",
    keywords: ["uniswap", "v4", "unlock", "callback", "swap", "pattern", "flash"],
    relatedDocs: ["resource://uniswap/v4-guide"],
  },
  {
    id: "v4-currency-order",
    category: "uniswap-v4",
    question: "Is currency0 < currency1? PoolKey requires sorted addresses.",
    short: "PoolKey: currency0 MUST be less than currency1 (sorted by address).",
    explanation: `In Uniswap V4, when constructing a PoolKey, the currencies MUST be sorted by address.

currency0.address < currency1.address (always!)

If you get this wrong, you'll get "Pool not found" errors because you're looking for a pool that doesn't exist (pools are identified by their sorted key).

This is different from your "tokenIn/tokenOut" which can be in any order - those determine swap direction (zeroForOne), but the PoolKey itself must be sorted.`,
    wrongExample: `// WRONG - using unsorted addresses
PoolKey memory poolKey = PoolKey({
    currency0: Currency.wrap(tokenIn),   // Might be > tokenOut!
    currency1: Currency.wrap(tokenOut),
    fee: 3000,
    tickSpacing: 60,
    hooks: IHooks(address(0))
});
// Will fail with "Pool not found" if tokenIn > tokenOut`,
    rightExample: `// RIGHT - always sort currencies
(address c0, address c1) = tokenA < tokenB 
    ? (tokenA, tokenB) 
    : (tokenB, tokenA);

PoolKey memory poolKey = PoolKey({
    currency0: Currency.wrap(c0),  // Always the smaller address
    currency1: Currency.wrap(c1),  // Always the larger address
    fee: 3000,
    tickSpacing: 60,
    hooks: IHooks(address(0))
});

// Swap direction is separate:
bool zeroForOne = tokenIn < tokenOut;  // true if swapping c0->c1`,
    severity: "high",
    keywords: ["uniswap", "v4", "currency", "poolkey", "sorted", "order", "address", "pool"],
    relatedDocs: ["resource://uniswap/v4-guide"],
  },
  {
    id: "v4-stack-too-deep",
    category: "uniswap-v4",
    question: "Getting 'stack too deep'? V4 callbacks need helper functions.",
    short: "Split unlockCallback logic into helper functions to avoid stack too deep.",
    explanation: `Uniswap V4's unlockCallback often hits Solidity's "stack too deep" error because:

1. You decode multiple parameters from the callback data
2. You construct PoolKey with multiple fields
3. You handle swap results with multiple values
4. You do settlement logic with multiple tokens

The fix is simple: split your logic into helper functions. Each function gets its own stack frame.

Common pattern:
- unlockCallback: decode data, call _executeSwap
- _executeSwap: build PoolKey, call swap, call _settleSwap
- _settleSwap: handle payment and receiving
- _payToken: sync, transfer, settle pattern`,
    wrongExample: `// PRONE TO STACK TOO DEEP
function unlockCallback(bytes calldata data) external returns (bytes memory) {
    // All this in one function = stack too deep!
    (address recipient, address tokenIn, address tokenOut, 
     uint24 fee, uint256 amountIn, uint256 minOut) = abi.decode(...);
    
    (address c0, address c1) = tokenIn < tokenOut ? ...;
    
    PoolKey memory poolKey = PoolKey({...});
    
    BalanceDelta delta = poolManager.swap(...);
    
    // More local variables for settlement...
    // BOOM: Stack too deep!
}`,
    rightExample: `// RIGHT - split into helpers
function unlockCallback(bytes calldata data) external returns (bytes memory) {
    require(msg.sender == address(poolManager));
    return _executeSwap(data);  // Delegate to helper
}

function _executeSwap(bytes calldata data) internal returns (bytes memory) {
    (...) = abi.decode(data, (...));
    PoolKey memory poolKey = _buildPoolKey(tokenIn, tokenOut, fee);
    BalanceDelta delta = poolManager.swap(poolKey, params, "");
    return _settleSwap(delta, ...);  // Another helper
}

function _settleSwap(...) internal returns (bytes memory) {
    _payToken(tokenIn, amountIn, currencyIn);  // Yet another helper
    poolManager.take(currencyOut, recipient, amountOut);
    return abi.encode(amountOut);
}

function _payToken(address token, uint256 amount, Currency currency) internal {
    poolManager.sync(currency);
    IERC20(token).transfer(address(poolManager), amount);
    poolManager.settle();
}`,
    severity: "medium",
    keywords: ["uniswap", "v4", "stack", "deep", "callback", "helper", "function"],
    relatedDocs: ["resource://uniswap/v4-guide"],
  },
];

/**
 * Get all lessons for a category
 */
export function getLessonsByCategory(category: Category | "all"): Lesson[] {
  if (category === "all") {
    return LESSONS;
  }
  return LESSONS.filter((lesson) => lesson.category === category);
}

/**
 * Get a specific lesson by ID
 */
export function getLessonById(id: string): Lesson | undefined {
  return LESSONS.find((lesson) => lesson.id === id);
}

/**
 * Find relevant lessons based on keywords in text
 */
export function findRelevantLessons(text: string, limit: number = 5): Lesson[] {
  const lowercaseText = text.toLowerCase();

  // Score each lesson by keyword matches
  const scored = LESSONS.map((lesson) => {
    let score = 0;
    for (const keyword of lesson.keywords) {
      if (lowercaseText.includes(keyword)) {
        // Critical lessons get bonus points
        score += lesson.severity === "critical" ? 3 : lesson.severity === "high" ? 2 : 1;
      }
    }
    return { lesson, score };
  });

  // Sort by score descending, filter out zero scores
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.lesson);
}
