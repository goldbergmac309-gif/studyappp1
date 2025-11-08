from __future__ import annotations

"""NLP / TF-IDF helpers with hardened preprocessing.

Removes obvious boilerplate (URLs, emails, page/figure references), extends
stopwords, and restricts tokens to alphabetic 3+ chars to avoid noise like
"https", numbers, and course headers. This yields more meaningful keywords for
documents like syllabi and scanned exams.
"""


import re
from sklearn.feature_extraction.text import TfidfVectorizer, ENGLISH_STOP_WORDS


def top_keywords(text: str, top_k: int = 20) -> list[tuple[str, float]]:
    """Compute top TF-IDF keywords for the provided text.

    Returns list of (term, score), sorted by descending score.
    """
    if not text or not text.strip():
        return []

    # Preprocess
    url_re = re.compile(r"https?://\S+|www\.[^\s]+", re.IGNORECASE)
    email_re = re.compile(r"\b[^\s@]+@[^\s@]+\b")
    def _clean(t: str) -> str:
        t = t or ""
        t = url_re.sub(" ", t)
        t = email_re.sub(" ", t)
        t = re.sub(r"\b(page|pages|figure|fig\.?|table)\s*\d+\b", " ", t, flags=re.IGNORECASE)
        t = re.sub(r"\s+", " ", t)
        return t.strip()

    custom_sw = {
        "https", "http", "www", "com", "org", "edu", "nl",
        "university", "course", "lecture", "lecturer", "students",
        "management", "mediasite", "mini", "information", "review", "comments",
    }
    stopwords = list(ENGLISH_STOP_WORDS.union(custom_sw))

    vectorizer = TfidfVectorizer(
        stop_words=stopwords,
        max_features=2000,
        ngram_range=(1, 2),
        lowercase=True,
        token_pattern=r"(?u)\b[a-z][a-z]{2,}\b",
        preprocessor=_clean,
    )
    try:
        X = vectorizer.fit_transform([text])  # shape (1, N)
    except ValueError:
        # e.g., "empty vocabulary; perhaps the documents only contain stop words"
        return []
    feature_names = vectorizer.get_feature_names_out()
    # Convert to 1D dense array without importing numpy explicitly
    arr = X.toarray().ravel()
    order = arr.argsort()[::-1]

    results: list[tuple[str, float]] = []
    for idx in order[:top_k]:
        score = float(arr[idx])
        if score <= 0.0:
            break
        term = str(feature_names[idx])
        results.append((term, score))
    return results
