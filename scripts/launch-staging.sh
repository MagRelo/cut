#!/bin/bash
# Update only cut_web-staging to the last staging image (or an explicit tag). Does not touch cut_web.
set -e

SWARM_HOST="${SWARM_HOST:-157.230.6.6}"
SWARM_USER="${SWARM_USER:-root}"
DOCKER_USERNAME="${DOCKER_USERNAME:-magrelo}"
DOCKER_IMAGE_NAME="${DOCKER_IMAGE_NAME:-cut-v4-staging}"
STACK_SERVICE="${STACK_STAGING_SERVICE:-cut_web-staging}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TAG_FILE="$REPO_ROOT/docker/.last-staging-tag"

if [[ -n "$1" ]]; then
  TAG="$1"
elif [[ -f "$TAG_FILE" ]]; then
  TAG="$(tr -d '[:space:]' < "$TAG_FILE")"
else
  echo "No staging image tag found."
  echo "Run 'pnpm run deploy:staging' first, or pass a tag: pnpm run launch:staging -- <tag>"
  exit 1
fi

IMAGE="$DOCKER_USERNAME/$DOCKER_IMAGE_NAME:$TAG"
DEPLOYER="${USER:-unknown}@$(hostname -s 2>/dev/null || hostname)"

echo "Launching staging $IMAGE on $SWARM_USER@$SWARM_HOST (service $STACK_SERVICE) ..."

ssh "$SWARM_USER@$SWARM_HOST" bash -s <<EOF
set -e
cd /opt/cut
if ! docker service inspect "$STACK_SERVICE" >/dev/null 2>&1; then
  echo "Service $STACK_SERVICE does not exist yet."
  echo "Create swarm/env/web-staging.env, then from /opt/cut:"
  echo "  export CUT_STAGING_APP_IMAGE=$IMAGE"
  echo "  docker stack deploy -c swarm/stack.yml cut"
  exit 1
fi
echo "Pulling $IMAGE ..."
docker pull "$IMAGE"
echo "Updating $STACK_SERVICE ..."
docker service update --image "$IMAGE" --detach=true "$STACK_SERVICE"
LOG_LINE="\$(date -u +%Y-%m-%dT%H:%M:%SZ)  $IMAGE  $DEPLOYER"
echo "\$LOG_LINE" >> /opt/cut/deploy-staging.log
echo "Logged: \$LOG_LINE"
EOF

LAUNCH_LINE="$(date -u +%Y-%m-%dT%H:%M:%SZ)  $IMAGE  $DEPLOYER"
echo "$LAUNCH_LINE" > "$REPO_ROOT/docker/.last-staging-launch"

echo "Staging launch complete."
echo "Image:  $IMAGE"
echo "Local:  cat docker/.last-staging-launch"
echo "Remote: ssh $SWARM_USER@$SWARM_HOST 'tail /opt/cut/deploy-staging.log'"
echo "Verify: curl -s https://base-sepolia.playthecut.com/health"
