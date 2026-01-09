// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title BaseVault
 * @notice A secure, extensible ERC-4626 vault with built-in safety features
 * @dev Inherit from this to build custom yield strategies
 * 
 * Features:
 * - ERC-4626 compliant
 * - Inflation attack protection (decimal offset)
 * - Reentrancy protection
 * - Pausable deposits/withdrawals
 * - Management fee support
 * - Configurable deposit/withdrawal limits
 */
contract BaseVault is ERC4626, Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============================================
    // CONSTANTS
    // ============================================
    
    uint256 public constant MAX_BPS = 10_000; // 100%
    uint256 public constant MAX_MANAGEMENT_FEE = 1000; // 10% max

    // ============================================
    // STATE VARIABLES
    // ============================================
    
    /// @notice Management fee in basis points (100 = 1%)
    uint256 public managementFeeBps;
    
    /// @notice Address that receives fees
    address public feeRecipient;
    
    /// @notice Maximum total assets the vault will accept
    uint256 public depositLimit;
    
    /// @notice Minimum deposit amount
    uint256 public minDeposit;
    
    /// @notice Last time fees were collected
    uint256 public lastFeeCollection;
    
    /// @notice Total assets under management (tracked separately for donation protection)
    uint256 internal _totalManagedAssets;

    // ============================================
    // EVENTS
    // ============================================
    
    event FeeCollected(uint256 amount, address recipient);
    event DepositLimitUpdated(uint256 newLimit);
    event ManagementFeeUpdated(uint256 newFeeBps);
    event FeeRecipientUpdated(address newRecipient);

    // ============================================
    // ERRORS
    // ============================================
    
    error DepositLimitExceeded();
    error BelowMinimumDeposit();
    error InvalidFee();
    error InvalidRecipient();

    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    constructor(
        IERC20 _asset,
        string memory _name,
        string memory _symbol,
        address _owner,
        address _feeRecipient,
        uint256 _managementFeeBps
    ) ERC4626(_asset) ERC20(_name, _symbol) Ownable(_owner) {
        if (_managementFeeBps > MAX_MANAGEMENT_FEE) revert InvalidFee();
        if (_feeRecipient == address(0)) revert InvalidRecipient();
        
        managementFeeBps = _managementFeeBps;
        feeRecipient = _feeRecipient;
        depositLimit = type(uint256).max;
        minDeposit = 0;
        lastFeeCollection = block.timestamp;
    }

    // ============================================
    // ERC-4626 OVERRIDES
    // ============================================
    
    /// @notice Total assets including yield
    /// @dev Override in child contracts to include external protocol balances
    function totalAssets() public view virtual override returns (uint256) {
        return _totalManagedAssets;
    }
    
    /// @notice Maximum deposit allowed
    function maxDeposit(address) public view virtual override returns (uint256) {
        if (paused()) return 0;
        uint256 currentAssets = totalAssets();
        if (currentAssets >= depositLimit) return 0;
        return depositLimit - currentAssets;
    }
    
    /// @notice Maximum mint allowed
    function maxMint(address receiver) public view virtual override returns (uint256) {
        return convertToShares(maxDeposit(receiver));
    }
    
    /// @notice Deposit with reentrancy and pause protection
    function deposit(uint256 assets, address receiver) 
        public 
        virtual 
        override 
        nonReentrant 
        whenNotPaused 
        returns (uint256) 
    {
        if (assets < minDeposit) revert BelowMinimumDeposit();
        if (assets > maxDeposit(receiver)) revert DepositLimitExceeded();
        
        return super.deposit(assets, receiver);
    }
    
    /// @notice Mint with reentrancy and pause protection
    function mint(uint256 shares, address receiver)
        public
        virtual
        override
        nonReentrant
        whenNotPaused
        returns (uint256)
    {
        uint256 assets = previewMint(shares);
        if (assets < minDeposit) revert BelowMinimumDeposit();
        if (assets > maxDeposit(receiver)) revert DepositLimitExceeded();
        
        return super.mint(shares, receiver);
    }
    
    /// @notice Withdraw with reentrancy protection
    function withdraw(uint256 assets, address receiver, address owner)
        public
        virtual
        override
        nonReentrant
        returns (uint256)
    {
        return super.withdraw(assets, receiver, owner);
    }
    
    /// @notice Redeem with reentrancy protection
    function redeem(uint256 shares, address receiver, address owner)
        public
        virtual
        override
        nonReentrant
        returns (uint256)
    {
        return super.redeem(shares, receiver, owner);
    }

    // ============================================
    // INTERNAL HOOKS
    // ============================================
    
    /// @notice Called after deposit - override to deploy assets
    function _deposit(
        address caller,
        address receiver,
        uint256 assets,
        uint256 shares
    ) internal virtual override {
        // Track managed assets
        _totalManagedAssets += assets;
        
        // Call parent (transfers assets, mints shares)
        super._deposit(caller, receiver, assets, shares);
        
        // Hook for child contracts to deploy assets
        _afterDeposit(assets);
    }
    
    /// @notice Called during withdrawal - override to retrieve assets
    function _withdraw(
        address caller,
        address receiver,
        address owner,
        uint256 assets,
        uint256 shares
    ) internal virtual override {
        // Hook for child contracts to retrieve assets
        _beforeWithdraw(assets);
        
        // Update tracked assets
        _totalManagedAssets -= assets;
        
        // Call parent (burns shares, transfers assets)
        super._withdraw(caller, receiver, owner, assets, shares);
    }
    
    /// @notice Hook called after deposit - override to deploy to strategy
    function _afterDeposit(uint256 assets) internal virtual {}
    
    /// @notice Hook called before withdrawal - override to retrieve from strategy
    function _beforeWithdraw(uint256 assets) internal virtual {}
    
    /// @notice Decimal offset to prevent inflation attacks
    function _decimalsOffset() internal pure virtual override returns (uint8) {
        return 3; // Adds 1000 "virtual" shares
    }

    // ============================================
    // FEE MANAGEMENT
    // ============================================
    
    /// @notice Collect management fees
    function collectFees() external {
        uint256 timeElapsed = block.timestamp - lastFeeCollection;
        if (timeElapsed == 0) return;
        
        uint256 assets = totalAssets();
        // Annual fee, prorated for time elapsed
        uint256 feeAmount = (assets * managementFeeBps * timeElapsed) / (MAX_BPS * 365 days);
        
        if (feeAmount > 0) {
            // Mint fee shares to recipient
            uint256 feeShares = convertToShares(feeAmount);
            _mint(feeRecipient, feeShares);
            
            emit FeeCollected(feeAmount, feeRecipient);
        }
        
        lastFeeCollection = block.timestamp;
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================
    
    /// @notice Update deposit limit
    function setDepositLimit(uint256 newLimit) external onlyOwner {
        depositLimit = newLimit;
        emit DepositLimitUpdated(newLimit);
    }
    
    /// @notice Update minimum deposit
    function setMinDeposit(uint256 newMin) external onlyOwner {
        minDeposit = newMin;
    }
    
    /// @notice Update management fee
    function setManagementFee(uint256 newFeeBps) external onlyOwner {
        if (newFeeBps > MAX_MANAGEMENT_FEE) revert InvalidFee();
        collectFees(); // Collect with old fee first
        managementFeeBps = newFeeBps;
        emit ManagementFeeUpdated(newFeeBps);
    }
    
    /// @notice Update fee recipient
    function setFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert InvalidRecipient();
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(newRecipient);
    }
    
    /// @notice Pause deposits
    function pause() external onlyOwner {
        _pause();
    }
    
    /// @notice Unpause deposits
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /// @notice Emergency rescue of stuck tokens (not the vault asset)
    function rescueTokens(IERC20 token, uint256 amount) external onlyOwner {
        require(address(token) != asset(), "Cannot rescue vault asset");
        token.safeTransfer(owner(), amount);
    }
}
