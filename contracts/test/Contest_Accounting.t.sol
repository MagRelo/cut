// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Contest.sol";
import "../src/mocks/MockUSDC.sol";

contract ContestAccountingTest is Test {
    Contest public contest;
    MockUSDC public usdc;

    address public oracle = address(0x01);
    address public a = address(0xA1);
    address public b = address(0xB1);
    address public c = address(0xC1);
    address public s1 = address(0x51);
    address public s2 = address(0x52);

    uint256 public constant ENTRY_A = 1001;
    uint256 public constant ENTRY_B = 1002;
    uint256 public constant ENTRY_C = 1003;

    uint256 public constant PRIMARY_DEPOSIT = 100e6; // 6 decimals (USDC-like)
    uint256 public constant ORACLE_FEE_BPS = 100; // 1%
    uint256 public constant LIQUIDITY = 1000e6;
    uint256 public constant DEMAND_SENSITIVITY = 500; // 5%
    uint256 public constant PRIZE_SHARE_BPS = 750; // 7.5%
    uint256 public constant USER_SHARE_BPS = 750; // 7.5%
    uint256 public constant EXPIRY = 7 days;
    uint256 public constant TARGET_PRIMARY_SHARE_BPS = 5000;
    uint256 public constant MAX_CROSS_SUBSIDY_BPS = 0;

    // Empty merkle proof for tests (no gating)
    bytes32[] emptyProof;

    function setUp() public {
        usdc = new MockUSDC();
        contest = new Contest(
            address(usdc),
            oracle,
            PRIMARY_DEPOSIT,
            ORACLE_FEE_BPS,
            block.timestamp + EXPIRY,
            LIQUIDITY,
            DEMAND_SENSITIVITY,
            PRIZE_SHARE_BPS,
            USER_SHARE_BPS,
            TARGET_PRIMARY_SHARE_BPS,
            MAX_CROSS_SUBSIDY_BPS
        );
    }

    // ============ Cross-subsidy mechanics test ============
    // Tests: Primary deposit exceeds target → Cross-subsidy to secondary → Withdrawal reverses subsidy
    function testDynamicCrossSubsidyRespectsCap() public {
        uint256 targetShare = 6000; // 60% primary target
        uint256 maxCross = 2000; // 20% cap per deposit
        Contest dynamicContest = _createContest(targetShare, maxCross);

        // Primary joins
        uint256 oracleFee = (PRIMARY_DEPOSIT * ORACLE_FEE_BPS) / 10000; // 1%
        uint256 netDeposit = PRIMARY_DEPOSIT - oracleFee;
        uint256 expectedCross = (netDeposit * maxCross) / 10000; // capped at 20%

        usdc.mint(a, PRIMARY_DEPOSIT);
        vm.startPrank(a);
        usdc.approve(address(dynamicContest), PRIMARY_DEPOSIT);
        dynamicContest.addPrimaryPosition(ENTRY_A, emptyProof);
        vm.stopPrank();
        _assertBalanceSheetReconciliation(dynamicContest);

        assertEq(dynamicContest.primaryPrizePool(), netDeposit - expectedCross);
        assertEq(dynamicContest.secondaryPrizePool(), expectedCross);
        assertEq(dynamicContest.primaryToSecondarySubsidy(ENTRY_A), expectedCross);

        // Withdrawal reverses both base contribution and cross-subsidy
        uint256 beforeBalance = usdc.balanceOf(a);
        vm.prank(a);
        dynamicContest.removePrimaryPosition(ENTRY_A);
        _assertBalanceSheetReconciliation(dynamicContest);

        assertEq(dynamicContest.primaryPrizePool(), 0);
        assertEq(dynamicContest.secondaryPrizePool(), 0);
        assertEq(dynamicContest.primaryToSecondarySubsidy(ENTRY_A), 0);
        assertEq(usdc.balanceOf(a), beforeBalance + PRIMARY_DEPOSIT);
    }

    function testSettlementSplitsPrimarySubsidy() public {
        Contest dynamicContest = _createContest(9000, 2000); // high target, allow 20% subsidy

        usdc.mint(a, PRIMARY_DEPOSIT);
        vm.startPrank(a);
        usdc.approve(address(dynamicContest), PRIMARY_DEPOSIT);
        dynamicContest.addPrimaryPosition(ENTRY_A, emptyProof);
        vm.stopPrank();
        _assertBalanceSheetReconciliation(dynamicContest);

        uint256 spectatorAmount = 100e6;
        usdc.mint(s1, spectatorAmount);
        vm.startPrank(s1);
        usdc.approve(address(dynamicContest), spectatorAmount);
        dynamicContest.addSecondaryPosition(ENTRY_A, spectatorAmount, emptyProof);
        vm.stopPrank();
        _assertBalanceSheetReconciliation(dynamicContest);

        vm.prank(oracle);
        dynamicContest.activateContest();
        _assertBalanceSheetReconciliation(dynamicContest);

        uint256[] memory winners = new uint256[](1);
        winners[0] = ENTRY_A;
        uint256[] memory bps = new uint256[](1);
        bps[0] = 10000;

        vm.prank(oracle);
        dynamicContest.settleContest(winners, bps);
        _assertBalanceSheetReconciliation(dynamicContest);

        // Primary deposit: net 99, target 89.1, so 9.9 cross-subsidy to secondary
        // Secondary deposit: net 99, max subsidy 19.8, so 19.8 cross-subsidy back to primary
        uint256 primaryCrossSubsidy = 9900000; // 9.9 from primary to secondary (9.9 * 1e6)
        uint256 secondaryCrossSubsidy = 19800000; // 19.8 from secondary to primary (19.8 * 1e6)
        uint256 expectedBonus = secondaryCrossSubsidy / 2; // 9.9 - split 50/50 by share bps
        uint256 expectedPrizeSubsidy = secondaryCrossSubsidy - expectedBonus; // 9.9

        uint256 expectedPrimaryPrizePool = 99000000 - primaryCrossSubsidy; // 99 - 9.9 = 89.1
        assertEq(dynamicContest.primaryPrizePool(), expectedPrimaryPrizePool);
        assertEq(dynamicContest.primaryPrizePoolSubsidy(), expectedPrizeSubsidy);
        assertEq(dynamicContest.primaryPositionSubsidy(ENTRY_A), expectedBonus);

        uint256 expectedPrizePayout = expectedPrimaryPrizePool + expectedPrizeSubsidy; // 89.1 + 9.9 = 99
        assertEq(dynamicContest.primaryPrizePoolPayouts(ENTRY_A), expectedPrizePayout);

        uint256 before = usdc.balanceOf(a);
        vm.prank(a);
        dynamicContest.claimPrimaryPayout(ENTRY_A);
        assertEq(usdc.balanceOf(a) - before, expectedPrizePayout + expectedBonus); // 99 + 9.9 = 108.9
        _assertBalanceSheetReconciliation(dynamicContest);
    }

    // ============ Helpers ============

    function _mintAndApprove(address user, uint256 amount) internal {
        usdc.mint(user, amount);
        vm.startPrank(user);
        usdc.approve(address(contest), amount);
        vm.stopPrank();
    }

    function _join(address user, uint256 entryId) internal {
        _mintAndApprove(user, PRIMARY_DEPOSIT);
        vm.prank(user);
        contest.addPrimaryPosition(entryId, emptyProof);
    }

    function _specDeposit(address user, uint256 entryId, uint256 amount) internal returns (uint256 tokens) {
        _mintAndApprove(user, amount);
        vm.prank(user);
        contest.addSecondaryPosition(entryId, amount, emptyProof);
        tokens = contest.balanceOf(user, entryId);
    }

    function _createContest(uint256 targetShareBps, uint256 maxCrossSubsidyBps) internal returns (Contest) {
        return new Contest(
            address(usdc),
            oracle,
            PRIMARY_DEPOSIT,
            ORACLE_FEE_BPS,
            block.timestamp + EXPIRY,
            LIQUIDITY,
            DEMAND_SENSITIVITY,
            PRIZE_SHARE_BPS,
            USER_SHARE_BPS,
            targetShareBps,
            maxCrossSubsidyBps
        );
    }

    function _activate() internal {
        vm.prank(oracle);
        contest.activateContest();
    }

    function _settle(uint256[] memory winners, uint256[] memory bps) internal {
        vm.prank(oracle);
        contest.settleContest(winners, bps);
    }

    /// @notice Forensic accounting: Validate balance sheet reconciliation
    /// Contract balance must equal sum of all tracked accounting variables
    /// BEFORE settlement: funds in pools
    /// AFTER settlement: funds still in pools (payouts are claims against pools)
    /// AFTER claims: pools reduced by claimed amounts
    function _assertBalanceSheetReconciliation(Contest testContest) internal {
        uint256 contractBalance = usdc.balanceOf(address(testContest));

        // Sum all tracked funds in contract accounting
        uint256 trackedBalance = testContest.primaryPrizePool() +
                               testContest.secondaryPrizePool() +
                               testContest.primaryPrizePoolSubsidy() +
                               testContest.totalPrimaryPositionSubsidies() +
                               testContest.accumulatedOracleFee();

        assertEq(contractBalance, trackedBalance,
                "Balance sheet reconciliation failed - funds unaccounted for");
    }

    // ============ S1: Basic primary-only contest flow ============
    // Tests: Primary deposits → Oracle fee deduction → Settlement → Payout claims → Zero balance
    function testS1_NoSpectators_AllPrizeToWinner_OracleFeeFromContestants() public {
        // Arrange: 3 contestants deposit
        _join(a, ENTRY_A);
        _assertBalanceSheetReconciliation(contest);
        _join(b, ENTRY_B);
        _assertBalanceSheetReconciliation(contest);
        _join(c, ENTRY_C);
        _assertBalanceSheetReconciliation(contest);

        // Activate and settle 100% to A
        _activate();
        _assertBalanceSheetReconciliation(contest);

        uint256[] memory winners = new uint256[](1);
        winners[0] = ENTRY_A;
        uint256[] memory bps = new uint256[](1);
        bps[0] = 10000; // 100%

        _settle(winners, bps);
        _assertBalanceSheetReconciliation(contest);

        // Settlement is pure accounting - no transfers yet
        assertEq(usdc.balanceOf(address(contest)), 300e6);

        // totalPoolL1 = 3 * 100 = 300
        uint256 oracleFee = (300e6 * ORACLE_FEE_BPS) / 10000; // 3e6
        uint256 layer1AfterFee = 300e6 - oracleFee; // 297e6

        // Contestants and oracle claim
        uint256 beforeA = usdc.balanceOf(a);
        vm.prank(a);
        contest.claimPrimaryPayout(ENTRY_A);
        _assertBalanceSheetReconciliation(contest);
        assertEq(usdc.balanceOf(a) - beforeA, layer1AfterFee);

        uint256 beforeOracle = usdc.balanceOf(oracle);
        vm.prank(oracle);
        contest.claimOracleFee();
        _assertBalanceSheetReconciliation(contest);
        assertEq(usdc.balanceOf(oracle) - beforeOracle, oracleFee);

        // Contract should hold 0 after all claims
        assertEq(usdc.balanceOf(address(contest)), 0);
    }

    // ============ S2: Full dual-market flow with spectators ============
    // Tests: Primary + secondary deposits → Settlement redistribution → Dual payouts → Zero balance
    function testS2_SpectatorsSplit_DepositsFeesBonusesAndCollateral() public {
        // 3 contestants
        _join(a, ENTRY_A);
        _join(b, ENTRY_B);
        _join(c, ENTRY_C);

        _activate();

        // Spectators: 100 on A, 200 on B
        uint256 specA = 100e6;
        uint256 specB = 200e6;

        uint256 tA = _specDeposit(s1, ENTRY_A, specA);
        uint256 tB = _specDeposit(s2, ENTRY_B, specB);
        assertGt(tA, 0);
        assertGt(tB, 0);

        // Settle [60,30,10] with A first (winner for spectators)
        uint256[] memory winners = new uint256[](3);
        winners[0] = ENTRY_A;
        winners[1] = ENTRY_B;
        winners[2] = ENTRY_C;
        uint256[] memory bps = new uint256[](3);
        bps[0] = 6000;
        bps[1] = 3000;
        bps[2] = 1000;

        _settle(winners, bps);

        uint256 contestantDepositsAfterFee = 300e6 - (300e6 * ORACLE_FEE_BPS) / 10000; // 297e6
        uint256 layer1Pool = contestantDepositsAfterFee; // No subsidy contribution pre-settlement

        uint256 payoutA = (layer1Pool * 6000) / 10000; // 178.2e6
        uint256 payoutB = (layer1Pool * 3000) / 10000; // 89.1e6
        uint256 payoutC = (layer1Pool * 1000) / 10000; // 29.7e6

        uint256 aBefore = usdc.balanceOf(a);
        vm.prank(a);
        contest.claimPrimaryPayout(ENTRY_A);
        assertEq(usdc.balanceOf(a) - aBefore, payoutA);

        uint256 bBefore = usdc.balanceOf(b);
        vm.prank(b);
        contest.claimPrimaryPayout(ENTRY_B);
        assertEq(usdc.balanceOf(b) - bBefore, payoutB);

        uint256 cBefore = usdc.balanceOf(c);
        vm.prank(c);
        contest.claimPrimaryPayout(ENTRY_C);
        assertEq(usdc.balanceOf(c) - cBefore, payoutC);

        // Oracle claims fee (accumulated from all deposits)
        // Contestant deposits: 300 * 1% = 3
        // Spectator deposits: 300 * 1% = 3
        // Total oracle fee = 6
        uint256 totalOracleFee = ((300e6 + 300e6) * ORACLE_FEE_BPS) / 10000; // 6e6
        uint256 oracleBefore = usdc.balanceOf(oracle);
        vm.prank(oracle);
        contest.claimOracleFee();
        assertEq(usdc.balanceOf(oracle) - oracleBefore, totalOracleFee);

        // Spectator pool winner claims
        uint256 s1Tokens = contest.balanceOf(s1, ENTRY_A);
        uint256 totalSupplyA = uint256(contest.netPosition(ENTRY_A));
        assertEq(s1Tokens, totalSupplyA);

        uint256 s1Before = usdc.balanceOf(s1);
        uint256 secondaryPoolBefore = contest.secondaryPrizePool();
        vm.prank(s1);
        contest.claimSecondaryPayout(ENTRY_A);
        assertEq(usdc.balanceOf(s1) - s1Before, secondaryPoolBefore);

        // No remaining funds in contract after all claims
        assertEq(usdc.balanceOf(address(contest)), 0);
    }

    // ============ S3: spectator withdraws during OPEN (full reversal) ============
    function testS3_WithdrawDuringOpen_FullReversalThenSettle() public {
        // One contestant and one spectator deposit during OPEN
        _join(a, ENTRY_A);

        uint256 amount = 100e6;
        _mintAndApprove(s1, amount);
        vm.prank(s1);
        contest.addSecondaryPosition(ENTRY_A, amount, emptyProof);

        uint256 tokens = contest.balanceOf(s1, ENTRY_A);
        assertGt(tokens, 0);

        // Withdraw in OPEN → full refund and accounting reversal
        uint256 s1Before = usdc.balanceOf(s1);
        vm.prank(s1);
        contest.removeSecondaryPosition(ENTRY_A, tokens);
        assertEq(usdc.balanceOf(s1), s1Before + amount);
        assertEq(contest.balanceOf(s1, ENTRY_A), 0);
        assertEq(contest.secondaryPrizePool(), 0);
        assertEq(contest.primaryPrizePoolSubsidy(), 0);
        assertEq(contest.primaryPositionSubsidy(ENTRY_A), 0);

        // Proceed with two more contestants and normal settlement
        _join(b, ENTRY_B);
        _join(c, ENTRY_C);
        _activate();

        uint256[] memory winners = new uint256[](1);
        winners[0] = ENTRY_B;
        uint256[] memory bps = new uint256[](1);
        bps[0] = 10000;

        _settle(winners, bps);

        // With 3 contestants and no spectators (after reversal): same as S1 math
        uint256 oracleFee = (300e6 * ORACLE_FEE_BPS) / 10000;
        uint256 afterFee = 300e6 - oracleFee;

        uint256 bBefore = usdc.balanceOf(b);
        vm.prank(b);
        contest.claimPrimaryPayout(ENTRY_B);
        assertEq(usdc.balanceOf(b) - bBefore, afterFee);

        uint256 oracleBefore = usdc.balanceOf(oracle);
        vm.prank(oracle);
        contest.claimOracleFee();
        assertEq(usdc.balanceOf(oracle) - oracleBefore, oracleFee);

        assertEq(usdc.balanceOf(address(contest)), 0);
    }

    // ============ S4: close predictions then settle (no withdrawals allowed) ============
    function testS4_ClosePredictionsThenSettle() public {
        _join(a, ENTRY_A);
        _join(b, ENTRY_B);
        _activate();

        // add predictions while ACTIVE
        _specDeposit(s1, ENTRY_A, 50e6);
        _specDeposit(s2, ENTRY_B, 50e6);

        // close predictions
        vm.prank(oracle);
        contest.lockContest();

        // attempt withdrawal should fail in LOCKED
        uint256 tokens = contest.balanceOf(s1, ENTRY_A);
        vm.prank(s1);
        vm.expectRevert("Cannot withdraw - competition started or settled");
        contest.removeSecondaryPosition(ENTRY_A, tokens);

        // settle
        uint256[] memory winners = new uint256[](2);
        winners[0] = ENTRY_B; // winner for spectators
        winners[1] = ENTRY_A;
        uint256[] memory bps = new uint256[](2);
        bps[0] = 6000;
        bps[1] = 4000;
        _settle(winners, bps);

        // winner spectator can claim
        uint256 before = usdc.balanceOf(s2);
        vm.prank(s2);
        contest.claimSecondaryPayout(ENTRY_B);
        assertGt(usdc.balanceOf(s2), before);
    }

    // ============ E1: Primary withdrawal impact on spectators ============
    // Tests: Primary withdrawal during OPEN → Spectator funds remain in pool → No auto-refunds for spectators
    function testE1_EntryWithdrawn_SpectatorsLoseCapital() public {
        // A joins, spectator predicts on A during OPEN
        _join(a, ENTRY_A);
        uint256 amount = 120e6;
        uint256 sBefore = usdc.balanceOf(s1);
        _mintAndApprove(s1, amount);
        vm.prank(s1);
        contest.addSecondaryPosition(ENTRY_A, amount, emptyProof);
        uint256 tok = contest.balanceOf(s1, ENTRY_A);
        assertGt(tok, 0);

        // A leaves → spectator funds stay in pool (no auto-refund)
        uint256 aBefore = usdc.balanceOf(a);
        vm.prank(a);
        contest.removePrimaryPosition(ENTRY_A);

        // Spectator NOT refunded - still has tokens but entry withdrawn
        assertEq(usdc.balanceOf(s1), sBefore); // No refund
        assertEq(contest.balanceOf(s1, ENTRY_A), tok); // Still has tokens

        // Contestant refunded deposit
        assertEq(usdc.balanceOf(a), aBefore + PRIMARY_DEPOSIT);

        assertEq(contest.primaryPrizePoolSubsidy(), 0);
        assertEq(contest.primaryPositionSubsidy(ENTRY_A), 0);
    }

    // ============ E2: zero spectators; varied payout splits ============
    function testE2_ZeroSpectators_VariedPayouts() public {
        _join(a, ENTRY_A);
        _join(b, ENTRY_B);
        _join(c, ENTRY_C);
        _activate();

        uint256[] memory winners = new uint256[](3);
        winners[0] = ENTRY_C; // spectator winner irrelevant (no spectators)
        winners[1] = ENTRY_A;
        winners[2] = ENTRY_B;
        uint256[] memory bps = new uint256[](3);
        bps[0] = 5000;
        bps[1] = 3000;
        bps[2] = 2000;

        _settle(winners, bps);

        // totalPoolL1 = 300 (no spectators)
        uint256 fee = (300e6 * ORACLE_FEE_BPS) / 10000; // 3e6
        uint256 afterFee = 300e6 - fee; // 297e6

        uint256 aBefore = usdc.balanceOf(a);
        vm.prank(a);
        contest.claimPrimaryPayout(ENTRY_A);
        assertEq(usdc.balanceOf(a) - aBefore, (afterFee * 3000) / 10000);

        uint256 bBefore = usdc.balanceOf(b);
        vm.prank(b);
        contest.claimPrimaryPayout(ENTRY_B);
        assertEq(usdc.balanceOf(b) - bBefore, (afterFee * 2000) / 10000);

        uint256 cBefore = usdc.balanceOf(c);
        vm.prank(c);
        contest.claimPrimaryPayout(ENTRY_C);
        assertEq(usdc.balanceOf(c) - cBefore, (afterFee * 5000) / 10000);

        uint256 oracleBefore = usdc.balanceOf(oracle);
        vm.prank(oracle);
        contest.claimOracleFee();
        assertEq(usdc.balanceOf(oracle) - oracleBefore, fee);

        assertEq(usdc.balanceOf(address(contest)), 0);
    }

    // ============ E6: closeContest after expiry sweeps unclaimed funds ============
    function testE6_SweepToTreasury_AfterExpiry() public {
        // Two contestants, no spectators
        _join(a, ENTRY_A);
        _join(b, ENTRY_B);
        _activate();

        uint256[] memory winners = new uint256[](2);
        winners[0] = ENTRY_A;
        winners[1] = ENTRY_B;
        uint256[] memory bps = new uint256[](2);
        bps[0] = 6000;
        bps[1] = 4000;

        // Settle
        _settle(winners, bps);

        // Users don't claim - funds remain in contract
        uint256 contractBalance = usdc.balanceOf(address(contest));
        assertGt(contractBalance, 0);

        // Warp past expiry and sweep to treasury
        vm.warp(block.timestamp + EXPIRY + 1);
        uint256 oracleBefore = usdc.balanceOf(oracle);
        vm.prank(oracle);
        contest.closeContest();

        // All unclaimed funds swept to oracle
        assertEq(usdc.balanceOf(oracle) - oracleBefore, contractBalance);
        // Contest closed
        assertEq(uint256(contest.state()), uint256(Contest.ContestState.CLOSED));
        // No funds left
        assertEq(usdc.balanceOf(address(contest)), 0);
    }

    // ============ E3: all spectators on losing entry → winners split pool, losers get 0 ============
    function testE3_AllSpectatorsOnLosingEntry() public {
        _join(a, ENTRY_A);
        _join(b, ENTRY_B);
        _activate();

        // All spectators on A, but B will be first winner
        _specDeposit(s1, ENTRY_A, 150e6);
        _specDeposit(s2, ENTRY_A, 50e6);

        uint256[] memory winners = new uint256[](2);
        winners[0] = ENTRY_B; // spectator winner is B
        winners[1] = ENTRY_A;
        uint256[] memory bps = new uint256[](2);
        bps[0] = 7000;
        bps[1] = 3000;
        _settle(winners, bps);

        // Losers (A) cannot claim anything
        uint256 s1Before = usdc.balanceOf(s1);
        vm.prank(s1);
        contest.claimSecondaryPayout(ENTRY_A);
        assertEq(usdc.balanceOf(s1), s1Before);

        uint256 s2Before = usdc.balanceOf(s2);
        vm.prank(s2);
        contest.claimSecondaryPayout(ENTRY_A);
        assertEq(usdc.balanceOf(s2), s2Before);
    }

    // ============ E4: no 1155 supply on winning entry → redistribute spectator pool to L1 winners ============
    function testE4_NoWinningSupply_RedistributeSpectatorPoolToLayer1() public {
        // Two contestants
        _join(a, ENTRY_A);
        _join(b, ENTRY_B);
        _activate();

        // All spectators on A, but B will be the first winner
        _specDeposit(s1, ENTRY_A, 200e6);

        // Settle with B first; no one holds B tokens → pool redistributed by payoutBps
        uint256[] memory winners = new uint256[](2);
        winners[0] = ENTRY_B; // first winner (no 1155 supply)
        winners[1] = ENTRY_A;
        uint256[] memory bps = new uint256[](2);
        bps[0] = 6000; // 60%
        bps[1] = 4000; // 40%

        _settle(winners, bps);

        uint256 contestantDepositsAfterFee = 200e6 - (200e6 * ORACLE_FEE_BPS) / 10000; // 198e6
        uint256 spectatorAfterFee = 200e6 - (200e6 * ORACLE_FEE_BPS) / 10000; // 198e6

        uint256 baseB = (contestantDepositsAfterFee * 6000) / 10000; // 118.8e6
        uint256 baseA = (contestantDepositsAfterFee * 4000) / 10000; // 79.2e6
        uint256 redistB = (spectatorAfterFee * 6000) / 10000; // 118.8e6
        uint256 redistA = (spectatorAfterFee * 4000) / 10000; // 79.2e6

        uint256 aBefore = usdc.balanceOf(a);
        vm.prank(a);
        contest.claimPrimaryPayout(ENTRY_A);
        assertEq(usdc.balanceOf(a) - aBefore, baseA + redistA);

        uint256 bBefore = usdc.balanceOf(b);
        vm.prank(b);
        contest.claimPrimaryPayout(ENTRY_B);
        assertEq(usdc.balanceOf(b) - bBefore, baseB + redistB);

        // Oracle claims fee
        vm.prank(oracle);
        contest.claimOracleFee();

        // Spectator pool should be zeroed; no funds left for spectators to claim
        assertEq(contest.secondaryPrizePool(), 0);
        assertEq(usdc.balanceOf(address(contest)), 0);
    }

    // ============ E5: high oracle fee (10%) and rounding safety ============
    function testE5_HighOracleFee_Rounding() public {
        // Deploy new contest with 10% fee
        Contest highFee = new Contest(
            address(usdc),
            oracle,
            PRIMARY_DEPOSIT,
            1000, // 10%
            block.timestamp + EXPIRY,
            LIQUIDITY,
            DEMAND_SENSITIVITY,
            PRIZE_SHARE_BPS,
            USER_SHARE_BPS,
            TARGET_PRIMARY_SHARE_BPS,
            MAX_CROSS_SUBSIDY_BPS
        );

        // Three contestants, no spectators
        usdc.mint(a, PRIMARY_DEPOSIT);
        vm.startPrank(a);
        usdc.approve(address(highFee), PRIMARY_DEPOSIT);
        vm.stopPrank();
        vm.prank(a);
        highFee.addPrimaryPosition(ENTRY_A, emptyProof);

        usdc.mint(b, PRIMARY_DEPOSIT);
        vm.startPrank(b);
        usdc.approve(address(highFee), PRIMARY_DEPOSIT);
        vm.stopPrank();
        vm.prank(b);
        highFee.addPrimaryPosition(ENTRY_B, emptyProof);

        usdc.mint(c, PRIMARY_DEPOSIT);
        vm.startPrank(c);
        usdc.approve(address(highFee), PRIMARY_DEPOSIT);
        vm.stopPrank();
        vm.prank(c);
        highFee.addPrimaryPosition(ENTRY_C, emptyProof);

        vm.prank(oracle);
        highFee.activateContest();

        uint256[] memory winners = new uint256[](1);
        winners[0] = ENTRY_C;
        uint256[] memory bps = new uint256[](1);
        bps[0] = 10000;

        vm.prank(oracle);
        highFee.settleContest(winners, bps);

        // total = 300, fee = 30, after = 270
        uint256 cBefore = usdc.balanceOf(c);
        vm.prank(c);
        highFee.claimPrimaryPayout(ENTRY_C);
        assertEq(usdc.balanceOf(c) - cBefore, 270e6);

        uint256 oracleBefore = usdc.balanceOf(oracle);
        vm.prank(oracle);
        highFee.claimOracleFee();
        assertEq(usdc.balanceOf(oracle) - oracleBefore, 30e6);

        assertEq(usdc.balanceOf(address(highFee)), 0);
    }

    // ============ Invariant: zero balance after all claims ============
    function testInvariant_ZeroBalanceAfterAllClaims() public {
        _join(a, ENTRY_A);
        _join(b, ENTRY_B);
        _join(c, ENTRY_C);
        _activate();

        // spectators on winner and loser
        _specDeposit(s1, ENTRY_A, 100e6);
        _specDeposit(s2, ENTRY_B, 50e6);

        uint256[] memory winners = new uint256[](3);
        winners[0] = ENTRY_A;
        winners[1] = ENTRY_B;
        winners[2] = ENTRY_C;
        uint256[] memory bps = new uint256[](3);
        bps[0] = 6000;
        bps[1] = 3000;
        bps[2] = 1000;
        _settle(winners, bps);

        // All contestants claim
        vm.prank(a);
        contest.claimPrimaryPayout(ENTRY_A);
        vm.prank(b);
        contest.claimPrimaryPayout(ENTRY_B);
        vm.prank(c);
        contest.claimPrimaryPayout(ENTRY_C);

        // Oracle claims fee
        vm.prank(oracle);
        contest.claimOracleFee();

        // Spectator winner claims
        vm.prank(s1);
        contest.claimSecondaryPayout(ENTRY_A);

        // After all claims, contract balance should be zero
        assertEq(usdc.balanceOf(address(contest)), 0);
    }
}
