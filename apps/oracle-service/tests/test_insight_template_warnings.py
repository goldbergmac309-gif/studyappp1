import json
import requests_mock
import config as cfg

from workers.insights_session_worker import process_insight_session


def test_insight_session_emits_template_warnings_with_objective_heavy_and_big_last(monkeypatch):
    core_url = "http://core.local:3000"
    api_key = "secret"
    monkeypatch.setenv("CORE_SERVICE_URL", core_url)
    monkeypatch.setenv("INTERNAL_API_KEY", api_key)
    monkeypatch.setattr(cfg, "_SETTINGS", None, raising=False)

    subject_id = "sub-tt"
    session_id = "sess-tt"

    # Two docs, both EXAM
    docs = [
        {"id": "d1", "resourceType": "EXAM"},
        {"id": "d2", "resourceType": "EXAM"},
    ]
    chunks = [
        {"id": "c1", "documentId": "d1", "text": "MCQ options (A) (B) (C) (D)"},
        {"id": "c2", "documentId": "d2", "text": "More MCQ and final long"},
    ]
    # Questions: majority OBJECTIVE, last one large marks
    questions = [
        {"id": "q1", "index": 1, "prompt": "(A) (B) (C) (D)", "assessmentMode": "OBJECTIVE", "documentId": "d1", "marks": 2},
        {"id": "q2", "index": 2, "prompt": "(A) (B) (C) (D)", "assessmentMode": "OBJECTIVE", "documentId": "d1", "marks": 2},
        {"id": "q3", "index": 3, "prompt": "(A) (B) (C) (D)", "assessmentMode": "OBJECTIVE", "documentId": "d2", "marks": 2},
        {"id": "q4", "index": 4, "prompt": "Essay long answer ...", "assessmentMode": "THEORY", "documentId": "d2", "marks": 20},
    ]

    with requests_mock.Mocker() as m:
        # Internal API mocks
        m.get(f"{core_url}/internal/subjects/{subject_id}/documents", status_code=200, json=docs)
        m.get(f"{core_url}/internal/subjects/{subject_id}/chunks", status_code=200, json=chunks)
        m.get(f"{core_url}/internal/subjects/{subject_id}/questions", status_code=200, json=questions)
        m.get(f"{core_url}/internal/subjects/{subject_id}/exam-template/latest", status_code=404)
        m.put(f"{core_url}/internal/subjects/{subject_id}/concept-graph", status_code=200, json={"ok": True})
        m.put(f"{core_url}/internal/subjects/{subject_id}/insight-versions", status_code=200, json={"versionId": "v1"})
        m.put(f"{core_url}/internal/subjects/{subject_id}/insight-sessions/{session_id}", status_code=200, json={"status": "ok"})
        m.put(f"{core_url}/internal/subjects/{subject_id}/exam-template", status_code=200, json={"ok": True})
        # Optional exam-template GET/PUT (not strictly needed; allow failures to be caught)

        out = process_insight_session.run(
            {"subjectId": subject_id, "sessionId": session_id, "documentIds": ["d1", "d2"]}
        )

        assert out.get("status") == "ok"
        # Last request is the session update; inspect payload
        req = m.request_history[-1]
        body = json.loads(getattr(req, "text", "{}") or "{}")
        result = body.get("result", {})
        warns = set(result.get("warnings") or [])
        # Expect mcq_heavy from OBJECTIVE ratio and big_last_question from last question marks
        assert "mcq_heavy" in warns
        assert "big_last_question" in warns
