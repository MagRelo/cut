#!/usr/bin/env bash
# Obtain the first Let's Encrypt certificate (HTTP-01 webroot).
# Prerequisites: stack is up with stack.yml pointing at nginx/http-only.conf; DNS for PRIMARY_HOSTNAME → this host.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/env/nginx.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing ${ENV_FILE}. Copy env/nginx.env.example to env/nginx.env and fill PRIMARY_HOSTNAME, LETSENCRYPT_EMAIL, STACK_NAME."
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

: "${PRIMARY_HOSTNAME:?Set PRIMARY_HOSTNAME in env/nginx.env}"
: "${LETSENCRYPT_EMAIL:?Set LETSENCRYPT_EMAIL in env/nginx.env}"
STACK_NAME="${STACK_NAME:-cut}"

VOL_WWW="${STACK_NAME}_certbot-www"
VOL_LE="${STACK_NAME}_letsencrypt"

echo "Using stack volumes: ${VOL_WWW}, ${VOL_LE}"
echo "Requesting certificate for: ${PRIMARY_HOSTNAME} (cert name: cut)"

docker run --rm \
  -v "${VOL_WWW}:/var/www/certbot" \
  -v "${VOL_LE}:/etc/letsencrypt" \
  certbot/certbot:latest certonly \
  --webroot -w /var/www/certbot \
  --cert-name cut \
  -d "${PRIMARY_HOSTNAME}" \
  --email "${LETSENCRYPT_EMAIL}" \
  --agree-tos \
  --non-interactive

echo ""
echo "Certificate issued. Next:"
echo "  1. ${ROOT_DIR}/scripts/switch-to-https.sh   # sets stack.yml to use nginx/https.conf"
echo "  2. From repo root: docker stack deploy -c swarm/stack.yml ${STACK_NAME}"
echo "  3. Optionally: docker service update --force ${STACK_NAME}_nginx"
