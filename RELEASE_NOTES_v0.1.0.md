# v0.1.0 — Stable: Phase 3.X Production Readiness Complete

This release marks the completion of the Production Readiness Sprint for Synapse OS. The system is now deployable, secure, and observable. It includes fully wired health endpoints, CI plumbing for container images, and centralized secrets management via Doppler.

## Executive Summary
- Completed and merged the three pillars of Production Readiness:
  1) Health & Observability Layer (PR #1)
  2) CI Plumbing with GHCR + Docker healthchecks (PR #2)
  3) Secrets Management via Doppler (PR #3)
- Result: The system is not only functional but deployable with security, observability, and CI rigor.

## Major Accomplishments

### 1) Health & Observability Layer (PR #1)
- `core-service` exposes `GET /health/live` and `GET /health/ready` via `@nestjs/terminus`.
- Indicators: Database (Prisma), Queue (RabbitMQ), S3 (MinIO/AWS) with optional readiness for RMQ/S3; DB is mandatory.
- `oracle-service` FastAPI health endpoints mirror the readiness semantics.
- E2E tests validate both healthy (200) and degraded (503) states.

Refs: https://github.com/goldbergmac309-gif/studyappp1/pull/1

### 2) CI Plumbing (PR #2)
- Multi-stage Dockerfiles for `core-service` and `oracle-service` with HTTP health checks.
- GitHub Actions workflow builds and publishes images to GHCR (tags: `latest` and commit SHA).
- Production docker-compose with Postgres, RabbitMQ, MinIO, and both services; health checks wired to `/health` endpoints.

Refs: https://github.com/goldbergmac309-gif/studyappp1/pull/2

### 3) Secrets Management (PR #3)
- Doppler is the single source of truth for all secrets (dev/staging/prod).
- CI integrates `dopplerhq/cli-action` to fetch secrets at job runtime; no secrets embedded in images.
- Production Compose refactored to env-driven and intended to run with `doppler run -- docker compose ...`.
- Repository docs updated to make Doppler the only supported method for secrets.

Refs: https://github.com/goldbergmac309-gif/studyappp1/pull/3

## Security & Operational Posture
- No `.env` files in production workflows; secrets injected at runtime via Doppler.
- Optional dependencies (queue/S3) are reflected as optional in readiness checks to avoid false negatives.
- Centralized configuration and health endpoints align with Single Source of Truth doctrine.

## CI/CD State
- Health tests pass; client typecheck/lint pass.
- GHCR images build/publish via GitHub Actions; Doppler gating verified.

## How to Run

### Local Development
- Install Doppler and login, then:
```bash
# core-service
doppler run -- pnpm -F core-service start:dev

# oracle-service health server
doppler run -- uvicorn apps.oracle-service.health_server:app --host 0.0.0.0 --port 8081
```

### Prod-like Stack via Docker Compose
```bash
DOPPLER_PROJECT=studyapp DOPPLER_CONFIG=prod \
  doppler run -- docker compose -f apps/docker-compose.prod.yml up -d
```
This launches Postgres, RabbitMQ, MinIO, core-service, and oracle-service with health checks.

## Notes
- Images are published to GHCR as `ghcr.io/<owner>/core-service:{sha,latest}` and `ghcr.io/<owner>/oracle-service:{sha,latest}` by CI. Tag-specific images can be added in a follow-up if desired.
- Client public config remains in `.env.local` for `NEXT_PUBLIC_API_BASE_URL` only (not a secret).
