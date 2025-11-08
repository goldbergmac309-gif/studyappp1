from __future__ import annotations

from typing import Any, Dict, List, Tuple
import re


COMMON_EN_WORDS = {"the", "and", "of", "to", "in", "for", "is", "on", "with", "that"}


def _detect_lang(text: str) -> str:
    sample = text.lower()
    hits = sum(1 for w in COMMON_EN_WORDS if w in sample)
    return "en" if hits >= 2 else "unknown"


def _estimate_headings(text: str) -> int:
    # crude: count lines that look like headings (short, mostly uppercase or numbered)
    lines: List[str] = [l.strip() for l in text.splitlines()]
    count = 0
    for line in lines:
        if not line:
            continue
        # Numbered heading like "1. Introduction" or "I. Overview"
        if re.match(r"^(\d+\.|[IVX]+\.)\s+\w+", line):
            count += 1
            continue
        # All caps short tokens
        if len(line) <= 60 and re.match(r"^[A-Z0-9\-\s:]{4,}$", line) and line.upper() == line:
            count += 1
    return count


def _extract_headings(text: str, max_items: int = 50) -> List[Dict[str, Any]]:
    """
    Extract a lightweight outline from plain text by identifying lines that look like headings.
    Heuristics mirror _estimate_headings(), but return concrete entries with optional level.
    """
    lines: List[str] = [l.strip() for l in text.splitlines()]
    out: List[Dict[str, Any]] = []
    for line in lines:
        if not line:
            continue
        # Numbered heading like "1. Introduction" or "2. Methods"
        m = re.match(r"^(\d+)\.\s+(.+)$", line)
        if m:
            try:
                level = int(m.group(1))
            except Exception:
                level = None
            title = m.group(2).strip()
            if title:
                out.append({"title": title, "level": level})
                if len(out) >= max_items:
                    break
            continue
        # Roman numerals like "I. OVERVIEW"
        m2 = re.match(r"^([IVX]+)\.\s+(.+)$", line)
        if m2:
            title = m2.group(2).strip()
            if title:
                out.append({"title": title, "level": None})
                if len(out) >= max_items:
                    break
            continue
        # All caps short tokens
        if (
            len(line) <= 60
            and re.match(r"^[A-Z0-9\-\s:]{4,}$", line)
            and line.upper() == line
        ):
            out.append({"title": line.title(), "level": None})
            if len(out) >= max_items:
                break
    return out


def _detect_resource_type(text: str) -> str:
    t = text.lower()
    if "syllabus" in t:
        return "SYLLABUS"
    if "exam" in t or "midterm" in t or "final" in t:
        return "EXAM"
    if "practice" in t or "worksheet" in t:
        return "PRACTICE_SET"
    if "lecture" in t and "notes" in t:
        return "LECTURE_NOTES"
    if "textbook" in t or "chapter" in t:
        return "TEXTBOOK"
    if "notes" in t:
        return "NOTES"
    return "OTHER"


def _detect_questions(text: str) -> bool:
    # simple: presence of many question marks or the word "question"
    qmarks = text.count("?")
    question_words = len(re.findall(r"\bquestion\b", text, flags=re.IGNORECASE))
    return qmarks >= 3 or question_words >= 2


def _estimate_sections(headings: List[Dict[str, Any]]) -> Tuple[int, List[str]]:
    count = len(headings)
    titles = [h.get("title") for h in headings[:6] if isinstance(h, dict) and h.get("title")]
    return count, titles


def _estimate_mcq_ratio(text: str) -> float:
    # Count occurrences of option patterns like (A) (B) (C) (D)
    options = re.findall(r"\([A-D]\)", text)
    # Approximate number of questions: occurrences of 'Question' tokens or numbered headings
    q_tokens = re.findall(r"\bquestion\b|^\s*\d+[\)\.:]", text, flags=re.IGNORECASE | re.MULTILINE)
    approx_q = max(1, len(q_tokens))
    ratio = min(1.0, (len(options) / float(approx_q)) / 2.0)
    return round(ratio, 3)


def _marks_list(text: str) -> List[int]:
    vals = []
    for m in re.findall(r"(\d{1,3})\s*marks?", text, flags=re.IGNORECASE):
        try:
            vals.append(int(m))
        except Exception:
            continue
    return vals


def _marks_histogram(marks: List[int]) -> Dict[str, int]:
    hist = {"small": 0, "medium": 0, "large": 0}
    for v in marks:
        if v <= 5:
            hist["small"] += 1
        elif v <= 10:
            hist["medium"] += 1
        else:
            hist["large"] += 1
    return hist


def _big_last_question(text: str, last_mark: int | None, max_mark: int | None) -> bool:
    if last_mark is None or max_mark is None or max_mark <= 0:
        return False
    # Heuristic: last question has >= 50% of max question marks
    return last_mark >= max(5, int(0.5 * max_mark))


def compute_document_meta(text: str) -> Dict[str, Any]:
    text = text or ""
    headings = _extract_headings(text)
    section_count, section_titles = _estimate_sections(headings)
    marks_vals = _marks_list(text)
    max_mark = max(marks_vals) if marks_vals else None
    last_mark = marks_vals[-1] if marks_vals else None
    exam_template = {
        "sectionCount": section_count,
        "sectionTitles": section_titles,
        "mcqRatio": _estimate_mcq_ratio(text),
        "marksTotal": sum(marks_vals) if marks_vals else 0,
        "maxQuestionMarks": max_mark,
        "marksHistogram": _marks_histogram(marks_vals),
        "bigLastQuestion": _big_last_question(text, last_mark, max_mark),
    }
    return {
        "lang": _detect_lang(text),
        "headingCount": _estimate_headings(text),
        "headings": headings,
        "detectedResourceType": _detect_resource_type(text),
        "detectedQuestions": _detect_questions(text),
        "examTemplate": exam_template,
    }
