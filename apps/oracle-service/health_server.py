from __future__ import annotations

from fastapi import FastAPI, Response, status
from typing import Any, Dict
from botocore.exceptions import ClientError
import boto3
from kombu import Connection

from config import get_settings

app = FastAPI(title="Oracle Service Health")


@app.get("/health/live")
def health_live() -> Dict[str, Any]:
    settings = get_settings()
    return {
        "status": "ok",
        "engineVersion": settings.ENGINE_VERSION,
    }


@app.get("/health/ready")
def health_ready(response: Response) -> Dict[str, Any]:
    settings = get_settings()

    info: Dict[str, Any] = {}
    errors: Dict[str, Any] = {}

    # RabbitMQ broker check
    try:
        with Connection(settings.RABBITMQ_URL) as conn:  # type: ignore[call-arg]
            conn.ensure_connection(max_retries=1)
        info["queue"] = {"status": "up"}
    except Exception as e:  # pragma: no cover - actual broker failure
        errors["queue"] = {"status": "down", "error": str(e)}

    # S3 bucket check (optional)
    bucket = settings.S3_BUCKET
    if bucket:
        try:
            s3 = boto3.client(
                "s3",
                region_name=settings.AWS_REGION,
                endpoint_url=settings.AWS_S3_ENDPOINT or None,
            )
            s3.head_bucket(Bucket=bucket)
            info["s3"] = {"status": "up"}
        except ClientError as e:  # pragma: no cover - depends on env
            errors["s3"] = {"status": "down", "error": str(e)}
    else:
        info["s3"] = {"status": "up", "optional": True, "reason": "not configured"}

    if errors:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "error", "info": info, "errors": errors}

    return {"status": "ok", "info": info}
