#!/usr/bin/env bash
#
# Push a production PostgreSQL snapshot into the hosted staging database.
#
# Requires PROD_DATABASE_URL and STAGING_DATABASE_URL. Staging DB name must contain
# "staging". Never points DATABASE_URL at prod for this.
#
# One-time: CREATE DATABASE playthecut_staging; on the managed instance (same host
# as prod), then set STAGING_DATABASE_URL / swarm web-staging.env DATABASE_URL.
#
# Usage:
#   pnpm run db:push-staging
#   pnpm run db:push-staging -- --dry-run
#   pnpm run db:push-staging -- --yes
#   PROD_DATABASE_URL='…' STAGING_DATABASE_URL='…' pnpm run db:push-staging
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

DRY_RUN=false
SKIP_MIGRATE=false
ASSUME_YES=false

usage() {
  cat <<'EOF'
Push production PostgreSQL data into the hosted staging database.

Environment:
  PROD_DATABASE_URL              Required. Hosted prod connection string.
  STAGING_DATABASE_URL           Required. Hosted staging URL (DB name must contain "staging").
  STAGING_MAINTENANCE_DATABASE_URL
                                 Optional. Connection to a maintenance DB on the same
                                 host (e.g. defaultdb) used to DROP/CREATE the staging DB.
                                 Default: STAGING_DATABASE_URL with DB name → defaultdb.

Options:
  --dry-run       Print planned steps without changing anything.
  --skip-migrate  Skip prisma migrate deploy after restore.
  --yes, -y       Skip confirmation prompt.
  -h, --help      Show this help.

Setup:
  1. On managed Postgres: CREATE DATABASE playthecut_staging;
  2. Add PROD_DATABASE_URL and STAGING_DATABASE_URL to server/.env
  3. pnpm run db:push-staging
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

parse_db_name() {
  local url="$1"
  local rest path
  if [[ "$url" =~ @[^/]+/([^?]+) ]]; then
    echo "${BASH_REMATCH[1]}"
    return
  fi
  rest="${url#*://}"
  path="${rest#*/}"
  path="${path%%\?*}"
  echo "$path"
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

load_url_from_env_file() {
  local key="$1"
  local env_file="$ROOT_DIR/server/.env"
  if [[ ! -f "$env_file" ]]; then
    return
  fi
  local line
  line="$(grep -E "^${key}=" "$env_file" | tail -n 1 || true)"
  if [[ -z "$line" ]]; then
    return
  fi
  local value="${line#${key}=}"
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"
  printf -v "$key" '%s' "$value"
}

# Replace /dbname(?query) with /newname(?query) in a postgres URL.
rewrite_db_name() {
  local url="$1"
  local new_name="$2"
  if [[ "$url" =~ ^(.*@[^/]+/)([^?]+)(.*)$ ]]; then
    echo "${BASH_REMATCH[1]}${new_name}${BASH_REMATCH[3]}"
    return
  fi
  echo ""
}

run() {
  if [[ "$DRY_RUN" == true ]]; then
    printf '[dry-run]'; printf ' %q' "$@"; printf '\n'
    return 0
  fi
  "$@"
}

require_cmd pg_dump
require_cmd pg_restore
require_cmd psql

if [[ -z "${PROD_DATABASE_URL:-}" ]]; then
  load_url_from_env_file PROD_DATABASE_URL
fi
if [[ -z "${STAGING_DATABASE_URL:-}" ]]; then
  load_url_from_env_file STAGING_DATABASE_URL
fi
if [[ -z "${STAGING_MAINTENANCE_DATABASE_URL:-}" ]]; then
  load_url_from_env_file STAGING_MAINTENANCE_DATABASE_URL
fi

if [[ -z "${PROD_DATABASE_URL:-}" ]]; then
  echo "PROD_DATABASE_URL is required." >&2
  echo "Set it in server/.env or export it before running this script." >&2
  exit 1
fi

if [[ -z "${STAGING_DATABASE_URL:-}" ]]; then
  echo "STAGING_DATABASE_URL is required." >&2
  echo "Set it in server/.env or export it before running this script." >&2
  exit 1
fi

if [[ "$PROD_DATABASE_URL" == "$STAGING_DATABASE_URL" ]]; then
  echo "PROD_DATABASE_URL and STAGING_DATABASE_URL must differ." >&2
  exit 1
fi

prod_host="$(parse_db_host "$PROD_DATABASE_URL")"
staging_host="$(parse_db_host "$STAGING_DATABASE_URL")"
staging_db="$(parse_db_name "$STAGING_DATABASE_URL")"

if is_local_host "$prod_host"; then
  echo "PROD_DATABASE_URL must not point at a local host (got: $prod_host)." >&2
  exit 1
fi

if is_local_host "$staging_host"; then
  echo "STAGING_DATABASE_URL must not point at localhost (got: $staging_host)." >&2
  echo "Use pnpm run db:pull-prod for the local Docker database." >&2
  exit 1
fi

if [[ "$staging_db" != *staging* ]]; then
  echo "STAGING_DATABASE_URL database name must contain \"staging\" (got: $staging_db)." >&2
  echo "Refusing to restore into a non-staging database." >&2
  exit 1
fi

if [[ -n "${DATABASE_URL:-}" ]] && [[ "$DATABASE_URL" == "$PROD_DATABASE_URL" ]]; then
  echo "DATABASE_URL is set to the prod URL. Unset it or use a non-prod DATABASE_URL for local work." >&2
  exit 1
fi

if [[ -z "${STAGING_MAINTENANCE_DATABASE_URL:-}" ]]; then
  STAGING_MAINTENANCE_DATABASE_URL="$(rewrite_db_name "$STAGING_DATABASE_URL" "defaultdb")"
  if [[ -z "$STAGING_MAINTENANCE_DATABASE_URL" ]]; then
    echo "Could not derive STAGING_MAINTENANCE_DATABASE_URL. Set it explicitly (e.g. …/defaultdb)." >&2
    exit 1
  fi
fi

dump_file="$(mktemp /tmp/playthecut-prod-to-staging.XXXXXX.dump)"
cleanup() {
  rm -f "$dump_file"
}
trap cleanup EXIT

echo "Prod source host:    $prod_host"
echo "Staging target host: $staging_host"
echo "Staging database:    $staging_db"
echo "Maintenance URL DB:  $(parse_db_name "$STAGING_MAINTENANCE_DATABASE_URL")"
echo "Dump file:           $dump_file"
echo

if [[ "$ASSUME_YES" != true ]]; then
  read -r -p "Replace ALL data in staging database \"${staging_db}\"? [y/N] " confirm
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
  fi
fi

echo "Dumping production database..."
run pg_dump "$PROD_DATABASE_URL" --no-owner --no-acl -Fc -f "$dump_file"

echo "Recreating staging database..."
if [[ "$DRY_RUN" == true ]]; then
  run psql "$STAGING_MAINTENANCE_DATABASE_URL" -v ON_ERROR_STOP=1 -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${staging_db}' AND pid <> pg_backend_pid();"
  run psql "$STAGING_MAINTENANCE_DATABASE_URL" -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"${staging_db}\";"
  run psql "$STAGING_MAINTENANCE_DATABASE_URL" -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"${staging_db}\";"
else
  psql "$STAGING_MAINTENANCE_DATABASE_URL" -v ON_ERROR_STOP=1 -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${staging_db}' AND pid <> pg_backend_pid();" \
    >/dev/null 2>&1 || true
  psql "$STAGING_MAINTENANCE_DATABASE_URL" -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"${staging_db}\";"
  psql "$STAGING_MAINTENANCE_DATABASE_URL" -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"${staging_db}\";"
fi

echo "Restoring dump into staging database..."
if [[ "$DRY_RUN" == true ]]; then
  run pg_restore --no-owner --no-acl -d "$STAGING_DATABASE_URL" "$dump_file"
else
  set +e
  pg_restore --no-owner --no-acl -d "$STAGING_DATABASE_URL" "$dump_file"
  restore_status=$?
  set -e
  # pg_restore returns 1 when some objects warn; treat >=2 as hard failure
  if [[ "$restore_status" -ge 2 ]]; then
    echo "pg_restore failed with exit code $restore_status" >&2
    exit "$restore_status"
  fi
  user_count="$(
    psql "$STAGING_DATABASE_URL" -tAc 'SELECT count(*) FROM "User";' 2>/dev/null || echo "0"
  )"
  user_count="${user_count//[[:space:]]/}"
  if [[ -z "$user_count" || "$user_count" == "0" ]]; then
    echo "Restore verification failed: \"User\" table is empty." >&2
    exit 1
  fi
  echo "Restore verified ($user_count users)."
fi

if [[ "$SKIP_MIGRATE" != true ]]; then
  echo "Applying pending Prisma migrations to staging database..."
  run env DATABASE_URL="$STAGING_DATABASE_URL" pnpm run prisma:migrate
fi

echo
echo "Done. Staging database now mirrors prod (as of this dump)."
if [[ "$SKIP_MIGRATE" == true ]]; then
  echo "Skipped migrations. Run: DATABASE_URL=\$STAGING_DATABASE_URL pnpm run prisma:migrate"
fi
