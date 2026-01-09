# Solidity Patterns Reference

Quick reference for common Solidity patterns used in Scaffold-ETH development.

---

## Contract Structure Template

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// 1. Imports
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// 2. Interfaces
interface IExternalProtocol {
    function doSomething(uint256 amount) external returns (bool);
}

// 3. Libraries (if custom)
library MathHelpers {
    function percentage(uint256 amount, uint256 bps) internal pure returns (uint256) {
        return (amount * bps) / 10000;
    }
}

// 4. Contract
contract MyContract is ERC20, Ownable, ReentrancyGuard {
    // 4a. Type declarations
    using MathHelpers for uint256;

    struct UserInfo {
        uint256 deposited;
        uint256 rewardDebt;
        uint256 lastUpdate;
    }

    enum Status { Pending, Active, Completed }

    // 4b. State variables
    uint256 public constant FEE_BPS = 100; // 1%
    uint256 public totalDeposits;
    mapping(address => UserInfo) public users;
    address[] public userList;

    // 4c. Events
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    // 4d. Errors (custom errors save gas)
    error InsufficientBalance(uint256 requested, uint256 available);
    error Unauthorized();

    // 4e. Modifiers
    modifier onlyActiveUser() {
        require(users[msg.sender].deposited > 0, "Not active");
        _;
    }

    // 4f. Constructor
    constructor() ERC20("MyToken", "MTK") Ownable(msg.sender) {}

    // 4g. External functions
    function deposit(uint256 amount) external nonReentrant {
        // Implementation
    }

    // 4h. Public functions
    function getBalance(address user) public view returns (uint256) {
        return users[user].deposited;
    }

    // 4i. Internal functions
    function _updateRewards(address user) internal {
        // Implementation
    }

    // 4j. Private functions
    function _validateAmount(uint256 amount) private pure returns (bool) {
        return amount > 0;
    }
}
```

---

## Token Patterns

### ERC-20 with Hooks

```solidity
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract HookedToken is ERC20 {
    constructor() ERC20("Hooked", "HOOK") {
        _mint(msg.sender, 1_000_000 * 10**18);
    }

    function _update(address from, address to, uint256 value) internal override {
        // Called on every transfer, mint, burn
        // Add custom logic here

        // Call parent implementation
        super._update(from, to, value);
    }
}
```

### ERC-20 with Permit (Gasless Approvals)

```solidity
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract PermitToken is ERC20Permit {
    constructor() ERC20("Permit", "PRMT") ERC20Permit("Permit") {
        _mint(msg.sender, 1_000_000 * 10**18);
    }
}
```

### ERC-721 (NFT)

```solidity
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract MyNFT is ERC721URIStorage {
    uint256 private _tokenIds;

    constructor() ERC721("MyNFT", "MNFT") {}

    function mint(address to, string memory uri) external returns (uint256) {
        _tokenIds++;
        _safeMint(to, _tokenIds);
        _setTokenURI(_tokenIds, uri);
        return _tokenIds;
    }
}
```

---

## DeFi Patterns

### Staking Contract

```solidity
contract SimpleStaking is ReentrancyGuard {
    IERC20 public stakingToken;
    IERC20 public rewardToken;

    uint256 public rewardRate = 100; // rewards per second
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;

    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;
    mapping(address => uint256) public balances;
    uint256 public totalSupply;

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = block.timestamp;
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    function rewardPerToken() public view returns (uint256) {
        if (totalSupply == 0) return rewardPerTokenStored;
        return rewardPerTokenStored + (
            (block.timestamp - lastUpdateTime) * rewardRate * 1e18 / totalSupply
        );
    }

    function earned(address account) public view returns (uint256) {
        return (
            balances[account] * (rewardPerToken() - userRewardPerTokenPaid[account]) / 1e18
        ) + rewards[account];
    }

    function stake(uint256 amount) external nonReentrant updateReward(msg.sender) {
        totalSupply += amount;
        balances[msg.sender] += amount;
        stakingToken.transferFrom(msg.sender, address(this), amount);
    }

    function withdraw(uint256 amount) external nonReentrant updateReward(msg.sender) {
        totalSupply -= amount;
        balances[msg.sender] -= amount;
        stakingToken.transfer(msg.sender, amount);
    }

    function getReward() external nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        rewards[msg.sender] = 0;
        rewardToken.transfer(msg.sender, reward);
    }
}
```

### Simple AMM (Constant Product)

```solidity
contract SimpleAMM {
    IERC20 public tokenA;
    IERC20 public tokenB;
    uint256 public reserveA;
    uint256 public reserveB;
    uint256 public totalShares;
    mapping(address => uint256) public shares;

    uint256 private constant FEE_BPS = 30; // 0.3%

    function addLiquidity(uint256 amountA, uint256 amountB) external returns (uint256) {
        tokenA.transferFrom(msg.sender, address(this), amountA);
        tokenB.transferFrom(msg.sender, address(this), amountB);

        uint256 share;
        if (totalShares == 0) {
            share = sqrt(amountA * amountB);
        } else {
            share = min(
                (amountA * totalShares) / reserveA,
                (amountB * totalShares) / reserveB
            );
        }

        shares[msg.sender] += share;
        totalShares += share;
        reserveA += amountA;
        reserveB += amountB;

        return share;
    }

    function swap(address tokenIn, uint256 amountIn) external returns (uint256) {
        bool isTokenA = tokenIn == address(tokenA);
        (IERC20 inToken, IERC20 outToken, uint256 resIn, uint256 resOut) = isTokenA
            ? (tokenA, tokenB, reserveA, reserveB)
            : (tokenB, tokenA, reserveB, reserveA);

        inToken.transferFrom(msg.sender, address(this), amountIn);

        // Apply fee
        uint256 amountInWithFee = amountIn * (10000 - FEE_BPS) / 10000;

        // Constant product: x * y = k
        uint256 amountOut = (resOut * amountInWithFee) / (resIn + amountInWithFee);

        outToken.transfer(msg.sender, amountOut);

        // Update reserves
        if (isTokenA) {
            reserveA += amountIn;
            reserveB -= amountOut;
        } else {
            reserveB += amountIn;
            reserveA -= amountOut;
        }

        return amountOut;
    }

    function sqrt(uint256 x) internal pure returns (uint256) {
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }

    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
}
```

---

## Security Patterns

### Pausable

```solidity
import "@openzeppelin/contracts/utils/Pausable.sol";

contract PausableContract is Pausable, Ownable {
    function sensitiveAction() external whenNotPaused {
        // Only works when not paused
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
```

### Rate Limiting

```solidity
contract RateLimited {
    mapping(address => uint256) public lastAction;
    uint256 public cooldown = 1 hours;

    modifier rateLimited() {
        require(
            block.timestamp >= lastAction[msg.sender] + cooldown,
            "Rate limited"
        );
        lastAction[msg.sender] = block.timestamp;
        _;
    }

    function limitedAction() external rateLimited {
        // Can only be called once per cooldown period
    }
}
```

### Signature Verification

```solidity
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract SignatureVerifier {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    address public signer;

    function verifyAction(
        address user,
        uint256 amount,
        uint256 nonce,
        bytes memory signature
    ) external view returns (bool) {
        bytes32 messageHash = keccak256(abi.encodePacked(user, amount, nonce));
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address recovered = ethSignedHash.recover(signature);
        return recovered == signer;
    }
}
```

---

## Upgrade Patterns

### Proxy (UUPS)

```solidity
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract MyUpgradeable is UUPSUpgradeable, OwnableUpgradeable {
    uint256 public value;

    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
    }

    function setValue(uint256 _value) external {
        value = _value;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
```

---

## Gas Optimization Patterns

### Storage Packing

```solidity
// BAD - uses 3 storage slots (96 bytes)
contract BadPacking {
    uint256 a; // slot 0 (32 bytes)
    uint128 b; // slot 1 (16 bytes, but uses full slot)
    uint128 c; // slot 2 (16 bytes, but uses full slot)
}

// GOOD - uses 2 storage slots (64 bytes)
contract GoodPacking {
    uint256 a; // slot 0 (32 bytes)
    uint128 b; // slot 1 first 16 bytes
    uint128 c; // slot 1 last 16 bytes
}
```

### Batch Operations

```solidity
// BAD - many separate transactions
function transferOne(address to, uint256 amount) external {
    token.transfer(to, amount);
}

// GOOD - batch in single transaction
function transferBatch(address[] calldata tos, uint256[] calldata amounts) external {
    for (uint i = 0; i < tos.length; i++) {
        token.transfer(tos[i], amounts[i]);
    }
}
```

### Caching Array Length

```solidity
// BAD - reads length from storage each iteration
for (uint i = 0; i < users.length; i++) { }

// GOOD - cache length in memory
uint256 len = users.length;
for (uint i = 0; i < len; i++) { }
```

---

## Event Patterns

### Indexed Parameters

```solidity
// Up to 3 indexed parameters (searchable)
event Transfer(
    address indexed from,    // indexed - can filter by
    address indexed to,      // indexed - can filter by
    uint256 value           // not indexed - in data
);
```

### Rich Event Data

```solidity
event SwapExecuted(
    address indexed user,
    address indexed tokenIn,
    address indexed tokenOut,
    uint256 amountIn,
    uint256 amountOut,
    uint256 fee,
    uint256 timestamp
);
```

---

## Error Handling

### Custom Errors (Gas Efficient)

```solidity
// Custom errors (recommended for 0.8.4+)
error InsufficientBalance(uint256 available, uint256 required);
error Unauthorized(address caller);
error InvalidInput(string reason);

contract CustomErrors {
    function withdraw(uint256 amount) external {
        if (balances[msg.sender] < amount) {
            revert InsufficientBalance(balances[msg.sender], amount);
        }
    }
}
```

### Require with Messages

```solidity
// Classic require (still common)
require(amount > 0, "Amount must be positive");
require(msg.sender == owner, "Only owner");
```

---

## Testing Patterns (Foundry)

```solidity
// test/MyContract.t.sol
import "forge-std/Test.sol";
import "../src/MyContract.sol";

contract MyContractTest is Test {
    MyContract public myContract;
    address public user = address(0x1);

    function setUp() public {
        myContract = new MyContract();
        vm.deal(user, 10 ether);
    }

    function testDeposit() public {
        vm.prank(user);
        myContract.deposit{value: 1 ether}();
        assertEq(myContract.balances(user), 1 ether);
    }

    function testFailUnauthorized() public {
        // This test passes if the call reverts
        vm.prank(user);
        myContract.adminFunction();
    }

    function testFuzz_Deposit(uint256 amount) public {
        vm.assume(amount > 0 && amount < 100 ether);
        vm.deal(user, amount);
        vm.prank(user);
        myContract.deposit{value: amount}();
        assertEq(myContract.balances(user), amount);
    }
}
```
