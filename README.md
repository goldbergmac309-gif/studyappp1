# Study App

## Secrets Management (Doppler)

This repository uses Doppler as the single source of truth for all secrets (DATABASE_URL, JWT_SECRET, INTERNAL_API_KEY, etc.). No `.env` files are required or supported for production workflows.

### Install and Authenticate (Local)

```bash
brew install dopplerhq/cli/doppler
doppler login
# (optional) set defaults for this repo
doppler configure set project studyapp
doppler configure set config dev
```

### Run Services with Doppler (Local Dev)

Core-service (NestJS):

```bash
doppler run -- pnpm -F core-service start:dev
```

Oracle-service (FastAPI health server):

```bash
doppler run -- uvicorn apps.oracle-service.health_server:app --host 0.0.0.0 --port 8081
```

### Prod-like Stack (Docker Compose)

Use Doppler to inject secrets into Docker Compose:

```bash
DOPPLER_PROJECT=studyapp DOPPLER_CONFIG=prod \
  doppler run -- docker compose -f apps/docker-compose.prod.yml up -d
```

This will launch Postgres, RabbitMQ, MinIO, `core-service`, and `oracle-service`. Health checks are wired to `/health/live` and `/health/ready` endpoints.

### CI/CD

GitHub Actions integrates with Doppler using the official CLI action. Secrets are exported as environment variables for build jobs. Images are built and pushed to GHCR; no secrets are embedded into images.
