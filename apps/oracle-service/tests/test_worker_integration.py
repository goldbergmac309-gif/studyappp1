import io

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


def test_process_document_end_to_end_with_mocks(monkeypatch):
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

    sample_text = (
        "machine learning enables machines to learn from data. "
        "neural networks are used in deep learning."
    )
    pdf_bytes = make_pdf_bytes(sample_text)
    key = "samples/sample.pdf"

    with mock_aws():
        # Create S3 bucket and upload sample PDF
        s3 = boto3.client("s3", region_name=region)
        s3.create_bucket(Bucket=bucket)
        s3.put_object(Bucket=bucket, Key=key, Body=pdf_bytes)

        # Mock core-service internal callback
        doc_id = "doc-123"
        url = f"{core_url}/internal/documents/{doc_id}/analysis"
        with requests_mock.Mocker() as m:
            m.put(url, status_code=200, json={"ok": True})

            # --- Act ---
            result = process_document.run(
                {
                    "documentId": doc_id,
                    "s3Key": key,
                    "userId": "user-1",
                }
            )

            # --- Assert HTTP call ---
            assert m.called
            assert m.call_count == 1
            req = m.request_history[0]
            assert req.method == "PUT"
            assert req.headers.get("X-Internal-API-Key") == api_key

            import json

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
            assert "resultPayload" in body
            rp = body["resultPayload"]
            assert "keywords" in rp and isinstance(rp["keywords"], list)
            # Ensure at least one expected term is present
            terms = [k.get("term") for k in rp["keywords"]]
            assert any("machine" in t for t in terms)
            assert any("learning" in t for t in terms)
            # Metrics sanity
            assert rp.get("metrics", {}).get("pages") == 1
            assert rp.get("metrics", {}).get("textLength", 0) > 0

            # Task result
            assert result.get("status") == "ok"
            assert result.get("documentId") == doc_id
