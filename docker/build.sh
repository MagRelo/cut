#!/bin/bash

# Exit on error
set -e

echo "Starting Docker build process..."

# Generate unique tag using git commit SHA and timestamp
TAG=$(git rev-parse --short HEAD)-$(date +%Y%m%d%H%M)
echo "Building with tag: $TAG"

# Set your Docker Hub username
DOCKER_USERNAME="magrelo"
DOCKER_IMAGE_NAME="cut-v2"

# Set up Docker buildx builder
echo "Setting up Docker buildx builder..."
docker buildx create --use --name multi-platform-builder || true

# Build and push multi-platform image
echo "Building and pushing multi-platform Docker image..."
docker buildx build --platform linux/amd64,linux/arm64 \
  -t $DOCKER_USERNAME/$DOCKER_IMAGE_NAME:$TAG \
  -t $DOCKER_USERNAME/$DOCKER_IMAGE_NAME:latest \
  -f docker/Dockerfile \
  --push .

echo "Docker build complete!"
echo "Next steps:"
echo "1. SSH: ssh root@45.55.136.214"
