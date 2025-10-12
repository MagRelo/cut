# Compound V3 Comet Integration Guide

## Overview

This document describes the integration of Compound V3 Comet protocol into the Bet the Cut platform for yield generation and lending functionality. Compound V3 Comet is a next-generation money market protocol that provides efficient lending and borrowing capabilities.

## Contract Information

- **Deployed Address**: [0xb125E6687d4313864e53df431d5425969c15Eb2F](https://basescan.org/address/0xb125E6687d4313864e53df431d5425969c15Eb2F)
- **Network**: Base Mainnet
- **Contract Type**: TransparentUpgradeableProxy
- **Implementation**: CometWithExtendedAssetList
- **Base Token**: USDC (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)

## Key Features of Compound V3 Comet

### 1. **Monolithic Design**

- Single contract handles all lending/borrowing operations
- Eliminates the need for separate cToken contracts
- More gas-efficient than Compound V2

### 2. **Base Asset vs Collateral Assets**

- **Base Asset**: USDC (the primary lending/borrowing asset)
- **Collateral Assets**: Other tokens that can be supplied as collateral
- Users can borrow base asset against collateral assets

### 3. **Interest Rate Model**

- Dynamic interest rates based on utilization
- Separate rates for supply and borrow
- Kink-based model with different slopes above/below utilization threshold

### 4. **Liquidation Mechanism**

- "Absorb" mechanism instead of traditional liquidations
- Protocol absorbs underwater positions
- Anyone can trigger absorption for incentives

### 5. **Pause Functionality**

- Granular pause controls for different operations
- Supply, transfer, withdraw, absorb, and buy operations can be paused independently

## Core Functions

### Supply Operations

```solidity
function supply(address asset, uint amount) external
function supplyTo(address dst, address asset, uint amount) external
function supplyFrom(address from, address dst, address asset, uint amount) external
```

### Withdraw Operations

```solidity
function withdraw(address asset, uint amount) external
function withdrawTo(address to, address asset, uint amount) external
function withdrawFrom(address src, address to, address asset, uint amount) external
```

### Transfer Operations

```solidity
function transfer(address dst, uint amount) external returns (bool)
function transferFrom(address src, address dst, uint amount) external returns (bool)
function transferAsset(address dst, address asset, uint amount) external
```

### Balance Queries

```solidity
function balanceOf(address account) external view returns (uint256)
function borrowBalanceOf(address account) external view returns (uint256)
function totalSupply() external view returns (uint256)
function totalBorrow() external view returns (uint256)
```

### Interest Accrual

```solidity
function accrueAccount(address account) external
function getSupplyRate(uint utilization) external view returns (uint64)
function getBorrowRate(uint utilization) external view returns (uint64)
function getUtilization() external view returns (uint)
```

## Integration Strategy for Bet the Cut

### 1. **TokenManager Integration**

The TokenManager is the primary interface with Compound V3 Comet:

```solidity
// TokenManager interface with Compound V3
interface ICErc20 {
    function supply(address asset, uint256 amount) external;
    function withdraw(address asset, uint256 amount) external;
    function balanceOf(address owner) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function isSupplyPaused() external view returns (bool);
    function isWithdrawPaused() external view returns (bool);
}
```

**Key Integration Points:**

- **Supply**: TokenManager supplies USDC to Compound V3 for yield generation
- **Withdraw**: TokenManager withdraws USDC from Compound V3 when needed
- **Balance Tracking**: Uses `balanceOf()` to track yield accumulation
- **Pause Handling**: Checks pause states before operations

### 2. **Yield Generation Flow**

1. **User deposits USDC** into the platform
2. **TokenManager supplies USDC** to Compound V3 Comet
3. **Interest accrues** over time on the supplied USDC
4. **Yield increases exchange rate** between USDC and platform tokens
5. **Users receive yield** through:
   - **Automatic**: Higher USDC returns when withdrawing platform tokens
   - **Manual**: Claiming accumulated yield via `claimYield()`

### 3. **Yield Distribution Mechanism**

The TokenManager uses an **exchange rate-based yield distribution system** rather than direct yield distribution:

#### **Exchange Rate System**

```solidity
// Yield increases the exchange rate between USDC and platform tokens
function _updateYield() internal {
    uint256 currentYield = getCompoundYield();
    if (currentYield > 0 && totalPlatformTokensMinted > 0) {
        uint256 yieldPerToken = (currentYield * 1e18) / totalPlatformTokensMinted;
        accumulatedYieldPerToken += yieldPerToken;
        lastYieldUpdateTime = block.timestamp;

        emit YieldAccrued(currentYield, accumulatedYieldPerToken);
    }
}
```

#### **User Yield Tracking**

```solidity
// Updates yield for a specific user
function _updateUserYield(address user) internal {
    uint256 userBalance = platformToken.balanceOf(user);
    if (userBalance > 0) {
        uint256 yieldDifference = accumulatedYieldPerToken - userLastYieldPerToken[user];
        if (yieldDifference > 0) {
            uint256 userYield = (userBalance * yieldDifference) / 1e18;
            userAccumulatedYield[user] += userYield;
        }
    }
    userLastYieldPerToken[user] = accumulatedYieldPerToken;
}
```

#### **Yield Distribution Methods**

**1. Automatic Yield (Primary Method)**

- Yield increases the exchange rate between USDC and platform tokens
- When users withdraw, they receive more USDC than originally deposited
- No separate yield distribution function needed

**2. Manual Yield Claims**

```solidity
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
```

#### **When Yield Updates Occur**

Yield is automatically updated in these operations:

```solidity
// Yield updates happen in these functions:
function depositUSDC(uint256 amount) external {
    _updateYield();  // Updates yield before processing deposit
    // ... rest of deposit logic
}

function withdrawUSDC(uint256 platformTokenAmount) external {
    _updateYield();  // Updates yield before processing withdrawal
    // ... rest of withdrawal logic
}

function withdrawAll() external {
    _updateYield();  // Updates yield before processing withdrawal
    // ... rest of withdrawal logic
}

function claimYield() external {
    _updateYield();  // Updates yield before claiming
    // ... rest of claim logic
}
```

This ensures that yield is always calculated with the most current data before any balance-affecting operations.

#### **Yield Calculation Mechanism**

The TokenManager calculates yield by comparing the current Compound V3 balance with the total deposited amount:

```solidity
function getCompoundYield() internal view returns (uint256) {
    // Get current balance from Compound V3
    uint256 cUSDCBalance = cUSDC.balanceOf(address(this));
    if (cUSDCBalance == 0) {
        return 0;
    }

    // Calculate yield as the difference between current value and total deposited
    uint256 totalDeposited = totalUSDCBalance;

    if (cUSDCBalance > totalDeposited) {
        return cUSDCBalance - totalDeposited;
    }
    return 0;
}
```

**Key Points:**

- **No `accrueAccount()` needed**: Compound V3's `balanceOf()` already includes accrued interest
- **Simple calculation**: Yield = Current Balance - Total Deposited
- **Automatic updates**: Yield is recalculated on every operation
- **Precision handling**: All calculations maintain proper decimal precision

### 4. **Risk Management**

- **Collateralization Checks**: Monitor user positions for liquidation risk
- **Pause Integration**: Respect Compound V3 pause states
- **Emergency Withdrawals**: Ability to withdraw from Compound V3 if needed

## MockCompound Contract

For testing purposes, we use a simplified mock of Compound V3 Comet:

### Key Mock Functions

```solidity
contract MockCToken {
    function supply(address asset, uint256 amount) external;
    function withdraw(address asset, uint256 amount) external;
    function balanceOf(address owner) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function addYield(address to, uint256 yieldAmount) external;
    function accrueAccount(address account) external;
}
```

### Mock vs Real Differences

| Feature          | MockCompound          | Real Compound V3              |
| ---------------- | --------------------- | ----------------------------- |
| Interest Model   | Manual yield addition | Dynamic based on utilization  |
| Interest Accrual | Manual via addYield() | Automatic via accrueAccount() |
| Collateral       | Not implemented       | Full collateral system        |
| Liquidations     | Not implemented       | Absorb mechanism              |
| Pause States     | Basic pause flags     | Granular pause controls       |
| Asset Support    | Single underlying     | Multiple collateral assets    |

## Implementation Plan

### Phase 1: Basic Integration

1. ✅ Deploy MockCompound for testing
2. ✅ Integrate TokenManager with MockCompound
3. ✅ Implement yield addition script
4. ✅ Test yield distribution

### Phase 2: Production Integration

1. **Deploy to Base Mainnet**

   - Configure TokenManager with real Compound V3 address
   - Set up proper USDC approvals
   - Test with small amounts

2. **Yield Distribution System**

   - Implement automated yield accrual
   - Create yield distribution mechanism
   - Add monitoring and alerts

3. **Risk Management**
   - Implement collateralization monitoring
   - Add emergency pause functionality
   - Create liquidation protection

### Phase 3: Advanced Features

1. **Multi-Asset Support**

   - Add support for additional collateral assets
   - Implement collateral optimization

2. **Advanced Yield Strategies**
   - Dynamic allocation between different yield sources
   - Risk-adjusted yield optimization

## Security Considerations

### 1. **Access Control**

- Only authorized contracts should interact with Compound V3
- Implement proper role-based access control

### 2. **Reentrancy Protection**

- Compound V3 has built-in reentrancy protection
- Ensure our contracts also implement proper protection

### 3. **Pause State Handling**

- Monitor Compound V3 pause states
- Implement graceful degradation when operations are paused

### 4. **Emergency Procedures**

- Ability to withdraw all funds from Compound V3
- Emergency pause functionality
- Circuit breakers for unusual activity

## Monitoring and Maintenance

### 1. **Key Metrics to Monitor**

- Total value locked in Compound V3
- Yield generation rates
- Utilization rates
- Pause states
- Liquidation events

### 2. **Alerts and Notifications**

- Low yield generation alerts
- High utilization warnings
- Pause state changes
- Emergency condition notifications

### 3. **Regular Maintenance**

- Monitor Compound V3 upgrades
- Update integration as needed
- Review and optimize yield strategies

## Testing Strategy

### 1. **Unit Tests**

- Test all TokenManager functions with MockCompound
- Verify yield calculations
- Test emergency procedures

### 2. **Integration Tests**

- Test with forked Base mainnet
- Verify real Compound V3 interactions
- Test pause state handling

### 3. **Stress Tests**

- Test with large amounts
- Test under high utilization
- Test emergency scenarios

## Resources

- [Compound V3 Documentation](https://docs.compound.finance/)
- [Compound V3 GitHub](https://github.com/compound-finance/compound-protocol)
- [Base Mainnet Explorer](https://basescan.org/)
- [Compound V3 Contract on BaseScan](https://basescan.org/address/0xb125E6687d4313864e53df431d5425969c15Eb2F)

## Conclusion

Compound V3 Comet provides a robust foundation for yield generation in the Bet the Cut platform. The monolithic design, efficient interest rate model, and comprehensive safety features make it an excellent choice for our lending and yield generation needs.

The integration will be implemented in phases, starting with the MockCompound for testing and gradually moving to full production integration with the real Compound V3 contract on Base mainnet.
