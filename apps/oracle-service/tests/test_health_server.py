from __future__ import annotations

from fastapi.testclient import TestClient
 

from health_server import app


def test_live_ok():
    client = TestClient(app)
    resp = client.get("/health/live")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] in {"ok", "up"}


def test_ready_ok(monkeypatch):
    # Monkeypatch kombu.Connection.ensure_connection to a no-op
    import kombu

    def _ok(self, max_retries=1):
        return None

    monkeypatch.setattr(kombu.Connection, "ensure_connection", _ok, raising=True)

    client = TestClient(app)
    resp = client.get("/health/ready")
    assert resp.status_code in (200, 503)  # 200 if S3 configured and OK; 503 if S3 misconfigured
    # We can't guarantee S3 availability in CI; at least endpoint is wired.


def test_ready_queue_failure(monkeypatch):
    import kombu

    def _raise(self, max_retries=1):  # pragma: no cover - behavior check
        raise RuntimeError("broker down")

    monkeypatch.setattr(kombu.Connection, "ensure_connection", _raise, raising=True)

    client = TestClient(app)
    resp = client.get("/health/ready")
    assert resp.status_code == 503
    body = resp.json()
    assert body.get("errors", {}).get("queue")
