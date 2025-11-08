from __future__ import annotations

from dataclasses import dataclass
from typing import List, Protocol
import math
import hashlib
import os


class EmbeddingProvider(Protocol):
    def get_model_name(self) -> str: ...
    def get_dim(self) -> int: ...
    def embed_texts(self, texts: List[str]) -> List[List[float]]: ...


@dataclass
class StubProvider:
    model_name: str = "stub-miniLM"
    dim: int = 384

    def get_model_name(self) -> str:
        return self.model_name

    def get_dim(self) -> int:
        return self.dim

    def _deterministic_vec(self, text: str) -> List[float]:
        dim = self.dim
        out: List[float] = []
        seed = text.encode("utf-8", errors="ignore")
        counter = 0
        while len(out) < dim:
            h = hashlib.sha256(seed + counter.to_bytes(4, "big")).digest()
            for i in range(0, len(h), 4):
                if len(out) >= dim:
                    break
                chunk = h[i : i + 4]
                val = int.from_bytes(chunk, "big", signed=False)
                out.append((val % 2000000) / 1000000.0 - 1.0)
            counter += 1
        norm = math.sqrt(sum(v * v for v in out)) or 1.0
        return [v / norm for v in out]

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        return [self._deterministic_vec(t) for t in texts]


@dataclass
class LocalProvider:
    model_name: str = "intfloat/e5-small-v2"
    dim: int = 1536

    def __post_init__(self) -> None:
        self._model = None
        self._actual_dim = None

    def get_model_name(self) -> str:
        return self.model_name

    def get_dim(self) -> int:
        return self.dim

    def _load_model(self):
        if self._model is not None:
            return
        try:
            from sentence_transformers import SentenceTransformer  # type: ignore
        except Exception:  # pragma: no cover - optional dependency path
            self._model = None
            self._actual_dim = None
            return
        self._model = SentenceTransformer(self.model_name)
        try:
            # Probe dim cheaply; many models expose get_sentence_embedding_dimension
            self._actual_dim = int(getattr(self._model, "get_sentence_embedding_dimension")())
        except Exception:  # pragma: no cover - model-specific
            self._actual_dim = None

    def _project(self, vec: List[float]) -> List[float]:
        # Simple projection/pad/truncate to target dim
        target = self.dim
        if len(vec) == target:
            return vec
        if len(vec) > target:
            return vec[:target]
        # pad with zeros
        return vec + [0.0] * (target - len(vec))

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        self._load_model()
        if self._model is None:
            # Fallback to stub behavior if model not available
            return StubProvider(model_name="stub-fallback", dim=self.dim).embed_texts(texts)
        # Batch encode
        try:
            embs = self._model.encode(texts, normalize_embeddings=True)  # type: ignore
            # Ensure list of lists of float
            embs_list: List[List[float]] = [list(map(float, e)) for e in embs]
        except Exception:  # pragma: no cover - runtime encoding failure
            return StubProvider(model_name="stub-fallback", dim=self.dim).embed_texts(texts)
        # Project to desired dim if needed
        return [self._project(e) for e in embs_list]


@dataclass
class OpenAIProvider:
    model_name: str = "text-embedding-3-small"
    dim: int = 1536
    api_key: str | None = None

    def get_model_name(self) -> str:
        return self.model_name

    def get_dim(self) -> int:
        return self.dim

    def _client(self):
        # Lazy import to avoid hard dependency when not used
        key = self.api_key or os.getenv("OPENAI_API_KEY")
        if not key:
            return None
        try:  # type: ignore
            from openai import OpenAI  # noqa: WPS433
        except Exception:
            return None
        return OpenAI(api_key=key)

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        client = self._client()
        if client is None:
            # Fallback to stub if API key or SDK not available
            return StubProvider(model_name="stub-fallback", dim=self.dim).embed_texts(texts)
        try:
            # OpenAI API v1; batch create embeddings
            resp = client.embeddings.create(model=self.model_name, input=texts)
            # Map to list of floats and project/pad as needed
            vectors: List[List[float]] = [list(map(float, d.embedding)) for d in resp.data]  # type: ignore
        except Exception:
            return StubProvider(model_name="stub-fallback", dim=self.dim).embed_texts(texts)
        # Project to target dim in case of model mismatch
        if not vectors:
            return StubProvider(model_name="stub-fallback", dim=self.dim).embed_texts(texts)
        if len(vectors[0]) == self.dim:
            return vectors
        def _proj(vec: List[float]) -> List[float]:
            if len(vec) > self.dim:
                return vec[: self.dim]
            return vec + [0.0] * (self.dim - len(vec))
        return [_proj(v) for v in vectors]
