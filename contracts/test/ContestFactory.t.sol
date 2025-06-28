// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ContestFactory.sol";
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

contract ContestFactoryTest is Test {
    ContestFactory public factory;
    PlatformToken public platformToken;
    address public owner;
    address public oracle;
    uint256 public constant ENTRY_FEE = 1e18; // 1 token with 18 decimals
    address public mockAToken;
    TestMockPool public mockPool;
    TestMockProvider public mockProvider;

    function setUp() public {
        owner = address(this);
        oracle = address(0x1);
        platformToken = new PlatformToken("BetTheCut", "BTCUT");
        MockAToken mockATokenContract = new MockAToken();
        mockAToken = address(mockATokenContract);
        mockPool = new TestMockPool(mockAToken);
        mockProvider = new TestMockProvider(address(mockPool));
        factory = new ContestFactory(100, address(platformToken), address(mockProvider));
    }

    function testCreateContest() public {
        // Add oracle first
        factory.addOracle(oracle);
        assertTrue(factory.oracles(oracle));

        // Now create the contest
        address contest = factory.createContest("Test Contest", ENTRY_FEE, 10, block.timestamp + 2 hours, oracle);
        assertTrue(contest != address(0));
    }

    function testAddOracle() public {
        factory.addOracle(oracle);
        assertTrue(factory.oracles(oracle));
    }

    function testRemoveOracle() public {
        factory.addOracle(oracle);
        factory.removeOracle(oracle);
        assertFalse(factory.oracles(oracle));
    }

    function testSetPlatformFee() public {
        factory.setPlatformFee(200);
        assertEq(factory.platformFee(), 200);
    }

    function testCreateContestWithInvalidEntryFee() public {
        factory.addOracle(oracle);
        vm.expectRevert("Entry fee must be greater than 0");
        factory.createContest("Test Contest", 0, 10, block.timestamp + 2 hours, oracle);
    }

    function testCreateContestWithInvalidOracle() public {
        vm.expectRevert("Not an approved oracle");
        factory.createContest("Test Contest", ENTRY_FEE, 10, block.timestamp + 2 hours, oracle);
    }

    function testCreateContestWithInvalidEndTime() public {
        factory.addOracle(oracle);
        vm.expectRevert("End time must be in future");
        factory.createContest("Test Contest", ENTRY_FEE, 10, block.timestamp - 1, oracle);
    }

    function testCreateContestWithInvalidMaxParticipants() public {
        factory.addOracle(oracle);
        vm.expectRevert("Need at least 2 participants");
        factory.createContest("Test Contest", ENTRY_FEE, 1, block.timestamp + 2 hours, oracle);
    }

    function testSetPlatformFeeTooHigh() public {
        vm.expectRevert("Fee too high");
        factory.setPlatformFee(1001); // Max is 1000 (10%)
    }
} 