from app.core.concept_graph import build_concept_graph


def test_insight_payload_includes_archetypes_and_evidence():
    topics = [
        {
            "label": "Probability",
            "weight": 10.0,
            "terms": [{"term": "bayes", "score": 0.9}],
            "documentIds": ["e1"],
        }
    ]
    questions = [
        {"id": "q1", "prompt": "Apply Bayes theorem to compute posterior.", "assessmentMode": "APPLICATION", "documentId": "e1", "marks": 8},
        {"id": "q2", "prompt": "Define prior and posterior in Bayes.", "assessmentMode": "DEFINITION", "documentId": "e1", "marks": 5},
        {"id": "q3", "prompt": "Calculate P(A|B) using Bayes formula.", "assessmentMode": "CALCULATION", "documentId": "e1", "marks": 10},
    ]
    doc_types = {"e1": "EXAM"}

    graph, insight, forecast = build_concept_graph(topics, questions, doc_types)

    # Archetypes distribution exists and includes our concept
    archetypes = insight.get("archetypes", [])
    assert isinstance(archetypes, list) and len(archetypes) >= 1
    labels = {a.get("label") for a in archetypes}
    assert "Probability" in labels
    # Ensure modes recorded (at least 2 different ones)
    prob_modes = next((a.get("modes") for a in archetypes if a.get("label") == "Probability"), [])
    assert isinstance(prob_modes, list) and len(prob_modes) >= 2

    # Concept evidence exists with examples
    evidence = insight.get("conceptEvidence", [])
    assert isinstance(evidence, list) and len(evidence) >= 1
    prob_evidence = next((e for e in evidence if e.get("label") == "Probability"), None)
    assert prob_evidence is not None
    assert isinstance(prob_evidence.get("evidence"), list)
    assert isinstance(prob_evidence.get("examples"), list) and len(prob_evidence.get("examples")) >= 1
