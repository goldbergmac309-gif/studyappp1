import json
from typing import Any, List

import boto3
import config as cfg
import requests_mock
from moto import mock_aws

from app.core.providers import LocalProvider
from workers.v2_reindex_worker import v2_reindex_subject


def test_local_provider_projects_to_dim(monkeypatch):
    # Prepare a LocalProvider with dummy model
    lp = LocalProvider(model_name="fake-model", dim=1536)

    class DummyModel:
        def encode(self, texts: List[str], normalize_embeddings: bool = True):  # noqa: D401
            # Return short vectors to force projection
            return [[0.1] * 10 for _ in texts]

        def get_sentence_embedding_dimension(self) -> int:  # optional
            return 10

    def fake_load_model(self):
        object.__setattr__(self, "_model", DummyModel())
        object.__setattr__(self, "_actual_dim", 10)

    monkeypatch.setattr(LocalProvider, "_load_model", fake_load_model)

    texts = ["alpha", "beta", "gamma"]
    embs = lp.embed_texts(texts)
    assert len(embs) == len(texts)
    assert all(len(v) == 1536 for v in embs)


def test_v2_worker_uses_local_provider_and_projects(monkeypatch):
    # --- Arrange environment ---
    bucket = "test-bucket"
    region = "us-east-1"
    core_url = "http://core.local:3000"
    api_key = "secret-key"

    monkeypatch.setenv("AWS_REGION", region)
    monkeypatch.setenv("S3_BUCKET", bucket)
    monkeypatch.setenv("AWS_S3_ENDPOINT", "")  # ensure moto intercepts
    monkeypatch.setenv("CORE_SERVICE_URL", core_url)
    monkeypatch.setenv("INTERNAL_API_KEY", api_key)
    monkeypatch.setenv("ENGINE_PROVIDER", "local")
    monkeypatch.setenv("ENGINE_MODEL_NAME", "fake-model")
    monkeypatch.setenv("ENGINE_DIM", "1536")

    # Reset cached settings
    monkeypatch.setattr(cfg, "_SETTINGS", None, raising=False)

    # Monkeypatch extract_text_smart used by conceptual_engine to avoid heavy work
    import app.core.conceptual_engine as engine_mod

    monkeypatch.setattr(engine_mod, "extract_text_smart", lambda _b: ("A. B.", 1, False))

    # Make LocalProvider use a dummy model with short-dim outputs
    class DummyModel:
        def encode(self, texts: List[str], normalize_embeddings: bool = True):
            return [[0.2] * 10 for _ in texts]

        def get_sentence_embedding_dimension(self) -> int:  # optional
            return 10

    def fake_load_model(self):
        object.__setattr__(self, "_model", DummyModel())
        object.__setattr__(self, "_actual_dim", 10)

    monkeypatch.setattr(LocalProvider, "_load_model", fake_load_model)

    with mock_aws():
        # Create S3 and a dummy object referenced by documents list
        s3 = boto3.client("s3", region_name=region)
        s3.create_bucket(Bucket=bucket)
        s3.put_object(Bucket=bucket, Key="samples/sample.pdf", Body=b"dummy")

        subject_id = "sub-456"
        doc_id = "doc-456"

        with requests_mock.Mocker() as m:
            m.get(
                f"{core_url}/internal/subjects/{subject_id}/documents",
                status_code=200,
                json=[{"id": doc_id, "s3Key": "samples/sample.pdf"}],
            )
            m.put(
                f"{core_url}/internal/reindex/{subject_id}/chunks",
                status_code=200,
                json={"status": "ok"},
            )

            result = v2_reindex_subject.run({"subjectId": subject_id})
            assert result.get("status") == "ok"

            # Inspect the last PUT payload to validate dimension and embedding size
            req = m.request_history[-1]
            assert req.method == "PUT"
            body = json.loads(getattr(req, "text", "{}"))
            assert body.get("dim") == 1536
            chunks = body.get("chunks", [])
            assert isinstance(chunks, list) and len(chunks) >= 1
            # Every embedding should be projected to 1536
            assert all(len(c.get("embedding", [])) == 1536 for c in chunks)
