from __future__ import annotations

"""NLP / TF-IDF helpers."""


from sklearn.feature_extraction.text import TfidfVectorizer


def top_keywords(text: str, top_k: int = 20) -> list[tuple[str, float]]:
    """Compute top TF-IDF keywords for the provided text.

    Returns list of (term, score), sorted by descending score.
    """
    if not text or not text.strip():
        return []

    vectorizer = TfidfVectorizer(
        stop_words="english",
        max_features=2000,
        ngram_range=(1, 2),
        lowercase=True,
    )
    X = vectorizer.fit_transform([text])  # shape (1, N)
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
