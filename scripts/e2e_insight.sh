#!/usr/bin/env bash
set -euo pipefail

CORE=${CORE:-http://localhost:3001}
EMAIL="alex+$RANDOM@example.com"
PASS="password123"

echo "[1] Using CORE=$CORE"
echo "[1] Signup as $EMAIL"
TOKEN=$(curl -s -X POST "$CORE/auth/signup" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" | jq -r .accessToken)
if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then echo "Signup failed"; exit 1; fi

echo "[2] Create subject"
SUBJECT_ID=$(curl -s -X POST "$CORE/subjects" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"name":"E2E Insight"}' | jq -r .id)
[ -n "$SUBJECT_ID" ] && [ "$SUBJECT_ID" != null ] || { echo "Create subject failed"; exit 1; }

echo "[3] Create small exam docs"
cat > /tmp/e2e_a.txt << EOF
Section A
Q1) Perform a t-test and discuss regression assumptions.
EOF
cat > /tmp/e2e_b.txt << EOF
Section B
Q1) Use Dijkstra algorithm to find shortest paths.
EOF

RESP1=$(curl -s -X POST "$CORE/subjects/$SUBJECT_ID/documents" -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/e2e_a.txt" -F "resourceType=EXAM")
RESP2=$(curl -s -X POST "$CORE/subjects/$SUBJECT_ID/documents" -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/e2e_b.txt" -F "resourceType=EXAM")
DOC1=$(echo "$RESP1" | jq -r .id); DOC2=$(echo "$RESP2" | jq -r .id)

for i in {1..60}; do
  D=$(curl -s "$CORE/subjects/$SUBJECT_ID/documents" -H "Authorization: Bearer $TOKEN")
  S1=$(echo "$D" | jq -r ".[]|select(.id==\"$DOC1\").status")
  S2=$(echo "$D" | jq -r ".[]|select(.id==\"$DOC2\").status")
  echo "doc statuses: $S1, $S2"; [ "$S1" = COMPLETED ] && [ "$S2" = COMPLETED ] && break; sleep 2
  [ "$i" = 60 ] && { echo "Timed out waiting for analysis"; exit 1; }
done
sleep 6

echo "[4] Create insight session"
SESSION_ID=$(curl -s -X POST "$CORE/subjects/$SUBJECT_ID/insight-sessions" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d "{\"documentIds\":[\"$DOC1\",\"$DOC2\"]}" | jq -r .id)

for i in {1..60}; do
  st=$(curl -s "$CORE/insight-sessions/$SESSION_ID" -H "Authorization: Bearer $TOKEN" | jq -r .status)
  echo "session:$st"; [ "$st" = READY ] || [ "$st" = FAILED ] && break; sleep 2
  [ "$i" = 60 ] && { echo "Timed out waiting for session"; exit 1; }
done

echo "[5] Summary"
curl -s "$CORE/insight-sessions/$SESSION_ID" -H "Authorization: Bearer $TOKEN" | jq '{
  status,
  result: {
    summary: (.result.summary // null),
    timings: (.result.timings // null),
    diffs:   (.result.diffs   // null),
    warnings: (.result.warnings // .result.insight?.warnings // null),
    syntheticExamples: (.result.syntheticExamples // .result.insight?.syntheticExamples // null)
  }
}'
