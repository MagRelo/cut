// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Contest.sol";
import "../src/PlatformToken.sol";

contract ContestTest is Test {
    Contest public contest;
    PlatformToken public platformToken;
    address public owner;
    address public oracle;
    address public participant;
    uint256 public constant PLATFORM_FEE = 250; // 2.5% in basis points
    uint256 public constant ENTRY_FEE = 1e18; // 1 token with 18 decimals

    // Sets up a contest with state OPEN and mints tokens to the participant
    function setUp() public {
        owner = address(this);
        oracle = address(0x1);
        participant = address(0x2);
        platformToken = new PlatformToken("BetTheCut", "BTCUT");
        contest = new Contest(
            "Test Contest",
            ENTRY_FEE,
            10, // max participants
            block.timestamp + 2 hours,
            address(platformToken),
            oracle,
            PLATFORM_FEE
        );
        platformToken.mint(participant, ENTRY_FEE);
    }

    // Tests that a participant can enter the contest when state is OPEN
    function testEnter() public {
        vm.startPrank(participant);
        platformToken.approve(address(contest), ENTRY_FEE);
        contest.enter();
        assertEq(contest.hasEntered(participant), true);
        vm.stopPrank();
    }

    // Tests that a participant can leave the contest when state is OPEN
    function testLeave() public {
        vm.startPrank(participant);
        platformToken.approve(address(contest), ENTRY_FEE);
        contest.enter();
        contest.leave();
        assertEq(contest.hasEntered(participant), false);
        // check that the participant has received their entry fee back
        assertEq(platformToken.balanceOf(participant), ENTRY_FEE);
        vm.stopPrank();
    }

    // Tests that the oracle can close entry, changing state to CLOSED
    function testCloseEntry() public {
        vm.startPrank(oracle);
        contest.closeEntry();
        assertEq(uint256(contest.state()), uint256(Contest.ContestState.CLOSED));
        vm.stopPrank();
    }

    // Tests that payouts can be distributed after the contest is closed using basis points
    function testDistribute() public {
        vm.startPrank(participant);
        platformToken.approve(address(contest), ENTRY_FEE);
        contest.enter();
        vm.stopPrank();

        vm.startPrank(oracle);
        contest.closeEntry();
        uint256[] memory payouts = new uint256[](1);
        payouts[0] = 10000; // 100% in basis points
        contest.distribute(payouts);
        assertEq(uint256(contest.state()), uint256(Contest.ContestState.SETTLED));
        vm.stopPrank();
    }

    // Tests platform fee calculation and distribution
    function testPlatformFee() public {
        vm.startPrank(participant);
        platformToken.approve(address(contest), ENTRY_FEE);
        contest.enter();
        vm.stopPrank();

        vm.startPrank(oracle);
        contest.closeEntry();
        uint256[] memory payouts = new uint256[](1);
        payouts[0] = 10000; // 100% in basis points
        contest.distribute(payouts);
        vm.stopPrank();

        // Check platform fee was sent to oracle
        uint256 expectedFee = (ENTRY_FEE * PLATFORM_FEE) / 10000;
        assertEq(platformToken.balanceOf(oracle), expectedFee);
    }

    // Tests that a participant can perform an emergency withdrawal after the contest has ended
    function testEmergencyWithdraw() public {
        vm.startPrank(participant);
        platformToken.approve(address(contest), ENTRY_FEE);
        contest.enter();
        vm.warp(block.timestamp + 3 hours);
        contest.emergencyWithdraw();
        assertEq(contest.hasEntered(participant), false);
        vm.stopPrank();
    }

    // Tests contest cancellation and refund functionality
    function testCancelAndRefund() public {
        vm.startPrank(participant);
        platformToken.approve(address(contest), ENTRY_FEE);
        contest.enter();
        vm.stopPrank();

        vm.startPrank(oracle);
        contest.cancel();
        assertEq(uint256(contest.state()), uint256(Contest.ContestState.CANCELLED));
        contest.refundParticipants();
        vm.stopPrank();

        assertEq(platformToken.balanceOf(participant), ENTRY_FEE);
        assertEq(contest.hasEntered(participant), false);
    }

    // Tests that a participant cannot enter the contest when state is CLOSED
    function testCannotEnterWhenClosed() public {
        vm.startPrank(oracle);
        contest.closeEntry();
        vm.stopPrank();

        vm.startPrank(participant);
        platformToken.approve(address(contest), ENTRY_FEE);
        vm.expectRevert("Contest not open");
        contest.enter();
        vm.stopPrank();
    }

    // Tests that a participant cannot leave the contest when state is CLOSED
    function testCannotLeaveWhenClosed() public {
        vm.startPrank(participant);
        platformToken.approve(address(contest), ENTRY_FEE);
        contest.enter();
        vm.stopPrank();

        vm.startPrank(oracle);
        contest.closeEntry();
        vm.stopPrank();

        vm.startPrank(participant);
        vm.expectRevert("Contest not open");
        contest.leave();
        vm.stopPrank();
    }

    // Tests a complete contest lifecycle with multiple participants
    function testContestLifecycle() public {
        // Setup additional participants
        address participant2 = address(0x3);
        address participant3 = address(0x4);
        address participant4 = address(0x5);

        // Mint tokens to all participants
        platformToken.mint(participant2, ENTRY_FEE);
        platformToken.mint(participant3, ENTRY_FEE);
        platformToken.mint(participant4, ENTRY_FEE);

        // First participant enters
        vm.startPrank(participant);
        platformToken.approve(address(contest), ENTRY_FEE);
        contest.enter();
        vm.stopPrank();

        // Second participant enters
        vm.startPrank(participant2);
        platformToken.approve(address(contest), ENTRY_FEE);
        contest.enter();
        vm.stopPrank();

        // Third participant enters
        vm.startPrank(participant3);
        platformToken.approve(address(contest), ENTRY_FEE);
        contest.enter();
        vm.stopPrank();

        // Fourth participant enters
        vm.startPrank(participant4);
        platformToken.approve(address(contest), ENTRY_FEE);
        contest.enter();
        vm.stopPrank();

        // Second participant leaves
        vm.startPrank(participant2);
        contest.leave();
        vm.stopPrank();

        // Oracle closes entry
        vm.startPrank(oracle);
        contest.closeEntry();
        vm.stopPrank();

        // Assign payouts using basis points
        uint256[] memory payouts = new uint256[](3);
        payouts[0] = 5000; // 50%
        payouts[1] = 3000; // 30%
        payouts[2] = 2000; // 20%

        // Oracle distributes payouts
        vm.startPrank(oracle);
        contest.distribute(payouts);
        vm.stopPrank();

        // Calculate expected payouts after platform fee
        uint256 totalPot = 3 * ENTRY_FEE; // 3 participants * ENTRY_FEE
        uint256 platformFeeAmount = (totalPot * PLATFORM_FEE) / 10000;
        uint256 netPayout = totalPot - platformFeeAmount;

        // Check balances for the actual participants
        assertEq(platformToken.balanceOf(participant2), ENTRY_FEE, "participant2 left and should have full balance");
        
        // Find which address got which payout
        for (uint256 i = 0; i < 3; i++) {
            address p = contest.participants(i);
            uint256 expected = (netPayout * payouts[i]) / 10000;
            assertEq(platformToken.balanceOf(p), expected, "participant payout");
        }

        // Check platform fee was sent to oracle
        assertEq(platformToken.balanceOf(oracle), platformFeeAmount, "platform fee");
    }

    // Tests that distribute reverts if total basis points is not 10000
    function testDistributeInvalidBasisPoints() public {
        vm.startPrank(participant);
        platformToken.approve(address(contest), ENTRY_FEE);
        contest.enter();
        vm.stopPrank();

        vm.startPrank(oracle);
        contest.closeEntry();
        uint256[] memory payouts = new uint256[](1);
        payouts[0] = 5000; // 50% in basis points
        vm.expectRevert("Total must be 10000 basis points");
        contest.distribute(payouts);
        vm.stopPrank();
    }

    // Tests that distribute reverts if payouts length doesn't match participants length
    function testDistributeInvalidPayoutsLength() public {
        vm.startPrank(participant);
        platformToken.approve(address(contest), ENTRY_FEE);
        contest.enter();
        vm.stopPrank();

        vm.startPrank(oracle);
        contest.closeEntry();
        uint256[] memory payouts = new uint256[](2); // Wrong length
        payouts[0] = 5000;
        payouts[1] = 5000;
        vm.expectRevert("Invalid payouts length");
        contest.distribute(payouts);
        vm.stopPrank();
    }
} 