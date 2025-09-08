# syntax=docker/dockerfile:1.7
# Multi-stage build for core-service (NestJS)

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate
WORKDIR /app

# Install deps (workspace-aware) with only the manifests first for better caching
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/core-service/package.json apps/core-service/
COPY packages/shared-types/package.json packages/shared-types/
RUN pnpm -w install --frozen-lockfile

# Build
COPY . .
RUN pnpm -w build

# --- Runtime image ---
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# copy node_modules from builder to avoid re-resolving workspace at runtime
COPY --from=base /app/node_modules ./node_modules
# copy built app
COPY --from=base /app/apps/core-service/dist ./dist
# minimal package.json for metadata (not used by runtime)
COPY apps/core-service/package.json ./package.json

EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --retries=3 CMD wget -qO- http://localhost:3000/health/live || exit 1
CMD ["node", "dist/main.js"]
