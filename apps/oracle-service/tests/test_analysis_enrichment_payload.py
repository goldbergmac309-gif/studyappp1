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


def test_enrichment_payload_marks_nontext_solutionprofile(monkeypatch):
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

    # Reset settings cache
    monkeypatch.setattr(cfg, "_SETTINGS", None, raising=False)

    # Compose text with various signals
    text = (
        "Question 1: Calculate NPV for the following cash flows. [10 marks]\n"
        "Question 2: Perform a t-test on the given dataset. [8 marks]\n"
        "Question 3: Using Bayes theorem, compute posterior. [7 marks]\n"
        "Question 4: At break-even point, compute contribution margin. [6 marks]\n"
        "Question 5: Use Dijkstra to find MST (see the following figure). [12 marks]\n"
        "Question 6: Define entropy. [5 marks]\n"
        "Question 7: Compare bias and variance. [5 marks]\n"
    )

    pdf_bytes = make_pdf_bytes(text)
    key = "samples/enrichment.pdf"

    with mock_aws():
        s3 = boto3.client("s3", region_name=region)
        s3.create_bucket(Bucket=bucket)
        s3.put_object(Bucket=bucket, Key=key, Body=pdf_bytes)

        doc_id = "doc-enrich-1"
        subject_id = "sub-1"

        with requests_mock.Mocker() as m:
            # Analysis callback
            m.put(f"{core_url}/internal/documents/{doc_id}/analysis", status_code=200, json={"ok": True})
            # Context to allow posting questions
            m.get(
                f"{core_url}/internal/documents/{doc_id}/context",
                status_code=200,
                json={"subjectId": subject_id},
            )
            # Structure upsert
            m.put(f"{core_url}/internal/documents/{doc_id}/structure", status_code=200, json={"ok": True})
            # Questions upsert (capture)
            m.put(f"{core_url}/internal/documents/{doc_id}/questions", status_code=200, json={"ok": True})

            _ = process_document.run({"documentId": doc_id, "s3Key": key, "userId": "user-x"})

            # Find the questions request
            q_req = None
            for req in m.request_history:
                if req.method == "PUT" and req.url.endswith(f"/internal/documents/{doc_id}/questions"):
                    q_req = req
                    break
            assert q_req is not None, "Questions upsert was not called"

            body = json.loads(q_req.text or "{}")
            questions = body.get("questions", [])
            assert isinstance(questions, list) and len(questions) >= 5

            # marksConfidence should be 1.0 when marks are present
            assert any(q.get("marks") and q.get("marksConfidence") == 1.0 for q in questions)

            # hasNonText detected (figure/math tokens present)
            assert any(q.get("hasNonText") is True for q in questions)

            # solutionProfile domains detected across prompts
            domains = {q.get("solutionProfile", {}).get("domain") for q in questions if q.get("solutionProfile")}
            assert {"finance", "statistics", "probability", "accounting", "math_cs"}.issubset(domains)

            # assessmentMode should be one of allowed values
            allowed = {"OBJECTIVE", "CALCULATION", "APPLICATION", "DEFINITION", "COMPARISON", "THEORY", "UNKNOWN"}
            assert all(q.get("assessmentMode") in allowed for q in questions if q.get("assessmentMode"))
