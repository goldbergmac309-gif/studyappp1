from __future__ import annotations

from utils.redaction import redact_pii


def test_redact_email_in_string():
    msgs = [{"role": "user", "content": "Please email me at john.doe@uni.edu"}]
    out = redact_pii(msgs)
    assert out[0]["content"].count("[REDACTED_EMAIL]") == 1


def test_redact_phone_in_string():
    msgs = [{"role": "user", "content": "Call me at 415-555-1212 today"}]
    out = redact_pii(msgs)
    assert "[REDACTED_PHONE]" in out[0]["content"]


def test_redact_in_parts_array():
    msgs = [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "my email is jane@school.edu"},
                {"type": "image_url", "image_url": {"url": "http://example.com/x.png"}},
            ],
        }
    ]
    out = redact_pii(msgs)
    parts = out[0]["content"]
    assert isinstance(parts, list)
    assert any(isinstance(p, dict) and "[REDACTED_EMAIL]" in p.get("text", "") for p in parts)
