from __future__ import annotations

import logging
from typing import Any

import requests
import json
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
from utils.pdf import extract_text_smart
from utils.s3 import download_to_bytes
from utils.structure import compute_document_meta
from utils.internal_api import InternalApi
from app.core.librarian import summarize_document, extract_questions

logger = logging.getLogger(__name__)


def _validate_payload(payload: dict[str, Any]) -> tuple[str, str, str]:
    required = ("documentId", "s3Key", "userId")
    for key in required:
        if key not in payload or not isinstance(payload[key], str) or not payload[key].strip():
            raise ValueError(f"Invalid payload: missing or invalid '{key}'")
    return payload["documentId"], payload["s3Key"], payload["userId"]


def _post_structure_and_questions(
    api: InternalApi,
    document_id: str,
    structure: dict[str, Any],
    questions: list[dict[str, Any]],
) -> None:
    subject_id: str | None = None
    try:
        ctx = api.get(f"/internal/documents/{document_id}/context")
        if ctx.status_code == 200:
            data = ctx.json() or {}
            subject_id = data.get("subjectId")
        else:
            logger.warning(
                "Document context fetch failed status=%s for documentId=%s",
                ctx.status_code,
                document_id,
            )
    except Exception:
        logger.warning("Context lookup failed for documentId=%s", document_id, exc_info=True)

    try:
        api.put(
            f"/internal/documents/{document_id}/structure",
            {
                "schemaVersion": structure.get("schemaVersion"),
                "pageCount": structure.get("pageCount"),
                "ocrConfidence": structure.get("ocrConfidence"),
                "layout": structure.get("layout"),
                "outline": structure.get("outline"),
                "stats": structure.get("stats"),
            },
        )
    except Exception:
        logger.warning("Structure upsert failed for documentId=%s", document_id, exc_info=True)

    if subject_id and questions:
        try:
            api.put(
                f"/internal/documents/{document_id}/questions",
                {"subjectId": subject_id, "questions": [
                    {
                        "index": q["index"],
                        "prompt": q["prompt"],
                        "answer": q["answer"],
                        "marks": q["marks"],
                        "marksConfidence": q.get("marksConfidence", 0.9 if q.get("marks") is not None else None),
                        "hasNonText": q.get("hasNonText", any(tok in q["prompt"].lower() for tok in ["figure", "diagram", "graph", "chart", "table", "image", "plot", "see the following", "given the following figure"])),
                        "difficulty": q["difficulty"],
                        "assessmentMode": q["assessmentMode"],
                        "taxonomyPath": q["taxonomyPath"],
                        "solutionProfile": q.get("solutionProfile", 
                            {"domain": "math_cs", "pattern": "ALGO_OR_ANALYTIC"} if any(k in q["prompt"].lower() for k in ["dijkstra", "mst", "dynamic programming", "complexity", "big-o", "gauss", "fourier"]) 
                            else {"domain": "statistics", "pattern": "HYPOTHESIS_OR_REGRESSION"} if any(k in q["prompt"].lower() for k in ["t-test", "t test", "anova", "regression", "least squares", "p-value", "confidence interval"]) 
                            else {"domain": "finance", "pattern": "DISCOUNTED_CASH_FLOW"} if any(k in q["prompt"].lower() for k in ["npv", "irr", "discounted cash flow", "time value of money"]) 
                            else {"domain": "accounting", "pattern": "CVP_BREAK_EVEN"} if any(k in q["prompt"].lower() for k in ["break-even", "breakeven", "contribution margin", "cvp"]) 
                            else {"domain": "probability", "pattern": "BAYES_RULE"} if any(k in q["prompt"].lower() for k in ["bayes", "posterior", "prior probability"]) 
                            else None
                        ),
                        "meta": q["meta"],
                        "conceptHints": q["conceptHints"],
                    } for q in questions
                ]},
            )
        except Exception:
            logger.warning("Question upsert failed for documentId=%s", document_id, exc_info=True)


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

    api = InternalApi(
        settings.CORE_SERVICE_URL,
        settings.INTERNAL_API_SECRET,
        default_timeout=max(settings.http_timeouts) if isinstance(settings.http_timeouts, (list, tuple)) else 30.0,
        legacy_api_key=getattr(settings, "INTERNAL_API_KEY", None),
    )

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

    # 2) Extract text (with OCR fallback when density is low)
    try:
        force = bool(payload.get("forceOcr")) if isinstance(payload, dict) else False
        text, page_count, ocr_used = extract_text_smart(pdf_bytes, force=force)
    except Exception:
        logger.exception("Failed to extract text for documentId=%s; dropping", document_id)
        raise Ignore() from None

    # 3) TF-IDF top keywords + structure extraction
    try:
        keywords: list[tuple[str, float]] = top_keywords(text, top_k=20)
    except Exception:
        logger.exception("TF-IDF failed for documentId=%s; dropping", document_id)
        raise Ignore() from None

    structure = summarize_document(text, page_count, ocr_used)
    parsed_questions = extract_questions(text)

    def _has_non_text(prompt: str) -> bool:
        p = (prompt or "").lower()
        signals = [
            "figure", "diagram", "graph", "chart", "table", "image", "plot",
            "see the following", "given the following figure",
        ]
        math_tokens = ["∑", "√", "π", "≈", "≃", "∞", "∫", "∆", "α", "β", "\n="]
        if any(tok in p for tok in signals):
            return True
        if any(tok in prompt for tok in math_tokens):
            return True
        # Heuristic: many non-letters
        non_alpha = sum(1 for ch in prompt if not ch.isalpha() and not ch.isspace())
        return non_alpha > max(20, len(prompt) * 0.15)

    def _infer_solution_profile(prompt: str, mode: str | None) -> dict[str, Any] | None:
        t = (prompt or "").lower()
        # Finance
        if any(k in t for k in ["npv", "irr", "discounted cash flow", "time value of money"]):
            return {"domain": "finance", "pattern": "DISCOUNTED_CASH_FLOW"}
        # Statistics
        if any(k in t for k in ["t-test", "t test", "anova", "regression", "least squares", "p-value", "confidence interval"]):
            return {"domain": "statistics", "pattern": "HYPOTHESIS_OR_REGRESSION"}
        # Accounting
        if any(k in t for k in ["break-even", "breakeven", "contribution margin", "cvp"]):
            return {"domain": "accounting", "pattern": "CVP_BREAK_EVEN"}
        # Probability
        if any(k in t for k in ["bayes", "posterior", "prior probability"]):
            return {"domain": "probability", "pattern": "BAYES_RULE"}
        # Algorithms / Math
        if any(k in t for k in ["dijkstra", "mst", "dynamic programming", "complexity", "big-o", "gauss", "fourier"]):
            return {"domain": "math_cs", "pattern": "ALGO_OR_ANALYTIC"}
        return None

    question_payloads = []
    for q in parsed_questions:
        mc = 1.0 if q.marks is not None else None
        hn = _has_non_text(q.prompt)
        sp = _infer_solution_profile(q.prompt, q.assessment_mode)
        question_payloads.append({
            "index": q.index,
            "prompt": q.prompt,
            "answer": None,
            "marks": q.marks,
            "marksConfidence": mc,
            "hasNonText": hn,
            "difficulty": None,
            "assessmentMode": q.assessment_mode,
            "taxonomyPath": q.taxonomy_path,
            "solutionProfile": sp,
            "meta": q.meta,
            "conceptHints": q.concept_hints,
        })
    logger.info(
        "Librarian extracted %s questions for documentId=%s (pages=%s)",
        len(question_payloads),
        document_id,
        page_count,
    )

    result_payload = {
        "keywords": [{"term": t, "score": float(s)} for t, s in keywords],
        "metrics": {"pages": int(page_count), "textLength": int(len(text)), "ocrUsed": bool(ocr_used)},
        "structure": {
            "outlinePreview": structure.get("outline", [])[:5],
            "questionCount": len(question_payloads),
        },
    }

    # 4) PUT to core-service internal endpoint (signed via InternalApi)
    path = f"/internal/documents/{document_id}/analysis"
    body_json = {
        "engineVersion": settings.ENGINE_VERSION,
        "resultPayload": result_payload,
    }
    try:
        resp = api.put(path, body_json)
    except requests.exceptions.RequestException:
        logger.exception(
            "HTTP request to core-service failed for documentId=%s; will retry", document_id
        )
        raise

    if 200 <= resp.status_code < 300:
        logger.info("Successfully posted analysis for documentId=%s", document_id)
        # 4b) Optionally post meta (best-effort)
        try:
            if bool(getattr(settings, "ENABLE_META_CALLBACK", False)):
                meta = compute_document_meta(text)
                meta_path = f"/internal/documents/{document_id}/meta"
                _ = api.put(meta_path, {"meta": meta})
        except Exception:
            logger.warning("Meta callback failed for documentId=%s (non-fatal)", document_id)

        # 5) Upsert structure + questions (best effort)
        _post_structure_and_questions(
            api,
            document_id,
            structure,
            question_payloads,
        )

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
