# Base Network Scripts

This directory contains scripts for interacting with contracts deployed on the Base network.

## depositUSDC.js

Deposits real USDC tokens into the DepositManager contract on Base network and receives CUT platform tokens in return.

### Prerequisites

1. **Real USDC Balance**: You must have USDC tokens in your wallet. You can acquire USDC by:

   - Bridging from other networks (Ethereum, etc.)
   - Using DEXs like Uniswap, SushiSwap, etc.
   - Purchasing from centralized exchanges

2. **Environment Variables**: Set up your `.env` file in the `contracts/` directory with:

   ```bash
   PRIVATE_KEY=your_private_key_here
   BASE_RPC_URL=https://mainnet.base.org  # or your preferred Base RPC
   USDC_AMOUNT=1000000  # Amount in USDC (6 decimals), default: 1 USDC
   USE_LATEST_DEPLOYMENT=true  # Use latest deployment addresses
   ```

   Or set specific contract addresses:

   ```bash
   DEPOSIT_MANAGER_ADDRESS=0x...
   USDC_ADDRESS=0x833589fCD6eDb6E08f4c7c32D4f71b54bdA02913  # Base USDC
   PLATFORM_TOKEN_ADDRESS=0x...
   ```

### Usage

```bash
cd scripts/base
node depositUSDC.js
```

### Key Differences from Sepolia Version

1. **Real USDC**: Uses the official USDC contract on Base (`0x833589fCD6eDb6E08f4c7c32D4f71b54bdA02913`)
2. **No Minting**: Cannot mint USDC tokens - you must acquire them through normal means
3. **Base Network**: Connects to Base mainnet instead of Sepolia testnet
4. **Deployment Path**: Uses `Deploy_base.s.sol` deployment files

### What the Script Does

1. **Connects to Base Network**: Uses your configured RPC URL
2. **Checks USDC Balance**: Verifies you have sufficient USDC
3. **Approves Spending**: Approves the DepositManager to spend your USDC
4. **Deposits USDC**: Calls the deposit function on DepositManager
5. **Receives CUT**: Gets CUT platform tokens in return
6. **Shows Results**: Displays balances and transaction details

### Error Handling

The script includes comprehensive error handling for:

- Insufficient USDC balance
- Network connection issues
- Transaction failures
- Contract interaction errors

### Security Notes

- **Real Money**: This script uses real USDC on Base mainnet
- **Private Key**: Keep your private key secure and never commit it to version control
- **Test First**: Consider testing with small amounts first
- **Gas Fees**: You'll need ETH for gas fees on Base network

### Troubleshooting

**Insufficient USDC Balance**:

- Acquire USDC from a DEX or bridge
- Check your wallet balance
- Ensure you have enough for the deposit amount

**Transaction Failures**:

- Check your ETH balance for gas fees
- Verify contract addresses are correct
- Ensure the DepositManager contract is deployed and functional

**Network Issues**:

- Try a different RPC URL
- Check your internet connection
- Verify the Base network is operational
