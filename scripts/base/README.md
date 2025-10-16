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

## emergencyWithdrawAll.js

Emergency withdrawal script for the DepositManager contract on Base network. This withdraws all USDC from both the contract and Compound V3, regardless of token supply backing. **Use only in emergency situations.**

### Prerequisites

1. **Contract Owner**: You must be the owner of the DepositManager contract
2. **Environment Variables**: Set up your `.env` file in the `contracts/` directory with:

   ```bash
   PRIVATE_KEY=your_private_key_here  # Must be the contract owner's key
   BASE_RPC_URL=https://mainnet.base.org  # or your preferred Base RPC
   USE_LATEST_DEPLOYMENT=true  # Use latest deployment addresses
   RECIPIENT_ADDRESS=0x...  # Optional: address to receive funds (defaults to wallet address)
   ```

   Or set specific contract addresses:

   ```bash
   DEPOSIT_MANAGER_ADDRESS=0x...
   USDC_ADDRESS=0x833589fCD6eDb6E08f4c7c32D4f71b54bdA02913  # Base USDC
   PLATFORM_TOKEN_ADDRESS=0x...
   ```

### Usage

```bash
cd scripts
npm run emergency-withdraw-base
```

Or directly:

```bash
cd scripts/base
node emergencyWithdrawAll.js
```

### What the Script Does

1. **Connects to Base Network**: Uses your configured RPC URL
2. **Verifies Ownership**: Only the contract owner can execute this function
3. **Checks Balances**: Shows total available USDC before withdrawal
4. **Withdraws All USDC**: Withdraws from both contract and Compound V3
5. **Transfers to Recipient**: Sends all USDC to the specified recipient address
6. **Shows Results**: Displays balances before and after

### Security Notes

⚠️ **WARNING: This is an emergency function**

- **Owner Only**: Only the contract owner can call this function
- **Withdraws Everything**: This will withdraw ALL USDC, regardless of CUT token backing
- **Breaking Change**: After this, CUT tokens may not be fully backed by USDC
- **Use Carefully**: This should only be used in emergency situations (e.g., security incidents, contract upgrades)
- **Gas Fees**: You'll need ETH for gas fees on Base network

### Error Handling

The script includes error handling for:

- **OwnableUnauthorizedAccount**: You're not the contract owner
- **No funds available**: Contract has no USDC to withdraw
- **Network connection issues**
- **Transaction failures**

### Example Output

```
🔗 Connected to network: base
👛 Wallet address: 0x...
📬 Recipient address: 0x...

📊 Pre-withdrawal status:
🏦 DepositManager USDC balance: 1000.0 USDC
🏦 Compound USDC balance: 5000.0 USDC
🏦 Total available balance: 6000.0 USDC
🎯 Total CUT supply: 5500.0 CUT
💳 Recipient USDC balance before: 100.0 USDC

🚨 Executing emergency withdrawal...
📝 Emergency withdrawal transaction hash: 0x...
✅ Withdrawal confirmed in block: 12345678
⛽ Gas used: 250000

📈 Results:
💰 USDC withdrawn: 6000.0 USDC
💳 Recipient USDC balance after: 6100.0 USDC
🏦 DepositManager USDC balance after: 0.0 USDC
🏦 Compound USDC balance after: 0.0 USDC
🏦 Total available balance after: 0.0 USDC
🎯 Total CUT supply after: 5500.0 CUT

🎉 Successfully performed emergency withdrawal of 6000.0 USDC to 0x...
```
