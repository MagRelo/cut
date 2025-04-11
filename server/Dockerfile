# Base Node image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY server/package*.json ./

# Install dependencies
RUN npm install --production

# Copy built backend
COPY server/dist/ ./dist/

# Copy built frontend
COPY client/dist/ ./public/

# Expose port
EXPOSE 3000

# Start command
CMD ["node", "dist/index.js"] 