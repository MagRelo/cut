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
    uint256 public constant ORACLE_FEE_BPS = 100;       // 1%
    uint256 public constant LIQUIDITY = 1000e6;
    uint256 public constant DEMAND_SENSITIVITY = 500;   // 5%
    uint256 public constant PRIZE_SHARE_BPS = 750;      // 7.5%
    uint256 public constant USER_SHARE_BPS = 750;       // 7.5%
    uint256 public constant EXPIRY = 7 days;
    
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

        _settle(winners, bps);

        // Settlement is pure accounting - no transfers yet
        assertEq(usdc.balanceOf(address(contest)), 300e6);
        
        // totalPoolL1 = 3 * 100 = 300
        uint256 oracleFee = (300e6 * ORACLE_FEE_BPS) / 10000; // 3e6
        uint256 layer1AfterFee = 300e6 - oracleFee;            // 297e6

        // Contestants and oracle claim
        uint256 beforeA = usdc.balanceOf(a);
        vm.prank(a);
        contest.claimPrimaryPayout(ENTRY_A);
        assertEq(usdc.balanceOf(a) - beforeA, layer1AfterFee);
        
        uint256 beforeOracle = usdc.balanceOf(oracle);
        vm.prank(oracle);
        contest.claimOracleFee();
        assertEq(usdc.balanceOf(oracle) - beforeOracle, oracleFee);
        
        // Contract should hold 0 after all claims
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

        // NEW ACCOUNTING: Oracle fees deducted at deposit time, not settlement
        // Contestants deposit 300, oracle fee 1% = 3, contestPrizePool = 297
        // Spectators deposit 300, oracle fee 1% = 3, remaining 297
        // From 297: prizeShare 7.5% = 22.275, userShare 7.5% = 22.275, collateral 85% = 252.45
        
        // Layer 1 pool (already net of oracle fees)
        uint256 contestantDepositsAfterFee = 300e6 - (300e6 * ORACLE_FEE_BPS) / 10000; // 297e6
        uint256 spectatorTotal = 300e6;
        uint256 spectatorAfterOracleFee = spectatorTotal - (spectatorTotal * ORACLE_FEE_BPS) / 10000; // 297e6
        uint256 prizeSubsidy = (spectatorAfterOracleFee * PRIZE_SHARE_BPS) / 10000; // 22.275e6
        uint256 layer1Pool = contestantDepositsAfterFee + prizeSubsidy; // 319.275e6

        // Entry payouts (already net of fees):
        uint256 payoutA = (layer1Pool * 6000) / 10000;
        uint256 payoutB = (layer1Pool * 3000) / 10000;
        uint256 payoutC = (layer1Pool * 1000) / 10000;

        // Bonuses (already net of oracle fee from deposit time):
        uint256 bonusAAfter = (spectatorAfterOracleFee * USER_SHARE_BPS) / 10000 / 2; // Split between A entries
        uint256 bonusBAfter = (spectatorAfterOracleFee * USER_SHARE_BPS) / 10000 / 2; // Split between B entries
        // Actually: A gets bonus from 100 deposit, B gets bonus from 200 deposit
        bonusAAfter = ((100e6 - (100e6 * ORACLE_FEE_BPS) / 10000) * USER_SHARE_BPS) / 10000;
        bonusBAfter = ((200e6 - (200e6 * ORACLE_FEE_BPS) / 10000) * USER_SHARE_BPS) / 10000;

        // Contestants claim (prize + bonus in one transaction)
        uint256 aBefore = usdc.balanceOf(a);
        vm.prank(a);
        contest.claimPrimaryPayout(ENTRY_A);
        assertEq(usdc.balanceOf(a) - aBefore, payoutA + bonusAAfter);

        uint256 bBefore = usdc.balanceOf(b);
        vm.prank(b);
        contest.claimPrimaryPayout(ENTRY_B);
        assertEq(usdc.balanceOf(b) - bBefore, payoutB + bonusBAfter);

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
        uint256 contractBefore = usdc.balanceOf(address(contest));
        vm.prank(s1);
        contest.claimSecondaryPayout(ENTRY_A);
        assertEq(usdc.balanceOf(s1) - s1Before, contractBefore);

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

    // ============ E1: entry withdrawn in OPEN - spectators lose capital ============
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
        
        uint256 prizeSubsidy = contest.primaryPrizePoolSubsidy();
        uint256 bonus = contest.primaryPositionSubsidy(ENTRY_A);

        // A leaves → spectator funds stay in pool (no auto-refund)
        uint256 aBefore = usdc.balanceOf(a);
        vm.prank(a);
        contest.removePrimaryPosition(ENTRY_A);

        // Spectator NOT refunded - still has tokens but entry withdrawn
        assertEq(usdc.balanceOf(s1), sBefore); // No refund
        assertEq(contest.balanceOf(s1, ENTRY_A), tok); // Still has tokens
        
        // Contestant refunded deposit
        assertEq(usdc.balanceOf(a), aBefore + PRIMARY_DEPOSIT);
        
        // Spectator funds redistributed:
        // - prizeSubsidy stays in contestPrizePoolSubsidy
        // - orphaned bonus MOVED to contestPrizePoolSubsidy (since entry owner left)
        assertEq(contest.primaryPrizePoolSubsidy(), prizeSubsidy + bonus);
        assertEq(contest.primaryPositionSubsidy(ENTRY_A), 0); // Moved to prize pool
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

        _settle(winners, bps);

        // totalPoolL1 = 300 (no spectators)
        uint256 fee = (300e6 * ORACLE_FEE_BPS) / 10000; // 3e6
        uint256 afterFee = 300e6 - fee;                 // 297e6
        
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
        bps[0] = 6000; bps[1] = 4000;

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

        // NEW ACCOUNTING: Oracle fees deducted at deposit time
        // Contestants deposit 200, oracle fee 1% = 2, contestPrizePool = 198
        // Spectator deposits 200, oracle fee 1% = 2, remaining 198
        // From 198: prizeShare 7.5% = 14.85, userShare 7.5% = 14.85, collateral 85% = 168.3
        
        uint256 contestantDepositsAfterFee = 200e6 - (200e6 * ORACLE_FEE_BPS) / 10000; // 198e6
        uint256 spectatorAfterOracleFee = 200e6 - (200e6 * ORACLE_FEE_BPS) / 10000; // 198e6
        uint256 prizeSubsidy = (spectatorAfterOracleFee * PRIZE_SHARE_BPS) / 10000; // 14.85e6
        uint256 bonusA = (spectatorAfterOracleFee * USER_SHARE_BPS) / 10000; // 14.85e6
        uint256 spectatorPool = (spectatorAfterOracleFee * (10000 - PRIZE_SHARE_BPS - USER_SHARE_BPS)) / 10000; // 168.3e6

        // Settle with B first; no one holds B tokens → pool redistributed by payoutBps
        uint256[] memory winners = new uint256[](2);
        winners[0] = ENTRY_B; // first winner (no 1155 supply)
        winners[1] = ENTRY_A;
        uint256[] memory bps = new uint256[](2);
        bps[0] = 6000; // 60%
        bps[1] = 4000; // 40%

        _settle(winners, bps);

        // Base Layer 1 (already net of oracle fees)
        uint256 layer1Pool = contestantDepositsAfterFee + prizeSubsidy; // 212.85e6
        uint256 baseB = (layer1Pool * 6000) / 10000;
        uint256 baseA = (layer1Pool * 4000) / 10000;

        // Redistribution from spectator pool (already net of oracle fee):
        uint256 redistB = (spectatorPool * 6000) / 10000;
        uint256 redistA = (spectatorPool * 4000) / 10000;
        // Bonus for A (already net of oracle fee)
        uint256 bonusAAfterFee = bonusA;

        // Contestants claim (spectator pool was added to their payouts in settlement)
        uint256 aBefore = usdc.balanceOf(a);
        vm.prank(a);
        contest.claimPrimaryPayout(ENTRY_A);
        assertEq(usdc.balanceOf(a) - aBefore, baseA + redistA + bonusAAfterFee);

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
            USER_SHARE_BPS
        );

        // Three contestants, no spectators
        usdc.mint(a, PRIMARY_DEPOSIT);
        vm.startPrank(a); usdc.approve(address(highFee), PRIMARY_DEPOSIT); vm.stopPrank();
        vm.prank(a); highFee.addPrimaryPosition(ENTRY_A, emptyProof);

        usdc.mint(b, PRIMARY_DEPOSIT);
        vm.startPrank(b); usdc.approve(address(highFee), PRIMARY_DEPOSIT); vm.stopPrank();
        vm.prank(b); highFee.addPrimaryPosition(ENTRY_B, emptyProof);

        usdc.mint(c, PRIMARY_DEPOSIT);
        vm.startPrank(c); usdc.approve(address(highFee), PRIMARY_DEPOSIT); vm.stopPrank();
        vm.prank(c); highFee.addPrimaryPosition(ENTRY_C, emptyProof);

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
        bps[0] = 6000; bps[1] = 3000; bps[2] = 1000;
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


