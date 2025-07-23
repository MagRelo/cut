// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@aave/interfaces/IPool.sol";
import "@aave/interfaces/IPoolAddressesProvider.sol";
import "./PlatformToken.sol";

contract Treasury is ReentrancyGuard, Ownable {
    IERC20 public immutable usdcToken;
    PlatformToken public immutable platformToken;
    IPool public immutable aavePool;
    IERC20 public immutable aUSDC;

    uint256 public totalUSDCBalance;
    uint256 public totalPlatformTokensMinted;

    event USDCDeposited(address indexed user, uint256 usdcAmount, uint256 platformTokensMinted);
    event USDCWithdrawn(address indexed user, uint256 platformTokensBurned, uint256 usdcAmount);
    event ExchangeRateUpdated(uint256 newRate);

    constructor(
        address _usdcToken,
        address _platformToken,
        address _aavePoolAddressesProvider
    ) Ownable(msg.sender) {
        usdcToken = IERC20(_usdcToken);
        platformToken = PlatformToken(_platformToken);
        
        // Initialize Aave
        IPoolAddressesProvider provider = IPoolAddressesProvider(_aavePoolAddressesProvider);
        aavePool = IPool(provider.getPool());
        aUSDC = IERC20(aavePool.getReserveData(_usdcToken).aTokenAddress);
    }

    function depositUSDC(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        
        // Transfer USDC from user to treasury
        usdcToken.transferFrom(msg.sender, address(this), amount);
        
        // Calculate platform tokens to mint based on current exchange rate
        uint256 platformTokensToMint = calculatePlatformTokensForUSDC(amount);
        
        // Mint platform tokens to user
        platformToken.mint(msg.sender, platformTokensToMint);
        
        // Update treasury balances
        totalUSDCBalance += amount;
        totalPlatformTokensMinted += platformTokensToMint;
        
        // Deposit USDC to Aave for yield generation
        usdcToken.approve(address(aavePool), amount);
        aavePool.supply(address(usdcToken), amount, address(this), 0);
        
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
        
        // Withdraw USDC from Aave if needed
        uint256 treasuryUSDCBalance = usdcToken.balanceOf(address(this));
        if (treasuryUSDCBalance < usdcToReturn) {
            uint256 neededFromAave = usdcToReturn - treasuryUSDCBalance;
            aavePool.withdraw(address(usdcToken), neededFromAave, address(this));
        }
        
        // Transfer USDC to user
        usdcToken.transfer(msg.sender, usdcToReturn);
        
        // Update treasury balances
        totalUSDCBalance -= usdcToReturn;
        totalPlatformTokensMinted -= platformTokenAmount;
        
        emit USDCWithdrawn(msg.sender, platformTokenAmount, usdcToReturn);
    }

    function getExchangeRate() external view returns (uint256) {
        if (totalPlatformTokensMinted == 0) {
            return 1e18; // 1:1 rate if no tokens minted yet
        }
        
        uint256 totalValue = totalUSDCBalance + getAaveYield();
        return (totalValue * 1e18) / totalPlatformTokensMinted;
    }

    function getTreasuryBalance() external view returns (uint256) {
        return totalUSDCBalance + getAaveYield();
    }

    function getPlatformTokenSupply() external view returns (uint256) {
        return totalPlatformTokensMinted;
    }

    function emergencyWithdrawUSDC(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than 0");
        
        // Withdraw from Aave if needed
        uint256 treasuryUSDCBalance = usdcToken.balanceOf(address(this));
        if (treasuryUSDCBalance < amount) {
            uint256 neededFromAave = amount - treasuryUSDCBalance;
            aavePool.withdraw(address(usdcToken), neededFromAave, address(this));
        }
        
        usdcToken.transfer(to, amount);
    }

    function calculatePlatformTokensForUSDC(uint256 usdcAmount) internal view returns (uint256) {
        if (totalPlatformTokensMinted == 0) {
            return usdcAmount * 1e18; // 1:1 rate for first deposit
        }
        
        uint256 totalValue = totalUSDCBalance + getAaveYield();
        return (usdcAmount * totalPlatformTokensMinted) / totalValue;
    }

    function calculateUSDCForPlatformTokens(uint256 platformTokenAmount) internal view returns (uint256) {
        if (totalPlatformTokensMinted == 0) {
            return 0;
        }
        
        uint256 totalValue = totalUSDCBalance + getAaveYield();
        return (platformTokenAmount * totalValue) / totalPlatformTokensMinted;
    }

    function getAaveYield() internal view returns (uint256) {
        uint256 aUSDCBalance = aUSDC.balanceOf(address(this));
        if (aUSDCBalance == 0) {
            return 0;
        }
        
        // Calculate yield as the difference between aUSDC balance and total USDC deposited
        uint256 totalDeposited = totalUSDCBalance;
        if (aUSDCBalance > totalDeposited) {
            return aUSDCBalance - totalDeposited;
        }
        return 0;
    }

    // Function to update exchange rate (can be called by owner or automatically)
    function updateExchangeRate() external {
        uint256 newRate;
        if (totalPlatformTokensMinted == 0) {
            newRate = 1e18; // 1:1 rate if no tokens minted yet
        } else {
            uint256 totalValue = totalUSDCBalance + getAaveYield();
            newRate = (totalValue * 1e18) / totalPlatformTokensMinted;
        }
        emit ExchangeRateUpdated(newRate);
    }
} 