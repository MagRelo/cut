# Sepolia Scripts

This directory contains scripts for interacting with the deployed contracts on Base Sepolia testnet.

## Scripts

### `mintPaymentTokenAdvanced.js`

Mints PaymentToken (Mock USDC) to a specified address.

### `createEscrow.js`

Creates a new escrow using the EscrowFactory contract.

### `depositUSDC.js`

Deposits USDC into the TokenManager to receive CUT tokens.

## Environment Variables

Create a `.env` file in the `contracts` directory with the following variables:

### Required Variables

- `PRIVATE_KEY`: Your wallet's private key (without 0x prefix)
- `ORACLE_ADDRESS`: The address of the oracle for the escrow (must be approved) - **for createEscrow.js**

### Optional Variables

- `SEPOLIA_RPC_URL` or `BASE_SEPOLIA_RPC_URL`: RPC URL for Base Sepolia (defaults to "https://sepolia.base.org")
- `USE_LATEST_DEPLOYMENT`: Set to "true" to automatically use the latest deployment address
- `ESCROW_FACTORY_ADDRESS`: Manual EscrowFactory address (required if not using latest deployment)
- `ESCROW_NAME`: Name for the escrow (defaults to "Test Escrow") - **for createEscrow.js**
- `DEPOSIT_AMOUNT`: Deposit amount in wei (18 decimals, defaults to "1000000" = 1 CUT token) - **for createEscrow.js**
- `END_TIME`: Unix timestamp for escrow end time (defaults to 24 hours from now) - **for createEscrow.js**
- `USDC_AMOUNT`: Amount of USDC to deposit (6 decimals, defaults to "1000000" = 1 USDC) - **for depositUSDC.js**

## Usage

### Prerequisites

1. Deploy contracts using Foundry: `forge script script/Deploy_sepolia.s.sol --rpc-url <RPC_URL> --broadcast`
2. Install dependencies: `npm install` (in the scripts directory)
3. Set up environment variables

### Running the Scripts

```bash
# Navigate to the scripts directory
cd scripts/sepolia

# Create an escrow
node createEscrow.js

# Deposit USDC to get CUT tokens
node depositUSDC.js

# Mint payment tokens
node mintPaymentTokenAdvanced.js
```

## Example .env File

```env
PRIVATE_KEY=your_private_key_here
ORACLE_ADDRESS=0x1234567890123456789012345678901234567890
USE_LATEST_DEPLOYMENT=true
ESCROW_NAME="My Test Escrow"
DEPOSIT_AMOUNT=1000000000000000000
END_TIME=1704067200
USDC_AMOUNT=1000000
```

## Notes

- The oracle address must be approved in the EscrowFactory contract before creating an escrow
- The end time must be in the future
- The deposit amount must be greater than 0
- The script will automatically detect the latest deployment if `USE_LATEST_DEPLOYMENT=true`
- All amounts are in wei (18 decimals for CUT tokens, 6 decimals for USDC)
- For `depositUSDC.js`, you must have sufficient USDC balance before running the script
- The script will automatically approve USDC spending if needed
