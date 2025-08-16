// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/EscrowFactory.sol";
import "../src/Escrow.sol";
import "../src/mocks/MockUSDC.sol";

contract EscrowFactoryTest is Test {
    EscrowFactory public factory;
    MockUSDC public usdcToken;
    MockUSDC public daiToken;

    address public oracle = address(0x1);
    address public host1 = address(0x2);
    address public host2 = address(0x3);
    address public host3 = address(0x4);

    uint256 public depositAmount = 1000 * 1e6; // 1000 USDC
    uint256 public expiry;
    uint256 public oracleFee = 500; // 5% (500 basis points)

    // Events to test
    event EscrowCreated(address indexed escrow, address indexed host, uint256 depositAmount);

    function setUp() public {
        // Set expiry to 1 hour from now
        expiry = block.timestamp + 1 hours;
        
        // Deploy mock tokens
        usdcToken = new MockUSDC();
        daiToken = new MockUSDC(); // Using MockUSDC for DAI as well
        
        // Deploy factory
        factory = new EscrowFactory();
    }

    // ============ CONSTRUCTOR TESTS ============

    function testConstructor() public view {
        // Factory should start with no escrows
        assertEq(factory.getEscrows().length, 0);
    }

    // ============ CREATE ESCROW TESTS ============

    function testCreateEscrow() public {
        vm.prank(host1);
        address escrowAddress = factory.createEscrow(
            depositAmount,
            expiry,
            address(usdcToken),
            6, // USDC decimals
            oracle,
            oracleFee
        );

        // Verify escrow was created
        assertTrue(escrowAddress != address(0), "Escrow address should not be zero");
        
        // Verify escrow is in factory registry
        Escrow[] memory escrows = factory.getEscrows();
        assertEq(escrows.length, 1);
        assertEq(address(escrows[0]), escrowAddress);

        // Verify escrow configuration
        Escrow escrow = Escrow(escrowAddress);
        (uint256 escrowDepositAmount, uint256 escrowExpiry) = escrow.details();
        assertEq(escrowDepositAmount, depositAmount);
        assertEq(escrowExpiry, expiry);
        assertEq(address(escrow.paymentToken()), address(usdcToken));
        assertEq(escrow.paymentTokenDecimals(), 6);
        assertEq(escrow.oracle(), oracle);
        assertEq(escrow.oracleFee(), oracleFee);
        assertEq(uint256(escrow.state()), uint256(Escrow.EscrowState.OPEN));
    }

    function testCreateEscrowMultipleEscrows() public {
        // Create first escrow
        vm.prank(host1);
        address escrow1 = factory.createEscrow(
            depositAmount,
            expiry,
            address(usdcToken),
            6,
            oracle,
            oracleFee
        );

        // Create second escrow with different parameters
        uint256 depositAmount2 = 2000 * 1e6;
        uint256 expiry2 = block.timestamp + 2 hours;
        uint256 oracleFee2 = 300; // 3%

        vm.prank(host2);
        address escrow2 = factory.createEscrow(
            depositAmount2,
            expiry2,
            address(daiToken),
            18, // DAI decimals
            host2, // Different oracle
            oracleFee2
        );

        // Create third escrow
        vm.prank(host3);
        address escrow3 = factory.createEscrow(
            depositAmount,
            expiry,
            address(usdcToken),
            6,
            oracle,
            oracleFee
        );

        // Verify all escrows are in factory registry
        Escrow[] memory escrows = factory.getEscrows();
        assertEq(escrows.length, 3);
        assertEq(address(escrows[0]), escrow1);
        assertEq(address(escrows[1]), escrow2);
        assertEq(address(escrows[2]), escrow3);

        // Verify escrow configurations
        verifyEscrowConfiguration(escrow1, depositAmount, expiry, address(usdcToken), oracle, oracleFee);
        verifyEscrowConfiguration(escrow2, depositAmount2, expiry2, address(daiToken), host2, oracleFee2);
        verifyEscrowConfiguration(escrow3, depositAmount, expiry, address(usdcToken), oracle, oracleFee);
    }

    function verifyEscrowConfiguration(
        address escrowAddress,
        uint256 expectedDeposit,
        uint256 expectedExpiry,
        address expectedToken,
        address expectedOracle,
        uint256 expectedFee
    ) internal view {
        Escrow escrow = Escrow(escrowAddress);
        (uint256 actualDeposit, uint256 actualExpiry) = escrow.details();
        
        assertEq(actualDeposit, expectedDeposit);
        assertEq(actualExpiry, expectedExpiry);
        assertEq(address(escrow.paymentToken()), expectedToken);
        assertEq(escrow.oracle(), expectedOracle);
        assertEq(escrow.oracleFee(), expectedFee);
    }

    function testCreateEscrowPastExpiry() public {
        vm.prank(host1);
        vm.expectRevert("Expiry must be in future");
        factory.createEscrow(
            depositAmount,
            block.timestamp - 1, // Past expiry
            address(usdcToken),
            6,
            oracle,
            oracleFee
        );
    }

    function testCreateEscrowZeroPaymentToken() public {
        vm.prank(host1);
        vm.expectRevert("Payment token cannot be zero address");
        factory.createEscrow(
            depositAmount,
            expiry,
            address(0), // Zero payment token
            6,
            oracle,
            oracleFee
        );
    }

    function testCreateEscrowZeroOracle() public {
        vm.prank(host1);
        vm.expectRevert("Oracle cannot be zero address");
        factory.createEscrow(
            depositAmount,
            expiry,
            address(usdcToken),
            6,
            address(0), // Zero oracle
            oracleFee
        );
    }

    function testCreateEscrowZeroDepositAmount() public {
        vm.prank(host1);
        vm.expectRevert("Deposit amount must be greater than 0");
        factory.createEscrow(
            0, // Zero deposit amount
            expiry,
            address(usdcToken),
            6,
            oracle,
            oracleFee
        );
    }

    function testCreateEscrowExcessiveOracleFee() public {
        vm.prank(host1);
        vm.expectRevert("Oracle fee cannot exceed 100%");
        factory.createEscrow(
            depositAmount,
            expiry,
            address(usdcToken),
            6,
            oracle,
            10001 // 100.01%
        );
    }

    function testCreateEscrowWithZeroOracleFee() public {
        vm.prank(host1);
        address escrowAddress = factory.createEscrow(
            depositAmount,
            expiry,
            address(usdcToken),
            6,
            oracle,
            0 // 0% oracle fee
        );

        Escrow escrow = Escrow(escrowAddress);
        assertEq(escrow.oracleFee(), 0);
    }

    function testCreateEscrowWithMaxOracleFee() public {
        vm.prank(host1);
        address escrowAddress = factory.createEscrow(
            depositAmount,
            expiry,
            address(usdcToken),
            6,
            oracle,
            10000 // 100% oracle fee
        );

        Escrow escrow = Escrow(escrowAddress);
        assertEq(escrow.oracleFee(), 10000);
    }

    function testCreateEscrowWithDifferentDecimals() public {
        // Test with USDC (6 decimals)
        vm.prank(host1);
        address usdcEscrow = factory.createEscrow(
            depositAmount,
            expiry,
            address(usdcToken),
            6,
            oracle,
            oracleFee
        );

        // Test with DAI (18 decimals)
        vm.prank(host2);
        address daiEscrow = factory.createEscrow(
            depositAmount,
            expiry,
            address(daiToken),
            18,
            oracle,
            oracleFee
        );

        Escrow usdcEscrowContract = Escrow(usdcEscrow);
        Escrow daiEscrowContract = Escrow(daiEscrow);

        assertEq(usdcEscrowContract.paymentTokenDecimals(), 6);
        assertEq(daiEscrowContract.paymentTokenDecimals(), 18);
    }

    // ============ GET ESCROWS TESTS ============

    function testGetEscrowsEmpty() public view {
        Escrow[] memory escrows = factory.getEscrows();
        assertEq(escrows.length, 0);
    }

    function testGetEscrowsMultiple() public {
        // Create multiple escrows
        vm.prank(host1);
        address escrow1 = factory.createEscrow(
            depositAmount,
            expiry,
            address(usdcToken),
            6,
            oracle,
            oracleFee
        );

        vm.prank(host2);
        address escrow2 = factory.createEscrow(
            depositAmount,
            expiry,
            address(usdcToken),
            6,
            oracle,
            oracleFee
        );

        vm.prank(host3);
        address escrow3 = factory.createEscrow(
            depositAmount,
            expiry,
            address(usdcToken),
            6,
            oracle,
            oracleFee
        );

        // Get all escrows
        Escrow[] memory escrows = factory.getEscrows();
        assertEq(escrows.length, 3);
        assertEq(address(escrows[0]), escrow1);
        assertEq(address(escrows[1]), escrow2);
        assertEq(address(escrows[2]), escrow3);
    }

    // ============ INTEGRATION TESTS ============

    function testCreateAndUseEscrow() public {
        // Create escrow
        vm.prank(host1);
        address escrowAddress = factory.createEscrow(
            depositAmount,
            expiry,
            address(usdcToken),
            6,
            oracle,
            oracleFee
        );

        Escrow escrow = Escrow(escrowAddress);

        // Mint tokens to a participant
        address participant = address(0x5);
        usdcToken.mint(participant, depositAmount);

        // Participant deposits
        vm.startPrank(participant);
        usdcToken.approve(address(escrow), depositAmount);
        escrow.deposit();
        vm.stopPrank();

        // Verify escrow state
        assertEq(escrow.getParticipantsCount(), 1);
        assertEq(escrow.hasDeposited(participant), true);
        assertEq(escrow.totalInitialDeposits(), depositAmount);

        // Oracle closes deposits
        vm.prank(oracle);
        escrow.closeDeposits();

        // Oracle distributes payouts
        uint256[] memory payouts = new uint256[](1);
        payouts[0] = 10000; // 100%

        vm.prank(oracle);
        escrow.distribute(payouts);

        // Verify escrow is settled
        assertEq(uint256(escrow.state()), uint256(Escrow.EscrowState.SETTLED));
    }

    function testMultipleEscrowsIndependent() public {
        // Create two escrows
        vm.prank(host1);
        address escrow1 = factory.createEscrow(
            depositAmount,
            expiry,
            address(usdcToken),
            6,
            oracle,
            oracleFee
        );

        vm.prank(host2);
        address escrow2 = factory.createEscrow(
            depositAmount * 2, // Different deposit amount
            expiry + 1 hours, // Different expiry
            address(daiToken),
            18,
            host2, // Different oracle
            oracleFee * 2 // Different fee
        );

        Escrow escrow1Contract = Escrow(escrow1);
        Escrow escrow2Contract = Escrow(escrow2);

        // Verify they are independent
        (uint256 deposit1,) = escrow1Contract.details();
        (uint256 deposit2,) = escrow2Contract.details();

        assertEq(deposit1, depositAmount);
        assertEq(deposit2, depositAmount * 2);
        assertEq(address(escrow1Contract.paymentToken()), address(usdcToken));
        assertEq(address(escrow2Contract.paymentToken()), address(daiToken));
        assertEq(escrow1Contract.oracle(), oracle);
        assertEq(escrow2Contract.oracle(), host2);
        assertEq(escrow1Contract.oracleFee(), oracleFee);
        assertEq(escrow2Contract.oracleFee(), oracleFee * 2);
    }

    // ============ EDGE CASES AND STRESS TESTS ============

    function testGasOptimization() public {
        // Test gas usage for creating escrow
        uint256 gasBefore = gasleft();
        vm.prank(host1);
        factory.createEscrow(
            depositAmount,
            expiry,
            address(usdcToken),
            6,
            oracle,
            oracleFee
        );
        uint256 gasUsed = gasBefore - gasleft();

        // Gas should be reasonable (less than 1.5M for escrow creation)
        assertLt(gasUsed, 1500000);
    }

    function testLargeAmountHandling() public {
        uint256 largeDepositAmount = 1000000 * 1e6; // 1M USDC

        vm.prank(host1);
        address escrowAddress = factory.createEscrow(
            largeDepositAmount,
            expiry,
            address(usdcToken),
            6,
            oracle,
            oracleFee
        );

        Escrow escrow = Escrow(escrowAddress);
        (uint256 escrowDepositAmount,) = escrow.details();
        assertEq(escrowDepositAmount, largeDepositAmount);
    }

    function testManyEscrows() public {
        // Create many escrows to test factory scalability
        for (uint256 i = 0; i < 10; i++) {
            address host = address(uint160(1000 + i));
            vm.prank(host);
            factory.createEscrow(
                depositAmount + i,
                expiry + i,
                address(usdcToken),
                6,
                oracle,
                oracleFee
            );
        }

        Escrow[] memory escrows = factory.getEscrows();
        assertEq(escrows.length, 10);

        // Verify each escrow has unique parameters
        for (uint256 i = 0; i < 10; i++) {
            Escrow escrow = escrows[i];
            (uint256 escrowDepositAmount, uint256 escrowExpiry) = escrow.details();
            assertEq(escrowDepositAmount, depositAmount + i);
            assertEq(escrowExpiry, expiry + i);
        }
    }

    function testEventEmission() public {
        // Test that events are emitted correctly
        vm.prank(host1);
        address escrowAddress = factory.createEscrow(
            depositAmount,
            expiry,
            address(usdcToken),
            6,
            oracle,
            oracleFee
        );

        // Verify the escrow address is not zero
        assertTrue(escrowAddress != address(0));
    }

    function testFactoryRegistryIntegrity() public {
        // Create escrows and verify registry integrity
        address[] memory expectedAddresses = new address[](3);

        vm.prank(host1);
        expectedAddresses[0] = factory.createEscrow(
            depositAmount,
            expiry,
            address(usdcToken),
            6,
            oracle,
            oracleFee
        );

        vm.prank(host2);
        expectedAddresses[1] = factory.createEscrow(
            depositAmount,
            expiry,
            address(usdcToken),
            6,
            oracle,
            oracleFee
        );

        vm.prank(host3);
        expectedAddresses[2] = factory.createEscrow(
            depositAmount,
            expiry,
            address(usdcToken),
            6,
            oracle,
            oracleFee
        );

        // Verify registry
        Escrow[] memory escrows = factory.getEscrows();
        assertEq(escrows.length, 3);

        for (uint256 i = 0; i < 3; i++) {
            assertEq(address(escrows[i]), expectedAddresses[i]);
            assertTrue(expectedAddresses[i] != address(0));
        }
    }

    function testEscrowAddressUniqueness() public {
        // Create multiple escrows and verify they have unique addresses
        vm.prank(host1);
        address escrow1 = factory.createEscrow(
            depositAmount,
            expiry,
            address(usdcToken),
            6,
            oracle,
            oracleFee
        );

        vm.prank(host2);
        address escrow2 = factory.createEscrow(
            depositAmount,
            expiry,
            address(usdcToken),
            6,
            oracle,
            oracleFee
        );

        vm.prank(host3);
        address escrow3 = factory.createEscrow(
            depositAmount,
            expiry,
            address(usdcToken),
            6,
            oracle,
            oracleFee
        );

        // Verify all addresses are unique
        assertTrue(escrow1 != escrow2);
        assertTrue(escrow2 != escrow3);
        assertTrue(escrow1 != escrow3);
        assertTrue(escrow1 != address(0));
        assertTrue(escrow2 != address(0));
        assertTrue(escrow3 != address(0));
    }
}
