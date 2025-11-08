from app.core.concept_graph import build_concept_graph


def test_warnings_low_data_triggered():
    topics = [{
        "label": "Algebra",
        "weight": 5.0,
        "terms": [{"term": "matrix"}],
        "documentIds": ["e1"],
    }]
    # Fewer than 5 questions and only one exam
    questions = [
        {"id": "q1", "prompt": "Define matrix.", "assessmentMode": "DEFINITION", "documentId": "e1", "marks": 2},
        {"id": "q2", "prompt": "Compute determinant.", "assessmentMode": "CALCULATION", "documentId": "e1", "marks": 5},
    ]
    doc_types = {"e1": "EXAM"}

    _, insight, _ = build_concept_graph(topics, questions, doc_types)
    warnings = insight.get("warnings", [])
    assert any(w.get("code") == "LOW_DATA" for w in warnings)


def test_warnings_syllabus_only_triggered():
    topics = [{
        "label": "Set Theory",
        "weight": 4.0,
        "terms": [{"term": "subset"}],
        "documentIds": ["s1"],  # syllabus only
    }]
    questions = []
    doc_types = {"s1": "SYLLABUS"}

    _, insight, _ = build_concept_graph(topics, questions, doc_types)
    warnings = insight.get("warnings", [])
    assert any(w.get("code") == "SYLLABUS_ONLY" for w in warnings)


def test_warnings_structure_quality_triggered():
    topics = [{
        "label": "Probability",
        "weight": 8.0,
        "terms": [{"term": "bayes"}],
        "documentIds": ["e1"],
    }]
    questions = [
        {"id": "q1", "prompt": "Compute posterior.", "assessmentMode": "APPLICATION", "documentId": "e1", "marks": 8, "hasNonText": True},
        {"id": "q2", "prompt": "Define prior.", "assessmentMode": "DEFINITION", "documentId": "e1", "marks": 2, "hasNonText": True},
        {"id": "q3", "prompt": "Calculate P(A|B).", "assessmentMode": "CALCULATION", "documentId": "e1", "marks": 5},
        {"id": "q4", "prompt": "State Bayes theorem.", "assessmentMode": "DEFINITION", "documentId": "e1", "marks": 3},
    ]
    # 2/4 have hasNonText=True -> 0.5 share -> should trigger STRUCTURE_QUALITY
    doc_types = {"e1": "EXAM"}

    _, insight, _ = build_concept_graph(topics, questions, doc_types)
    warnings = insight.get("warnings", [])
    assert any(w.get("code") == "STRUCTURE_QUALITY" for w in warnings)
