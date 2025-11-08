import json
import io

import boto3
import config as cfg
import fitz  # PyMuPDF
import requests_mock
from moto import mock_aws

from workers.analysis_worker import process_document


def make_image_like_pdf_bytes() -> bytes:
    # Create a blank page (very low text density by default); we won't rely on OCR stack
    # because we'll monkeypatch extract_text_smart. This is mostly to supply valid PDF bytes.
    buf = io.BytesIO()
    with fitz.open() as doc:
        _ = doc.new_page(width=595, height=842)
        doc.save(buf)
    return buf.getvalue()


def test_process_document_force_ocr_sets_ocr_used_true(monkeypatch):
    # --- Arrange environment ---
    bucket = "test-bucket"
    region = "us-east-1"
    core_url = "http://core.local:3000"
    api_key = "secret-key"
    engine = "oracle-vtest"

    monkeypatch.setenv("AWS_REGION", region)
    monkeypatch.setenv("S3_BUCKET", bucket)
    monkeypatch.setenv("CORE_SERVICE_URL", core_url)
    monkeypatch.setenv("INTERNAL_API_KEY", api_key)
    monkeypatch.setenv("ENGINE_VERSION", engine)

    # Reset cached settings to pick up env vars
    monkeypatch.setattr(cfg, "_SETTINGS", None, raising=False)

    pdf_bytes = make_image_like_pdf_bytes()
    key = "samples/img-like.pdf"

    # Monkeypatch extract_text_smart to assert force=True and mark ocr_used True
    def fake_extract_text_smart(data: bytes, **kwargs):
        assert kwargs.get("force") is True
        return ("OCR TEXT", 1, True)
    # Patch the symbol actually used by the worker module
    monkeypatch.setattr("workers.analysis_worker.extract_text_smart", fake_extract_text_smart)

    with mock_aws():
        # Create S3 bucket and upload sample PDF
        s3 = boto3.client("s3", region_name=region)
        s3.create_bucket(Bucket=bucket)
        s3.put_object(Bucket=bucket, Key=key, Body=pdf_bytes)

        # Mock core-service internal callbacks
        doc_id = "doc-ocr-1"
        url = f"{core_url}/internal/documents/{doc_id}/analysis"
        url_ctx = f"{core_url}/internal/documents/{doc_id}/context"
        url_struct = f"{core_url}/internal/documents/{doc_id}/structure"
        with requests_mock.Mocker() as m:
            m.put(url, status_code=200, json={"ok": True})
            m.get(url_ctx, status_code=200, json={})
            m.put(url_struct, status_code=200, json={"ok": True})

            # --- Act ---
            result = process_document.run(
                {
                    "documentId": doc_id,
                    "s3Key": key,
                    "userId": "user-1",
                    "forceOcr": True,
                }
            )

            # --- Assert HTTP call ---
            assert m.called
            req = next(r for r in m.request_history if r.url == url)
            assert req.method == "PUT"
            assert req.headers.get("X-Internal-API-Key") == api_key

            raw = getattr(req, "text", None)
            if not raw:
                body_bytes = getattr(req, "body", b"")
                raw = (
                    body_bytes.decode("utf-8")
                    if isinstance(body_bytes, (bytes, bytearray))
                    else str(body_bytes)
                )
            body = json.loads(raw)
            assert body.get("engineVersion") == engine
            rp = body.get("resultPayload", {})
            assert rp.get("metrics", {}).get("ocrUsed") is True
            assert rp.get("metrics", {}).get("textLength", 0) > 0

            # Task result
            assert result.get("status") == "ok"
            assert result.get("documentId") == doc_id
