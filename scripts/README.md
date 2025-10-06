# Scripts

This directory contains scripts for the Cut project, including deployment and interaction scripts.

## Scripts Overview

### Deployment Script (`deploy.js`)

The deployment script automates the entire contract deployment process including:

1. **Environment Validation** - Checks for required environment variables
2. **Contract Deployment** - Deploys contracts using Foundry
3. **Contract Verification** - Verifies contracts on the blockchain explorer
4. **Configuration Updates** - Updates contract addresses in both client and server config files
5. **Artifact Copying** - Copies contract ABIs to the server directory

### Sepolia Interaction Scripts (`sepolia/`)

The sepolia directory contains scripts for interacting with deployed contracts on Base Sepolia testnet:

- `createEscrow.js` - Creates a new escrow using the EscrowFactory contract
- `depositUSDC.js` - Deposits USDC into the DepositManager to receive CUT tokens
- `mintPaymentToken.js` - Mints PaymentToken (Mock USDC) to a specified address

## Prerequisites

### Environment Variables

Copy `env.example` to `.env` in the project root and fill in your actual values:

```bash
cp env.example .env
```

Required variables in `.env`:

```bash
# Required for all deployments
PRIVATE_KEY=your_private_key_here
BASESCAN_API_KEY=your_basescan_api_key_here

# For Sepolia deployment
BASE_SEPOLIA_RPC_URL=your_sepolia_rpc_url_here

# For Base mainnet deployment
BASE_RPC_URL=your_base_rpc_url_here
```

### Dependencies

- Node.js 18+
- Foundry (forge, cast)
- Sufficient funds in the deployment wallet

## Usage

### Available Scripts

```bash
# Deploy to Sepolia (default)
npm run deploy:contracts

# Deploy to Sepolia explicitly
npm run deploy:contracts:sepolia

# Deploy to Base mainnet
npm run deploy:contracts:base

# Deploy contracts and then deploy the full application
npm run deploy:full

# Run the script directly
node scripts/deploy.js [network]

# Run sepolia interaction scripts
cd scripts
npm run mint                    # Mint payment tokens
npm run create-escrow          # Create an escrow
npm run deposit-usdc           # Deposit USDC to get CUT tokens
```

### Network Options

- `sepolia` - Base Sepolia testnet (default)
- `base` - Base mainnet

## What Gets Deployed

### Sepolia Deployment

- MockUSDC (payment token)
- MockCompound (compound protocol mock)
- PlatformToken (platform token)
- DepositManager (deposit management)
- EscrowFactory (escrow factory)

### Base Mainnet Deployment

- PlatformToken (platform token)
- DepositManager (deposit management)
- Uses real USDC and Compound addresses

## Configuration Files Updated

The script automatically updates the following configuration files:

### Client Configuration

- `client/src/utils/contracts/sepolia.json`
- `client/src/utils/contracts/base.json`

### Server Configuration

- `server/src/contracts/sepolia.json`
- `server/src/contracts/base.json`
- `server/src/contracts/DepositManager.json`
- `server/src/contracts/EscrowFactory.json`
- `server/src/contracts/Escrow.json`
- `server/src/contracts/PlatformToken.json`
- `server/src/contracts/MockUSDC.json`
- `server/src/contracts/MockCompound.json`

## Output

The script provides colored console output with:

- ✅ Success messages (green)
- ❌ Error messages (red)
- ⚠️ Warning messages (yellow)
- ℹ️ Info messages (cyan)

## Example Output

```
🚀 Starting deployment to base_sepolia

=== Checking environment variables ===
✅ Environment variables check passed

=== Deploying contracts to base_sepolia ===
ℹ️ Running: forge script script/Deploy_sepolia.s.sol --rpc-url https://sepolia.base.org --broadcast --verify
✅ Deployed 5 contracts
ℹ️ Deployed addresses:
  MockUSDC: 0x7150669d6aD21be53D2d71c09138D46381b90b5b
  MockCompound: 0xdA8DAd6ac5CC5fD9b4f2D53B1bE04986f7e4F430
  PlatformToken: 0x772c846Ac2BC1CF0733331e76912d90479c0481d
  DepositManager: 0x14138DC74022AE1290132cd4945381e94aCE2A88
  EscrowFactory: 0x45DA62D53170e4d9DAE329FA31531ADaa312662b

=== Updating configuration files for base_sepolia ===
✅ Updated client config: /path/to/client/src/utils/contracts/sepolia.json
✅ Updated server config: /path/to/server/src/contracts/sepolia.json

=== Copying contract artifacts to server ===
✅ Copied DepositManager.json
✅ Copied EscrowFactory.json
✅ Copied Escrow.json
✅ Copied PlatformToken.json
✅ Copied MockUSDC.json
✅ Copied MockCompound.json
✅ Copied 6 contract artifacts to server

=== Verifying contracts on https://sepolia.basescan.org ===
ℹ️ Verifying MockUSDC at 0x7150669d6aD21be53D2d71c09138D46381b90b5b
✅ Verified MockUSDC
...

=== Deployment Summary ===
✅ Successfully deployed to base_sepolia
ℹ️ Chain ID: 84532
ℹ️ Explorer: https://sepolia.basescan.org
ℹ️ Contract addresses:
  paymentTokenAddress: 0x7150669d6aD21be53D2d71c09138D46381b90b5b
  platformTokenAddress: 0x772c846Ac2BC1CF0733331e76912d90479c0481d
  depositManagerAddress: 0x14138DC74022AE1290132cd4945381e94aCE2A88
  escrowFactoryAddress: 0x45DA62D53170e4d9DAE329FA31531ADaa312662b
  mockCTokenAddress: 0xdA8DAd6ac5CC5fD9b4f2D53B1bE04986f7e4F430

🎉 Deployment completed successfully!
```

## Troubleshooting

### Common Issues

1. **Missing Environment Variables**

   - Ensure all required environment variables are set
   - Check that the `.env` file is in the project root

2. **Insufficient Funds**

   - Ensure the deployment wallet has sufficient ETH for gas fees
   - For mainnet, ensure you have enough ETH for deployment costs

3. **RPC URL Issues**

   - Verify your RPC URLs are correct and accessible
   - Check that your RPC provider is working

4. **Verification Failures**

   - Verification failures are logged as warnings and don't stop deployment
   - Check the explorer manually if verification fails

5. **Permission Denied**
   - Ensure the script is executable: `chmod +x scripts/deploy.js`

### Getting Help

If you encounter issues:

1. Check the console output for specific error messages
2. Verify all environment variables are set correctly
3. Ensure you have sufficient funds in your deployment wallet
4. Check that Foundry is properly installed and configured

## Security Notes

- Never commit your `.env` file to version control
- Keep your private key secure and never share it
- Use a dedicated deployment wallet, not your main wallet
- Test deployments on Sepolia before deploying to mainnet
