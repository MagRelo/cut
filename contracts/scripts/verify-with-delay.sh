#!/bin/bash

# Contract verification script with delays to avoid rate limiting
# Make sure you have BASESCAN_API_KEY set in your environment

echo "Verifying contracts on Base Sepolia with delays..."

# Wait function
wait_between_requests() {
    echo "Waiting 5 seconds before next request..."
    sleep 5
}

# Verify MockCToken first (simplest)
echo "Verifying MockCToken..."
source .env && forge verify-contract 0x326DC41e6E1eE524D515940a2d655Fe0D5103A0a test/MockCompound.sol:MockCToken --chain base-sepolia --etherscan-api-key $BASESCAN_API_KEY --constructor-args 0x000000000000000000000000069d435bcb929d54a8a4c7973fe7f66733726599

wait_between_requests

# Verify Treasury
echo "Verifying Treasury..."
source .env && forge verify-contract 0x49b10152Ef893D405189b274E2064C63B2EF8C23 src/Treasury.sol:Treasury --chain base-sepolia --etherscan-api-key $BASESCAN_API_KEY --constructor-args 0x000000000000000000000000069d435bcb929d54a8a4c7973fe7f667337265990000000000000000000000001a213bd5cb7aba03d21e385e38a1bad36b0c8b65000000000000000000000000326dc41e6e1ee524d515940a2d655fe0d5103a0a

wait_between_requests

# Verify EscrowFactory
echo "Verifying EscrowFactory..."
source .env && forge verify-contract 0x98A926Dc63982A21030ff84d8c67F1DC865D8c1a src/EscrowFactory.sol:EscrowFactory --chain base-sepolia --etherscan-api-key $BASESCAN_API_KEY --constructor-args 0x000000000000000000000000069d435bcb929d54a8a4c7973fe7f6673372659900000000000000000000000049b10152ef893d405189b274e2064c63b2ef8c23

echo "Verification requests submitted with delays. Check the URLs above for status." 