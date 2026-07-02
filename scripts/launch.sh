#!/bin/bash
# Deploy the last built image (or an explicit tag) to the Swarm manager and append deploy.log.
set -e

SWARM_HOST="${SWARM_HOST:-157.230.6.6}"
SWARM_USER="${SWARM_USER:-root}"
DOCKER_USERNAME="${DOCKER_USERNAME:-magrelo}"
DOCKER_IMAGE_NAME="${DOCKER_IMAGE_NAME:-cut-v4}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TAG_FILE="$REPO_ROOT/docker/.last-tag"

if [[ -n "$1" ]]; then
  TAG="$1"
elif [[ -f "$TAG_FILE" ]]; then
  TAG="$(tr -d '[:space:]' < "$TAG_FILE")"
else
  echo "No image tag found."
  echo "Run 'pnpm run deploy' first, or pass a tag: pnpm run launch -- <tag>"
  exit 1
fi

IMAGE="$DOCKER_USERNAME/$DOCKER_IMAGE_NAME:$TAG"
DEPLOYER="${USER:-unknown}@$(hostname -s 2>/dev/null || hostname)"

echo "Launching $IMAGE on $SWARM_USER@$SWARM_HOST ..."

ssh "$SWARM_USER@$SWARM_HOST" bash -s <<EOF
set -e
cd /opt/cut
echo "Pulling $IMAGE ..."
docker pull "$IMAGE"
export CUT_APP_IMAGE="$IMAGE"
docker stack deploy --detach=true -c swarm/stack.yml cut
LOG_LINE="\$(date -u +%Y-%m-%dT%H:%M:%SZ)  $IMAGE  $DEPLOYER"
echo "\$LOG_LINE" >> /opt/cut/deploy.log
echo "Logged: \$LOG_LINE"
EOF

LAUNCH_LINE="$(date -u +%Y-%m-%dT%H:%M:%SZ)  $IMAGE  $DEPLOYER"
echo "$LAUNCH_LINE" > "$REPO_ROOT/docker/.last-launch"

echo "Launch complete."
echo "Image:  $IMAGE"
echo "Local:  cat docker/.last-launch"
echo "Remote: ssh $SWARM_USER@$SWARM_HOST 'tail /opt/cut/deploy.log'"
echo "Verify: curl -s https://<your-domain>/health"
