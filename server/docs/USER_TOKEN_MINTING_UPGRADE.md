# User Token Minting Upgrade Implementation

This document tracks the implementation of the enhanced token minting system that mints $1000 USDC(x), deposits it into the Token Manager contract to mint CUT tokens, and transfers them to new users upon account creation.

## Overview

The new system implements a complete flow:

1. Mint $1000 USDC(x) to the oracle wallet
2. Approve Token Manager contract to spend USDC
3. Deposit USDC into Token Manager (which mints CUT tokens to oracle wallet)
4. Transfer CUT tokens to new user

## Completed Tasks

- [x] Updated `mintUserTokens.ts` service with new functions
- [x] Added Token Manager contract integration
- [x] Implemented proper USDC to CUT conversion flow
- [x] Updated contract addresses to use base.json configuration
- [x] Updated auth route to use new `mintAndTransferToNewUser` function
- [x] Added proper error handling and logging
- [x] Added `ENABLE_TOKEN_MINTING` environment variable for feature toggle

## In Progress Tasks

- [ ] Test the complete flow end-to-end
- [ ] Verify Token Manager contract integration works correctly
- [ ] Update environment variables documentation

## Future Tasks

- [ ] Add monitoring and alerting for failed token transfers
- [ ] Implement retry logic for failed transactions
- [ ] Add transaction status tracking in database
- [ ] Create admin dashboard for token minting operations

## Implementation Details

### Service Functions

1. **`mintUSDC(amount)`** - Mints USDC(x) to oracle wallet
2. **`approveTokenManagerToSpendUSDC(amount)`** - Approves Token Manager to spend USDC
3. **`depositUSDCToTokenManager(amount)`** - Deposits USDC into Token Manager (mints CUT)
4. **`transferCUTToUser(userWalletAddress, amount)`** - Transfers CUT to user
5. **`mintAndTransferToNewUser(userWalletAddress, usdcAmount)`** - Complete flow

### Contract Addresses

- **PaymentToken (USDC)**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **PlatformToken (CUT)**: `0x2163E7D874BDf8f81dDf470A57166202Ee0d0869`
- **Token Manager**: `0x9Ba098Bcd17b3474E6dA824A43704b8baA8cC3b5`

### Environment Variables Required

- `RPC_URL` - Ethereum RPC endpoint
- `ORACLE_PRIVATE_KEY` - Private key for transaction signing
- `ENABLE_TOKEN_MINTING` - Set to 'true' to enable token minting (default: disabled)

### Testing Commands

```bash
# Test individual functions
npm run tsx src/services/mintUserTokens.ts mint-usdc 1000
npm run tsx src/services/mintUserTokens.ts approve 1000
npm run tsx src/services/mintUserTokens.ts deposit 1000
npm run tsx src/services/mintUserTokens.ts transfer 0x1234... 1000

# Test complete flow
npm run tsx src/services/mintUserTokens.ts complete 0x1234... 1000
```

## Relevant Files

- `server/src/services/mintUserTokens.ts` - ✅ Main service implementation
- `server/src/routes/auth.ts` - ✅ Updated to use new function
- `server/src/contracts/base.json` - ✅ Contract addresses configuration
- `server/src/contracts/TokenManager.json` - ✅ Token Manager contract ABI
- `server/src/contracts/PaymentToken.json` - ✅ USDC contract ABI
- `server/src/contracts/PlatformToken.json` - ✅ CUT contract ABI

## Architecture Flow

```
New User Registration
    ↓
1. Mint $1000 USDC to Oracle Wallet
    ↓
2. Approve Token Manager to Spend USDC
    ↓
3. Deposit USDC into Token Manager
    ↓
4. Token Manager Mints CUT Tokens to Oracle
    ↓
5. Transfer CUT Tokens to New User
    ↓
User Receives $1000 Worth of CUT Tokens
```

## Error Handling

- Each step has individual error handling
- Failed token operations don't prevent user creation
- All errors are logged for debugging
- Transaction hashes are returned for verification

## Security Considerations

- Oracle private key must be securely stored
- Token Manager contract handles the USDC to CUT conversion
- All transactions are signed by the oracle wallet
- User wallet addresses are validated before transfers
