# User Token Minting

This document describes the automatic token minting feature that provides new users with $1000 worth of CUT tokens upon registration.

## Overview

When a new user registers through wallet authentication (SIWE or Web3), the system automatically:

1. Mints $1000 USDC(x) to the oracle wallet
2. Approves the Treasury contract to spend the USDC
3. Deposits USDC into the Treasury contract (which mints CUT tokens to the oracle wallet)
4. Transfers the CUT tokens to the new user's wallet

This provides new users with initial tokens to participate in contests and use platform features.

## Implementation

### Service: `mintUserTokens.ts`

The core functionality is implemented in `src/services/mintUserTokens.ts`:

- **Function**: `mintAndTransferToNewUser(userWalletAddress: string, usdcAmount: number = 1000)`
- **Purpose**: Complete flow from USDC minting to CUT token transfer
- **Default Amount**: $1000 USDC (converted to equivalent CUT tokens)
- **Contract Integration**: Uses PaymentToken (USDC), Treasury, and PlatformToken (CUT) contracts
- **Blockchain Library**: Uses ethers.js for blockchain interactions

### Individual Functions

1. **`mintUSDC(amount)`** - Mints USDC(x) to oracle wallet
2. **`approveTreasuryToSpendUSDC(amount)`** - Approves Treasury to spend USDC
3. **`depositUSDCToTreasury(amount)`** - Deposits USDC into Treasury (mints CUT)
4. **`transferCUTToUser(userWalletAddress, amount)`** - Transfers CUT to user

### Integration Points

The minting is integrated into the user creation process in `src/routes/auth.ts`:

1. **SIWE Authentication** (`/auth/siwe`): When a new user authenticates via SIWE
2. **Web3 Authentication** (`/auth/web3`): When a new user authenticates via Web3

### Error Handling

- Token minting failures do not prevent user creation
- Errors are logged but don't fail the authentication process
- This ensures users can still register even if the blockchain is temporarily unavailable

## Environment Variables

Required environment variables:

- `RPC_URL`: Ethereum RPC endpoint
- `ORACLE_PRIVATE_KEY`: Private key for transaction signing

Optional environment variables:

- `ENABLE_TOKEN_MINTING`: Set to 'true' to enable token minting for new users (default: disabled)

## Contract Addresses

The system uses the following contract addresses from `contracts/base.json`:

- **PaymentToken (USDC)**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **PlatformToken (CUT)**: `0x2163E7D874BDf8f81dDf470A57166202Ee0d0869`
- **Treasury**: `0x9Ba098Bcd17b3474E6dA824A43704b8baA8cC3b5`

## Testing

### Manual Testing

You can test the minting functionality directly:

```bash
# Test individual functions
npm run tsx src/services/mintUserTokens.ts mint-usdc 1000
npm run tsx src/services/mintUserTokens.ts approve 1000
npm run tsx src/services/mintUserTokens.ts deposit 1000
npm run tsx src/services/mintUserTokens.ts transfer 0x1234... 1000

# Test complete flow
npm run tsx src/services/mintUserTokens.ts complete 0x1234... 1000
```

### Automated Testing

Run the test suite:

```bash
npm test src/services/mintUserTokens.test.ts
```

## Token Details

### USDC (PaymentToken)

- **Symbol**: USDC(x)
- **Decimals**: 6
- **Purpose**: Stablecoin used for deposits and conversions

### CUT (PlatformToken)

- **Symbol**: CUT
- **Decimals**: 18
- **Purpose**: Platform token for contests and features

## Treasury Integration

The Treasury contract handles the USDC to CUT conversion:

1. User deposits USDC into Treasury
2. Treasury mints CUT tokens based on exchange rate
3. CUT tokens are minted to the depositor (oracle wallet)
4. Oracle wallet transfers CUT tokens to the new user

## Security Considerations

- Oracle private key must be securely stored
- Treasury contract handles the USDC to CUT conversion securely
- All transactions are signed by the oracle wallet
- User wallet addresses are validated before transfers
- Failed token operations don't prevent user registration

## Monitoring

- All transactions are logged with hashes for verification
- Failed operations are logged for debugging
- Transaction status can be verified on blockchain explorers
