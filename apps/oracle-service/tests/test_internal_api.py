from __future__ import annotations

import json
import time
from typing import Any
import hmac
import hashlib

import requests
import requests_mock

from utils.internal_api import InternalApi


def _sha256hex(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def _sign(secret: str, ts: int, method: str, path: str, body_hash: str) -> str:
    payload = f"{ts}.{method.upper()}.{path}.{body_hash}".encode("utf-8")
    return hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()


def test_internal_api_signs_headers_correctly(monkeypatch):
    base_url = "http://core.local:3000"
    secret = "test-secret"
    api = InternalApi(base_url, secret, default_timeout=5.0, legacy_api_key="legacy-key")

    path = "/internal/test/endpoint?x=1&y=2"
    body = {"hello": "world"}

    # Freeze time for deterministic signature
    fixed_ts = int(time.time())
    monkeypatch.setattr(time, "time", lambda: fixed_ts)

    with requests_mock.Mocker() as m:
        m.post(f"{base_url}{path}", status_code=200, json={"ok": True})
        resp = api.post(path, body)

        assert resp.status_code == 200
        req = m.request_history[0]
        assert req.method == "POST"
        # Compute exact expected header values
        body_bytes = json.dumps(body, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
        expected_body_hash = _sha256hex(body_bytes)
        expected_sig = _sign(secret, fixed_ts, "POST", path, expected_body_hash)

        assert req.headers.get("X-Timestamp") == str(fixed_ts)
        assert req.headers.get("X-Body-SHA256") == expected_body_hash
        assert req.headers.get("X-Signature") == expected_sig
        # Legacy API key preserved (optional)
        assert req.headers.get("X-Internal-API-Key") == "legacy-key"
        # Body encoded deterministically
        parsed = json.loads(req.text or "{}")
        assert parsed == body
