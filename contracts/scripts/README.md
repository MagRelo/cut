# Cut Contracts Testing Scripts

This directory contains scripts for testing the Cut contracts functionality.

## Treasury Deposit Test Script

The `test-treasury-deposit.js` script tests the CUT to USDC conversion by:

1. **Buying USDC with ETH** using Uniswap V3 on Base network
2. **Approving the Treasury** to spend the USDC
3. **Depositing USDC** into the Treasury contract
4. **Receiving CUT tokens** based on the current exchange rate

### Prerequisites

1. **Environment Variables** (create a `.env` file in the contracts directory):

   ```
   PRIVATE_KEY=your_deployer_private_key_here
   RPC_URL=https://mainnet.base.org
   TREASURY_ADDRESS=your_treasury_contract_address_here
   ```

2. **Install Dependencies**:

   ```bash
   cd contracts/scripts
   npm install
   ```

3. **Ensure you have ETH** in your wallet for:
   - Gas fees for transactions
   - ETH to swap for USDC (0.01 ETH by default)

### Usage

```bash
# Run the treasury deposit test
npm run test-treasury

# Or run directly
node test-treasury-deposit.js
```

### What the Script Does

1. **Initial Balance Check**: Shows your current ETH, USDC, and CUT token balances
2. **ETH to USDC Swap**: Swaps 0.01 ETH for USDC using Uniswap V3
3. **Treasury Approval**: Approves the Treasury contract to spend your USDC
4. **USDC Deposit**: Deposits all USDC into the Treasury
5. **CUT Token Minting**: Treasury mints CUT tokens based on the exchange rate
6. **Final Balance Check**: Shows final balances and the effective exchange rate

### Expected Output

```
=== Treasury Deposit Test ===
Network: https://mainnet.base.org
Wallet: 0x...
Treasury: 0x...
USDC: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
Platform Token: 0x1699Eb97Dcf31B0ad2A964028e00C7CEB92B453B

=== Initial Balances ===
ETH: 1.234567890123456789
USDC: 0.000000
Platform Tokens: 0.000000000000000000

=== Step 1: Buying USDC with ETH ===
Swapping ETH for USDC...
ETH Amount: 0.01
Minimum USDC Output: 14.85
Swap transaction hash: 0x...
Swap completed!
USDC after swap: 15.123456

=== Step 2: Approving Treasury to spend USDC ===
Approve transaction hash: 0x...
Approval completed!

=== Step 3: Depositing USDC into Treasury ===
Depositing USDC amount: 15.123456
Deposit transaction hash: 0x...
Deposit completed!

=== Step 4: Checking Results ===
Final ETH Balance: 1.224567890123456789
Final USDC Balance: 0.000000
Final Platform Token Balance: 15.123456000000000000
Exchange Rate: 1.000000000000000000
Treasury USDC Balance: 15.123456

=== Summary ===
USDC Deposited: 15.123456
Platform Tokens Received: 15.123456000000000000
Effective Exchange Rate: 15.123456 USDC = 15.123456000000000000 CUT

✅ Treasury deposit test completed successfully!
```

### Configuration

You can modify the script to change:

- **ETH amount to swap**: Change `ethAmountToSwap` (default: 0.01 ETH)
- **Slippage tolerance**: Modify the calculation for `minUsdcOutput`
- **Network**: Change `RPC_URL` for different networks (testnet vs mainnet)

### Troubleshooting

1. **Insufficient ETH**: Ensure you have enough ETH for gas fees + swap amount
2. **Slippage errors**: Increase the slippage tolerance or reduce the swap amount
3. **Treasury not found**: Verify the `TREASURY_ADDRESS` is correct
4. **Network issues**: Check your RPC URL and network connectivity

### Other Scripts

- `mint-tokens.js`: Mint CUT tokens to an address
- `mint-payment-tokens.js`: Mint USDC tokens (for testnet only)
