# Fresh Sepolia Base Deployment

**Deployment Date:** January 7, 2025  
**Network:** Base Sepolia (Chain ID: 84532)  
**Deployer:** 0xbe18962D9C9dA9681b6EF29df03055A3F329f352

## Deployed Contracts

| Contract      | Address                                      | Purpose                              | Verified |
| ------------- | -------------------------------------------- | ------------------------------------ | -------- |
| PaymentToken  | `0x6bEd86bb757dBf61880724fa1D7f04a067896126` | Mock USDC (6 decimals)               | ✅       |
| PlatformToken | `0x7AC48aa698F5328E4C3e2e845889E32A1A9D82cB` | CUT platform token (18 decimals)     | ✅       |
| MockCToken    | `0x8934A193949edfE128EF34eaD1536A85e8a153fE` | Mock Compound cUSDC                  | ✅       |
| TokenManager  | `0x5eA021F56cB0568529723A69A96BE06372edAaa3` | Manages deposits/withdrawals & yield | ✅       |
| EscrowFactory | `0xE0612eac9e5bFbb2EE803516a8AcF722E9f80317` | Creates escrow contracts             | ✅       |

## Contract Architecture

### Current Implementation (as deployed)

1. **PaymentToken.sol** - Mock USDC token for testing

   - 6 decimals (matches real USDC)
   - Mintable by owner for testing

2. **PlatformToken.sol** - CUT platform token

   - 18 decimals (standard ERC20)
   - Only mintable/burnable by TokenManager

3. **TokenManager.sol** - Core yield management

   - Handles USDC deposits/withdrawals
   - Manages yield generation via Compound
   - Converts between USDC and CUT tokens

4. **MockCToken.sol** - Simulates Compound cUSDC

   - For testing yield generation
   - Mimics Compound V3 interface

5. **EscrowFactory.sol** - Factory for creating escrows

   - Oracle management
   - Creates individual Escrow contracts

6. **Escrow.sol** - Individual betting escrows
   - Handles deposits and payouts
   - Oracle-based settlement

## Key Features

- **Yield Generation**: TokenManager deposits USDC into MockCToken to simulate Compound yield
- **Oracle System**: EscrowFactory manages approved oracles for settling bets
- **Escrow Creation**: Users can create betting pools with specific parameters
- **Token Economics**: CUT tokens represent underlying USDC + accrued yield

## Initial Configuration

- **Initial Oracle**: 0xbe18962D9C9dA9681b6EF29df03055A3F329f352
- **MockCToken Balance**: 1,000,000 USDC pre-minted for testing yield
- **All contracts verified** on BaseScan

## Block Information

- **Block Number**: 29627019
- **Gas Used**: 7,342,260 total
- **Total ETH Cost**: 0.00000734264179752 ETH

## Verification Status

All 5 contracts successfully verified on BaseScan.

## Notes

- This deployment uses the actual contract sources from `/contracts/src/`
- TokenManager contract handles all treasury/exchange functionality
- All yield flows through TokenManager to CUT token holders
- MockCToken is used for Sepolia testing; production would use real Compound cUSDC
