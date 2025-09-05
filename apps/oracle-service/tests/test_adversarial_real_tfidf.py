import io
import json

import boto3
import fitz  # PyMuPDF
import requests_mock
from moto import mock_aws

import config as cfg
from workers.analysis_worker import process_document


def make_pdf_bytes(text: str) -> bytes:
    buf = io.BytesIO()
    with fitz.open() as doc:
        page = doc.new_page(width=595, height=842)
        page.insert_text((72, 72), text)
        doc.save(buf)
    return buf.getvalue()


def _run_pipeline_and_capture_keywords(monkeypatch, text: str):
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

    pdf_bytes = make_pdf_bytes(text)
    key = "samples/sample.pdf"

    with mock_aws():
        # Create S3 bucket and upload sample PDF
        s3 = boto3.client("s3", region_name=region)
        s3.create_bucket(Bucket=bucket)
        s3.put_object(Bucket=bucket, Key=key, Body=pdf_bytes)

        # Mock core-service internal callback
        doc_id = "doc-adv"
        url = f"{core_url}/internal/documents/{doc_id}/analysis"
        with requests_mock.Mocker() as m:
            m.put(url, status_code=200, json={"ok": True})

            # Act
            result = process_document.run({
                "documentId": doc_id,
                "s3Key": key,
                "userId": "user-1",
            })
            assert result.get("status") == "ok"

            # Inspect the request body that was sent
            raw = m.request_history[0].text
            body = json.loads(raw)
            rp = body["resultPayload"]
            keywords = [k.get("term") for k in rp.get("keywords", [])]
            return keywords


def test_sample_A_keywords(monkeypatch):
    text = "The primary focus of cellular biology is the mitochondrion."
    keywords = _run_pipeline_and_capture_keywords(monkeypatch, text)
    # Assert signal terms present
    assert any("mitochondrion" in t for t in keywords) or any(
        "cellular" in t for t in keywords
    )


def test_sample_B_keywords(monkeypatch):
    text = "Quantum electrodynamics is governed by complex equations."
    keywords = _run_pipeline_and_capture_keywords(monkeypatch, text)
    assert any("quantum" in t for t in keywords) or any(
        "electrodynamics" in t for t in keywords
    )
