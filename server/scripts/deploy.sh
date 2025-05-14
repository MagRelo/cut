#!/bin/bash

# Exit on error
set -e

echo "Starting build process..."

# Generate unique tag using git commit SHA and timestamp
TAG=$(git rev-parse --short HEAD)-$(date +%Y%m%d%H%M)
echo "Building with tag: $TAG"

# Build client first
echo "Building client..."
cd ../client
npm run build

# Build and push Docker image
echo "Building Docker image..."
cd ..  # Go to root directory

# Set your Docker Hub username
DOCKER_USERNAME="magrelo"

# Set up Docker buildx builder
echo "Setting up Docker buildx builder..."
docker buildx create --use --name multi-platform-builder || true

# Build and push multi-platform image
echo "Building and pushing multi-platform Docker image..."
docker buildx build --platform linux/amd64,linux/arm64 \
  -t $DOCKER_USERNAME/betthecut:$TAG \
  -t $DOCKER_USERNAME/betthecut:latest \
  -f server/Dockerfile \
  --push .

echo "Deployment preparation complete!"
echo "Next steps:"
echo "1. SSH: ssh root@45.55.136.214"
echo "2. Pull & start: cd ../etc/dockercompose && docker compose up -d --pull always"