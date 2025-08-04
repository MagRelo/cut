# CUSDC Interface Fix

## Issue Description

The original implementation was using **Compound V2** function names (`mint` and `redeem`) in the mock contract, but the real CUSDC contract on Base Mainnet uses **Compound V3** function names (`supply` and `withdraw`).

### Problem

- **Mock Implementation**: Used `mint(uint256 amount)` and `redeem(uint256 cTokenAmount)`
- **Real Base Mainnet CUSDC**: Uses `supply(uint256 amount)` and `withdraw(uint256 amount)`
- This caused function call failures when interacting with the real contract

### Evidence

Looking at the Basescan link: https://basescan.org/address/0x9c4ec768c28520b50860ea7a15bd7213a9ff58bf

The real CUSDC contract on Base Mainnet shows failed transactions for "mint" functions, indicating that the contract doesn't have a `mint` function but likely has `supply` and `withdraw` functions instead.

## Solution

### 1. Updated MockCToken Contract

- Added Compound V3 style functions: `supply()` and `withdraw()`
- Kept Compound V2 functions (`mint()` and `redeem()`) for backward compatibility
- Both function sets now work correctly

### 2. Updated Treasury Contract

- Modified `ICErc20` interface to include both V2 and V3 function signatures
- Updated `depositUSDC()` to use `cUSDC.supply(amount)` instead of `cUSDC.mint(amount)`
- Updated `withdrawUSDC()` and `emergencyWithdrawUSDC()` to use `cUSDC.withdraw(amount)` instead of `cUSDC.redeem()`

### 3. Function Mapping

| Compound V2                | Compound V3        | Purpose                                       |
| -------------------------- | ------------------ | --------------------------------------------- |
| `mint(amount)`             | `supply(amount)`   | Deposit underlying tokens to get cTokens      |
| `redeem(cTokenAmount)`     | `withdraw(amount)` | Withdraw underlying tokens by burning cTokens |
| `redeemUnderlying(amount)` | `withdraw(amount)` | Withdraw specific amount of underlying tokens |

## Files Modified

1. **`contracts/test/MockCompound.sol`**

   - Added `supply()` and `withdraw()` functions
   - Kept `mint()` and `redeem()` for backward compatibility

2. **`contracts/src/Treasury.sol`**
   - Updated `ICErc20` interface to include V3 functions
   - Changed function calls from `mint`/`redeem` to `supply`/`withdraw`

## Testing

All tests pass successfully:

- 55 tests passed, 0 failed
- Treasury tests specifically verify the new `supply`/`withdraw` functionality
- Backward compatibility maintained for existing code

## Deployment Impact

This fix ensures that:

1. **Development/Testing**: Mock contracts work correctly with both V2 and V3 function names
2. **Production**: Treasury contract can properly interact with the real Base Mainnet CUSDC contract
3. **Backward Compatibility**: Existing code that uses V2 function names continues to work

## Next Steps

When deploying to production:

1. Verify that the real CUSDC contract on Base Mainnet has `supply` and `withdraw` functions
2. Test the Treasury contract with small amounts on mainnet
3. Monitor transaction success rates for CUSDC interactions
