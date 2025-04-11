#!/bin/bash

# Exit on error
set -e

echo "Starting deployment process..."

# Build frontend
echo "Building frontend..."
cd ../client
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
cd ..  # Go to root directory

# Set your Docker Hub username
DOCKER_USERNAME="magrelo"  # Replace this with your Docker Hub username

# Build and tag the image
docker build -t $DOCKER_USERNAME/betthecut:latest -f server/Dockerfile .

# Push to Docker Hub
echo "Pushing to Docker Hub..."
docker tag $DOCKER_USERNAME/betthecut:latest $DOCKER_USERNAME/betthecut:latest
docker push $DOCKER_USERNAME/betthecut:latest

echo "Deployment preparation complete!"
echo "Next steps:"
echo "1. Update environment variables"
echo "2. Deploy container to production environment"
echo "3. Verify deployment"
echo "4. Monitor for issues" 