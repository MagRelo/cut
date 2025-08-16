// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./MockUSDC.sol";

/**
 * @title MockCompound
 * @dev This contract mocks Compound V3 Comet for testing purposes.
 * It implements the exact interface that our DepositManager expects.
 * 
 * Real Compound V3 Comet functions we need to mock:
 * - supply(address asset, uint256 amount)
 * - withdraw(address asset, uint256 amount)
 * - balanceOf(address owner) - returns underlying balance directly
 * - totalSupply() - returns total underlying supplied
 * - isSupplyPaused() - returns pause status
 * - isWithdrawPaused() - returns pause status
 */
contract MockCompound {
    IERC20 public immutable underlying;
    
    // Balance tracking (like real Compound V3)
    mapping(address => uint256) public balances;
    uint256 public totalSupplyAmount;
    
    // Pause flags (like real Compound V3)
    bool public _isSupplyPaused;
    bool public _isWithdrawPaused;
    bool public _supplyShouldFail;
    
    // Events (like real Compound V3)
    event Supply(address indexed from, address indexed dst, uint amount);
    event Withdraw(address indexed from, address indexed dst, uint amount);

    constructor(address _underlying) {
        underlying = IERC20(_underlying);
    }
    
    /**
     * @dev Supply underlying asset to Compound V3
     * @param asset The underlying asset address
     * @param amount The amount to supply
     */
    function supply(address asset, uint256 amount) external {
        require(!_isSupplyPaused, "Supply paused");
        require(asset == address(underlying), "Invalid asset");
        require(amount > 0, "Amount must be greater than 0");
        require(!_supplyShouldFail, "Supply failed");
        
        // Transfer underlying from user to this contract
        underlying.transferFrom(msg.sender, address(this), amount);
        
        // Update balances (like real Compound V3)
        balances[msg.sender] += amount;
        totalSupplyAmount += amount;
        
        emit Supply(msg.sender, msg.sender, amount);
    }

    /**
     * @dev Withdraw underlying asset from Compound V3
     * @param asset The underlying asset address
     * @param amount The amount to withdraw
     */
    function withdraw(address asset, uint256 amount) external {
        require(!_isWithdrawPaused, "Withdraw paused");
        require(asset == address(underlying), "Invalid asset");
        require(amount > 0, "Amount must be greater than 0");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        // Update balances (like real Compound V3)
        balances[msg.sender] -= amount;
        totalSupplyAmount -= amount;
        
        // Transfer underlying to user
        underlying.transfer(msg.sender, amount);
        
        emit Withdraw(msg.sender, msg.sender, amount);
    }

    /**
     * @dev Get the underlying balance for an account
     * @param owner The account address
     * @return The underlying balance
     */
    function balanceOf(address owner) external view returns (uint256) {
        return balances[owner];
    }

    /**
     * @dev Get the total underlying supplied
     * @return The total underlying amount
     */
    function totalSupply() external view returns (uint256) {
        return totalSupplyAmount;
    }

    /**
     * @dev Check if supply is paused
     * @return True if supply is paused
     */
    function isSupplyPaused() external view returns (bool) {
        return _isSupplyPaused;
    }

    /**
     * @dev Check if withdraw is paused
     * @return True if withdraw is paused
     */
    function isWithdrawPaused() external view returns (bool) {
        return _isWithdrawPaused;
    }

    // Admin functions for testing

    /**
     * @dev Set supply pause status (for testing)
     * @param paused True to pause supply
     */
    function setSupplyPaused(bool paused) external {
        _isSupplyPaused = paused;
    }

    /**
     * @dev Set withdraw pause status (for testing)
     * @param paused True to pause withdraw
     */
    function setWithdrawPaused(bool paused) external {
        _isWithdrawPaused = paused;
    }

    /**
     * @dev Set supply failure flag (for testing)
     * @param shouldFail True to make supply fail
     */
    function setSupplyShouldFail(bool shouldFail) external {
        _supplyShouldFail = shouldFail;
    }

    /**
     * @dev Add yield to an account (for testing)
     * @param to The account to add yield to
     * @param amount The yield amount
     */
    function addYield(address to, uint256 amount) external {
        // Mint the underlying tokens to this contract first
        // This simulates the yield generation in real Compound V3
        MockUSDC(address(underlying)).mint(address(this), amount);
        
        // Then add to the account balance
        balances[to] += amount;
        totalSupplyAmount += amount;
    }
} 