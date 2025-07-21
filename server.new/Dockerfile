# Base Node image
FROM node:22-alpine3.18

# Install compatible OpenSSL 1.1.x (required for Prisma)
RUN apk add --no-cache openssl1.1-compat

# Set working directory
WORKDIR /app

# Copy package files
COPY server.new/package*.json ./

# Install dependencies
RUN npm install

# Copy prisma schema
COPY server.new/prisma ./prisma/

# Generate Prisma Client
RUN npx prisma generate

# Copy built backend
COPY server.new/dist/ ./dist/

# Copy built frontend
COPY client/dist/ ./public/dist/

# Copy contract files
COPY client/src/utils/contracts/ ./contracts/

# Expose port
EXPOSE 3000

# Start command
CMD ["node", "dist/index.js"] 