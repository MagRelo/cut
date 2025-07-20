# User Token Minting

This document describes the automatic token minting feature that provides new users with 25 BTCUT tokens upon registration.

## Overview

When a new user registers through wallet authentication (SIWE or Web3), the system automatically mints 25 BTCUT tokens to their wallet address. This provides new users with initial tokens to participate in contests and use platform features.

## Implementation

### Service: `mintUserTokens.ts`

The core functionality is implemented in `src/services/mintUserTokens.ts`:

- **Function**: `mintUserTokens(userWalletAddress: string, amount: number = 25)`
- **Purpose**: Mints BTCUT tokens to a specified wallet address
- **Default Amount**: 25 BTCUT tokens
- **Token Contract**: Uses the PlatformToken contract deployed at `PLATFORM_TOKEN_ADDRESS`

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
- `PLATFORM_TOKEN_ADDRESS`: Address of the PlatformToken contract

## Testing

### Manual Testing

You can test the minting functionality directly:

```bash
# From the server.new directory
npm run tsx src/services/mintUserTokens.ts 0x1234567890123456789012345678901234567890 25
```

### Automated Testing

Run the test suite:

```bash
npm test src/services/mintUserTokens.test.ts
```

## Token Details

- **Token Name**: BTCUT (Bet the Cut Token)
- **Decimals**: 18 (standard ERC20)
- **Initial Amount**: 25 tokens per new user
- **Contract**: PlatformToken.sol (ERC20 with minting capability)

## Security Considerations

1. **Oracle Private Key**: The minting is performed by the oracle account, which must have minting permissions on the PlatformToken contract
2. **Address Validation**: Wallet addresses are validated before minting
3. **Transaction Confirmation**: All mint transactions wait for blockchain confirmation
4. **Error Isolation**: Minting failures don't affect user registration

## Monitoring

The system logs minting activities:

- Successful mints: `Minted 25 BTCUT tokens to new user: 0x...`
- Failed mints: `Failed to mint tokens to new user: [error]`

## Future Enhancements

Potential improvements:

1. **Configurable Amounts**: Allow different token amounts based on user type or referral
2. **Batch Minting**: Mint tokens for multiple users in a single transaction
3. **Gas Optimization**: Use gas-efficient minting strategies
4. **Analytics**: Track minting patterns and user engagement
