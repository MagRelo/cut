// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./PlatformToken.sol";

// Compound V3 Comet interfaces (matching real Base Mainnet CUSDC)
interface ICErc20 {
    // Compound V3 Comet style functions
    function supply(address asset, uint256 amount) external;
    function withdraw(address asset, uint256 amount) external;
    
    // Balance functions - in V3, balanceOf returns underlying balance directly
    function balanceOf(address owner) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    
    // Pause status functions
    function isSupplyPaused() external view returns (bool);
    function isWithdrawPaused() external view returns (bool);
}

contract TokenManager is ReentrancyGuard, Ownable {
    IERC20 public immutable usdcToken;
    PlatformToken public immutable platformToken;
    ICErc20 public immutable cUSDC;

    // Yield tracking state
    uint256 public totalUSDCBalance;
    uint256 public totalPlatformTokensMinted;
    uint256 public lastYieldUpdateTime;
    uint256 public accumulatedYieldPerToken;
    uint256 public lastExchangeRate;

    // User-specific yield tracking
    mapping(address => uint256) public userLastYieldPerToken;
    mapping(address => uint256) public userAccumulatedYield;

    event USDCDeposited(address indexed user, uint256 usdcAmount, uint256 platformTokensMinted);
    event USDCWithdrawn(address indexed user, uint256 platformTokensBurned, uint256 usdcAmount);
    event ExchangeRateUpdated(uint256 newRate);
    event YieldAccrued(uint256 yieldAmount, uint256 newAccumulatedYieldPerToken);
    event EmergencyWithdrawal(address indexed owner, address indexed recipient, uint256 amount, uint256 timestamp);
    event TokenManagerMint(address indexed to, uint256 amount);

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
        lastYieldUpdateTime = block.timestamp;
        lastExchangeRate = 1e18; // 1:1 initial rate
    }

    function depositUSDC(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        
        // Update yield for all users before processing deposit
        _updateYield();
        
        // Transfer USDC from user to token manager
        usdcToken.transferFrom(msg.sender, address(this), amount);
        
        // Calculate platform tokens to mint based on current exchange rate
        uint256 platformTokensToMint = calculatePlatformTokensForUSDC(amount);
        
        // Update user's yield tracking before minting new tokens
        _updateUserYield(msg.sender);
        
        // Mint platform tokens to user (convert to 18 decimals)
        platformToken.mint(msg.sender, platformTokensToMint);
        
        // Update token manager balances
        totalUSDCBalance += amount;
        totalPlatformTokensMinted += platformTokensToMint; // Already in 18 decimals
        
        // Deposit USDC to Compound for yield generation
        usdcToken.approve(address(cUSDC), amount);
        cUSDC.supply(address(usdcToken), amount);
        
        // Update exchange rate after deposit
        _updateExchangeRate();
        
        emit USDCDeposited(msg.sender, amount, platformTokensToMint);
    }

    function withdrawUSDC(uint256 platformTokenAmount) external nonReentrant {
        require(platformTokenAmount > 0, "Amount must be greater than 0");
        require(platformToken.balanceOf(msg.sender) >= platformTokenAmount, "Insufficient platform tokens");
        
        // Update yield for all users before processing withdrawal
        _updateYield();
        
        // Update user's yield tracking before burning tokens
        _updateUserYield(msg.sender);
        
        // Calculate USDC to return based on current exchange rate
        uint256 usdcToReturn = calculateUSDCForPlatformTokens(platformTokenAmount);
        require(usdcToReturn > 0, "No USDC to return");
        
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
        usdcToken.transfer(msg.sender, actualUSDCToReturn);
        
        // Update token manager balances
        uint256 originalDepositAmount = platformTokenAmount / 1e12;
        totalUSDCBalance -= originalDepositAmount;
        totalPlatformTokensMinted -= platformTokenAmount; // Already in 18 decimals
        
        // Update exchange rate after withdrawal
        _updateExchangeRate();
        
        emit USDCWithdrawn(msg.sender, platformTokenAmount, actualUSDCToReturn);
    }

    // Combined withdrawal function - withdraw deposit + yield in one transaction
    function withdrawAll() external nonReentrant {
        uint256 platformTokenBalance = platformToken.balanceOf(msg.sender);
        require(platformTokenBalance > 0, "No platform tokens to withdraw");
        
        // Update yield for all users before processing withdrawal
        _updateYield();
        
        // Update user's yield tracking before burning tokens
        _updateUserYield(msg.sender);
        
        // Calculate USDC to return for platform tokens (this already includes yield through exchange rate)
        uint256 usdcToReturn = calculateUSDCForPlatformTokens(platformTokenBalance);
        require(usdcToReturn > 0, "No USDC to return");
        
        // Burn all platform tokens from user
        platformToken.burn(msg.sender, platformTokenBalance);
        
        // Clear accumulated yield
        userAccumulatedYield[msg.sender] = 0;
        
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
        usdcToken.transfer(msg.sender, actualUSDCToReturn);
        
        // Update token manager balances (only for the original deposit portion)
        uint256 originalDepositAmount = platformTokenBalance / 1e12;
        totalUSDCBalance -= originalDepositAmount;
        totalPlatformTokensMinted -= platformTokenBalance; // Already in 18 decimals
        
        // Update exchange rate after withdrawal
        _updateExchangeRate();
        
        emit USDCWithdrawn(msg.sender, platformTokenBalance, actualUSDCToReturn);
    }

    function getExchangeRate() internal view returns (uint256) {
        if (totalPlatformTokensMinted == 0) {
            return 1e6; // 1:1 rate if no tokens minted yet (in 6 decimals)
        }
        
        uint256 totalValue = totalUSDCBalance + getCompoundYield();
        // Calculate exchange rate: USDC per platform token
        // totalValue: 6 decimals (USDC)
        // totalPlatformTokensMinted: 18 decimals
        // Result should be in 6 decimals (USDC per platform token)
        // Formula: (totalValue * 1e6) / (totalPlatformTokensMinted / 1e12)
        return (totalValue * 1e6) / (totalPlatformTokensMinted / 1e12);
    }

    function getExchangeRateExternal() external view returns (uint256) {
        return getExchangeRate();
    }

    function getTokenManagerBalance() external view returns (uint256) {
        return totalUSDCBalance + getCompoundYield();
    }

    function getPlatformTokenSupply() external view returns (uint256) {
        return totalPlatformTokensMinted;
    }

    function getTokenManagerUSDCBalance() external view returns (uint256) {
        return usdcToken.balanceOf(address(this));
    }

    function getCompoundUSDCBalance() external view returns (uint256) {
        return cUSDC.balanceOf(address(this));
    }

    function getTotalAvailableBalance() external view returns (uint256) {
        return usdcToken.balanceOf(address(this)) + cUSDC.balanceOf(address(this));
    }

    function getLastYieldUpdateTime() external view returns (uint256) {
        return lastYieldUpdateTime;
    }

    function getAccumulatedYieldPerToken() external view returns (uint256) {
        return accumulatedYieldPerToken;
    }

    function tokenManagerMint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        // Mint platform tokens directly (not through USDC deposit)
        platformToken.mint(to, amount);
        
        emit TokenManagerMint(to, amount);
    }

    function emergencyWithdrawUSDC(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than 0");
        
        // Calculate total available balance (token manager + Compound)
        uint256 tokenManagerBalance = usdcToken.balanceOf(address(this));
        uint256 compoundBalance = cUSDC.balanceOf(address(this));
        uint256 totalAvailableBalance = tokenManagerBalance + compoundBalance;
        
        require(amount <= totalAvailableBalance, "Insufficient balance for emergency withdrawal");
        
        // Withdraw from Compound if needed
        if (tokenManagerBalance < amount) {
            uint256 neededFromCompound = amount - tokenManagerBalance;
            cUSDC.withdraw(address(usdcToken), neededFromCompound);
        }
        
        usdcToken.transfer(to, amount);
        
        emit EmergencyWithdrawal(msg.sender, to, amount, block.timestamp);
    }

    function calculatePlatformTokensForUSDC(uint256 usdcAmount) internal view returns (uint256) {
        if (totalPlatformTokensMinted == 0) {
            // First deposit: 1:1 ratio, convert USDC amount to platform tokens
            // usdcAmount is in 6 decimals, we want platform tokens in 18 decimals
            // For a 1:1 ratio, we should mint the same number of platform tokens as USDC
            // So we multiply by 1e12 to convert 6 decimals to 18 decimals
            return usdcAmount * 1e12; // Convert 6 decimals to 18 decimals
        }
        
        uint256 totalValue = totalUSDCBalance + getCompoundYield();
        // Add explicit zero check to prevent division by zero
        require(totalValue > 0, "Total value must be greater than 0");
        
        // For subsequent deposits, calculate platform tokens based on proportion of total value
        // If the new deposit represents X% of the total value, mint X% of the total platform tokens
        uint256 newPlatformTokens = (usdcAmount * totalPlatformTokensMinted) / totalValue;
        return newPlatformTokens;
    }

    function calculateUSDCForPlatformTokens(uint256 platformTokenAmount) internal view returns (uint256) {
        if (totalPlatformTokensMinted == 0) {
            return 0;
        }
        
        // Calculate exchange rate first (in 18 decimals)
        uint256 exchangeRate = getExchangeRate();
        
        // Convert platform tokens to USDC using exchange rate
        // platformTokenAmount: 18 decimals
        // exchangeRate: 6 decimals (represents USDC per platform token)
        // Result should be in 6 decimals (USDC)
        // Formula: (platformTokenAmount * exchangeRate) / 1e18
        return (platformTokenAmount * exchangeRate) / 1e18;
    }

    function getCompoundYield() internal view returns (uint256) {
        // For Compound V3 Comet, use balanceOf to get the actual USDC equivalent
        uint256 cUSDCBalance = cUSDC.balanceOf(address(this));
        if (cUSDCBalance == 0) {
            return 0;
        }
        
        // Calculate yield as the difference between current underlying value and total deposited
        uint256 totalDeposited = totalUSDCBalance;
        
        if (cUSDCBalance > totalDeposited) {
            return cUSDCBalance - totalDeposited;
        }
        return 0;
    }

    // Update yield for all users
    function _updateYield() internal {
        uint256 currentYield = getCompoundYield();
        if (currentYield > 0 && totalPlatformTokensMinted > 0) {
            // Add safety check to prevent division by zero
            require(totalPlatformTokensMinted > 0, "No platform tokens minted");
            
            // Calculate yield per platform token (in USDC decimals)
            // currentYield is in 6 decimals, totalPlatformTokensMinted is in 18 decimals
            uint256 yieldPerToken = (currentYield * 1e18) / totalPlatformTokensMinted;
            accumulatedYieldPerToken += yieldPerToken;
            lastYieldUpdateTime = block.timestamp;
            
            emit YieldAccrued(currentYield, accumulatedYieldPerToken);
        }
    }

    // Update yield for a specific user
    function _updateUserYield(address user) internal {
        uint256 userBalance = platformToken.balanceOf(user);
        if (userBalance > 0) {
            uint256 yieldDifference = accumulatedYieldPerToken - userLastYieldPerToken[user];
            if (yieldDifference > 0) {
                // Calculate user yield in USDC decimals
                // userBalance is in 18 decimals, yieldDifference is in 18 decimals
                // Result should be in 6 decimals (USDC)
                uint256 userYield = (userBalance * yieldDifference) / 1e18;
                userAccumulatedYield[user] += userYield;
            }
        }
        userLastYieldPerToken[user] = accumulatedYieldPerToken;
    }

    // Function to claim accumulated yield
    function claimYield() external nonReentrant {
        _updateYield();
        _updateUserYield(msg.sender);
        
        uint256 yieldToClaim = userAccumulatedYield[msg.sender];
        require(yieldToClaim > 0, "No yield to claim");
        
        userAccumulatedYield[msg.sender] = 0;
        
        // Withdraw USDC from Compound if needed
        uint256 tokenManagerUSDCBalance = usdcToken.balanceOf(address(this));
        if (tokenManagerUSDCBalance < yieldToClaim) {
            uint256 neededFromCompound = yieldToClaim - tokenManagerUSDCBalance;
            cUSDC.withdraw(address(usdcToken), neededFromCompound);
        }
        
        usdcToken.transfer(msg.sender, yieldToClaim);
    }

    // Function to get user's claimable yield
    function getClaimableYield(address user) external view returns (uint256) {
        uint256 currentYield = getCompoundYield();
        uint256 tempAccumulatedYield = accumulatedYieldPerToken;
        
        if (currentYield > 0 && totalPlatformTokensMinted > 0) {
            // Add explicit zero check to prevent division by zero
            require(totalPlatformTokensMinted > 0, "No platform tokens minted");
            uint256 yieldPerToken = (currentYield * 1e18) / totalPlatformTokensMinted;
            tempAccumulatedYield += yieldPerToken;
        }
        
        uint256 userBalance = platformToken.balanceOf(user);
        if (userBalance == 0) {
            return userAccumulatedYield[user];
        }
        
        uint256 yieldDifference = tempAccumulatedYield - userLastYieldPerToken[user];
        // Calculate additional yield in USDC decimals
        // userBalance is in 18 decimals, yieldDifference is in 18 decimals
        // Result should be in 6 decimals (USDC)
        uint256 additionalYield = (userBalance * yieldDifference) / 1e18;
        
        return userAccumulatedYield[user] + additionalYield;
    }

    // Function to update exchange rate (called internally)
    function _updateExchangeRate() internal {
        _updateYield();
        
        uint256 newRate;
        if (totalPlatformTokensMinted == 0) {
            newRate = 1e18; // 1:1 rate if no tokens minted yet
        } else {
            uint256 totalValue = totalUSDCBalance + getCompoundYield();
            // Add explicit zero check to prevent division by zero
            require(totalPlatformTokensMinted > 0, "No platform tokens minted");
            newRate = (totalValue * 1e18) / totalPlatformTokensMinted;
        }
        
        lastExchangeRate = newRate;
        emit ExchangeRateUpdated(newRate);
    }
} 