#!/bin/bash

# Mint Payment Tokens using .env configuration
# This script reads all configuration from .env files

set -e  # Exit on any error

echo "🪙 Minting Payment Tokens with Environment Configuration"
echo "======================================================"

# Check if .env file exists
if [ ! -f ".env" ] && [ ! -f "../.env" ]; then
    echo "❌ No .env file found!"
    echo ""
    echo "Please create a .env file in one of these locations:"
    echo "  - contracts/.env"
    echo "  - project-root/.env"
    echo ""
    echo "You can copy .env.example and fill in your values:"
    echo "  cp .env.example .env"
    echo ""
    exit 1
fi

# Check required environment variables
missing_vars=()

if [ -z "$ORACLE_PRIVATE_KEY" ]; then
    missing_vars+=("ORACLE_PRIVATE_KEY")
fi

if [ -z "$RECIPIENT_ADDRESS" ]; then
    missing_vars+=("RECIPIENT_ADDRESS")
fi

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo "❌ Missing required environment variables:"
    printf '  - %s\n' "${missing_vars[@]}"
    echo ""
    echo "Please set these variables in your .env file."
    exit 1
fi

# Display configuration
echo "Configuration loaded:"
echo "  Network: ${NETWORK:-sepolia}"
echo "  Recipient: $RECIPIENT_ADDRESS"
echo "  Amount: ${AMOUNT:-1000000000} raw units"
echo "  Use latest deployment: ${USE_LATEST_DEPLOYMENT:-false}"
echo ""

# Confirm before proceeding
read -p "Proceed with minting? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled by user"
    exit 1
fi

echo "🚀 Starting mint process..."
echo ""

# Run the minting script
npm run mint

echo ""
echo "✅ Minting process completed!"
