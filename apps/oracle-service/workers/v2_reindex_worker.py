from __future__ import annotations

"""V2 Reindex Worker — production implementation.

This Celery task receives a subjectId payload and orchestrates:
  - listing subject documents from core-service internal API
  - S3 download per document
  - ConceptualEngine.chunk_and_embed
  - batched upsert to core-service internal endpoints

All external calls are retried on transient failures. Permanent data errors
are logged and skipped without failing the whole job.
"""

import json
import logging
from typing import Any, Dict, List

import requests
from celery import shared_task
from requests import Response
from requests.exceptions import ConnectionError as ReqConnectionError, Timeout as ReqTimeout
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.core.conceptual_engine import ConceptualEngine
from app.core.topics import compute_subject_topics
from config import get_settings
from utils.s3 import download_to_bytes

logger = logging.getLogger(__name__)


def _is_transient_http(resp: Response) -> bool:
    return 500 <= resp.status_code < 600


def _chunkify(items: List[Any], batch_size: int) -> List[List[Any]]:
    return [items[i : i + batch_size] for i in range(0, len(items), batch_size)]


class _Http:
    def __init__(self, base_url: str, api_key: str, timeouts: tuple[float, float]):
        self.base_url = base_url.rstrip("/")
        self.headers = {"X-Internal-API-Key": api_key, "Content-Type": "application/json"}
        self.timeouts = timeouts

    @retry(
        retry=retry_if_exception_type((ReqConnectionError, ReqTimeout)),
        stop=stop_after_attempt(5),
        wait=wait_exponential(multiplier=1, min=1, max=30),
        reraise=True,
    )
    def get(self, path: str) -> Response:
        url = f"{self.base_url}{path}"
        return requests.get(url, headers=self.headers, timeout=self.timeouts)

    @retry(
        retry=retry_if_exception_type((ReqConnectionError, ReqTimeout)),
        stop=stop_after_attempt(5),
        wait=wait_exponential(multiplier=1, min=1, max=30),
        reraise=True,
    )
    def put(self, path: str, json_body: Dict[str, Any]) -> Response:
        url = f"{self.base_url}{path}"
        return requests.put(url, headers=self.headers, data=json.dumps(json_body), timeout=self.timeouts)


@shared_task(name="oracle.v2_reindex_subject", bind=True)
def v2_reindex_subject(self, payload: dict[str, Any]) -> dict[str, Any]:
    settings = get_settings()
    subject_id = str(payload.get("subjectId") or "").strip()
    if not subject_id:
        logger.error("v2_reindex_subject received invalid payload: %r", payload)
        return {"status": "error", "reason": "invalid payload"}

    http = _Http(settings.CORE_SERVICE_URL, settings.INTERNAL_API_KEY, settings.http_timeouts)
    engine = ConceptualEngine(model_name=settings.ENGINE_MODEL_NAME, dim=settings.ENGINE_DIM)

    logger.info("[V2] Reindex start subjectId=%s", subject_id)

    # 1) List documents for subject
    try:
        resp = http.get(f"/internal/subjects/{subject_id}/documents")
    except Exception:
        logger.exception("[V2] Failed to list documents (network)")
        raise

    if resp.status_code == 401:
        logger.error("[V2] Unauthorized to core-service internal API; check INTERNAL_API_KEY")
        raise RuntimeError("Unauthorized")
    if resp.status_code == 404:
        logger.warning("[V2] Subject not found; skipping subjectId=%s", subject_id)
        return {"status": "skipped", "reason": "subject not found", "subjectId": subject_id}
    if _is_transient_http(resp):
        logger.error("[V2] Core-service 5xx listing documents; will rely on retry policy")
        raise RuntimeError("Core-service transient error")
    resp.raise_for_status()

    docs: List[Dict[str, Any]] = resp.json() or []
    total_docs = len(docs)
    docs_ok = 0
    batches_sent = 0
    total_chunks = 0

    for i, d in enumerate(docs):
        doc_id = str(d.get("id") or "").strip()
        s3_key = str(d.get("s3Key") or "").strip()
        if not doc_id or not s3_key:
            logger.warning("[V2] Skipping invalid doc record: %r", d)
            continue

        try:
            pdf_bytes = download_to_bytes(settings.S3_BUCKET or "", s3_key)
        except Exception as e:
            # Classify known S3 errors by message (lightweight)
            msg = str(e)
            if any(tok in msg for tok in ("NoSuchKey", "NoSuchBucket", "AccessDenied")):
                logger.warning("[V2] Permanent S3 error for key=%s: %s", s3_key, msg)
                continue
            logger.exception("[V2] S3 transient error for key=%s", s3_key)
            raise

        try:
            result = engine.chunk_and_embed(pdf_bytes, doc_id)
        except Exception:
            logger.exception("[V2] Engine failed for documentId=%s", doc_id)
            continue

        chunks: List[Dict[str, Any]] = result.get("chunks") or []
        model = result.get("model") or settings.ENGINE_MODEL_NAME
        dim = int(result.get("dim") or settings.ENGINE_DIM)
        if not chunks:
            logger.info("[V2] No chunks produced for documentId=%s; skipping", doc_id)
            continue

        for batch in _chunkify(chunks, settings.REINDEX_BATCH_SIZE):
            payload_json = {
                "documentId": doc_id,
                "model": model,
                "dim": dim,
                "chunks": [
                    {
                        "index": c.get("index"),
                        "text": c.get("text"),
                        "embedding": c.get("embedding"),
                        "tokens": c.get("tokens"),
                    }
                    for c in batch
                ],
            }
            try:
                put_resp = http.put(f"/internal/reindex/{subject_id}/chunks", payload_json)
            except Exception:
                logger.exception("[V2] Network error PUT chunks for documentId=%s", doc_id)
                raise

            if put_resp.status_code in (400, 404):
                logger.error(
                    "[V2] Permanent rejection from core-service (status=%s) for documentId=%s",
                    put_resp.status_code,
                    doc_id,
                )
                # Drop this batch and move on
                continue
            if put_resp.status_code == 401:
                logger.error("[V2] Unauthorized PUT chunks; check INTERNAL_API_KEY")
                raise RuntimeError("Unauthorized")
            if _is_transient_http(put_resp):
                logger.error("[V2] Core-service 5xx on PUT chunks; retry policy will re-raise")
                raise RuntimeError("Core-service transient error")
            put_resp.raise_for_status()

            batches_sent += 1
            total_chunks += len(batch)

        docs_ok += 1
        logger.info(
            "[V2] Reindexed document %s/%s documentId=%s batches_sent=%s",
            i + 1,
            total_docs,
            doc_id,
            batches_sent,
        )
        # Trigger asynchronous subject-level topic aggregation after each document
        try:
            # Avoid import cycles by using send_task
            self.app.send_task(
                "oracle.aggregate_subject_topics",
                args=[{"subjectId": subject_id}],
                queue="celery",
            )
            logger.info("[V2] Enqueued aggregate_subject_topics for subjectId=%s", subject_id)
        except Exception:
            logger.exception("[V2] Failed to enqueue aggregate_subject_topics for subjectId=%s", subject_id)

    logger.info(
        "[V2] Reindex completed subjectId=%s docs_ok=%s/%s total_chunks=%s batches=%s",
        subject_id,
        docs_ok,
        total_docs,
        total_chunks,
        batches_sent,
    )

    return {
        "status": "ok",
        "subjectId": subject_id,
        "docs": {"ok": docs_ok, "total": total_docs},
        "chunks": total_chunks,
        "batches": batches_sent,
    }
