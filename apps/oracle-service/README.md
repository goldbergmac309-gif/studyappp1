# Oracle Service

This service ingests PDFs from S3, extracts text (with an OCR fallback), computes insights and (optionally) embeddings, and calls back to core-service via its Internal API.

## Providers: Embeddings Options

Embeddings are provider-based and selected via environment variables. Defaults are safe and offline-friendly.

- Stub (default)
  - Deterministic vectors, no external dependencies.
  - Good for local development and CI.
- Local (sentence-transformers)
  - Uses a local model via `sentence-transformers`.
  - Vectors are projected/padded to the configured `ENGINE_DIM` (default 1536).
- OpenAI (consent-gated)
  - Calls OpenAI Embeddings API.
  - Only enabled when `AI_CONSENT=true` and `OPENAI_API_KEY` is present.

### Common environment variables

```bash
# Core-service callback
CORE_SERVICE_URL=http://localhost:3000
INTERNAL_API_KEY=dev-internal-key
INTERNAL_API_SECRET=dev-internal-secret

# S3
AWS_REGION=us-east-1
S3_BUCKET=studyapp-dev
# When running tests with moto, avoid setting a custom endpoint.
# AWS_S3_ENDPOINT=
# AWS_S3_FORCE_PATH_STYLE=true

# Engine metadata
ENGINE_VERSION=oracle-v1
ENGINE_DIM=1536
```

### Stub provider (default)

You can omit `ENGINE_PROVIDER` or set it explicitly:

```bash
ENGINE_PROVIDER=stub
ENGINE_MODEL_NAME=stub-miniLM
```

### Local provider (sentence-transformers)

Install dependencies (already listed in `requirements.txt`):

```bash
pip install sentence-transformers torch transformers
```

Configure:

```bash
ENGINE_PROVIDER=local
ENGINE_MODEL_NAME=intfloat/e5-small-v2
ENGINE_DIM=1536
```

Notes:

- The provider will project/pad vectors to `ENGINE_DIM`.
- If the model cannot be loaded, it gracefully falls back to the stub provider.

### OpenAI provider (consent-gated)

Requirements:
- Explicit consent: `AI_CONSENT=true`
- API key present: `OPENAI_API_KEY=...`

Configure:

```bash
ENGINE_PROVIDER=openai
ENGINE_MODEL_NAME=text-embedding-3-small
ENGINE_DIM=1536
AI_CONSENT=true
OPENAI_API_KEY=sk-...
```

Notes:

- If consent or API key is missing, the service will log a warning and fall back to the stub provider.
- Vectors are projected/padded to `ENGINE_DIM` if the model dimension differs.

## OCR Fallback

`extract_text_smart(pdf_bytes, force=False)` automatically chooses between native text extraction and OCR based on density. When a document appears image-only or sparse, the UI can trigger a reprocess with OCR:

- Client: "Reprocess with OCR" button (with tooltip) in Insights tab.
- Core-service: forwards `forceOcr` to the queue payload.
- Oracle worker: honors `forceOcr` and sets `metrics.ocrUsed=true`.

## Meta Callback (Document Structure)

When enabled, the worker computes lightweight structural metadata for each document and posts it back to core-service after analysis.

- Enable with:

```bash
ENABLE_META_CALLBACK=true
```

- The callback includes fields such as:
  - `lang`: heuristic language code
  - `headingCount`: estimated number of headings
  - `headings`: a lightweight outline array, e.g. `[{ title: "Introduction", level: 1 }, ...]`
  - `detectedResourceType`: one of `SYLLABUS|EXAM|PRACTICE_SET|LECTURE_NOTES|TEXTBOOK|NOTES|OTHER`
  - `detectedQuestions`: boolean

The client Resource Viewer uses this metadata to show an Outline and Topic Highlights.

## Consent Gating: AI_CONSENT

Some providers (e.g., OpenAI) and LLM summarization paths require explicit user consent:

```bash
AI_CONSENT=true
OPENAI_API_KEY=sk-...
```

If consent or the API key is missing, oracle-service will fall back to the stub/local provider and skip external calls.

## Tests

Run the test suite from this directory:

```bash
pytest -q
```

Highlights:

- `tests/test_worker_integration.py`: end-to-end analysis with S3 + internal API mocks.
- `tests/test_worker_forceocr_integration.py`: verifies forced OCR path and metrics.
- `tests/test_providers.py`: provider projection and worker selection tests (local provider path).
