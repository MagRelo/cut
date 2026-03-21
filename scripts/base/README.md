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

Emergency withdrawal script for the DepositManager contract on Base network. This withdraws all USDC held by the manager (including USDC supplied to Aave), regardless of token supply backing. **Use only in emergency situations.**

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
4. **Withdraws All USDC**: Withdraws from the contract’s holdings (including Aave position)
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
🏦 Aave USDC balance (via DepositManager): 5000.0 USDC
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
🏦 Aave USDC balance (via DepositManager) after: 0.0 USDC
🏦 Total available balance after: 0.0 USDC
🎯 Total CUT supply after: 5500.0 CUT

🎉 Successfully performed emergency withdrawal of 6000.0 USDC to 0x...
```

## checkPlatformTokenBalance.js

Checks PlatformToken (CUT) balances and displays comprehensive information about token distribution on Base network.

### Prerequisites

1. **Environment Variables**: Set up your `.env` file in the `contracts/` directory with:

   ```bash
   PRIVATE_KEY=your_private_key_here
   BASE_RPC_URL=https://mainnet.base.org  # or your preferred Base RPC
   USE_LATEST_DEPLOYMENT=true  # Use latest deployment addresses
   CHECK_ADDRESSES=0x...,0x...,0x...  # Optional: comma-separated list of addresses to check
   ```

   Or set specific contract addresses:

   ```bash
   PLATFORM_TOKEN_ADDRESS=0x...
   DEPOSIT_MANAGER_ADDRESS=0x...  # Optional: for additional info
   USDC_ADDRESS=0x833589fCD6eDb6E08f4c7c32D4f71b54bdA02913  # Base USDC
   ```

### Usage

```bash
cd scripts/base
node checkPlatformTokenBalance.js
```

### What the Script Shows

1. **Token Information**:

   - Token name, symbol, and decimals
   - Total supply
   - Contract address
   - Owner and DepositManager addresses

2. **Wallet Balance**:

   - Your connected wallet's CUT balance
   - Percentage of total supply

3. **Additional Addresses** (if provided):

   - Balances for specific addresses
   - Percentage of total supply for each

4. **DepositManager Information** (if available):

   - USDC in DepositManager contract
   - USDC supplied via Aave (as reported by DepositManager)
   - Total available USDC backing
   - Backing ratio (USDC backing vs CUT supply)

5. **Distribution Summary**:
   - DepositManager holdings
   - Your wallet holdings
   - Circulating supply

### Example Output

```
📋 Using addresses from latest deployment:
  DepositManager: 0x...
  USDC: 0x833589fcd6edb6e08f4c7c32d4f71b54bda02913
  PlatformToken: 0x...

🔗 Connected to network: base
👛 Wallet address: 0x...

================================================================================

📊 PLATFORM TOKEN INFORMATION
================================================================================
  Token Name: Cut Platform Token
  Token Symbol: CUT
  Decimals: 18
  Contract Address: 0x...
  Owner: 0x...
  DepositManager: 0x...
  🎯 Total Supply: 10000.0 CUT

💰 WALLET BALANCE
================================================================================
  Address: 0x...
  Balance: 100.5 CUT
  Percentage of Total Supply: 1.0050%

🏦 DEPOSIT MANAGER INFORMATION
================================================================================
  Address: 0x...
  💵 USDC in DepositManager: 5000.0 USDC
  💵 USDC in Aave (via DepositManager): 5000.0 USDC
  💵 Total Available USDC: 10000.0 USDC

  📊 Backing Ratio:
    10000.0 USDC backing 10000.0 CUT
    Ratio: 100.00%
    ✅ Fully backed!

📈 DISTRIBUTION SUMMARY
================================================================================
  DepositManager: 9500.0 CUT (95.00%)
  Your Wallet: 100.5 CUT (1.01%)

  🔄 Circulating Supply: 500.0 CUT (5.00%)

================================================================================
✅ Balance check completed successfully!
================================================================================
```

### Checking Multiple Addresses

To check balances for multiple addresses, set the `CHECK_ADDRESSES` environment variable:

```bash
CHECK_ADDRESSES=0xAddress1,0xAddress2,0xAddress3 node checkPlatformTokenBalance.js
```

### Use Cases

- **Portfolio Tracking**: Monitor your CUT token holdings
- **Distribution Analysis**: See how tokens are distributed
- **Backing Verification**: Verify USDC backing ratio
- **Multi-Address Monitoring**: Check balances for multiple wallets
- **Health Check**: Ensure the token system is properly backed

### Security Notes

- **Read-Only**: This script only reads data, no transactions are executed
- **No Gas Fees**: Since this only queries data, you don't need ETH for gas
- **Private Key**: Still required for wallet connection, but no transactions are signed

## cancelEscrow.js

Cancels an escrow contract and refunds all participants on Base network. This script is designed to handle emergency situations where an escrow needs to be cancelled and all deposits returned.

### Prerequisites

1. **Oracle Wallet**: You must be the oracle for the escrow contract
2. **Valid Escrow State**: Escrow must be in OPEN or IN_PROGRESS state
3. **Environment Variables**: Set up your `.env` file in the `contracts/` directory with:

   ```bash
   PRIVATE_KEY=your_private_key_here  # Must be the oracle's private key
   BASE_RPC_URL=https://mainnet.base.org  # or your preferred Base RPC
   ESCROW_ADDRESS=0x...  # The address of the escrow contract to cancel
   ```

### Usage

```bash
cd scripts/base
node cancelEscrow.js
```

### What the Script Does

1. **Connects to Base Network**: Uses your configured RPC URL
2. **Fetches Escrow Details**: Gets current state, participants, deposits, etc.
3. **Verifies Authorization**: Ensures you are the oracle for this escrow
4. **Checks State**: Verifies escrow is in a cancellable state (OPEN or IN_PROGRESS)
5. **Cancels and Refunds**: Calls cancelAndRefund() to refund all participants
6. **Shows Results**: Displays balances and transaction details

### Escrow States

- **OPEN**: Deposits are being accepted
- **IN_PROGRESS**: Deposits closed, waiting for distribution
- **SETTLED**: Payouts have been distributed (cannot cancel)
- **CANCELLED**: Escrow has been cancelled (cannot cancel again)

### Error Handling

The script includes comprehensive error handling for:

- **Not Oracle**: You're not authorized to cancel this escrow
- **Invalid State**: Escrow cannot be cancelled in current state (SETTLED or CANCELLED)
- **Network connection issues**
- **Transaction failures**
- **Contract interaction errors**

### Security Notes

⚠️ **WARNING: This action is irreversible**

- **Oracle Only**: Only the oracle can cancel the escrow
- **Refunds All**: This will refund ALL participants their full deposit balance
- **Cannot Undo**: Once cancelled, the escrow cannot be reopened
- **Gas Fees**: You'll need ETH for gas fees on Base network (scales with participant count)
- **Dynamic Gas**: Gas limit automatically adjusts based on number of participants

### Example Output

```
🔗 Connected to network: base
👛 Wallet address: 0x...
📋 Escrow address: 0x...

📊 Fetching escrow details...

🔍 Escrow Information:
  Current state: IN_PROGRESS
  Oracle address: 0x...
  Payment token: 0x833589fCD6eDb6E08f4c7c32D4f71b54bdA02913
  Total deposits: 10000.0
  Participants count: 50
  Deposit amount: 200.0
  Expiry: 12/31/2024, 11:59:59 PM
  Token symbol: USDC

✅ Wallet is authorized to cancel this escrow

💰 Escrow contract balance before: 10000.0 USDC

⚠️ IMPORTANT: This will cancel the escrow and refund all participants!
  Total amount to be refunded: 10000.0 USDC
  Number of participants to refund: 50

🚫 Cancelling escrow and refunding participants...
⏳ Sending transaction...
📝 Transaction hash: 0x...
⏳ Waiting for transaction confirmation...
✅ Transaction confirmed in block: 12345678
⛽ Gas used: 3500000

📊 Fetching updated escrow details...

📈 Results:
  New state: CANCELLED
  Total deposits after: 0.0 USDC
  Participants count after: 0
  Escrow contract balance after: 0.0 USDC

💸 Total refunded: 10000.0 USDC

🎉 Successfully cancelled escrow and refunded all 50 participants!

📋 Transaction events:
  - EscrowCancelled
```

### Troubleshooting

**Not Authorized**:

- Ensure you're using the oracle's private key
- Verify the ESCROW_ADDRESS is correct
- Check that you're connected to the correct network

**Invalid State**:

- Check the current escrow state
- Cannot cancel if already SETTLED or CANCELLED
- Wait for appropriate state if needed

**Transaction Failures**:

- Check your ETH balance for gas fees
- Verify escrow address is correct
- Ensure escrow has sufficient token balance for refunds

**Network Issues**:

- Try a different RPC URL
- Check your internet connection
- Verify the Base network is operational
