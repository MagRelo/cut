# Deployment Guide for Base Network

This guide explains how to deploy the Cut contracts to Base network using the different deployment scripts.

## Prerequisites

1. **Environment Setup**

   - Set your `PRIVATE_KEY` environment variable
   - Ensure you have sufficient ETH for gas fees
   - For production: Have real USDC tokens for testing

2. **Network Configuration**
   - Base Mainnet: Chain ID 8453
   - Base Sepolia: Chain ID 84532

## Deployment Scripts

### 1. Testnet Deployment (Base Sepolia)

Use this for testing before mainnet deployment:

```bash
# Deploy to Base Sepolia testnet
forge script script/DeployTestnet.s.sol:DeployTestnetScript --rpc-url https://sepolia.base.org --broadcast --verify
```

**Addresses Used:**

- USDC: `0x036CbD53842c5426634e7929541eC2318f3dCF7c`
- cUSDC: `0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf`

### 2. Production Deployment (Base Mainnet)

Use this for production deployment:

```bash
# Deploy to Base mainnet
forge script script/DeployProd.s.sol:DeployProdScript --rpc-url https://mainnet.base.org --broadcast --verify
```

**Addresses Used:**

- USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- cUSDC: `0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf`

### 3. Development Deployment (Local/Test)

Use the original script for development with mock contracts:

```bash
# Deploy with mock contracts (for development)
forge script script/Deploy.s.sol:DeployScript --rpc-url <your-rpc-url> --broadcast
```

## Key Differences

### Production vs Development

1. **Real vs Mock Contracts**

   - Production: Uses real USDC and Compound cUSDC
   - Development: Uses mock PaymentToken and MockCToken

2. **Token Addresses**

   - Production: Hardcoded addresses for Base network
   - Development: Deploys mock tokens during deployment

3. **Security Considerations**
   - Production: No minting of test tokens
   - Development: Mints 1B test USDC to mock contract

## Post-Deployment Steps

1. **Verify Contracts**

   - Check all contracts are deployed correctly
   - Verify token manager is set in PlatformToken
   - Confirm oracle is added to EscrowFactory

2. **Test Integration**

   - Test USDC deposits to Token Manager
   - Verify Compound integration works
   - Test platform token minting/burning

3. **Update Frontend**
   - Update contract addresses in frontend configuration
   - Test all user flows with real contracts

## Important Notes

- **Gas Fees**: Base network has lower gas fees than Ethereum mainnet
- **USDC Approval**: Users need to approve USDC spending for Token Manager
- **Compound Integration**: Token Manager automatically deposits USDC to Compound for yield
- **Oracle Management**: Only authorized oracles can settle contests

## Troubleshooting

1. **Insufficient Gas**: Ensure you have enough ETH for deployment
2. **Contract Verification**: Use `--verify` flag for Etherscan verification
3. **Address Verification**: Double-check all addresses are correct for your target network
4. **Environment Variables**: Ensure `PRIVATE_KEY` is set correctly

## Security Checklist

- [ ] Deploy to testnet first
- [ ] Test all contract interactions
- [ ] Verify contract addresses
- [ ] Test emergency functions
- [ ] Verify oracle permissions
- [ ] Test USDC deposits/withdrawals
- [ ] Verify Compound integration
