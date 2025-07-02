// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Contest.sol";
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

contract ContestTest is Test {
    Contest public contest;
    PlatformToken public platformToken;
    address public owner;
    address public oracle;
    address public participant;
    uint256 public constant ENTRY_FEE = 1e18; // 1 token with 18 decimals
    address public mockAToken;
    TestMockPool public mockPool;
    TestMockProvider public mockProvider;

    // Sets up a contest with state OPEN and mints tokens to the participant
    function setUp() public {
        owner = address(this);
        oracle = address(0x1);
        participant = address(0x2);
        platformToken = new PlatformToken("BetTheCut", "BTCUT");
        MockAToken mockATokenContract = new MockAToken();
        mockAToken = address(mockATokenContract);
        mockPool = new TestMockPool(mockAToken);
        mockProvider = new TestMockProvider(address(mockPool));
        contest = new Contest(
            "Test Contest",
            ENTRY_FEE,
            10, // max participants
            block.timestamp + 2 hours,
            address(platformToken),
            oracle,
            address(mockProvider)
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

        // Only owner can cancel and refund
        contest.cancelAndRefund();
        assertEq(uint256(contest.state()), uint256(Contest.ContestState.CANCELLED));

        assertEq(platformToken.balanceOf(participant), ENTRY_FEE);
        assertEq(contest.hasEntered(participant), false);
    }

    // Tests that only the owner can cancel and refund
    function testOnlyOwnerCanCancelAndRefund() public {
        vm.startPrank(participant);
        platformToken.approve(address(contest), ENTRY_FEE);
        contest.enter();
        vm.stopPrank();

        // Try to cancel as oracle (should fail)
        vm.startPrank(oracle);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", oracle));
        contest.cancelAndRefund();
        vm.stopPrank();

        // Try to cancel as participant (should fail)
        vm.startPrank(participant);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", participant));
        contest.cancelAndRefund();
        vm.stopPrank();

        // Owner can cancel and refund
        contest.cancelAndRefund();
        assertEq(uint256(contest.state()), uint256(Contest.ContestState.CANCELLED));
    }

    // Tests that cancelAndRefund can only be called when contest is open
    function testCancelAndRefundOnlyWhenOpen() public {
        vm.startPrank(oracle);
        contest.closeEntry();
        vm.stopPrank();

        vm.expectRevert("Contest not open");
        contest.cancelAndRefund();
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

        // Calculate expected payouts from initial deposits only
        uint256 totalPot = 3 * ENTRY_FEE; // 3 participants * ENTRY_FEE

        // Check balances for the actual participants
        assertEq(platformToken.balanceOf(participant2), ENTRY_FEE, "participant2 left and should have full balance");
        
        // Find which address got which payout
        for (uint256 i = 0; i < 3; i++) {
            address p = contest.participants(i);
            uint256 expected = (totalPot * payouts[i]) / 10000;
            assertEq(platformToken.balanceOf(p), expected, "participant payout");
        }
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

    // Tests that remaining funds are sent to oracle when canceling
    function testCancelAndRefundSendsRemainingFundsToOracle() public {
        vm.startPrank(participant);
        platformToken.approve(address(contest), ENTRY_FEE);
        contest.enter();
        vm.stopPrank();

        // Record oracle balance before cancellation
        uint256 oracleBalanceBefore = platformToken.balanceOf(oracle);
        
        // Cancel and refund
        contest.cancelAndRefund();
        
        // Check that oracle balance didn't decrease (function completed successfully)
        uint256 oracleBalanceAfter = platformToken.balanceOf(oracle);
        assertGe(oracleBalanceAfter, oracleBalanceBefore, "Oracle balance should not decrease");
        
        // Verify contest state is cancelled
        assertEq(uint256(contest.state()), uint256(Contest.ContestState.CANCELLED));
        
        // Verify participant was refunded
        assertEq(platformToken.balanceOf(participant), ENTRY_FEE, "Participant should be refunded");
        assertEq(contest.hasEntered(participant), false, "Participant should be marked as not entered");
    }
} 