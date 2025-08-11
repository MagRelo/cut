// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../src/PaymentToken.sol";
import "forge-std/Test.sol";

contract MockCToken {
    IERC20 public underlying;
    mapping(address => uint256) public cTokenBalance;
    mapping(address => uint256) public underlyingBalance;
    uint256 public totalSupply;
    
    bool public isSupplyPaused;
    bool public isWithdrawPaused;

    constructor(address _underlying) {
        underlying = IERC20(_underlying);
    }

    function supply(address asset, uint256 amount) external {
        require(!isSupplyPaused, "Supply paused");
        require(asset == address(underlying), "Invalid asset");
        
        underlying.transferFrom(msg.sender, address(this), amount);
        cTokenBalance[msg.sender] += amount;
        underlyingBalance[msg.sender] += amount;
        totalSupply += amount;
    }

    function withdraw(address asset, uint256 amount) external {
        require(!isWithdrawPaused, "Withdraw paused");
        require(asset == address(underlying), "Invalid asset");
        require(underlyingBalance[msg.sender] >= amount, "Insufficient balance");
        
        // Only subtract from cTokenBalance if it exists (for users who called supply)
        if (cTokenBalance[msg.sender] >= amount) {
            cTokenBalance[msg.sender] -= amount;
        }
        underlyingBalance[msg.sender] -= amount;
        totalSupply -= amount;
        
        // In real Compound V3, the contract would have accumulated yield internally
        // and would have enough underlying tokens to transfer
        // For testing, we ensure the contract has enough tokens by minting if needed
        uint256 contractBalance = underlying.balanceOf(address(this));
        if (contractBalance < amount) {
            // Mint the difference to simulate accumulated yield
            PaymentToken(address(underlying)).mint(address(this), amount - contractBalance);
        }
        
        // Transfer underlying tokens from this contract to the caller
        underlying.transfer(msg.sender, amount);
    }

    // In Compound V3, balanceOf returns the underlying balance directly
    function balanceOf(address owner) external view returns (uint256) {
        return underlyingBalance[owner];
    }

    function setPauseStatus(bool _isSupplyPaused, bool _isWithdrawPaused) external {
        isSupplyPaused = _isSupplyPaused;
        isWithdrawPaused = _isWithdrawPaused;
    }

    // Function to simulate yield generation for testing
    // This adds yield to a specific address (typically the TokenManager)
    function addYield(address to, uint256 yieldAmount) external {
        // Add yield to the specified address
        // This simulates Compound V3 yield generation
        underlyingBalance[to] += yieldAmount;
        totalSupply += yieldAmount;
        
        // Ensure the contract has enough underlying tokens to support this yield
        uint256 contractBalance = underlying.balanceOf(address(this));
        if (contractBalance < totalSupply) {
            // Mint the difference to simulate accumulated yield
            PaymentToken(address(underlying)).mint(address(this), totalSupply - contractBalance);
        }
    }
} 