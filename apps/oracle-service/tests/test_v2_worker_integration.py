import json
from typing import Any

import boto3
import config as cfg
import requests_mock
from moto import mock_aws

from workers.v2_reindex_worker import v2_reindex_subject


def test_v2_reindex_end_to_end_with_mocks(monkeypatch):
    # --- Arrange environment ---
    bucket = "test-bucket"
    region = "us-east-1"
    core_url = "http://core.local:3000"
    api_key = "secret-key"

    monkeypatch.setenv("AWS_REGION", region)
    monkeypatch.setenv("S3_BUCKET", bucket)
    # Force default AWS endpoint so moto can intercept; clear any local MinIO endpoint from the host env
    monkeypatch.setenv("AWS_S3_ENDPOINT", "")
    monkeypatch.setenv("CORE_SERVICE_URL", core_url)
    monkeypatch.setenv("INTERNAL_API_KEY", api_key)
    monkeypatch.setenv("ENGINE_MODEL_NAME", "stub-miniLM")
    monkeypatch.setenv("ENGINE_DIM", "1536")
    monkeypatch.setenv("REINDEX_BATCH_SIZE", "250")

    # Reset cached settings to pick up env vars
    monkeypatch.setattr(cfg, "_SETTINGS", None, raising=False)

    # Monkeypatch engine to return deterministic chunks
    def fake_chunk_and_embed(_self: Any, _pdf_bytes: bytes, _doc_id: str):
        return {
            "model": "stub-miniLM",
            "dim": 1536,
            "chunks": [
                {"index": 0, "text": "A", "embedding": [0.0] * 1536, "tokens": 1},
                {"index": 1, "text": "B", "embedding": [0.1] * 1536, "tokens": 1},
                {"index": 2, "text": "C", "embedding": [0.2] * 1536, "tokens": 1},
            ],
        }

    import app.core.conceptual_engine as engine_mod

    monkeypatch.setattr(engine_mod.ConceptualEngine, "chunk_and_embed", fake_chunk_and_embed)

    with mock_aws():
        # Create S3 bucket and a dummy object (not actually used by stubbed engine)
        s3 = boto3.client("s3", region_name=region)
        s3.create_bucket(Bucket=bucket)
        s3.put_object(Bucket=bucket, Key="samples/sample.pdf", Body=b"dummy")

        # Mock core-service internal APIs
        subject_id = "sub-123"
        doc_id = "doc-123"
        with requests_mock.Mocker() as m:
            # GET documents list
            m.get(
                f"{core_url}/internal/subjects/{subject_id}/documents",
                status_code=200,
                json=[{"id": doc_id, "s3Key": "samples/sample.pdf"}],
            )
            # PUT chunks
            m.put(
                f"{core_url}/internal/reindex/{subject_id}/chunks",
                status_code=200,
                json={"status": "ok"},
            )

            # --- Act ---
            result = v2_reindex_subject.run({"subjectId": subject_id})

            # --- Assert ---
            assert result.get("status") == "ok"
            assert result.get("subjectId") == subject_id
            assert result.get("chunks") == 3
            assert result.get("batches") == 1

            # Verify HTTP calls
            assert m.called
            # 1 GET + 1 PUT
            assert m.call_count == 2
            # Check headers on last request (PUT)
            req = m.request_history[-1]
            assert req.method == "PUT"
            assert req.headers.get("X-Internal-API-Key") == api_key
            # Validate body shape
            body = json.loads(req.text or "{}")
            assert body["documentId"] == doc_id
            assert body["dim"] == 1536
            assert isinstance(body["chunks"], list) and len(body["chunks"]) == 3
