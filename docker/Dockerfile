# ---------------------------------------------------------------------------
# Stage 1: install deps, generate Prisma client, prune to production only
# ---------------------------------------------------------------------------
FROM node:22-alpine AS builder

ENV CI=true

WORKDIR /app

# pnpm for workspace:* deps (Corepack can fail signature verify in minimal images)
RUN npm install -g pnpm@10.14.0

# Workspace manifests (required for server workspace:* deps)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY server/package.json ./server/
COPY packages/secondary-pricing/package.json ./packages/secondary-pricing/
COPY packages/sport-sdk/package.json ./packages/sport-sdk/
COPY packages/sport-pga-golf/package.json ./packages/sport-pga-golf/
COPY packages/sport-f1/package.json ./packages/sport-f1/
COPY packages/sport-commodities/package.json ./packages/sport-commodities/

# Install server and its workspace deps. --ignore-scripts skips package prepare
# (no sources in image yet); dist is copied in the next step from the host build.
RUN pnpm install --frozen-lockfile --filter "server..." --ignore-scripts

COPY packages/secondary-pricing/dist ./packages/secondary-pricing/dist
COPY packages/sport-sdk/dist ./packages/sport-sdk/dist
COPY packages/sport-pga-golf/dist ./packages/sport-pga-golf/dist
COPY packages/sport-f1/dist ./packages/sport-f1/dist
COPY packages/sport-commodities/dist ./packages/sport-commodities/dist

COPY server/prisma ./server/prisma/
RUN cd server && pnpm exec prisma generate

# Re-resolve with production deps only (drops typescript, vitest, prisma CLI, etc.)
RUN pnpm install --prod --frozen-lockfile --filter "server..." --ignore-scripts

# ---------------------------------------------------------------------------
# Stage 2: runtime image (no devDependencies, no pnpm)
# ---------------------------------------------------------------------------
FROM node:22-alpine3.18 AS runtime

# Prisma query engine (linux-musl) requires OpenSSL 1.1.x (not on newer Alpine)
RUN apk add --no-cache openssl1.1-compat

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=builder /app/server/node_modules ./server/node_modules
COPY --from=builder /app/server/prisma ./server/prisma
COPY --from=builder /app/packages ./packages

# Compiled server + client static assets (build on host before docker:build).
# Run from /app/server so Node resolves deps from server/node_modules and cwd matches static paths (public/).
COPY server/dist/ ./server/dist/
COPY client/dist/ ./server/public/

WORKDIR /app/server

EXPOSE 4000

# Set last so changing GIT_SHA does not bust dependency install cache layers.
ARG GIT_SHA=unknown
ENV GIT_SHA=$GIT_SHA
ENV NODE_ENV=production

CMD ["node", "dist/src/index.js"]
