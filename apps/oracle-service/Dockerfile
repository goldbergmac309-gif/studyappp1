# Oracle Service image: used for both the Celery worker and the Embed API server
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# System deps (if needed for pymupdf)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libjpeg-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Default command is the Celery worker; docker-compose overrides for the embed API
CMD ["bash", "-lc", "celery -A celery_app.app worker -l info"]
