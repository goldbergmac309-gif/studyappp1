import json
import config as cfg
import requests_mock

from workers.topics_worker import aggregate_subject_topics


def test_topics_worker_end_to_end(monkeypatch):
    core_url = "http://core.local:3000"
    api_key = "secret-key"

    monkeypatch.setenv("CORE_SERVICE_URL", core_url)
    monkeypatch.setenv("INTERNAL_API_KEY", api_key)
    monkeypatch.setenv("ENGINE_VERSION", "oracle-vtest")

    # Reset cached settings
    monkeypatch.setattr(cfg, "_SETTINGS", None, raising=False)

    subject_id = "sub-topics-1"

    chunks = [
        {"id": "c1", "documentId": "d1", "text": "linear algebra matrices vectors"},
        {"id": "c2", "documentId": "d2", "text": "probability distributions bayes theorem"},
        {"id": "c3", "documentId": "d1", "text": "matrix decomposition eigenvalues"},
    ]

    with requests_mock.Mocker() as m:
        m.get(
            f"{core_url}/internal/subjects/{subject_id}/chunks",
            status_code=200,
            json=chunks,
        )
        m.put(
            f"{core_url}/internal/subjects/{subject_id}/topics",
            status_code=200,
            json={"status": "ok"},
        )

        out = aggregate_subject_topics.run({"subjectId": subject_id})
        assert out.get("status") == "ok"
        assert out.get("subjectId") == subject_id

        # Validate the PUT payload shape
        req = m.request_history[-1]
        assert req.method == "PUT"
        assert req.headers.get("X-Internal-API-Key") == api_key
        body = json.loads(req.text or "{}")
        assert body.get("engineVersion") == "oracle-vtest"
        topics = body.get("topics")
        assert isinstance(topics, list)
        assert len(topics) >= 1
