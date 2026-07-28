#!/usr/bin/env bash
# Build + push the staging image, baking the same deploy tag into the client badge.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

GIT_SHA="$(git rev-parse --short HEAD)"
DEPLOY_TAG="${DEPLOY_TAG:-$GIT_SHA-$(date +%Y%m%d%H%M)}"
export DEPLOY_TAG
export GIT_SHA
export VITE_DEPLOY_TAG="$DEPLOY_TAG"

echo "Staging deploy tag: $DEPLOY_TAG"

pnpm --filter @cut/sport-sdk run build
pnpm --filter @cut/sport-commodities run build
pnpm --filter @cut/sport-pga-golf run build
pnpm --filter @cut/sport-f1 run build
pnpm --filter @cut/secondary-pricing run build
pnpm run client:build:staging
pnpm run server:build

DOCKER_IMAGE_NAME=cut-v4-staging \
  TAG_FILE=docker/.last-staging-tag \
  TAG_AS_LATEST=0 \
  DEPLOY_TAG="$DEPLOY_TAG" \
  pnpm run docker:build

echo "Staging image ready: magrelo/cut-v4-staging:$DEPLOY_TAG"
echo "Launch: pnpm run launch:staging"
