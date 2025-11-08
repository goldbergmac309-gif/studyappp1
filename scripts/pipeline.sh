#!/usr/bin/env bash
set -euo pipefail

# Start full stack using the generic compose command (no service name)
docker compose -f docker-compose.yml -f docker-compose.local.override.yml up -d --build >/dev/null

# Optionally skip readiness wait (set PIPELINE_SKIP_HEALTH=1)
if [ "${PIPELINE_SKIP_HEALTH:-0}" != "1" ]; then
  echo "Waiting for core-service readiness (container-level)..."
  for i in $(seq 1 120); do
    # Prefer checking from inside the container to avoid host networking quirks
    if docker compose -f docker-compose.yml -f docker-compose.local.override.yml exec core-service \
         wget -qO- http://localhost:3000/health/ready/details >/dev/null 2>&1; then
      echo "ready_ok_in_container try=$i"
      break
    fi
    # Fallback to host check (may be stricter)
    if curl -fsS http://localhost:3001/health/ready/details >/dev/null 2>&1; then
      echo "ready_ok_on_host try=$i"
      break
    fi
    echo "ready_wait try=$i"
    sleep 2
    if [ "$i" = "120" ]; then
      echo "core-service not ready; details (host):" >&2
      curl -sS http://localhost:3001/health/ready/details || true
      echo "details (container):" >&2
      docker compose -f docker-compose.yml -f docker-compose.local.override.yml exec core-service \
        wget -qO- http://localhost:3000/health/ready/details || true
      exit 1
    fi
  done
else
  echo "Skipping readiness wait as requested (PIPELINE_SKIP_HEALTH=$PIPELINE_SKIP_HEALTH)"
fi

# Helper: call auth endpoint from inside the core-service container
auth_in_container() {
  # $1 endpoint (signup|login)
  # $2 path to JSON payload file
  local endpoint="$1"
  local payload_file="$2"
  # Pass JSON via env to avoid shell quoting; write file inside container then POST with wget
  docker compose -f docker-compose.yml -f docker-compose.local.override.yml exec -T \
    -e JSON="$(tr -d '\n' < "$payload_file")" \
    core-service sh -lc 'printf %s "$JSON" > /tmp/p.json; \
      wget --header=Content-Type:application/json --post-file=/tmp/p.json -qO- http://localhost:3000/auth/'"$endpoint"' || true'
}

# Generic API caller inside container (supports GET/POST with Bearer)
api_in_container() {
  # $1 METHOD (GET|POST)
  # $2 endpoint path (e.g., /subjects or /subjects/:id/reindex)
  # $3 optional payload file for POST (omit or empty for none)
  local method="$1"
  local endpoint="$2"
  local payload_file="${3:-}"
  if [ "$method" = "POST" ]; then
    if [ -n "$payload_file" ]; then
      docker compose -f docker-compose.yml -f docker-compose.local.override.yml exec -T \
        -e BEARER="$ACCESS" \
        -e JSON="$(tr -d '\n' < "$payload_file")" \
        -e EP="$endpoint" \
        core-service sh -lc 'printf %s "$JSON" > /tmp/p.json; \
          wget --header="Authorization: Bearer $BEARER" --header=Content-Type:application/json --post-file=/tmp/p.json -qO- http://localhost:3000$EP'
    else
      docker compose -f docker-compose.yml -f docker-compose.local.override.yml exec -T \
        -e BEARER="$ACCESS" \
        -e EP="$endpoint" \
        core-service sh -lc 'wget --header="Authorization: Bearer $BEARER" --post-data="" -qO- http://localhost:3000$EP'
    fi
  else
    docker compose -f docker-compose.yml -f docker-compose.local.override.yml exec -T \
      -e BEARER="$ACCESS" \
      -e EP="$endpoint" \
      core-service sh -lc 'wget --header="Authorization: Bearer $BEARER" -qO- http://localhost:3000$EP'
  fi
}

# Robust auth with retries to smooth over Prisma startup
ACCESS=""
for i in $(seq 1 30); do
  ACCESS=""
  if [ -f signup.json ]; then
    # Try login via container to avoid host timing/guard issues
    auth_in_container login signup.json > login.json
    ACCESS=$(jq -r '.accessToken // empty' login.json 2>/dev/null || echo "")
  fi

  if [ -z "$ACCESS" ] || [ ${#ACCESS} -le 10 ]; then
    EPOCH=$(date +%s)
    printf '{"email":"alex.%s@test.com","password":"Password1234!"}\n' "$EPOCH" > signup_now.json
    auth_in_container signup signup_now.json > signup_resp.json
    ACCESS=$(jq -r '.accessToken // empty' signup_resp.json 2>/dev/null || echo "")
    if [ -z "$ACCESS" ] || [ ${#ACCESS} -le 10 ]; then
      auth_in_container login signup_now.json > login.json
      ACCESS=$(jq -r '.accessToken // empty' login.json 2>/dev/null || echo "")
    fi
  fi

  if [ -n "$ACCESS" ] && [ ${#ACCESS} -gt 10 ]; then
    break
  fi
  echo "auth_retry try=$i"
  sleep 2
done

if [ -z "$ACCESS" ] || [ ${#ACCESS} -le 10 ]; then
  echo "ERROR: Failed to obtain token" >&2
  echo "login.json:" >&2; cat login.json 2>/dev/null || true
  echo "signup_resp.json:" >&2; cat signup_resp.json 2>/dev/null || true
  exit 1
fi

printf "%s\n" "$ACCESS" > token.txt
TOKSZ=$(wc -c < token.txt 2>/dev/null || echo 0)
echo "TOKEN_BYTES=$TOKSZ"

# Ensure subject exists and is accessible for this token (in container)
ensure_subject() {
  if [ -s subject_id.txt ]; then
    local sid
    sid=$(cat subject_id.txt)
    if api_in_container GET /subjects/$sid >/dev/null 2>&1; then
      echo "$sid"
      return 0
    fi
    echo "Existing subject_id.txt not accessible; creating a new subject..." >&2
  fi
  local sname="${SUBJECT_NAME:-Demo Subject}"
  printf '{"name":"%s"}\n' "$sname" > subject_create.json
  api_in_container POST /subjects subject_create.json > subject.json
  jq -r '.id' subject.json > subject_id.txt
  cat subject_id.txt
}

SUBJECT=$(ensure_subject)
echo "SUBJECT=$SUBJECT"

# Upload a sample document from inside the container (required before topics aggregation)
upload_document() {
  local file_path="${1:-${DOC_PATH:-sample.pdf}}"
  if [ ! -f "$file_path" ]; then
    echo "Sample document not found at $file_path" >&2
    return 1
  fi
  local cid
  cid=$(docker compose -f docker-compose.yml -f docker-compose.local.override.yml ps -q core-service)
  # Copy helper uploader and file into the container
  docker cp scripts/container_upload.mjs "$cid":/tmp/container_upload.mjs
  local bname
  bname=$(basename "$file_path")
  docker cp "$file_path" "$cid":/tmp/"$bname"
  # Run upload
  docker compose -f docker-compose.yml -f docker-compose.local.override.yml exec -T \
    -e SID="$SUBJECT" -e BEARER="$ACCESS" -e FPATH="/tmp/$bname" \
    core-service sh -lc 'node /tmp/container_upload.mjs "$SID" "$BEARER" "$FPATH"' > upload_out.json || true
  # Validate response status
  local st
  st=$(jq -r '.status // 0' upload_out.json 2>/dev/null || echo 0)
  echo "UPLOAD_STATUS=$st"
  if [ "$st" != "200" ] && [ "$st" != "201" ]; then
    echo "Upload failed:" >&2
    cat upload_out.json >&2 || true
    return 1
  fi
  DOC_ID=$(jq -r '.body | try fromjson | .id // empty' upload_out.json 2>/dev/null || echo "")
  if [ -n "$DOC_ID" ]; then
    echo "DOC_ID=$DOC_ID"
    printf "%s\n" "$DOC_ID" > document_id.txt
  fi
  return 0
}

echo "Uploading sample document..."
if [ -n "${DOC_PATHS:-}" ]; then
  echo "DOC_PATHS detected: $DOC_PATHS"
  for p in $DOC_PATHS; do
    echo "Uploading: $p"
    if ! upload_document "$p"; then
      echo "Upload failed for $p; aborting." >&2
      exit 1
    fi
  done
elif ! upload_document; then
  echo "Document upload failed; aborting." >&2
  exit 1
fi

# List documents for subject
echo "Listing documents for subject..."
api_in_container GET /subjects/$SUBJECT/documents > docs.json || true
if [ -s docs.json ] && command -v jq >/dev/null 2>&1; then
  echo "DOC_COUNT=$(jq length docs.json)"
fi

# Trigger reindex (in container)
api_in_container POST /subjects/$SUBJECT/reindex >/dev/null

echo "Waiting for topics..."
# Poll topics until available (HTTP 200) (in container)
MAX_TRIES=${TOPICS_MAX_TRIES:-120}
for i in $(seq 1 $MAX_TRIES); do
  if api_in_container GET /subjects/$SUBJECT/topics > topics.json 2>/dev/null; then
    echo "topics_ready try=$i"
    break
  fi
  echo "topics_wait try=$i"
  sleep 2
  if [ "$i" = "$MAX_TRIES" ]; then
    echo "Timed out waiting for topics" >&2
    exit 1
  fi
done

# Output topics JSON (pretty if jq available)
if [ -s topics.json ]; then
  if command -v jq >/dev/null 2>&1; then
    jq . topics.json || cat topics.json
  else
    cat topics.json
  fi
else
  echo "topics.json missing" >&2
  exit 1
fi
