// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AaveVault
 * @notice ERC-4626 vault that deposits to Aave V3 for yield
 * @dev Simple single-strategy vault for Aave lending
 * 
 * Deployment addresses (use eth-mcp addresses_getProtocol):
 * - Mainnet: pool = 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2
 * - Base: pool = 0xA238Dd80C259a72e81d7e4664a9801593F98d1c5
 * - Arbitrum: pool = 0x794a61358D6845594F94dc1DB02A252b5b4814aD
 * - Optimism: pool = 0x794a61358D6845594F94dc1DB02A252b5b4814aD
 */

interface IAavePool {
    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external;
    
    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256);
    
    function getReserveData(address asset) external view returns (
        uint256 configuration,
        uint128 liquidityIndex,
        uint128 currentLiquidityRate,
        uint128 variableBorrowIndex,
        uint128 currentVariableBorrowRate,
        uint128 currentStableBorrowRate,
        uint40 lastUpdateTimestamp,
        uint16 id,
        address aTokenAddress,
        address stableDebtTokenAddress,
        address variableDebtTokenAddress,
        address interestRateStrategyAddress,
        uint128 accruedToTreasury,
        uint128 unbacked,
        uint128 isolationModeTotalDebt
    );
}

interface IAToken {
    function balanceOf(address account) external view returns (uint256);
    function scaledBalanceOf(address account) external view returns (uint256);
}

contract AaveVault is ERC4626, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============================================
    // STATE VARIABLES
    // ============================================
    
    IAavePool public immutable aavePool;
    IAToken public immutable aToken;
    
    // ============================================
    // EVENTS
    // ============================================
    
    event Harvested(uint256 profit);

    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    /**
     * @param _asset The underlying asset (e.g., USDC)
     * @param _aavePool The Aave V3 Pool address
     * @param _name Vault token name
     * @param _symbol Vault token symbol
     */
    constructor(
        IERC20 _asset,
        IAavePool _aavePool,
        string memory _name,
        string memory _symbol
    ) ERC4626(_asset) ERC20(_name, _symbol) Ownable(msg.sender) {
        aavePool = _aavePool;
        
        // Get aToken address from pool
        (,,,,,,,, address aTokenAddress,,,,,,) = _aavePool.getReserveData(address(_asset));
        aToken = IAToken(aTokenAddress);
        
        // Approve Aave pool to spend our assets
        _asset.approve(address(_aavePool), type(uint256).max);
    }

    // ============================================
    // ERC-4626 OVERRIDES
    // ============================================
    
    /**
     * @notice Total assets = aToken balance (includes accrued interest)
     */
    function totalAssets() public view override returns (uint256) {
        return aToken.balanceOf(address(this));
    }
    
    /**
     * @notice Deposit assets and supply to Aave
     */
    function _deposit(
        address caller,
        address receiver,
        uint256 assets,
        uint256 shares
    ) internal override nonReentrant {
        // Transfer assets from caller to vault
        super._deposit(caller, receiver, assets, shares);
        
        // Supply to Aave
        aavePool.supply(asset(), assets, address(this), 0);
    }
    
    /**
     * @notice Withdraw from Aave and send to receiver
     */
    function _withdraw(
        address caller,
        address receiver,
        address owner,
        uint256 assets,
        uint256 shares
    ) internal override nonReentrant {
        // Withdraw from Aave to this contract
        aavePool.withdraw(asset(), assets, address(this));
        
        // Transfer to receiver (handles share burning)
        super._withdraw(caller, receiver, owner, assets, shares);
    }
    
    /**
     * @dev Decimal offset to prevent inflation attacks
     */
    function _decimalsOffset() internal pure override returns (uint8) {
        return 3;
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================
    
    /**
     * @notice Get current APY from Aave (in ray, 1e27 = 100%)
     */
    function getCurrentAPY() external view returns (uint256) {
        (,, uint128 currentLiquidityRate,,,,,,,,,,,,) = aavePool.getReserveData(asset());
        return currentLiquidityRate;
    }
    
    /**
     * @notice Get current APY as percentage (2 decimals, 500 = 5.00%)
     */
    function getAPYPercent() external view returns (uint256) {
        (,, uint128 currentLiquidityRate,,,,,,,,,,,,) = aavePool.getReserveData(asset());
        // Convert from ray (1e27) to percent with 2 decimals
        return (uint256(currentLiquidityRate) * 10000) / 1e27;
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================
    
    /**
     * @notice Rescue tokens accidentally sent to the vault
     * @dev Cannot rescue the underlying asset or aToken
     */
    function rescueTokens(IERC20 token, uint256 amount) external onlyOwner {
        require(address(token) != asset(), "Cannot rescue underlying");
        require(address(token) != address(aToken), "Cannot rescue aToken");
        token.safeTransfer(owner(), amount);
    }
}
