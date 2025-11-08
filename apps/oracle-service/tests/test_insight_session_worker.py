import json
import config as cfg
import requests_mock

from workers.insights_session_worker import process_insight_session


def test_insights_session_worker_with_local_summarizer(monkeypatch):
    core_url = "http://core.local:3000"
    api_key = "secret-key"

    monkeypatch.setenv("CORE_SERVICE_URL", core_url)
    monkeypatch.setenv("INTERNAL_API_KEY", api_key)
    # Enable consent + local LLM summarizer
    monkeypatch.setenv("AI_CONSENT", "true")
    monkeypatch.setenv("LLM_PROVIDER", "local")

    # Reset cached settings
    monkeypatch.setattr(cfg, "_SETTINGS", None, raising=False)

    subject_id = "sub-abc"
    session_id = "sess-123"
    doc_ids = ["doc-1", "doc-2"]

    chunks = [
        {"id": "c1", "documentId": "doc-1", "text": "linear algebra matrices vectors"},
        {"id": "c2", "documentId": "doc-2", "text": "probability distributions bayes theorem"},
        {"id": "c3", "documentId": "doc-3", "text": "ignored other subject doc"},
    ]

    with requests_mock.Mocker() as m:
        # GET questions for subject
        m.get(
            f"{core_url}/internal/subjects/{subject_id}/questions",
            status_code=200,
            json=[],
        )
        # GET all chunks for subject
        m.get(
            f"{core_url}/internal/subjects/{subject_id}/chunks",
            status_code=200,
            json=chunks,
        )
        # PUT concept graph upsert
        m.put(
            f"{core_url}/internal/subjects/{subject_id}/concept-graph",
            status_code=200,
            json={"status": "ok"},
        )
        # PUT insight version reporter events
        m.put(
            f"{core_url}/internal/subjects/{subject_id}/insight-versions",
            status_code=200,
            json={"versionId": "v-1"},
        )
        # PUT session update
        m.put(
            f"{core_url}/internal/subjects/{subject_id}/insight-sessions/{session_id}",
            status_code=200,
            json={"status": "ok"},
        )

        out = process_insight_session.run(
            {"subjectId": subject_id, "sessionId": session_id, "documentIds": doc_ids}
        )

        assert out.get("status") == "ok"
        assert out.get("subjectId") == subject_id
        assert out.get("sessionId") == session_id

        # Validate the PUT payload shape
        req = m.request_history[-1]
        assert req.method == "PUT"
        assert req.headers.get("X-Internal-API-Key") == api_key
        body = json.loads(req.text or "{}")
        assert body.get("status") == "READY"
        result = body.get("result")
        assert isinstance(result, dict)
        assert isinstance(result.get("topics"), list)
        # local summarizer adds a studyPlan string
        assert isinstance(result.get("studyPlan"), str)
