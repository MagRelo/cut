// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./PlatformToken.sol";

// Compound V3 Comet interface
interface ICErc20 {
    function supply(address asset, uint256 amount) external;
    function withdraw(address asset, uint256 amount) external;
    function balanceOf(address owner) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function isSupplyPaused() external view returns (bool);
    function isWithdrawPaused() external view returns (bool);
}

contract DepositManager is ReentrancyGuard, Ownable {
    IERC20 public immutable usdcToken;
    PlatformToken public immutable platformToken;
    ICErc20 public immutable cUSDC;

    event USDCDeposited(address indexed user, uint256 usdcAmount, uint256 platformTokensMinted);
    event USDCWithdrawn(address indexed user, uint256 platformTokensBurned, uint256 usdcAmount);
    event BalanceSupply(address indexed owner, address indexed recipient, uint256 amount, uint256 timestamp);
    event EmergencyWithdrawal(address indexed owner, address indexed recipient, uint256 amount, uint256 timestamp);

    constructor(
        address _usdcToken,
        address _platformToken,
        address _cUSDC
    ) Ownable(msg.sender) {
        require(_usdcToken != address(0), "USDC token cannot be zero address");
        require(_platformToken != address(0), "Platform token cannot be zero address");
        require(_cUSDC != address(0), "CUSDC cannot be zero address");
        
        usdcToken = IERC20(_usdcToken);
        platformToken = PlatformToken(_platformToken);
        cUSDC = ICErc20(_cUSDC);
    }

    function depositUSDC(uint256 amount) external nonReentrant {
        // CHECKS
        require(amount > 0, "Amount must be greater than 0");
        require(!cUSDC.isSupplyPaused(), "Compound supply is paused");
        
        // Calculate platform tokens to mint (1:1 ratio)
        // USDC has 6 decimals, PlatformToken has 18 decimals
        uint256 platformTokensToMint = amount * 1e12; // Convert 6 decimals to 18 decimals
        
        // INTERACTIONS
        // Transfer USDC from user to deposit manager
        bool transferSuccess = usdcToken.transferFrom(msg.sender, address(this), amount);
        require(transferSuccess, "USDC transfer failed");
        
        // INTERACTIONS (after effects)
        // Mint platform tokens to user
        platformToken.mint(msg.sender, platformTokensToMint);
        
        // Deposit USDC to Compound for yield generation
        usdcToken.approve(address(cUSDC), amount);
        cUSDC.supply(address(usdcToken), amount);
        
        emit USDCDeposited(msg.sender, amount, platformTokensToMint);
    }

    function withdrawUSDC(uint256 platformTokenAmount) external nonReentrant {
        // CHECKS
        require(platformTokenAmount > 0, "Amount must be greater than 0");
        require(platformToken.balanceOf(msg.sender) >= platformTokenAmount, "Insufficient platform tokens");
        require(!cUSDC.isWithdrawPaused(), "Compound withdraw is paused");
        
        // Calculate USDC to return (1:1 ratio)
        // PlatformToken has 18 decimals, USDC has 6 decimals
        uint256 usdcToReturn = platformTokenAmount / 1e12; // Convert 18 decimals to 6 decimals
        require(usdcToReturn > 0, "No USDC to return");
        
        // INTERACTIONS (after effects)
        // Burn platform tokens from user
        platformToken.burn(msg.sender, platformTokenAmount);
        
        // Withdraw USDC from Compound if needed
        uint256 tokenManagerUSDCBalance = usdcToken.balanceOf(address(this));
        if (tokenManagerUSDCBalance < usdcToReturn) {
            uint256 neededFromCompound = usdcToReturn - tokenManagerUSDCBalance;
            cUSDC.withdraw(address(usdcToken), neededFromCompound);
        }
        
        // Get the actual USDC balance after redemption
        uint256 actualUSDCBalance = usdcToken.balanceOf(address(this));
        uint256 actualUSDCToReturn = actualUSDCBalance < usdcToReturn ? actualUSDCBalance : usdcToReturn;
        
        // Transfer USDC to user
        bool transferSuccess = usdcToken.transfer(msg.sender, actualUSDCToReturn);
        require(transferSuccess, "USDC transfer failed");
        
        emit USDCWithdrawn(msg.sender, platformTokenAmount, actualUSDCToReturn);
    }

    function withdrawAll() external nonReentrant {
        // CHECKS
        uint256 platformTokenBalance = platformToken.balanceOf(msg.sender);
        require(platformTokenBalance > 0, "No platform tokens to withdraw");
        require(!cUSDC.isWithdrawPaused(), "Compound withdraw is paused");
        
        // Calculate USDC to return (1:1 ratio)
        uint256 usdcToReturn = platformTokenBalance / 1e12; // Convert 18 decimals to 6 decimals
        require(usdcToReturn > 0, "No USDC to return");
        
        // INTERACTIONS (after effects)
        // Burn all platform tokens from user
        platformToken.burn(msg.sender, platformTokenBalance);
        
        // Withdraw USDC from Compound if needed
        uint256 tokenManagerUSDCBalance = usdcToken.balanceOf(address(this));
        if (tokenManagerUSDCBalance < usdcToReturn) {
            uint256 neededFromCompound = usdcToReturn - tokenManagerUSDCBalance;
            cUSDC.withdraw(address(usdcToken), neededFromCompound);
        }
        
        // Get the actual USDC balance after redemption
        uint256 actualUSDCBalance = usdcToken.balanceOf(address(this));
        uint256 actualUSDCToReturn = actualUSDCBalance < usdcToReturn ? actualUSDCBalance : usdcToReturn;
        
        // Transfer USDC to user
        bool transferSuccess = usdcToken.transfer(msg.sender, actualUSDCToReturn);
        require(transferSuccess, "USDC transfer failed");
        
        emit USDCWithdrawn(msg.sender, platformTokenBalance, actualUSDCToReturn);
    }

    // View functions
    function getTokenManagerUSDCBalance() external view returns (uint256) {
        return usdcToken.balanceOf(address(this));
    }

    function getCompoundUSDCBalance() external view returns (uint256) {
        return cUSDC.balanceOf(address(this));
    }

    function getTotalAvailableBalance() external view returns (uint256) {
        return usdcToken.balanceOf(address(this)) + cUSDC.balanceOf(address(this));
    }

    // Admin functions
    function balanceSupply(address to) external onlyOwner {
        // CHECKS
        require(to != address(0), "Invalid recipient");
        
        // Calculate required USDC to match token supply
        uint256 totalTokensMinted = platformToken.totalSupply();
        uint256 requiredUSDC = totalTokensMinted / 1e12; // Convert 18 decimals to 6 decimals
        
        // Calculate current available USDC
        uint256 tokenManagerBalance = usdcToken.balanceOf(address(this));
        uint256 compoundBalance = cUSDC.balanceOf(address(this));
        uint256 totalAvailableUSDC = tokenManagerBalance + compoundBalance;
        
        // Calculate excess (yield) that can be taken
        uint256 excessUSDC = 0;
        if (totalAvailableUSDC > requiredUSDC) {
            excessUSDC = totalAvailableUSDC - requiredUSDC;
        }
        
        require(excessUSDC > 0, "No excess USDC to withdraw");
        
        // INTERACTIONS
        // Withdraw from Compound if needed
        if (tokenManagerBalance < excessUSDC) {
            uint256 neededFromCompound = excessUSDC - tokenManagerBalance;
            cUSDC.withdraw(address(usdcToken), neededFromCompound);
        }
        
        bool transferSuccess = usdcToken.transfer(to, excessUSDC);
        require(transferSuccess, "USDC transfer failed");
        
        emit BalanceSupply(msg.sender, to, excessUSDC, block.timestamp);
    }

    function emergencyWithdrawAll(address to) external onlyOwner {
        // CHECKS
        require(to != address(0), "Invalid recipient");
        
        uint256 totalBalance = this.getTotalAvailableBalance();
        require(totalBalance > 0, "No funds to withdraw");
        
        // INTERACTIONS
        // Withdraw from Compound if needed
        uint256 tokenManagerBalance = usdcToken.balanceOf(address(this));
        if (tokenManagerBalance < totalBalance) {
            uint256 neededFromCompound = totalBalance - tokenManagerBalance;
            cUSDC.withdraw(address(usdcToken), neededFromCompound);
        }
        
        bool transferSuccess = usdcToken.transfer(to, totalBalance);
        require(transferSuccess, "USDC transfer failed");
        
        emit EmergencyWithdrawal(msg.sender, to, totalBalance, block.timestamp);
    }
}
