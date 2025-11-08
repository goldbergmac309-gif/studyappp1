#!/usr/bin/env bash
set -euo pipefail

CORE=${CORE:-http://localhost:3001}
EMAIL="alex+$RANDOM@example.com"
PASS="password123"

printf "[1] Using CORE=%s\n" "$CORE"
printf "[1] Signup as %s\n" "$EMAIL"

TOKEN=$(
  curl -s -X POST "$CORE/auth/signup" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" \
  | jq -r '.accessToken'
)

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "Signup failed"
  exit 1
fi

echo "[1] TOKEN acquired"

echo "[2] Create subject"
SUBJECT_ID=$(
  curl -s -X POST "$CORE/subjects" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"E2E Diff Run\"}" \
  | jq -r '.id'
)

if [ -z "$SUBJECT_ID" ] || [ "$SUBJECT_ID" = "null" ]; then
  echo "Create subject failed"
  exit 1
fi

echo "[2] SUBJECT_ID=$SUBJECT_ID"

echo "[3] Create exam files"
cat > /tmp/examA.txt << 'AEOF'
Section A
Q1) Perform a t-test and discuss regression assumptions.
Q2) Compute confidence interval and interpret p-value.
AEOF

cat > /tmp/examB.txt << 'BEOF'
Section B
Q1) Apply Fourier transform to solve a PDE boundary value problem.
Q2) Use Dijkstra algorithm to find shortest paths and analyze complexity.
BEOF

echo "[4] Upload baseline exams as EXAM resources"

RESP1=$(
  curl -s -X POST "$CORE/subjects/$SUBJECT_ID/documents" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@/tmp/examA.txt" \
    -F "resourceType=EXAM"
)

RESP2=$(
  curl -s -X POST "$CORE/subjects/$SUBJECT_ID/documents" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@/tmp/examB.txt" \
    -F "resourceType=EXAM"
)

echo "Upload1: $RESP1"
echo "Upload2: $RESP2"

DOC_ID1=$(echo "$RESP1" | jq -r '.id // empty')
DOC_ID2=$(echo "$RESP2" | jq -r '.id // empty')

if [ -z "$DOC_ID1" ] || [ -z "$DOC_ID2" ]; then
  echo "Upload failed"
  exit 1
fi

echo "[4] DOC_ID1=$DOC_ID1"
echo "[4] DOC_ID2=$DOC_ID2"

echo "[5] Wait for baseline analyses to complete"
for i in $(seq 1 90); do
  DOCS=$(curl -s "$CORE/subjects/$SUBJECT_ID/documents" \
    -H "Authorization: Bearer $TOKEN")

  S1=$(echo "$DOCS" | jq -r ".[] | select(.id==\"$DOC_ID1\").status // empty")
  S2=$(echo "$DOCS" | jq -r ".[] | select(.id==\"$DOC_ID2\").status // empty")

  echo "doc statuses: ${S1:-NONE}, ${S2:-NONE}"

  if [ "$S1" = "COMPLETED" ] && [ "$S2" = "COMPLETED" ]; then
    break
  fi

  if [ "$i" -eq 90 ]; then
    echo "Timed out waiting for baseline analyses"
    exit 1
  fi

  sleep 2
done

echo "[5] Docs analyzed, giving reindex window..."
sleep 8

echo "[6] Create first insight session (baseline)"
SESSION1_ID=$(
  curl -s -X POST "$CORE/subjects/$SUBJECT_ID/insight-sessions" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"documentIds\":[\"$DOC_ID1\",\"$DOC_ID2\"]}" \
  | jq -r '.id'
)

if [ -z "$SESSION1_ID" ] || [ "$SESSION1_ID" = "null" ]; then
  echo "Create session1 failed"
  exit 1
fi

echo "[6] SESSION1_ID=$SESSION1_ID"

for i in $(seq 1 90); do
  SNAP=$(curl -s "$CORE/insight-sessions/$SESSION1_ID" \
    -H "Authorization: Bearer $TOKEN")
  STATUS=$(echo "$SNAP" | jq -r '.status // empty')

  echo "session1 status: ${STATUS:-NONE}"

  if [ "$STATUS" = "READY" ] || [ "$STATUS" = "FAILED" ]; then
    break
  fi

  if [ "$i" -eq 90 ]; then
    echo "Timed out waiting for session1"
    exit 1
  fi

  sleep 2
done

echo "[7] Create third exam with different content (Bayes)"

cat > /tmp/examC.txt << 'CEOQ'
Section C
Q1) Derive Bayes theorem for discrete variables and compute a posterior distribution.
Q2) Compare MAP vs MLE; discuss prior influence. Include an example with binomial likelihood.
CEOQ

RESP3=$(
  curl -s -X POST "$CORE/subjects/$SUBJECT_ID/documents" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@/tmp/examC.txt" \
    -F "resourceType=EXAM"
)

echo "Upload3: $RESP3"

DOC_ID3=$(echo "$RESP3" | jq -r '.id // empty')

if [ -z "$DOC_ID3" ]; then
  echo "Upload3 failed"
  exit 1
fi

echo "[7] DOC_ID3=$DOC_ID3"

echo "[7] Wait for third exam analysis"
for i in $(seq 1 90); do
  DOCS=$(curl -s "$CORE/subjects/$SUBJECT_ID/documents" \
    -H "Authorization: Bearer $TOKEN")
  S3=$(echo "$DOCS" | jq -r ".[] | select(.id==\"$DOC_ID3\").status // empty")

  echo "doc3 status: ${S3:-NONE}"

  if [ "$S3" = "COMPLETED" ]; then
    break
  fi

  if [ "$i" -eq 90 ]; then
    echo "Timed out waiting for doc3"
    exit 1
  fi

  sleep 2
done

echo "[7] Reindex window after doc3..."
sleep 8

echo "[8] Create second insight session (with third doc, expect diffs)"
SESSION2_ID=$(
  curl -s -X POST "$CORE/subjects/$SUBJECT_ID/insight-sessions" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"documentIds\":[\"$DOC_ID1\",\"$DOC_ID2\",\"$DOC_ID3\"]}" \
  | jq -r '.id'
)

if [ -z "$SESSION2_ID" ] || [ "$SESSION2_ID" = "null" ]; then
  echo "Create session2 failed"
  exit 1
fi

echo "[8] SESSION2_ID=$SESSION2_ID"

for i in $(seq 1 90); do
  SNAP2=$(curl -s "$CORE/insight-sessions/$SESSION2_ID" \
    -H "Authorization: Bearer $TOKEN")
  STATUS2=$(echo "$SNAP2" | jq -r '.status // empty')

  echo "session2 status: ${STATUS2:-NONE}"

  if [ "$STATUS2" = "READY" ] || [ "$STATUS2" = "FAILED" ]; then
    break
  fi

  if [ "$i" -eq 90 ]; then
    echo "Timed out waiting for session2"
    exit 1
  fi

  sleep 2
done

cat > /tmp/e2e_vars.sh << VARS
export CORE="$CORE"
export TOKEN="$TOKEN"
export SUBJECT_ID="$SUBJECT_ID"
export DOC_ID1="$DOC_ID1"
export DOC_ID2="$DOC_ID2"
export DOC_ID3="$DOC_ID3"
export SESSION1_ID="$SESSION1_ID"
export SESSION2_ID="$SESSION2_ID"
VARS

chmod 600 /tmp/e2e_vars.sh

echo "[9] Final concise summary for SESSION2 (diff-producing)"
curl -s "$CORE/insight-sessions/$SESSION2_ID" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '{
      status,
      result: {
        summary: (.result.summary // null),
        timings: (.result.timings // .timings // null),
        diffs:   (.result.diffs   // .diffs   // null),
        forecast: (.result.forecast // null),
        warnings: (
          .result.warnings //
          .result.insight?.warnings //
          .result.output?.warnings //
          null
        ),
        syntheticExamples: (
          .result.syntheticExamples //
          .result.insight?.syntheticExamples //
          .result.output?.syntheticExamples //
          null
        )
      }
    }'
