# Base Node image
FROM node:22-alpine3.18

# Install compatible OpenSSL 1.1.x (required for Prisma)
RUN apk add --no-cache openssl1.1-compat

WORKDIR /app

# pnpm for workspace:* deps (Corepack can fail signature verify in minimal images)
RUN npm install -g pnpm@10.14.0

# Workspace manifests (required for server dependency @cut/secondary-pricing: workspace:*)
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json ./server/
COPY packages/secondary-pricing/package.json ./packages/secondary-pricing/

# Install server and its workspace deps. --ignore-scripts skips @cut/secondary-pricing prepare
# (no sources in image yet); dist is copied in the next step from the host build.
RUN pnpm install --frozen-lockfile --filter "server..." --ignore-scripts

COPY packages/secondary-pricing/dist ./packages/secondary-pricing/dist

COPY server/prisma ./server/prisma/
RUN cd server && pnpm exec prisma generate

# Compiled server + client static assets (build on host before docker:build)
COPY server/dist/ ./
COPY client/dist/ ./public/

EXPOSE 4000

CMD ["node", "src/index.js"]
