#!/usr/bin/env bash
set -euo pipefail

CORE=${CORE:-http://localhost:3001}
EMAIL="alex+$RANDOM@example.com"
PASS="password123"

OVR=/tmp/docker-compose.gate.override.yml
cat > "$OVR" << YAML
services:
  oracle-worker:
    environment:
      AI_CONSENT: "false"
YAML

echo "[gate] Restart oracle-worker with AI_CONSENT=false"
docker compose -f docker-compose.yml -f docker-compose.local.override.yml -f "$OVR" up -d oracle-worker

echo "[1] Signup as $EMAIL"
TOKEN=$(curl -s -X POST "$CORE/auth/signup" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" | jq -r .accessToken)
[ -n "$TOKEN" ] && [ "$TOKEN" != null ] || { echo "Signup failed"; exit 1; }

echo "[2] Create subject"
SUBJECT_ID=$(curl -s -X POST "$CORE/subjects" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"name":"E2E Consent Gate"}' | jq -r .id)
[ -n "$SUBJECT_ID" ] && [ "$SUBJECT_ID" != null ] || { echo "Create subject failed"; exit 1; }

echo "[3] Create single doc"
cat > /tmp/gate_exam.txt << EOF
Section Z
Q1) Short calculus differentiation.
EOF
R=$(curl -s -X POST "$CORE/subjects/$SUBJECT_ID/documents" -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/gate_exam.txt" -F "resourceType=EXAM")
DOC=$(echo "$R" | jq -r .id)

for i in {1..60}; do
  S=$(curl -s "$CORE/subjects/$SUBJECT_ID/documents" -H "Authorization: Bearer $TOKEN" | jq -r ".[]|select(.id==\"$DOC\").status")
  echo "doc:$S"; [ "$S" = COMPLETED ] && break; sleep 2
  [ "$i" = 60 ] && { echo "Timed out waiting for doc"; exit 1; }
done
sleep 4

echo "[4] Create session"
SID=$(curl -s -X POST "$CORE/subjects/$SUBJECT_ID/insight-sessions" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d "{\"documentIds\":[\"$DOC\"]}" | jq -r .id)
for i in {1..60}; do
  st=$(curl -s "$CORE/insight-sessions/$SID" -H "Authorization: Bearer $TOKEN" | jq -r .status)
  echo "session:$st"; [ "$st" = READY -o "$st" = FAILED ] && break; sleep 2
  [ "$i" = 60 ] && { echo "Timed out waiting for session"; exit 1; }
done

RES=$(curl -s "$CORE/insight-sessions/$SID" -H "Authorization: Bearer $TOKEN")
echo "$RES" | jq '{status, result: { timings: (.result.timings // null), syntheticExamples: (.result.syntheticExamples // .result.insight?.syntheticExamples // null) }}'

HAS=$(echo "$RES" | jq -r '(
  (.result.syntheticExamples // empty) as $a |
  (.result.insight.syntheticExamples // empty) as $b |
  ( ($a|type? == "array") or ($b|type? == "array") )
)')
if [ "$HAS" = "true" ]; then
  echo "AI_CONSENT=false but syntheticExamples present" >&2
  exit 2
fi

echo "[revert] Restore oracle-worker to baseline"
docker compose -f docker-compose.yml -f docker-compose.local.override.yml up -d oracle-worker
