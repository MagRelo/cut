# Payment Token Minting Script

This script allows you to mint payment tokens (USDC) using the PaymentToken contract and the Oracle private key.

## Overview

The script can mint payment tokens on different networks:

- **Sepolia (Base Sepolia)**: For testing with deployed mock PaymentToken contracts
- **Development**: For local testing environments
- **Base**: Production network (⚠️ Note: Cannot mint real USDC tokens)

## Prerequisites

1. **Node.js Environment**: Ensure you have Node.js installed and dependencies are installed
2. **Oracle Private Key**: The private key of the account that owns the PaymentToken contract
3. **Network Access**: Access to the appropriate RPC endpoints

## Installation

Navigate to the scripts directory and install dependencies:

```bash
cd contracts/scripts
npm install
```

## Usage

### Basic Usage

#### Method 1: Using .env file (Recommended)

```bash
# 1. Copy the example environment file
cp .env.example .env

# 2. Edit .env with your values
# Set ORACLE_PRIVATE_KEY and RECIPIENT_ADDRESS

# 3. Run with environment configuration
npm run mint:env
```

#### Method 2: Using inline environment variables

```bash
# Set environment variables and run
ORACLE_PRIVATE_KEY=0x... RECIPIENT_ADDRESS=0x... npm run mint
```

### Environment Variables

| Variable                | Description                                       | Required | Default                |
| ----------------------- | ------------------------------------------------- | -------- | ---------------------- |
| `ORACLE_PRIVATE_KEY`    | Private key of the PaymentToken contract owner    | ✅ Yes   | -                      |
| `RECIPIENT_ADDRESS`     | Address to receive the minted tokens              | ✅ Yes   | -                      |
| `AMOUNT`                | Amount to mint in raw units (6 decimals for USDC) | No       | 1000000000 (1000 USDC) |
| `NETWORK`               | Target network: 'sepolia', 'development', 'base'  | No       | sepolia                |
| `USE_LATEST_DEPLOYMENT` | Use latest deployment address for sepolia         | No       | false                  |

### Network Configuration

#### Sepolia (Recommended for Testing)

```bash
ORACLE_PRIVATE_KEY=0x... \
RECIPIENT_ADDRESS=0x742d35Cc6634C0532925a3b8D4021F8b8D4021F8 \
NETWORK=sepolia \
npm run mint
```

#### Using Latest Deployment (Sepolia)

```bash
ORACLE_PRIVATE_KEY=0x... \
RECIPIENT_ADDRESS=0x742d35Cc6634C0532925a3b8D4021F8b8D4021F8 \
NETWORK=sepolia \
USE_LATEST_DEPLOYMENT=true \
npm run mint
```

#### Custom Amount

```bash
# Mint 500 USDC (500 * 10^6 = 500000000)
ORACLE_PRIVATE_KEY=0x... \
RECIPIENT_ADDRESS=0x742d35Cc6634C0532925a3b8D4021F8b8D4021F8 \
AMOUNT=500000000 \
npm run mint
```

#### Development/Local Network

```bash
ORACLE_PRIVATE_KEY=0x... \
RECIPIENT_ADDRESS=0x742d35Cc6634C0532925a3b8D4021F8b8D4021F8 \
NETWORK=development \
PAYMENT_TOKEN_ADDRESS_DEV=0x... \
DEV_RPC_URL=http://localhost:8545 \
npm run mint
```

### Available Commands

```bash
# Mint tokens using .env file (recommended)
npm run mint:env

# Mint tokens with inline environment variables
npm run mint

# Show help and usage information
npm run mint:help
```

## Contract Addresses

The script uses different contract addresses based on the network:

- **Base Sepolia**: Uses deployed PaymentToken contract address or latest deployment
- **Base Mainnet**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` (Real USDC - cannot mint)
- **Development**: Configurable via environment variables

## Token Decimals

Payment tokens use 6 decimals (like USDC):

- 1 USDC = 1,000,000 raw units
- 1000 USDC = 1,000,000,000 raw units

## Example Output

```
🪙 Payment Token Minting Script
================================

🔗 Network: sepolia
🌐 RPC URL: https://sepolia.base.org
👛 Oracle wallet address: 0x1804c8AB1F12E6bbf3894d4083f33e07309d1f38
🎯 PaymentToken address: 0x742d35Cc6634C0532925a3b8D4021F8b8D4021F8
📤 Recipient address: 0x742d35Cc6634C0532925a3b8D4021F8b8D4021F8
💰 Amount to mint: 1000000000 tokens (raw amount)
🔗 Connected to network: base-sepolia chainId: 84532
🏷️  Token info: USD Coin(x) (USDC(x)) - 6 decimals
💰 Amount to mint: 1000.0 USDC(x)
👑 Contract owner: 0x1804c8AB1F12E6bbf3894d4083f33e07309d1f38
💳 Current balance of recipient: 0.0 USDC(x)
⛽ Oracle wallet ETH balance: 0.1 ETH

🪙 Minting tokens...
📝 Transaction hash: 0x...
⏳ Waiting for transaction confirmation...
✅ Transaction confirmed in block: 12345
⛽ Gas used: 54321
💳 New balance of recipient: 1000.0 USDC(x)

🎉 Successfully minted 1000.0 USDC(x) to 0x742d35Cc6634C0532925a3b8D4021F8b8D4021F8
🔗 Transaction: https://sepolia.basescan.org/tx/0x...
```

## Troubleshooting

### Common Issues

1. **"Oracle wallet is not the owner"**

   - Verify the `ORACLE_PRIVATE_KEY` corresponds to the contract owner
   - For testnet: Make sure you deployed your own PaymentToken contract
   - For mainnet: You cannot mint real USDC tokens

2. **"Network connection issues"**

   - Check your RPC URL is correct
   - Ensure network connectivity
   - Try a different RPC endpoint

3. **"Low ETH balance for gas fees"**

   - Ensure the Oracle wallet has sufficient ETH for transaction gas

4. **"Invalid address"**
   - Verify the `RECIPIENT_ADDRESS` is a valid Ethereum address
   - Check that the `PAYMENT_TOKEN_ADDRESS` is valid

### Environment File Setup

Create a `.env` file using the provided example:

```bash
# Copy the example file
cp .env.example .env

# Edit with your values
# .env
ORACLE_PRIVATE_KEY=0x1234567890abcdef...
RECIPIENT_ADDRESS=0x742d35Cc6634C0532925a3b8D4021F8b8D4021F8
AMOUNT=1000000000
NETWORK=sepolia
USE_LATEST_DEPLOYMENT=false
```

The script will automatically look for `.env` files in these locations:

- `contracts/.env`
- `contracts/scripts/.env`
- Project root `.env`

## Security Notes

1. **Never commit private keys to version control**
2. **Use environment variables or secure key management**
3. **Test on testnets before mainnet operations**
4. **Verify recipient addresses before minting**

## Related Files

- `mintPaymentToken.js` - Main minting script
- `mintPaymentTokenAdvanced.js` - Sepolia-specific advanced script
- `package.json` - Dependencies and scripts
- `../src/PaymentToken.sol` - PaymentToken contract source
