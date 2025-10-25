// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/PredictionMarket.sol";
import "../src/Escrow.sol";
import "../src/mocks/MockUSDC.sol";

/**
 * @title PredictionMarketLMSRTest
 * @dev Tests focused on LMSR pricing mechanics
 */
contract PredictionMarketLMSRTest is Test {
    PredictionMarket public market;
    Escrow public escrow;
    MockUSDC public usdc;
    
    address public oracle = address(1);
    address public userA = address(2);
    address public userB = address(3);
    address public userC = address(4);
    address public spectator = address(5);
    
    uint256 public constant DEPOSIT_AMOUNT = 100e6;
    uint256 public constant LIQUIDITY_PARAM = 1000e6;
    uint256 public constant EXPIRY = 365 days;
    
    function setUp() public {
        usdc = new MockUSDC();
        
        // Deploy and setup Layer 1 escrow
        escrow = new Escrow(
            DEPOSIT_AMOUNT,
            block.timestamp + EXPIRY,
            address(usdc),
            6,
            oracle,
            100
        );
        
        // Three users compete
        address[3] memory users = [userA, userB, userC];
        for (uint i = 0; i < users.length; i++) {
            usdc.mint(users[i], DEPOSIT_AMOUNT);
            vm.startPrank(users[i]);
            usdc.approve(address(escrow), DEPOSIT_AMOUNT);
            escrow.deposit();
            vm.stopPrank();
        }
        
        vm.prank(oracle);
        escrow.closeDeposits();
        
        // Deploy Layer 2 market
        market = new PredictionMarket(
            address(escrow),
            LIQUIDITY_PARAM,
            oracle
        );
    }
    
    function testLMSRCostIncreasesWithDemand() public {
        uint256 swapAmount = 50e6;
        
        // Initial cost should be 0 (no net position)
        uint256 cost0 = market.calculateLMSRCost(0, 1, swapAmount);
        assertEq(cost0, 0, "Initial cost should be 0");
        
        // Make first swap
        usdc.mint(spectator, 100e6);
        vm.startPrank(spectator);
        usdc.approve(address(market), 100e6);
        market.deposit(100e6);
        market.swapOutcomes(0, 1, swapAmount);
        vm.stopPrank();
        
        // Cost for next swap should be higher
        uint256 cost1 = market.calculateLMSRCost(0, 1, swapAmount);
        assertGt(cost1, cost0, "Cost should increase after first swap");
        
        // Make second swap
        vm.prank(spectator);
        market.swapOutcomes(2, 1, swapAmount);
        
        // Cost for third swap should be even higher
        uint256 cost2 = market.calculateLMSRCost(0, 1, swapAmount);
        assertGt(cost2, cost1, "Cost should keep increasing");
    }
    
    function testLMSRCostScalesWithAmount() public {
        usdc.mint(spectator, 500e6);
        vm.startPrank(spectator);
        usdc.approve(address(market), 500e6);
        market.deposit(500e6);
        
        // Establish some demand
        market.swapOutcomes(0, 1, 100e6);
        vm.stopPrank();
        
        // Cost should scale roughly linearly with amount
        uint256 cost1 = market.calculateLMSRCost(2, 1, 50e6);
        uint256 cost2 = market.calculateLMSRCost(2, 1, 100e6);
        
        // cost2 should be approximately 2x cost1
        assertGt(cost2, cost1);
        assertApproxEqRel(cost2, cost1 * 2, 0.1e18); // Within 10%
    }
    
    function testLMSRLiquidityParameterEffect() public {
        // Deploy market with low liquidity parameter (steeper curve)
        PredictionMarket steepMarket = new PredictionMarket(
            address(escrow),
            100e6, // Lower liquidity param
            oracle
        );
        
        // Deploy market with high liquidity parameter (flatter curve)
        PredictionMarket flatMarket = new PredictionMarket(
            address(escrow),
            10000e6, // Higher liquidity param
            oracle
        );
        
        // Setup both markets with same demand
        address[2] memory markets = [address(steepMarket), address(flatMarket)];
        for (uint i = 0; i < markets.length; i++) {
            usdc.mint(spectator, 200e6);
            vm.startPrank(spectator);
            usdc.approve(markets[i], 200e6);
            PredictionMarket(markets[i]).deposit(100e6);
            PredictionMarket(markets[i]).swapOutcomes(0, 1, 50e6);
            vm.stopPrank();
        }
        
        // Steep market should have higher cost for same swap
        uint256 steepCost = steepMarket.calculateLMSRCost(2, 1, 50e6);
        uint256 flatCost = flatMarket.calculateLMSRCost(2, 1, 50e6);
        
        assertGt(steepCost, flatCost, "Steep curve should have higher cost");
    }
    
    function testLMSRNetPositionTracking() public {
        usdc.mint(spectator, 300e6);
        vm.startPrank(spectator);
        usdc.approve(address(market), 300e6);
        market.deposit(300e6);
        
        // Initial net positions should be 0
        assertEq(market.netPosition(0), 0);
        assertEq(market.netPosition(1), 0);
        assertEq(market.netPosition(2), 0);
        
        // Swap A → B (100 USDC)
        uint256 received1 = market.balanceOf(spectator, 1);
        market.swapOutcomes(0, 1, 100e6);
        received1 = market.balanceOf(spectator, 1) - received1;
        
        // Net position should update
        assertEq(market.netPosition(0), -100e6, "Outcome 0 should be negative");
        assertEq(market.netPosition(1), int256(received1), "Outcome 1 should be positive");
        
        vm.stopPrank();
    }
    
    function testLMSRSymmetricSwaps() public {
        usdc.mint(spectator, 200e6);
        vm.startPrank(spectator);
        usdc.approve(address(market), 200e6);
        market.deposit(200e6);
        
        // Swap A → B
        uint256 balanceB = market.balanceOf(spectator, 1);
        market.swapOutcomes(0, 1, 100e6);
        uint256 receivedB = market.balanceOf(spectator, 1) - balanceB;
        
        // Swap B → A (swap back)
        uint256 balanceA = market.balanceOf(spectator, 0);
        market.swapOutcomes(1, 0, receivedB);
        uint256 receivedA = market.balanceOf(spectator, 0) - balanceA;
        
        vm.stopPrank();
        
        // Due to swap costs, we should have less than we started with
        assertLt(receivedA, 100e6, "Roundtrip should have cost");
        
        // But net positions should approximately cancel
        int256 netA = market.netPosition(0);
        int256 netB = market.netPosition(1);
        
        // Should be close to 0 (within swap costs)
        assertLt(abs(netA), 20e6);
        assertLt(abs(netB), 20e6);
    }
    
    function testLMSRBoundedByCollateral() public {
        usdc.mint(spectator, 100e6);
        vm.startPrank(spectator);
        usdc.approve(address(market), 100e6);
        market.deposit(100e6);
        
        // Even with extreme swaps, we can't create more value than deposited
        market.swapOutcomes(0, 1, 100e6);
        market.swapOutcomes(2, 1, 100e6);
        
        uint256 totalTokensHeld = market.balanceOf(spectator, 0) 
            + market.balanceOf(spectator, 1) 
            + market.balanceOf(spectator, 2);
        
        // Total tokens held should be less than 3x deposit (due to swap costs)
        assertLt(totalTokensHeld, 300e6);
        // But should be more than 1x deposit (conservation of value minus costs)
        assertGt(totalTokensHeld, 100e6);
        
        vm.stopPrank();
    }
    
    function testLMSRMultipleSpectatorsCompeting() public {
        address spectator2 = address(6);
        
        // Spectator 1 bets on User B
        usdc.mint(spectator, 100e6);
        vm.startPrank(spectator);
        usdc.approve(address(market), 100e6);
        market.deposit(100e6);
        market.swapOutcomes(0, 1, 100e6); // A → B
        vm.stopPrank();
        
        // Spectator 2 also wants to bet on User B
        usdc.mint(spectator2, 100e6);
        vm.startPrank(spectator2);
        usdc.approve(address(market), 100e6);
        market.deposit(100e6);
        
        // Same swap should cost more now due to spectator 1's demand
        uint256 balanceBefore = market.balanceOf(spectator2, 1);
        market.swapOutcomes(0, 1, 100e6); // A → B
        uint256 received = market.balanceOf(spectator2, 1) - balanceBefore;
        
        vm.stopPrank();
        
        // Spectator 2 should receive less than spectator 1 due to increased cost
        uint256 spectator1Received = market.balanceOf(spectator, 1) - 100e6;
        assertLt(received, spectator1Received, "Later buyers pay more");
    }
    
    function testLMSRCostNeverExceedsAmount() public {
        usdc.mint(spectator, 500e6);
        vm.startPrank(spectator);
        usdc.approve(address(market), 500e6);
        market.deposit(500e6);
        
        // Even with extreme demand, cost should never exceed amount
        for (uint i = 0; i < 10; i++) {
            uint256 cost = market.calculateLMSRCost(0, 1, 50e6);
            assertLt(cost, 50e6, "Cost should always be less than amount");
            
            if (market.balanceOf(spectator, 0) >= 50e6) {
                market.swapOutcomes(0, 1, 50e6);
            }
        }
        
        vm.stopPrank();
    }
    
    function testLMSRPricingConsistency() public {
        usdc.mint(spectator, 300e6);
        vm.startPrank(spectator);
        usdc.approve(address(market), 300e6);
        market.deposit(300e6);
        
        // Calculate cost for 100 USDC swap
        uint256 costAll = market.calculateLMSRCost(0, 1, 100e6);
        
        // Do two 50 USDC swaps
        uint256 cost1 = market.calculateLMSRCost(0, 1, 50e6);
        market.swapOutcomes(0, 1, 50e6);
        uint256 cost2 = market.calculateLMSRCost(0, 1, 50e6);
        
        vm.stopPrank();
        
        // Two smaller swaps should cost more total due to curve
        assertGt(cost1 + cost2, costAll, "Smaller swaps cost more total");
    }
    
    function testImpliedProbabilityChangesWithDemand() public {
        // Initially equal probability (should be ~3333 basis points each for 3 outcomes)
        uint256 prob0Initial = market.getImpliedProbability(0);
        uint256 prob1Initial = market.getImpliedProbability(1);
        
        assertEq(prob0Initial, prob1Initial);
        
        // Create demand for outcome 1
        usdc.mint(spectator, 300e6);
        vm.startPrank(spectator);
        usdc.approve(address(market), 300e6);
        market.deposit(300e6);
        market.swapOutcomes(0, 1, 100e6);
        market.swapOutcomes(2, 1, 100e6);
        vm.stopPrank();
        
        // Probability should shift
        uint256 prob0After = market.getImpliedProbability(0);
        uint256 prob1After = market.getImpliedProbability(1);
        uint256 prob2After = market.getImpliedProbability(2);
        
        assertGt(prob1After, prob0After, "Outcome 1 should have higher probability");
        assertGt(prob1After, prob2After, "Outcome 1 should have higher probability");
        assertLt(prob0After, prob0Initial, "Outcome 0 probability should decrease");
    }
    
    // Helper function for absolute value
    function abs(int256 x) internal pure returns (uint256) {
        return x >= 0 ? uint256(x) : uint256(-x);
    }
}

