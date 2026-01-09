// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TaxToken
 * @notice ERC-20 token with a 1% transfer tax
 * @dev Tax is collected on every transfer and sent to the treasury
 *
 * PLACEHOLDER IMPLEMENTATION
 * This demonstrates the structure - production code needs:
 * - Reentrancy guards
 * - Whitelist for DEX routers
 * - Tax exemptions for liquidity adds
 * - Slippage considerations
 */
contract TaxToken is ERC20, Ownable {
    // Tax rate in basis points (100 = 1%)
    uint256 public constant TAX_RATE_BPS = 100;
    uint256 public constant BPS_DENOMINATOR = 10000;

    // Treasury address for collected taxes
    address public treasury;

    // Addresses exempt from tax (for liquidity, etc)
    mapping(address => bool) public taxExempt;

    // Events
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event TaxExemptionUpdated(address indexed account, bool exempt);
    event TaxCollected(address indexed from, address indexed to, uint256 taxAmount);

    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address _treasury
    ) ERC20(name, symbol) Ownable(msg.sender) {
        require(_treasury != address(0), "Treasury cannot be zero address");
        treasury = _treasury;

        // Mint initial supply to deployer
        _mint(msg.sender, initialSupply);

        // Exempt owner and treasury from tax
        taxExempt[msg.sender] = true;
        taxExempt[_treasury] = true;
    }

    /**
     * @notice Override transfer to apply tax
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        return _transferWithTax(msg.sender, to, amount);
    }

    /**
     * @notice Override transferFrom to apply tax
     */
    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        address spender = msg.sender;
        _spendAllowance(from, spender, amount);
        return _transferWithTax(from, to, amount);
    }

    /**
     * @notice Internal transfer with tax logic
     */
    function _transferWithTax(address from, address to, uint256 amount) internal returns (bool) {
        // Skip tax for exempt addresses
        if (taxExempt[from] || taxExempt[to]) {
            _transfer(from, to, amount);
            return true;
        }

        // Calculate tax
        uint256 taxAmount = (amount * TAX_RATE_BPS) / BPS_DENOMINATOR;
        uint256 transferAmount = amount - taxAmount;

        // Transfer tax to treasury
        if (taxAmount > 0) {
            _transfer(from, treasury, taxAmount);
            emit TaxCollected(from, to, taxAmount);
        }

        // Transfer remaining amount to recipient
        _transfer(from, to, transferAmount);

        return true;
    }

    /**
     * @notice Update treasury address
     */
    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Treasury cannot be zero address");
        address oldTreasury = treasury;
        treasury = newTreasury;
        taxExempt[newTreasury] = true;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    /**
     * @notice Set tax exemption for an address
     */
    function setTaxExempt(address account, bool exempt) external onlyOwner {
        taxExempt[account] = exempt;
        emit TaxExemptionUpdated(account, exempt);
    }

    /**
     * @notice Calculate tax for a given amount
     */
    function calculateTax(uint256 amount) public pure returns (uint256) {
        return (amount * TAX_RATE_BPS) / BPS_DENOMINATOR;
    }
}
