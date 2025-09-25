from __future__ import annotations

import logging
import os
from dataclasses import dataclass

try:
    from dotenv import load_dotenv  # type: ignore
except Exception:  # pragma: no cover - optional in prod
    load_dotenv = None  # type: ignore


def _to_bool(val: str | None, default: bool = False) -> bool:
    if val is None:
        return default
    return val.lower() in {"1", "true", "yes", "y", "on"}


def _to_int(val: str | None, default: int) -> int:
    try:
        return int(val) if val is not None else default
    except ValueError:
        return default


def _to_float(val: str | None, default: float) -> float:
    try:
        return float(val) if val is not None else default
    except ValueError:
        return default


@dataclass(frozen=True)
class Settings:
    # Messaging
    RABBITMQ_URL: str
    RABBITMQ_QUEUE_NAME: str
    RABBITMQ_REINDEX_QUEUE_NAME: str

    # Core-service callback
    CORE_SERVICE_URL: str
    INTERNAL_API_KEY: str

    # S3
    AWS_REGION: str | None
    S3_BUCKET: str | None
    AWS_S3_ENDPOINT: str | None
    AWS_S3_FORCE_PATH_STYLE: bool

    # Engine metadata
    ENGINE_VERSION: str
    ENGINE_MODEL_NAME: str
    ENGINE_DIM: int

    # Logging & timeouts
    LOG_LEVEL: str
    HTTP_CONNECT_TIMEOUT: float
    HTTP_READ_TIMEOUT: float

    # Retry/backoff policy (general-purpose)
    RETRY_MAX_RETRIES: int
    RETRY_BACKOFF: float
    RETRY_BACKOFF_MAX: float
    RETRY_JITTER: bool

    # V2 batching
    REINDEX_BATCH_SIZE: int

    @property
    def http_timeouts(self) -> tuple[float, float]:
        return (self.HTTP_CONNECT_TIMEOUT, self.HTTP_READ_TIMEOUT)


_SETTINGS: Settings | None = None


def get_settings() -> Settings:
    global _SETTINGS
    if _SETTINGS is not None:
        return _SETTINGS

    # Load .env if the package is used locally (but not during pytest)
    # This prevents tests from being polluted by dev .env values like AWS_S3_ENDPOINT.
    if load_dotenv is not None and "PYTEST_CURRENT_TEST" not in os.environ and os.getenv("DO_NOT_LOAD_DOTENV") != "1":
        load_dotenv()

    # If running under pytest, avoid forcing a custom S3 endpoint so moto can intercept.
    _endpoint = None if "PYTEST_CURRENT_TEST" in os.environ else os.getenv("AWS_S3_ENDPOINT")

    cfg = Settings(
        RABBITMQ_URL=os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672//"),
        RABBITMQ_QUEUE_NAME=os.getenv("RABBITMQ_QUEUE_NAME", "document_processing_jobs"),
        RABBITMQ_REINDEX_QUEUE_NAME=os.getenv("RABBITMQ_REINDEX_QUEUE_NAME", "v2_reindexing_jobs"),
        CORE_SERVICE_URL=os.getenv("CORE_SERVICE_URL", "http://localhost:3000"),
        INTERNAL_API_KEY=os.getenv("INTERNAL_API_KEY", ""),
        AWS_REGION=os.getenv("AWS_REGION"),
        S3_BUCKET=os.getenv("S3_BUCKET"),
        AWS_S3_ENDPOINT=_endpoint,
        AWS_S3_FORCE_PATH_STYLE=_to_bool(os.getenv("AWS_S3_FORCE_PATH_STYLE"), False),
        ENGINE_VERSION=os.getenv("ENGINE_VERSION", "oracle-v1"),
        ENGINE_MODEL_NAME=os.getenv("ENGINE_MODEL_NAME", "stub-miniLM"),
        ENGINE_DIM=_to_int(os.getenv("ENGINE_DIM"), 1536),
        LOG_LEVEL=os.getenv("LOG_LEVEL", "INFO").upper(),
        HTTP_CONNECT_TIMEOUT=_to_float(os.getenv("HTTP_CONNECT_TIMEOUT"), 5.0),
        HTTP_READ_TIMEOUT=_to_float(os.getenv("HTTP_READ_TIMEOUT"), 30.0),
        RETRY_MAX_RETRIES=_to_int(os.getenv("RETRY_MAX_RETRIES"), 5),
        RETRY_BACKOFF=_to_float(os.getenv("RETRY_BACKOFF"), 2.0),
        RETRY_BACKOFF_MAX=_to_float(os.getenv("RETRY_BACKOFF_MAX"), 60.0),
        RETRY_JITTER=_to_bool(os.getenv("RETRY_JITTER"), True),
        REINDEX_BATCH_SIZE=_to_int(os.getenv("REINDEX_BATCH_SIZE"), 250),
    )

    _SETTINGS = cfg
    return cfg


def init_logging(level_name: str | None = None) -> None:
    """Configure root logging with a reasonable format.

    If level_name is not provided, uses settings.LOG_LEVEL.
    """
    level = (level_name or get_settings().LOG_LEVEL or "INFO").upper()
    logging.basicConfig(
        level=getattr(logging, level, logging.INFO),
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )
