// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/PlatformToken.sol";
import "../src/Treasury.sol";
import "../src/PaymentToken.sol";
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

contract PlatformTokenTest is Test {
    PlatformToken public token;
    Treasury public treasury;
    PaymentToken public paymentToken;
    address public owner;
    address public user;
    address public mockAToken;
    TestMockPool public mockPool;
    TestMockProvider public mockProvider;

    function setUp() public {
        owner = address(this);
        user = address(0x1);
        token = new PlatformToken();
        paymentToken = new PaymentToken();
        
        MockAToken mockATokenContract = new MockAToken();
        mockAToken = address(mockATokenContract);
        mockPool = new TestMockPool(mockAToken);
        mockProvider = new TestMockProvider(address(mockPool));
        
        treasury = new Treasury(
            address(paymentToken),
            address(token),
            address(mockProvider)
        );
        
        // Set treasury in platform token
        token.setTreasury(address(treasury));
        
        // Mock Aave pool to return mock aToken address
        vm.mockCall(
            address(mockPool),
            abi.encodeWithSelector(mockPool.getReserveData.selector),
            abi.encode(DataTypes.ReserveData({
                configuration: DataTypes.ReserveConfigurationMap(0),
                liquidityIndex: 0,
                currentLiquidityRate: 0,
                variableBorrowIndex: 0,
                currentVariableBorrowRate: 0,
                currentStableBorrowRate: 0,
                lastUpdateTimestamp: 0,
                id: 0,
                aTokenAddress: mockAToken,
                stableDebtTokenAddress: address(0),
                variableDebtTokenAddress: address(0),
                interestRateStrategyAddress: address(0),
                accruedToTreasury: 0,
                unbacked: 0,
                isolationModeTotalDebt: 0
            }))
        );
    }

    function testTokenProperties() public {
        assertEq(token.name(), "Cut Platform Token");
        assertEq(token.symbol(), "CUT");
        assertEq(token.decimals(), 18);
    }

    function testSetTreasury() public {
        address newTreasury = address(0x999);
        token.setTreasury(newTreasury);
        assertEq(token.treasury(), newTreasury);
    }

    function testFailSetTreasuryNotOwner() public {
        vm.startPrank(user);
        token.setTreasury(address(0x999));
        vm.stopPrank();
    }

    function testFailSetTreasuryZeroAddress() public {
        token.setTreasury(address(0));
    }

    function testMintByTreasury() public {
        vm.startPrank(address(treasury));
        token.mint(user, 100);
        vm.stopPrank();
        
        assertEq(token.balanceOf(user), 100);
    }

    function testBurnByTreasury() public {
        vm.startPrank(address(treasury));
        token.mint(user, 100);
        token.burn(user, 50);
        vm.stopPrank();
        
        assertEq(token.balanceOf(user), 50);
    }

    function testFailMintNotTreasury() public {
        vm.startPrank(user);
        token.mint(user, 100);
        vm.stopPrank();
    }

    function testFailBurnNotTreasury() public {
        vm.startPrank(address(treasury));
        token.mint(user, 100);
        vm.stopPrank();
        
        vm.startPrank(user);
        token.burn(user, 50);
        vm.stopPrank();
    }

    function testFailBurnMoreThanBalance() public {
        vm.startPrank(address(treasury));
        token.mint(user, 100);
        token.burn(user, 150);
        vm.stopPrank();
    }
} 