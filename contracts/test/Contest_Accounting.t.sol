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

    uint256 public constant CONTESTANT_DEPOSIT = 100e6; // 6 decimals (USDC-like)
    uint256 public constant ORACLE_FEE_BPS = 100;       // 1%
    uint256 public constant LIQUIDITY = 1000e6;
    uint256 public constant DEMAND_SENSITIVITY = 500;   // 5%
    uint256 public constant PRIZE_SHARE_BPS = 750;      // 7.5%
    uint256 public constant USER_SHARE_BPS = 750;       // 7.5%
    uint256 public constant EXPIRY = 7 days;

    function setUp() public {
        usdc = new MockUSDC();
        contest = new Contest(
            address(usdc),
            oracle,
            CONTESTANT_DEPOSIT,
            ORACLE_FEE_BPS,
            block.timestamp + EXPIRY,
            LIQUIDITY,
            DEMAND_SENSITIVITY,
            PRIZE_SHARE_BPS,
            USER_SHARE_BPS
        );
    }

    // ============ Helpers ============

    function _mintAndApprove(address user, uint256 amount) internal {
        usdc.mint(user, amount);
        vm.startPrank(user);
        usdc.approve(address(contest), amount);
        vm.stopPrank();
    }

    function _join(address user, uint256 entryId) internal {
        _mintAndApprove(user, CONTESTANT_DEPOSIT);
        vm.prank(user);
        contest.joinContest(entryId);
    }

    function _specDeposit(address user, uint256 entryId, uint256 amount) internal returns (uint256 tokens) {
        _mintAndApprove(user, amount);
        vm.prank(user);
        contest.addPrediction(entryId, amount);
        tokens = contest.balanceOf(user, entryId);
    }

    function _activate() internal {
        vm.prank(oracle);
        contest.activateContest();
    }

    function _settle(uint256[] memory winners, uint256[] memory bps) internal {
        vm.prank(oracle);
        contest.settleContest(winners, bps);
    }

    // ============ S1: 3 competitors, no spectators ============
    function testS1_NoSpectators_AllPrizeToWinner_OracleFeeFromContestants() public {
        // Arrange: 3 contestants deposit
        _join(a, ENTRY_A);
        _join(b, ENTRY_B);
        _join(c, ENTRY_C);

        // Activate and settle 100% to A
        _activate();

        uint256[] memory winners = new uint256[](1);
        winners[0] = ENTRY_A;
        uint256[] memory bps = new uint256[](1);
        bps[0] = 10000; // 100%

        uint256 beforeA = usdc.balanceOf(a);
        uint256 beforeOracle = usdc.balanceOf(oracle);

        _settle(winners, bps);

        // totalPoolL1 = 3 * 100 = 300
        uint256 oracleFee = (300e6 * ORACLE_FEE_BPS) / 10000; // 3e6
        uint256 layer1AfterFee = 300e6 - oracleFee;            // 297e6

        // A should receive entire layer1AfterFee
        assertEq(usdc.balanceOf(a) - beforeA, layer1AfterFee);
        // Oracle should receive oracleFee
        assertEq(usdc.balanceOf(oracle) - beforeOracle, oracleFee);
        // Contract should hold 0 after no spectators and immediate payouts
        assertEq(usdc.balanceOf(address(contest)), 0);
    }

    // ============ S2: spectators on multiple entries, no withdrawals ============
    function testS2_SpectatorsSplit_DepositsFeesBonusesAndCollateral() public {
        // 3 contestants
        _join(a, ENTRY_A);
        _join(b, ENTRY_B);
        _join(c, ENTRY_C);

        _activate();

        // Spectators: 100 on A, 200 on B
        uint256 specA = 100e6;
        uint256 specB = 200e6;

        uint256 s1Before = usdc.balanceOf(s1);
        uint256 s2Before = usdc.balanceOf(s2);
        uint256 aBefore = usdc.balanceOf(a);
        uint256 bBefore = usdc.balanceOf(b);
        uint256 cBefore = usdc.balanceOf(c);
        uint256 oracleBefore = usdc.balanceOf(oracle);

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
        bps[0] = 6000; bps[1] = 3000; bps[2] = 1000;

        _settle(winners, bps);

        // Compute expected L1 (contest deposits + prize subsidy only)
        // Contestant pool: 300
        // Prize subsidy: 7.5% of (100+200) = 22.5
        // totalPoolL1 = 300 + 22.5 = 322.5
        uint256 totalPoolL1 = 322_500_000;
        uint256 oracleFee = (totalPoolL1 * ORACLE_FEE_BPS) / 10000; // 3.225e6
        uint256 layer1AfterFee = totalPoolL1 - oracleFee;            // 319.275e6

        // Entry payouts (rounded down by integer math):
        uint256 payoutA = (layer1AfterFee * 6000) / 10000;
        uint256 payoutB = (layer1AfterFee * 3000) / 10000;
        uint256 payoutC = (layer1AfterFee * 1000) / 10000;

        // Bonuses after fee:
        uint256 bonusAAfter = (uint256(7_500_000) * (10000 - ORACLE_FEE_BPS)) / 10000; // 7.5e6 * 99%
        uint256 bonusBAfter = (uint256(15_000_000) * (10000 - ORACLE_FEE_BPS)) / 10000; // 15e6 * 99%

        // Since contract pays both prize payouts and bonuses in settle, balances for A and B include both
        assertEq(usdc.balanceOf(a) - aBefore, payoutA + bonusAAfter);
        assertEq(usdc.balanceOf(b) - bBefore, payoutB + bonusBAfter);
        assertEq(usdc.balanceOf(c) - cBefore, payoutC);

        // Oracle got fee on Layer 1 plus fee on bonuses
        uint256 bonusFee = (7_500_000 * ORACLE_FEE_BPS) / 10000 + (15_000_000 * ORACLE_FEE_BPS) / 10000; // 225,000
        assertEq(usdc.balanceOf(oracle) - oracleBefore, oracleFee + bonusFee);

        // Spectator pool winner receives the entire remaining contract balance
        uint256 s1Tokens = contest.balanceOf(s1, ENTRY_A);
        uint256 totalSupplyA = uint256(contest.netPosition(ENTRY_A));
        assertEq(s1Tokens, totalSupplyA);

        uint256 s1ClaimBefore = usdc.balanceOf(s1);
        uint256 contractBefore = usdc.balanceOf(address(contest));
        vm.prank(s1);
        contest.claimPredictionPayout(ENTRY_A);
        assertEq(usdc.balanceOf(s1) - s1ClaimBefore, contractBefore);

        // No remaining funds in contract after winner claims
        assertEq(usdc.balanceOf(address(contest)), 0);
        // Spectator balances before vs after
        assertEq(usdc.balanceOf(s1) - s1Before, contractBefore);
        assertEq(usdc.balanceOf(s2) - s2Before, 0);
    }

    // ============ S3: spectator withdraws during OPEN (full reversal) ============
    function testS3_WithdrawDuringOpen_FullReversalThenSettle() public {
        // One contestant and one spectator deposit during OPEN
        _join(a, ENTRY_A);

        uint256 amount = 100e6;
        _mintAndApprove(s1, amount);
        vm.prank(s1);
        contest.addPrediction(ENTRY_A, amount);

        uint256 tokens = contest.balanceOf(s1, ENTRY_A);
        assertGt(tokens, 0);

        // Withdraw in OPEN → full refund and accounting reversal
        uint256 s1Before = usdc.balanceOf(s1);
        vm.prank(s1);
        contest.withdrawPrediction(ENTRY_A, tokens);
        assertEq(usdc.balanceOf(s1), s1Before + amount);
        assertEq(contest.balanceOf(s1, ENTRY_A), 0);
        assertEq(contest.predictionPrizePool(), 0);
        assertEq(contest.contestPrizePoolSubsidy(), 0);
        assertEq(contest.contestantSubsidy(ENTRY_A), 0);

        // Proceed with two more contestants and normal settlement
        _join(b, ENTRY_B);
        _join(c, ENTRY_C);
        _activate();

        uint256[] memory winners = new uint256[](1);
        winners[0] = ENTRY_B;
        uint256[] memory bps = new uint256[](1);
        bps[0] = 10000;

        uint256 bBefore = usdc.balanceOf(b);
        uint256 oracleBefore = usdc.balanceOf(oracle);
        _settle(winners, bps);

        // With 3 contestants and no spectators (after reversal): same as S1 math
        uint256 oracleFee = (300e6 * ORACLE_FEE_BPS) / 10000;
        uint256 afterFee = 300e6 - oracleFee;
        assertEq(usdc.balanceOf(b) - bBefore, afterFee);
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
        contest.closePredictions();

        // attempt withdrawal should fail in LOCKED
        uint256 tokens = contest.balanceOf(s1, ENTRY_A);
        vm.prank(s1);
        vm.expectRevert("Cannot withdraw - competition started or settled");
        contest.withdrawPrediction(ENTRY_A, tokens);

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
        contest.claimPredictionPayout(ENTRY_B);
        assertGt(usdc.balanceOf(s2), before);
    }

    // ============ E1: entry withdrawn in OPEN auto-refunds its spectators ============
    function testE1_EntryWithdrawnAutoRefundsSpectators() public {
        // A joins, spectator predicts on A during OPEN
        _join(a, ENTRY_A);
        uint256 amount = 120e6;
        uint256 sBefore = usdc.balanceOf(s1);
        _mintAndApprove(s1, amount);
        vm.prank(s1);
        contest.addPrediction(ENTRY_A, amount);
        uint256 tok = contest.balanceOf(s1, ENTRY_A);
        assertGt(tok, 0);

        // A leaves → auto refund spectator and contestant deposit back
        uint256 aBefore = usdc.balanceOf(a);
        vm.prank(a);
        contest.leaveContest(ENTRY_A);

        // Spectator fully refunded
        assertEq(usdc.balanceOf(s1), sBefore + amount);
        assertEq(contest.balanceOf(s1, ENTRY_A), 0);
        // Contestant refunded deposit
        assertEq(usdc.balanceOf(a), aBefore + CONTESTANT_DEPOSIT);
        // Accounting reset for that entry
        assertEq(contest.contestantSubsidy(ENTRY_A), 0);
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
        bps[0] = 5000; bps[1] = 3000; bps[2] = 2000;

        uint256 aBefore = usdc.balanceOf(a);
        uint256 bBefore = usdc.balanceOf(b);
        uint256 cBefore = usdc.balanceOf(c);
        uint256 oracleBefore = usdc.balanceOf(oracle);

        _settle(winners, bps);

        // totalPoolL1 = 300 (no spectators)
        uint256 fee = (300e6 * ORACLE_FEE_BPS) / 10000; // 3e6
        uint256 afterFee = 300e6 - fee;                 // 297e6
        assertEq(usdc.balanceOf(c) - cBefore, (afterFee * 5000) / 10000);
        assertEq(usdc.balanceOf(a) - aBefore, (afterFee * 3000) / 10000);
        assertEq(usdc.balanceOf(b) - bBefore, (afterFee * 2000) / 10000);
        assertEq(usdc.balanceOf(oracle) - oracleBefore, fee);
        assertEq(usdc.balanceOf(address(contest)), 0);
    }

    // ============ E6: distributeExpiredContest pushes unclaimed payouts ============
    function testE6_DistributeExpiredContest_PushesUnclaimed() public {
        // Two contestants, no spectators
        _join(a, ENTRY_A);
        _join(b, ENTRY_B);
        _activate();

        uint256[] memory winners = new uint256[](2);
        winners[0] = ENTRY_A;
        winners[1] = ENTRY_B;
        uint256[] memory bps = new uint256[](2);
        bps[0] = 6000; bps[1] = 4000;

        // Settle
        _settle(winners, bps);

        // Warp past expiry and force distribute
        vm.warp(block.timestamp + EXPIRY + 1);
        uint256 aBefore = usdc.balanceOf(a);
        uint256 bBefore = usdc.balanceOf(b);
        vm.prank(oracle);
        contest.distributeExpiredContest();

        // Payouts were already sent at settlement; distribute should not change balances
        assertEq(usdc.balanceOf(a), aBefore);
        assertEq(usdc.balanceOf(b), bBefore);
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
        contest.claimPredictionPayout(ENTRY_A);
        assertEq(usdc.balanceOf(s1), s1Before);

        uint256 s2Before = usdc.balanceOf(s2);
        vm.prank(s2);
        contest.claimPredictionPayout(ENTRY_A);
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

        // Compute spectator pool (85% of 200)
        uint256 spectatorPool = (200e6 * 85) / 100;

        // Settle with B first; no one holds B tokens → pool redistributed by payoutBps
        uint256[] memory winners = new uint256[](2);
        winners[0] = ENTRY_B; // first winner (no 1155 supply)
        winners[1] = ENTRY_A;
        uint256[] memory bps = new uint256[](2);
        bps[0] = 6000; // 60%
        bps[1] = 4000; // 40%

        // Record balances before
        uint256 aBefore = usdc.balanceOf(a);
        uint256 bBefore = usdc.balanceOf(b);

        _settle(winners, bps);

        // Base Layer 1: deposits + prize subsidy = 200 + 15 = 215; fee 1% = 2.15; after = 212.85
        uint256 totalL1 = 215e6;
        uint256 fee = (totalL1 * ORACLE_FEE_BPS) / 10000; // 2.15e6
        uint256 afterFee = totalL1 - fee;                  // 212.85e6
        uint256 baseB = (afterFee * 6000) / 10000;         // 127.71e6
        uint256 baseA = (afterFee * 4000) / 10000;         // 85.14e6

        // Redistribution from spectator pool (no extra fee applied):
        uint256 redistB = (spectatorPool * 6000) / 10000; // 102e6
        uint256 redistA = (spectatorPool * 4000) / 10000; // 68e6
        // Bonus after fee for A from spectators on A (7.5% of 200, less 1%)
        uint256 bonusAAfterFee = (uint256(15_000_000) * (10000 - ORACLE_FEE_BPS)) / 10000; // 14.85e6

        assertEq(usdc.balanceOf(b) - bBefore, baseB + redistB);
        assertEq(usdc.balanceOf(a) - aBefore, baseA + redistA + bonusAAfterFee);

        // Spectator pool should be zeroed; no funds left for spectators to claim
        assertEq(contest.predictionPrizePool(), 0);
        assertEq(usdc.balanceOf(address(contest)), 0);
    }

    // ============ E5: high oracle fee (10%) and rounding safety ============
    function testE5_HighOracleFee_Rounding() public {
        // Deploy new contest with 10% fee
        Contest highFee = new Contest(
            address(usdc),
            oracle,
            CONTESTANT_DEPOSIT,
            1000, // 10%
            block.timestamp + EXPIRY,
            LIQUIDITY,
            DEMAND_SENSITIVITY,
            PRIZE_SHARE_BPS,
            USER_SHARE_BPS
        );

        // Three contestants, no spectators
        usdc.mint(a, CONTESTANT_DEPOSIT);
        vm.startPrank(a); usdc.approve(address(highFee), CONTESTANT_DEPOSIT); vm.stopPrank();
        vm.prank(a); highFee.joinContest(ENTRY_A);

        usdc.mint(b, CONTESTANT_DEPOSIT);
        vm.startPrank(b); usdc.approve(address(highFee), CONTESTANT_DEPOSIT); vm.stopPrank();
        vm.prank(b); highFee.joinContest(ENTRY_B);

        usdc.mint(c, CONTESTANT_DEPOSIT);
        vm.startPrank(c); usdc.approve(address(highFee), CONTESTANT_DEPOSIT); vm.stopPrank();
        vm.prank(c); highFee.joinContest(ENTRY_C);

        vm.prank(oracle);
        highFee.activateContest();

        uint256[] memory winners = new uint256[](1);
        winners[0] = ENTRY_C;
        uint256[] memory bps = new uint256[](1);
        bps[0] = 10000;

        uint256 cBefore = usdc.balanceOf(c);
        uint256 oracleBefore = usdc.balanceOf(oracle);
        vm.prank(oracle);
        highFee.settleContest(winners, bps);

        // total = 300, fee = 30, after = 270
        assertEq(usdc.balanceOf(c) - cBefore, 270e6);
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
        bps[0] = 6000; bps[1] = 3000; bps[2] = 1000;
        _settle(winners, bps);

        // claim spectator for A
        vm.prank(s1);
        contest.claimPredictionPayout(ENTRY_A);

        // no claim for B (loser) and no remaining L1 payouts (paid immediately)
        assertEq(usdc.balanceOf(address(contest)), 0);
    }
}


