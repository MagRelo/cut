#!/bin/bash

# Example script to mint payment tokens using environment variables
# This demonstrates both inline environment variables and .env file usage

echo "🪙 Minting Payment Tokens - Example Script"
echo "=========================================="

echo "Method 1: Using inline environment variables"
echo "============================================="

# Set your environment variables here (inline method)
export ORACLE_PRIVATE_KEY="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"  # Replace with your actual private key
export RECIPIENT_ADDRESS="0x742d35Cc6634C0532925a3b8D4021F8b8D4021F8"  # Replace with recipient address
export AMOUNT="1000000000"  # 1000 USDC (6 decimals)
export NETWORK="sepolia"    # sepolia, development, or base
export USE_LATEST_DEPLOYMENT="false"  # true to use latest deployment

echo "Configuration:"
echo "  Network: $NETWORK"
echo "  Recipient: $RECIPIENT_ADDRESS"
echo "  Amount: $AMOUNT raw units"
echo ""

echo "Running with inline variables..."
npm run mint

echo ""
echo "Method 2: Using .env file (Recommended)"
echo "======================================="
echo "1. Copy .env.example to .env:"
echo "   cp .env.example .env"
echo ""
echo "2. Edit .env with your values"
echo ""
echo "3. Run with .env:"
echo "   npm run mint:env"
echo ""
echo "✅ Example completed!"
