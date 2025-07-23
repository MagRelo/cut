// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Treasury.sol";
import "../src/PlatformToken.sol";
import "../src/PaymentToken.sol";
import "./MockCompound.sol";

contract TreasuryTest is Test {
    Treasury public treasury;
    PlatformToken public platformToken;
    PaymentToken public usdcToken;
    address public owner;
    address public user;
    uint256 public constant USDC_AMOUNT = 1000e6; // 1000 USDC with 6 decimals
    MockCToken public mockCUSDC;

    function setUp() public {
        owner = address(this);
        user = address(0x1);
        platformToken = new PlatformToken();
        usdcToken = new PaymentToken();
        mockCUSDC = new MockCToken(address(usdcToken));
        // Mint a large amount of USDC to the MockCToken contract
        usdcToken.mint(address(mockCUSDC), 1_000_000_001e6);
        treasury = new Treasury(
            address(usdcToken),
            address(platformToken),
            address(mockCUSDC)
        );
        // Set treasury in platform token
        platformToken.setTreasury(address(treasury));
        // Mint USDC to user
        usdcToken.mint(user, USDC_AMOUNT);
    }

    function testDepositUSDC() public {
        vm.startPrank(user);
        
        uint256 initialBalance = platformToken.balanceOf(user);
        uint256 initialTreasuryBalance = treasury.getTreasuryBalance();
        
        usdcToken.approve(address(treasury), USDC_AMOUNT);
        treasury.depositUSDC(USDC_AMOUNT);
        
        uint256 finalBalance = platformToken.balanceOf(user);
        uint256 finalTreasuryBalance = treasury.getTreasuryBalance();
        
        assertGt(finalBalance, initialBalance, "Platform tokens should be minted");
        assertEq(finalTreasuryBalance, initialTreasuryBalance + USDC_AMOUNT, "Treasury balance should increase");
        
        vm.stopPrank();
    }

    function testWithdrawUSDC() public {
        // First deposit
        vm.startPrank(user);
        usdcToken.approve(address(treasury), USDC_AMOUNT);
        treasury.depositUSDC(USDC_AMOUNT);
        
        uint256 platformTokensReceived = platformToken.balanceOf(user);
        uint256 initialUSDCBalance = usdcToken.balanceOf(user);
        
        // Then withdraw
        treasury.withdrawUSDC(platformTokensReceived);
        
        uint256 finalUSDCBalance = usdcToken.balanceOf(user);
        uint256 finalPlatformTokens = platformToken.balanceOf(user);
        
        assertGt(finalUSDCBalance, initialUSDCBalance, "USDC should be returned");
        assertEq(finalPlatformTokens, 0, "Platform tokens should be burned");
        
        vm.stopPrank();
    }

    function testExchangeRate() public {
        uint256 initialRate = treasury.getExchangeRate();
        assertEq(initialRate, 1e18, "Initial rate should be 1:1");
        
        vm.startPrank(user);
        usdcToken.approve(address(treasury), USDC_AMOUNT);
        treasury.depositUSDC(USDC_AMOUNT);
        vm.stopPrank();
        
        uint256 newRate = treasury.getExchangeRate();
        assertEq(newRate, 1e18, "Rate should be 1e18 after first deposit");
    }

    function testEmergencyWithdraw() public {
        vm.startPrank(user);
        usdcToken.approve(address(treasury), USDC_AMOUNT);
        treasury.depositUSDC(USDC_AMOUNT);
        vm.stopPrank();
        
        uint256 treasuryBalance = treasury.getTreasuryBalance();
        assertGt(treasuryBalance, 0, "Treasury should have funds");
        
        vm.startPrank(owner);
        treasury.emergencyWithdrawUSDC(user, treasuryBalance);
        vm.stopPrank();
        
        uint256 userBalance = usdcToken.balanceOf(user);
        assertGe(userBalance, USDC_AMOUNT, "User should receive emergency withdrawal");
    }

    function testFailDepositZeroAmount() public {
        vm.startPrank(user);
        usdcToken.approve(address(treasury), 0);
        treasury.depositUSDC(0);
        vm.stopPrank();
    }

    function testFailWithdrawInsufficientTokens() public {
        vm.startPrank(user);
        treasury.withdrawUSDC(1e18);
        vm.stopPrank();
    }

    function testFailEmergencyWithdrawNotOwner() public {
        vm.startPrank(user);
        treasury.emergencyWithdrawUSDC(user, 1000e6);
        vm.stopPrank();
    }

    function testCompoundYield() public {
        // First deposit
        vm.startPrank(user);
        usdcToken.approve(address(treasury), USDC_AMOUNT);
        treasury.depositUSDC(USDC_AMOUNT);
        vm.stopPrank();
        
        // Simulate yield by increasing exchange rate
        uint256 yieldAmount = 100e6; // 100 USDC yield
        vm.prank(address(treasury));
        mockCUSDC.addYield(yieldAmount);
        
        // Check that treasury balance includes yield
        uint256 treasuryBalance = treasury.getTreasuryBalance();
        assertGt(treasuryBalance, USDC_AMOUNT, "Treasury balance should include yield");
        
        // Check that exchange rate has increased
        uint256 exchangeRate = treasury.getExchangeRate();
        assertGt(exchangeRate, 1e18, "Exchange rate should increase with yield");
    }

    function testWithdrawWithYield() public {
        // First deposit
        vm.startPrank(user);
        usdcToken.approve(address(treasury), USDC_AMOUNT);
        treasury.depositUSDC(USDC_AMOUNT);
        
        uint256 platformTokensReceived = platformToken.balanceOf(user);
        vm.stopPrank();
        
        // Simulate yield
        uint256 yieldAmount = 50e6; // 50 USDC yield
        vm.prank(address(treasury));
        mockCUSDC.addYield(yieldAmount);
        
        // Withdraw with yield
        vm.startPrank(user);
        uint256 initialUSDCBalance = usdcToken.balanceOf(user);
        treasury.withdrawUSDC(platformTokensReceived);
        uint256 finalUSDCBalance = usdcToken.balanceOf(user);
        vm.stopPrank();
        
        // User should receive more USDC than originally deposited due to yield
        // Allow for a 1 USDC (1e-6) rounding difference
        assertGt(finalUSDCBalance, initialUSDCBalance + USDC_AMOUNT, "User should receive yield");
    }
} 