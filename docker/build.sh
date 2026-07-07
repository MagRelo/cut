#!/bin/bash

# Exit on error
set -e

# Default: linux/amd64 only (remote prod). Pass --with-arm or set DOCKER_BUILD_ARM=1 for M1/local arm64.
BUILD_ARM=false
for arg in "$@"; do
  case "$arg" in
    --with-arm) BUILD_ARM=true ;;
    -h|--help)
      echo "Usage: docker/build.sh [--with-arm]"
      echo "  --with-arm   Also build linux/arm64 (Apple Silicon / M1)"
      exit 0
      ;;
  esac
done
if [ "${DOCKER_BUILD_ARM:-}" = "1" ] || [ "${DOCKER_BUILD_ARM:-}" = "true" ]; then
  BUILD_ARM=true
fi

echo "Starting Docker build process..."

# Generate unique tag using git commit SHA and timestamp
GIT_SHA=$(git rev-parse --short HEAD)
TAG=$GIT_SHA-$(date +%Y%m%d%H%M)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "$TAG" > "$SCRIPT_DIR/.last-tag"
echo "Building with tag: $TAG (git $GIT_SHA)"

# Set your Docker Hub username
DOCKER_USERNAME="magrelo"
DOCKER_IMAGE_NAME="cut-v4"
CACHE_REF="$DOCKER_USERNAME/$DOCKER_IMAGE_NAME:buildcache"

# Set up Docker buildx builder
echo "Setting up Docker buildx builder..."
docker buildx create --use --name multi-platform-builder || true

PLATFORMS="linux/amd64"
if [ "$BUILD_ARM" = true ]; then
  PLATFORMS="linux/amd64,linux/arm64"
fi

# Build and push image
echo "Building and pushing Docker image for: $PLATFORMS"
docker buildx build --platform "$PLATFORMS" \
  -t $DOCKER_USERNAME/$DOCKER_IMAGE_NAME:$TAG \
  -t $DOCKER_USERNAME/$DOCKER_IMAGE_NAME:latest \
  -f docker/Dockerfile \
  --build-arg GIT_SHA=$GIT_SHA \
  --cache-from type=registry,ref=$CACHE_REF \
  --cache-to type=registry,ref=$CACHE_REF,mode=max \
  --provenance=false \
  --push .

echo "Docker build complete!"
echo "Tagged:  $DOCKER_USERNAME/$DOCKER_IMAGE_NAME:$TAG"
echo "Launch:  pnpm run launch"
