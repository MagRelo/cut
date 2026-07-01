#!/usr/bin/env bash
#
# Pull a production PostgreSQL snapshot into the local Docker database.
#
# Requires PROD_DATABASE_URL (hosted prod). Never point DATABASE_URL at prod for this.
#
# Usage:
#   pnpm run db:pull-prod
#   pnpm run db:pull-prod -- --dry-run
#   pnpm run db:pull-prod -- --yes
#   PROD_DATABASE_URL='postgresql://...' pnpm run db:pull-prod
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

LOCAL_DATABASE_URL="${LOCAL_DATABASE_URL:-postgresql://playthecut:playthecut@127.0.0.1:5432/playthecut}"
LOCAL_DB_CONTAINER="${LOCAL_DB_CONTAINER:-playthecut-local}"
LOCAL_DB_HOST="${LOCAL_DB_HOST:-127.0.0.1}"
LOCAL_DB_PORT="${LOCAL_DB_PORT:-5432}"
LOCAL_DB_USER="${LOCAL_DB_USER:-playthecut}"
LOCAL_DB_PASSWORD="${LOCAL_DB_PASSWORD:-playthecut}"
LOCAL_DB_NAME="${LOCAL_DB_NAME:-playthecut}"
DRY_RUN=false
SKIP_MIGRATE=false
ASSUME_YES=false

usage() {
  cat <<'EOF'
Pull production PostgreSQL data into the local Docker database.

Environment:
  PROD_DATABASE_URL   Required. Hosted prod connection string (not localhost).
  LOCAL_DATABASE_URL  Optional. Defaults to local Docker playthecut DB.

Options:
  --dry-run       Print planned steps without changing anything.
  --skip-migrate  Skip prisma migrate deploy after restore.
  --yes, -y       Skip confirmation prompt.
  -h, --help      Show this help.

Setup:
  Add PROD_DATABASE_URL to server/.env (see server/.env.example), then run:
    pnpm run db:pull-prod
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --skip-migrate)
      SKIP_MIGRATE=true
      shift
      ;;
    --yes | -y)
      ASSUME_YES=true
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1 (install PostgreSQL client tools)" >&2
    exit 1
  fi
}

parse_db_host() {
  local url="$1"
  if [[ "$url" =~ @([^:/?]+) ]]; then
    echo "${BASH_REMATCH[1]}"
    return
  fi
  if [[ "$url" =~ ^postgres(ql)?://([^:/?]+) ]]; then
    echo "${BASH_REMATCH[2]}"
    return
  fi
  echo "unknown"
}

is_local_host() {
  local host="$1"
  case "$host" in
    localhost | 127.0.0.1 | ::1)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

load_prod_url_from_env_file() {
  local env_file="$ROOT_DIR/server/.env"
  if [[ ! -f "$env_file" ]]; then
    return
  fi
  local line
  line="$(grep -E '^PROD_DATABASE_URL=' "$env_file" | tail -n 1 || true)"
  if [[ -z "$line" ]]; then
    return
  fi
  PROD_DATABASE_URL="${line#PROD_DATABASE_URL=}"
  PROD_DATABASE_URL="${PROD_DATABASE_URL%\"}"
  PROD_DATABASE_URL="${PROD_DATABASE_URL#\"}"
  PROD_DATABASE_URL="${PROD_DATABASE_URL%\'}"
  PROD_DATABASE_URL="${PROD_DATABASE_URL#\'}"
}

run_local_psql() {
  if [[ "$DRY_RUN" == true ]]; then
    printf '[dry-run] docker exec %s psql -U %s -d postgres -v ON_ERROR_STOP=1' "$LOCAL_DB_CONTAINER" "$LOCAL_DB_USER"
    printf ' %q' "$@"
    printf '\n'
    return 0
  fi
  docker exec "$LOCAL_DB_CONTAINER" psql -U "$LOCAL_DB_USER" -d postgres -v ON_ERROR_STOP=1 "$@"
}

run_local_pg_restore() {
  if [[ "$DRY_RUN" == true ]]; then
    printf '[dry-run] docker exec -i %s pg_restore -U %s -d %s --no-owner --no-acl < %s\n' \
      "$LOCAL_DB_CONTAINER" "$LOCAL_DB_USER" "$LOCAL_DB_NAME" "$dump_file"
    return 0
  fi
  docker exec -i "$LOCAL_DB_CONTAINER" pg_restore -U "$LOCAL_DB_USER" -d "$LOCAL_DB_NAME" --no-owner --no-acl
}

verify_local_restore() {
  if [[ "$DRY_RUN" == true ]]; then
    return 0
  fi
  local user_count
  user_count="$(
    docker exec "$LOCAL_DB_CONTAINER" psql -U "$LOCAL_DB_USER" -d "$LOCAL_DB_NAME" -tAc 'SELECT count(*) FROM "User";' \
      2>/dev/null || echo "0"
  )"
  user_count="${user_count//[[:space:]]/}"
  if [[ -z "$user_count" || "$user_count" == "0" ]]; then
    echo "Restore verification failed: \"User\" table is empty." >&2
    echo "Check pg_restore output above and confirm PROD_DATABASE_URL points at live prod." >&2
    exit 1
  fi
  echo "Restore verified ($user_count users)."
}

require_cmd pg_dump
require_cmd docker

run() {
  if [[ "$DRY_RUN" == true ]]; then
    printf '[dry-run]'; printf ' %q' "$@"; printf '\n'
    return 0
  fi
  "$@"
}

if [[ -z "${PROD_DATABASE_URL:-}" ]]; then
  load_prod_url_from_env_file
fi

if [[ -z "${PROD_DATABASE_URL:-}" ]]; then
  echo "PROD_DATABASE_URL is required." >&2
  echo "Set it in server/.env or export it before running this script." >&2
  exit 1
fi

if [[ "$PROD_DATABASE_URL" == "$LOCAL_DATABASE_URL" ]]; then
  echo "PROD_DATABASE_URL and LOCAL_DATABASE_URL must differ." >&2
  exit 1
fi

prod_host="$(parse_db_host "$PROD_DATABASE_URL")"
local_host="$(parse_db_host "$LOCAL_DATABASE_URL")"

if is_local_host "$prod_host"; then
  echo "PROD_DATABASE_URL must not point at a local host (got: $prod_host)." >&2
  exit 1
fi

if ! is_local_host "$local_host"; then
  echo "LOCAL_DATABASE_URL must point at localhost (got: $local_host)." >&2
  echo "Refusing to restore a prod dump into a non-local database." >&2
  exit 1
fi

if [[ -n "${DATABASE_URL:-}" ]] && [[ "$DATABASE_URL" == "$PROD_DATABASE_URL" ]]; then
  echo "DATABASE_URL is set to the prod URL. Use local DATABASE_URL for dev." >&2
  exit 1
fi

if [[ "$DRY_RUN" != true ]]; then
  if ! docker ps --filter name="$LOCAL_DB_CONTAINER" --filter status=running -q | grep -q .; then
    echo "Local Postgres container is not running. Start it with: pnpm run db:start" >&2
    exit 1
  fi
fi

dump_file="$(mktemp /tmp/playthecut-prod.XXXXXX.dump)"
cleanup() {
  rm -f "$dump_file"
}
trap cleanup EXIT

echo "Prod source host: $prod_host"
echo "Local target:     $LOCAL_DATABASE_URL"
echo "Dump file:        $dump_file"
echo

if [[ "$ASSUME_YES" != true ]]; then
  read -r -p "Replace ALL data in the local database? [y/N] " confirm
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
  fi
fi

echo "Dumping production database..."
run pg_dump "$PROD_DATABASE_URL" --no-owner --no-acl -Fc -f "$dump_file"

echo "Recreating local database..."
if [[ "$DRY_RUN" == true ]]; then
  run_local_psql -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${LOCAL_DB_NAME}' AND pid <> pg_backend_pid();"
  run_local_psql -c "DROP DATABASE IF EXISTS ${LOCAL_DB_NAME};"
  run_local_psql -c "CREATE DATABASE ${LOCAL_DB_NAME};"
else
  run_local_psql -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${LOCAL_DB_NAME}' AND pid <> pg_backend_pid();" \
    >/dev/null 2>&1 || true
  run_local_psql -c "DROP DATABASE IF EXISTS ${LOCAL_DB_NAME};"
  run_local_psql -c "CREATE DATABASE ${LOCAL_DB_NAME};"
fi

echo "Restoring dump into local database..."
if [[ "$DRY_RUN" == true ]]; then
  run_local_pg_restore
else
  set +e
  run_local_pg_restore <"$dump_file"
  restore_status=$?
  set -e
  if [[ "$restore_status" -ne 0 ]]; then
    echo "pg_restore failed with exit code $restore_status" >&2
    exit "$restore_status"
  fi
  verify_local_restore
fi

if [[ "$SKIP_MIGRATE" != true ]]; then
  echo "Applying pending Prisma migrations to local database..."
  run env DATABASE_URL="$LOCAL_DATABASE_URL" pnpm run prisma:migrate
fi

echo
echo "Done. Local database now mirrors prod (as of this dump)."
if [[ "$SKIP_MIGRATE" == true ]]; then
  echo "Skipped migrations. Run: pnpm run prisma:migrate"
fi
