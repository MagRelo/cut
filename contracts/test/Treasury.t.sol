// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Treasury.sol";
import "../src/PlatformToken.sol";
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

contract TreasuryTest is Test {
    Treasury public treasury;
    PlatformToken public platformToken;
    PaymentToken public usdcToken;
    address public owner;
    address public user;
    uint256 public constant USDC_AMOUNT = 1000e6; // 1000 USDC with 6 decimals
    address public mockAToken;
    TestMockPool public mockPool;
    TestMockProvider public mockProvider;

    function setUp() public {
        owner = address(this);
        user = address(0x1);
        platformToken = new PlatformToken();
        usdcToken = new PaymentToken();
        MockAToken mockATokenContract = new MockAToken();
        mockAToken = address(mockATokenContract);
        mockPool = new TestMockPool(mockAToken);
        mockProvider = new TestMockProvider(address(mockPool));
        
        treasury = new Treasury(
            address(usdcToken),
            address(platformToken),
            address(mockProvider)
        );
        
        // Set treasury in platform token
        platformToken.setTreasury(address(treasury));
        
        // Mint USDC to user
        usdcToken.mint(user, USDC_AMOUNT);
        
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

    function testDepositUSDC() public {
        vm.startPrank(user);
        
        uint256 initialBalance = platformToken.balanceOf(user);
        uint256 initialTreasuryBalance = treasury.getTreasuryBalance();
        
        usdcToken.approve(address(treasury), USDC_AMOUNT);
        treasury.depositUSDC(USDC_AMOUNT);
        
        uint256 finalBalance = platformToken.balanceOf(user);
        uint256 finalTreasuryBalance = treasury.getTreasuryBalance();
        
        assertGt(finalBalance, initialBalance, "Platform tokens should be minted");
        assertEq(finalTreasuryBalance, initialTreasuryBalance + USDC_AMOUNT, "Treasury balance should increase");
        
        vm.stopPrank();
    }

    function testWithdrawUSDC() public {
        // First deposit
        vm.startPrank(user);
        usdcToken.approve(address(treasury), USDC_AMOUNT);
        treasury.depositUSDC(USDC_AMOUNT);
        
        uint256 platformTokensReceived = platformToken.balanceOf(user);
        uint256 initialUSDCBalance = usdcToken.balanceOf(user);
        
        // Then withdraw
        treasury.withdrawUSDC(platformTokensReceived);
        
        uint256 finalUSDCBalance = usdcToken.balanceOf(user);
        uint256 finalPlatformTokens = platformToken.balanceOf(user);
        
        assertGt(finalUSDCBalance, initialUSDCBalance, "USDC should be returned");
        assertEq(finalPlatformTokens, 0, "Platform tokens should be burned");
        
        vm.stopPrank();
    }

    function testExchangeRate() public {
        uint256 initialRate = treasury.getExchangeRate();
        assertEq(initialRate, 1e18, "Initial rate should be 1:1");
        
        vm.startPrank(user);
        usdcToken.approve(address(treasury), USDC_AMOUNT);
        treasury.depositUSDC(USDC_AMOUNT);
        vm.stopPrank();
        
        uint256 newRate = treasury.getExchangeRate();
        assertEq(newRate, 1, "Rate should be 1 after first deposit");
    }

    function testEmergencyWithdraw() public {
        vm.startPrank(user);
        usdcToken.approve(address(treasury), USDC_AMOUNT);
        treasury.depositUSDC(USDC_AMOUNT);
        vm.stopPrank();
        
        uint256 treasuryBalance = treasury.getTreasuryBalance();
        assertGt(treasuryBalance, 0, "Treasury should have funds");
        
        vm.startPrank(owner);
        treasury.emergencyWithdrawUSDC(user, treasuryBalance);
        vm.stopPrank();
        
        uint256 userBalance = usdcToken.balanceOf(user);
        assertGe(userBalance, USDC_AMOUNT, "User should receive emergency withdrawal");
    }

    function testFailDepositZeroAmount() public {
        vm.startPrank(user);
        usdcToken.approve(address(treasury), 0);
        treasury.depositUSDC(0);
        vm.stopPrank();
    }

    function testFailWithdrawInsufficientTokens() public {
        vm.startPrank(user);
        treasury.withdrawUSDC(1e18);
        vm.stopPrank();
    }

    function testFailEmergencyWithdrawNotOwner() public {
        vm.startPrank(user);
        treasury.emergencyWithdrawUSDC(user, 1000e6);
        vm.stopPrank();
    }
} 