from __future__ import annotations

import json
import time
import hmac
import hashlib
from typing import Any, Dict, Optional
from urllib.parse import urlsplit

import requests


class InternalApi:
    """
    Canonical HMAC-signed HTTP client for calling core-service internal endpoints.

    Signing string format (must match core-service HmacGuard):
        f"{timestamp}.{METHOD}.{path_with_optional_query}.{sha256hex(body or '')}"

    Headers sent:
      - X-Timestamp: unix epoch seconds (string)
      - X-Body-SHA256: hex-encoded SHA-256 of the request body (or empty string)
      - X-Signature: hex-encoded HMAC-SHA256 over the signing string
      - Content-Type: application/json (when body present)

    Note: Callers should pass `path` beginning with '/internal', optionally with query string.
    """

    def __init__(self, base_url: str, secret: str, *, default_timeout: float = 30.0, legacy_api_key: Optional[str] = None):
        self.base_url = base_url.rstrip("/")
        self.secret = (secret or "").encode("utf-8")
        self.default_timeout = float(default_timeout)
        self.legacy_api_key = legacy_api_key  # retained only for backward-compatible headers if desired

    def _canonical_path(self, url: str) -> str:
        parts = urlsplit(url)
        path = parts.path or "/"
        if parts.query:
            path = f"{path}?{parts.query}"
        return path

    def _sha256hex(self, data: bytes) -> str:
        return hashlib.sha256(data).hexdigest()

    def _sign_headers(self, method: str, url: str, body_bytes: Optional[bytes]) -> Dict[str, str]:
        path = self._canonical_path(url)
        ts = str(int(time.time()))
        body_hash = self._sha256hex(body_bytes or b"")
        payload = f"{ts}.{method.upper()}.{path}.{body_hash}".encode("utf-8")
        signature = hmac.new(self.secret, payload, hashlib.sha256).hexdigest()
        headers: Dict[str, str] = {
            "X-Timestamp": ts,
            "X-Body-SHA256": body_hash,
            "X-Signature": signature,
        }
        if self.legacy_api_key:
            headers["X-Internal-API-Key"] = self.legacy_api_key
        return headers

    def _request(self, method: str, path: str, *, json_body: Optional[Dict[str, Any]] = None, timeout: Optional[float] = None, headers: Optional[Dict[str, str]] = None) -> requests.Response:
        method_up = method.upper()
        url = f"{self.base_url}{path}"
        data_bytes: Optional[bytes] = None
        req_headers: Dict[str, str] = {**(headers or {})}
        if json_body is not None:
            # Ensure deterministic JSON encoding (compact separators)
            data_bytes = json.dumps(json_body, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
            req_headers.setdefault("Content-Type", "application/json")
        signed = self._sign_headers(method_up, url, data_bytes)
        req_headers = {**req_headers, **signed}
        resp = requests.request(method_up, url, data=data_bytes, headers=req_headers, timeout=timeout or self.default_timeout)
        return resp

    def get(self, path: str, *, timeout: Optional[float] = None, headers: Optional[Dict[str, str]] = None) -> requests.Response:
        return self._request("GET", path, timeout=timeout, headers=headers)

    def post(self, path: str, json_body: Dict[str, Any], *, timeout: Optional[float] = None, headers: Optional[Dict[str, str]] = None) -> requests.Response:
        return self._request("POST", path, json_body=json_body, timeout=timeout, headers=headers)

    def put(self, path: str, json_body: Dict[str, Any], *, timeout: Optional[float] = None, headers: Optional[Dict[str, str]] = None) -> requests.Response:
        return self._request("PUT", path, json_body=json_body, timeout=timeout, headers=headers)
