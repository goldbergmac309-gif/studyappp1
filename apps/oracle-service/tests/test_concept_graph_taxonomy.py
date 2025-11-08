from app.core.concept_graph import build_concept_graph


def test_taxonomy_alignment_sets_path_and_boosts_score():
    topics = [
        {
            "label": "Break-Even Analysis",
            "weight": 10.0,
            "terms": [{"term": "breakeven", "score": 0.8}, {"term": "contribution", "score": 0.5}],
            "documentIds": ["e1"],
        },
        {
            "label": "Linear Algebra",
            "weight": 10.0,
            "terms": [{"term": "matrix", "score": 0.8}],
            "documentIds": ["n1"],
        },
    ]
    questions = [
        {"id": "q1", "prompt": "compute break-even point", "assessmentMode": "CALCULATION", "documentId": "e1", "marks": 10},
        {"id": "q2", "prompt": "matrix rank and null space", "assessmentMode": "THEORY", "documentId": "n1", "marks": 5},
    ]

    doc_types = {"e1": "EXAM", "n1": "NOTES"}

    taxonomy = {
        "concepts": [
            {"label": "Cost-Volume-Profit Analysis", "terms": ["breakeven", "contribution margin", "cvp"], "path": "Accounting/Management/Cost-Volume-Profit"},
            {"label": "Linear Algebra", "terms": ["matrix", "vectors"], "path": "Mathematics/Algebra/Linear"},
        ]
    }

    graph, insight, forecast = build_concept_graph(topics, questions, doc_types, taxonomy)
    concepts = graph.get("concepts", [])

    # Find the taxonomy paths
    paths = {c.get("label"): c.get("taxonomyPath") for c in concepts}
    assert paths.get("Break-Even Analysis") is not None
    assert paths.get("Linear Algebra") is not None

    # Mastery score should get a slight boost for taxonomy-aligned concept
    scores = {c.get("label"): float(c.get("masteryScore") or 0.0) for c in concepts}
    assert scores.get("Break-Even Analysis", 0.0) > 0.2
    assert scores.get("Linear Algebra", 0.0) > 0.2
