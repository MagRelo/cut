// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../src/PaymentToken.sol";

contract MockCToken is IERC20 {
    string public name = "Mock cToken";
    string public symbol = "mcTOKEN";
    uint8 public decimals = 8;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    uint256 public exchangeRate = 1e18; // 1:1 exchange rate initially
    address public immutable usdcToken;
    
    constructor(address _usdcToken) {
        usdcToken = _usdcToken;
    }
    
    function mint(uint256 amount) external returns (uint) {
        uint256 cTokensToMint = (amount * 1e18) / exchangeRate;
        balanceOf[msg.sender] += cTokensToMint;
        totalSupply += cTokensToMint;
        emit Transfer(address(0), msg.sender, cTokensToMint);
        
        // Transfer USDC from caller to this contract (simulating Compound's behavior)
        IERC20(usdcToken).transferFrom(msg.sender, address(this), amount);
        return 0; // Success code
    }
    
    function redeem(uint256 cTokenAmount) external returns (uint) {
        require(balanceOf[msg.sender] >= cTokenAmount, "Insufficient balance");
        uint256 underlyingAmount = (cTokenAmount * exchangeRate) / 1e18;
        balanceOf[msg.sender] -= cTokenAmount;
        totalSupply -= cTokenAmount;
        emit Transfer(msg.sender, address(0), cTokenAmount);
        
        // Transfer underlying USDC to the caller
        // If we don't have enough USDC, mint it for testing purposes
        uint256 currentBalance = IERC20(usdcToken).balanceOf(address(this));
        if (currentBalance < underlyingAmount) {
            PaymentToken(usdcToken).mint(address(this), underlyingAmount - currentBalance);
        }
        IERC20(usdcToken).transfer(msg.sender, underlyingAmount);
        return 0; // Success code
    }
    
    function redeemUnderlying(uint256 redeemAmount) external returns (uint) {
        uint256 cTokenAmount = (redeemAmount * 1e18) / exchangeRate;
        require(balanceOf[msg.sender] >= cTokenAmount, "Insufficient balance");
        balanceOf[msg.sender] -= cTokenAmount;
        totalSupply -= cTokenAmount;
        emit Transfer(msg.sender, address(0), cTokenAmount);
        return 0; // Success code
    }
    
    function balanceOfUnderlying(address owner) external view returns (uint) {
        return (balanceOf[owner] * exchangeRate) / 1e18;
    }
    
    function exchangeRateStored() external view returns (uint) {
        return exchangeRate;
    }
    
    function exchangeRateCurrent() external returns (uint) {
        return exchangeRate;
    }
    
    function getAccountSnapshot(address account) external view returns (uint, uint, uint, uint) {
        return (0, balanceOf[account], 0, exchangeRate);
    }
    
    function borrowRatePerBlock() external pure returns (uint) {
        return 0;
    }
    
    function supplyRatePerBlock() external pure returns (uint) {
        return 0;
    }
    
    function totalBorrowsCurrent() external pure returns (uint) {
        return 0;
    }
    
    function borrowBalanceCurrent(address) external pure returns (uint) {
        return 0;
    }
    
    function borrowBalanceStored(address) external pure returns (uint) {
        return 0;
    }
    
    function getCash() external view returns (uint) {
        return 0;
    }
    
    function accrueInterest() external returns (uint) {
        return 0;
    }
    
    function seize(address liquidator, address borrower, uint seizeTokens) external returns (uint) {
        require(balanceOf[borrower] >= seizeTokens, "Insufficient balance");
        balanceOf[borrower] -= seizeTokens;
        balanceOf[liquidator] += seizeTokens;
        emit Transfer(borrower, liquidator, seizeTokens);
        return 0;
    }
    
    function transfer(address to, uint256 amount) external override returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    function approve(address spender, uint256 amount) external override returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        emit Transfer(from, to, amount);
        return true;
    }
    
    // Mock functions for yield simulation
    function setExchangeRate(uint256 newRate) external {
        exchangeRate = newRate;
    }
    
    function addYield(uint256 yieldAmount) external {
        // Simulate yield by minting additional cTokens to represent yield earned
        uint256 additionalCTokens = (yieldAmount * 1e18) / exchangeRate;
        balanceOf[msg.sender] += additionalCTokens;
        totalSupply += additionalCTokens;
        emit Transfer(address(0), msg.sender, additionalCTokens);
        
        // Update exchange rate to reflect the new total value
        uint256 totalUnderlying = (totalSupply * exchangeRate) / 1e18;
        totalUnderlying += yieldAmount;
        if (totalSupply > 0) {
            exchangeRate = (totalUnderlying * 1e18) / totalSupply;
        }
        
        // For testing purposes, we'll simulate that the contract has enough USDC
        // In a real scenario, this would come from interest earned
        // We'll just update the exchange rate to reflect the yield
    }
}

contract MockComptroller {
    mapping(address => bool) public marketListed;
    
    constructor() {
        // Initialize with no markets listed
    }
    
    function enterMarkets(address[] calldata cTokens) external returns (uint[] memory) {
        uint[] memory results = new uint[](cTokens.length);
        for (uint i = 0; i < cTokens.length; i++) {
            marketListed[cTokens[i]] = true;
            results[i] = 0; // Success code
        }
        return results;
    }
    
    function exitMarket(address cToken) external returns (uint) {
        marketListed[cToken] = false;
        return 0; // Success code
    }
    
    function getAccountLiquidity(address) external pure returns (uint, uint, uint) {
        return (0, 0, 0);
    }
    
    function getHypotheticalAccountLiquidity(
        address,
        address,
        uint,
        uint
    ) external pure returns (uint, uint, uint) {
        return (0, 0, 0);
    }
    
    function getAssetsIn(address) external pure returns (address[] memory) {
        return new address[](0);
    }
    
    function getCompAddress() external pure returns (address) {
        return address(0);
    }
    
    function getAllMarkets() external pure returns (address[] memory) {
        return new address[](0);
    }
    
    function isComptroller() external pure returns (bool) {
        return true;
    }
    
    function isMarketListed(address cToken) external view returns (bool) {
        return marketListed[cToken];
    }
    
    function liquidateCalculateSeizeTokens(
        address,
        address,
        uint
    ) external pure returns (uint, uint) {
        return (0, 0);
    }
    
    function liquidateSeizeCalculateAmount(
        address,
        address,
        uint
    ) external pure returns (uint, uint) {
        return (0, 0);
    }
    
    function mintAllowed(address, address, uint) external pure returns (uint) {
        return 0; // Success
    }
    
    function mintVerify(address, address, uint, uint) external {
        // No-op for mock
    }
    
    function redeemAllowed(address, address, uint) external pure returns (uint) {
        return 0; // Success
    }
    
    function redeemVerify(address, address, uint, uint) external {
        // No-op for mock
    }
    
    function borrowAllowed(address, address, uint) external pure returns (uint) {
        return 0; // Success
    }
    
    function borrowVerify(address, address, uint) external {
        // No-op for mock
    }
    
    function repayBorrowAllowed(address, address, address, uint) external pure returns (uint) {
        return 0; // Success
    }
    
    function repayBorrowVerify(address, address, address, uint, uint) external {
        // No-op for mock
    }
    
    function liquidateBorrowAllowed(address, address, address, address, uint) external pure returns (uint) {
        return 0; // Success
    }
    
    function liquidateBorrowVerify(address, address, address, address, uint, uint) external {
        // No-op for mock
    }
    
    function seizeAllowed(address, address, address, address, uint) external pure returns (uint) {
        return 0; // Success
    }
    
    function seizeVerify(address, address, address, address, uint) external {
        // No-op for mock
    }
    
    function transferAllowed(address, address, address, uint) external pure returns (uint) {
        return 0; // Success
    }
    
    function transferVerify(address, address, address, uint) external {
        // No-op for mock
    }
    
    // Admin functions (all return success for mock)
    function _setPriceOracle(address) external pure returns (uint) { return 0; }
    function _setCloseFactor(uint) external pure returns (uint) { return 0; }
    function _setCollateralFactor(address, uint) external pure returns (uint) { return 0; }
    function _setMaxAssets(uint) external pure returns (uint) { return 0; }
    function _setLiquidationIncentive(uint) external pure returns (uint) { return 0; }
    function _supportMarket(address) external pure returns (uint) { return 0; }
    function _setPauseGuardian(address) external pure returns (uint) { return 0; }
    function _setMintPaused(address, bool) external pure returns (bool) { return false; }
    function _setBorrowPaused(address, bool) external pure returns (bool) { return false; }
    function _setTransferPaused(bool) external pure returns (bool) { return false; }
    function _setSeizePaused(bool) external pure returns (bool) { return false; }
    function _become(address) external {}
    function _deployMarket(bytes calldata, bool) external pure returns (uint) { return 0; }
    function _setReserveFactor(address, uint) external pure returns (uint) { return 0; }
    function _setInterestRateModel(address, address) external pure returns (uint) { return 0; }
    function _setBorrowCap(address, uint) external pure returns (uint) { return 0; }
    function _setSupplyCap(address, uint) external pure returns (uint) { return 0; }
    function _setCompSpeed(address, uint) external {}
    function _addCompMarkets(address[] calldata) external {}
    function _dropCompMarket(address) external {}
    function _setCompRate(uint) external {}
    function _setCompBorrowerRewardsDistributor(address) external {}
    function _setCompSupplierRewardsDistributor(address) external {}
    function _setCompGrantor(address) external {}
    function _setCompRateAndCompBorrowerRewardsDistributor(uint, address) external {}
    function _setCompRateAndCompSupplierRewardsDistributor(uint, address) external {}
    function _setCompBorrowerRewardsDistributorAndCompSupplierRewardsDistributor(address, address) external {}
    function _setCompRateAndCompBorrowerRewardsDistributorAndCompSupplierRewardsDistributor(uint, address, address) external {}
} 