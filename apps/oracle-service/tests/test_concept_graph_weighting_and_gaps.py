from app.core.concept_graph import build_concept_graph


def test_doc_type_weighting_and_syllabus_only_gaps():
    topics = [
        {
            "label": "Linear Algebra",
            "weight": 10.0,
            "terms": [{"term": "matrix", "score": 0.8}],
            "documentIds": ["d1", "d2"],  # exams
        },
        {
            "label": "Ethics",
            "weight": 10.0,
            "terms": [{"term": "ethics", "score": 0.7}],
            "documentIds": ["s1"],  # syllabus only
        },
    ]
    # Questions minimal (ids required downstream)
    questions = [
        {"id": "q1", "prompt": "matrix multiplication", "assessmentMode": "THEORY"},
        {"id": "q2", "prompt": "ethics in ai", "assessmentMode": "THEORY"},
    ]
    # Map document ids to resource types
    doc_types = {"d1": "EXAM", "d2": "EXAM", "s1": "SYLLABUS"}

    graph, insight, forecast = build_concept_graph(topics, questions, doc_types)

    # Expect two concepts created
    concepts = graph.get("concepts", [])
    assert len(concepts) >= 2
    # Find coverage for both labels
    cov = {c.get("label"): float(c.get("coverage")) for c in concepts}
    assert cov["Linear Algebra"] > cov["Ethics"], "Exam-backed topic should have higher coverage than syllabus-only"

    # Gaps should include the syllabus-only topic
    gaps = insight.get("gaps", [])
    gap_labels = {g.get("label") for g in gaps}
    assert "Ethics" in gap_labels

    # Mode should be SMALLSET (2 exams <= 3)
    assert insight.get("mode") == "SMALLSET"
