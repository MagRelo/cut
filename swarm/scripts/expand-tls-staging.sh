#!/usr/bin/env bash
# Expand the existing Let's Encrypt cert (cert-name cut) with the staging hostname.
# Prerequisites: DNS for STAGING_HOSTNAME → this droplet; stack nginx serving ACME on :80.
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
STAGING_HOSTNAME="${STAGING_HOSTNAME:-base-sepolia.playthecut.com}"

VOL_WWW="${STACK_NAME}_certbot-www"
VOL_LE="${STACK_NAME}_letsencrypt"

echo "Using stack volumes: ${VOL_WWW}, ${VOL_LE}"
echo "Expanding certificate cut with SANs: ${PRIMARY_HOSTNAME}, ${STAGING_HOSTNAME}"

docker run --rm \
  -v "${VOL_WWW}:/var/www/certbot" \
  -v "${VOL_LE}:/etc/letsencrypt" \
  certbot/certbot:latest certonly \
  --webroot -w /var/www/certbot \
  --cert-name cut \
  --expand \
  -d "${PRIMARY_HOSTNAME}" \
  -d "${STAGING_HOSTNAME}" \
  --email "${LETSENCRYPT_EMAIL}" \
  --agree-tos \
  --non-interactive

echo ""
echo "Certificate expanded. Reload nginx so it picks up the new SAN:"
echo "  docker service update --force ${STACK_NAME}_nginx"
echo "Ensure swarm/nginx/https.conf has a server_name block for ${STAGING_HOSTNAME},"
echo "then redeploy if needed: docker stack deploy -c swarm/stack.yml ${STACK_NAME}"
