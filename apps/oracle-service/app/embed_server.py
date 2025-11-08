from __future__ import annotations

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, List

from app.core.conceptual_engine import ConceptualEngine
from utils.redaction import redact_pii
from config import get_settings

app = FastAPI(title="Oracle Embed API")


class EmbedRequest(BaseModel):
    text: str


class EmbedResponse(BaseModel):
    model: str
    dim: int
    embedding: List[float]


@app.post("/embed", response_model=EmbedResponse)
def embed(req: EmbedRequest) -> Dict[str, Any]:
    text = (req.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    settings = get_settings()
    engine = ConceptualEngine(model_name=settings.ENGINE_MODEL_NAME, dim=settings.ENGINE_DIM)

    # Apply basic PII redaction before any downstream processing
    try:
        redacted = redact_pii([{"role": "user", "content": text}])
        text = str(redacted[0].get("content", text))
    except Exception:
        # Best-effort: if redaction fails, continue with original text
        pass

    # Use engine's deterministic vector generator directly on text
    try:
        # Accessing the deterministic vector function for query text
        vec = engine._deterministic_vec(text)  # type: ignore[attr-defined]
    except Exception as e:  # pragma: no cover - unexpected
        raise HTTPException(status_code=500, detail=f"embedding failed: {e}")

    return {
        "model": engine.model_name,
        "dim": engine.dim,
        "embedding": vec,
    }
