import hashlib
import hmac
import requests_mock

from utils.internal_api import InternalApi
import utils.internal_api as ia


def test_internal_api_hmac_headers(monkeypatch):
    # Freeze time for deterministic signature
    monkeypatch.setattr(ia.time, "time", lambda: 12345)

    base = "http://core.local:3000"
    secret = "sekret"
    api = InternalApi(base, secret)

    path = "/internal/echo?x=1"
    url = f"{base}{path}"

    with requests_mock.Mocker() as m:
        m.get(url, status_code=200, text="ok")
        resp = api.get(path)
        assert resp.status_code == 200
        req = m.request_history[-1]
        headers = req.headers

        # Validate required headers exist
        assert "X-Timestamp" in headers
        assert "X-Body-SHA256" in headers
        assert "X-Signature" in headers

        ts = headers["X-Timestamp"]
        assert ts == str(12345)

        body_hash = hashlib.sha256(b"").hexdigest()
        assert headers["X-Body-SHA256"] == body_hash

        signing = f"{ts}.GET.{path}.{body_hash}".encode("utf-8")
        expected_sig = hmac.new(secret.encode("utf-8"), signing, hashlib.sha256).hexdigest()
        assert headers["X-Signature"] == expected_sig
