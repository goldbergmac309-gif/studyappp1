from utils.structure import compute_document_meta


def test_compute_document_meta_includes_exam_template_features():
    text = (
        "EXAM PAPER\n"
        "SECTION I\n"
        "Question 1. Choose the correct option (A) (B) (C) (D). 5 marks\n"
        "Some MCQ content...\n"
        "Question 2. Choose the correct option (A) (B) (C) (D). 5 marks\n"
        "SECTION II\n"
        "Question 3. Long answer about derivation and proof. 15 marks\n"
    )

    meta = compute_document_meta(text)
    assert isinstance(meta, dict)
    tmpl = meta.get("examTemplate")
    assert isinstance(tmpl, dict)

    # Sections & titles
    assert isinstance(tmpl.get("sectionCount"), int)
    assert tmpl.get("sectionCount") >= 1
    assert isinstance(tmpl.get("sectionTitles"), list)

    # MCQ ratio positive due to option tokens
    assert isinstance(tmpl.get("mcqRatio"), float)
    assert tmpl.get("mcqRatio") >= 0.0

    # Marks totals and histogram
    assert tmpl.get("marksTotal") >= 25
    hist = tmpl.get("marksHistogram")
    assert isinstance(hist, dict) and set(hist.keys()) == {"small", "medium", "large"}
    assert hist["small"] >= 2  # two 5-mark questions
    assert hist["large"] >= 1  # one 15-mark question

    # Big last question heuristic should be true (15 is >= 50% of max 15)
    assert tmpl.get("bigLastQuestion") is True
