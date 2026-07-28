#!/bin/bash

# Exit on error
set -e

# Default: linux/amd64 only (remote prod). Pass --with-arm or set DOCKER_BUILD_ARM=1 for M1/local arm64.
# Env overrides:
#   DOCKER_USERNAME      (default magrelo)
#   DOCKER_IMAGE_NAME    (default cut-v4; staging: cut-v4-staging)
#   TAG_FILE             (default docker/.last-tag; staging: docker/.last-staging-tag)
#   TAG_AS_LATEST        (default 1; set 0 for staging so prod :latest is never retagged)
#   DEPLOY_TAG           (optional; if set, used as the image tag instead of generating one)

BUILD_ARM=false
for arg in "$@"; do
  case "$arg" in
    --with-arm) BUILD_ARM=true ;;
    -h|--help)
      echo "Usage: docker/build.sh [--with-arm]"
      echo "  --with-arm   Also build linux/arm64 (Apple Silicon / M1)"
      echo "Env: DOCKER_IMAGE_NAME, TAG_FILE, TAG_AS_LATEST=0|1, DEPLOY_TAG"
      exit 0
      ;;
  esac
done
if [ "${DOCKER_BUILD_ARM:-}" = "1" ] || [ "${DOCKER_BUILD_ARM:-}" = "true" ]; then
  BUILD_ARM=true
fi

echo "Starting Docker build process..."

# Generate unique tag using git commit SHA and timestamp (or reuse DEPLOY_TAG from deploy:staging)
GIT_SHA=$(git rev-parse --short HEAD)
TAG="${DEPLOY_TAG:-$GIT_SHA-$(date +%Y%m%d%H%M)}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TAG_FILE="${TAG_FILE:-$SCRIPT_DIR/.last-tag}"
echo "$TAG" > "$TAG_FILE"
echo "Building with tag: $TAG (git $GIT_SHA) → $TAG_FILE"

# Set your Docker Hub username / image
DOCKER_USERNAME="${DOCKER_USERNAME:-magrelo}"
DOCKER_IMAGE_NAME="${DOCKER_IMAGE_NAME:-cut-v4}"
TAG_AS_LATEST="${TAG_AS_LATEST:-1}"
CACHE_REF="$DOCKER_USERNAME/$DOCKER_IMAGE_NAME:buildcache"

# Set up Docker buildx builder
echo "Setting up Docker buildx builder..."
docker buildx create --use --name multi-platform-builder || true

PLATFORMS="linux/amd64"
if [ "$BUILD_ARM" = true ]; then
  PLATFORMS="linux/amd64,linux/arm64"
fi

TAG_ARGS=(
  -t "$DOCKER_USERNAME/$DOCKER_IMAGE_NAME:$TAG"
)
if [ "$TAG_AS_LATEST" = "1" ] || [ "$TAG_AS_LATEST" = "true" ]; then
  TAG_ARGS+=(-t "$DOCKER_USERNAME/$DOCKER_IMAGE_NAME:latest")
fi

# Build and push image
echo "Building and pushing Docker image for: $PLATFORMS ($DOCKER_USERNAME/$DOCKER_IMAGE_NAME)"
docker buildx build --platform "$PLATFORMS" \
  "${TAG_ARGS[@]}" \
  -f docker/Dockerfile \
  --build-arg GIT_SHA=$GIT_SHA \
  --cache-from type=registry,ref=$CACHE_REF \
  --cache-to type=registry,ref=$CACHE_REF,mode=max \
  --provenance=false \
  --push .

echo "Docker build complete!"
echo "Tagged:  $DOCKER_USERNAME/$DOCKER_IMAGE_NAME:$TAG"
if [ "$TAG_AS_LATEST" = "1" ] || [ "$TAG_AS_LATEST" = "true" ]; then
  echo "Also:   $DOCKER_USERNAME/$DOCKER_IMAGE_NAME:latest"
fi
if [ "$DOCKER_IMAGE_NAME" = "cut-v4-staging" ]; then
  echo "Launch:  pnpm run launch:staging"
else
  echo "Launch:  pnpm run launch"
fi
