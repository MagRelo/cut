# PaymentToken Minting Scripts

This directory contains scripts to mint PaymentTokens (USDC simulation) to a specified address on the Sepolia network.

## Scripts

### 1. `mintPaymentToken.js` - Basic Script

A simple script that requires you to manually specify the PaymentToken contract address.

### 2. `mintPaymentTokenAdvanced.js` - Advanced Script

An enhanced script that can automatically read the PaymentToken address from the latest deployment artifacts.

## Prerequisites

1. Make sure you have the required dependencies installed:

   ```bash
   cd contracts/scripts
   npm install
   ```

2. Set up your environment variables in a `.env` file in the `contracts` directory:

## Environment Variables

Create a `.env` file with the following variables:

```env
# Your private key (must be the owner of the PaymentToken contract)
PRIVATE_KEY=your_private_key_here

# Sepolia RPC URL (defaults to Base Sepolia)
SEPOLIA_RPC_URL=https://sepolia.base.org

# The address to mint tokens to (currently empty in your .env file)
RECIPIENT_ADDRESS=0x...

# Amount to mint (in wei, 6 decimals for USDC simulation)
# Default: 1000000 (1 USDC)
AMOUNT=1000000

# For basic script only - The deployed PaymentToken contract address
PAYMENT_TOKEN_ADDRESS=0x...

# For advanced script only - Set to 'true' to use latest deployment
USE_LATEST_DEPLOYMENT=false
```

## Usage

### Basic Script

Run the basic script from the `contracts/scripts` directory:

```bash
node sepolia/mintPaymentToken.js
```

### Advanced Script

Run the advanced script from the `contracts/scripts` directory:

```bash
node sepolia/mintPaymentTokenAdvanced.js
```

The advanced script will automatically find the PaymentToken address from your latest deployment if `USE_LATEST_DEPLOYMENT=true` is set in your `.env` file.

## Examples

### Basic Script Example

```bash
# Set environment variables
export PRIVATE_KEY="0x1234567890abcdef..."
export PAYMENT_TOKEN_ADDRESS="0xabcdef1234567890..."
export RECIPIENT_ADDRESS="0x9876543210fedcba..."
export AMOUNT="5000000"  # 5 USDC

# Run the basic script
node sepolia/mintPaymentToken.js
```

### Advanced Script Example

```bash
# Set environment variables
export PRIVATE_KEY="0x1234567890abcdef..."
export RECIPIENT_ADDRESS="0x9876543210fedcba..."
export AMOUNT="5000000"  # 5 USDC
export USE_LATEST_DEPLOYMENT="true"

# Run the advanced script
node sepolia/mintPaymentTokenAdvanced.js
```

## Output

Both scripts will output:

- Network connection details
- Wallet and contract addresses
- Transaction hash
- Confirmation details
- Success/error messages

The advanced script also shows:

- Current and new balance of the recipient
- Formatted token amounts with proper decimals

## Notes

- Both scripts validate that your wallet is the owner of the PaymentToken contract
- PaymentToken uses 6 decimals (like real USDC)
- Only the contract owner can mint tokens
- Both scripts include error handling and address validation
- The advanced script requires deployment artifacts to be present in the `broadcast` directory
