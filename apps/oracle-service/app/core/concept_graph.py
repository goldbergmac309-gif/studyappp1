from __future__ import annotations

import re
from collections import defaultdict
from typing import Any, Dict, List, Tuple


def build_concept_graph(
    topics: List[Dict[str, Any]],
    questions: List[Dict[str, Any]],
    doc_types: Dict[str, str] | None = None,
    taxonomy: Dict[str, Any] | None = None,
) -> Tuple[Dict[str, Any], Dict[str, Any], Dict[str, Any]]:
    slug_counts: Dict[str, int] = {}
    concept_nodes: List[Dict[str, Any]] = []
    concept_terms: Dict[str, List[str]] = {}

    def _doc_weight(t: str | None) -> float:
        weights = {
            "EXAM": 1.0,
            "PRACTICE_SET": 0.85,
            "LECTURE_NOTES": 0.7,
            "SYLLABUS": 0.65,
            "TEXTBOOK": 0.6,
            "NOTES": 0.55,
            "OTHER": 0.5,
        }
        return weights.get(str(t or "OTHER").upper(), 0.5)

    def _topic_weight(topic: Dict[str, Any]) -> float:
        base = float(topic.get("weight", 0.0))
        if not doc_types:
            return base
        dids = topic.get("documentIds") or []
        if not dids:
            return base
        weights = [_doc_weight(doc_types.get(str(d))) for d in dids]
        avg_w = sum(weights) / len(weights) if weights else 1.0
        return base * (avg_w or 1.0)

    # Optional taxonomy index
    tax_entries: List[Dict[str, Any]] = []
    if taxonomy and isinstance(taxonomy.get("concepts"), list):
        for c in taxonomy.get("concepts", []) or []:
            if not isinstance(c, dict):
                continue
            label = str(c.get("label") or "").strip()
            terms = [str(x).lower() for x in (c.get("terms") or []) if isinstance(x, (str,))]
            path = str(c.get("path") or "").strip() or None
            if label:
                tax_entries.append({"label": label, "terms": set(terms), "path": path})

    total_weight = sum(_topic_weight(t) for t in topics) or 1.0

    for topic in topics:
        label = topic.get("label") or "Concept"
        base_slug = slugify(label)
        slug = ensure_unique_slug(base_slug, slug_counts)
        coverage = float(_topic_weight(topic) or 1.0) / total_weight
        # Initial mastery/difficulty seeded from coverage; will refine below
        mastery = max(0.15, min(0.95, 0.4 + coverage))
        difficulty = max(0.2, min(0.95, 1 - coverage + 0.2))
        # Attempt taxonomy alignment
        taxonomy_path = None
        extra_terms: List[str] = []
        if tax_entries:
            topic_terms = {
                str(term.get("term") or "").lower()
                for term in (topic.get("terms") or [])
                if isinstance(term, dict) and term.get("term")
            }
            # Prefer label match; else highest overlap in terms
            best = None
            best_score = 0.0
            for entry in tax_entries:
                score = 0.0
                if slugify(entry["label"]) == base_slug:
                    score = 2.0
                elif topic_terms and entry.get("terms"):
                    overlap = len(topic_terms & entry["terms"])
                    score = overlap / max(1, len(entry["terms"]))
                if score > best_score:
                    best = entry
                    best_score = score
            if best and (best_score >= 0.2):
                taxonomy_path = best.get("path") or best.get("label")
                extra_terms = list(best.get("terms") or [])

        concept_nodes.append(
            {
                "slug": slug,
                "label": label,
                "description": f"Key ideas around {label}",
                "taxonomyPath": taxonomy_path,
                "masteryScore": mastery,
                "difficulty": difficulty,
                "coverage": coverage,
                "metadata": {
                    "source": "oracle.topics",
                    "topTerms": topic.get("terms", []),
                    "documentIds": topic.get("documentIds", []),
                },
            }
        )
        concept_terms[slug] = [
            term.get("term", "").lower()
            for term in topic.get("terms", [])
            if term.get("term")
        ] + extra_terms

    if "core-foundations" not in concept_terms:
        concept_nodes.append(
            {
                "slug": "core-foundations",
                "label": "Core Foundations",
                "description": "Baseline comprehension and recall questions",
                "taxonomyPath": "foundation",
                "masteryScore": 0.55,
                "difficulty": 0.35,
                "coverage": 0.2,
                "metadata": {"source": "oracle.inferred"},
            }
        )
        concept_terms["core-foundations"] = []

    exam_count = 0
    if doc_types:
        exam_count = sum(1 for t in doc_types.values() if str(t).upper() == "EXAM")
    mode = "SMALLSET" if exam_count and exam_count <= 3 else "RICH"

    bindings = assign_questions_to_concepts(
        questions,
        concept_terms,
        top_k=1 if mode == "SMALLSET" else 2,
    )

    concept_links = derive_concept_links(bindings)
    family_groups = derive_question_families(questions)

    # --- Phase 3: refine mastery/difficulty using families, distinct exams, marks ---
    # Build lookups
    q_by_id: Dict[str, Dict[str, Any]] = {str(q.get("id")): q for q in questions if q.get("id")}
    concept_to_qids: Dict[str, List[str]] = defaultdict(list)
    for b in bindings:
        qid = b.get("question", {}).get("questionId")
        slug = b.get("conceptSlug")
        if qid and slug:
            concept_to_qids[slug].append(qid)

    def _jaccard(a: set[str], b: set[str]) -> float:
        if not a or not b:
            return 0.0
        inter = len(a & b)
        union = len(a | b) or 1
        return inter / union

    def _family_count_for(qids: List[str]) -> int:
        # Simple greedy grouping via Jaccard over tokens
        toks: List[set[str]] = []
        for qid in qids:
            q = q_by_id.get(qid) or {}
            prompt = str(q.get("prompt") or "").lower()
            toks.append(tokenize(prompt))
        used = set()
        families = 0
        for i in range(len(toks)):
            if i in used:
                continue
            used.add(i)
            base = toks[i]
            for j in range(i + 1, len(toks)):
                if j in used:
                    continue
                if _jaccard(base, toks[j]) >= 0.35:
                    used.add(j)
            families += 1
        return families

    # Collect metrics per concept
    metrics: Dict[str, Dict[str, float]] = {}
    max_families = 1
    max_exams = 1
    max_marks = 1.0
    total_exam_docs = sum(1 for t in (doc_types or {}).values() if str(t).upper() == "EXAM") or 1
    for node in concept_nodes:
        slug = node["slug"]
        qids = concept_to_qids.get(slug, [])
        if not qids:
            metrics[slug] = {"families": 0.0, "exams": 0.0, "marks": 0.0}
            continue
        fam_count = _family_count_for(qids)
        exams = len({str((q_by_id.get(qid) or {}).get("documentId") or "") for qid in qids if (q_by_id.get(qid) or {}).get("documentId")})
        marks_sum = 0.0
        for qid in qids:
            q = q_by_id.get(qid) or {}
            try:
                m = float(q.get("marks")) if q.get("marks") is not None else 0.0
            except Exception:
                m = 0.0
            marks_sum += m
        metrics[slug] = {"families": float(fam_count), "exams": float(exams), "marks": float(marks_sum)}
        max_families = max(max_families, fam_count)
        max_exams = max(max_exams, exams)
        max_marks = max(max_marks, marks_sum)

    # Adjust mastery/difficulty per mode
    for node in concept_nodes:
        slug = node["slug"]
        cov = float(node.get("coverage") or 0.0)
        fam = metrics.get(slug, {}).get("families", 0.0) / max(1.0, float(max_families))
        exm = metrics.get(slug, {}).get("exams", 0.0) / max(1.0, float(max_exams))
        mrk = metrics.get(slug, {}).get("marks", 0.0) / max(1.0, float(max_marks))
        tax_bonus = 0.05 if node.get("taxonomyPath") else 0.0
        if mode == "SMALLSET":
            score = 0.15 + 0.35 * fam + 0.35 * (exm / float(total_exam_docs)) + 0.15 * cov + tax_bonus
        else:  # RICH
            score = 0.2 + 0.3 * cov + 0.25 * fam + 0.25 * exm + tax_bonus
            score = min(1.0, score + 0.1 * mrk)
        score = max(0.0, min(1.0, float(score)))
        mastery = max(0.2, min(0.95, 0.3 + 0.6 * score))
        difficulty = max(0.2, min(0.95, 1.1 - mastery))
        node["masteryScore"] = mastery
        node["difficulty"] = difficulty

    graph_payload = {
        "concepts": concept_nodes,
        "links": concept_links,
        "questionConcepts": bindings,
        "families": family_groups,
    }

    insight_payload = craft_insight_payload(
        concepts=concept_nodes,
        topics=topics,
        families=family_groups,
        doc_types=doc_types,
        mode=mode,
        bindings=bindings,
        questions=questions,
    )
    forecast = craft_forecast(concept_nodes, mode)

    return graph_payload, insight_payload, forecast


def assign_questions_to_concepts(
    questions: List[Dict[str, Any]],
    concept_terms: Dict[str, List[str]],
    top_k: int = 2,
) -> List[Dict[str, Any]]:
    bindings: List[Dict[str, Any]] = []
    tokenized_cache: Dict[str, set[str]] = {}

    for question in questions:
        prompt = (question.get("prompt") or "").lower()
        if not prompt:
            continue
        tokens = tokenized_cache.get(question["id"])
        if tokens is None:
            tokens = tokenize(prompt)
            tokenized_cache[question["id"]] = tokens
        scored: List[Tuple[str, float]] = []
        for slug, terms in concept_terms.items():
            if not terms:
                continue
            overlap = sum(1 for term in terms if term in tokens)
            if overlap:
                scored.append((slug, float(overlap)))
        if not scored:
            scored = [("core-foundations", 0.2)]
        scored.sort(key=lambda x: x[1], reverse=True)
        top_matches = scored[: max(1, int(top_k))]
        for slug, value in top_matches:
            bindings.append(
                {
                    "question": {"questionId": question["id"]},
                    "conceptSlug": slug,
                    "weight": round(value, 3),
                    "confidence": min(0.95, 0.45 + value * 0.1),
                    "rationale": f"Prompt language overlaps with {slug.replace('-', ' ')}",
                }
            )
    return bindings


def derive_concept_links(
    bindings: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    question_to_concepts: Dict[str, List[str]] = defaultdict(list)
    for binding in bindings:
        qid = binding.get("question", {}).get("questionId")
        slug = binding.get("conceptSlug")
        if qid and slug:
            question_to_concepts[qid].append(slug)

    pair_counts: Dict[Tuple[str, str], int] = defaultdict(int)
    for concepts in question_to_concepts.values():
        unique = sorted(set(concepts))
        for i in range(len(unique)):
            for j in range(i + 1, len(unique)):
                pair_counts[(unique[i], unique[j])] += 1

    links: List[Dict[str, Any]] = []
    for (left, right), count in pair_counts.items():
        weight = min(1.0, 0.2 + 0.1 * count)
        relation = "PREREQUISITE" if weight > 0.35 else "SUPPORTS"
        links.append(
            {
                "fromSlug": left,
                "toSlug": right,
                "relation": relation,
                "weight": round(weight, 3),
                "metadata": {"sharedQuestions": count},
            }
        )
    return links


def derive_question_families(
    questions: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    # Greedy clustering by Jaccard similarity over token sets
    tokens: List[set[str]] = []
    for q in questions:
        prompt = (q.get("prompt") or "").lower()
        tokens.append(tokenize(prompt))

    used: set[int] = set()
    families: List[Dict[str, Any]] = []
    for i in range(len(questions)):
        if i in used:
            continue
        used.add(i)
        base = tokens[i]
        members_idx = [i]
        for j in range(i + 1, len(questions)):
            if j in used:
                continue
            # Jaccard
            a, b = base, tokens[j]
            inter = len(a & b)
            union = len(a | b) or 1
            if union and (inter / union) >= 0.35:
                used.add(j)
                members_idx.append(j)

        members = [questions[k] for k in members_idx]
        modes = [str((m.get("assessmentMode") or "UNKNOWN")).upper() for m in members]
        # Predominant mode for archetype
        arche = max(set(modes), key=modes.count) if modes else "UNKNOWN"
        label = f"{arche.title()} Family"
        synopsis = _mode_synopsis(arche)
        families.append(
            {
                "label": label,
                "archetype": arche.title(),
                "difficulty": average([m.get("difficulty") or 0.5 for m in members]),
                "frequency": len(members),
                "synopsis": synopsis,
                "metadata": {"source": "oracle.inferred"},
                "members": [
                    {"question": {"questionId": m["id"]}, "role": "seed"}
                    for m in members[:12]
                ],
            }
        )
    return families[:8]


def craft_insight_payload(
    concepts: List[Dict[str, Any]],
    topics: List[Dict[str, Any]],
    families: List[Dict[str, Any]],
    doc_types: Dict[str, str] | None = None,
    mode: str | None = None,
    bindings: List[Dict[str, Any]] | None = None,
    questions: List[Dict[str, Any]] | None = None,
) -> Dict[str, Any]:
    risk_concepts = sorted(
        concepts,
        key=lambda c: c.get("masteryScore", 0),
    )[:3]
    topic_cards = [
        {
            "label": t.get("label"),
            "weight": t.get("weight"),
            "terms": t.get("terms", []),
        }
        for t in topics[:6]
    ]
    family_cards = [
        {"label": fam["label"], "synopsis": fam.get("synopsis"), "frequency": fam.get("frequency")}
        for fam in families
    ]
    study_plan = [
        {
            "title": rc.get("label"),
            "focus": "Close gaps on prerequisite theory.",
            "recommendedActions": [
                "Review solved examples",
                "Attempt one timed drill",
            ],
        }
        for rc in risk_concepts
    ]
    # Detect syllabus-only gaps (appear in syllabus/notes but not in exams)
    gaps: List[Dict[str, Any]] = []
    if doc_types:
        for t in topics:
            dids = [str(d) for d in t.get("documentIds", [])]
            types = [str(doc_types.get(d, "OTHER")).upper() for d in dids]
            has_exam = "EXAM" in types
            has_syll = any(tt in ("SYLLABUS", "LECTURE_NOTES") for tt in types)
            if has_syll and not has_exam:
                gaps.append({
                    "label": t.get("label"),
                    "reason": "syllabus-only",
                    "documentIds": dids,
                })
    # Per-concept archetype distribution (modes)
    archetypes: List[Dict[str, Any]] = []
    if bindings and questions:
        q_by_id = {str(q.get("id")): q for q in questions if q.get("id")}
        concepts_by_slug = {str(c.get("slug")): c for c in concepts}
        by_concept: Dict[str, Dict[str, int]] = {}
        bound_qids_by_concept: Dict[str, List[str]] = {}
        for b in bindings:
            slug = str(b.get("conceptSlug") or "")
            qid = str(b.get("question", {}).get("questionId") or "")
            if not slug or not qid:
                continue
            q = q_by_id.get(qid)
            if not q:
                continue
            mode_val = str(q.get("assessmentMode") or "UNKNOWN").upper()
            dist = by_concept.setdefault(slug, {})
            dist[mode_val] = dist.get(mode_val, 0) + 1
            lst = bound_qids_by_concept.setdefault(slug, [])
            lst.append(qid)
        for slug, dist in by_concept.items():
            concept = concepts_by_slug.get(slug) or {}
            archetypes.append({
                "label": concept.get("label"),
                "modes": [{"mode": k, "count": v} for k, v in sorted(dist.items(), key=lambda x: (-x[1], x[0]))],
            })

    concept_evidence: List[Dict[str, Any]] = []
    if bindings and questions and doc_types is not None:
        q_by_id = {str(q.get("id")): q for q in questions if q.get("id")}
        concepts_by_slug = {str(c.get("slug")): c for c in concepts}
        if 'bound_qids_by_concept' not in locals():
            bound_qids_by_concept = {}
            for b in bindings:
                slug = str(b.get("conceptSlug") or "")
                qid = str(b.get("question", {}).get("questionId") or "")
                if slug and qid:
                    bound_qids_by_concept.setdefault(slug, []).append(qid)
        for slug, qids in bound_qids_by_concept.items():
            concept = concepts_by_slug.get(slug) or {}
            def _marks_val(qid: str) -> float:
                try:
                    q = q_by_id.get(qid) or {}
                    return float(q.get("marks")) if q.get("marks") is not None else 0.0
                except Exception:
                    return 0.0
            top_qids = sorted(qids, key=_marks_val, reverse=True)[:3]
            ev: List[Dict[str, Any]] = []
            exs: List[Dict[str, Any]] = []
            for qid in top_qids:
                q = q_by_id.get(qid) or {}
                did = str(q.get("documentId") or "")
                dtype = str(doc_types.get(did, "OTHER")).upper() if did else "OTHER"
                try:
                    mval = float(q.get("marks")) if q.get("marks") is not None else None
                except Exception:
                    mval = None
                ev.append({"documentId": did or None, "docType": dtype, "marks": mval})
                prompt = str(q.get("prompt") or "")
                exs.append({
                    "prompt": (prompt[:160] + ("…" if len(prompt) > 160 else "")),
                    "marks": mval,
                    "documentId": did or None,
                })
            concept_evidence.append({
                "label": concept.get("label"),
                "evidence": ev,
                "examples": exs,
            })

    warnings: List[Dict[str, Any]] = []
    total_questions = len(questions or [])
    total_exams = 0
    if doc_types:
        total_exams = sum(1 for t in doc_types.values() if str(t).upper() == "EXAM")
    if total_exams <= 1 or total_questions < 5:
        warnings.append({
            "code": "LOW_DATA",
            "message": "Limited exam evidence; insights may be less stable.",
            "evidence": {"examCount": total_exams, "questionCount": total_questions},
        })
    if gaps:
        examples = [g.get("label") for g in gaps][:3]
        warnings.append({
            "code": "SYLLABUS_ONLY",
            "message": "Some topics appear only in syllabus/notes and not exams.",
            "evidence": {"topicCount": len(gaps), "examples": examples},
        })
    if questions:
        non_text = sum(1 for q in questions if q.get("hasNonText"))
        conf_vals: List[float] = []
        for q in questions:
            v = q.get("marksConfidence")
            try:
                if v is not None:
                    conf_vals.append(float(v))
            except Exception:
                continue
        avg_conf = sum(conf_vals) / len(conf_vals) if conf_vals else 1.0
        frac_non_text = non_text / max(1, len(questions))
        if frac_non_text >= 0.3 or avg_conf < 0.7:
            warnings.append({
                "code": "STRUCTURE_QUALITY",
                "message": "Low structural quality detected; OCR or layout may affect parsing.",
                "evidence": {
                    "nonTextShare": round(frac_non_text, 3),
                    "avgMarksConfidence": round(avg_conf, 3),
                    "totalQuestions": len(questions),
                },
            })

    return {
        "topicHighlights": topic_cards,
        "conceptOverview": [
            {
                "label": c.get("label"),
                "mastery": c.get("masteryScore"),
                "difficulty": c.get("difficulty"),
            }
            for c in concepts
        ],
        "riskConcepts": [
            {"label": c.get("label"), "mastery": c.get("masteryScore")}
            for c in risk_concepts
        ],
        "questionFamilies": family_cards,
        "studyPlan": study_plan,
        "gaps": gaps,
        "archetypes": archetypes,
        "conceptEvidence": concept_evidence,
        "warnings": warnings,
        "mode": mode,
    }


def craft_forecast(concepts: List[Dict[str, Any]], mode: str | None = None) -> Dict[str, Any]:
    avg_mastery = average([c.get("masteryScore", 0.5) for c in concepts])
    archetype = (
        "Concept-heavy synthesis"
        if avg_mastery < 0.55
        else "Balanced recall"
    )
    conf = round(min(0.92, max(0.25, avg_mastery + 0.2)), 3)
    if mode == "SMALLSET":
        conf = max(0.2, conf - 0.05)
    # Lightweight evidence for UI/debug
    lowest = sorted(concepts, key=lambda c: c.get("masteryScore", 0.0))[:3]
    evidence = {
        "mode": mode,
        "conceptCount": len(concepts),
        "lowestMastery": [
            {"label": c.get("label"), "mastery": c.get("masteryScore")}
            for c in lowest
        ],
    }
    return {
        "archetype": archetype,
        "nextExamConfidence": conf,
        "probabilities": [
            {"label": "Concept recall", "value": round(avg_mastery, 3)},
            {"label": "Applied reasoning", "value": round(avg_mastery * 0.8, 3)},
            {"label": "Curveball", "value": round(0.4 - avg_mastery * 0.2, 3)},
        ],
        "evidence": evidence,
    }


def slugify(label: str) -> str:
    text = label.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-") or "concept"


def ensure_unique_slug(slug: str, seen: Dict[str, int]) -> str:
    count = seen.get(slug, 0)
    seen[slug] = count + 1
    return f"{slug}-{count+1}" if count else slug


def tokenize(value: str) -> set[str]:
    cleaned = re.sub(r"[^a-z0-9\s]", " ", value.lower())
    return {token for token in cleaned.split() if len(token) >= 4}


def average(values: List[float]) -> float:
    if not values:
        return 0.0
    return sum(values) / len(values)


def _mode_synopsis(mode: str) -> str:
    mode = mode.upper()
    if mode == "OBJECTIVE":
        return "Fast-moving MCQ drills expected."
    if mode == "ESSAY":
        return "Long-form reasoning and synthesis."
    if mode == "SUBJECTIVE":
        return "Short constructed responses emphasised."
    if mode == "PRACTICAL":
        return "Hands-on demonstrations likely."
    return "Mixed-format assessment block."
