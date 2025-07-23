#!/bin/bash

# Contract verification script for Base Sepolia
# Make sure you have BASESCAN_API_KEY set in your environment

echo "Verifying contracts on Base Sepolia..."

# Verify PaymentToken
echo "Verifying PaymentToken..."
forge verify-contract \
    0x069d435bCb929d54A8A4C7973Fe7f66733726599 \
    src/PaymentToken.sol:PaymentToken \
    --chain base-sepolia \
    --etherscan-api-key $BASESCAN_API_KEY

# Verify PlatformToken
echo "Verifying PlatformToken..."
forge verify-contract \
    0x1A213BD5CB7ABa03D21e385E38a1BAd36B0C8b65 \
    src/PlatformToken.sol:PlatformToken \
    --chain base-sepolia \
    --etherscan-api-key $BASESCAN_API_KEY

# Verify Treasury
echo "Verifying Treasury..."
forge verify-contract \
    0x49b10152Ef893D405189b274E2064C63B2EF8C23 \
    src/Treasury.sol:Treasury \
    --chain base-sepolia \
    --etherscan-api-key $BASESCAN_API_KEY

# Verify EscrowFactory
echo "Verifying EscrowFactory..."
forge verify-contract \
    0x98A926Dc63982A21030ff84d8c67F1DC865D8c1a \
    src/EscrowFactory.sol:EscrowFactory \
    --chain base-sepolia \
    --etherscan-api-key $BASESCAN_API_KEY

# Verify MockCToken
echo "Verifying MockCToken..."
forge verify-contract \
    0x326DC41e6E1eE524D515940a2d655Fe0D5103A0a \
    src/MockCToken.sol:MockCToken \
    --chain base-sepolia \
    --etherscan-api-key $BASESCAN_API_KEY

echo "Verification complete!" 