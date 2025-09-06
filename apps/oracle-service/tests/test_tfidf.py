from utils.nlp import top_keywords


def test_top_keywords_basic_text():
    text = (
        "machine learning enables machines to learn from data. "
        "deep learning is a subset of machine learning that uses neural networks. "
        "neural networks learn representations."
    )

    kws = top_keywords(text, top_k=10)
    terms = [t for t, _ in kws]

    # Expect important unigrams/bigrams to appear
    assert any("machine" in t for t in terms)
    assert any("learning" in t for t in terms)
    # At least one bigram appears
    assert any("machine learning" == t for t in terms) or any("deep learning" == t for t in terms)
