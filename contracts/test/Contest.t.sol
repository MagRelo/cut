// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Contest.sol";
import "../src/mocks/MockUSDC.sol";

/**
 * @title ContestTest
 * @dev Tests for the combined Contest contract (Escrow + PredictionMarket in one)
 */
contract ContestTest is Test {
    Contest public contest;
    MockUSDC public usdc;
    
    address public oracle = address(1);
    address public userA = address(2);
    address public userB = address(3);
    address public userC = address(4);
    address public spectator1 = address(10);
    address public spectator2 = address(11);
    
    uint256 public constant CONTESTANT_DEPOSIT = 100e6;
    uint256 public constant ORACLE_FEE = 100; // 1%
    uint256 public constant LIQUIDITY = 1000e6;
    uint256 public constant DEMAND_SENSITIVITY = 500; // 5%
    uint256 public constant EXPIRY = 365 days;
    
    function setUp() public {
        usdc = new MockUSDC();
        
        contest = new Contest(
            address(usdc),
            oracle,
            CONTESTANT_DEPOSIT,
            ORACLE_FEE,
            block.timestamp + EXPIRY,
            LIQUIDITY,
            DEMAND_SENSITIVITY
        );
    }
    
    function testFullFlow() public {
        // ============ Phase 1: Contestants Enter ============
        
        address[3] memory contestants = [userA, userB, userC];
        for (uint i = 0; i < contestants.length; i++) {
            usdc.mint(contestants[i], CONTESTANT_DEPOSIT);
            vm.startPrank(contestants[i]);
            usdc.approve(address(contest), CONTESTANT_DEPOSIT);
            contest.joinContest();
            vm.stopPrank();
        }
        
        assertEq(contest.getContestantsCount(), 3);
        assertEq(contest.totalContestantDeposits(), CONTESTANT_DEPOSIT * 3);
        
        // ============ Phase 2: Oracle Starts Contest ============
        
        vm.prank(oracle);
        contest.startContest();
        
        assertEq(uint256(contest.state()), uint256(Contest.ContestState.IN_PROGRESS));
        
        // ============ Phase 3: Spectators Bet ============
        
        // 6 spectators bet on User B ($600 total)
        for (uint i = 0; i < 6; i++) {
            address spectator = address(uint160(100 + i));
            usdc.mint(spectator, 100e6);
            vm.startPrank(spectator);
            usdc.approve(address(contest), 100e6);
            contest.addPrediction(1, 100e6); // Bet on User B (index 1)
            vm.stopPrank();
        }
        
        // 3 spectators bet on User A ($300 total)
        for (uint i = 6; i < 9; i++) {
            address spectator = address(uint160(100 + i));
            usdc.mint(spectator, 100e6);
            vm.startPrank(spectator);
            usdc.approve(address(contest), 100e6);
            contest.addPrediction(0, 100e6); // Bet on User A (index 0)
            vm.stopPrank();
        }
        
        // 1 spectator bets on User C ($100 total)
        address spectator10 = address(uint160(109));
        usdc.mint(spectator10, 100e6);
        vm.startPrank(spectator10);
        usdc.approve(address(contest), 100e6);
        contest.addPrediction(2, 100e6); // Bet on User C (index 2)
        vm.stopPrank();
        
        // Total spectator deposits: $1,000
        // Fees: $150 (15%)
        // Collateral: $850
        
        // ============ Phase 4: ONE Oracle Call Settles Everything! ============
        
        address[] memory winners = new address[](3);
        winners[0] = userB;  // 1st place
        winners[1] = userA;  // 2nd place
        winners[2] = userC;  // 3rd place
        
        uint256[] memory payoutBps = new uint256[](3);
        payoutBps[0] = 6000;  // 60%
        payoutBps[1] = 3000;  // 30%
        payoutBps[2] = 1000;  // 10%
        
        vm.prank(oracle);
        contest.distribute(winners, payoutBps);
        
        // State should be SETTLED
        assertEq(uint256(contest.state()), uint256(Contest.ContestState.SETTLED));
        assertTrue(contest.spectatorMarketResolved());
        
        // Layer 2 winner should be outcome 1 (User B - highest Layer 1 payout)
        assertEq(contest.spectatorWinningOutcome(), 1);
        
        // ============ Phase 5: Contestants Claim Layer 1 Prizes ============
        
        uint256 userBBalanceBefore = usdc.balanceOf(userB);
        vm.prank(userB);
        contest.claimContestPayout();
        uint256 userBPayout = usdc.balanceOf(userB) - userBBalanceBefore;
        
        // Layer 1 pool: $300 (contestant deposits) + $75 (spectator prize bonus) = $375
        // After oracle fee (1%): $375 * 0.99 = $371.25
        // User B (60%): $371.25 * 0.60 = $222.75
        assertApproxEqAbs(userBPayout, 222.75e6, 1e6);
        
        // ============ Phase 6: Spectators Claim Layer 2 Winnings ============
        
        // User B bettors (winners) should get ALL spectator collateral ($850)
        address firstWinner = address(uint160(100));
        uint256 winnerBalanceBefore = usdc.balanceOf(firstWinner);
        uint256 winnerTokens = contest.balanceOf(firstWinner, 1);
        
        vm.prank(firstWinner);
        contest.claimPredictionPayout(1);
        
        uint256 winnerPayout = usdc.balanceOf(firstWinner) - winnerBalanceBefore;
        assertGt(winnerPayout, 0, "Winner should get payout");
        
        // User A bettor (loser) should get nothing
        address loser = address(uint160(106));
        uint256 loserBalanceBefore = usdc.balanceOf(loser);
        
        vm.prank(loser);
        contest.claimPredictionPayout(0);
        
        uint256 loserPayout = usdc.balanceOf(loser) - loserBalanceBefore;
        assertEq(loserPayout, 0, "Loser gets nothing (winner-take-all)");
    }
    
    function testWithdrawBeforeSettlement() public {
        // Contestant enters
        usdc.mint(userA, CONTESTANT_DEPOSIT);
        vm.startPrank(userA);
        usdc.approve(address(contest), CONTESTANT_DEPOSIT);
        contest.joinContest();
        vm.stopPrank();
        
        usdc.mint(userB, CONTESTANT_DEPOSIT);
        vm.startPrank(userB);
        usdc.approve(address(contest), CONTESTANT_DEPOSIT);
        contest.joinContest();
        vm.stopPrank();
        
        vm.prank(oracle);
        contest.startContest();
        
        // Spectator bets on User B
        usdc.mint(spectator1, 100e6);
        vm.startPrank(spectator1);
        usdc.approve(address(contest), 100e6);
        contest.addPrediction(1, 100e6); // Bet on User B
        
        uint256 tokensReceived = contest.balanceOf(spectator1, 1);
        uint256 balanceBefore = usdc.balanceOf(spectator1);
        
        // Withdraw all tokens (should get 100% refund)
        contest.withdrawPrediction(1, tokensReceived);
        
        uint256 balanceAfter = usdc.balanceOf(spectator1);
        
        // Should get full $100 back (including entry fee!)
        assertEq(balanceAfter - balanceBefore, 100e6, "Should get full refund");
        
        vm.stopPrank();
    }
    
    function testLMSRPricing() public {
        // Setup contest
        usdc.mint(userA, CONTESTANT_DEPOSIT);
        vm.prank(userA);
        usdc.approve(address(contest), CONTESTANT_DEPOSIT);
        vm.prank(userA);
        contest.joinContest();
        
        usdc.mint(userB, CONTESTANT_DEPOSIT);
        vm.prank(userB);
        usdc.approve(address(contest), CONTESTANT_DEPOSIT);
        vm.prank(userB);
        contest.joinContest();
        
        vm.prank(oracle);
        contest.startContest();
        
        // First bettor on User B
        usdc.mint(spectator1, 100e6);
        vm.prank(spectator1);
        usdc.approve(address(contest), 100e6);
        vm.prank(spectator1);
        contest.addPrediction(1, 100e6);
        
        uint256 tokens1 = contest.balanceOf(spectator1, 1);
        
        // Second bettor on User B (should get fewer tokens - higher price)
        usdc.mint(spectator2, 100e6);
        vm.prank(spectator2);
        usdc.approve(address(contest), 100e6);
        vm.prank(spectator2);
        contest.addPrediction(1, 100e6);
        
        uint256 tokens2 = contest.balanceOf(spectator2, 1);
        
        // Later bettor should get fewer tokens due to LMSR
        assertLt(tokens2, tokens1, "LMSR should increase price");
    }
    
    function testCloseBetting() public {
        // Setup contest
        usdc.mint(userA, CONTESTANT_DEPOSIT);
        vm.prank(userA);
        usdc.approve(address(contest), CONTESTANT_DEPOSIT);
        vm.prank(userA);
        contest.joinContest();
        
        usdc.mint(userB, CONTESTANT_DEPOSIT);
        vm.prank(userB);
        usdc.approve(address(contest), CONTESTANT_DEPOSIT);
        vm.prank(userB);
        contest.joinContest();
        
        vm.prank(oracle);
        contest.startContest();
        
        // Betting should be open
        assertTrue(contest.bettingOpen());
        
        // Spectator can bet
        usdc.mint(spectator1, 100e6);
        vm.prank(spectator1);
        usdc.approve(address(contest), 100e6);
        vm.prank(spectator1);
        contest.addPrediction(0, 100e6);
        
        // Oracle closes betting (e.g., final round starts)
        vm.prank(oracle);
        contest.closeBetting();
        
        assertFalse(contest.bettingOpen());
        
        // New bets should fail
        usdc.mint(spectator2, 100e6);
        vm.prank(spectator2);
        usdc.approve(address(contest), 100e6);
        vm.prank(spectator2);
        vm.expectRevert("Betting closed");
        contest.addPrediction(1, 100e6);
        
        // Withdrawals should also fail
        vm.prank(spectator1);
        vm.expectRevert("Betting closed - cannot withdraw");
        contest.withdrawPrediction(0, 10e6);
    }
    
    function testEarlyBetting() public {
        // Spectators can bet even before contest starts!
        
        // First contestant joins
        usdc.mint(userA, CONTESTANT_DEPOSIT);
        vm.prank(userA);
        usdc.approve(address(contest), CONTESTANT_DEPOSIT);
        vm.prank(userA);
        contest.joinContest();
        
        // State is still OPEN
        assertEq(uint256(contest.state()), uint256(Contest.ContestState.OPEN));
        
        // Spectator bets on User A BEFORE contest starts
        usdc.mint(spectator1, 100e6);
        vm.prank(spectator1);
        usdc.approve(address(contest), 100e6);
        vm.prank(spectator1);
        contest.addPrediction(0, 100e6); // Bet on User A
        
        uint256 earlyTokens = contest.balanceOf(spectator1, 0);
        assertGt(earlyTokens, 0, "Should receive tokens during OPEN state");
        
        // Second contestant joins
        usdc.mint(userB, CONTESTANT_DEPOSIT);
        vm.prank(userB);
        usdc.approve(address(contest), CONTESTANT_DEPOSIT);
        vm.prank(userB);
        contest.joinContest();
        
        // Another spectator bets (still OPEN)
        usdc.mint(spectator2, 100e6);
        vm.prank(spectator2);
        usdc.approve(address(contest), 100e6);
        vm.prank(spectator2);
        contest.addPrediction(1, 100e6); // Bet on User B
        
        // Early bettor can also withdraw before contest starts
        uint256 balanceBefore = usdc.balanceOf(spectator1);
        vm.prank(spectator1);
        contest.withdrawPrediction(0, earlyTokens);
        
        // Should get full refund even in OPEN state
        assertEq(usdc.balanceOf(spectator1) - balanceBefore, 100e6, "Full refund in OPEN state");
    }
    
    function testCancelledStateRefunds() public {
        // Setup contest with contestants
        usdc.mint(userA, CONTESTANT_DEPOSIT);
        vm.prank(userA);
        usdc.approve(address(contest), CONTESTANT_DEPOSIT);
        vm.prank(userA);
        contest.joinContest();
        
        usdc.mint(userB, CONTESTANT_DEPOSIT);
        vm.prank(userB);
        usdc.approve(address(contest), CONTESTANT_DEPOSIT);
        vm.prank(userB);
        contest.joinContest();
        
        // Start contest
        vm.prank(oracle);
        contest.startContest();
        
        // Spectators bet
        usdc.mint(spectator1, 100e6);
        vm.prank(spectator1);
        usdc.approve(address(contest), 100e6);
        vm.prank(spectator1);
        contest.addPrediction(0, 100e6);
        
        usdc.mint(spectator2, 200e6);
        vm.prank(spectator2);
        usdc.approve(address(contest), 200e6);
        vm.prank(spectator2);
        contest.addPrediction(1, 200e6);
        
        // Oracle cancels contest
        vm.prank(oracle);
        contest.cancel();
        
        assertEq(uint256(contest.state()), uint256(Contest.ContestState.CANCELLED));
        
        // Contestants can withdraw
        uint256 userABalanceBefore = usdc.balanceOf(userA);
        vm.prank(userA);
        contest.leaveContest();
        assertEq(usdc.balanceOf(userA) - userABalanceBefore, CONTESTANT_DEPOSIT, "Contestant full refund");
        
        // Spectators can withdraw (100% refund including fees!)
        uint256 spec1BalanceBefore = usdc.balanceOf(spectator1);
        uint256 spec1Tokens = contest.balanceOf(spectator1, 0);
        vm.prank(spectator1);
        contest.withdrawPrediction(0, spec1Tokens);
        assertEq(usdc.balanceOf(spectator1) - spec1BalanceBefore, 100e6, "Spectator full refund");
        
        uint256 spec2BalanceBefore = usdc.balanceOf(spectator2);
        uint256 spec2Tokens = contest.balanceOf(spectator2, 1);
        vm.prank(spectator2);
        contest.withdrawPrediction(1, spec2Tokens);
        assertEq(usdc.balanceOf(spectator2) - spec2BalanceBefore, 200e6, "Spectator full refund");
    }
    
    function testExpiredContestRefunds() public {
        // Setup contest
        usdc.mint(userA, CONTESTANT_DEPOSIT);
        vm.prank(userA);
        usdc.approve(address(contest), CONTESTANT_DEPOSIT);
        vm.prank(userA);
        contest.joinContest();
        
        vm.prank(oracle);
        contest.startContest();
        
        // Spectator bets
        usdc.mint(spectator1, 100e6);
        vm.prank(spectator1);
        usdc.approve(address(contest), 100e6);
        vm.prank(spectator1);
        contest.addPrediction(0, 100e6);
        
        // Fast forward past expiry
        vm.warp(block.timestamp + EXPIRY + 1);
        
        // Anyone can cancel expired contest
        contest.cancelExpired();
        
        assertEq(uint256(contest.state()), uint256(Contest.ContestState.CANCELLED));
        
        // Everyone can withdraw
        uint256 userABefore = usdc.balanceOf(userA);
        vm.prank(userA);
        contest.leaveContest();
        assertEq(usdc.balanceOf(userA) - userABefore, CONTESTANT_DEPOSIT);
        
        uint256 spec1Before = usdc.balanceOf(spectator1);
        uint256 tokens = contest.balanceOf(spectator1, 0);
        vm.prank(spectator1);
        contest.withdrawPrediction(0, tokens);
        assertEq(usdc.balanceOf(spectator1) - spec1Before, 100e6);
    }
    
    function testOracleWorkflow() public {
        // This test demonstrates the SIMPLIFIED oracle workflow
        
        // Setup: 3 contestants enter
        address[3] memory users = [userA, userB, userC];
        for (uint i = 0; i < users.length; i++) {
            usdc.mint(users[i], CONTESTANT_DEPOSIT);
            vm.startPrank(users[i]);
            usdc.approve(address(contest), CONTESTANT_DEPOSIT);
            contest.joinContest();
            vm.stopPrank();
        }
        
        // Oracle starts contest
        vm.prank(oracle);
        contest.startContest();
        
        // Spectators bet
        usdc.mint(spectator1, 100e6);
        vm.prank(spectator1);
        usdc.approve(address(contest), 100e6);
        vm.prank(spectator1);
        contest.addPrediction(1, 100e6);
        
        // ============ ORACLE SETTLEMENT: ONE CALL! ============
        
        address[] memory winners = new address[](3);
        winners[0] = userB;
        winners[1] = userA;
        winners[2] = userC;
        
        uint256[] memory payouts = new uint256[](3);
        payouts[0] = 6000;
        payouts[1] = 3000;
        payouts[2] = 1000;
        
        vm.prank(oracle);
        contest.distribute(winners, payouts);
        
        // ============ DONE! Both layers settled ============
        
        // Verify Layer 1 ready
        assertGt(contest.finalContestantPayouts(userB), 0);
        
        // Verify Layer 2 ready
        assertTrue(contest.spectatorMarketResolved());
        assertEq(contest.spectatorWinningOutcome(), 1); // User B won
        
        // Users can claim immediately
        vm.prank(userB);
        contest.claimContestPayout();
        assertGt(usdc.balanceOf(userB), 0);
        
        vm.prank(spectator1);
        contest.claimPredictionPayout(1);
        assertGt(usdc.balanceOf(spectator1), 0);
    }
}

