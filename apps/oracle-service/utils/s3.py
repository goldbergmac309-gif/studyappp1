from __future__ import annotations

import boto3
from botocore.config import Config as BotoConfig
from config import get_settings

_S3_CLIENT = None


def _get_s3_client():
    global _S3_CLIENT
    if _S3_CLIENT is not None:
        return _S3_CLIENT
    settings = get_settings()
    # Configure optional path-style addressing for S3-compatible endpoints
    s3_addressing = {"addressing_style": "path"} if settings.AWS_S3_FORCE_PATH_STYLE else {}
    cfg = BotoConfig(
        retries={"max_attempts": settings.RETRY_MAX_RETRIES, "mode": "standard"},
        connect_timeout=settings.HTTP_CONNECT_TIMEOUT,
        read_timeout=settings.HTTP_READ_TIMEOUT,
        s3=s3_addressing or None,
    )
    _S3_CLIENT = boto3.client(
        "s3",
        region_name=settings.AWS_REGION,
        endpoint_url=settings.AWS_S3_ENDPOINT or None,
        config=cfg,
    )
    return _S3_CLIENT


def download_to_bytes(bucket: str, key: str) -> bytes:
    """Download an object from S3 and return its bytes.

    Raises botocore.exceptions.ClientError for service-side failures.
    """
    s3 = _get_s3_client()
    resp = s3.get_object(Bucket=bucket, Key=key)
    body = resp["Body"]
    # Body is a StreamingBody; read all bytes
    data: bytes = body.read()
    return data
