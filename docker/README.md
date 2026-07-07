# Docker Build Directory

This directory contains all Docker-related files for building and deploying the application.

## Files

- `Dockerfile` - Main Docker image definition
- `build.sh` - Script to build and push Docker images

## Build Process

The build process follows this sequence:

1. **Client Build**: `pnpm run client:build` - Builds the React frontend
2. **Server Build**: `pnpm run server:build` - Compiles TypeScript and copies contracts
3. **Workspace packages**: `@cut/sport-sdk`, `@cut/sport-pga-golf`, `@cut/sport-f1`, `@cut/sport-commodities`, and `@cut/secondary-pricing` must have `dist/` (built by `pnpm run deploy` before `docker:build`)
4. **Docker Build**: `pnpm run docker:build` - Builds and pushes Docker image (uses **pnpm** inside the image for `workspace:*` dependencies)

## Usage

### Full Deployment

```bash
pnpm run deploy   # build + push tagged image
pnpm run launch   # deploy to Swarm + append deploy.log
```

Check what's running: `curl -s https://<domain>/health` → `gitSha`. Deploy history on the manager: `/opt/cut/deploy.log`.

### Docker Build Only

```bash
pnpm run docker:build          # linux/amd64 only (default — remote prod)
pnpm run docker:build:arm      # amd64 + arm64 (Apple Silicon / M1)
```

### Docker Compose (Local Development)

```bash
pnpm run db:start
```

Local Postgres runs **17** (`postgres:17-alpine`) to match hosted prod and Homebrew `pg_dump`/`pg_restore` clients.

**Upgrading from Postgres 16:** the existing Docker volume is incompatible across major versions. Recreate it once:

```bash
pnpm run db:stop
docker compose -f docker/docker-compose.yml down -v
pnpm run db:start
```

### Pull production data to local

Requires `pg_dump` on your PATH and a running local Docker Postgres (`pnpm run db:start`). Set `PROD_DATABASE_URL` in `server/.env` (see `server/.env.example`), then:

```bash
pnpm run db:pull-prod
```

This dumps hosted prod, recreates the local `playthecut` database in Docker, restores the snapshot, and runs `prisma migrate deploy`. Use `--dry-run` to preview steps or `--yes` to skip the confirmation prompt.

## Docker Image

The Docker image is built with:

- Node.js 22 Alpine
- pnpm (Corepack) and a filtered workspace install for `server` + `@cut/sport-sdk`, `@cut/sport-pga-golf`, `@cut/sport-f1`, `@cut/sport-commodities`, `@cut/secondary-pricing`
- Prisma Client pre-generated
- Built application files from `server/dist/`
- Client static files in `public/` (from `client/dist/`)

## Environment Variables

Required environment variables for production:

- `NODE_ENV=production`
- `DATABASE_URL=postgresql://playthecut:playthecut@db:5432/playthecut`
- `JWT_SECRET=your-secret-here`
