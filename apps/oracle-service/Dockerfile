# syntax=docker/dockerfile:1.7
# Multi-stage build for oracle-service (Python)

FROM python:3.12-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /app

# System deps for science libs (minimal)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY apps/oracle-service/requirements.txt apps/oracle-service/requirements.txt
RUN pip install --no-cache-dir -r apps/oracle-service/requirements.txt

# Copy project
COPY . .

# Default command launches the health server
EXPOSE 8081
HEALTHCHECK --interval=10s --timeout=3s --retries=3 CMD wget -qO- http://localhost:8081/health/live || exit 1
CMD ["uvicorn", "apps.oracle-service.health_server:app", "--host", "0.0.0.0", "--port", "8081"]
