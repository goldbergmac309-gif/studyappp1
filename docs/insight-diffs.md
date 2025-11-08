# Insight Diffs Contract

This document defines the canonical behavior of the insight diffs feature. CI and tests MUST enforce these semantics.

## Summary
- Inputs: previous published/READY insight snapshot (baseline) and current computed insight.
- Output: `result.diffs.masteryChanges` is a list of objects with fields:
  - `label`: concept label
  - `before`: previous mastery (0.0 for new concepts)
  - `after`: current mastery (0.0 for dropped concepts)
  - `delta`: `after - before`

## When are diffs produced?
For any subject where:
- There exists a prior published/READY insight snapshot, and
- A new session is computed for the same subject, and
- At least one concept satisfies either:
  - Overlapping label with mastery change `|after - before| >= DIFF_MASTERY_DELTA_THRESHOLD`, or
  - New concept with `after >= DIFF_MASTERY_DELTA_THRESHOLD`.

Then:
- `result.diffs.masteryChanges` MUST contain one entry per qualifying concept.

## Non-bug cases where `masteryChanges` MAY be empty
- No prior baseline exists (worker emits `diffs_baseline_unavailable` warning).
- No concept meets the configured threshold.
- Baseline fetch fails (transient), and the worker logs make this explicit.

## Label alignment
- Primary alignment is exact label match (case-insensitive).
- Optional fuzzy alignment uses Jaccard similarity over `metadata.topTerms`:
  - Enabled when `DIFF_FUZZY_MATCH_ENABLED=true`.
  - Similarity cutoff `DIFF_FUZZY_JACCARD_MIN` (default 0.45 in production).

## Threshold
- Controlled via `DIFF_MASTERY_DELTA_THRESHOLD` (default 0.05 prod).
- Applied to both updated overlaps and new concepts.

## Production defaults
- `DIFF_MASTERY_DELTA_THRESHOLD=0.05`
- `DIFF_FUZZY_MATCH_ENABLED=true`
- `DIFF_FUZZY_JACCARD_MIN=0.45`
- `SUPPRESS_TEMPLATE_WARNINGS=false`

## E2E profile (stable, deterministic)
- Lower threshold: `DIFF_MASTERY_DELTA_THRESHOLD=0.01`
- Suppress template warnings: `SUPPRESS_TEMPLATE_WARNINGS=true`
- Fuzzy:
  - Off for deterministic run
  - Or on with `DIFF_FUZZY_JACCARD_MIN=0.45`

## Observability
Each session logs a single structured summary:
```
insight_session_summary {
  kind: "insight_session_summary",
  sessionId, subjectId,
  docCount,
  timings: { total, topics, graph, insight },
  conceptCount,
  warnings, warningCount,
  diffMasteryChanges: len(result.diffs.masteryChanges || []),
}
```
Use this to alert on regressions (e.g., `diffMasteryChanges` stuck at 0).
