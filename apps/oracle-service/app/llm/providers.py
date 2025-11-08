from __future__ import annotations

from typing import Any, Dict, List, Protocol


class SummarizationProvider(Protocol):
    def summarize(self, topics: List[Dict[str, Any]], doc_count: int, chunk_count: int) -> str: ...


class LocalSummarizer:
    def summarize(self, topics: List[Dict[str, Any]], doc_count: int, chunk_count: int) -> str:
        # Select up to 5 highest-weight topics
        top = (topics or [])[:5]
        # Time heuristic: 20 min per topic + 10 min recall
        per_topic = 20
        final_recall = 10
        total = per_topic * max(1, len(top)) + final_recall

        lines = [
            "Study Plan (Local Enhanced)",
            f"- Documents: {doc_count}",
            f"- Chunks: {chunk_count}",
            f"- Total time: ~{total} minutes",
            "",
            "Schedule:",
        ]

        for i, t in enumerate(top, start=1):
            label = str(t.get("label") or "Topic")
            terms = ", ".join(
                x.get("term") for x in (t.get("terms") or []) if isinstance(x, dict)
            )
            if terms:
                label_extra = f" ({terms})"
            else:
                label_extra = ""
            lines.append(f"Block {i} — {per_topic} min — {label}{label_extra}")
            lines.append("  1) Primer (6m): define key terms; write 2 bullet definitions.")
            lines.append("  2) Practice (10m): draft 1 exam-style answer or calculation.")
            lines.append("  3) Self-check (4m): compare to notes or syllabus; fix one gap.")
            lines.append("")

        lines.append(f"Final — {final_recall} min — Recall sweep across all topics")
        lines.append("  • Close notes; list 3 facts or steps per topic from memory.")
        lines.append("  • Mark weak ones for tomorrow's first block.")

        return "\n".join(lines)


class OpenAISummarizer:
    def __init__(self, api_key: str, model: str = "gpt-4o-mini") -> None:
        self.api_key = api_key
        self.model = model

    def summarize(self, topics: List[Dict[str, Any]], doc_count: int, chunk_count: int) -> str:
        try:
            from openai import OpenAI  # type: ignore
        except Exception:
            # If SDK missing, gracefully degrade
            return LocalSummarizer().summarize(topics, doc_count, chunk_count)

        client = OpenAI(api_key=self.api_key)
        topic_lines = []
        for t in topics[:8]:
            label = str(t.get("label") or "Topic")
            terms = ", ".join(x.get("term") for x in (t.get("terms") or []) if isinstance(x, dict))
            topic_lines.append(f"- {label}: {terms}")
        prompt = (
            "You are a study coach. Create a concise 2-hour plan focusing on these topics, "
            "with time blocks and active recall strategies. Keep it under 180 words.\n"
            + "\n".join(topic_lines)
        )
        try:
            resp = client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=250,
            )
            content = resp.choices[0].message.content or ""
            return content.strip()
        except Exception:
            # Degrade to local if API fails
            return LocalSummarizer().summarize(topics, doc_count, chunk_count)
