# Synapse OS – AI Engineering Log (AILog)

## 2025-09-05 — Phase 2, Sprint 2: Oracle Worker V1 E2E — Status: PASS

### Executive Summary
- The end-to-end pipeline spanning `core-service` ↔ RabbitMQ ↔ `oracle-service` ↔ MinIO S3 completed successfully in a live local environment.
- Document status progressed to `COMPLETED` and an `AnalysisResult` row was persisted with `engineVersion=oracle-v1` and a non-empty payload.
- This validates the architecture and implementation for asynchronous document processing.

### System Under Test
- `apps/core-service` (NestJS + Prisma + SQLite)
- `apps/oracle-service` (Celery worker + boto3 + TF‑IDF extraction)
- RabbitMQ (queue: `document_processing_jobs`)
- MinIO (S3-compatible storage)

### Environment & Configuration
- OS: macOS (local)
- Database: SQLite at `apps/core-service/prisma/dev.db`
- RabbitMQ: `amqp://guest:guest@localhost:5672//` (Docker `rabbitmq:3-management`)
- S3: MinIO at `http://localhost:9000` with `AWS_S3_FORCE_PATH_STYLE=true`, bucket `studyapp-docs`
- Core ↔ Oracle callback security: `X-Internal-API-Key` with value `dev-internal-key`
- Engine version: `oracle-v1`

### Runbook (Condensed)
1) Start Docker network and containers for RabbitMQ and MinIO; create bucket `studyapp-docs`.
2) Install `core-service` deps; run `prisma migrate deploy` with `DATABASE_URL=file:./apps/core-service/prisma/dev.db`.
3) Start `core-service` with required env vars (`JWT_SECRET`, S3, RabbitMQ, `INTERNAL_API_KEY`).
4) Create Python venv; install `oracle-service` dependencies; start Celery worker (`celery_app.py`) with `RawQueueBridge` consuming `document_processing_jobs`.
5) Generate a sample 1‑page PDF.
6) Trigger via API: `/auth/signup` → `/subjects` → `/subjects/:id/documents` (multipart upload).
7) Poll SQLite for `Document.status` until `COMPLETED`; verify `AnalysisResult` existence.

### Evidence (Selected)
- Access token issued; subject and document created (IDs redacted).
- Status polling:
  - "Waiting for document to reach COMPLETED ..."
  - "Document status COMPLETED."
- `AnalysisResult` query: `oracle-v1 | 389`
- `core-service` log (tail):
  - `[InternalController] Analysis result received for documentId: clwjx...`
  - `[InternalService] Storing analysis for document clwjx.... Status updated to COMPLETED.`
- `oracle-service` worker log (tail):
  - `Bridged job to Celery task oracle.process_document` for `documentId=clwjx...`
  - `S3 download successful … PDF text extraction complete … TF‑IDF analysis complete …`
  - `Successfully posted analysis for documentId clwjx... (HTTP 200)`

### Key Implementation Validations
- Queue publishing/consumption contract respected: payload shape `{documentId,s3Key,userId}` and queue name `document_processing_jobs`.
- Internal callback endpoint present and secured: `PUT /internal/documents/:id/analysis` guarded by `InternalApiKeyGuard` using `app.internalApiKey` (see `apps/core-service/src/internal/*` and `src/config/configuration.ts`).
- Prisma models and migration for `Document`, `AnalysisResult`, and `Status` enum applied and working (see `apps/core-service/prisma/schema.prisma`).
- S3 client configured for local MinIO via `AWS_S3_ENDPOINT` and path-style addressing in `apps/oracle-service/utils/s3.py` driven by `config.py`.

### Lessons & Fixes
- Explicitly setting `DATABASE_URL` for both Prisma migration and `core-service` process avoided ambiguity and ensured the correct SQLite path.
- Path-style S3 and explicit endpoint are required for MinIO compatibility.
- The `RawQueueBridge` is effective for bridging non-Celery AMQP messages into Celery tasks without envelope changes.

### Next Steps (Proposed)
- Automate this E2E in CI (GitHub Actions) using Docker services for RabbitMQ and MinIO; cache pnpm dependencies to reduce build time.
- Add a small battery of regression tests to validate callback contracts and database transitions (mock PDF, deterministic TF‑IDF fixtures).
- Expand analysis pipeline metrics (page count, byte size) into user-facing analytics in subsequent sprints.

---
Documented by Cascade following canonical architecture and constraints defined in `BLUEPRINT.md` and `DOCTRINE.md`. This entry establishes the verified baseline for future E2E automation.
