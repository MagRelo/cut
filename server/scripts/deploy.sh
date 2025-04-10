#!/bin/bash

# Exit on error
set -e

echo "Starting deployment process..."

# Build frontend
echo "Building frontend..."
cd ../../client
npm install
npm run build

# Build backend
echo "Building backend..."
cd ../server
npm install
npm run build

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Build and push Docker image
echo "Building Docker image..."
docker build -t betthecut:latest .

# Optional: Push to registry (uncomment and modify as needed)
# echo "Pushing to registry..."
# docker tag betthecut:latest your-registry/betthecut:latest
# docker push your-registry/betthecut:latest

echo "Deployment preparation complete!"
echo "Next steps:"
echo "1. Update environment variables"
echo "2. Deploy container to production environment"
echo "3. Verify deployment"
echo "4. Monitor for issues" 