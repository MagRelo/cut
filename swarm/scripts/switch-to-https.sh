#!/usr/bin/env bash
# Point the stack at nginx/https.conf instead of http-only.conf, then redeploy.
# Creates stack.yml.bak once before patching (only if .bak does not exist yet).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STACK_FILE="${ROOT_DIR}/stack.yml"

if [[ ! -f "$STACK_FILE" ]]; then
  echo "Missing ${STACK_FILE}"
  exit 1
fi

if grep -q 'file: ./nginx/https.conf' "$STACK_FILE"; then
  echo "stack.yml already references https.conf — nothing to do."
  exit 0
fi

if ! grep -q 'file: ./nginx/http-only.conf' "$STACK_FILE"; then
  echo "Expected stack.yml to contain 'file: ./nginx/http-only.conf'; edit manually or restore from git."
  exit 1
fi

BAK="${STACK_FILE}.bak"
if [[ ! -f "$BAK" ]]; then
  cp "$STACK_FILE" "$BAK"
  echo "Backup: $BAK"
fi

perl -pi -e 's#file: ./nginx/http-only\.conf#file: ./nginx/https.conf#' "$STACK_FILE"

echo "Updated ${STACK_FILE} to use nginx/https.conf"
echo "Redeploy from repository root:"
echo "  docker stack deploy -c swarm/stack.yml <stack_name>"
