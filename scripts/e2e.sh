#!/usr/bin/env bash
set -euo pipefail

say() { printf "\n== %s ==\n" "$1"; }
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# 0) Bring up infra (idempotent)
say "Starting infra (postgres, rabbitmq, minio, clamav, oracle services)"
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d postgres rabbitmq minio clamav oracle-embed oracle-worker

# 1) Ensure core-service live
say "Ensuring core-service is live on :3000"
ATTEMPTS=60
for i in $(seq 1 "$ATTEMPTS"); do
  if curl -fsS http://localhost:3000/health/live >/dev/null 2>&1; then
    break
  fi
  if [ "$i" -eq 1 ]; then
    say "core-service not live; starting pnpm dev server"
    nohup pnpm --filter core-service start:test >/tmp/core-service.log 2>&1 &
  fi
  sleep 1
done

# 2) Ensure auth token and a subject
say "Ensuring token and subject exist"
if [ ! -s token.txt ]; then
  ./test_auth.sh
fi
TOKEN="$(cat token.txt)"

# Fetch subjects and parse one SID via Python
curl -sS -H "Authorization: Bearer $TOKEN" http://localhost:3000/subjects > subjects.json
/usr/bin/env python3 - "$ROOT_DIR/subjects.json" <<'PY' > sid.txt
import json,sys
try:
    p=sys.argv[1]
    with open(p,'r',encoding='utf-8') as f:
        a=json.load(f)
    if isinstance(a,list) and a and isinstance(a[0],dict) and 'id' in a[0]:
        print(a[0]['id'], end='')
except Exception:
    pass
PY
SID="$(cat sid.txt || true)"
if [ -z "${SID}" ]; then
  say "Creating subject"
  curl -sS -X POST http://localhost:3000/subjects -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" --data '{"name":"Demo Subject"}' >/dev/null
  curl -sS -H "Authorization: Bearer $TOKEN" http://localhost:3000/subjects > subjects.json
  /usr/bin/env python3 - "$ROOT_DIR/subjects.json" <<'PY' > sid.txt
import json,sys
try:
    p=sys.argv[1]
    with open(p,'r',encoding='utf-8') as f:
        a=json.load(f)
    if isinstance(a,list) and a and isinstance(a[0],dict) and 'id' in a[0]:
        print(a[0]['id'], end='')
except Exception:
    pass
PY
  SID="$(cat sid.txt || true)"
fi
say "Subject: $SID"

# 3) Upload a uniquely named copy of sample.pdf
if [ ! -f sample.pdf ]; then
  say "ERROR: sample.pdf not found at repo root"; exit 1
fi
STAMP="$(date +%s)"
FILENAME="sample-$STAMP.pdf"
cp -f sample.pdf "$FILENAME"
curl -sS -X POST "http://localhost:3000/subjects/$SID/documents" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@$FILENAME" \
  -F "resourceType=EXAM" > upload.json

# Parse upload id via Python
/usr/bin/env python3 - "$ROOT_DIR/upload.json" <<'PY' > doc_id.txt
import json,sys
try:
    p=sys.argv[1]
    with open(p,'r',encoding='utf-8') as f:
        o=json.load(f)
    print(o.get('id',''), end='')
except Exception:
    pass
PY
DOCID="$(cat doc_id.txt || true)"
if [ -z "$DOCID" ]; then
  say "ERROR: Failed to parse document id from upload response"; cat upload.json; exit 1
fi
say "Document: $DOCID"

# 4) Poll for status until COMPLETED/FAILED
/usr/bin/env python3 - "$ROOT_DIR/doclist.json" "$DOCID" <<'PY' > /dev/null
# placeholder to ensure Python available
PY
say "Polling status for up to 180s"
for i in $(seq 1 90); do
  curl -sS -H "Authorization: Bearer $TOKEN" "http://localhost:3000/subjects/$SID/documents" > doclist.json
  STATUS="$(/usr/bin/env python3 - "$ROOT_DIR/doclist.json" "$DOCID" <<'PY'
import json,sys
try:
    p=sys.argv[1]; did=sys.argv[2]
    with open(p,'r',encoding='utf-8') as f:
        lst=json.load(f)
    if isinstance(lst,list):
        for d in lst:
            if isinstance(d,dict) and d.get('id')==did:
                print(d.get('status',''), end='')
                break
except Exception:
    pass
PY
)"
  echo "[$i] status=$STATUS"
  if [ "$STATUS" = "COMPLETED" ] || [ "$STATUS" = "FAILED" ]; then
    break
  fi
  sleep 2
done

# 5) Fetch analysis (may be 404 if FAILED)
say "GET /documents/$DOCID/analysis"
curl -sS -i -H "Authorization: Bearer $TOKEN" "http://localhost:3000/documents/$DOCID/analysis" || true

say "Done"
