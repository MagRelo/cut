# Docker Build Directory

This directory contains all Docker-related files for building and deploying the application.

## Files

- `Dockerfile` - Main Docker image definition
- `build.sh` - Script to build and push Docker images

## Build Process

The build process follows this sequence:

1. **Client Build**: `npm run client:build` - Builds the React frontend
2. **Server Build**: `npm run server:build` - Compiles TypeScript and copies contracts
3. **Static Copy**: `npm run copy-static` - Copies client build to server dist/public
4. **Docker Build**: `npm run docker:build` - Builds and pushes Docker image

## Usage

### Full Deployment

```bash
npm run deploy
```

### Docker Build Only

```bash
npm run docker:build
```

### Docker Compose (Local Development)

```bash
cd docker
docker-compose up -d
```

## Docker Image

The Docker image is built with:

- Node.js 22 Alpine
- Prisma Client pre-generated
- Built application files from `server/dist/`
- Client static files in `server/dist/public/`

## Environment Variables

Required environment variables for production:

- `NODE_ENV=production`
- `DATABASE_URL=postgresql://user:password@db:5432/betthecut`
- `JWT_SECRET=your-secret-here`
