# Deployment Guide

This document outlines the deployment strategy for Bet the Cut, covering both the frontend and backend components.

## Overview

The deployment architecture consists of:

- Frontend: Built React application served by the backend
- Backend: Dockerized Node.js application
- Database: PostgreSQL instance (managed service recommended)

## Build Process

### Frontend Build

1. Navigate to the `/client` directory
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the production bundle:
   ```bash
   npm run build
   ```
4. The build output will be in `/client/dist`

### Backend Build

1. Navigate to the `/server` directory
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build TypeScript:
   ```bash
   npm run build
   ```
4. The build output will be in `/server/dist`

## Docker Configuration

### Dockerfile

Create a Dockerfile in the `/server` directory:

```dockerfile
# Base Node image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy built backend
COPY dist/ ./dist/

# Copy built frontend
COPY ../client/dist/ ./public/

# Expose port
EXPOSE 3000

# Start command
CMD ["node", "dist/index.js"]
```

### Docker Compose (Development)

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:password@db:5432/betthecut
      - JWT_SECRET=your-secret-here
      - HYPERLIQUID_API_KEY=your-api-key
    depends_on:
      - db

  db:
    image: postgres:14
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=betthecut
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## Environment Configuration

Required environment variables:

- `NODE_ENV`: production/development
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for JWT token generation
- `HYPERLIQUID_API_KEY`: API key for Hyperliquid integration
- Additional variables as needed for specific features

## Deployment Steps

1. **Pre-deployment**

   - Ensure all environment variables are configured
   - Run tests: `npm test`
   - Build frontend and backend
   - Update database schemas: `npx prisma migrate deploy`

2. **Container Build**

   ```bash
   docker build -t betthecut:latest .
   ```

3. **Container Deployment**

   - Push container to registry (e.g., Docker Hub, ECR)
   - Deploy to chosen platform (e.g., AWS ECS, GCP Cloud Run)

4. **Database Setup**

   - Set up managed PostgreSQL instance
   - Run migrations
   - Configure backup strategy

5. **Monitoring Setup**
   - Configure application logging
   - Set up performance monitoring
   - Configure alerts

## Production Considerations

## Maintenance

### Regular Tasks

- Monitor system resources
- Review logs
- Update dependencies
- Security patches
- Database maintenance

### Deployment Checklist

- [ ] Run tests
- [ ] Build frontend
- [ ] Build backend
- [ ] Build container
- [ ] Run database migrations
- [ ] Update environment variables
- [ ] Deploy container
- [ ] Verify deployment
- [ ] Monitor for issues
