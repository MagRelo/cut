# Base Node image
FROM node:22-alpine3.18

# Install compatible OpenSSL 1.1.x (required for Prisma)
RUN apk add --no-cache openssl1.1-compat

# Set working directory
WORKDIR /app

# Copy package files
COPY server/package*.json ./

# Install dependencies
RUN npm install

# Copy prisma schema
COPY server/prisma ./prisma/

# Generate Prisma Client
RUN npx prisma generate

# Copy built server application files
COPY server/dist/ ./

# Copy built client application files
COPY client/dist/ ./public/

# Expose port
EXPOSE 4000

# Start command
CMD ["node", "src/index.js"]