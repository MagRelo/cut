# Fresh Sepolia Base Deployment

**Deployment Date:** January 7, 2025  
**Network:** Base Sepolia (Chain ID: 84532)  
**Deployer:** 0x1804c8AB1F12E6bbf3894d4083f33e07309d1f38

## Deployed Contracts

| Contract      | Address                                      | Purpose                              | Verified |
| ------------- | -------------------------------------------- | ------------------------------------ | -------- |
| PaymentToken  | `0xFA774B0c947f1Cf892e8971F7ffA4FC1892193d6` | Mock USDC (6 decimals)               | ✅       |
| PlatformToken | `0xb5Ae36A746e177762cDe851e3Ee970a45be9AD9F` | CUT platform token (18 decimals)     | ❌       |
| MockCToken    | `0x87148A169503ED54b32f3cd66948292014D1c5A3` | Mock Compound cUSDC                  | ✅       |
| TokenManager  | `0xed57ed5ea897eaC25e291a314FD29420381B77a0` | Manages deposits/withdrawals & yield | ✅       |
| EscrowFactory | `0x87446Ef8ff9B142ADaa8cAb44bf8B12c27E5F0C3` | Creates escrow contracts             | ✅       |

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

- **Initial Oracle**: 0x1804c8AB1F12E6bbf3894d4083f33e07309d1f38
- **MockCToken Balance**: 1,000,000 USDC pre-minted for testing yield
- **All contracts verified** except PlatformToken (verification rate limit)

## Block Information

- **Block Number**: 29497320
- **Gas Used**: 6,554,787 total
- **Total ETH Cost**: 0.000006169175435577 ETH

## Verification Status

4 out of 5 contracts successfully verified on BaseScan. PlatformToken verification failed due to API rate limiting but can be re-attempted.

## Notes

- This deployment uses the actual contract sources from `/contracts/src/`
- TokenManager contract handles all treasury/exchange functionality
- All yield flows through TokenManager to CUT token holders
- MockCToken is used for Sepolia testing; production would use real Compound cUSDC
