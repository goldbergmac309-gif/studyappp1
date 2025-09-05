from __future__ import annotations

import logging
from typing import Any

import requests
from botocore.exceptions import (
    ClientError,
    ConnectTimeoutError,
    EndpointConnectionError,
    ReadTimeoutError,
)
from celery import shared_task
from celery.exceptions import Ignore

from config import get_settings
from utils.nlp import top_keywords
from utils.pdf import extract_text
from utils.s3 import download_to_bytes

logger = logging.getLogger(__name__)


def _validate_payload(payload: dict[str, Any]) -> tuple[str, str, str]:
    required = ("documentId", "s3Key", "userId")
    for key in required:
        if key not in payload or not isinstance(payload[key], str) or not payload[key].strip():
            raise ValueError(f"Invalid payload: missing or invalid '{key}'")
    return payload["documentId"], payload["s3Key"], payload["userId"]


@shared_task(
    name="oracle.process_document",
    bind=True,
    autoretry_for=(
        requests.exceptions.RequestException,
        EndpointConnectionError,
        ReadTimeoutError,
        ConnectTimeoutError,
    ),
    retry_backoff=True,
    retry_jitter=True,
    retry_backoff_max=60,
    retry_kwargs={"max_retries": 5},
)
def process_document(self, payload: dict[str, Any]) -> dict[str, Any]:
    settings = get_settings()

    try:
        document_id, s3_key, user_id = _validate_payload(payload)
    except Exception as e:
        logger.error("Rejecting job due to invalid payload: %s | payload=%s", e, payload)
        raise Ignore()

    bucket = settings.S3_BUCKET
    if not bucket:
        logger.error("S3_BUCKET is not configured; cannot process documentId=%s", document_id)
        # Configuration error -> retry limited times then give up
        raise RuntimeError("S3_BUCKET not configured")

    logger.info(
        "Starting processing documentId=%s s3Key=%s userId=%s", document_id, s3_key, user_id
    )

    # 1) Download from S3
    try:
        pdf_bytes = download_to_bytes(bucket, s3_key)
    except ClientError as e:
        code = (
            getattr(e, "response", {}).get("Error", {}).get("Code")
            if hasattr(e, "response")
            else None
        )
        if code in {"NoSuchKey", "NoSuchBucket", "AccessDenied"}:
            logger.error(
                "Permanent S3 error (%s) for documentId=%s key=%s; dropping",
                code,
                document_id,
                s3_key,
            )
            raise Ignore() from e
        logger.exception("S3 ClientError for documentId=%s; will retry", document_id)
        raise
    except (EndpointConnectionError, ReadTimeoutError, ConnectTimeoutError):
        logger.warning("Transient S3 connectivity issue for documentId=%s; will retry", document_id)
        raise
    except Exception:
        logger.exception(
            "Unexpected S3 error for documentId=%s; dropping as permanent", document_id
        )
        raise Ignore() from None

    # 2) Extract text
    try:
        text, page_count = extract_text(pdf_bytes)
    except Exception:
        logger.exception("Failed to extract text for documentId=%s; dropping", document_id)
        raise Ignore() from None

    # 3) TF-IDF top keywords
    try:
        keywords: list[tuple[str, float]] = top_keywords(text, top_k=20)
    except Exception:
        logger.exception("TF-IDF failed for documentId=%s; dropping", document_id)
        raise Ignore() from None

    result_payload = {
        "keywords": [{"term": t, "score": float(s)} for t, s in keywords],
        "metrics": {"pages": int(page_count), "textLength": int(len(text))},
    }

    # 4) PUT to core-service internal endpoint
    url = f"{settings.CORE_SERVICE_URL.rstrip('/')}/internal/documents/{document_id}/analysis"
    headers = {
        "X-Internal-API-Key": settings.INTERNAL_API_KEY,
        "Content-Type": "application/json",
    }

    try:
        resp = requests.put(
            url,
            json={
                "engineVersion": settings.ENGINE_VERSION,
                "resultPayload": result_payload,
            },
            headers=headers,
            timeout=settings.http_timeouts,
        )
    except requests.exceptions.RequestException:
        logger.exception(
            "HTTP request to core-service failed for documentId=%s; will retry", document_id
        )
        raise

    if 200 <= resp.status_code < 300:
        logger.info("Successfully posted analysis for documentId=%s", document_id)
        return {"status": "ok", "documentId": document_id}

    # Non-2xx handling
    if resp.status_code in (400, 404, 409):
        logger.error(
            "Permanent callback failure status=%s for documentId=%s; body=%s",
            resp.status_code,
            document_id,
            resp.text,
        )
        raise Ignore()
    if resp.status_code == 401:
        # Misconfiguration (bad INTERNAL_API_KEY) -> retry according to policy
        logger.error("401 Unauthorized for documentId=%s; will retry", document_id)
        resp.raise_for_status()

    # Other statuses (e.g., 5xx) -> retry
    logger.error(
        "Transient callback failure status=%s for documentId=%s", resp.status_code, document_id
    )
    resp.raise_for_status()
