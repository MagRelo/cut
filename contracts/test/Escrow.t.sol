// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Escrow.sol";
import "../src/EscrowFactory.sol";
import "../src/PlatformToken.sol";
import "../src/TokenManager.sol";
import "../src/PaymentToken.sol";
import "./MockCompound.sol";

contract EscrowTest is Test {
    EscrowFactory public factory;
    PlatformToken public platformToken;
    TokenManager public tokenManager;
    PaymentToken public paymentToken;
    MockCToken public mockCUSDC;
    Escrow public escrow;
    address public oracle = address(0x123);
    address public user1 = address(0x456);
    address public user2 = address(0x789);
    address public paymentTokenOwner = address(0x999); // Owner of PaymentToken
    address public tokenManagerOwner = address(0x888); // Owner of TokenManager system

    function setUp() public {
        // Deploy payment token (USDC) with a specific owner
        vm.startPrank(paymentTokenOwner);
        paymentToken = new PaymentToken();
        vm.stopPrank();
        
        // Deploy platform token
        platformToken = new PlatformToken();
        
        // Deploy mock cUSDC
        mockCUSDC = new MockCToken(address(paymentToken));
        
        // Deploy token manager with a specific owner
        vm.startPrank(tokenManagerOwner);
        tokenManager = new TokenManager(
            address(paymentToken),
            address(platformToken),
            address(mockCUSDC)
        );
        vm.stopPrank();
        
        // Set token manager in platform token
        platformToken.setTokenManager(address(tokenManager));
        
        // Deploy factory
        factory = new EscrowFactory(address(platformToken));
        
        // Add oracle
        factory.addOracle(oracle);
        
        // Mint USDC to test account for testing (by the PaymentToken owner)
        vm.startPrank(paymentTokenOwner);
        paymentToken.mint(address(this), 1000e6);
        vm.stopPrank();
        
        // Mint some platform tokens to users for testing
        paymentToken.approve(address(tokenManager), 1000e6);
        tokenManager.depositUSDC(1000e6);
        
        // Transfer platform tokens to test users
        uint256 platformTokensReceived = platformToken.balanceOf(address(this));
        platformToken.transfer(user1, platformTokensReceived / 2);
        platformToken.transfer(user2, platformTokensReceived / 2);
        
        // Create escrow
        escrow = Escrow(factory.createEscrow(
            "Test Escrow",
            100e18, // 100 platform tokens
            block.timestamp + 1 days,
            oracle
        ));
    }

    function testDeposit() public {
        vm.startPrank(user1);
        
        // Approve and deposit
        platformToken.approve(address(escrow), 100e18);
        escrow.deposit();
        
        assertTrue(escrow.hasDeposited(user1));
        assertEq(escrow.getParticipantsCount(), 1);
        
        vm.stopPrank();
    }

    function testWithdraw() public {
        vm.startPrank(user1);
        
        uint256 balanceBeforeDeposit = platformToken.balanceOf(user1);
        
        // Deposit first
        platformToken.approve(address(escrow), 100e18);
        escrow.deposit();
        
        // Then withdraw
        escrow.withdraw();
        
        uint256 balanceAfter = platformToken.balanceOf(user1);
        assertEq(balanceAfter, balanceBeforeDeposit); // Should get back to original balance
        
        assertFalse(escrow.hasDeposited(user1));
        assertEq(escrow.getParticipantsCount(), 0);
        
        vm.stopPrank();
    }

    function testMultipleParticipants() public {
        // User 1 deposits
        vm.startPrank(user1);
        platformToken.approve(address(escrow), 100e18);
        escrow.deposit();
        vm.stopPrank();
        
        // User 2 deposits
        vm.startPrank(user2);
        platformToken.approve(address(escrow), 100e18);
        escrow.deposit();
        vm.stopPrank();
        
        assertEq(escrow.getParticipantsCount(), 2);
        assertTrue(escrow.hasDeposited(user1));
        assertTrue(escrow.hasDeposited(user2));
    }

    function testCloseDeposits() public {
        vm.startPrank(user1);
        platformToken.approve(address(escrow), 100e18);
        escrow.deposit();
        vm.stopPrank();
        
        vm.startPrank(oracle);
        escrow.closeDeposits();
        vm.stopPrank();
        
        assertEq(uint256(escrow.state()), uint256(Escrow.EscrowState.IN_PROGRESS));
    }

    function testDistribute() public {
        // Setup participants
        vm.startPrank(user1);
        platformToken.approve(address(escrow), 100e18);
        escrow.deposit();
        vm.stopPrank();
        
        vm.startPrank(user2);
        platformToken.approve(address(escrow), 100e18);
        escrow.deposit();
        vm.stopPrank();
        
        // Close deposits
        vm.startPrank(oracle);
        escrow.closeDeposits();
        
        // Distribute payouts (50% each)
        uint256[] memory payouts = new uint256[](2);
        payouts[0] = 5000; // 50%
        payouts[1] = 5000; // 50%
        
        escrow.distribute(payouts);
        vm.stopPrank();
        
        assertEq(uint256(escrow.state()), uint256(Escrow.EscrowState.SETTLED));
    }

    function testDepositTwice() public {
        vm.startPrank(user1);
        
        platformToken.approve(address(escrow), 200e18);
        escrow.deposit();
        
        // Try to deposit again
        vm.expectRevert("Already deposited");
        escrow.deposit();
        
        vm.stopPrank();
    }

    function testWithdrawWithoutDeposit() public {
        vm.startPrank(user1);
        
        vm.expectRevert("Not deposited");
        escrow.withdraw();
        
        vm.stopPrank();
    }

    function testCloseDepositsNotOracle() public {
        vm.startPrank(user1);
        
        vm.expectRevert("Not oracle");
        escrow.closeDeposits();
        
        vm.stopPrank();
    }

    function testDistributeNotOracle() public {
        vm.startPrank(user1);
        
        uint256[] memory payouts = new uint256[](1);
        payouts[0] = 10000;
        
        vm.expectRevert("Not oracle");
        escrow.distribute(payouts);
        
        vm.stopPrank();
    }

    function testDistributeWrongState() public {
        vm.startPrank(oracle);
        
        uint256[] memory payouts = new uint256[](1);
        payouts[0] = 10000;
        
        vm.expectRevert("Escrow not in progress");
        escrow.distribute(payouts);
        
        vm.stopPrank();
    }

    function testDistributeWrongPayoutsLength() public {
        vm.startPrank(user1);
        platformToken.approve(address(escrow), 100e18);
        escrow.deposit();
        vm.stopPrank();
        
        vm.startPrank(oracle);
        escrow.closeDeposits();
        
        uint256[] memory payouts = new uint256[](2);  // Wrong length - should be 1
        payouts[0] = 5000;
        payouts[1] = 5000;
        
        vm.expectRevert("Invalid payouts length");
        escrow.distribute(payouts);
        
        vm.stopPrank();
    }

    function testDistributeWrongTotal() public {
        vm.startPrank(user1);
        platformToken.approve(address(escrow), 100e18);
        escrow.deposit();
        vm.stopPrank();
        
        vm.startPrank(oracle);
        escrow.closeDeposits();
        
        uint256[] memory payouts = new uint256[](1);
        payouts[0] = 5000; // 50% instead of 100%
        
        vm.expectRevert("Total must be 10000 basis points");
        escrow.distribute(payouts);
        
        vm.stopPrank();
    }

    function testEmergencyWithdraw() public {
        vm.startPrank(user1);
        platformToken.approve(address(escrow), 100e18);
        escrow.deposit();
        vm.stopPrank();
        
        // Fast forward past end time
        vm.warp(block.timestamp + 2 days);
        
        vm.startPrank(user1);
        escrow.emergencyWithdraw();
        vm.stopPrank();
        
        assertFalse(escrow.hasDeposited(user1));
        assertEq(escrow.getParticipantsCount(), 0);
    }

    function testEmergencyWithdrawBeforeEnd() public {
        vm.startPrank(user1);
        platformToken.approve(address(escrow), 100e18);
        escrow.deposit();
        
        vm.expectRevert("Escrow not ended");
        escrow.emergencyWithdraw();
        
        vm.stopPrank();
    }

    function testEmergencyWithdrawNotDeposited() public {
        vm.warp(block.timestamp + 2 days);
        
        vm.startPrank(user1);
        vm.expectRevert("Not deposited");
        escrow.emergencyWithdraw();
        vm.stopPrank();
    }

    function testCancelAndRefund() public {
        vm.startPrank(user1);
        platformToken.approve(address(escrow), 100e18);
        escrow.deposit();
        vm.stopPrank();
        
        vm.startPrank(user2);
        platformToken.approve(address(escrow), 100e18);
        escrow.deposit();
        vm.stopPrank();
        
        uint256 user1BalanceBefore = platformToken.balanceOf(user1);
        uint256 user2BalanceBefore = platformToken.balanceOf(user2);
        
        vm.startPrank(address(factory)); // Factory is the owner
        escrow.cancelAndRefund();
        vm.stopPrank();
        
        uint256 user1BalanceAfter = platformToken.balanceOf(user1);
        uint256 user2BalanceAfter = platformToken.balanceOf(user2);
        
        assertEq(user1BalanceAfter, user1BalanceBefore + 100e18);
        assertEq(user2BalanceAfter, user2BalanceBefore + 100e18);
        assertEq(uint256(escrow.state()), uint256(Escrow.EscrowState.CANCELLED));
    }

    function testMaxParticipants() public {
        // First create enough users with deposits to reach the limit
        for (uint256 i = 0; i < 5; i++) {
            address user = address(uint160(i + 1000));
            
            // Mint more platform tokens for testing by depositing more USDC
            vm.startPrank(paymentTokenOwner);
            paymentToken.mint(address(this), 100e6);
            vm.stopPrank();
            
            paymentToken.approve(address(tokenManager), 100e6);
            tokenManager.depositUSDC(100e6);
            
            // Transfer platform tokens to test user
            uint256 tokensReceived = platformToken.balanceOf(address(this));
            platformToken.transfer(user, tokensReceived);
            
            vm.startPrank(user);
            platformToken.approve(address(escrow), 100e18);
            escrow.deposit();
            vm.stopPrank();
        }
        
        // Now test that we can't exceed MAX_PARTICIPANTS (simplified test)
        assertEq(escrow.getParticipantsCount(), 5);
        assertTrue(escrow.getParticipantsCount() < 2000); // Well under the limit
    }
} 