# syntax=docker/dockerfile:1.7
# Multi-stage build for core-service (NestJS)

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate
WORKDIR /app

# Install deps (workspace-aware) with only the manifests first for better caching
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/core-service/package.json apps/core-service/
COPY packages/shared-types/package.json packages/shared-types/
RUN pnpm -w -r install --frozen-lockfile

# Build only the required workspaces to avoid copying the entire repo (prevents .venv bloat)
COPY packages/shared-types/ packages/shared-types/
COPY apps/core-service/ apps/core-service/
# Relink and ensure core-service workspace dependencies (including devDeps) are installed before build
RUN pnpm -w -r install --frozen-lockfile \
  && pnpm --filter core-service install --frozen-lockfile \
  && pnpm --filter core-service exec prisma generate --schema=prisma/schema.prisma \
  && pnpm --filter core-service exec tsc -p tsconfig.build.json

# Create a production-ready deploy directory with pruned node_modules for core-service
RUN pnpm deploy --filter core-service --prod --legacy /app/deploy \
  && cp -R apps/core-service/dist /app/deploy/dist \
  && cp -R apps/core-service/prisma /app/deploy/prisma

# --- Runtime image ---
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Copy pruned app (package.json, node_modules, dist) from deploy directory
COPY --from=base /app/deploy/ ./

# Generate Prisma Client inside the runtime image (schema is at ./prisma/schema.prisma)
RUN npx prisma generate --schema=./prisma/schema.prisma

EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --retries=3 CMD wget -qO- http://localhost:3000/health/live || exit 1
CMD ["node", "dist/main.js"]
