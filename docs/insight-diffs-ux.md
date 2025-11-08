# Insight Diffs — UX Semantics

This describes how to present `diffs.masteryChanges` to users.

Each entry has:

- `label`: concept name
- `before`: previous mastery (0–1)
- `after`: current mastery (0–1)
- `delta`: `after - before`

## Interpretation Rules

1. **Improved (`delta > 0`, above threshold)**  
   Message: “You’ve strengthened your understanding of **{label}** based on recent work.”

2. **Weakened (`delta < 0`, `after > 0`, above threshold)**  
   Message: “Signals for **{label}** are weaker than before. Review recommended.”

3. **New concept (`before == 0`, `after >= threshold`)**  
   Message: “Newly detected strength: **{label}**. Your recent materials show good coverage here.”

4. **Dropped (`before >= threshold`, `after == 0`)**  
   Message: “We no longer see recent evidence for **{label}**. Treat this as not yet secure.”

## Ground Rules

- These are confidence signals from their materials, not grades or guarantees.
- Don’t show changes below the configured threshold.
- If no baseline / baseline unavailable, show no diffs and optionally surface “not enough history yet.”
