// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./PlatformToken.sol";

// Compound interfaces
interface ICErc20 {
    function mint(uint mintAmount) external returns (uint);
    function redeem(uint redeemTokens) external returns (uint);
    function redeemUnderlying(uint redeemAmount) external returns (uint);
    function borrow(uint borrowAmount) external returns (uint);
    function repayBorrow(uint repayAmount) external returns (uint);
    function repayBorrowBehalf(address borrower, uint repayAmount) external returns (uint);
    function liquidateBorrow(address borrower, uint repayAmount, address cTokenCollateral) external returns (uint);
    function transfer(address dst, uint amount) external returns (bool);
    function transferFrom(address src, address dst, uint amount) external returns (bool);
    function approve(address spender, uint amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint);
    function balanceOf(address owner) external view returns (uint);
    function balanceOfUnderlying(address owner) external returns (uint);
    function getAccountSnapshot(address account) external view returns (uint, uint, uint, uint);
    function borrowRatePerBlock() external view returns (uint);
    function supplyRatePerBlock() external view returns (uint);
    function totalBorrowsCurrent() external returns (uint);
    function borrowBalanceCurrent(address account) external returns (uint);
    function borrowBalanceStored(address account) external view returns (uint);
    function exchangeRateCurrent() external returns (uint);
    function exchangeRateStored() external view returns (uint);
    function getCash() external view returns (uint);
    function accrueInterest() external returns (uint);
    function seize(address liquidator, address borrower, uint seizeTokens) external returns (uint);
    function _reduceReserves(uint reduceAmount) external returns (uint);
    function _setReserveFactor(uint newReserveFactorMantissa) external returns (uint);
    function _setInterestRateModel(address newInterestRateModel) external returns (uint);
    function _setBorrowCap(uint newBorrowCap) external returns (uint);
    function _setSupplyCap(uint newSupplyCap) external returns (uint);
    function _setCompSpeed(uint compSpeed) external;
    function _addReserves(uint addAmount) external returns (uint);
    function _setImplementation(address implementation_, bool allowResign, bytes calldata becomeImplementationData) external;
    function _becomeImplementation(bytes calldata data) external;
    function _resignImplementation() external;
    function _setPendingAdmin(address newPendingAdmin) external returns (uint);
    function _acceptAdmin() external returns (uint);
}

contract Treasury is ReentrancyGuard, Ownable {
    IERC20 public immutable usdcToken;
    PlatformToken public immutable platformToken;
    ICErc20 public immutable cUSDC;

    uint256 public totalUSDCBalance;
    uint256 public totalPlatformTokensMinted;

    event USDCDeposited(address indexed user, uint256 usdcAmount, uint256 platformTokensMinted);
    event USDCWithdrawn(address indexed user, uint256 platformTokensBurned, uint256 usdcAmount);
    event ExchangeRateUpdated(uint256 newRate);

    constructor(
        address _usdcToken,
        address _platformToken,
        address _cUSDC
    ) Ownable(msg.sender) {
        usdcToken = IERC20(_usdcToken);
        platformToken = PlatformToken(_platformToken);
        cUSDC = ICErc20(_cUSDC);
    }

    function depositUSDC(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        
        // Transfer USDC from user to treasury
        usdcToken.transferFrom(msg.sender, address(this), amount);
        
        // Calculate platform tokens to mint based on current exchange rate
        uint256 platformTokensToMint = calculatePlatformTokensForUSDC(amount);
        
        // Mint platform tokens to user (convert to 18 decimals)
        platformToken.mint(msg.sender, platformTokensToMint * 1e12);
        
        // Update treasury balances
        totalUSDCBalance += amount;
        totalPlatformTokensMinted += platformTokensToMint;
        
        // Deposit USDC to Compound for yield generation
        usdcToken.approve(address(cUSDC), amount);
        cUSDC.mint(amount);
        
        emit USDCDeposited(msg.sender, amount, platformTokensToMint);
    }

    function withdrawUSDC(uint256 platformTokenAmount) external nonReentrant {
        require(platformTokenAmount > 0, "Amount must be greater than 0");
        require(platformToken.balanceOf(msg.sender) >= platformTokenAmount, "Insufficient platform tokens");
        
        // Calculate USDC to return based on current exchange rate
        uint256 usdcToReturn = calculateUSDCForPlatformTokens(platformTokenAmount);
        require(usdcToReturn > 0, "No USDC to return");
        
        // Burn platform tokens from user
        platformToken.burn(msg.sender, platformTokenAmount);
        
        // Withdraw USDC from Compound if needed
        uint256 treasuryUSDCBalance = usdcToken.balanceOf(address(this));
        if (treasuryUSDCBalance < usdcToReturn) {
            uint256 neededFromCompound = usdcToReturn - treasuryUSDCBalance;
            // Convert USDC amount to cUSDC tokens for redemption
            uint256 cUSDCToRedeem = (neededFromCompound * 1e18) / cUSDC.exchangeRateStored();
            cUSDC.redeem(cUSDCToRedeem);
        }
        
        // Get the actual USDC balance after redemption (may be slightly different due to rounding)
        uint256 actualUSDCBalance = usdcToken.balanceOf(address(this));
        uint256 actualUSDCToReturn = actualUSDCBalance < usdcToReturn ? actualUSDCBalance : usdcToReturn;
        
        // Transfer USDC to user
        usdcToken.transfer(msg.sender, actualUSDCToReturn);
        
        // Update treasury balances
        // Only subtract the original deposit amount, not the yield
        uint256 originalDepositAmount = platformTokenAmount / 1e12;
        totalUSDCBalance -= originalDepositAmount;
        totalPlatformTokensMinted -= originalDepositAmount;
        
        emit USDCWithdrawn(msg.sender, platformTokenAmount, actualUSDCToReturn);
    }

    function getExchangeRate() external view returns (uint256) {
        if (totalPlatformTokensMinted == 0) {
            return 1e18; // 1:1 rate if no tokens minted yet
        }
        
        uint256 totalValue = totalUSDCBalance + getCompoundYield();
        return (totalValue * 1e18) / totalPlatformTokensMinted;
    }

    function getTreasuryBalance() external view returns (uint256) {
        return totalUSDCBalance + getCompoundYield();
    }

    function getPlatformTokenSupply() external view returns (uint256) {
        return totalPlatformTokensMinted;
    }

    function emergencyWithdrawUSDC(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than 0");
        
        // Withdraw from Compound if needed
        uint256 treasuryUSDCBalance = usdcToken.balanceOf(address(this));
        if (treasuryUSDCBalance < amount) {
            uint256 neededFromCompound = amount - treasuryUSDCBalance;
            // Convert USDC amount to cUSDC tokens for redemption
            uint256 cUSDCToRedeem = (neededFromCompound * 1e18) / cUSDC.exchangeRateStored();
            cUSDC.redeem(cUSDCToRedeem);
        }
        
        usdcToken.transfer(to, amount);
    }

    function calculatePlatformTokensForUSDC(uint256 usdcAmount) internal view returns (uint256) {
        if (totalPlatformTokensMinted == 0) {
            return usdcAmount; // 1:1 rate for first deposit
        }
        
        uint256 totalValue = totalUSDCBalance + getCompoundYield();
        return (usdcAmount * totalPlatformTokensMinted) / totalValue;
    }

    function calculateUSDCForPlatformTokens(uint256 platformTokenAmount) internal view returns (uint256) {
        if (totalPlatformTokensMinted == 0) {
            return 0;
        }
        
        // Convert platform token amount from 18 decimals to 6 decimals
        uint256 platformTokenAmount6Decimals = platformTokenAmount / 1e12;
        uint256 totalValue = totalUSDCBalance + getCompoundYield();
        return (platformTokenAmount6Decimals * totalValue) / totalPlatformTokensMinted;
    }

    function getCompoundYield() internal view returns (uint256) {
        uint256 cUSDCBalance = cUSDC.balanceOf(address(this));
        if (cUSDCBalance == 0) {
            return 0;
        }
        
        // Calculate yield as the difference between cUSDC balance converted to USDC and total USDC deposited
        uint256 totalValueInUSDC = (cUSDCBalance * cUSDC.exchangeRateStored()) / 1e18;
        uint256 totalDeposited = totalUSDCBalance;
        
        if (totalValueInUSDC > totalDeposited) {
            return totalValueInUSDC - totalDeposited;
        }
        return 0;
    }

    // Function to update exchange rate (can be called by owner or automatically)
    function updateExchangeRate() external {
        uint256 newRate;
        if (totalPlatformTokensMinted == 0) {
            newRate = 1e18; // 1:1 rate if no tokens minted yet
        } else {
            uint256 totalValue = totalUSDCBalance + getCompoundYield();
            newRate = (totalValue * 1e18) / totalPlatformTokensMinted;
        }
        emit ExchangeRateUpdated(newRate);
    }
} 