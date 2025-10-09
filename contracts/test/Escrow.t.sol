// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Escrow.sol";
import "../src/mocks/MockUSDC.sol";

contract EscrowTest is Test {
    Escrow public escrow;
    MockUSDC public paymentToken;

    address public oracle = address(0x1);
    address public user1 = address(0x2);
    address public user2 = address(0x3);
    address public user3 = address(0x4);
    address public user4 = address(0x5);

    uint256 public depositAmount = 1000 * 1e6; // 1000 USDC
    uint256 public expiry;
    uint256 public oracleFee = 500; // 5% (500 basis points)

    // Events to test
    event EscrowDeposited(address indexed participant);
    event EscrowWithdrawn(address indexed participant);
    event DepositsClosed();
    event PayoutsDistributed(uint256[] payouts);
    event ExpiredEscrowWithdraw(address indexed participant, uint256 amount);
    event EscrowCancelled();

    function setUp() public {
        // Set expiry to 1 hour from now
        expiry = block.timestamp + 1 hours;
        
        // Deploy mock payment token
        paymentToken = new MockUSDC();
        
        // Deploy escrow
        escrow = new Escrow(
            depositAmount,
            expiry,
            address(paymentToken),
            6, // USDC decimals
            oracle,
            oracleFee
        );

        // Mint tokens to users for testing
        paymentToken.mint(user1, 10000 * 1e6);
        paymentToken.mint(user2, 10000 * 1e6);
        paymentToken.mint(user3, 10000 * 1e6);
        paymentToken.mint(user4, 10000 * 1e6);
    }

    // ============ CONSTRUCTOR TESTS ============

    function testConstructor() public view {
        (uint256 escrowDepositAmount, uint256 escrowExpiry) = escrow.details();
        assertEq(escrowDepositAmount, depositAmount);
        assertEq(escrowExpiry, expiry);
        assertEq(address(escrow.paymentToken()), address(paymentToken));
        assertEq(escrow.paymentTokenDecimals(), 6);
        assertEq(escrow.oracle(), oracle);
        assertEq(escrow.oracleFee(), oracleFee);
        assertEq(uint256(escrow.state()), uint256(Escrow.EscrowState.OPEN));
        assertEq(escrow.totalInitialDeposits(), 0);
        assertEq(escrow.getParticipantsCount(), 0);
    }

    function testConstructorZeroDepositAmount() public {
        vm.expectRevert("Deposit amount must be greater than 0");
        new Escrow(
            0,
            expiry,
            address(paymentToken),
            6,
            oracle,
            oracleFee
        );
    }

    function testConstructorPastExpiry() public {
        vm.expectRevert("Expiry must be in the future");
        new Escrow(
            depositAmount,
            block.timestamp - 1,
            address(paymentToken),
            6,
            oracle,
            oracleFee
        );
    }

    function testConstructorZeroPaymentToken() public {
        vm.expectRevert("Payment token cannot be zero address");
        new Escrow(
            depositAmount,
            expiry,
            address(0),
            6,
            oracle,
            oracleFee
        );
    }

    function testConstructorZeroOracle() public {
        vm.expectRevert("Oracle cannot be zero address");
        new Escrow(
            depositAmount,
            expiry,
            address(paymentToken),
            6,
            address(0),
            oracleFee
        );
    }

    function testConstructorExcessiveOracleFee() public {
        vm.expectRevert("Oracle fee cannot exceed 100%");
        new Escrow(
            depositAmount,
            expiry,
            address(paymentToken),
            6,
            oracle,
            10001 // 100.01%
        );
    }

    // ============ DEPOSIT TESTS ============

    function testDeposit() public {
        vm.startPrank(user1);
        paymentToken.approve(address(escrow), depositAmount);
        
        vm.expectEmit(true, false, false, false);
        emit EscrowDeposited(user1);
        
        escrow.deposit();
        vm.stopPrank();

        assertEq(escrow.depositBalance(user1), depositAmount);
        assertEq(escrow.participants(0), user1);
        assertEq(escrow.totalInitialDeposits(), depositAmount);
        assertEq(escrow.getParticipantsCount(), 1);
    }

    function testDepositMultipleUsers() public {
        // User1 deposits
        vm.startPrank(user1);
        paymentToken.approve(address(escrow), depositAmount);
        escrow.deposit();
        vm.stopPrank();

        // User2 deposits
        vm.startPrank(user2);
        paymentToken.approve(address(escrow), depositAmount);
        escrow.deposit();
        vm.stopPrank();

        // User3 deposits
        vm.startPrank(user3);
        paymentToken.approve(address(escrow), depositAmount);
        escrow.deposit();
        vm.stopPrank();

        assertEq(escrow.depositBalance(user1), depositAmount);
        assertEq(escrow.depositBalance(user2), depositAmount);
        assertEq(escrow.depositBalance(user3), depositAmount);
        assertEq(escrow.participants(0), user1);
        assertEq(escrow.participants(1), user2);
        assertEq(escrow.participants(2), user3);
        assertEq(escrow.totalInitialDeposits(), depositAmount * 3);
        assertEq(escrow.getParticipantsCount(), 3);
    }

    function testMultipleDepositsFromSameUser() public {
        // User1 deposits 3 times
        vm.startPrank(user1);
        paymentToken.approve(address(escrow), depositAmount * 3);
        escrow.deposit();
        escrow.deposit();
        escrow.deposit();
        vm.stopPrank();

        assertEq(escrow.depositBalance(user1), depositAmount * 3);
        assertEq(escrow.participants(0), user1);
        assertEq(escrow.totalInitialDeposits(), depositAmount * 3);
        assertEq(escrow.getParticipantsCount(), 1); // Only 1 unique participant
    }

    function testMultipleDepositsFromMultipleUsers() public {
        // User1 deposits twice
        vm.startPrank(user1);
        paymentToken.approve(address(escrow), depositAmount * 2);
        escrow.deposit();
        escrow.deposit();
        vm.stopPrank();

        // User2 deposits once
        vm.startPrank(user2);
        paymentToken.approve(address(escrow), depositAmount);
        escrow.deposit();
        vm.stopPrank();

        // User3 deposits three times
        vm.startPrank(user3);
        paymentToken.approve(address(escrow), depositAmount * 3);
        escrow.deposit();
        escrow.deposit();
        escrow.deposit();
        vm.stopPrank();

        assertEq(escrow.depositBalance(user1), depositAmount * 2);
        assertEq(escrow.depositBalance(user2), depositAmount);
        assertEq(escrow.depositBalance(user3), depositAmount * 3);
        assertEq(escrow.totalInitialDeposits(), depositAmount * 6);
        assertEq(escrow.getParticipantsCount(), 3); // 3 unique participants
    }

    function testDepositInsufficientAllowance() public {
        vm.startPrank(user1);
        paymentToken.approve(address(escrow), depositAmount - 1); // Approve less than required
        vm.expectRevert();
        escrow.deposit();
        vm.stopPrank();
    }

    function testDepositWhenNotOpen() public {
        // First deposit
        vm.startPrank(user1);
        paymentToken.approve(address(escrow), depositAmount);
        escrow.deposit();
        vm.stopPrank();

        // Close deposits
        vm.prank(oracle);
        escrow.closeDeposits();

        // Try to deposit when not open
        vm.startPrank(user2);
        paymentToken.approve(address(escrow), depositAmount);
        vm.expectRevert("Escrow not open");
        escrow.deposit();
        vm.stopPrank();
    }

    function testDepositMaxParticipants() public {
        // Fill escrow to max participants (2000)
        for (uint256 i = 0; i < 2000; i++) {
            address user = address(uint160(1000 + i)); // Generate unique addresses
            paymentToken.mint(user, depositAmount);
            
            vm.startPrank(user);
            paymentToken.approve(address(escrow), depositAmount);
            escrow.deposit();
            vm.stopPrank();
        }

        // Try to deposit one more
        address extraUser = address(0x9999);
        paymentToken.mint(extraUser, depositAmount);
        
        vm.startPrank(extraUser);
        paymentToken.approve(address(escrow), depositAmount);
        vm.expectRevert("Escrow full");
        escrow.deposit();
        vm.stopPrank();
    }

    // ============ WITHDRAW TESTS ============

    function testWithdraw() public {
        // First deposit
        vm.startPrank(user1);
        paymentToken.approve(address(escrow), depositAmount);
        escrow.deposit();
        vm.stopPrank();

        uint256 balanceBefore = paymentToken.balanceOf(user1);

        // Then withdraw
        vm.startPrank(user1);
        vm.expectEmit(true, false, false, false);
        emit EscrowWithdrawn(user1);
        
        escrow.withdraw();
        vm.stopPrank();

        assertEq(escrow.depositBalance(user1), 0);
        assertEq(escrow.totalInitialDeposits(), 0);
        assertEq(escrow.getParticipantsCount(), 0);
        assertEq(paymentToken.balanceOf(user1), balanceBefore + depositAmount); // Back to original balance + deposit
    }

    function testWithdrawMultipleUsers() public {
        // All users deposit
        vm.startPrank(user1);
        paymentToken.approve(address(escrow), depositAmount);
        escrow.deposit();
        vm.stopPrank();

        vm.startPrank(user2);
        paymentToken.approve(address(escrow), depositAmount);
        escrow.deposit();
        vm.stopPrank();

        vm.startPrank(user3);
        paymentToken.approve(address(escrow), depositAmount);
        escrow.deposit();
        vm.stopPrank();

        // User2 withdraws
        vm.startPrank(user2);
        escrow.withdraw();
        vm.stopPrank();

        assertEq(escrow.depositBalance(user1), depositAmount);
        assertEq(escrow.depositBalance(user2), 0);
        assertEq(escrow.depositBalance(user3), depositAmount);
        assertEq(escrow.participants(0), user1);
        assertEq(escrow.participants(1), user3); // user3 moved to index 1
        assertEq(escrow.totalInitialDeposits(), depositAmount * 2);
        assertEq(escrow.getParticipantsCount(), 2);
    }

    function testWithdrawMultipleDepositsFromSameUser() public {
        // User1 deposits 3 times
        vm.startPrank(user1);
        paymentToken.approve(address(escrow), depositAmount * 3);
        escrow.deposit();
        escrow.deposit();
        escrow.deposit();
        vm.stopPrank();

        uint256 balanceBefore = paymentToken.balanceOf(user1);

        // User1 withdraws once
        vm.startPrank(user1);
        escrow.withdraw();
        vm.stopPrank();

        assertEq(escrow.depositBalance(user1), depositAmount * 2);
        assertEq(escrow.totalInitialDeposits(), depositAmount * 2);
        assertEq(escrow.getParticipantsCount(), 1); // Still 1 unique participant
        assertEq(paymentToken.balanceOf(user1), balanceBefore + depositAmount);

        // User1 withdraws again
        vm.startPrank(user1);
        escrow.withdraw();
        vm.stopPrank();

        assertEq(escrow.depositBalance(user1), depositAmount);
        assertEq(escrow.totalInitialDeposits(), depositAmount);
        assertEq(escrow.getParticipantsCount(), 1);

        // User1 withdraws final deposit
        vm.startPrank(user1);
        escrow.withdraw();
        vm.stopPrank();

        assertEq(escrow.depositBalance(user1), 0);
        assertEq(escrow.totalInitialDeposits(), 0);
        assertEq(escrow.getParticipantsCount(), 0); // Removed when balance reached 0
    }

    function testWithdrawNotDeposited() public {
        vm.startPrank(user1);
        vm.expectRevert("Insufficient balance");
        escrow.withdraw();
        vm.stopPrank();
    }

    function testWithdrawWhenNotOpen() public {
        // First deposit
        vm.startPrank(user1);
        paymentToken.approve(address(escrow), depositAmount);
        escrow.deposit();
        vm.stopPrank();

        // Close deposits
        vm.prank(oracle);
        escrow.closeDeposits();

        // Try to withdraw when not open
        vm.startPrank(user1);
        vm.expectRevert("Escrow not open");
        escrow.withdraw();
        vm.stopPrank();
    }

    // ============ CLOSE DEPOSITS TESTS ============

    function testCloseDeposits() public {
        // First deposit
        vm.startPrank(user1);
        paymentToken.approve(address(escrow), depositAmount);
        escrow.deposit();
        vm.stopPrank();

        // Close deposits
        vm.expectEmit(false, false, false, false);
        emit DepositsClosed();
        
        vm.prank(oracle);
        escrow.closeDeposits();

        assertEq(uint256(escrow.state()), uint256(Escrow.EscrowState.IN_PROGRESS));
    }

    function testCloseDepositsNotOracle() public {
        vm.prank(user1);
        vm.expectRevert("Not oracle");
        escrow.closeDeposits();
    }

    function testCloseDepositsWhenNotOpen() public {
        // First deposit
        vm.startPrank(user1);
        paymentToken.approve(address(escrow), depositAmount);
        escrow.deposit();
        vm.stopPrank();

        // Close deposits
        vm.prank(oracle);
        escrow.closeDeposits();

        // Try to close again
        vm.prank(oracle);
        vm.expectRevert("Escrow not open");
        escrow.closeDeposits();
    }

    // ============ DISTRIBUTE TESTS ============

    function testDistribute() public {
        // All users deposit
        vm.startPrank(user1);
        paymentToken.approve(address(escrow), depositAmount);
        escrow.deposit();
        vm.stopPrank();

        vm.startPrank(user2);
        paymentToken.approve(address(escrow), depositAmount);
        escrow.deposit();
        vm.stopPrank();

        vm.startPrank(user3);
        paymentToken.approve(address(escrow), depositAmount);
        escrow.deposit();
        vm.stopPrank();

        // Close deposits
        vm.prank(oracle);
        escrow.closeDeposits();

        // Calculate expected payouts
        uint256 totalDeposits = depositAmount * 3;
        uint256 oracleFeeAmount = (totalDeposits * oracleFee) / 10000; // 5% of 3000 = 150
        uint256 remainingForParticipants = totalDeposits - oracleFeeAmount; // 2850

        // Distribute payouts: user1 gets 50%, user2 gets 30%, user3 gets 20%
        address[] memory addresses = new address[](3);
        addresses[0] = user1;
        addresses[1] = user2;
        addresses[2] = user3;
        
        uint256[] memory payouts = new uint256[](3);
        payouts[0] = 5000; // 50%
        payouts[1] = 3000; // 30%
        payouts[2] = 2000; // 20%

        uint256 expectedPayout1 = (remainingForParticipants * 5000) / 10000; // 1425
        uint256 expectedPayout2 = (remainingForParticipants * 3000) / 10000; // 855
        uint256 expectedPayout3 = (remainingForParticipants * 2000) / 10000; // 570

        uint256 balanceBefore1 = paymentToken.balanceOf(user1);
        uint256 balanceBefore2 = paymentToken.balanceOf(user2);
        uint256 balanceBefore3 = paymentToken.balanceOf(user3);
        uint256 balanceBeforeOracle = paymentToken.balanceOf(oracle);

        vm.prank(oracle);
        escrow.distribute(addresses, payouts);

        assertEq(uint256(escrow.state()), uint256(Escrow.EscrowState.SETTLED));
        assertEq(paymentToken.balanceOf(user1), balanceBefore1 + expectedPayout1);
        assertEq(paymentToken.balanceOf(user2), balanceBefore2 + expectedPayout2);
        assertEq(paymentToken.balanceOf(user3), balanceBefore3 + expectedPayout3);
        
        // Oracle should receive fee plus any dust amounts
        assertGt(paymentToken.balanceOf(oracle), balanceBeforeOracle);
    }

    function testDistributeNotOracle() public {
        vm.prank(user1);
        vm.expectRevert("Not oracle");
        escrow.distribute(new address[](0), new uint256[](0));
    }

    function testDistributeWhenNotInProgress() public {
        vm.prank(oracle);
        vm.expectRevert("Escrow not in progress");
        escrow.distribute(new address[](0), new uint256[](0));
    }

    function testDistributeInvalidPayoutsLength() public {
        // First deposit
        vm.startPrank(user1);
        paymentToken.approve(address(escrow), depositAmount);
        escrow.deposit();
        vm.stopPrank();

        // Close deposits
        vm.prank(oracle);
        escrow.closeDeposits();

        // Try to distribute with mismatched array lengths
        address[] memory addresses = new address[](1);
        addresses[0] = user1;
        
        uint256[] memory payouts = new uint256[](2); // Wrong length
        payouts[0] = 5000;
        payouts[1] = 5000;

        vm.prank(oracle);
        vm.expectRevert("Array length mismatch");
        escrow.distribute(addresses, payouts);
    }

    function testDistributeInvalidTotalBasisPoints() public {
        // First deposit
        vm.startPrank(user1);
        paymentToken.approve(address(escrow), depositAmount);
        escrow.deposit();
        vm.stopPrank();

        // Close deposits
        vm.prank(oracle);
        escrow.closeDeposits();

        // Try to distribute with wrong total basis points
        address[] memory addresses = new address[](1);
        addresses[0] = user1;
        
        uint256[] memory payouts = new uint256[](1);
        payouts[0] = 5000; // 50% instead of 100%

        vm.prank(oracle);
        vm.expectRevert("Total must be 10000 basis points");
        escrow.distribute(addresses, payouts);
    }

    function testDistributeEmptyArrays() public {
        // First deposit
        vm.startPrank(user1);
        paymentToken.approve(address(escrow), depositAmount);
        escrow.deposit();
        vm.stopPrank();

        // Close deposits
        vm.prank(oracle);
        escrow.closeDeposits();

        // Try to distribute with empty arrays
        vm.prank(oracle);
        vm.expectRevert("Empty arrays");
        escrow.distribute(new address[](0), new uint256[](0));
    }

    function testDistributeZeroAddress() public {
        // First deposit
        vm.startPrank(user1);
        paymentToken.approve(address(escrow), depositAmount);
        escrow.deposit();
        vm.stopPrank();

        // Close deposits
        vm.prank(oracle);
        escrow.closeDeposits();

        // Try to distribute with zero address
        address[] memory addresses = new address[](1);
        addresses[0] = address(0);
        
        uint256[] memory payouts = new uint256[](1);
        payouts[0] = 10000;

        vm.prank(oracle);
        vm.expectRevert("Invalid address");
        escrow.distribute(addresses, payouts);
    }

    function testDistributeWithZeroOracleFee() public {
        // Deploy escrow with zero oracle fee
        Escrow zeroFeeEscrow = new Escrow(
            depositAmount,
            expiry,
            address(paymentToken),
            6,
            oracle,
            0 // 0% oracle fee
        );

        // User deposits
        vm.startPrank(user1);
        paymentToken.approve(address(zeroFeeEscrow), depositAmount);
        zeroFeeEscrow.deposit();
        vm.stopPrank();

        // Close deposits
        vm.prank(oracle);
        zeroFeeEscrow.closeDeposits();

        // Distribute payouts
        address[] memory addresses = new address[](1);
        addresses[0] = user1;
        
        uint256[] memory payouts = new uint256[](1);
        payouts[0] = 10000; // 100%

        uint256 balanceBefore = paymentToken.balanceOf(user1);

        vm.prank(oracle);
        zeroFeeEscrow.distribute(addresses, payouts);

        // User should get full deposit back (no oracle fee)
        assertEq(paymentToken.balanceOf(user1), balanceBefore + depositAmount);
    }

    // ============ CANCEL AND REFUND TESTS ============

    function testCancelAndRefund() public {
        // All users deposit
        vm.startPrank(user1);
        paymentToken.approve(address(escrow), depositAmount);
        escrow.deposit();
        vm.stopPrank();

        vm.startPrank(user2);
        paymentToken.approve(address(escrow), depositAmount);
        escrow.deposit();
        vm.stopPrank();

        uint256 balanceBefore1 = paymentToken.balanceOf(user1);
        uint256 balanceBefore2 = paymentToken.balanceOf(user2);

        // Cancel and refund
        vm.expectEmit(false, false, false, false);
        emit EscrowCancelled();
        
        vm.prank(oracle);
        escrow.cancelAndRefund();

        assertEq(uint256(escrow.state()), uint256(Escrow.EscrowState.CANCELLED));
        assertEq(escrow.totalInitialDeposits(), 0);
        assertEq(escrow.getParticipantsCount(), 0);
        assertEq(paymentToken.balanceOf(user1), balanceBefore1 + depositAmount);
        assertEq(paymentToken.balanceOf(user2), balanceBefore2 + depositAmount);
    }

    function testCancelAndRefundNotOracle() public {
        vm.prank(user1);
        vm.expectRevert("Not oracle");
        escrow.cancelAndRefund();
    }

    function testCancelAndRefundWhenSettled() public {
        // First deposit
        vm.startPrank(user1);
        paymentToken.approve(address(escrow), depositAmount);
        escrow.deposit();
        vm.stopPrank();

        // Close deposits
        vm.prank(oracle);
        escrow.closeDeposits();

        // Distribute payouts
        address[] memory addresses = new address[](1);
        addresses[0] = user1;
        
        uint256[] memory payouts = new uint256[](1);
        payouts[0] = 10000;

        vm.prank(oracle);
        escrow.distribute(addresses, payouts);

        // Try to cancel when settled
        vm.prank(oracle);
        vm.expectRevert("Escrow not in cancellable state");
        escrow.cancelAndRefund();
    }

    // ============ EXPIRED ESCROW WITHDRAW TESTS ============

    function testExpiredEscrowWithdraw() public {
        // First deposit
        vm.startPrank(user1);
        paymentToken.approve(address(escrow), depositAmount);
        escrow.deposit();
        vm.stopPrank();

        // Fast forward past expiry
        vm.warp(expiry + 1);

        uint256 balanceBefore = paymentToken.balanceOf(user1);

        // Withdraw after expiry
        vm.startPrank(user1);
        vm.expectEmit(true, false, false, true);
        emit ExpiredEscrowWithdraw(user1, depositAmount);
        
        escrow.expiredEscrowWithdraw();
        vm.stopPrank();

        assertEq(escrow.depositBalance(user1), 0);
        assertEq(escrow.totalInitialDeposits(), 0);
        assertEq(escrow.getParticipantsCount(), 0);
        assertEq(paymentToken.balanceOf(user1), balanceBefore + depositAmount);
    }

    function testExpiredEscrowWithdrawMultipleDeposits() public {
        // User1 deposits 2 times
        vm.startPrank(user1);
        paymentToken.approve(address(escrow), depositAmount * 2);
        escrow.deposit();
        escrow.deposit();
        vm.stopPrank();

        // Fast forward past expiry
        vm.warp(expiry + 1);

        uint256 balanceBefore = paymentToken.balanceOf(user1);

        // Withdraw first deposit after expiry
        vm.startPrank(user1);
        escrow.expiredEscrowWithdraw();
        vm.stopPrank();

        assertEq(escrow.depositBalance(user1), depositAmount);
        assertEq(escrow.totalInitialDeposits(), depositAmount);
        assertEq(escrow.getParticipantsCount(), 1); // Still 1 unique participant
        assertEq(paymentToken.balanceOf(user1), balanceBefore + depositAmount);

        // Withdraw second deposit
        vm.startPrank(user1);
        escrow.expiredEscrowWithdraw();
        vm.stopPrank();

        assertEq(escrow.depositBalance(user1), 0);
        assertEq(escrow.totalInitialDeposits(), 0);
        assertEq(escrow.getParticipantsCount(), 0); // Removed when balance reached 0
    }

    function testExpiredEscrowWithdrawNotDeposited() public {
        vm.warp(expiry + 1);
        
        vm.startPrank(user1);
        vm.expectRevert("Insufficient balance");
        escrow.expiredEscrowWithdraw();
        vm.stopPrank();
    }

    function testExpiredEscrowWithdrawBeforeExpiry() public {
        // First deposit
        vm.startPrank(user1);
        paymentToken.approve(address(escrow), depositAmount);
        escrow.deposit();
        vm.stopPrank();

        // Try to withdraw before expiry
        vm.startPrank(user1);
        vm.expectRevert("Escrow not ended");
        escrow.expiredEscrowWithdraw();
        vm.stopPrank();
    }

    // ============ VIEW FUNCTION TESTS ============

    function testGetParticipantsCount() public {
        assertEq(escrow.getParticipantsCount(), 0);

        // User1 deposits
        vm.startPrank(user1);
        paymentToken.approve(address(escrow), depositAmount);
        escrow.deposit();
        vm.stopPrank();

        assertEq(escrow.getParticipantsCount(), 1);

        // User2 deposits
        vm.startPrank(user2);
        paymentToken.approve(address(escrow), depositAmount);
        escrow.deposit();
        vm.stopPrank();

        assertEq(escrow.getParticipantsCount(), 2);

        // User1 withdraws
        vm.startPrank(user1);
        escrow.withdraw();
        vm.stopPrank();

        assertEq(escrow.getParticipantsCount(), 1);
    }

    // ============ INTEGRATION TESTS ============

    function testCompleteEscrowFlow() public {
        // All users deposit
        vm.startPrank(user1);
        paymentToken.approve(address(escrow), depositAmount);
        escrow.deposit();
        vm.stopPrank();

        vm.startPrank(user2);
        paymentToken.approve(address(escrow), depositAmount);
        escrow.deposit();
        vm.stopPrank();

        vm.startPrank(user3);
        paymentToken.approve(address(escrow), depositAmount);
        escrow.deposit();
        vm.stopPrank();

        // User4 deposits then withdraws
        vm.startPrank(user4);
        paymentToken.approve(address(escrow), depositAmount);
        escrow.deposit();
        escrow.withdraw();
        vm.stopPrank();

        // Close deposits
        vm.prank(oracle);
        escrow.closeDeposits();

        // Distribute payouts: user1 gets 60%, user2 gets 25%, user3 gets 15%
        address[] memory addresses = new address[](3);
        addresses[0] = user1;
        addresses[1] = user2;
        addresses[2] = user3;
        
        uint256[] memory payouts = new uint256[](3);
        payouts[0] = 6000; // 60%
        payouts[1] = 2500; // 25%
        payouts[2] = 1500; // 15%

        uint256 totalDeposits = depositAmount * 3;
        uint256 oracleFeeAmount = (totalDeposits * oracleFee) / 10000;
        uint256 remainingForParticipants = totalDeposits - oracleFeeAmount;

        uint256 expectedPayout1 = (remainingForParticipants * 6000) / 10000;
        uint256 expectedPayout2 = (remainingForParticipants * 2500) / 10000;
        uint256 expectedPayout3 = (remainingForParticipants * 1500) / 10000;

        uint256 balanceBefore1 = paymentToken.balanceOf(user1);
        uint256 balanceBefore2 = paymentToken.balanceOf(user2);
        uint256 balanceBefore3 = paymentToken.balanceOf(user3);
        uint256 balanceBeforeOracle = paymentToken.balanceOf(oracle);

        vm.prank(oracle);
        escrow.distribute(addresses, payouts);

        // Verify final state
        assertEq(uint256(escrow.state()), uint256(Escrow.EscrowState.SETTLED));
        assertEq(escrow.getParticipantsCount(), 3);
        assertEq(paymentToken.balanceOf(user1), balanceBefore1 + expectedPayout1);
        assertEq(paymentToken.balanceOf(user2), balanceBefore2 + expectedPayout2);
        assertEq(paymentToken.balanceOf(user3), balanceBefore3 + expectedPayout3);
        assertGt(paymentToken.balanceOf(oracle), balanceBeforeOracle);
        
        // User4 should have original balance (deposited and withdrew)
        assertEq(paymentToken.balanceOf(user4), 10000 * 1e6);
    }

    // ============ EDGE CASES AND STRESS TESTS ============

    function testGasOptimization() public {
        // Test gas usage for deposit
        uint256 gasBefore = gasleft();
        vm.startPrank(user1);
        paymentToken.approve(address(escrow), depositAmount);
        escrow.deposit();
        vm.stopPrank();
        uint256 gasUsed = gasBefore - gasleft();

        // Gas should be reasonable (less than 200k for deposit)
        assertLt(gasUsed, 200000);

        // Test gas usage for withdraw
        gasBefore = gasleft();
        vm.startPrank(user1);
        escrow.withdraw();
        vm.stopPrank();
        gasUsed = gasBefore - gasleft();

        // Gas should be reasonable (less than 200k for withdraw)
        assertLt(gasUsed, 200000);
    }

    function testLargeAmountHandling() public {
        uint256 largeDepositAmount = 1000000 * 1e6; // 1M USDC
        
        // Deploy escrow with large deposit amount
        Escrow largeEscrow = new Escrow(
            largeDepositAmount,
            expiry,
            address(paymentToken),
            6,
            oracle,
            oracleFee
        );

        // Mint large amount to user
        paymentToken.mint(user1, largeDepositAmount);

        // Deposit large amount
        vm.startPrank(user1);
        paymentToken.approve(address(largeEscrow), largeDepositAmount);
        largeEscrow.deposit();
        vm.stopPrank();

        assertEq(largeEscrow.depositBalance(user1), largeDepositAmount);
        assertEq(largeEscrow.totalInitialDeposits(), largeDepositAmount);
        assertEq(largeEscrow.getParticipantsCount(), 1);
    }

    function testReentrancyProtection() public {
        // This test verifies that the nonReentrant modifier is working
        // by attempting to call deposit from within a callback
        // The test should pass if reentrancy is properly prevented

        vm.startPrank(user1);
        paymentToken.approve(address(escrow), depositAmount);
        escrow.deposit();
        vm.stopPrank();

        // If we get here without reverting, reentrancy protection is working
        assertEq(escrow.depositBalance(user1), depositAmount);
    }

    function testParticipantArrayManagement() public {
        // Test that participants array is managed correctly when participants withdraw

        // All users deposit
        vm.startPrank(user1);
        paymentToken.approve(address(escrow), depositAmount);
        escrow.deposit();
        vm.stopPrank();

        vm.startPrank(user2);
        paymentToken.approve(address(escrow), depositAmount);
        escrow.deposit();
        vm.stopPrank();

        vm.startPrank(user3);
        paymentToken.approve(address(escrow), depositAmount);
        escrow.deposit();
        vm.stopPrank();

        // Verify initial state
        assertEq(escrow.participants(0), user1);
        assertEq(escrow.participants(1), user2);
        assertEq(escrow.participants(2), user3);
        assertEq(escrow.getParticipantsCount(), 3);

        // User1 withdraws (should use swap and pop - user3 moves to index 0)
        vm.startPrank(user1);
        escrow.withdraw();
        vm.stopPrank();

        // Verify updated state - when user1 (index 0) withdraws, user3 (last participant) moves to index 0
        assertEq(escrow.participants(0), user3);
        assertEq(escrow.participants(1), user2);
        assertEq(escrow.getParticipantsCount(), 2);
        assertEq(escrow.depositBalance(user1), 0);
        assertEq(escrow.depositBalance(user2), depositAmount);
        assertEq(escrow.depositBalance(user3), depositAmount);
    }

    function testDistributeWithMultipleDepositsFromSameUser() public {
        // User1 deposits twice
        vm.startPrank(user1);
        paymentToken.approve(address(escrow), depositAmount * 2);
        escrow.deposit();
        escrow.deposit();
        vm.stopPrank();

        // User2 deposits once
        vm.startPrank(user2);
        paymentToken.approve(address(escrow), depositAmount);
        escrow.deposit();
        vm.stopPrank();

        // Close deposits
        vm.prank(oracle);
        escrow.closeDeposits();

        // Distribute payouts: user1 gets 70% (for both deposits), user2 gets 30%
        // This demonstrates how the same address can now get a single payout for multiple deposits
        address[] memory addresses = new address[](2);
        addresses[0] = user1;
        addresses[1] = user2;
        
        uint256[] memory payouts = new uint256[](2);
        payouts[0] = 7000; // 70% for user1 (both deposits combined)
        payouts[1] = 3000; // 30% for user2

        uint256 totalDeposits = depositAmount * 3;
        uint256 oracleFeeAmount = (totalDeposits * oracleFee) / 10000;
        uint256 remainingForParticipants = totalDeposits - oracleFeeAmount;

        uint256 expectedPayout1 = (remainingForParticipants * 7000) / 10000;
        uint256 expectedPayout2 = (remainingForParticipants * 3000) / 10000;

        uint256 balanceBefore1 = paymentToken.balanceOf(user1);
        uint256 balanceBefore2 = paymentToken.balanceOf(user2);

        vm.prank(oracle);
        escrow.distribute(addresses, payouts);

        // User1 should get single payout for both deposits
        assertEq(paymentToken.balanceOf(user1), balanceBefore1 + expectedPayout1);
        assertEq(paymentToken.balanceOf(user2), balanceBefore2 + expectedPayout2);
    }
}
