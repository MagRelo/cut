#!/usr/bin/env bash
# Switch stack to nginx/https.conf. Swarm configs are immutable: use a NEW config key
# (nginx_site_https) so deploy can attach new file content.
# Creates stack.yml.bak once before patching (only if .bak does not exist yet).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STACK_FILE="${ROOT_DIR}/stack.yml"

if [[ ! -f "$STACK_FILE" ]]; then
  echo "Missing ${STACK_FILE}"
  exit 1
fi

if grep -q 'nginx_site_https:' "$STACK_FILE" && grep -q 'file: ./nginx/https.conf' "$STACK_FILE"; then
  echo "stack.yml already uses nginx_site_https + https.conf — nothing to do."
  exit 0
fi

if ! grep -q 'file: ./nginx/http-only.conf' "$STACK_FILE"; then
  echo "Expected stack.yml to contain 'file: ./nginx/http-only.conf' (HTTP bootstrap phase)."
  echo "Restore from git or ${STACK_FILE}.bak if needed."
  exit 1
fi

BAK="${STACK_FILE}.bak"
if [[ ! -f "$BAK" ]]; then
  cp "$STACK_FILE" "$BAK"
  echo "Backup: $BAK"
fi

perl -pi -e 's/^  nginx_site:$/  nginx_site_https:/' "$STACK_FILE"
perl -pi -e 's/^      - source: nginx_site$/      - source: nginx_site_https/' "$STACK_FILE"
perl -pi -e 's#file: ./nginx/http-only\.conf#file: ./nginx/https.conf#' "$STACK_FILE"

echo "Updated ${STACK_FILE}: config key nginx_site_https + nginx/https.conf"
echo "Redeploy from the directory that contains swarm/ (e.g. /opt/cut):"
echo "  docker stack deploy -c swarm/stack.yml <stack_name>"
