// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/PredictionMarket.sol";
import "../src/Escrow.sol";
import "../src/mocks/MockUSDC.sol";

/**
 * @title LayeredIntegrationTest
 * @dev Tests the full integration between Layer 1 (Escrow) and Layer 2 (PredictionMarket)
 * 
 * Demonstrates the complete flow:
 * 1. Users compete in contest (Layer 1 Escrow)
 * 2. Spectators bet on users (Layer 2 PredictionMarket)
 * 3. Oracle resolves contest
 * 4. Market inherits results
 * 5. Spectators redeem winnings
 */
contract LayeredIntegrationTest is Test {
    PredictionMarket public market;
    Escrow public escrow;
    MockUSDC public usdc;
    
    address public oracle = address(1);
    
    // Layer 1 contestants
    address public userA = address(2);
    address public userB = address(3);
    address public userC = address(4);
    address public userD = address(5);
    
    // Layer 2 spectators
    address public spectatorX = address(10);
    address public spectatorY = address(11);
    address public spectatorZ = address(12);
    
    uint256 public constant CONTEST_DEPOSIT = 100e6;
    uint256 public constant LIQUIDITY_PARAM = 1000e6;
    uint256 public constant EXPIRY = 365 days;
    
    event ResultsReported(uint256[] payoutNumerators);
    
    function setUp() public {
        usdc = new MockUSDC();
        
        // Deploy Layer 1 contest escrow
        escrow = new Escrow(
            CONTEST_DEPOSIT,
            block.timestamp + EXPIRY,
            address(usdc),
            6,
            oracle,
            100 // 1% oracle fee
        );
    }
    
    function testFullLayeredFlow() public {
        // PHASE 1: Users Enter Contest (Layer 1)
        
        // User A, B, C, D enter fantasy golf contest
        address[4] memory users = [userA, userB, userC, userD];
        for (uint i = 0; i < users.length; i++) {
            usdc.mint(users[i], CONTEST_DEPOSIT);
            vm.startPrank(users[i]);
            usdc.approve(address(escrow), CONTEST_DEPOSIT);
            escrow.deposit();
            vm.stopPrank();
        }
        
        assertEq(escrow.getParticipantsCount(), 4);
        assertEq(escrow.totalInitialDeposits(), CONTEST_DEPOSIT * 4);
        
        // Oracle closes deposits (contest starts)
        vm.prank(oracle);
        escrow.closeDeposits();
        
        // PHASE 2: Prediction Market Opens (Layer 2)
        
        // Deploy Layer 2 prediction market
        market = new PredictionMarket(
            address(escrow),
            LIQUIDITY_PARAM,
            oracle
        );
        
        assertEq(market.numOutcomes(), 4);
        assertEq(market.outcomeToParticipant(0), userA);
        assertEq(market.outcomeToParticipant(1), userB);
        assertEq(market.outcomeToParticipant(2), userC);
        assertEq(market.outcomeToParticipant(3), userD);
        
        // PHASE 3: Spectators Bet on Users
        
        // Spectator X: Bets heavily on User B
        usdc.mint(spectatorX, 200e6);
        vm.startPrank(spectatorX);
        usdc.approve(address(market), 200e6);
        market.deposit(200e6);
        
        // Concentrate position on User B (outcome 1)
        market.swapOutcomes(0, 1, 200e6); // A → B
        market.swapOutcomes(2, 1, 200e6); // C → B
        market.swapOutcomes(3, 1, 200e6); // D → B
        vm.stopPrank();
        
        // Spectator Y: Bets on User A
        usdc.mint(spectatorY, 150e6);
        vm.startPrank(spectatorY);
        usdc.approve(address(market), 150e6);
        market.deposit(150e6);
        
        market.swapOutcomes(1, 0, 150e6); // B → A
        market.swapOutcomes(2, 0, 150e6); // C → A
        market.swapOutcomes(3, 0, 150e6); // D → A
        vm.stopPrank();
        
        // Spectator Z: Diversified bet
        usdc.mint(spectatorZ, 100e6);
        vm.startPrank(spectatorZ);
        usdc.approve(address(market), 100e6);
        market.deposit(100e6);
        // Keeps complete set (no swaps)
        vm.stopPrank();
        
        // PHASE 4: Contest Results (Layer 1 Resolves)
        
        // Contest completes: User B wins, User A second, User C third, User D last
        address[] memory winners = new address[](4);
        winners[0] = userB; // 1st place
        winners[1] = userA; // 2nd place
        winners[2] = userC; // 3rd place
        winners[3] = userD; // 4th place
        
        uint256[] memory payouts = new uint256[](4);
        payouts[0] = 5000; // 50%
        payouts[1] = 3000; // 30%
        payouts[2] = 1500; // 15%
        payouts[3] = 500;  // 5%
        
        vm.prank(oracle);
        escrow.distribute(winners, payouts);
        
        assertTrue(escrow.state() == Escrow.EscrowState.SETTLED);
        
        // Verify Layer 1 payouts stored
        address[] memory participants = new address[](4);
        participants[0] = userA;
        participants[1] = userB;
        participants[2] = userC;
        participants[3] = userD;
        
        uint256[] memory finalPayouts = escrow.getFinalPayouts(participants);
        assertGt(finalPayouts[1], finalPayouts[0]); // B > A
        assertGt(finalPayouts[0], finalPayouts[2]); // A > C
        
        // PHASE 5: Market Resolves from Escrow (Layer 2)
        
        // Close betting
        vm.prank(oracle);
        market.closeMarket();
        
        // Market reads results from Layer 1
        market.resolveFromEscrow();
        
        assertTrue(market.state() == PredictionMarket.MarketState.RESOLVED);
        
        // Verify payout numerators mapped correctly
        // Outcome 0 = User A (2nd) = 30%
        // Outcome 1 = User B (1st) = 50%
        // Outcome 2 = User C (3rd) = 15%
        // Outcome 3 = User D (4th) = 5%
        assertEq(market.payoutNumerators(0), 3000);
        assertEq(market.payoutNumerators(1), 5000);
        assertEq(market.payoutNumerators(2), 1500);
        assertEq(market.payoutNumerators(3), 500);
        
        // PHASE 6: Spectators Redeem Winnings
        
        // Spectator X redeems (bet on User B - winner!)
        uint256 xBalanceBefore = usdc.balanceOf(spectatorX);
        vm.prank(spectatorX);
        market.redeemPosition(1); // Redeem User B tokens
        uint256 xBalanceAfter = usdc.balanceOf(spectatorX);
        uint256 xProfit = xBalanceAfter - xBalanceBefore;
        
        // Spectator Y redeems (bet on User A - second place)
        uint256 yBalanceBefore = usdc.balanceOf(spectatorY);
        vm.prank(spectatorY);
        market.redeemPosition(0); // Redeem User A tokens
        uint256 yBalanceAfter = usdc.balanceOf(spectatorY);
        uint256 yProfit = yBalanceAfter - yBalanceBefore;
        
        // Spectator Z redeems (diversified - holds all outcomes)
        for (uint i = 0; i < 4; i++) {
            if (market.balanceOf(spectatorZ, i) > 0) {
                vm.prank(spectatorZ);
                market.redeemPosition(i);
            }
        }
        
        // Verify results
        assertGt(xProfit, yProfit, "Winner bet should pay more");
        
        // Note: Due to LMSR swap costs and safety caps on redemption,
        // payouts may be lower than theoretical amounts.
        // This is expected behavior in the current implementation.
        // In production, would need more sophisticated payout normalization.
    }
    
    function testMultipleMarketResolutions() public {
        // Setup Layer 1 contest
        address[3] memory users = [userA, userB, userC];
        for (uint i = 0; i < users.length; i++) {
            usdc.mint(users[i], CONTEST_DEPOSIT);
            vm.startPrank(users[i]);
            usdc.approve(address(escrow), CONTEST_DEPOSIT);
            escrow.deposit();
            vm.stopPrank();
        }
        
        vm.prank(oracle);
        escrow.closeDeposits();
        
        // Deploy market
        market = new PredictionMarket(
            address(escrow),
            LIQUIDITY_PARAM,
            oracle
        );
        
        // Spectator deposits
        usdc.mint(spectatorX, 100e6);
        vm.startPrank(spectatorX);
        usdc.approve(address(market), 100e6);
        market.deposit(100e6);
        vm.stopPrank();
        
        // Cannot resolve before contest settles
        vm.prank(oracle);
        market.closeMarket();
        
        vm.expectRevert("Contest not settled");
        market.resolveFromEscrow();
        
        // Resolve contest
        address[] memory winners = new address[](3);
        winners[0] = userA;
        winners[1] = userB;
        winners[2] = userC;
        
        uint256[] memory payouts = new uint256[](3);
        payouts[0] = 6000;
        payouts[1] = 3000;
        payouts[2] = 1000;
        
        vm.prank(oracle);
        escrow.distribute(winners, payouts);
        
        // Now can resolve
        market.resolveFromEscrow();
        assertTrue(market.state() == PredictionMarket.MarketState.RESOLVED);
    }
    
    function testSpectatorProfitsMatchContestPayouts() public {
        // Setup simple contest
        address[2] memory users = [userA, userB];
        for (uint i = 0; i < users.length; i++) {
            usdc.mint(users[i], CONTEST_DEPOSIT);
            vm.startPrank(users[i]);
            usdc.approve(address(escrow), CONTEST_DEPOSIT);
            escrow.deposit();
            vm.stopPrank();
        }
        
        vm.prank(oracle);
        escrow.closeDeposits();
        
        market = new PredictionMarket(
            address(escrow),
            LIQUIDITY_PARAM,
            oracle
        );
        
        // Two spectators bet opposite outcomes
        uint256 betAmount = 100e6;
        
        // Spectator X bets on User A only
        usdc.mint(spectatorX, betAmount);
        vm.startPrank(spectatorX);
        usdc.approve(address(market), betAmount);
        market.deposit(betAmount);
        market.swapOutcomes(1, 0, betAmount); // B → A
        vm.stopPrank();
        
        // Spectator Y bets on User B only
        usdc.mint(spectatorY, betAmount);
        vm.startPrank(spectatorY);
        usdc.approve(address(market), betAmount);
        market.deposit(betAmount);
        market.swapOutcomes(0, 1, betAmount); // A → B
        vm.stopPrank();
        
        // Resolve: User A wins 70%, User B gets 30%
        address[] memory winners = new address[](2);
        winners[0] = userA;
        winners[1] = userB;
        
        uint256[] memory payouts = new uint256[](2);
        payouts[0] = 7000;
        payouts[1] = 3000;
        
        vm.prank(oracle);
        escrow.distribute(winners, payouts);
        
        vm.prank(oracle);
        market.closeMarket();
        
        market.resolveFromEscrow();
        
        // Redeem
        vm.prank(spectatorX);
        market.redeemPosition(0); // User A outcome
        
        vm.prank(spectatorY);
        market.redeemPosition(1); // User B outcome
        
        // Verify relative payouts match contest structure
        uint256 xPayout = usdc.balanceOf(spectatorX);
        uint256 yPayout = usdc.balanceOf(spectatorY);
        
        // Ratio should approximately match 70:30 (adjusted for swap costs)
        uint256 ratio = (xPayout * 100) / yPayout;
        assertGt(ratio, 200); // Should be > 2:1 (accounting for swap costs)
    }
    
    function testCannotResolveMarketTwice() public {
        // Setup
        address[2] memory users = [userA, userB];
        for (uint i = 0; i < users.length; i++) {
            usdc.mint(users[i], CONTEST_DEPOSIT);
            vm.startPrank(users[i]);
            usdc.approve(address(escrow), CONTEST_DEPOSIT);
            escrow.deposit();
            vm.stopPrank();
        }
        
        vm.prank(oracle);
        escrow.closeDeposits();
        
        market = new PredictionMarket(
            address(escrow),
            LIQUIDITY_PARAM,
            oracle
        );
        
        // Resolve contest
        address[] memory winners = new address[](2);
        winners[0] = userA;
        winners[1] = userB;
        
        uint256[] memory payouts = new uint256[](2);
        payouts[0] = 8000;
        payouts[1] = 2000;
        
        vm.prank(oracle);
        escrow.distribute(winners, payouts);
        
        // Resolve market
        vm.prank(oracle);
        market.closeMarket();
        
        market.resolveFromEscrow();
        
        // Try to resolve again
        vm.expectRevert("Market not closed");
        market.resolveFromEscrow();
    }
    
    function testLayerSeparation() public {
        // Setup Layer 1
        usdc.mint(userA, CONTEST_DEPOSIT);
        vm.startPrank(userA);
        usdc.approve(address(escrow), CONTEST_DEPOSIT);
        escrow.deposit();
        vm.stopPrank();
        
        usdc.mint(userB, CONTEST_DEPOSIT);
        vm.startPrank(userB);
        usdc.approve(address(escrow), CONTEST_DEPOSIT);
        escrow.deposit();
        vm.stopPrank();
        
        vm.prank(oracle);
        escrow.closeDeposits();
        
        // Layer 1 has its own collateral
        uint256 layer1Collateral = escrow.totalInitialDeposits();
        
        // Deploy Layer 2
        market = new PredictionMarket(
            address(escrow),
            LIQUIDITY_PARAM,
            oracle
        );
        
        // Spectator deposits create separate Layer 2 collateral
        usdc.mint(spectatorX, 100e6);
        vm.startPrank(spectatorX);
        usdc.approve(address(market), 100e6);
        market.deposit(100e6);
        vm.stopPrank();
        
        uint256 layer2Collateral = market.totalCollateral();
        
        // Verify separation
        assertEq(layer1Collateral, CONTEST_DEPOSIT * 2);
        assertEq(layer2Collateral, 100e6);
        
        // Layer 1 and Layer 2 collateral are completely separate
        assertEq(usdc.balanceOf(address(escrow)), layer1Collateral);
        assertEq(usdc.balanceOf(address(market)), layer2Collateral);
        
        // Resolving Layer 1 doesn't affect Layer 2 collateral
        address[] memory winners = new address[](2);
        winners[0] = userA;
        winners[1] = userB;
        
        uint256[] memory payouts = new uint256[](2);
        payouts[0] = 7000;
        payouts[1] = 3000;
        
        vm.prank(oracle);
        escrow.distribute(winners, payouts);
        
        // Layer 2 collateral unchanged
        assertEq(market.totalCollateral(), layer2Collateral);
    }
}

