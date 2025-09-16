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
import hashlib
import math
from typing import List, Dict, Any

from utils.pdf import extract_text


@dataclass
class EngineConfig:
    model_name: str = "stub-miniLM"
    dim: int = 384
    max_chunk_chars: int = 600


class ConceptualEngine:
    def __init__(self, model_name: str = "stub-miniLM", dim: int = 384):
        self.cfg = EngineConfig(model_name=model_name, dim=dim)

    @property
    def model_name(self) -> str:
        return self.cfg.model_name

    @property
    def dim(self) -> int:
        return self.cfg.dim

    def _token_count(self, text: str) -> int:
        # naive token count for diagnostics
        return max(0, len(text.split()))

    def _deterministic_vec(self, text: str) -> List[float]:
        # Create a deterministic pseudo-embedding using SHA-256 expansions
        dim = self.cfg.dim
        out: List[float] = []
        seed = text.encode("utf-8", errors="ignore")
        counter = 0
        while len(out) < dim:
            h = hashlib.sha256(seed + counter.to_bytes(4, "big")).digest()
            # turn bytes into floats in [-1, 1]
            for i in range(0, len(h), 4):
                if len(out) >= dim:
                    break
                chunk = h[i : i + 4]
                val = int.from_bytes(chunk, "big", signed=False)
                # map to [-1, 1]
                out.append((val % 2000000) / 1000000.0 - 1.0)
            counter += 1
        # L2 normalize
        norm = math.sqrt(sum(v * v for v in out)) or 1.0
        out = [v / norm for v in out]
        return out

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
        text, _pages = extract_text(pdf_bytes)
        if not text:
            return {"model": self.model_name, "dim": self.dim, "chunks": []}
        texts = self._split_text(text)
        chunks = []
        for i, t in enumerate(texts):
            chunks.append(
                {
                    "index": i,
                    "text": t,
                    "embedding": self._deterministic_vec(t),
                    "tokens": self._token_count(t),
                }
            )
        return {"model": self.model_name, "dim": self.dim, "chunks": chunks}
