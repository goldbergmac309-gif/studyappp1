from app.core.concept_graph import build_concept_graph


def test_smallset_vs_rich_mode_switch():
    topics = [
        {
            "label": "Linear Algebra",
            "weight": 10.0,
            "terms": [{"term": "matrix", "score": 0.8}],
            "documentIds": ["e1", "e2"],
        },
        {
            "label": "Ethics",
            "weight": 10.0,
            "terms": [{"term": "ethics", "score": 0.7}],
            "documentIds": ["s1"],
        },
    ]
    questions = [
        {"id": "q1", "prompt": "matrix multiplication", "assessmentMode": "THEORY", "documentId": "e1"},
        {"id": "q2", "prompt": "ethics in ai", "assessmentMode": "THEORY", "documentId": "s1"},
    ]

    # Smallset: 2 exams => SMALLSET
    doc_types_small = {"e1": "EXAM", "e2": "EXAM", "s1": "SYLLABUS"}
    graph_s, insight_s, _ = build_concept_graph(topics, questions, doc_types_small)
    assert insight_s.get("mode") == "SMALLSET"

    # Rich: 4 exams => RICH
    doc_types_rich = {"e1": "EXAM", "e2": "EXAM", "e3": "EXAM", "e4": "EXAM", "s1": "SYLLABUS"}
    graph_r, insight_r, _ = build_concept_graph(topics, questions, doc_types_rich)
    assert insight_r.get("mode") == "RICH"
