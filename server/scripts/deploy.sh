#!/bin/bash

# Exit on error
set -e

echo "Starting build process..."

# Build and push Docker image
echo "Building Docker image..."
cd ..  # Go to root directory

# Set your Docker Hub username
DOCKER_USERNAME="magrelo"  # Replace this with your Docker Hub username

# Set up Docker buildx builder
echo "Setting up Docker buildx builder..."
docker buildx create --use --name multi-platform-builder || true

# Build and push multi-platform image
echo "Building and pushing multi-platform Docker image..."
docker buildx build --platform linux/amd64,linux/arm64 \
  -t $DOCKER_USERNAME/betthecut:latest \
  -f server/Dockerfile \
  --push .

echo "Deployment preparation complete!"
echo "Next steps:"
echo "1. Update environment variables"
echo "2. Deploy container to production environment"
echo "3. Verify deployment"
echo "4. Monitor for issues" 