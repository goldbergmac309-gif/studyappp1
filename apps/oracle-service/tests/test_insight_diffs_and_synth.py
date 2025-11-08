import json
import os
import requests_mock
import config as cfg

from workers.insights_session_worker import process_insight_session


def test_insight_session_includes_diffs_synthetic_and_timings(monkeypatch):
    core_url = "http://core.local:3000"
    api_key = "secret"
    monkeypatch.setenv("CORE_SERVICE_URL", core_url)
    monkeypatch.setenv("INTERNAL_API_KEY", api_key)
    monkeypatch.setattr(cfg, "_SETTINGS", None, raising=False)
    monkeypatch.setenv("AI_CONSENT", "true")
    monkeypatch.setenv("LLM_PROVIDER", "none")  # syntheticExamples doesn't depend on provider

    subject_id = "sub-hist"
    session_id = "sess-hist"

    docs = [
        {"id": "d1", "resourceType": "EXAM"},
    ]
    chunks = [
        {"id": "c1", "documentId": "d1", "text": "Alpha beta gamma"},
        {"id": "c2", "documentId": "d1", "text": "Alpha topic repeated"},
    ]
    questions = [
        {"id": "q1", "index": 1, "prompt": "Alpha calc", "assessmentMode": "CALCULATION", "documentId": "d1", "marks": 5},
        {"id": "q2", "index": 2, "prompt": "Alpha def", "assessmentMode": "DEFINITION", "documentId": "d1", "marks": 3},
    ]

    prev_insight = {
        "conceptOverview": [
            {"label": "Alpha", "mastery": 0.9},
        ],
        "warnings": ["LOW_DATA"],
    }

    with requests_mock.Mocker() as m:
        m.get(f"{core_url}/internal/subjects/{subject_id}/documents", status_code=200, json=docs)
        m.get(f"{core_url}/internal/subjects/{subject_id}/chunks", status_code=200, json=chunks)
        m.get(f"{core_url}/internal/subjects/{subject_id}/questions", status_code=200, json=questions)
        m.get(f"{core_url}/internal/subjects/{subject_id}/exam-template/latest", status_code=404)
        m.put(f"{core_url}/internal/subjects/{subject_id}/concept-graph", status_code=200, json={"ok": True})
        m.put(f"{core_url}/internal/subjects/{subject_id}/insight-versions", status_code=200, json={"versionId": "v1"})
        m.get(f"{core_url}/internal/subjects/{subject_id}/insight-versions/latest", status_code=200, json={"payload": {"insight": prev_insight}})
        m.put(f"{core_url}/internal/subjects/{subject_id}/insight-sessions/{session_id}", status_code=200, json={"status": "ok"})
        m.put(f"{core_url}/internal/subjects/{subject_id}/exam-template", status_code=200, json={"ok": True})

        out = process_insight_session.run(
            {"subjectId": subject_id, "sessionId": session_id, "documentIds": ["d1"]}
        )

        assert out.get("status") == "ok"
        # Last request body is the session update
        req = m.request_history[-1]
        body = json.loads(getattr(req, "text", "{}") or "{}")
        result = body.get("result", {})

        # diffs present with masteryChanges list (may be empty depending on label alignment)
        diffs = result.get("diffs")
        assert isinstance(diffs, dict)
        mc = diffs.get("masteryChanges")
        assert isinstance(mc, list)

        # syntheticExamples present under insight due to AI_CONSENT
        insight = result.get("insight", {})
        synth = insight.get("syntheticExamples")
        assert isinstance(synth, list) and len(synth) >= 1

        # timings present with numeric fields
        timings = result.get("timings")
        assert isinstance(timings, dict)
        for k in ("topics", "graph", "insight", "total"):
            assert isinstance(timings.get(k), float)
