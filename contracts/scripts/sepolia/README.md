# PaymentToken Minting Scripts

This directory contains scripts to mint PaymentTokens (USDC simulation) to a specified address on the Sepolia network and add yield to mock cTokens.

## Scripts

### 1. `mintPaymentToken.js` - Basic Script

A simple script that requires you to manually specify the PaymentToken contract address.

### 2. `mintPaymentTokenAdvanced.js` - Advanced Script

An enhanced script that can automatically read the PaymentToken address from the latest deployment artifacts.

### 3. `addYield.js` - Yield Simulation Script

A script to add yield to the mock cUESC token for testing purposes. This simulates yield generation by calling the `addYield()` function on the MockCToken contract.

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

# For addYield script - Amount of yield to add (in wei, 6 decimals for USDC)
# Default: 1000000 (1 USDC)
YIELD_AMOUNT=1000000

# For addYield script only - The deployed MockCToken contract address
MOCK_CTOKEN_ADDRESS=0x...
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

### Yield Simulation Script

Run the yield simulation script from the `contracts/scripts` directory:

```bash
node sepolia/addYield.js
```

The script will automatically find the MockCToken address from your latest deployment if `USE_LATEST_DEPLOYMENT=true` is set in your `.env` file.

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

### Yield Simulation Example

```bash
# Set environment variables
export PRIVATE_KEY="0x1234567890abcdef..."
export MOCK_CTOKEN_ADDRESS="0xabcdef1234567890..."
export YIELD_AMOUNT="5000000"  # 5 USDC worth of yield
export USE_LATEST_DEPLOYMENT="true"

# Run the yield simulation script
node sepolia/addYield.js
```

## Output

All scripts will output:

- Network connection details
- Wallet and contract addresses
- Transaction hash
- Confirmation details
- Success/error messages

The advanced script also shows:

- Current and new balance of the recipient
- Formatted token amounts with proper decimals

The yield simulation script shows:

- Current and new cToken balance, total supply, and exchange rate
- Underlying balance changes
- Detailed yield impact on the mock cToken

## Notes

- Both minting scripts validate that your wallet is the owner of the PaymentToken contract
- PaymentToken uses 6 decimals (like real USDC)
- Only the contract owner can mint tokens
- All scripts include error handling and address validation
- The advanced script and yield simulation script require deployment artifacts to be present in the `broadcast` directory
- The yield simulation script can be called by anyone (no owner restriction) and simulates yield by updating the exchange rate and minting additional cTokens
