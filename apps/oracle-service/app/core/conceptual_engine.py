from __future__ import annotations

"""Conceptual Engine (stub)

This module provides a stable interface for the V2 pipeline. The Architect will
supply the production implementation. For tests and development, we offer a
minimal, deterministic implementation that:
  - splits text into simple sentence-like chunks
  - produces fixed-dimension embeddings via a deterministic hash

Interface:

    class ConceptualEngine:
        def __init__(self, model_name: str = "stub-miniLM", dim: int = 384): ...
        def chunk_and_embed(self, pdf_bytes: bytes, doc_id: str) -> dict:
            return {
                "model": self.model_name,
                "dim": self.dim,
                "chunks": [
                    {"index": i, "text": t, "embedding": [float,...], "tokens": int},
                    ...
                ],
            }

Notes:
- No heavy ML dependencies are required for this stub.
- The output shape conforms to the Internal API contract.
"""

from dataclasses import dataclass
from typing import List, Dict, Any, Optional

from utils.pdf import extract_text_smart
from .providers import EmbeddingProvider, StubProvider


@dataclass
class EngineConfig:
    model_name: str = "stub-miniLM"
    dim: int = 384
    max_chunk_chars: int = 600


class ConceptualEngine:
    def __init__(self, model_name: str = "stub-miniLM", dim: int = 384, provider: Optional[EmbeddingProvider] = None):
        self.cfg = EngineConfig(model_name=model_name, dim=dim)
        # If a provider is not supplied, default to StubProvider with requested dim
        self._provider: EmbeddingProvider = provider or StubProvider(model_name=model_name, dim=dim)

    @property
    def model_name(self) -> str:
        return self.cfg.model_name

    @property
    def dim(self) -> int:
        return self.cfg.dim

    def _token_count(self, text: str) -> int:
        # naive token count for diagnostics
        return max(0, len(text.split()))

    def _split_text(self, text: str) -> List[str]:
        # Simple chunker by period and max length
        max_len = self.cfg.max_chunk_chars
        raw = [s.strip() for s in text.replace("\n", " ").split(".")]
        raw = [s for s in raw if s]
        chunks: List[str] = []
        buf = ""
        for s in raw:
            if not buf:
                buf = s
            elif len(buf) + 1 + len(s) <= max_len:
                buf = f"{buf} {s}"
            else:
                chunks.append(buf)
                buf = s
        if buf:
            chunks.append(buf)
        return chunks

    def chunk_and_embed(self, pdf_bytes: bytes, doc_id: str) -> Dict[str, Any]:
        text, _pages, _ocr_used = extract_text_smart(pdf_bytes)
        if not text:
            return {"model": self._provider.get_model_name(), "dim": self._provider.get_dim(), "chunks": []}
        texts = self._split_text(text)
        embeddings = self._provider.embed_texts(texts)
        # Safety: align embeddings length with texts length
        if len(embeddings) != len(texts):
            # Pad or truncate to match texts
            if len(embeddings) < len(texts):
                last = embeddings[-1] if embeddings else [0.0] * self._provider.get_dim()
                embeddings = embeddings + [last for _ in range(len(texts) - len(embeddings))]
            else:
                embeddings = embeddings[: len(texts)]
        chunks = []
        for i, (t, e) in enumerate(zip(texts, embeddings)):
            chunks.append(
                {
                    "index": i,
                    "text": t,
                    "embedding": e,
                    "tokens": self._token_count(t),
                }
            )
        return {"model": self._provider.get_model_name(), "dim": self._provider.get_dim(), "chunks": chunks}
