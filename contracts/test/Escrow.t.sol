// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Escrow.sol";
import "../src/PlatformToken.sol";
import "../src/PaymentToken.sol";
import "../src/Treasury.sol";
import "./MockCompound.sol";

contract EscrowTest is Test {
    Escrow public escrow;
    PlatformToken public platformToken;
    PaymentToken public paymentToken;
    Treasury public treasury;
    address public owner;
    address public oracle;
    address public participant;
    uint256 public constant DEPOSIT_AMOUNT = 1000e18; // 1000 Platform tokens with 18 decimals
    MockCToken public mockCUSDC;

    // Sets up an escrow with state OPEN and mints tokens to the participant
    function setUp() public {
        owner = address(this);
        oracle = address(0x1);
        participant = address(0x2);
        platformToken = new PlatformToken();
        paymentToken = new PaymentToken();
        
        mockCUSDC = new MockCToken(address(paymentToken));
        // Mint a large amount of USDC to the MockCToken contract
        paymentToken.mint(address(mockCUSDC), 1_000_000_001e6);
        treasury = new Treasury(
            address(paymentToken),
            address(platformToken),
            address(mockCUSDC)
        );
        // Set treasury in platform token
        platformToken.setTreasury(address(treasury));
        
        escrow = new Escrow(
            "Test Escrow",
            DEPOSIT_AMOUNT,
            10,
            block.timestamp + 1 days,
            address(platformToken),
            oracle,
            address(treasury)
        );

        // Mint USDC to participant first, then deposit to get platform tokens
        paymentToken.mint(participant, 1000e6); // 1000 USDC
        vm.startPrank(participant);
        paymentToken.approve(address(treasury), 1000e6);
        treasury.depositUSDC(1000e6);
        vm.stopPrank();
        
        // Enter market in comptroller
        address[] memory markets = new address[](1);
        markets[0] = address(mockCUSDC);
        // mockComptroller.enterMarkets(markets); // This line is removed as MockComptroller is removed
    }

    function testDeposit() public {
        vm.startPrank(participant);
        
        uint256 initialBalance = platformToken.balanceOf(participant);
        platformToken.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit();
        
        uint256 finalBalance = platformToken.balanceOf(participant);
        assertEq(finalBalance, initialBalance - DEPOSIT_AMOUNT, "Balance should decrease by deposit amount");
        assertTrue(escrow.hasDeposited(participant), "Participant should be marked as deposited");
        assertEq(escrow.getParticipantsCount(), 1, "Participant count should be 1");
        
        vm.stopPrank();
    }

    function testWithdraw() public {
        // First deposit
        vm.startPrank(participant);
        platformToken.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit();
        
        uint256 balanceAfterDeposit = platformToken.balanceOf(participant);
        
        // Then withdraw
        escrow.withdraw();
        
        uint256 finalBalance = platformToken.balanceOf(participant);
        assertEq(finalBalance, balanceAfterDeposit + DEPOSIT_AMOUNT, "Balance should be restored");
        assertFalse(escrow.hasDeposited(participant), "Participant should not be marked as deposited");
        assertEq(escrow.getParticipantsCount(), 0, "Participant count should be 0");
        
        vm.stopPrank();
    }

    function testCloseDeposits() public {
        vm.startPrank(participant);
        platformToken.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit();
        vm.stopPrank();
        
        vm.startPrank(oracle);
        escrow.closeDeposits();
        vm.stopPrank();
        
        assertEq(uint256(escrow.state()), uint256(Escrow.EscrowState.IN_PROGRESS), "State should be IN_PROGRESS");
    }

    function testDistribute() public {
        // Setup: Multiple participants deposit
        address participant2 = address(0x3);
        // Mint USDC to participant2, then deposit to get platform tokens
        paymentToken.mint(participant2, 1000e6);
        vm.startPrank(participant2);
        paymentToken.approve(address(treasury), 1000e6);
        treasury.depositUSDC(1000e6);
        vm.stopPrank();
        
        vm.startPrank(participant);
        platformToken.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit();
        vm.stopPrank();
        
        vm.startPrank(participant2);
        platformToken.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit();
        vm.stopPrank();
        
        // Close deposits
        vm.startPrank(oracle);
        escrow.closeDeposits();
        
        // Distribute with payouts (50% to first participant, 50% to second)
        uint256[] memory payouts = new uint256[](2);
        payouts[0] = 5000; // 50% in basis points
        payouts[1] = 5000; // 50% in basis points
        escrow.distribute(payouts);
        vm.stopPrank();
        
        assertEq(uint256(escrow.state()), uint256(Escrow.EscrowState.SETTLED), "State should be SETTLED");
    }

    function testCancelAndRefund() public {
        vm.startPrank(participant);
        platformToken.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit();
        vm.stopPrank();
        
        uint256 initialBalance = platformToken.balanceOf(participant);
        
        vm.startPrank(owner);
        escrow.cancelAndRefund();
        vm.stopPrank();
        
        assertEq(uint256(escrow.state()), uint256(Escrow.EscrowState.CANCELLED), "State should be CANCELLED");
        assertEq(platformToken.balanceOf(participant), initialBalance + DEPOSIT_AMOUNT, "Participant should be refunded");
    }

    function testEmergencyWithdraw() public {
        vm.startPrank(participant);
        platformToken.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit();
        vm.stopPrank();
        
        // Fast forward past end time
        vm.warp(block.timestamp + 2 days);
        
        vm.startPrank(participant);
        uint256 initialBalance = platformToken.balanceOf(participant);
        escrow.emergencyWithdraw();
        vm.stopPrank();
        
        assertEq(platformToken.balanceOf(participant), initialBalance + DEPOSIT_AMOUNT, "Participant should receive emergency withdrawal");
    }

    function testFailDepositInsufficientAllowance() public {
        vm.startPrank(participant);
        platformToken.approve(address(escrow), DEPOSIT_AMOUNT - 1);
        escrow.deposit();
        vm.stopPrank();
    }

    function testFailDepositInsufficientBalance() public {
        address poorParticipant = address(0x4);
        vm.startPrank(poorParticipant);
        platformToken.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit();
        vm.stopPrank();
    }

    function testFailWithdrawNotDeposited() public {
        vm.startPrank(participant);
        escrow.withdraw();
        vm.stopPrank();
    }

    function testFailCloseDepositsNotOracle() public {
        vm.startPrank(participant);
        escrow.closeDeposits();
        vm.stopPrank();
    }

    function testFailDistributeNotOracle() public {
        vm.startPrank(participant);
        uint256[] memory payouts = new uint256[](1);
        payouts[0] = 10000;
        escrow.distribute(payouts);
        vm.stopPrank();
    }

    function testFailCancelNotOwner() public {
        vm.startPrank(participant);
        escrow.cancelAndRefund();
        vm.stopPrank();
    }

    function testFailEmergencyWithdrawBeforeEndTime() public {
        vm.startPrank(participant);
        platformToken.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit();
        escrow.emergencyWithdraw();
        vm.stopPrank();
    }

    function testFailDepositAfterClose() public {
        vm.startPrank(oracle);
        escrow.closeDeposits();
        vm.stopPrank();
        
        vm.startPrank(participant);
        platformToken.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit();
        vm.stopPrank();
    }

    function testFailWithdrawAfterClose() public {
        vm.startPrank(participant);
        platformToken.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit();
        vm.stopPrank();
        
        vm.startPrank(oracle);
        escrow.closeDeposits();
        vm.stopPrank();
        
        vm.startPrank(participant);
        escrow.withdraw();
        vm.stopPrank();
    }

    function testMaxParticipants() public {
        // Add participants up to the max
        for (uint i = 0; i < 10; i++) {
            address newParticipant = address(uint160(0x100 + i));
            // Mint USDC to newParticipant, then deposit to get platform tokens
            paymentToken.mint(newParticipant, 1000e6);
            vm.startPrank(newParticipant);
            paymentToken.approve(address(treasury), 1000e6);
            treasury.depositUSDC(1000e6);
            platformToken.approve(address(escrow), DEPOSIT_AMOUNT);
            escrow.deposit();
            vm.stopPrank();
        }
        
        assertEq(escrow.getParticipantsCount(), 10, "Should have max participants");
        
        // Try to add one more participant - should fail
        address extraParticipant = address(uint160(0x10A));
        paymentToken.mint(extraParticipant, 1000e6);
        vm.startPrank(extraParticipant);
        paymentToken.approve(address(treasury), 1000e6);
        treasury.depositUSDC(1000e6);
        platformToken.approve(address(escrow), DEPOSIT_AMOUNT);
        vm.expectRevert("Escrow full");
        escrow.deposit(); // This should revert
        vm.stopPrank();
    }

    function testMultipleParticipants() public {
        address participant2 = address(0x3);
        address participant3 = address(0x4);
        
        // Mint USDC to participants, then deposit to get platform tokens
        paymentToken.mint(participant2, 1000e6);
        paymentToken.mint(participant3, 1000e6);
        
        vm.startPrank(participant2);
        paymentToken.approve(address(treasury), 1000e6);
        treasury.depositUSDC(1000e6);
        vm.stopPrank();
        
        vm.startPrank(participant3);
        paymentToken.approve(address(treasury), 1000e6);
        treasury.depositUSDC(1000e6);
        vm.stopPrank();
        
        // First participant
        vm.startPrank(participant);
        platformToken.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit();
        vm.stopPrank();
        
        // Second participant
        vm.startPrank(participant2);
        platformToken.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit();
        vm.stopPrank();
        
        // Third participant
        vm.startPrank(participant3);
        platformToken.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit();
        vm.stopPrank();
        
        assertEq(escrow.getParticipantsCount(), 3, "Should have 3 participants");
        assertTrue(escrow.hasDeposited(participant), "First participant should be deposited");
        assertTrue(escrow.hasDeposited(participant2), "Second participant should be deposited");
        assertTrue(escrow.hasDeposited(participant3), "Third participant should be deposited");
    }
} 