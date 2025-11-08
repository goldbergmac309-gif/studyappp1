from __future__ import annotations

import json
import logging
from typing import Any, Dict, List

import requests
from celery import shared_task
from requests import Response
from requests.exceptions import ConnectionError as ReqConnectionError, Timeout as ReqTimeout
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.core.topics import compute_subject_topics
from config import get_settings
from utils.internal_api import InternalApi

logger = logging.getLogger(__name__)


def _is_transient_http(resp: Response) -> bool:
    return 500 <= resp.status_code < 600


@retry(
    retry=retry_if_exception_type((ReqConnectionError, ReqTimeout)),
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=1, min=1, max=30),
    reraise=True,
)
def _api_get(api: InternalApi, path: str) -> Response:
    return api.get(path)

@retry(
    retry=retry_if_exception_type((ReqConnectionError, ReqTimeout)),
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=1, min=1, max=30),
    reraise=True,
)
def _api_put(api: InternalApi, path: str, json_body: Dict[str, Any]) -> Response:
    return api.put(path, json_body)


@shared_task(name="oracle.aggregate_subject_topics")
def aggregate_subject_topics(payload: dict[str, Any] | None = None) -> dict[str, Any]:
    settings = get_settings()
    subject_id = str((payload or {}).get("subjectId") or "").strip()
    if not subject_id:
        logger.error("aggregate_subject_topics received invalid payload: %r", payload)
        return {"status": "error", "reason": "invalid payload"}

    api = InternalApi(
        settings.CORE_SERVICE_URL,
        settings.INTERNAL_API_SECRET,
        default_timeout=max(settings.http_timeouts) if isinstance(settings.http_timeouts, (list, tuple)) else 30.0,
        legacy_api_key=getattr(settings, "INTERNAL_API_KEY", None),
    )

    # 1) Fetch all chunks for subject
    try:
        resp = _api_get(api, f"/internal/subjects/{subject_id}/chunks")
    except Exception:
        logger.exception("[Topics] Failed to list chunks (network)")
        raise

    if resp.status_code == 401:
        logger.error("[Topics] Unauthorized to core-service internal API; check INTERNAL_API_KEY")
        raise RuntimeError("Unauthorized")
    if resp.status_code == 404:
        logger.warning("[Topics] Subject not found; skipping subjectId=%s", subject_id)
        return {"status": "skipped", "reason": "subject not found", "subjectId": subject_id}
    if _is_transient_http(resp):
        logger.error("[Topics] Core-service 5xx listing chunks; will rely on retry policy")
        raise RuntimeError("Core-service transient error")
    resp.raise_for_status()

    chunks: List[Dict[str, Any]] = resp.json() or []
    if not chunks:
        logger.info("[Topics] No chunks for subjectId=%s; clearing topics", subject_id)
        topics: List[Dict[str, Any]] = []
    else:
        # 2) Compute topics from chunk texts
        records = [
            {"text": c.get("text", ""), "documentId": c.get("documentId")}
            for c in chunks
            if isinstance(c.get("text"), str) and c.get("text").strip()
        ]
        topics = compute_subject_topics(records)

    # 3) Upsert topics to core-service
    try:
        put_payload = {"engineVersion": settings.ENGINE_VERSION, "topics": topics}
        up = _api_put(api, f"/internal/subjects/{subject_id}/topics", put_payload)
        if 200 <= up.status_code < 300:
            logger.info("[Topics] Upserted topics subjectId=%s count=%s", subject_id, len(topics))
        else:
            logger.warning("[Topics] Upsert failed status=%s body=%s", up.status_code, up.text)
    except Exception:
        logger.exception("[Topics] Upsert failed")
        raise

    return {"status": "ok", "subjectId": subject_id, "topics": len(topics)}
