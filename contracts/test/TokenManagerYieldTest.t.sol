// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/TokenManager.sol";
import "../src/PlatformToken.sol";
import "../src/PaymentToken.sol";
import "../test/MockCompound.sol";

contract TokenManagerYieldTest is Test {
    TokenManager public tokenManager;
    PlatformToken public platformToken;
    PaymentToken public usdc;
    MockCToken public mockCompound;
    
    address public alice = address(0x1);
    address public bob = address(0x2);
    address public charlie = address(0x3);
    address public paymentTokenManager = address(0x4);
    
    // Test parameters - using realistic Compound V3 behavior
    uint256 public constant YEARLY_YIELD_RATE = 500; // 5% = 500 basis points (0.05 * 10000)
    
    // Tracking variables
    uint256 public totalDeposits;
    uint256 public totalWithdrawals;

    function setUp() public {
        // Deploy payment token (USDC) with a specific owner
        vm.startPrank(paymentTokenManager);
        usdc = new PaymentToken();
        vm.stopPrank();
        
        // Deploy platform token
        platformToken = new PlatformToken();
        
        // Deploy mock compound
        mockCompound = new MockCToken(address(usdc));
        
        // Deploy token manager
        tokenManager = new TokenManager(
            address(usdc),
            address(platformToken),
            address(mockCompound)
        );

        // Set up PlatformToken
        platformToken.setTokenManager(address(tokenManager));

        // Mint USDC for interest payments and testing (by the PaymentToken owner)
        vm.startPrank(paymentTokenManager);
        usdc.mint(paymentTokenManager, 20000000 * 1e6); // 20M USDC
        vm.stopPrank();

        // Approve TokenManager to spend USDC
        vm.startPrank(alice);
        usdc.approve(address(tokenManager), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(bob);
        usdc.approve(address(tokenManager), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(charlie);
        usdc.approve(address(tokenManager), type(uint256).max);
        vm.stopPrank();
    }

    function testFullYearYieldSimulation() public {
        console.log("=== Starting Full Year Yield Simulation ===");
        
        _period0_InitialState();
        _period1_Month1();
        _period2_Month2();
        _period3_Month3();
        _period4_Month4();
        _period5_Month5();
        _period6_Month6();
        _period7_Month7();
        _period8_Month8();
        _period9_Month9();
        _period10_Month10();
        _period11_Month11();
        _period12_Month12();
        
        _finalWithdrawals();
        _validateFinalResults();
    }

    function _period0_InitialState() internal {
        console.log("\n=== Period 0: Initial State ===");
        
        // Give Alice USDC to deposit
        vm.startPrank(paymentTokenManager);
        usdc.mint(alice, 1000 * 1e6);
        vm.stopPrank();
        
        // Alice deposits 1000 USDC
        vm.startPrank(alice);
        tokenManager.depositUSDC(1000 * 1e6);
        vm.stopPrank();
        
        totalDeposits = 1000 * 1e6;
        
        _validatePeriod("Initial deposit");
    }

    function _period1_Month1() internal {
        console.log("\n=== Period 1: Month 1 ===");
        
        // Advance time by 1 month (30 days)
        vm.warp(block.timestamp + 30 days);
        
        // Give Bob USDC to deposit
        vm.startPrank(paymentTokenManager);
        usdc.mint(bob, 500 * 1e6);
        vm.stopPrank();
        
        // Bob deposits 500 USDC
        vm.startPrank(bob);
        tokenManager.depositUSDC(500 * 1e6);
        vm.stopPrank();
        
        totalDeposits += 500 * 1e6;
        
        _validatePeriod("Month 1");
    }

    function _period2_Month2() internal {
        console.log("\n=== Period 2: Month 2 ===");
        
        // Advance time by 1 month
        vm.warp(block.timestamp + 30 days);
        
        // Give Charlie USDC to deposit
        vm.startPrank(paymentTokenManager);
        usdc.mint(charlie, 750 * 1e6);
        vm.stopPrank();
        
        // Charlie deposits 750 USDC
        vm.startPrank(charlie);
        tokenManager.depositUSDC(750 * 1e6);
        vm.stopPrank();
        
        totalDeposits += 750 * 1e6;
        
        _validatePeriod("Month 2");
    }

    function _period3_Month3() internal {
        console.log("\n=== Period 3: Month 3 ===");
        
        // Advance time by 1 month
        vm.warp(block.timestamp + 30 days);
        
        // Alice withdraws 200 USDC worth of platform tokens
        vm.startPrank(alice);
        uint256 alicePlatformTokens = platformToken.balanceOf(alice);
        uint256 tokensToBurn = (alicePlatformTokens * 20) / 100; // 20% of her tokens
        tokenManager.withdrawUSDC(tokensToBurn);
        vm.stopPrank();
        
        totalWithdrawals += 200 * 1e6;
        
        _validatePeriod("Month 3");
    }

    function _period4_Month4() internal {
        console.log("\n=== Period 4: Month 4 ===");
        
        // Advance time by 1 month
        vm.warp(block.timestamp + 30 days);
        
        // Give Bob USDC to deposit
        vm.startPrank(paymentTokenManager);
        usdc.mint(bob, 500 * 1e6);
        vm.stopPrank();
        
        // Bob deposits 500 USDC
        vm.startPrank(bob);
        tokenManager.depositUSDC(500 * 1e6);
        vm.stopPrank();
        
        totalDeposits += 500 * 1e6;
        
        _validatePeriod("Month 4");
    }

    function _period5_Month5() internal {
        console.log("\n=== Period 5: Month 5 ===");
        
        // Advance time by 1 month
        vm.warp(block.timestamp + 30 days);
        
        // Charlie withdraws 100 USDC worth of platform tokens
        vm.startPrank(charlie);
        uint256 charliePlatformTokens = platformToken.balanceOf(charlie);
        uint256 tokensToBurn = (charliePlatformTokens * 10) / 100; // 10% of his tokens
        tokenManager.withdrawUSDC(tokensToBurn);
        vm.stopPrank();
        
        totalWithdrawals += 100 * 1e6;
        
        _validatePeriod("Month 5");
    }

    function _period6_Month6() internal {
        console.log("\n=== Period 6: Month 6 ===");
        
        // Advance time by 1 month
        vm.warp(block.timestamp + 30 days);
        
        // Give Alice USDC to deposit
        vm.startPrank(paymentTokenManager);
        usdc.mint(alice, 300 * 1e6);
        vm.stopPrank();
        
        // Alice deposits 300 USDC
        vm.startPrank(alice);
        tokenManager.depositUSDC(300 * 1e6);
        vm.stopPrank();
        
        totalDeposits += 300 * 1e6;
        
        _validatePeriod("Month 6");
    }

    function _period7_Month7() internal {
        console.log("\n=== Period 7: Month 7 ===");
        
        // Advance time by 1 month
        vm.warp(block.timestamp + 30 days);
        
        // Bob withdraws 300 USDC worth of platform tokens
        vm.startPrank(bob);
        uint256 bobPlatformTokens = platformToken.balanceOf(bob);
        uint256 tokensToBurn = (bobPlatformTokens * 30) / 100; // 30% of his tokens
        tokenManager.withdrawUSDC(tokensToBurn);
        vm.stopPrank();
        
        totalWithdrawals += 300 * 1e6;
        
        _validatePeriod("Month 7");
    }

    function _period8_Month8() internal {
        console.log("\n=== Period 8: Month 8 ===");
        
        // Advance time by 1 month
        vm.warp(block.timestamp + 30 days);
        
        // Give Charlie USDC to deposit
        vm.startPrank(paymentTokenManager);
        usdc.mint(charlie, 400 * 1e6);
        vm.stopPrank();
        
        // Charlie deposits 400 USDC
        vm.startPrank(charlie);
        tokenManager.depositUSDC(400 * 1e6);
        vm.stopPrank();
        
        totalDeposits += 400 * 1e6;
        
        _validatePeriod("Month 8");
    }

    function _period9_Month9() internal {
        console.log("\n=== Period 9: Month 9 ===");
        
        // Advance time by 1 month
        vm.warp(block.timestamp + 30 days);
        
        // Alice withdraws 150 USDC worth of platform tokens
        vm.startPrank(alice);
        uint256 alicePlatformTokens = platformToken.balanceOf(alice);
        uint256 tokensToBurn = (alicePlatformTokens * 15) / 100; // 15% of her tokens
        tokenManager.withdrawUSDC(tokensToBurn);
        vm.stopPrank();
        
        totalWithdrawals += 150 * 1e6;
        
        _validatePeriod("Month 9");
    }

    function _period10_Month10() internal {
        console.log("\n=== Period 10: Month 10 ===");
        
        // Advance time by 1 month
        vm.warp(block.timestamp + 30 days);
        
        // Bob withdraws 200 USDC worth of platform tokens
        vm.startPrank(bob);
        uint256 bobPlatformTokens = platformToken.balanceOf(bob);
        uint256 tokensToBurn = (bobPlatformTokens * 20) / 100; // 20% of his tokens
        tokenManager.withdrawUSDC(tokensToBurn);
        vm.stopPrank();
        
        totalWithdrawals += 200 * 1e6;
        
        _validatePeriod("Month 10");
    }

    function _period11_Month11() internal {
        console.log("\n=== Period 11: Month 11 ===");
        
        // Advance time by 1 month
        vm.warp(block.timestamp + 30 days);
        
        // No deposits or withdrawals, just let interest accrue
        _validatePeriod("Month 11");
    }

    function _period12_Month12() internal {
        console.log("\n=== Period 12: Month 12 ===");
        
        // Advance time by 1 month
        vm.warp(block.timestamp + 30 days);
        
        // No deposits or withdrawals, just let interest accrue
        _validatePeriod("Month 12");
    }

    function _finalWithdrawals() internal {
        console.log("\n=== Final Withdrawals ===");
        
        // All users withdraw everything
        vm.startPrank(alice);
        tokenManager.withdrawAll();
        vm.stopPrank();
        
        vm.startPrank(bob);
        tokenManager.withdrawAll();
        vm.stopPrank();
        
        vm.startPrank(charlie);
        tokenManager.withdrawAll();
        vm.stopPrank();
    }

    function _addInterestPayment() internal {
        // Calculate expected interest for the current period
        // This simulates borrowers paying interest to suppliers
        uint256 currentBalance = mockCompound.balanceOf(address(tokenManager));
        uint256 timeElapsed = 30 days; // 1 month
        uint256 expectedInterest = (currentBalance * 5 * timeElapsed) / (100 * 365 days); // 5% APY
        
        // Add interest payment to MockCompound (simulating borrowers paying interest)
        vm.startPrank(paymentTokenManager);
        usdc.mint(address(mockCompound), expectedInterest);
        vm.stopPrank();
        
        console.log("Added interest payment:", expectedInterest / 1e6, "USDC");
    }


    function _validatePeriod(string memory periodName) internal {
        uint256 exchangeRate = tokenManager.getExchangeRateExternal();
        uint256 compoundBalance = mockCompound.balanceOf(address(tokenManager));
        
        // Debug: Check the values used in exchange rate calculation
        uint256 totalUSDCBalance = tokenManager.getTokenManagerBalance();
        uint256 totalPlatformTokens = tokenManager.getPlatformTokenSupply();
        
        console.log(periodName, ":");
        console.log("  Exchange Rate:", exchangeRate);
        console.log("  Total USDC Balance:", totalUSDCBalance / 1e6, "USDC");
        console.log("  Total Platform Tokens:", totalPlatformTokens / 1e18, "tokens");
        console.log("  TokenManager Compound Balance:", compoundBalance / 1e6, "USDC");
        console.log("  Total Deposits:", totalDeposits / 1e6, "USDC");
        console.log("  Total Withdrawals:", totalWithdrawals / 1e6, "USDC");
        
        // Exchange rate should increase over time due to interest
        assertGe(exchangeRate, 1e6, "Exchange rate should be >= 1.0");
        
        // Add interest payment from borrowers (simulating real Compound V3 behavior)
        _addInterestPayment();
    }

    function _validateFinalResults() internal {
        console.log("\n=== Final Validation ===");
        
        // Debug: Check all balances
        console.log("\n=== Balance Analysis ===");
        console.log("MockCompound USDC balance:", usdc.balanceOf(address(mockCompound)) / 1e6, "USDC");
        console.log("TokenManager USDC balance:", usdc.balanceOf(address(tokenManager)) / 1e6, "USDC");
        console.log("TokenManager Compound balance:", mockCompound.balanceOf(address(tokenManager)) / 1e6, "USDC");
        console.log("MockCompound totalSupply:", mockCompound.totalSupply() / 1e6, "USDC");
        
        // Check that all platform tokens are burned
        assertEq(platformToken.balanceOf(alice), 0, "Alice should have no platform tokens");
        assertEq(platformToken.balanceOf(bob), 0, "Bob should have no platform tokens");
        assertEq(platformToken.balanceOf(charlie), 0, "Charlie should have no platform tokens");
        
        // Get final USDC balances
        uint256 aliceFinalBalance = usdc.balanceOf(alice);
        uint256 bobFinalBalance = usdc.balanceOf(bob);
        uint256 charlieFinalBalance = usdc.balanceOf(charlie);
        
        console.log("\n=== Final User Balances ===");
        console.log("Alice final balance:", aliceFinalBalance / 1e6, "USDC");
        console.log("Bob final balance:", bobFinalBalance / 1e6, "USDC");
        console.log("Charlie final balance:", charlieFinalBalance / 1e6, "USDC");
        
        // Calculate yield correctly: only what they earned through deposits
        // Users should only have what they deposited plus yield, not their starting balances
        uint256 totalFinalBalance = aliceFinalBalance + bobFinalBalance + charlieFinalBalance;
        uint256 netDeposits = 3450 * 1e6; // Actual total deposits: 1000+500+750+500+300+400 = 3450 USDC
        uint256 totalYield = totalFinalBalance - netDeposits;
        
        console.log("\n=== Yield Analysis ===");
        console.log("Total Final Balance:", totalFinalBalance / 1e6, "USDC");
        console.log("Net Deposits:", netDeposits / 1e6, "USDC");
        console.log("Total Yield:", totalYield / 1e6, "USDC");
        console.log("Yield Rate:", (totalYield * 100) / netDeposits, "%");
        
        // Validate that users got more than they deposited (due to yield)
        assertGt(totalFinalBalance, netDeposits, "Users should receive yield");
        
        // The yield rate should be approximately 5% APY
        // For a full year with varying deposit/withdrawal patterns, we expect roughly 5% yield
        uint256 expectedYieldRate = 5; // 5%
        uint256 actualYieldRate = (totalYield * 100) / netDeposits;
        
        console.log("Expected yield rate: ~", expectedYieldRate, "%");
        console.log("Actual yield rate:", actualYieldRate, "%");
        
        // Allow some tolerance for the yield rate (between 3% and 7%)
        assertGe(actualYieldRate, 3, "Yield rate should be at least 3%");
        assertLe(actualYieldRate, 7, "Yield rate should be at most 7%");
    }
}
