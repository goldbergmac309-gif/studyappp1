from __future__ import annotations

import json
import logging
from typing import Any

from celery import Celery, bootsteps
from config import get_settings, init_logging
from kombu import Consumer, Queue

logger = logging.getLogger(__name__)

# Initialize settings & logging
settings = get_settings()
init_logging(settings.LOG_LEVEL)

# Celery application
app = Celery("oracle")

# Celery configuration
app.conf.update(
    broker_url=settings.RABBITMQ_URL,
    accept_content=["json"],
    task_serializer="json",
    result_backend=None,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    task_time_limit=300,
    task_soft_time_limit=240,
    enable_utc=True,
    timezone="UTC",
    imports=("workers.analysis_worker",),
    # Ensure Celery tasks go to Celery's default queue; our worker will consume both
    task_default_queue="celery",
)


class RawQueueBridge(bootsteps.ConsumerStep):
    """Bootstep that consumes raw JSON jobs from the core-service queue and
    forwards them into Celery as tasks.

    The core-service publishes via amqplib `sendToQueue` without Celery's envelopes,
    so we must consume the queue directly and bridge messages to Celery.
    """

    def __init__(
        self, consumer: Any, **kwargs: Any
    ) -> None:  # consumer is Worker.Consumer blueprint
        super().__init__(consumer, **kwargs)
        self.app = consumer.app
        self.queue = Queue(settings.RABBITMQ_QUEUE_NAME, durable=True)
        logger.info(
            "RawQueueBridge initialized for queue=%s broker=%s",
            settings.RABBITMQ_QUEUE_NAME,
            settings.RABBITMQ_URL,
        )

    def get_consumers(self, channel: Any) -> list[Consumer]:
        return [
            Consumer(
                channel,
                queues=[self.queue],
                callbacks=[self.on_message],
                accept=["json"],  # accept JSON messages published by core-service
            )
        ]

    def on_message(self, body: Any, message: Any) -> None:
        try:
            payload: dict[str, Any]
            if isinstance(body, (bytes, bytearray)):
                body = body.decode("utf-8", errors="replace")
            if isinstance(body, str):
                payload = json.loads(body)
            elif isinstance(body, dict):
                payload = body
            else:
                raise ValueError(f"Unsupported message body type: {type(body)!r}")

            # Validate payload shape
            for key in ("documentId", "s3Key", "userId"):
                if key not in payload or not isinstance(payload[key], str) or not payload[key]:
                    raise ValueError(f"Invalid payload: missing or invalid '{key}'")

            # Bridge into Celery task graph on the default Celery queue to avoid raw-consumer collisions
            self.app.send_task(
                "oracle.process_document",
                args=[payload],
                queue="celery",
            )
            message.ack()
            logger.info(
                "Bridged job to Celery task oracle.process_document (documentId=%s)",
                payload.get("documentId"),
            )
        except json.JSONDecodeError as exc:
            logger.error("JSON decode error for raw message: %s", exc)
            message.ack()  # drop poison pill
        except Exception:
            logger.exception("Failed to bridge message; acknowledging to avoid poison pill")
            message.ack()


# Register bootstep with the worker consumer blueprint
app.steps["consumer"].add(RawQueueBridge)
