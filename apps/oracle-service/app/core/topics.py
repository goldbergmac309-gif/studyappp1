from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Tuple

import math
import re
from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import TfidfVectorizer, ENGLISH_STOP_WORDS


@dataclass
class Topic:
    label: str
    weight: float
    terms: List[Tuple[str, float]]
    document_ids: List[str]


def _choose_k(n: int) -> int:
    if n <= 0:
        return 0
    # heuristic: ~sqrt(n/10), clamped
    k = max(3, min(20, int(round(math.sqrt(max(1, n / 10.0))))))
    return min(k, n)


def compute_subject_topics(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Compute subject-level topics from chunk records.

    records: list of { text: str, embedding: List[float], documentId: str }
    returns: list of topics [{ label, weight, terms: [{term,score}], documentIds }]
    """
    if not records:
        return []

    texts = [r.get("text", "") for r in records]
    doc_ids = [str(r.get("documentId", "")) for r in records]

    # Preprocess: strip URLs/emails, collapse whitespace, and ignore tokens with digits
    url_re = re.compile(r"https?://\S+|www\.[^\s]+", re.IGNORECASE)
    email_re = re.compile(r"\b[^\s@]+@[^\s@]+\b")
    def _clean_text(t: str) -> str:
        t = t or ""
        t = url_re.sub(" ", t)
        t = email_re.sub(" ", t)
        # Remove page/figure/table boilerplate patterns
        t = re.sub(r"\b(page|pages|figure|fig\.?|table)\s*\d+\b", " ", t, flags=re.IGNORECASE)
        t = re.sub(r"\s+", " ", t)
        return t.strip()

    cleaned = [_clean_text(t) for t in texts]

    # Extended stopwords to kill domain boilerplate
    custom_sw = {
        "https", "http", "www", "com", "org", "edu", "nl",
        "university", "maastrichtuniversity", "course", "lecture", "lecturer",
        "students", "management", "mediasite", "mini", "information",
        "review", "comments"
    }
    stopwords = list(ENGLISH_STOP_WORDS.union(custom_sw))

    # TF-IDF for cluster labeling; ignore tokens with digits and keep 1-2 grams
    vectorizer = TfidfVectorizer(
        max_features=5000,
        stop_words=stopwords,
        ngram_range=(1, 2),
        lowercase=True,
        token_pattern=r"(?u)\b[a-z][a-z]{2,}\b",
        min_df=1,
        max_df=0.9,
        sublinear_tf=True,
        preprocessor=_clean_text,
    )
    try:
        tfidf = vectorizer.fit_transform(cleaned)
    except ValueError:
        # e.g., empty vocabulary for very small/clean corpora -> no topics
        return []
    # If no features survived preprocessing, bail out gracefully
    if getattr(tfidf, "shape", (0, 0))[1] == 0:
        return []
    vocab = vectorizer.get_feature_names_out()

    n = len(records)
    k = _choose_k(n)
    if k <= 0:
        return []

    # KMeans on TF-IDF (cheap and text-driven); alternative: embeddings if available
    km = KMeans(n_clusters=k, n_init=5, random_state=42)
    labels = km.fit_predict(tfidf)

    topics: List[Dict[str, Any]] = []
    for c in range(k):
        idxs = [i for i, lab in enumerate(labels) if lab == c]
        if not idxs:
            continue
        cluster_mat = tfidf[idxs]
        center = cluster_mat.mean(axis=0)
        center = center.A1  # to 1D array
        # Top 5 terms
        top_idx = center.argsort()[-5:][::-1]
        terms = [(str(vocab[i]), float(center[i])) for i in top_idx if center[i] > 0]
        # Label = top term
        label = terms[0][0] if terms else f"Topic {c+1}"
        # Weight = cluster size
        weight = float(len(idxs))
        # Document ids in this cluster
        dids = sorted(set(doc_ids[i] for i in idxs if doc_ids[i]))
        topics.append(
            {
                "label": label,
                "weight": weight,
                "terms": [{"term": t, "score": s} for t, s in terms],
                "documentIds": dids,
            }
        )

    # Sort by weight desc
    topics.sort(key=lambda t: t.get("weight", 0), reverse=True)
    return topics
