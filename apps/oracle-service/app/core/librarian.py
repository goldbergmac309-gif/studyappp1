from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List, Tuple, Dict, Any

from utils.nlp import top_keywords


QUESTION_RE = re.compile(
    r"^\s*(?:q(?:uestion)?\s*)?(?P<num>\d{1,3})[\).\:-]\s*(?P<body>.+)$",
    re.IGNORECASE,
)
MARKS_RE = re.compile(r"(?P<marks>\d{1,3})\s*marks?", re.IGNORECASE)
OBJECTIVE_OPTION_RE = re.compile(r"\([A-D]\)")


@dataclass
class ParsedQuestion:
    index: int
    prompt: str
    marks: float | None
    assessment_mode: str
    taxonomy_path: str | None
    meta: Dict[str, Any]
    concept_hints: List[Dict[str, Any]]


def summarize_document(text: str, page_count: int, ocr_used: bool) -> Dict[str, Any]:
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    headings = [p for p in paragraphs if p.isupper() and len(p) <= 80]
    outline = headings[: min(10, len(headings))] or [
        paragraphs[i]
        for i in range(0, min(len(paragraphs), 10))
        if len(paragraphs[i]) <= 120
    ]
    stats = {
        "paragraphCount": len(paragraphs),
        "headingCount": len(headings),
        "avgParagraphLength": sum(len(p) for p in paragraphs) / max(1, len(paragraphs)),
        "ocrUsed": bool(ocr_used),
    }
    return {
        "schemaVersion": "librarian.v1",
        "pageCount": page_count,
        "ocrConfidence": 0.72 if ocr_used else 0.94,
        "layout": {"headingsSample": outline[:5], "paragraphsSample": paragraphs[:3]},
        "outline": [{"title": title, "order": i} for i, title in enumerate(outline)],
        "stats": stats,
    }


def extract_questions(text: str) -> List[ParsedQuestion]:
    lines = text.splitlines()
    questions: List[ParsedQuestion] = []
    buffer: List[str] = []
    current_num: int | None = None
    logical_index = 0

    def _flush():
        nonlocal logical_index
        nonlocal buffer
        if current_num is None and not buffer:
            return
        raw = " ".join(segment.strip() for segment in buffer if segment.strip())
        if not raw:
            buffer = []
            return
        logical_index += 1
        marks = _extract_marks(raw)
        assessment = _infer_assessment_mode(raw)
        taxonomy = _infer_taxonomy(raw)
        concept_hints = _concept_hints(raw)
        questions.append(
            ParsedQuestion(
                index=current_num or logical_index,
                prompt=raw,
                marks=marks,
                assessment_mode=assessment,
                taxonomy_path=taxonomy,
                meta={"source": "librarian.v1"},
                concept_hints=concept_hints,
            )
        )
        buffer = []

    for line in lines:
        match = QUESTION_RE.match(line)
        if match:
            _flush()
            current_num = int(match.group("num"))
            seed = match.group("body").strip()
            buffer = [seed] if seed else []
            continue
        if current_num is not None:
            buffer.append(line)
    _flush()

    if not questions:
        # fallback: slice long text into pseudo-questions
        chunks = _chunk_fallback(text)
        for idx, chunk in enumerate(chunks, start=1):
            concept_hints = _concept_hints(chunk)
            questions.append(
                ParsedQuestion(
                    index=idx,
                    prompt=chunk,
                    marks=None,
                    assessment_mode=_infer_assessment_mode(chunk),
                    taxonomy_path=_infer_taxonomy(chunk),
                    meta={"source": "librarian.v1-fallback"},
                    concept_hints=concept_hints,
                )
            )
    return questions


def _chunk_fallback(text: str) -> List[str]:
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    if not paragraphs:
        return []
    chunk_size = max(1, len(paragraphs) // 5)
    chunks = []
    for i in range(0, len(paragraphs), chunk_size):
        chunk = " ".join(paragraphs[i : i + chunk_size])
        if chunk:
            chunks.append(chunk)
    return chunks[:10]


def _extract_marks(raw: str) -> float | None:
    match = MARKS_RE.search(raw)
    if not match:
        return None
    try:
        return float(match.group("marks"))
    except ValueError:
        return None


def _infer_assessment_mode(raw: str) -> str:
    text = raw.lower()
    if OBJECTIVE_OPTION_RE.search(raw[:400]):
        return "OBJECTIVE"
    if any(k in text for k in ["calculate", "compute", "derive", "solve", "evaluate", "approximate", "show your work"]):
        return "CALCULATION"
    if any(k in text for k in ["apply", "case", "scenario", "given the following", "advise", "recommend", "use the following data"]):
        return "APPLICATION"
    if any(k in text for k in ["define", "what is", "list", "state", "identify", "give the definition"]):
        return "DEFINITION"
    if any(k in text for k in ["compare", "contrast", "difference between", "versus", "vs."]):
        return "COMPARISON"
    if any(k in text for k in ["discuss", "critically", "assess", "explain", "describe", "analyze", "justify"]):
        return "THEORY"
    return "UNKNOWN"


def _infer_taxonomy(raw: str) -> str | None:
    raw_low = raw.lower()
    if any(word in raw_low for word in ("explain", "justify", "analyze")):
        return "analysis"
    if any(word in raw_low for word in ("define", "list", "state")):
        return "knowledge"
    if any(word in raw_low for word in ("apply", "solve", "compute")):
        return "application"
    return None


def _concept_hints(raw: str) -> List[Dict[str, Any]]:
    try:
        terms = top_keywords(raw, top_k=3)
    except Exception:
        return []
    hints = []
    for term, score in terms:
        hints.append({"slug": term.lower().replace(" ", "-"), "weight": float(score)})
    return hints
