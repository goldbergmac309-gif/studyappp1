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

Documented by Cascade following canonical architecture and constraints defined in `BLUEPRINT.md` and `DOCTRINE.md`. This entry establishes the verified baseline for future E2E automation.


## 2025-09-09 — Phase 3.X Production Readiness — Status: COMPLETE

### Executive Summary
- Completed and merged the three pillars of Production Readiness:
  1) Health & Observability Layer (PR #1)
  2) CI Plumbing with GHCR + Docker healthchecks (PR #2)
  3) Secrets Management via Doppler (PR #3)
- Result: The system is not only functional but deployable with security, observability, and CI rigor.

### Major Accomplishments
1) Health & Observability Layer (PR #1)
   - `core-service` exposes `GET /health/live` and `GET /health/ready` via `@nestjs/terminus`.
   - Indicators: Database (Prisma), Queue (RabbitMQ), S3 (MinIO/AWS) with optional readiness for RMQ/S3; DB is mandatory.
   - `oracle-service` FastAPI health endpoints mirror the readiness semantics.
   - E2E tests validate both healthy (200) and degraded (503) states.

2) CI Plumbing (PR #2)
   - Multi-stage Dockerfiles for `core-service` and `oracle-service` with HTTP health checks.
   - GH Actions workflow builds and publishes images to GHCR.
   - Production `docker-compose` with Postgres, RabbitMQ, MinIO, and both services; health checks wired to `/health` endpoints.

3) Secrets Management (PR #3)
   - Doppler is the single source of truth for all secrets (dev/staging/prod).
   - CI integrates `dopplerhq/cli-action` to fetch secrets at job runtime; no secrets embedded in images.
   - Production Compose refactored to env-driven and intended to run with `doppler run -- docker compose ...`.
   - Repository docs updated to make Doppler the only supported method for secrets.

### Security & Operational Posture
- No `.env` files in production workflows; secrets injected at runtime.
- Optional dependencies (queue/S3) are reflected as optional in readiness checks to avoid false negatives.
- Centralized configuration prevents drift and enforces the Single Source of Truth doctrine.

### CI/CD State
- Health tests pass; client typecheck/lint pass.
- GHCR images build/publish via GitHub Actions; Doppler gating verified.

### Release Tag
- Created annotated tag `v0.1.0` with message: "v0.1.0: Stable - Phase 3.X Production Readiness Complete".

---
Documented by Cascade (Forge) following canonical architecture and constraints defined in `BLUEPRINT.md`, `DOCTRINE.md`, and `PROJECT_OVERVIEW.md`. This entry marks the conclusion of the Production Readiness Sprint for the Synapse OS MVP.

## 2025-09-11 — MVP COMPLETE — Status: COMPLETE

### Executive Summary
- The Synapse OS MVP is complete. The monorepo builds cleanly with zero critical linting errors. All core-service E2E test suites pass (7/7). Client build is green with Next.js requirements satisfied (Suspense wrappers around auth pages using `useSearchParams`).
- Health readiness semantics hardened: dependency failures are normalized to HTTP 503 (Service Unavailable), yielding predictable health behavior in degraded modes.
- The asynchronous intelligence pipeline (Upload → S3 → Queue → Oracle analysis callback → Persisted AnalysisResult) is verified end-to-end and stable for local development.

### Final System State
- Core Service (NestJS + Prisma + SQLite for dev)
  - Auth endpoints: `POST /auth/signup`, `POST /auth/login` return `LoginResponse` per contract.
  - Subjects endpoints: owner-scoped CRUD (Sprint 1 focus: create/list/get by id with ownership enforcement).
  - Documents pipeline: `POST /subjects/:subjectId/documents` (Multer memory storage) → S3 upload via `S3Service` → queue publish via `QueueService` → eventual `PUT /internal/documents/:id/analysis` (guarded by `X-Internal-API-Key`).
  - Health: `GET /health/live` and `GET /health/ready` with indicators (DB mandatory; Queue/S3 optional but surfaced; failures yield 503 on readiness).
  - Prisma schema includes `User`, `Subject`, `Document` (Status enum), and `AnalysisResult` with relations; migrations applied to local SQLite dev DB.

- Oracle Service (Python + Celery)
  - Consumes `document_processing_jobs` via AMQP bridge, downloads artifacts from S3/MinIO, performs analysis, and posts results back to core-service.

- Client (Next.js)
  - Auth pages (login/signup) compliant with Next.js suspense requirements.
  - Subject workspace scaffold with Documents and Insights tabs; API client supports listing documents and fetching analysis results.

### Quality Gates & Evidence
- Lint: ESLint clean for both client and core-service (tests use minimal, targeted disables where applicable).
- Typecheck: TypeScript passes across workspace.
- Tests: Core-service E2E suites all green; readiness e2e asserts both healthy (200) and degraded (503) states.
- Build: Next.js production build completes; NestJS build completes.

### Release
- Tag: `v1.0.0-MVP` — "v1.0.0-MVP: Synapse OS - Core Insight Engine. Full stack is feature-complete, hardened, and verified."
- Notes: This tag marks the functional and architectural completeness of the MVP across backend, frontend, and worker components per `BLUEPRINT.md` and `DOCTRINE.md`.

---
Documented by Cascade (Forge). This entry marks the finalization of the Synapse OS MVP and the successful conclusion of the Final Hardening Sprint.

## 2025-09-13 — Epoch III: Zeitgeist Canvas & Persona System — Status: COMPLETE

### Executive Summary
- Delivered the foundational creative workspace: the Zeitgeist Canvas and the Persona System.
- Database evolved to support flexible, per-subject widget layouts and user blueprints.
- New Workspace API implemented and fully covered by E2E tests (authz, ownership, validation).
- Client app now features a two-step “Subject Genesis” modal with Persona selection and a draggable/resizable Canvas powered by react-grid-layout.

### Database Evolution (Prisma)
- Models added:
  - `Persona { id, name (unique), widgets Json }`
  - `Blueprint { id, userId -> User onDelete: Cascade, name, layout Json, @@unique([userId, name]) }`
  - `WidgetInstance { id, subjectId -> Subject onDelete: Cascade, type WidgetType, position Json, size Json, content Json, @@index([subjectId]) }`
- Enum added: `WidgetType { NOTES, MIND_MAP, FLASHCARDS }`
- `Subject` extended with: `blueprintId?`, `activeLayout -> Blueprint`, `widgets: WidgetInstance[]`
- Relation names added to satisfy Prisma validation: `UserBlueprints`, `SubjectActiveLayout`.
- Migration: `20250913191615_epoch3_workspace` applied successfully to Postgres.

### Seed Data
- Added `apps/core-service/prisma/seed.ts` (Prisma seed hook) to upsert initial Personas:
  - STEM Lab (NOTES + MIND_MAP + FLASHCARDS)
  - Humanities Hub (NOTES + FLASHCARDS)
  - Exam Crunch (FLASHCARDS + NOTES)
  - Research Garden (MIND_MAP + NOTES)
- Persona widgets adhere to canonical schema: `{ type, position: {x,y}, size: {width,height}, content }`.

### Workspace API (core-service)
- Endpoints per BLUEPRINT v7.0:
  - `GET /workspace/personas` → [{ id, name }]
  - `POST /subjects/:id/apply-persona` (JWT, body: `{ personaId }`) → creates Blueprint + WidgetInstances; 409 on re-apply.
  - `GET /subjects/:id/workspace` (JWT) → returns `WidgetInstanceDto[]` for owner; 404 otherwise.
  - `PATCH /subjects/:id/workspace/layout` (JWT, body: `UpdateWorkspaceLayoutDto`) → bulk updates positions/sizes; syncs `Subject.activeLayout.layout`.
- Ownership enforced consistently (`subject.userId` + `archivedAt: null`).
- Transactional integrity via `Prisma.$transaction` for apply-persona and layout updates.
- E2E tests: `apps/core-service/test/workspace.e2e-spec.ts` PASS; verifies auth, ownership, re-apply 409, layout sync to Blueprint.

### Shared Types (packages/shared-types)
- Added `WidgetPosition`, `WidgetSize`, `WidgetContent`, `WidgetType`, `WidgetInstanceDto`, `UpdateWorkspaceLayoutDto`, `PersonaListItem`.

### Client (Next.js) — Canvas & Persona Flow
- API integration (`apps/client/src/lib/api.ts`): added `listPersonas`, `applyPersona`, `getSubjectWorkspace`, `patchWorkspaceLayout`.
- Subject Genesis Modal (`dashboard/_components/subject-genesis-modal.tsx`):
  - Step 2 includes Persona selection (fetched from API).
  - On create, applies Persona and navigates user to `/subjects/[subjectId]/canvas`.
- Canvas Page (`subjects/[subjectId]/canvas/page.tsx`):
  - Renders widget grid via `react-grid-layout` (dynamic import to avoid SSR issues).
  - Displays placeholders: `NotesWidget`, `MindMapWidget` inside a generic `WidgetWrapper`.
  - Drag/resize persists layout with `PATCH /subjects/:id/workspace/layout`; state reflects server updates.
- Typecheck: `pnpm --filter @studyapp/client typecheck` → PASS.

### Evidence (Selected)
- Migration output confirms DB sync and Prisma Client generation.
- Seed run output indicates Personas initialized.
- E2E: `workspace.e2e-spec.ts` shows all tests passed; verified ownership and layout sync.
- Manual verification: Persona-selected subject creation auto-populates Canvas; drag + refresh persists widget positions.

### Release Tag
- Created annotated tag `v0.3.0-alpha` — "v0.3.0-alpha: Epoch III Complete - Zeitgeist Canvas & Creative Suite v1."

---
Documented by Cascade (Forge). This entry marks the successful completion of Epoch III and the transformation of Synapse OS into an interactive creative workspace aligned with BLUEPRINT v7.0.
