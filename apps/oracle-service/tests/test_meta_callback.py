import io
import json

import boto3
import config as cfg
import fitz  # PyMuPDF
import requests_mock
from moto import mock_aws

from workers.analysis_worker import process_document


def make_pdf_bytes(text: str) -> bytes:
    buf = io.BytesIO()
    with fitz.open() as doc:
        page = doc.new_page(width=595, height=842)
        page.insert_text((72, 72), text)
        doc.save(buf)
    return buf.getvalue()


def test_process_document_posts_meta_when_enabled(monkeypatch):
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
    monkeypatch.setenv("ENABLE_META_CALLBACK", "true")

    # Reset cached settings to pick up env vars
    monkeypatch.setattr(cfg, "_SETTINGS", None, raising=False)

    sample_text = (
        "SYLLABUS for Machine Learning. QUESTION 1: ... QUESTION 2: ... QUESTION 3: ..."
    )
    pdf_bytes = make_pdf_bytes(sample_text)
    key = "samples/sample.pdf"

    with mock_aws():
        # Create S3 bucket and upload sample PDF
        s3 = boto3.client("s3", region_name=region)
        s3.create_bucket(Bucket=bucket)
        s3.put_object(Bucket=bucket, Key=key, Body=pdf_bytes)

        # Mock core-service internal callbacks
        doc_id = "doc-meta-123"
        url_analysis = f"{core_url}/internal/documents/{doc_id}/analysis"
        url_meta = f"{core_url}/internal/documents/{doc_id}/meta"
        url_ctx = f"{core_url}/internal/documents/{doc_id}/context"
        url_struct = f"{core_url}/internal/documents/{doc_id}/structure"
        with requests_mock.Mocker() as m:
            m.put(url_analysis, status_code=200, json={"ok": True})
            m.put(url_meta, status_code=200, json={"ok": True})
            m.get(url_ctx, status_code=200, json={})
            m.put(url_struct, status_code=200, json={"ok": True})

            # --- Act ---
            result = process_document.run(
                {
                    "documentId": doc_id,
                    "s3Key": key,
                    "userId": "user-1",
                }
            )

            # --- Assert HTTP calls ---
            assert m.called
            # Validate meta body
            assert any(r.url == url_meta for r in m.request_history)
            meta_req = next(r for r in m.request_history if r.url == url_meta)
            meta_body = json.loads(meta_req.text or "{}")
            meta = meta_body.get("meta", {})
            assert isinstance(meta, dict)
            assert meta.get("detectedResourceType") in {"SYLLABUS", "EXAM", "PRACTICE_SET", "LECTURE_NOTES", "TEXTBOOK", "NOTES", "OTHER"}
            assert isinstance(meta.get("headingCount"), int)
            assert isinstance(meta.get("detectedQuestions"), bool)

            # Task result
            assert result.get("status") == "ok"
            assert result.get("documentId") == doc_id
