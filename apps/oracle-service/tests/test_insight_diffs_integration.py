import json
import os
import pytest
import requests_mock
import config as cfg

from workers.insights_session_worker import process_insight_session


def test_integration_mastery_changes_with_mocked_baseline(monkeypatch):
    # Configure environment
    core_url = "http://core.local:3000"
    monkeypatch.setenv("CORE_SERVICE_URL", core_url)
    monkeypatch.setenv("INTERNAL_API_SECRET", "dev-secret")
    monkeypatch.setenv("AI_CONSENT", "false")
    monkeypatch.setenv("SUPPRESS_TEMPLATE_WARNINGS", "true")
    monkeypatch.setenv("DIFF_MASTERY_DELTA_THRESHOLD", "0.01")
    # Reset cached settings for env to take effect
    monkeypatch.setattr(cfg, "_SETTINGS", None, raising=False)

    subject_id = "sub-1"
    session_id = "sess-1"

    # Monkeypatch build_concept_graph to return deterministic current graphs
    import workers.insights_session_worker as w

    def fake_build_concept_graph(topics, questions, doc_types):
        graph = {
            "concepts": [
                {"label": "algorithm", "masteryScore": 0.60, "metadata": {"topTerms": []}},
                {"label": "posterior", "masteryScore": 0.70, "metadata": {"topTerms": []}},
            ],
            "families": [],
        }
        insight = {"conceptOverview": [], "riskConcepts": [], "studyPlan": []}
        forecast = {"nextExamConfidence": 0.5}
        return graph, insight, forecast

    monkeypatch.setattr(w, "build_concept_graph", fake_build_concept_graph)

    docs = [{"id": "d1", "resourceType": "EXAM"}]
    chunks = [{"id": "c1", "documentId": "d1", "text": "algo text"}]
    questions = []

    prev_payload = {
        "insight": {"conceptOverview": [{"label": "algorithm", "mastery": 0.50}]},
        "conceptGraph": {
            "concepts": [
                {"label": "algorithm", "masteryScore": 0.50, "metadata": {"topTerms": []}},
            ]
        },
    }

    with requests_mock.Mocker() as m:
        m.get(f"{core_url}/internal/subjects/{subject_id}/documents", status_code=200, json=docs)
        m.get(f"{core_url}/internal/subjects/{subject_id}/chunks", status_code=200, json=chunks)
        m.get(f"{core_url}/internal/subjects/{subject_id}/questions", status_code=200, json=questions)
        m.get(f"{core_url}/internal/subjects/{subject_id}/exam-template/latest", status_code=404)
        m.put(f"{core_url}/internal/subjects/{subject_id}/concept-graph", status_code=200, json={"ok": True})
        m.get(
            f"{core_url}/internal/subjects/{subject_id}/insight-versions/latest",
            status_code=200,
            json={"payload": prev_payload},
        )
        m.put(f"{core_url}/internal/subjects/{subject_id}/insight-versions", status_code=200, json={"versionId": "v1"})
        m.put(f"{core_url}/internal/subjects/{subject_id}/insight-sessions/{session_id}", status_code=200, json={"status": "ok"})

        out = process_insight_session.run({
            "subjectId": subject_id,
            "sessionId": session_id,
            "documentIds": ["d1"],
        })
        assert out.get("status") == "ok"

        # Last request should be the session update with result
        req = m.request_history[-1]
        body = json.loads(getattr(req, "text", "{}") or "{}")
        result = body.get("result", {})
        diffs = result.get("diffs", {})
        mc = diffs.get("masteryChanges") or []

        # Expect two changes: algorithm (update +0.10) and posterior (new 0.70)
        assert len(mc) == 2
        by_label = {d["label"]: d for d in mc}
        assert by_label["algorithm"]["after"] == pytest.approx(0.60, rel=0, abs=1e-3)
        assert by_label["algorithm"]["before"] == pytest.approx(0.50, rel=0, abs=1e-3)
        assert by_label["posterior"]["before"] == 0.0
