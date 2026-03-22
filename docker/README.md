# Docker Build Directory

This directory contains all Docker-related files for building and deploying the application.

## Files

- `Dockerfile` - Main Docker image definition
- `build.sh` - Script to build and push Docker images

## Build Process

The build process follows this sequence:

1. **Client Build**: `pnpm run client:build` - Builds the React frontend
2. **Server Build**: `pnpm run server:build` - Compiles TypeScript and copies contracts
3. **Workspace package**: `@cut/secondary-pricing` must have `dist/` (built via normal `pnpm install` / `pnpm --filter @cut/secondary-pricing run build`)
4. **Docker Build**: `pnpm run docker:build` - Builds and pushes Docker image (uses **pnpm** inside the image for `workspace:*` dependencies)

## Usage

### Full Deployment

```bash
pnpm run deploy
```

### Docker Build Only

```bash
pnpm run docker:build
```

### Docker Compose (Local Development)

```bash
cd docker
docker-compose up -d
```

## Docker Image

The Docker image is built with:

- Node.js 22 Alpine
- pnpm (Corepack) and a filtered workspace install for `server` + `@cut/secondary-pricing`
- Prisma Client pre-generated
- Built application files from `server/dist/`
- Client static files in `public/` (from `client/dist/`)

## Environment Variables

Required environment variables for production:

- `NODE_ENV=production`
- `DATABASE_URL=postgresql://user:password@db:5432/betthecut`
- `JWT_SECRET=your-secret-here`
