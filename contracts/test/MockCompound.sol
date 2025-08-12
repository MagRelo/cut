// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../src/PaymentToken.sol";
import "forge-std/Test.sol";

contract MockCToken {
    IERC20 public underlying;
    
    // Core state variables (like real Compound V3)
    uint64 public baseSupplyIndex = 1e15; // BASE_INDEX_SCALE = 1e15
    uint64 public baseBorrowIndex = 1e15;
    uint104 public totalSupplyBase; // Principal supply
    uint104 public totalBorrowBase; // Principal borrow
    uint40 public lastAccrualTime;
    
    // User state (like real Compound V3)
    mapping(address => int104) public principal; // Can be positive (supply) or negative (borrow)
    
    // Pause flags
    bool public _isSupplyPaused;
    bool public _isWithdrawPaused;
    
    // Interest rate model (simplified)
    uint64 public constant SECONDS_PER_YEAR = 31_536_000;
    uint64 public constant BASE_INDEX_SCALE = 1e15;
    uint64 public constant FACTOR_SCALE = 1e18;
    
    // Fixed 5% APY for simplicity - much smaller rate to prevent overflow
    // For 5% APY, we need a much smaller per-second rate
    // 5% APY = 0.05 / SECONDS_PER_YEAR * FACTOR_SCALE = 0.05 / 31,536,000 * 1e18 = 1,585,489
    // But this is still too high. Let me use a much smaller rate for testing
    uint64 public constant SUPPLY_RATE_PER_SECOND = 1585489000; // 5% APY / SECONDS_PER_YEAR * FACTOR_SCALE
    
    // Simulate borrowers to generate real interest
    mapping(address => uint256) public borrowerBalances;
    uint256 public totalBorrowed;
    
    event Supply(address indexed from, address indexed dst, uint amount);
    event Withdraw(address indexed from, address indexed dst, uint amount);
    event Transfer(address indexed from, address indexed to, uint amount);
    event Borrow(address indexed borrower, uint amount);
    event Repay(address indexed borrower, uint amount);

    constructor(address _underlying) {
        underlying = IERC20(_underlying);
        lastAccrualTime = uint40(block.timestamp);
    }
    
    function supply(address asset, uint256 amount) external {
        require(!_isSupplyPaused, "Supply paused");
        require(asset == address(underlying), "Invalid asset");
        
        // Accrue interest before processing supply
        accrueInternal();
        
        underlying.transferFrom(msg.sender, address(this), amount);
        
        // Update user principal (like real Compound V3)
        int104 oldPrincipal = principal[msg.sender];
        int256 oldBalance = presentValue(oldPrincipal);
        int256 newBalance = oldBalance + int256(amount);
        int104 newPrincipal = principalValue(newBalance);
        
        // Update totals
        (uint104 repayAmount, uint104 supplyAmount) = repayAndSupplyAmount(oldPrincipal, newPrincipal);
        totalSupplyBase += supplyAmount;
        totalBorrowBase -= repayAmount;
        
        principal[msg.sender] = newPrincipal;
        
        emit Supply(msg.sender, msg.sender, amount);
        if (supplyAmount > 0) {
            emit Transfer(address(0), msg.sender, presentValueSupply(baseSupplyIndex, supplyAmount));
        }
    }

    function withdraw(address asset, uint256 amount) external {
        require(!_isWithdrawPaused, "Withdraw paused");
        require(asset == address(underlying), "Invalid asset");
        
        // Accrue interest before processing withdrawal
        accrueInternal();
        
        // Update user principal (like real Compound V3)
        int104 oldPrincipal = principal[msg.sender];
        int256 oldBalance = presentValue(oldPrincipal);
        int256 newBalance = oldBalance - int256(amount);
        int104 newPrincipal = principalValue(newBalance);
        
        require(newBalance >= 0, "Insufficient balance");
        
        // Update totals
        (uint104 withdrawAmount, uint104 borrowAmount) = withdrawAndBorrowAmount(oldPrincipal, newPrincipal);
        totalSupplyBase -= withdrawAmount;
        totalBorrowBase += borrowAmount;
        
        principal[msg.sender] = newPrincipal;
        
        // Transfer tokens to user (only what we actually have)
        underlying.transfer(msg.sender, amount);
        
        emit Withdraw(msg.sender, msg.sender, amount);
        if (withdrawAmount > 0) {
            emit Transfer(msg.sender, address(0), presentValueSupply(baseSupplyIndex, withdrawAmount));
        }
    }

    function borrow(uint256 amount) external {
        require(!_isWithdrawPaused, "Borrow paused");
        
        // Accrue interest before processing borrow
        accrueInternal();
        
        // Update borrower balance
        borrowerBalances[msg.sender] += amount;
        totalBorrowed += amount;
        
        // Transfer tokens to borrower
        underlying.transfer(msg.sender, amount);
        
        emit Borrow(msg.sender, amount);
    }
    
    function repay(uint256 amount) external {
        require(!_isWithdrawPaused, "Repay paused");
        
        // Accrue interest before processing repay
        accrueInternal();
        
        // Update borrower balance
        require(borrowerBalances[msg.sender] >= amount, "Insufficient borrow balance");
        borrowerBalances[msg.sender] -= amount;
        totalBorrowed -= amount;
        
        // Transfer tokens from borrower
        underlying.transferFrom(msg.sender, address(this), amount);
        
        emit Repay(msg.sender, amount);
    }
    
    // Function to add interest payments from borrowers (for testing)
    function addInterestPayment(uint256 amount) external {
        // In real Compound V3, this would come from borrowers paying interest
        // For testing, we simulate this by minting USDC to the contract
        PaymentToken(address(underlying)).mint(address(this), amount);
    }

    // This is the key function - matches real Compound V3's balanceOf
    function balanceOf(address owner) external view returns (uint256) {
        (uint64 baseSupplyIndex_, ) = accruedInterestIndices(getNowInternal() - lastAccrualTime);
        int104 principal_ = principal[owner];
        return principal_ > 0 ? presentValueSupply(baseSupplyIndex_, uint104(principal_)) : 0;
    }

    function totalSupply() external view returns (uint256) {
        (uint64 baseSupplyIndex_, ) = accruedInterestIndices(getNowInternal() - lastAccrualTime);
        return presentValueSupply(baseSupplyIndex_, totalSupplyBase);
    }

    function totalBorrow() external view returns (uint256) {
        (, uint64 baseBorrowIndex_) = accruedInterestIndices(getNowInternal() - lastAccrualTime);
        return presentValueBorrow(baseBorrowIndex_, totalBorrowBase);
    }

    function setPauseStatus(bool supplyPaused, bool withdrawPaused) external {
        _isSupplyPaused = supplyPaused;
        _isWithdrawPaused = withdrawPaused;
    }

    // Add missing pause state functions that TokenManager expects
    function isSupplyPaused() external view returns (bool) {
        return _isSupplyPaused;
    }

    function isWithdrawPaused() external view returns (bool) {
        return _isWithdrawPaused;
    }

    function accrueAccount(address account) external {
        accrueInternal();
        // In real Compound V3, this would update tracking indices for the account
        // For our mock, we just accrue interest globally
    }

    // Internal functions (like real Compound V3)

    function accrueInternal() internal {
        uint40 now_ = getNowInternal();
        uint timeElapsed = uint256(now_ - lastAccrualTime);
        if (timeElapsed > 0) {
            (baseSupplyIndex, baseBorrowIndex) = accruedInterestIndices(timeElapsed);
            lastAccrualTime = now_;
        }
    }

    // Fixed function using Compound V3's overflow-safe approach
    function accruedInterestIndices(uint timeElapsed) internal view returns (uint64, uint64) {
        uint64 baseSupplyIndex_ = baseSupplyIndex;
        uint64 baseBorrowIndex_ = baseBorrowIndex;
        if (timeElapsed > 0) {
            uint64 supplyRate = SUPPLY_RATE_PER_SECOND; // Use the new constant
            uint64 borrowRate = supplyRate; // Same rate for simplicity
            
            // Use Compound V3's overflow-safe approach: mulFactor then safe64
            baseSupplyIndex_ += safe64(mulFactor(baseSupplyIndex_, supplyRate * timeElapsed));
            baseBorrowIndex_ += safe64(mulFactor(baseBorrowIndex_, borrowRate * timeElapsed));
        }
        return (baseSupplyIndex_, baseBorrowIndex_);
    }

    // Compound V3's mulFactor function - prevents overflow by dividing by FACTOR_SCALE
    function mulFactor(uint n, uint factor) internal pure returns (uint) {
        return n * factor / FACTOR_SCALE;
    }

    // Compound V3's safe64 function - safely converts uint to uint64
    function safe64(uint n) internal pure returns (uint64) {
        require(n <= type(uint64).max, "Safe64: value exceeds uint64 max");
        return uint64(n);
    }

    function getNowInternal() internal view returns (uint40) {
        return uint40(block.timestamp);
    }

    function presentValue(int104 principal_) internal view returns (int256) {
        if (principal_ >= 0) {
            return int256(presentValueSupply(baseSupplyIndex, uint104(principal_)));
        } else {
            return -int256(presentValueBorrow(baseBorrowIndex, uint104(-principal_)));
        }
    }

    function presentValueSupply(uint64 baseSupplyIndex_, uint104 principalValue_) internal pure returns (uint256) {
        return uint256(principalValue_) * baseSupplyIndex_ / BASE_INDEX_SCALE;
    }

    function presentValueBorrow(uint64 baseBorrowIndex_, uint104 principalValue_) internal pure returns (uint256) {
        return uint256(principalValue_) * baseBorrowIndex_ / BASE_INDEX_SCALE;
    }

    function principalValue(int256 presentValue_) internal view returns (int104) {
        if (presentValue_ >= 0) {
            return int104(principalValueSupply(baseSupplyIndex, uint256(presentValue_)));
        } else {
            return -int104(principalValueBorrow(baseBorrowIndex, uint256(-presentValue_)));
        }
    }

    function principalValueSupply(uint64 baseSupplyIndex_, uint256 presentValue_) internal pure returns (uint104) {
        return uint104((presentValue_ * BASE_INDEX_SCALE) / baseSupplyIndex_);
    }

    function principalValueBorrow(uint64 baseBorrowIndex_, uint256 presentValue_) internal pure returns (uint104) {
        return uint104((presentValue_ * BASE_INDEX_SCALE + baseBorrowIndex_ - 1) / baseBorrowIndex_);
    }

    function repayAndSupplyAmount(int104 oldPrincipal, int104 newPrincipal) internal pure returns (uint104, uint104) {
        if (newPrincipal < oldPrincipal) return (0, 0);
        if (newPrincipal <= 0) {
            return (uint104(newPrincipal - oldPrincipal), 0);
        } else if (oldPrincipal >= 0) {
            return (0, uint104(newPrincipal - oldPrincipal));
        } else {
            return (uint104(-oldPrincipal), uint104(newPrincipal));
        }
    }

    function withdrawAndBorrowAmount(int104 oldPrincipal, int104 newPrincipal) internal pure returns (uint104, uint104) {
        if (newPrincipal > oldPrincipal) return (0, 0);
        if (newPrincipal >= 0) {
            return (uint104(oldPrincipal - newPrincipal), 0);
        } else if (oldPrincipal <= 0) {
            return (0, uint104(oldPrincipal - newPrincipal));
        } else {
            return (uint104(oldPrincipal), uint104(-newPrincipal));
        }
    }
} 