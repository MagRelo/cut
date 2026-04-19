#!/usr/bin/env bash
# Renew certs (run weekly via cron/systemd on the Swarm manager). Reloads nginx on success.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/env/nginx.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing ${ENV_FILE}"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

STACK_NAME="${STACK_NAME:-cut}"
VOL_WWW="${STACK_NAME}_certbot-www"
VOL_LE="${STACK_NAME}_letsencrypt"

if docker run --rm \
  -v "${VOL_WWW}:/var/www/certbot" \
  -v "${VOL_LE}:/etc/letsencrypt" \
  certbot/certbot:latest renew --webroot -w /var/www/certbot; then
  echo "Renewal run finished; reloading nginx service..."
  docker service update --force "${STACK_NAME}_nginx" >/dev/null
  echo "Done (${STACK_NAME}_nginx forced update)."
else
  echo "certbot renew exited non-zero; not reloading nginx."
  exit 1
fi
