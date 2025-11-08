#!/usr/bin/env bash
set -euo pipefail

# This script restarts oracle-worker with tuned diff env, runs two sessions on the same subject, and
# prints diffs with optional strict assertion (STRICT_DIFFS=1 requires at least one mastery change).

CORE=${CORE:-http://localhost:3001}
EMAIL="alex+$RANDOM@example.com"
PASS="password123"

DIFF_MASTERY_DELTA_THRESHOLD=${DIFF_MASTERY_DELTA_THRESHOLD:-0.02}
DIFF_FUZZY_MATCH_ENABLED=${DIFF_FUZZY_MATCH_ENABLED:-true}
DIFF_FUZZY_JACCARD_MIN=${DIFF_FUZZY_JACCARD_MIN:-0.1}
STRICT_DIFFS=${STRICT_DIFFS:-0}

OVR=/tmp/docker-compose.diffs.override.yml
cat > "$OVR" << YAML
services:
  oracle-worker:
    environment:
      DIFF_MASTERY_DELTA_THRESHOLD: "${DIFF_MASTERY_DELTA_THRESHOLD:-0.02}"
      DIFF_FUZZY_MATCH_ENABLED: "${DIFF_FUZZY_MATCH_ENABLED:-true}"
      DIFF_FUZZY_JACCARD_MIN: "${DIFF_FUZZY_JACCARD_MIN:-0.1}"
      SUPPRESS_TEMPLATE_WARNINGS: "true"
YAML

echo "[diffs] Restart oracle-worker with tuned env: threshold=$DIFF_MASTERY_DELTA_THRESHOLD fuzzy=$DIFF_FUZZY_MATCH_ENABLED jmin=$DIFF_FUZZY_JACCARD_MIN"
if [ -n "${COMPOSE_EXTRA:-}" ]; then
  docker compose -f docker-compose.yml -f docker-compose.local.override.yml -f "$OVR" -f "$COMPOSE_EXTRA" up -d oracle-worker
else
  docker compose -f docker-compose.yml -f docker-compose.local.override.yml -f "$OVR" up -d oracle-worker
fi
docker compose exec oracle-worker env | egrep 'DIFF_MASTERY_DELTA_THRESHOLD|DIFF_FUZZY_MATCH_ENABLED|DIFF_FUZZY_JACCARD_MIN' || true

echo "[1] Using CORE=$CORE"
echo "[1] Signup as $EMAIL"
TOKEN=$(curl -s -X POST "$CORE/auth/signup" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" | jq -r .accessToken)
[ -n "$TOKEN" ] && [ "$TOKEN" != null ] || { echo "Signup failed"; exit 1; }

echo "[2] Create subject"
SUBJECT_ID=$(curl -s -X POST "$CORE/subjects" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"name":"E2E Diffs Tuned"}' | jq -r .id)
[ -n "$SUBJECT_ID" ] && [ "$SUBJECT_ID" != null ] || { echo "Create subject failed"; exit 1; }

# Baseline docs with interval present
cat > /tmp/diff_base_interval.txt << EOF
Q1) Compute a confidence interval and interpret the result.
Q2) Discuss regression assumptions and p-value interpretation.
EOF
cat > /tmp/diff_base_mixed.txt << EOF
Q1) Use Dijkstra algorithm to find shortest paths and analyze complexity.
EOF

R1=$(curl -s -X POST "$CORE/subjects/$SUBJECT_ID/documents" -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/diff_base_interval.txt" -F "resourceType=EXAM")
R2=$(curl -s -X POST "$CORE/subjects/$SUBJECT_ID/documents" -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/diff_base_mixed.txt" -F "resourceType=EXAM")
DOC1=$(echo "$R1" | jq -r .id); DOC2=$(echo "$R2" | jq -r .id)

for i in {1..60}; do
  D=$(curl -s "$CORE/subjects/$SUBJECT_ID/documents" -H "Authorization: Bearer $TOKEN")
  S1=$(echo "$D" | jq -r ".[]|select(.id==\"$DOC1\").status")
  S2=$(echo "$D" | jq -r ".[]|select(.id==\"$DOC2\").status")
  echo "baseline statuses: $S1, $S2"; [ "$S1" = COMPLETED ] && [ "$S2" = COMPLETED ] && break; sleep 2
done
sleep 12

echo "[4] Session1"
S1=$(curl -s -X POST "$CORE/subjects/$SUBJECT_ID/insight-sessions" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d "{\"documentIds\":[\"$DOC1\",\"$DOC2\"]}" | jq -r .id)
for i in {1..60}; do st=$(curl -s "$CORE/insight-sessions/$S1" -H "Authorization: Bearer $TOKEN" | jq -r .status); echo "s1:$st"; [ "$st" = READY -o "$st" = FAILED ] && break; sleep 2; done

# Add heavy interval doc to push mastery
cat > /tmp/diff_interval_heavy.txt << EOF
Q1) Derive a 95% confidence interval for a binomial parameter and explain interval width.
Q2) Compare CI vs hypothesis test; discuss interpretation pitfalls; include CI calculation.
EOF
R3=$(curl -s -X POST "$CORE/subjects/$SUBJECT_ID/documents" -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/diff_interval_heavy.txt" -F "resourceType=EXAM")
DOC3=$(echo "$R3" | jq -r .id)
for i in {1..60}; do
  S3=$(curl -s "$CORE/subjects/$SUBJECT_ID/documents" -H "Authorization: Bearer $TOKEN" | jq -r ".[]|select(.id==\"$DOC3\").status")
  echo "doc3:$S3"; [ "$S3" = COMPLETED ] && break; sleep 2
done
sleep 6

# Add a distinct Bayes-heavy doc to guarantee a new concept label
cat > /tmp/diff_bayes_heavy.txt << EOF
Q1) Derive Bayes' theorem; compute posterior with Beta prior and Binomial likelihood.
Q2) Explain conjugate priors; compare MAP vs MLE; discuss posterior predictive.
EOF
R4=$(curl -s -X POST "$CORE/subjects/$SUBJECT_ID/documents" -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/diff_bayes_heavy.txt" -F "resourceType=EXAM")
DOC4=$(echo "$R4" | jq -r .id)
for i in {1..60}; do
  S4=$(curl -s "$CORE/subjects/$SUBJECT_ID/documents" -H "Authorization: Bearer $TOKEN" | jq -r ".[]|select(.id==\"$DOC4\").status")
  echo "doc4:$S4"; [ "$S4" = COMPLETED ] && break; sleep 2
done
sleep 10

echo "[6] Session2"
S2=$(curl -s -X POST "$CORE/subjects/$SUBJECT_ID/insight-sessions" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d "{\"documentIds\":[\"$DOC1\",\"$DOC2\",\"$DOC3\",\"$DOC4\"]}" | jq -r .id)
for i in {1..60}; do st=$(curl -s "$CORE/insight-sessions/$S2" -H "Authorization: Bearer $TOKEN" | jq -r .status); echo "s2:$st"; [ "$st" = READY -o "$st" = FAILED ] && break; sleep 2; done

echo "[7] Summary with diffs"
RES=$(curl -s "$CORE/insight-sessions/$S2" -H "Authorization: Bearer $TOKEN")
echo "$RES" | jq '{status, result: { timings: (.result.timings // null), diffs: (.result.diffs // null), warnings: (.result.warnings // .result.insight?.warnings // null) }}'

# Debug: show concept labels for verification
echo "$RES" | jq '{conceptLabels: (.result.conceptGraph.concepts | map(.label))}'

COUNT=$(echo "$RES" | jq -r '(.result.diffs.masteryChanges // []) | length')
echo "[7] masteryChanges count=$COUNT"
if [ "$STRICT_DIFFS" = "1" ] && [ "$COUNT" -lt 1 ]; then
  echo "STRICT mode: expected at least one mastery change but found none" >&2
  exit 2
fi

# Revert worker to normal env
echo "[revert] Restore oracle-worker to normal"
if [ -n "${COMPOSE_EXTRA:-}" ]; then
  docker compose -f docker-compose.yml -f docker-compose.local.override.yml -f "$COMPOSE_EXTRA" up -d oracle-worker
else
  docker compose -f docker-compose.yml -f docker-compose.local.override.yml up -d oracle-worker
fi
