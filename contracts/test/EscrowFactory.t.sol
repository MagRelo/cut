// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/EscrowFactory.sol";
import "../src/Escrow.sol";
import "../src/PlatformToken.sol";
import "../src/PaymentToken.sol";
import "../src/TokenManager.sol";

contract EscrowFactoryTest is Test {
    EscrowFactory public factory;
    PlatformToken public platformToken;
    PaymentToken public paymentToken;
    TokenManager public tokenManager;
    address public owner;
    address public oracle;
    uint256 public constant DEPOSIT_AMOUNT = 1000e18; // 1000 Platform tokens with 18 decimals

    function setUp() public {
        owner = address(this);
        oracle = address(0x1);
        address paymentTokenOwner = address(0x999); // Owner of PaymentToken
        
        // Deploy payment token (USDC) with a specific owner
        vm.startPrank(paymentTokenOwner);
        paymentToken = new PaymentToken();
        vm.stopPrank();
        
        platformToken = new PlatformToken();
        
        tokenManager = new TokenManager(
            address(paymentToken),
            address(platformToken),
            address(0x123) // Mock cUSDC address
        );
        
        // Set token manager in platform token
        platformToken.setTokenManager(address(tokenManager));
        
        factory = new EscrowFactory(
            address(platformToken)
        );
    }

    function testCreateEscrow() public {
        factory.addOracle(oracle);
        
        address escrowAddress = factory.createEscrow(
            "Test Escrow",
            DEPOSIT_AMOUNT,
            block.timestamp + 1 days,
            oracle
        );
        
        assertTrue(escrowAddress != address(0), "Escrow should be created");
        
        Escrow[] memory escrows = factory.getEscrows();
        assertEq(escrows.length, 1, "Should have 1 escrow");
        assertEq(address(escrows[0]), escrowAddress, "Escrow address should match");
    }

    function testAddOracle() public {
        factory.addOracle(oracle);
        assertTrue(factory.oracles(oracle), "Oracle should be added");
    }

    function testRemoveOracle() public {
        factory.addOracle(oracle);
        factory.removeOracle(oracle);
        assertFalse(factory.oracles(oracle), "Oracle should be removed");
    }

    function testFailCreateEscrowWithInvalidOracle() public {
        factory.createEscrow(
            "Test Escrow",
            DEPOSIT_AMOUNT,
            block.timestamp + 1 days,
            oracle
        );
    }

    function testFailCreateEscrowWithPastEndTime() public {
        factory.addOracle(oracle);
        factory.createEscrow(
            "Test Escrow",
            DEPOSIT_AMOUNT,
            block.timestamp - 1 days,
            oracle
        );
    }

    function testCreateEscrowWithHardcodedMaxParticipants() public {
        factory.addOracle(oracle);
        // This test verifies that maxParticipants is hardcoded to MAX_PARTICIPANTS (2000)
        address escrowAddress = factory.createEscrow(
            "Test Escrow",
            DEPOSIT_AMOUNT,
            block.timestamp + 1 days,
            oracle
        );
        
        // Verify the escrow was created successfully
        Escrow escrow = Escrow(escrowAddress);
        (string memory name, uint256 depositAmount, uint256 endTime) = escrow.details();
        assertEq(depositAmount, DEPOSIT_AMOUNT, "Deposit amount should match");
        assertEq(escrow.MAX_PARTICIPANTS(), 2000, "MAX_PARTICIPANTS should be 2000");
    }

    function testFailAddOracleNotOwner() public {
        vm.startPrank(oracle);
        factory.addOracle(oracle);
        vm.stopPrank();
    }

    function testFailRemoveOracleNotOwner() public {
        factory.addOracle(oracle);
        vm.startPrank(oracle);
        factory.removeOracle(oracle);
        vm.stopPrank();
    }

    function testMultipleEscrows() public {
        factory.addOracle(oracle);
        
        address escrow1 = factory.createEscrow(
            "Escrow 1",
            DEPOSIT_AMOUNT,
            block.timestamp + 1 days,
            oracle
        );
        
        address escrow2 = factory.createEscrow(
            "Escrow 2",
            DEPOSIT_AMOUNT * 2,
            block.timestamp + 2 days,
            oracle
        );
        
        Escrow[] memory escrows = factory.getEscrows();
        assertEq(escrows.length, 2, "Should have 2 escrows");
        assertEq(address(escrows[0]), escrow1, "First escrow should match");
        assertEq(address(escrows[1]), escrow2, "Second escrow should match");
    }

    function testEscrowProperties() public {
        factory.addOracle(oracle);
        
        address escrowAddress = factory.createEscrow(
            "Test Escrow",
            DEPOSIT_AMOUNT,
            block.timestamp + 1 days,
            oracle
        );
        
        Escrow escrow = Escrow(escrowAddress);
        (string memory name, uint256 depositAmount, uint256 endTime) = escrow.details();
        assertEq(depositAmount, DEPOSIT_AMOUNT, "Deposit amount should match");
        assertEq(endTime, block.timestamp + 1 days, "End time should match");
        assertEq(escrow.oracle(), oracle, "Oracle should match");
        assertEq(escrow.owner(), address(factory), "Owner should be factory");
    }

    function testOracleManagement() public {
        address oracle2 = address(0x2);
        address oracle3 = address(0x3);
        
        factory.addOracle(oracle);
        factory.addOracle(oracle2);
        factory.addOracle(oracle3);
        
        assertTrue(factory.oracles(oracle), "First oracle should be added");
        assertTrue(factory.oracles(oracle2), "Second oracle should be added");
        assertTrue(factory.oracles(oracle3), "Third oracle should be added");
        
        factory.removeOracle(oracle2);
        assertFalse(factory.oracles(oracle2), "Second oracle should be removed");
        assertTrue(factory.oracles(oracle), "First oracle should still be added");
        assertTrue(factory.oracles(oracle3), "Third oracle should still be added");
    }

    function testFailCreateEscrowWithZeroDepositAmount() public {
        factory.addOracle(oracle);
        factory.createEscrow(
            "Test Escrow",
            0,
            block.timestamp + 1 days,
            oracle
        );
    }

    function testFailCreateEscrowWithZeroEndTime() public {
        factory.addOracle(oracle);
        factory.createEscrow(
            "Test Escrow",
            DEPOSIT_AMOUNT,
            0,
            oracle
        );
    }

    function testFailCreateEscrowWithZeroAddressOracle() public {
        factory.createEscrow(
            "Test Escrow",
            DEPOSIT_AMOUNT,
            block.timestamp + 1 days,
            address(0)
        );
    }
}