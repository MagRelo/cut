// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/TokenManager.sol";
import "../src/PlatformToken.sol";
import "../src/PaymentToken.sol";
import "./MockCompound.sol";

contract TokenManagerTest is Test {
    TokenManager public tokenManager;
    PlatformToken public platformToken;
    PaymentToken public paymentToken;
    MockCToken public mockCUSDC;
    address public user = address(0x1);
    address public paymentTokenOwner = address(0x999); // Owner of PaymentToken
    address public tokenManagerOwner = address(0x888); // Owner of TokenManager system
    address public paymentTokenManager = address(0x777); // Manager for minting interest payments
    uint256 public constant USDC_AMOUNT = 1000e6; // 1000 USDC with 6 decimals

    function setUp() public {
        // Deploy payment token (USDC) with a specific owner
        vm.startPrank(paymentTokenOwner);
        paymentToken = new PaymentToken();
        vm.stopPrank();
        
        // Deploy platform token
        platformToken = new PlatformToken();
        
        // Deploy mock cUSDC
        mockCUSDC = new MockCToken(address(paymentToken));
        
        // Deploy token manager with a specific owner
        vm.startPrank(tokenManagerOwner);
        tokenManager = new TokenManager(
            address(paymentToken),
            address(platformToken),
            address(mockCUSDC)
        );
        vm.stopPrank();
        
        // Set token manager in platform token
        platformToken.setTokenManager(address(tokenManager));
        
        // Mint USDC for interest payments and testing (by the PaymentToken owner)
        vm.startPrank(paymentTokenOwner);
        paymentToken.mint(paymentTokenManager, 20000000 * 1e6); // 20M USDC for interest payments
        paymentToken.mint(user, 10000e6);
        vm.stopPrank();
    }

    // Helper function to add yield to the MockCompound contract
    // This simulates how Compound V3 would accumulate yield internally
    function addYieldToCompound(uint256 yieldAmount) internal {
        // Advance time to let interest accrue naturally
        vm.warp(block.timestamp + 30 days); // Advance 30 days to accrue interest
        
        // Calculate expected interest for the current period (5% APY)
        uint256 currentBalance = mockCUSDC.balanceOf(address(tokenManager));
        uint256 timeElapsed = 30 days; // 1 month
        uint256 expectedInterest = (currentBalance * 5 * timeElapsed) / (100 * 365 days); // 5% APY
        
        // Add interest payment to MockCompound (simulating borrowers paying interest)
        vm.startPrank(paymentTokenOwner);
        paymentToken.mint(address(mockCUSDC), expectedInterest);
        vm.stopPrank();
    }

    function testDepositUSDC() public {
        vm.startPrank(user);
        
        uint256 initialTokenManagerBalance = tokenManager.getTokenManagerBalance();
        
        paymentToken.approve(address(tokenManager), USDC_AMOUNT);
        tokenManager.depositUSDC(USDC_AMOUNT);
        
        uint256 finalTokenManagerBalance = tokenManager.getTokenManagerBalance();
        
        assertEq(finalTokenManagerBalance, initialTokenManagerBalance + USDC_AMOUNT, "TokenManager balance should increase");
        assertGt(platformToken.balanceOf(user), 0, "User should receive platform tokens");
        
        vm.stopPrank();
    }

    function testWithdrawUSDC() public {
        vm.startPrank(user);
        
        // First deposit
        paymentToken.approve(address(tokenManager), USDC_AMOUNT);
        tokenManager.depositUSDC(USDC_AMOUNT);
        
        uint256 platformTokensReceived = platformToken.balanceOf(user);
        uint256 initialUSDCBalance = paymentToken.balanceOf(user);
        
        // Then withdraw
        tokenManager.withdrawUSDC(platformTokensReceived);
        
        uint256 finalUSDCBalance = paymentToken.balanceOf(user);
        assertGt(finalUSDCBalance, initialUSDCBalance, "User should receive USDC back");
        
        vm.stopPrank();
    }

    function testExchangeRate() public {
        vm.startPrank(user);
        
        uint256 initialRate = tokenManager.getExchangeRateExternal();
        assertEq(initialRate, 1e6, "Initial exchange rate should be 1:1 (in 6 decimals)");
        
        paymentToken.approve(address(tokenManager), USDC_AMOUNT);
        tokenManager.depositUSDC(USDC_AMOUNT);
        
        // Check exchange rate after deposit (should still be 1:1 since no yield)
        uint256 exchangeRate = tokenManager.getExchangeRateExternal();
        assertEq(exchangeRate, 1e6, "Exchange rate should remain 1:1 after deposit without yield (in 6 decimals)");
        
        vm.stopPrank();
    }

    function testEmergencyWithdraw() public {
        vm.startPrank(user);
        paymentToken.approve(address(tokenManager), USDC_AMOUNT);
        tokenManager.depositUSDC(USDC_AMOUNT);
        vm.stopPrank();
        
        uint256 tokenManagerBalance = tokenManager.getTokenManagerBalance();
        assertGt(tokenManagerBalance, 0, "TokenManager should have funds");
        
        vm.startPrank(tokenManagerOwner); // Only TokenManager owner can call emergency withdraw
        tokenManager.emergencyWithdrawUSDC(user, tokenManagerBalance);
        vm.stopPrank();
    }

    function testFailDepositZeroAmount() public {
        vm.startPrank(user);
        paymentToken.approve(address(tokenManager), 0);
        tokenManager.depositUSDC(0);
        vm.stopPrank();
    }

    function testFailWithdrawZeroAmount() public {
        vm.startPrank(user);
        tokenManager.withdrawUSDC(1e18);
        vm.stopPrank();
    }

    function testFailEmergencyWithdrawNotOwner() public {
        vm.startPrank(user);
        tokenManager.emergencyWithdrawUSDC(user, 1000e6);
        vm.stopPrank();
    }

    function testYieldGeneration() public {
        vm.startPrank(user);
        paymentToken.approve(address(tokenManager), USDC_AMOUNT);
        tokenManager.depositUSDC(USDC_AMOUNT);
        vm.stopPrank();
        
        // Add yield to Compound (simulate interest accrual)
        addYieldToCompound(100e6); // Add 100 USDC yield to Compound
        // Note: Interest now accrues automatically based on time
        
        // Check that yield is reflected in the exchange rate
        uint256 tokenManagerBalance = tokenManager.getTokenManagerBalance();
        assertGt(tokenManagerBalance, USDC_AMOUNT, "TokenManager balance should include yield");
        
        // Check exchange rate (should be greater than 1e6 when there's yield)
        uint256 exchangeRate = tokenManager.getExchangeRateExternal();
        assertGt(exchangeRate, 1e6, "Exchange rate should increase with yield (in 6 decimals)");
    }

    function testYieldWithdrawal() public {
        vm.startPrank(user);
        paymentToken.approve(address(tokenManager), USDC_AMOUNT);
        tokenManager.depositUSDC(USDC_AMOUNT);
        vm.stopPrank();
        
        // Simulate yield generation - add yield to the TokenManager address
        addYieldToCompound(100e6); // Add 100 USDC yield to Compound
        
        vm.startPrank(user);
        uint256 platformTokensReceived = platformToken.balanceOf(user);
        tokenManager.withdrawUSDC(platformTokensReceived);
        vm.stopPrank();
    }
} 