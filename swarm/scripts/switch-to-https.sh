#!/usr/bin/env bash
# Switch stack to nginx/https.conf (patches the bind mount in stack.yml).
# Creates stack.yml.bak once before patching (only if .bak does not exist yet).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STACK_FILE="${ROOT_DIR}/stack.yml"

if [[ ! -f "$STACK_FILE" ]]; then
  echo "Missing ${STACK_FILE}"
  exit 1
fi

if grep -q './nginx/https.conf:/etc/nginx/conf.d/default.conf:ro' "$STACK_FILE"; then
  echo "stack.yml already mounts https.conf — nothing to do."
  exit 0
fi

if ! grep -q './nginx/http-only.conf:/etc/nginx/conf.d/default.conf:ro' "$STACK_FILE"; then
  echo "Expected stack.yml to mount ./nginx/http-only.conf (HTTP bootstrap phase)."
  echo "Restore from git or ${STACK_FILE}.bak if needed."
  exit 1
fi

BAK="${STACK_FILE}.bak"
if [[ ! -f "$BAK" ]]; then
  cp "$STACK_FILE" "$BAK"
  echo "Backup: $BAK"
fi

perl -pi -e 's#./nginx/http-only\.conf#./nginx/https.conf#' "$STACK_FILE"

echo "Updated ${STACK_FILE}: nginx bind mount -> https.conf"
echo "Redeploy from the directory that contains swarm/ (e.g. /opt/cut):"
echo "  docker stack deploy -c swarm/stack.yml <stack_name>"
