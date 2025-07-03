// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Escrow.sol";
import "../src/PlatformToken.sol";
import "./MockAave.sol";

contract TestMockPool is MockPool {
    constructor(address _aToken) MockPool(_aToken) {}
    
    // Implement all required IPool functions with revert (except supply and withdraw which are inherited)
    function ADDRESSES_PROVIDER() external pure override returns (IPoolAddressesProvider) { revert(); }
    function BRIDGE_PROTOCOL_FEE() external pure override returns (uint256) { revert(); }
    function FLASHLOAN_PREMIUM_TOTAL() external pure override returns (uint128) { revert(); }
    function FLASHLOAN_PREMIUM_TO_PROTOCOL() external pure override returns (uint128) { revert(); }
    function MAX_NUMBER_RESERVES() external pure override returns (uint16) { revert(); }
    function MAX_STABLE_RATE_BORROW_SIZE_PERCENT() external pure override returns (uint256) { revert(); }
    function backUnbacked(address, uint256, uint256) external pure override returns (uint256) { revert(); }
    function borrow(address, uint256, uint256, uint16, address) external pure override { revert(); }
    function configureEModeCategory(uint8, DataTypes.EModeCategory memory) external pure override { revert(); }
    function deposit(address, uint256, address, uint16) external pure override { revert(); }
    function dropReserve(address) external pure override { revert(); }
    function finalizeTransfer(address, address, address, uint256, uint256, uint256) external pure override { revert(); }
    function flashLoan(address, address[] calldata, uint256[] calldata, uint256[] calldata, address, bytes calldata, uint16) external pure override { revert(); }
    function flashLoanSimple(address, address, uint256, bytes calldata, uint16) external pure override { revert(); }
    function getConfiguration(address) external pure override returns (DataTypes.ReserveConfigurationMap memory) { revert(); }
    function getEModeCategoryData(uint8) external pure override returns (DataTypes.EModeCategory memory) { revert(); }
    function getReserveAddressById(uint16) external pure override returns (address) { revert(); }
    function getReserveNormalizedIncome(address) external pure override returns (uint256) { revert(); }
    function getReserveNormalizedVariableDebt(address) external pure override returns (uint256) { revert(); }
    function getReservesList() external pure override returns (address[] memory) { revert(); }
    function getUserAccountData(address) external pure override returns (uint256, uint256, uint256, uint256, uint256, uint256) { revert(); }
    function getUserConfiguration(address) external pure override returns (DataTypes.UserConfigurationMap memory) { revert(); }
    function getUserEMode(address) external pure override returns (uint256) { revert(); }
    function initReserve(address, address, address, address, address) external pure override { revert(); }
    function liquidationCall(address, address, address, uint256, bool) external pure override { revert(); }
    function mintToTreasury(address[] calldata) external pure override { revert(); }
    function mintUnbacked(address, uint256, address, uint16) external pure override { revert(); }
    function rebalanceStableBorrowRate(address, address) external pure override { revert(); }
    function repay(address, uint256, uint256, address) external pure override returns (uint256) { revert(); }
    function repayWithATokens(address, uint256, uint256) external pure override returns (uint256) { revert(); }
    function repayWithPermit(address, uint256, uint256, address, uint256, uint8, bytes32, bytes32) external pure override returns (uint256) { revert(); }
    function rescueTokens(address, address, uint256) external pure override { revert(); }
    function resetIsolationModeTotalDebt(address) external pure override { revert(); }
    function setConfiguration(address, DataTypes.ReserveConfigurationMap calldata) external pure override { revert(); }
    function setReserveInterestRateStrategyAddress(address, address) external pure override { revert(); }
    function setUserEMode(uint8) external pure override { revert(); }
    function setUserUseReserveAsCollateral(address, bool) external pure override { revert(); }
    function supplyWithPermit(address, uint256, address, uint16, uint256, uint8, bytes32, bytes32) external pure override { revert(); }
    function swapBorrowRateMode(address, uint256) external pure override { revert(); }
    function updateBridgeProtocolFee(uint256) external pure override { revert(); }
    function updateFlashloanPremiums(uint128, uint128) external pure override { revert(); }
}

contract TestMockProvider is MockPoolAddressesProvider {
    constructor(address _pool) MockPoolAddressesProvider(_pool) {}
    
    // Implement all required IPoolAddressesProvider functions with revert
    function getACLAdmin() external pure override returns (address) { revert(); }
    function getACLManager() external pure override returns (address) { revert(); }
    function getAddress(bytes32) external pure override returns (address) { revert(); }
    function getMarketId() external pure override returns (string memory) { revert(); }
    function getPoolConfigurator() external pure override returns (address) { revert(); }
    function getPoolDataProvider() external pure override returns (address) { revert(); }
    function getPriceOracle() external pure override returns (address) { revert(); }
    function getPriceOracleSentinel() external pure override returns (address) { revert(); }
    function setACLAdmin(address) external pure override { revert(); }
    function setACLManager(address) external pure override { revert(); }
    function setAddress(bytes32, address) external pure override { revert(); }
    function setAddressAsProxy(bytes32, address) external pure override { revert(); }
    function setMarketId(string calldata) external pure override { revert(); }
    function setPoolConfiguratorImpl(address) external pure override { revert(); }
    function setPoolDataProvider(address) external pure override { revert(); }
    function setPoolImpl(address) external pure override { revert(); }
    function setPriceOracle(address) external pure override { revert(); }
    function setPriceOracleSentinel(address) external pure override { revert(); }
}

contract EscrowTest is Test {
    Escrow public escrow;
    PlatformToken public platformToken;
    address public owner;
    address public oracle;
    address public participant;
    uint256 public constant DEPOSIT_AMOUNT = 1e18; // 1 token with 18 decimals
    address public mockAToken;
    TestMockPool public mockPool;
    TestMockProvider public mockProvider;

    // Sets up an escrow with state OPEN and mints tokens to the participant
    function setUp() public {
        owner = address(this);
        oracle = address(0x1);
        participant = address(0x2);
        platformToken = new PlatformToken("BetTheCut", "BTCUT");
        MockAToken mockATokenContract = new MockAToken();
        mockAToken = address(mockATokenContract);
        mockPool = new TestMockPool(mockAToken);
        mockProvider = new TestMockProvider(address(mockPool));
        escrow = new Escrow(
            "Test Escrow",
            DEPOSIT_AMOUNT,
            10, // max participants
            block.timestamp + 2 hours,
            address(platformToken),
            oracle,
            address(mockProvider)
        );
        platformToken.mint(participant, DEPOSIT_AMOUNT);
    }

    // Tests that a participant can deposit into the escrow when state is OPEN
    function testDeposit() public {
        vm.startPrank(participant);
        platformToken.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit();
        assertEq(escrow.hasDeposited(participant), true);
        vm.stopPrank();
    }

    // Tests that a participant can withdraw from the escrow when state is OPEN
    function testWithdraw() public {
        vm.startPrank(participant);
        platformToken.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit();
        escrow.withdraw();
        assertEq(escrow.hasDeposited(participant), false);
        // check that the participant has received their deposit amount back
        assertEq(platformToken.balanceOf(participant), DEPOSIT_AMOUNT);
        vm.stopPrank();
    }

    // Tests that a participant cannot withdraw from the escrow twice
    function testCannotWithdrawTwice() public {
        vm.startPrank(participant);
        platformToken.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit();
        escrow.withdraw();
        // Try to withdraw again - should revert
        vm.expectRevert("Not deposited");
        escrow.withdraw();
        vm.stopPrank();
    }

    // Tests that the oracle can close deposits, changing state to IN_PROGRESS
    function testCloseDeposits() public {
        vm.startPrank(oracle);
        escrow.closeDeposits();
        assertEq(uint256(escrow.state()), uint256(Escrow.EscrowState.IN_PROGRESS));
        vm.stopPrank();
    }

    // Tests that payouts can be distributed after the escrow is in progress using basis points
    function testDistribute() public {
        vm.startPrank(participant);
        platformToken.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit();
        vm.stopPrank();

        vm.startPrank(oracle);
        escrow.closeDeposits();
        uint256[] memory payouts = new uint256[](1);
        payouts[0] = 10000; // 100% in basis points
        escrow.distribute(payouts);
        assertEq(uint256(escrow.state()), uint256(Escrow.EscrowState.SETTLED));
        vm.stopPrank();
    }

    // Tests that a participant can perform an emergency withdrawal after the escrow has ended
    function testEmergencyWithdraw() public {
        vm.startPrank(participant);
        platformToken.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit();
        vm.warp(block.timestamp + 3 hours);
        escrow.emergencyWithdraw();
        assertEq(escrow.hasDeposited(participant), false);
        vm.stopPrank();
    }

    // Tests escrow cancellation and refund functionality
    function testCancelAndRefund() public {
        vm.startPrank(participant);
        platformToken.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit();
        vm.stopPrank();

        // Only owner can cancel and refund
        escrow.cancelAndRefund();
        assertEq(uint256(escrow.state()), uint256(Escrow.EscrowState.CANCELLED));

        assertEq(platformToken.balanceOf(participant), DEPOSIT_AMOUNT);
        assertEq(escrow.hasDeposited(participant), false);
    }

    // Tests that only the owner can cancel and refund
    function testOnlyOwnerCanCancelAndRefund() public {
        vm.startPrank(participant);
        platformToken.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit();
        vm.stopPrank();

        vm.startPrank(participant);
        vm.expectRevert(abi.encodePacked(Ownable.OwnableUnauthorizedAccount.selector, abi.encode(participant)));
        escrow.cancelAndRefund();
        vm.stopPrank();
    }

    // Tests that only the oracle can close deposits
    function testOnlyOracleCanCloseDeposits() public {
        vm.startPrank(participant);
        vm.expectRevert("Not oracle");
        escrow.closeDeposits();
        vm.stopPrank();
    }

    // Tests that only the oracle can distribute payouts
    function testOnlyOracleCanDistribute() public {
        vm.startPrank(participant);
        platformToken.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit();
        vm.stopPrank();

        vm.startPrank(oracle);
        escrow.closeDeposits();
        vm.stopPrank();

        vm.startPrank(participant);
        uint256[] memory payouts = new uint256[](1);
        payouts[0] = 10000;
        vm.expectRevert("Not oracle");
        escrow.distribute(payouts);
        vm.stopPrank();
    }

    // Tests that emergency withdrawal cannot be called before end time
    function testEmergencyWithdrawBeforeEndTime() public {
        vm.startPrank(participant);
        platformToken.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit();
        vm.expectRevert("Escrow not ended");
        escrow.emergencyWithdraw();
        vm.stopPrank();
    }

    // Tests that emergency withdrawal cannot be called by non-participants
    function testEmergencyWithdrawNotParticipant() public {
        vm.warp(block.timestamp + 3 hours);
        vm.expectRevert("Not deposited");
        escrow.emergencyWithdraw();
    }

    // Tests that the escrow cannot be cancelled when not in OPEN state
    function testCannotCancelWhenNotOpen() public {
        vm.startPrank(participant);
        platformToken.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit();
        vm.stopPrank();

        vm.startPrank(oracle);
        escrow.closeDeposits();
        vm.stopPrank();

        vm.expectRevert("Escrow not open");
        escrow.cancelAndRefund();
    }

    // Tests that deposits cannot be closed when not in OPEN state
    function testCannotCloseDepositsWhenNotOpen() public {
        vm.startPrank(oracle);
        escrow.closeDeposits();
        vm.expectRevert("Escrow not open");
        escrow.closeDeposits();
        vm.stopPrank();
    }

    // Tests that payouts cannot be distributed when not in IN_PROGRESS state
    function testCannotDistributeWhenNotInProgress() public {
        vm.startPrank(participant);
        platformToken.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit();
        vm.stopPrank();

        vm.startPrank(oracle);
        uint256[] memory payouts = new uint256[](1);
        payouts[0] = 10000;
        vm.expectRevert("Escrow not in progress");
        escrow.distribute(payouts);
        vm.stopPrank();
    }

    // Tests that payouts array length must match participants length
    function testPayoutsLengthMustMatchParticipants() public {
        vm.startPrank(participant);
        platformToken.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit();
        vm.stopPrank();

        vm.startPrank(oracle);
        escrow.closeDeposits();
        uint256[] memory payouts = new uint256[](2);
        payouts[0] = 5000;
        payouts[1] = 5000;
        vm.expectRevert("Invalid payouts length");
        escrow.distribute(payouts);
        vm.stopPrank();
    }

    // Tests that total basis points must equal 10000
    function testTotalBasisPointsMustEqual10000() public {
        vm.startPrank(participant);
        platformToken.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit();
        vm.stopPrank();

        vm.startPrank(oracle);
        escrow.closeDeposits();
        uint256[] memory payouts = new uint256[](1);
        payouts[0] = 5000; // Only 50% in basis points
        vm.expectRevert("Total must be 10000 basis points");
        escrow.distribute(payouts);
        vm.stopPrank();
    }

    // Tests that a participant cannot deposit twice
    function testCannotDepositTwice() public {
        vm.startPrank(participant);
        platformToken.approve(address(escrow), DEPOSIT_AMOUNT * 2);
        escrow.deposit();
        vm.expectRevert("Already deposited");
        escrow.deposit();
        vm.stopPrank();
    }

    // Tests that the escrow cannot accept deposits when full
    function testCannotDepositWhenFull() public {
        // Create escrow with max 1 participant
        escrow = new Escrow(
            "Test Escrow",
            DEPOSIT_AMOUNT,
            1, // max participants
            block.timestamp + 2 hours,
            address(platformToken),
            oracle,
            address(mockProvider)
        );

        vm.startPrank(participant);
        platformToken.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit();
        vm.stopPrank();

        // Try to deposit with another address
        address participant2 = address(0x3);
        platformToken.mint(participant2, DEPOSIT_AMOUNT);
        vm.startPrank(participant2);
        platformToken.approve(address(escrow), DEPOSIT_AMOUNT);
        vm.expectRevert("Escrow full");
        escrow.deposit();
        vm.stopPrank();
    }

    // Tests that the escrow cannot accept deposits when not in OPEN state
    function testCannotDepositWhenNotOpen() public {
        vm.startPrank(oracle);
        escrow.closeDeposits();
        vm.stopPrank();

        vm.startPrank(participant);
        platformToken.approve(address(escrow), DEPOSIT_AMOUNT);
        vm.expectRevert("Escrow not open");
        escrow.deposit();
        vm.stopPrank();
    }

    // Tests that a participant cannot withdraw when not in OPEN state
    function testCannotWithdrawWhenNotOpen() public {
        vm.startPrank(participant);
        platformToken.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit();
        vm.stopPrank();

        vm.startPrank(oracle);
        escrow.closeDeposits();
        vm.stopPrank();

        vm.startPrank(participant);
        vm.expectRevert("Escrow not open");
        escrow.withdraw();
        vm.stopPrank();
    }

    // Tests that a participant cannot withdraw if they haven't deposited
    function testCannotWithdrawIfNotDeposited() public {
        vm.startPrank(participant);
        vm.expectRevert("Not deposited");
        escrow.withdraw();
        vm.stopPrank();
    }

    // Tests that the escrow correctly tracks total initial deposits
    function testTotalInitialDeposits() public {
        vm.startPrank(participant);
        platformToken.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit();
        assertEq(escrow.totalInitialDeposits(), DEPOSIT_AMOUNT);
        escrow.withdraw();
        assertEq(escrow.totalInitialDeposits(), 0);
        vm.stopPrank();
    }

    // Tests that the escrow correctly tracks participants array
    function testParticipantsArray() public {
        vm.startPrank(participant);
        platformToken.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit();
        assertEq(escrow.participants(0), participant);
        assertEq(escrow.getParticipantsCount(), 1);
        escrow.withdraw();
        assertEq(escrow.getParticipantsCount(), 0);
        vm.stopPrank();
    }

    // Tests that the escrow correctly handles multiple participants
    function testMultipleParticipants() public {
        address participant2 = address(0x3);
        platformToken.mint(participant2, DEPOSIT_AMOUNT);

        vm.startPrank(participant);
        platformToken.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit();
        vm.stopPrank();

        vm.startPrank(participant2);
        platformToken.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit();
        vm.stopPrank();

        assertEq(escrow.totalInitialDeposits(), DEPOSIT_AMOUNT * 2);
        assertEq(escrow.getParticipantsCount(), 2);
        assertEq(escrow.participants(0), participant);
        assertEq(escrow.participants(1), participant2);
    }

    // Tests that the escrow correctly handles payouts for multiple participants
    function testMultipleParticipantsPayouts() public {
        address participant2 = address(0x3);
        platformToken.mint(participant2, DEPOSIT_AMOUNT);

        vm.startPrank(participant);
        platformToken.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit();
        vm.stopPrank();

        vm.startPrank(participant2);
        platformToken.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit();
        vm.stopPrank();

        vm.startPrank(oracle);
        escrow.closeDeposits();
        uint256[] memory payouts = new uint256[](2);
        payouts[0] = 6000; // 60% to first participant
        payouts[1] = 4000; // 40% to second participant
        escrow.distribute(payouts);
        vm.stopPrank();

        // Check that participants received correct amounts
        uint256 expectedPayout1 = (DEPOSIT_AMOUNT * 2 * 6000) / 10000;
        uint256 expectedPayout2 = (DEPOSIT_AMOUNT * 2 * 4000) / 10000;
        assertEq(platformToken.balanceOf(participant), expectedPayout1);
        assertEq(platformToken.balanceOf(participant2), expectedPayout2);
    }
} 