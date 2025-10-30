// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Contest.sol";
import "../src/mocks/MockUSDC.sol";

/**
 * @title ContestTest - Updated for Entry-Based System
 * @dev Tests for the entry-based Contest contract
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
    
    // Entry IDs for testing
    uint256 public constant ENTRY_A1 = 1000;
    uint256 public constant ENTRY_A2 = 1001; // Second entry for userA
    uint256 public constant ENTRY_B = 1002;
    uint256 public constant ENTRY_C = 1003;
    
    uint256 public constant PRIMARY_DEPOSIT = 100e6;
    uint256 public constant ORACLE_FEE = 100; // 1%
    uint256 public constant LIQUIDITY = 1000e6;
    uint256 public constant DEMAND_SENSITIVITY = 500; // 5%
    uint256 public constant PRIZE_SHARE = 750; // 7.5%
    uint256 public constant USER_SHARE = 750; // 7.5%
    uint256 public constant EXPIRY = 365 days;
    
    // Empty merkle proof for tests (no gating)
    bytes32[] emptyProof;
    
    function setUp() public {
        usdc = new MockUSDC();
        
        contest = new Contest(
            address(usdc),
            oracle,
            PRIMARY_DEPOSIT,
            ORACLE_FEE,
            block.timestamp + EXPIRY,
            LIQUIDITY,
            DEMAND_SENSITIVITY,
            PRIZE_SHARE,
            USER_SHARE
        );
    }
    
    function testBasicEntryFlow() public {
        // UserA joins with one entry
        usdc.mint(userA, PRIMARY_DEPOSIT);
        vm.startPrank(userA);
        usdc.approve(address(contest), PRIMARY_DEPOSIT);
        contest.addPrimaryPosition(ENTRY_A1, emptyProof);
        vm.stopPrank();
        
        assertEq(contest.getEntriesCount(), 1);
        assertEq(contest.entryOwner(ENTRY_A1), userA);
        assertEq(contest.getUserPrimaryPositionsCount(userA), 1);
        // Oracle fee (1%) deducted at deposit time
        uint256 expectedPool = PRIMARY_DEPOSIT - (PRIMARY_DEPOSIT * ORACLE_FEE) / 10000;
        assertEq(contest.primaryPrizePool(), expectedPool);
    }
    
    function testMultipleEntriesPerUser() public {
        // UserA joins with TWO entries
        usdc.mint(userA, PRIMARY_DEPOSIT * 2);
        vm.startPrank(userA);
        usdc.approve(address(contest), PRIMARY_DEPOSIT * 2);
        contest.addPrimaryPosition(ENTRY_A1, emptyProof);
        contest.addPrimaryPosition(ENTRY_A2, emptyProof);
        vm.stopPrank();
        
        // Verify both entries exist
        assertEq(contest.getEntriesCount(), 2);
        assertEq(contest.entryOwner(ENTRY_A1), userA);
        assertEq(contest.entryOwner(ENTRY_A2), userA);
        assertEq(contest.getUserPrimaryPositionsCount(userA), 2);
        // Oracle fee (1%) deducted at deposit time for each entry
        uint256 expectedPool = (PRIMARY_DEPOSIT * 2) - ((PRIMARY_DEPOSIT * 2) * ORACLE_FEE) / 10000;
        assertEq(contest.primaryPrizePool(), expectedPool);
        
        // Verify userA owns both entries
        assertEq(contest.getUserPrimaryPositionAtIndex(userA, 0), ENTRY_A1);
        assertEq(contest.getUserPrimaryPositionAtIndex(userA, 1), ENTRY_A2);
    }
    
    function testSpectatorPredictsOnEntryId() public {
        // Setup entries
        usdc.mint(userA, PRIMARY_DEPOSIT);
        vm.prank(userA);
        usdc.approve(address(contest), PRIMARY_DEPOSIT);
        vm.prank(userA);
        contest.addPrimaryPosition(ENTRY_A1, emptyProof);
        
        usdc.mint(userB, PRIMARY_DEPOSIT);
        vm.prank(userB);
        usdc.approve(address(contest), PRIMARY_DEPOSIT);
        vm.prank(userB);
        contest.addPrimaryPosition(ENTRY_B, emptyProof);
        
        vm.prank(oracle);
        contest.activatePrimary();
        
        // Spectator predicts on ENTRY_B (using ID directly!)
        usdc.mint(spectator1, 100e6);
        vm.startPrank(spectator1);
        usdc.approve(address(contest), 100e6);
        contest.addSecondaryPosition(ENTRY_B, 100e6, emptyProof);
        vm.stopPrank();
        
        // Spectator receives ERC1155 tokens with ID = ENTRY_B
        uint256 balance = contest.balanceOf(spectator1, ENTRY_B);
        assertGt(balance, 0, "Should have tokens for entry");
    }
    
    function testSettlementWithSameUserMultipleWins() public {
        // UserA enters with 2 entries, UserB with 1
        usdc.mint(userA, PRIMARY_DEPOSIT * 2);
        vm.startPrank(userA);
        usdc.approve(address(contest), PRIMARY_DEPOSIT * 2);
        contest.addPrimaryPosition(ENTRY_A1, emptyProof);
        contest.addPrimaryPosition(ENTRY_A2, emptyProof);
        vm.stopPrank();
        
        usdc.mint(userB, PRIMARY_DEPOSIT);
        vm.prank(userB);
        usdc.approve(address(contest), PRIMARY_DEPOSIT);
        vm.prank(userB);
        contest.addPrimaryPosition(ENTRY_B, emptyProof);
        
        vm.prank(oracle);
        contest.activatePrimary();
        
        // Settle: ENTRY_A1 wins 50%, ENTRY_A2 gets 30%, ENTRY_B gets 20%
        // Note: Only include entries with payouts > 0
        uint256[] memory winningEntries = new uint256[](3);
        winningEntries[0] = ENTRY_A1;
        winningEntries[1] = ENTRY_A2;
        winningEntries[2] = ENTRY_B;
        
        uint256[] memory payoutBps = new uint256[](3);
        payoutBps[0] = 5000;  // 50%
        payoutBps[1] = 3000;  // 30%
        payoutBps[2] = 2000;  // 20%
        
        vm.prank(oracle);
        contest.settleContest(winningEntries, payoutBps);

        // Settlement is pure accounting - users must claim
        uint256 userABalanceBefore = usdc.balanceOf(userA);
        
        // UserA claims both entries
        vm.startPrank(userA);
        contest.claimPrimaryPayout(ENTRY_A1);
        contest.claimPrimaryPayout(ENTRY_A2);
        vm.stopPrank();
        
        uint256 userABalanceAfter = usdc.balanceOf(userA);
        assertGt(userABalanceAfter - userABalanceBefore, 0, "UserA should receive combined payout");
    }
    
    function testSpectatorWinningEntry() public {
        // Setup 3 entries
        usdc.mint(userA, PRIMARY_DEPOSIT);
        vm.prank(userA);
        usdc.approve(address(contest), PRIMARY_DEPOSIT);
        vm.prank(userA);
        contest.addPrimaryPosition(ENTRY_A1, emptyProof);
        
        usdc.mint(userB, PRIMARY_DEPOSIT);
        vm.prank(userB);
        usdc.approve(address(contest), PRIMARY_DEPOSIT);
        vm.prank(userB);
        contest.addPrimaryPosition(ENTRY_B, emptyProof);
        
        usdc.mint(userC, PRIMARY_DEPOSIT);
        vm.prank(userC);
        usdc.approve(address(contest), PRIMARY_DEPOSIT);
        vm.prank(userC);
        contest.addPrimaryPosition(ENTRY_C, emptyProof);
        
        vm.prank(oracle);
        contest.activatePrimary();
        
        // Spectators predict
        usdc.mint(spectator1, 100e6);
        vm.prank(spectator1);
        usdc.approve(address(contest), 100e6);
        vm.prank(spectator1);
        contest.addSecondaryPosition(ENTRY_B, 100e6, emptyProof); // Predicts winner
        
        usdc.mint(spectator2, 100e6);
        vm.prank(spectator2);
        usdc.approve(address(contest), 100e6);
        vm.prank(spectator2);
        contest.addSecondaryPosition(ENTRY_A1, 100e6, emptyProof); // Predicts loser
        
        // ENTRY_B wins
        uint256[] memory winningEntries = new uint256[](3);
        winningEntries[0] = ENTRY_B; // Winner
        winningEntries[1] = ENTRY_A1;
        winningEntries[2] = ENTRY_C;
        
        uint256[] memory payoutBps = new uint256[](3);
        payoutBps[0] = 6000;
        payoutBps[1] = 3000;
        payoutBps[2] = 1000;
        
        vm.prank(oracle);
        contest.settleContest(winningEntries, payoutBps);
        
        // Verify winning entry
        assertEq(contest.secondaryWinningEntry(), ENTRY_B);
        
        // Spectator1 (predicted winner) can claim
        uint256 spec1Before = usdc.balanceOf(spectator1);
        vm.prank(spectator1);
        contest.claimSecondaryPayout(ENTRY_B);
        assertGt(usdc.balanceOf(spectator1), spec1Before, "Winner should get payout");
        
        // Spectator2 (predicted loser) gets nothing
        uint256 spec2Before = usdc.balanceOf(spectator2);
        vm.prank(spectator2);
        contest.claimSecondaryPayout(ENTRY_A1);
        assertEq(usdc.balanceOf(spectator2), spec2Before, "Loser gets nothing");
    }
    
    function testLeaveContestWithEntry() public {
        // User joins
        usdc.mint(userA, PRIMARY_DEPOSIT);
        vm.prank(userA);
        usdc.approve(address(contest), PRIMARY_DEPOSIT);
        vm.prank(userA);
        contest.addPrimaryPosition(ENTRY_A1, emptyProof);
        
        // User leaves
        uint256 balanceBefore = usdc.balanceOf(userA);
        vm.prank(userA);
        contest.removePrimaryPosition(ENTRY_A1);
        
        // Verify refund
        assertEq(usdc.balanceOf(userA), balanceBefore + PRIMARY_DEPOSIT);
        assertTrue(contest.entryWithdrawn(ENTRY_A1), "Entry should be marked withdrawn");
        
        // Entry still exists in array (for stability)
        assertEq(contest.getEntriesCount(), 1);
    }
    
    function testWithdrawPredictionByEntry() public {
        // Setup
        usdc.mint(userA, PRIMARY_DEPOSIT);
        vm.prank(userA);
        usdc.approve(address(contest), PRIMARY_DEPOSIT);
        vm.prank(userA);
        contest.addPrimaryPosition(ENTRY_A1, emptyProof);
        
        // Spectator predicts BEFORE activation (during OPEN state)
        usdc.mint(spectator1, 100e6);
        vm.prank(spectator1);
        usdc.approve(address(contest), 100e6);
        vm.prank(spectator1);
        contest.addSecondaryPosition(ENTRY_A1, 100e6, emptyProof);
        
        uint256 tokens = contest.balanceOf(spectator1, ENTRY_A1);
        
        // Withdraw BEFORE activation (only allowed in OPEN state)
        uint256 balanceBefore = usdc.balanceOf(spectator1);
        vm.prank(spectator1);
        contest.removeSecondaryPosition(ENTRY_A1, tokens);
        
        // Full refund
        assertEq(usdc.balanceOf(spectator1), balanceBefore + 100e6, "Full refund");
        assertEq(contest.balanceOf(spectator1, ENTRY_A1), 0, "Tokens burned");
    }
    
    function testCannotWithdrawPredictionAfterActivation() public {
        // Setup
        usdc.mint(userA, PRIMARY_DEPOSIT);
        vm.prank(userA);
        usdc.approve(address(contest), PRIMARY_DEPOSIT);
        vm.prank(userA);
        contest.addPrimaryPosition(ENTRY_A1, emptyProof);
        
        // Spectator predicts in OPEN state
        usdc.mint(spectator1, 100e6);
        vm.prank(spectator1);
        usdc.approve(address(contest), 100e6);
        vm.prank(spectator1);
        contest.addSecondaryPosition(ENTRY_A1, 100e6, emptyProof);
        
        uint256 tokens = contest.balanceOf(spectator1, ENTRY_A1);
        
        // Activate contest
        vm.prank(oracle);
        contest.activatePrimary();
        
        // Try to withdraw after activation - should fail
        vm.prank(spectator1);
        vm.expectRevert("Cannot withdraw - competition started or settled");
        contest.removeSecondaryPosition(ENTRY_A1, tokens);
    }
    
    function testCannotPredictOnWithdrawnEntry() public {
        // User joins and withdraws
        usdc.mint(userA, PRIMARY_DEPOSIT);
        vm.prank(userA);
        usdc.approve(address(contest), PRIMARY_DEPOSIT);
        vm.prank(userA);
        contest.addPrimaryPosition(ENTRY_A1, emptyProof);
        
        vm.prank(userA);
        contest.removePrimaryPosition(ENTRY_A1);
        
        // Try to predict on withdrawn entry
        usdc.mint(spectator1, 100e6);
        vm.prank(spectator1);
        usdc.approve(address(contest), 100e6);
        vm.prank(spectator1);
        vm.expectRevert("Entry withdrawn");
        contest.addSecondaryPosition(ENTRY_A1, 100e6, emptyProof);
    }
    
    function testCalculateEntryPrice() public {
        // Setup entry
        usdc.mint(userA, PRIMARY_DEPOSIT);
        vm.prank(userA);
        usdc.approve(address(contest), PRIMARY_DEPOSIT);
        vm.prank(userA);
        contest.addPrimaryPosition(ENTRY_A1, emptyProof);
        
        // Get initial price
        uint256 initialPrice = contest.calculateSecondaryPrice(ENTRY_A1);
        assertEq(initialPrice, 1e6, "Initial price should be 1.0 (PRICE_PRECISION)");
    }
    
    function testSweepToTreasuryAfterExpiry() public {
        // Setup 2 entries, both owned by userA
        usdc.mint(userA, PRIMARY_DEPOSIT * 2);
        vm.startPrank(userA);
        usdc.approve(address(contest), PRIMARY_DEPOSIT * 2);
        contest.addPrimaryPosition(ENTRY_A1, emptyProof);
        contest.addPrimaryPosition(ENTRY_A2, emptyProof);
        vm.stopPrank();
        
        vm.prank(oracle);
        contest.activatePrimary();
        
        // Settle
        uint256[] memory winningEntries = new uint256[](2);
        winningEntries[0] = ENTRY_A1;
        winningEntries[1] = ENTRY_A2;
        
        uint256[] memory payoutBps = new uint256[](2);
        payoutBps[0] = 6000;
        payoutBps[1] = 4000;
        
        vm.prank(oracle);
        contest.settleContest(winningEntries, payoutBps);
        
        // User doesn't claim - funds remain in contract
        uint256 contractBalance = usdc.balanceOf(address(contest));
        assertGt(contractBalance, 0, "Contract should have funds");
        
        // Fast forward past expiry
        vm.warp(block.timestamp + EXPIRY + 1);
        
        // Sweep unclaimed funds to treasury
        uint256 oracleBalanceBefore = usdc.balanceOf(oracle);
        vm.prank(oracle);
        contest.sweepToTreasury();

        // All unclaimed funds swept to oracle
        assertEq(usdc.balanceOf(oracle) - oracleBalanceBefore, contractBalance, "Oracle should receive all unclaimed funds");
        assertEq(uint256(contest.state()), uint256(Contest.ContestState.CLOSED));
        assertEq(usdc.balanceOf(address(contest)), 0, "Contract should have zero balance");
    }
}

