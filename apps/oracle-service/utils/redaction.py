from __future__ import annotations

import re
from typing import Any, Dict, List, Union

_EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
_PHONE_RE = re.compile(r"(?:(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{3}\)?|\d{3})[\s-]?\d{3}[\s-]?\d{4})")


def _redact_text(text: str) -> str:
    text = _EMAIL_RE.sub("[REDACTED_EMAIL]", text)
    text = _PHONE_RE.sub("[REDACTED_PHONE]", text)
    return text


MessageContent = Union[str, List[Dict[str, Any]]]


def redact_pii(messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Return a new messages array with PII redacted in textual content.
    Supports both string content and OpenAI-like content parts arrays.
    """
    redacted: List[Dict[str, Any]] = []
    for m in messages:
        new_m = dict(m)
        content: MessageContent = m.get("content", "")
        if isinstance(content, str):
            new_m["content"] = _redact_text(content)
        elif isinstance(content, list):
            parts: List[Dict[str, Any]] = []
            for p in content:
                if isinstance(p, dict) and p.get("type") == "text":
                    t = str(p.get("text", ""))
                    parts.append({**p, "text": _redact_text(t)})
                else:
                    parts.append(p)
            new_m["content"] = parts
        redacted.append(new_m)
    return redacted
