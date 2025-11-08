from app.core.librarian import extract_questions


def test_extract_questions_classification_and_marks():
    text = (
        "Question 1: Calculate the integral of x^2. [10 marks]\n"
        "Question 2: Apply the following case to the scenario given. [12 marks]\n"
        "Question 3: Define entropy in information theory. [5 marks]\n"
        "Question 4: Compare supervised and unsupervised learning. [8 marks]\n"
        "Question 5: Discuss the role of ethics in AI. [10 marks]\n"
        "Question 6: (A) Option A (B) Option B\n"
        "Question 7: This line is vague.\n"
    )

    qs = extract_questions(text)
    modes = {q.assessment_mode for q in qs}
    marks = {q.index: q.marks for q in qs}

    # Expect presence of the full 5-way modes plus OBJECTIVE and UNKNOWN fallback
    assert "CALCULATION" in modes
    assert "APPLICATION" in modes
    assert "DEFINITION" in modes
    assert "COMPARISON" in modes
    assert "THEORY" in modes
    assert "OBJECTIVE" in modes
    assert "UNKNOWN" in modes

    # Marks parsed as floats where present
    assert marks.get(1) == 10.0
    assert marks.get(2) == 12.0
    assert marks.get(3) == 5.0
    assert marks.get(4) == 8.0
    assert marks.get(5) == 10.0
    # No marks for question 6/7
    assert marks.get(6) is None or isinstance(marks.get(6), float) is False
    assert marks.get(7) is None
