# Oracle Service — Health & Worker Runtime

This service exposes a lightweight FastAPI health server and (in full runtime) a document processing worker. Secrets are provided by Doppler.

## Secrets Management (Doppler)

Do not use `.env` files. Use Doppler for all environments.

### One-time setup (local)

```bash
brew install dopplerhq/cli/doppler
doppler login
# Optional defaults
doppler configure set project studyapp
doppler configure set config dev
```

### Run health server locally

```bash
doppler run -- uvicorn apps.oracle-service.health_server:app --host 0.0.0.0 --port 8081
```

### Common secrets (managed in Doppler)

- `RABBITMQ_URL` (e.g., amqp://guest:guest@localhost:5672//)
- `RABBITMQ_QUEUE_NAME` (e.g., document_processing_jobs)
- `CORE_SERVICE_URL` (http://localhost:3000 for local; http://core-service:3000 in containers)
- `INTERNAL_API_KEY` (must match core-service)
- `AWS_REGION`
- `S3_BUCKET`
- `AWS_S3_ENDPOINT` (e.g., http://localhost:9000 for MinIO)
- `AWS_S3_FORCE_PATH_STYLE` ("true" for MinIO)
- `ENGINE_VERSION` (e.g., oracle-v1)

### Compose (prod-like)

Secrets are injected by Doppler at runtime.

```bash
DOPPLER_PROJECT=studyapp DOPPLER_CONFIG=prod \
  doppler run -- docker compose -f apps/docker-compose.prod.yml up -d
```

This launches Postgres, RabbitMQ, MinIO, core-service, and oracle-service. Health endpoints:

- core-service: `GET /health/live`, `GET /health/ready`
- oracle-service: `GET /health/live`, `GET /health/ready`
