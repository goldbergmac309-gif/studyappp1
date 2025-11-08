# THE_FINAL_JUDGEMENT_v3.md

A zero-trust, read-only, live-fire audit of the studyapp monorepo. All claims below are backed by precise code evidence.

Date: 2025-10-18
Branch: main (local behind origin/main by 2 commits; audit performed on current workspace state)

---

## Executive Summary

- The identity, security, and document processing foundations are strong:
  - HTTP security middleware, CORS, cookie handling, and a production secret startup guard are in place.
  - Session management follows a hardened pattern with httpOnly refresh cookies and client-side silent refresh.
  - Internal API calls are protected by an HMAC guard, and oracle workers properly sign requests.
  - Malware scanning integrates with ClamAV and is enforced before S3 upload.
  - Global aggregated search is implemented end-to-end (backend + frontend).
  - AI Consent is enforced server-side and surfaced in the client UX.
- Domain modularity has improved (Subjects split into CRUD/Search/Topics; NoteLink edges maintained on write).
- Notable gaps and ghost features:
  - Prophetic Exam Generator is partially implemented (service exists) but has no HTTP controller/module; client API exists without a wired UI.
  - AI synthesize endpoint (and its throttling) is not present in this codebase state.
  - Study Planner and Action Hub v2 generative actions are not present in the main app code.
  - InternalController still performs Prisma writes in `updateAnalysis()`, violating the “controller should not do DB” doctrine noted in prior guidance.

---

## Scorecard (Immutable Roadmap v3.0 Items)

- CI Secret Scanning (trufflehog): COMPLETE
- CI Container Scanning (Trivy): COMPLETE
- .gitignore secret hygiene: COMPLETE
- Production Secret Guard (fail-fast): COMPLETE
- Session Management (refresh cookie + silent refresh): COMPLETE
- In-memory client token store: COMPLETE
- Internal Auth (HMAC) + CORS enforcement: COMPLETE
- PII Redaction (oracle): COMPLETE
- Malware Scanning (ClamAV) enforced in upload flow: COMPLETE
- Subjects Service Decomposition (CRUD/Search/Topics): COMPLETE
- NoteLink model + compute-on-write edges: COMPLETE
- Global Aggregated Search (backend + frontend): COMPLETE
- AI Consent guard + endpoint + client flow: COMPLETE
- AI synthesize endpoint + throttling: NOT IMPLEMENTED (no ai module/routes present)
- Study Planner (models/endpoints/UI): NOT IMPLEMENTED in main app
- Action Hub v2 generative actions (backend + UI): NOT IMPLEMENTED
- Prophetic Exam Generator (endpoints + UI): PARTIALLY IMPLEMENTED (service only)

---

## Evidence by Operation (with precise code citations)

### 1) CI secret scanning and container scanning
- Secret scan (trufflehog): `.github/workflows/ci.yml:10-22`
- Container scans (Trivy for core-service and oracle-service images): `.github/workflows/ci.yml:23-57`

### 2) .gitignore correctness / secret hygiene
- Root `.gitignore` includes app-level env ignore (per prior change summary). No tracked `.env` files surfaced in `git status`; local `apps/oracle-service/.env` is present but untracked/ignored.

### 3) Security middleware, cookies, CORS, and production secret guard
- Helmet, cookie-parser, CORS, and production secret check:
  - `apps/core-service/src/main.ts:14-37`
- Startup guard verifying critical secrets (JWT_SECRET, COOKIE_SECRET, REFRESH_TOKEN_PEPPER, INTERNAL_API_SECRET):
  - `apps/core-service/src/security/startup-guard.ts:22-41`

### 4) Session Management: refresh cookie and silent refresh
- Refresh cookie set on signup/login; httpOnly, strict, secure in prod:
  - `apps/core-service/src/auth/auth.controller.ts:26-38, 41-50, 52-62`
- Refresh endpoint reads httpOnly cookie and returns new access token (no rotation):
  - `apps/core-service/src/auth/auth.controller.ts:64-75`
- Client silent refresh on app shell load:
  - `apps/client/src/app/(dashboard)/layout.tsx:25-37`
- In-memory token store (no persistence by default):
  - `apps/client/src/lib/store.ts:21-29`

### 5) Internal Auth & CORS
- HMAC guard (timestamp, body hash, HMAC-SHA256, timing-safe compare):
  - `apps/core-service/src/internal/guards/hmac.guard.ts:19-54`
- Guard applied to internal controller:
  - `apps/core-service/src/internal/internal.controller.ts:17-19`
- CORS production enforcement with fail-fast if origin is missing:
  - `apps/core-service/src/main.ts:24-37`

### 6) AI Compliance & Safety
- AI Consent guard:
  - `apps/core-service/src/auth/guards/ai-consent.guard.ts:5-18`
- Consent endpoint for current user:
  - `apps/core-service/src/users/users.controller.ts:10-19`
- Client: Axios interceptor detects `AI_CONSENT_REQUIRED` and triggers consent modal:
  - `apps/client/src/lib/api.ts:53-79`
- Client: Consent modal posts consent and updates auth state:
  - `apps/client/src/components/consent/AiConsentModal.tsx:35-90`
- PII redaction (oracle embed server): redacts before processing:
  - `apps/oracle-service/app/embed_server.py:33-39`
  - Implementation: `apps/oracle-service/utils/redaction.py:10-40`

### 7) Malware Scanning (ClamAV)
- Real ClamAV integration with fail-closed behavior on errors:
  - `apps/core-service/src/documents/malware-scanner.service.ts:56-96, 116-135`
- Enforced before S3 upload/queue in upload flow:
  - `apps/core-service/src/documents/documents.service.ts:48-57`

### 8) Subjects Module Decomposition
- Controller uses injected CRUD/Search/Topics services (no monolith):
  - `apps/core-service/src/subjects/subjects.controller.ts:22-35`
- Services present:
  - CRUD: `apps/core-service/src/subjects/subjects-crud.service.ts`
  - Search: `apps/core-service/src/subjects/subjects-search.service.ts`
  - Topics: `apps/core-service/src/subjects/subjects-topics.service.ts`
- Legacy `subjects.service.ts` removed (per `git status`), completing the split.

### 9) NoteLink Model + Compute-On-Write Edges
- Prisma models:
  - `apps/core-service/prisma/schema.prisma:123-170` (Note, NoteVersion, NoteLink)
- Create note transaction computes and persists outgoing links:
  - `apps/core-service/src/notes/notes.service.ts:69-89`
- Update note transaction recomputes or clears links:
  - `apps/core-service/src/notes/notes.service.ts:168-190`
- Backlinks and graph queries rely on precomputed edges:
  - `apps/core-service/src/notes/notes.service.ts:206-225, 227-249`

### 10) Global Aggregated Search (Backend + Frontend)
- DTO with min length 2:
  - `apps/core-service/src/search/dto/search-query.dto.ts:3-14`
- Controller and service implementation:
  - `apps/core-service/src/search/search.controller.ts:13-20`
  - `apps/core-service/src/search/search.service.ts:10-58`
- Module wiring and import in app module:
  - `apps/core-service/src/search/search.module.ts:6-12`
  - `apps/core-service/src/app.module.ts:16, 70-71`
- Client search API and page:
  - API: `apps/client/src/lib/api.ts:558-575`
  - Results page: `apps/client/src/app/(dashboard)/search/page.tsx:21-41, 71-105`
  - Header search decommissioned; dashboard routes to `/search?q=...`:
    - Header: `apps/client/src/app/(dashboard)/_components/header.tsx:41`
    - Dashboard: `apps/client/src/app/(dashboard)/dashboard/page.tsx:56-73`

### 11) AI synthesize endpoint + throttling
- No `AiModule`, controller, or routes found in this codebase state (`grep` for `AiModule`, `AiController`, `synthesize`, `/ai` returned no relevant results). Global `ThrottlerModule` is initialized app-wide, and a search-specific profile exists for subject chunk search, but no AI routes are present:
  - `apps/core-service/src/app.module.ts:28-57, 70-79`
  - `apps/core-service/src/subjects/subjects.controller.ts:93-106` (throttled subject search only)

### 12) Study Planner
- No Study Planner backend or UI in the main app (only references in external sample dirs not part of the main client). Searches in `apps/client/` do not reveal planner features.

### 13) Action Hub v2 generative actions
- No backend or client implementation found in the main app (no bubble menu or generative action integrations present in `apps/client/`).

### 14) Prophetic Exam Generator
- Backend service exists (create + enqueue, fetch exam), but no controller/module -> endpoints are not exposed:
  - Service: `apps/core-service/src/exams/exams.service.ts:18-58, 60-75`
  - DTO present: `apps/core-service/src/exams/dto/generate-exam.dto.ts` (file exists)
  - No `exams.controller.ts` / `exams.module.ts` found; `app.module.ts` does not import an ExamsModule.
- Client API wrappers exist but no visible UI wiring:
  - `apps/client/src/lib/api.ts:103-141`

### 15) Architectural Doctrine deviation to address
- `InternalController.updateAnalysis()` performs Prisma writes directly instead of delegating to `InternalService`:
  - `apps/core-service/src/internal/internal.controller.ts:30-55`
  - `apps/core-service/src/internal/internal.service.ts` has no `updateAnalysis()`; other internal DB ops are correctly encapsulated.

---

## Ghost Feature Analysis (Backend implemented without functional UI, or vice versa)

- Prophetic Exam Generator
  - Backend: Service implemented; no HTTP controller/module; thus no reachable API endpoints.
  - Frontend: `generateExam()` and `getExam()` exist in client API, but no feature UI surfaces these calls.
  - Status: PARTIALLY IMPLEMENTED; GHOST FEATURE (requires controller + UI wiring).

- AI Synthesize Endpoint
  - No AI routes present in this codebase; prior references to throttling an AI route are not reflected here.
  - Status: NOT IMPLEMENTED; remove from immediate-facing UX expectations or implement fully.

- Study Planner & Action Hub v2
  - No evidence of backend endpoints or client UI in `apps/client/`; external sample directories exist but do not contribute to the main app.
  - Status: NOT IMPLEMENTED.

---

## Risks & Gaps

- Doctrine drift: `InternalController.updateAnalysis()` contains Prisma logic; should be moved to `InternalService` to maintain controller thinness and single-responsibility.
- Exams feature fragmentation: service exists but not exposed; client API exists but unused in UI, leading to cohesion gaps and stale tests if added later.
- Security defaults depend on env discipline: startup guard is strong in prod; ensure CI/ops set `CLIENT_ORIGIN` and secrets correctly in production deployments.

---

## Prioritized Roadmap (Next Phase)

- P0 – Expose Prophetic Exam Generator Endpoints
  - Add `ExamsModule` + `ExamsController` with:
    - `POST /subjects/:subjectId/exams/generate` (JWT; ownership check; body `GenerateExamDto`)
    - `GET /exams/:id` (JWT; ownership check)
  - Wire into `AppModule` and write E2E covering queue-noop and queue-present paths.
  - Minimal client UI surface (dashboard card or subject page CTA) to request and poll exam status.

- P0 – Restore Architectural Purity for Internal API
  - Move `updateAnalysis()` DB logic from `internal.controller.ts` to `internal.service.ts`.
  - Keep controller strictly delegating to service; add unit test(s) for service path.

- P1 – Decide on AI Synthesize Route
  - Either implement `AiModule` with route-level throttling per prior plan or remove from near-term roadmap to reduce ambiguity.
  - If implemented, add consent guard and PII redaction preflight (if any external model use is introduced).

- P1 – Study Planner & Action Hub v2
  - Create clear specs; introduce backend contracts and minimal UI. Until then, mark as NOT IN SCOPE to prevent ghost features.

- P1 – Hygiene & Observability
  - Add explicit health checks for ClamAV and S3 in a `/health` aggregation (if not already present) and alerting considerations.
  - Ensure CI runs E2E with pgvector profile (already present) and include any new modules.

---

## Appendix: Additional Confirmations

- Global Throttling present with a relaxed default in non-prod and a search-specific profile limited to the subjects search route:
  - `apps/core-service/src/app.module.ts:28-57, 49-55`
- Embedding/vector search for subject chunks is implemented with pgvector and robust fallbacks:
  - `apps/core-service/src/subjects/subjects-search.service.ts:54-63, 64-123, 125-151`
- S3 & RabbitMQ services gracefully no-op when unconfigured (tests/CI), throwing on publish without channel when usage is attempted:
  - S3: `apps/core-service/src/s3/s3.service.ts:45-60, 62-83`
  - Queue: `apps/core-service/src/queue/queue.service.ts:80-99, 119-139, 141-161`

— End of Report —
