from __future__ import annotations

import logging
import json
from typing import Any, Dict, List, Set, Optional
import time

from celery import shared_task
from requests import Response
from requests.exceptions import ConnectionError as ReqConnectionError, Timeout as ReqTimeout
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.core.topics import compute_subject_topics
from app.core.concept_graph import build_concept_graph
from app.llm.providers import LocalSummarizer, OpenAISummarizer
from config import get_settings, init_logging
from utils.internal_api import InternalApi

init_logging()
logger = logging.getLogger(__name__)


class InsightVersionReporter:
    def __init__(self, api: InternalApi, subject_id: str, session_id: str):
        self.api = api
        self.subject_id = subject_id
        self.session_id = session_id
        self.version_id: str | None = None

    def send(
        self,
        *,
        status: str = "PROCESSING",
        stage: str | None = None,
        ratio: float | None = None,
        payload: Dict[str, Any] | None = None,
        forecast: Dict[str, Any] | None = None,
        diffs: Dict[str, Any] | None = None,
        publish: bool = False,
    ) -> None:
        body: Dict[str, Any] = {
            "sessionId": self.session_id,
            "status": status,
        }
        if self.version_id:
            body["versionId"] = self.version_id
        if stage:
            body["progressStage"] = stage
        if ratio is not None:
            body["progressRatio"] = ratio
        if payload is not None:
            body["payload"] = payload
        if forecast is not None:
            body["forecast"] = forecast
        if diffs is not None:
            body["diffs"] = diffs
        if publish:
            body["publish"] = True
        try:
            resp = _api_put(
                self.api,
                f"/internal/subjects/{self.subject_id}/insight-versions",
                body,
            )
            if 200 <= resp.status_code < 300:
                try:
                    data = resp.json() or {}
                    vid = data.get("versionId")
                    if isinstance(vid, str):
                        self.version_id = vid
                except Exception:
                    pass
        except Exception:
            logger.warning(
                "[Insight] Version reporter failed for session=%s",
                self.session_id,
                exc_info=True,
            )


def _is_transient_http(resp: Response) -> bool:
    return 500 <= resp.status_code < 600


@retry(
    retry=retry_if_exception_type((ReqConnectionError, ReqTimeout)),
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=1, min=1, max=30),
    reraise=True,
)
def _api_get(api: InternalApi, path: str) -> Response:
    return api.get(path)


@retry(
    retry=retry_if_exception_type((ReqConnectionError, ReqTimeout)),
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=1, min=1, max=30),
    reraise=True,
)
def _api_put(api: InternalApi, path: str, json_body: Dict[str, Any]) -> Response:
    return api.put(path, json_body)


def _run_insight_pipeline(
    api: InternalApi,
    reporter: InsightVersionReporter,
    settings: Any,
    subject_id: str,
    session_id: str,
    doc_id_set: Set[str],
) -> Dict[str, Any]:
    t0 = time.perf_counter()
    try:
        reporter.send(stage="collect-documents", ratio=0.03)
        docs_resp = _api_get(api, f"/internal/subjects/{subject_id}/documents")
        docs_resp.raise_for_status()
        docs = docs_resp.json() or []
        doc_types = {str(d.get("id")): str(d.get("resourceType") or "OTHER") for d in docs}
    except Exception:
        doc_types = {}

    try:
        reporter.send(stage="collect-chunks", ratio=0.05)
        resp = _api_get(api, f"/internal/subjects/{subject_id}/chunks")
    except Exception:
        reporter.send(status="FAILED", stage="collect-chunks", ratio=1.0)
        logger.exception("[Insight] Failed to list chunks (network)")
        raise

    if resp.status_code == 401:
        reporter.send(status="FAILED", stage="auth", ratio=1.0)
        logger.error("[Insight] Unauthorized to core-service internal API; check INTERNAL_API_KEY")
        raise RuntimeError("Unauthorized")
    if resp.status_code == 404:
        reporter.send(status="FAILED", stage="missing-subject", ratio=1.0)
        logger.warning("[Insight] Subject not found; skipping subjectId=%s", subject_id)
        return {"status": "skipped", "reason": "subject not found", "subjectId": subject_id}
    if _is_transient_http(resp):
        reporter.send(status="FAILED", stage="chunks", ratio=1.0)
        logger.error("[Insight] Core-service 5xx listing chunks; will rely on retry policy")
        raise RuntimeError("Core-service transient error")
    resp.raise_for_status()

    all_chunks: List[Dict[str, Any]] = resp.json() or []
    selected_chunks = [c for c in all_chunks if str(c.get("documentId") or "") in doc_id_set]

    reporter.send(stage="topics", ratio=0.25)
    records = [
        {"text": c.get("text", ""), "documentId": c.get("documentId")}
        for c in selected_chunks
        if isinstance(c.get("text"), str) and c.get("text").strip()
    ]
    topics = compute_subject_topics(records)
    reporter.send(stage="topics-ready", ratio=0.45)
    t_topics = time.perf_counter()

    questions = _fetch_subject_questions(api, subject_id)
    reporter.send(stage="concept-graph", ratio=0.6)

    graph_payload, insight_payload, forecast_payload = build_concept_graph(
        topics,
        questions,
        doc_types,
    )
    t_graph = time.perf_counter()
    logger.info(
        "[Insight] Session summary sessionId=%s topics=%s concepts=%s families=%s",
        session_id,
        len(topics),
        len(graph_payload.get("concepts", [])),
        len(graph_payload.get("families", [])),
    )

    try:
        _api_put(
            api,
            f"/internal/subjects/{subject_id}/concept-graph",
            graph_payload,
        )
    except Exception:
        logger.warning("[Insight] Concept graph upsert failed subjectId=%s", subject_id, exc_info=True)

    reporter.send(stage="insight-synthesis", ratio=0.8)

    # Fetch latest exam template (if any) for context/warnings
    template_info: Dict[str, Any] | None = None
    template_blueprint: Optional[Dict[str, Any]] = None
    warnings: List[str] = []
    try:
        t_resp = _api_get(api, f"/internal/subjects/{subject_id}/exam-template/latest")
        if 200 <= t_resp.status_code < 300:
            t_json = t_resp.json() or {}
            t = t_json.get("template")
            if isinstance(t, dict):
                template_info = {
                    "id": t.get("id"),
                    "version": t.get("version"),
                    "season": t.get("season"),
                }
                if isinstance(t.get("blueprint"), dict):
                    template_blueprint = t.get("blueprint")
        else:
            warnings.append("template_fetch_failed")
    except Exception:
        warnings.append("template_fetch_error")

    # Infer current template blueprint from questions
    current_blueprint = _infer_template_blueprint(questions)

    # If blueprint differs materially, persist new version
    try:
        if _should_update_template(template_blueprint, current_blueprint):
            body = {"blueprint": current_blueprint}
            put_resp = _api_put(api, f"/internal/subjects/{subject_id}/exam-template", body)
            if 200 <= put_resp.status_code < 300:
                warnings.append("template_updated")
            else:
                warnings.append("template_update_failed")
    except Exception:
        warnings.append("template_update_error")

    # Add teacher-style warnings from mode mix
    warnings.extend(_teacher_style_warnings(current_blueprint))

    # Optionally suppress template/mode warnings for E2E or demos
    try:
        if bool(getattr(settings, "SUPPRESS_TEMPLATE_WARNINGS", False)):
            warnings = []
    except Exception:
        pass

    prev_insight: Optional[Dict[str, Any]] = None
    prev_graph: Optional[Dict[str, Any]] = None
    baseline_available = False
    try:
        p_resp = _api_get(api, f"/internal/subjects/{subject_id}/insight-versions/latest")
        if 200 <= p_resp.status_code < 300:
            pdata = p_resp.json() or {}
            prev_payload = pdata.get("payload") or {}
            if isinstance(prev_payload.get("insight"), dict):
                prev_insight = prev_payload.get("insight")
            if isinstance(prev_payload.get("conceptGraph"), dict):
                prev_graph = prev_payload.get("conceptGraph")
            baseline_available = bool(prev_insight or prev_graph)
    except Exception:
        pass

    diffs: Dict[str, Any] = {}
    try:
        diffs = _compute_insight_diffs(
            prev_insight,
            insight_payload,
            prev_graph,
            graph_payload,
        ) or {}
    except Exception:
        diffs = {}

    try:
        if not (diffs.get("masteryChanges") or []):
            settings = get_settings()
            threshold = float(getattr(settings, "DIFF_MASTERY_DELTA_THRESHOLD", 0.05) or 0.05)

            def _map_from_graph(graph: Optional[Dict[str, Any]]) -> Dict[str, float]:
                m: Dict[str, float] = {}
                if isinstance(graph, dict) and isinstance(graph.get("concepts"), list):
                    for cc in graph.get("concepts") or []:
                        lab = cc.get("label")
                        ms = cc.get("masteryScore")
                        if isinstance(lab, str) and ms is not None:
                            try:
                                m[lab] = float(ms)
                            except Exception:
                                m[lab] = 0.0
                return m

            prev_map = _map_from_graph(prev_graph)
            cur_map = _map_from_graph(graph_payload)

            changes: List[Dict[str, Any]] = []
            prev_keys = set(prev_map.keys())
            cur_keys = set(cur_map.keys())

            for k in sorted(prev_keys & cur_keys):
                old = float(prev_map.get(k, 0.0))
                new = float(cur_map.get(k, 0.0))
                delta = new - old
                if abs(delta) >= threshold:
                    changes.append({
                        "label": k,
                        "before": round(old, 3),
                        "after": round(new, 3),
                        "delta": round(delta, 3),
                    })

            for k in sorted(cur_keys - prev_keys):
                new = float(cur_map.get(k, 0.0))
                if new >= threshold:
                    changes.append({
                        "label": k,
                        "before": 0.0,
                        "after": round(new, 3),
                        "delta": round(new, 3),
                    })

            # dropped concepts present previously but not in current graph
            for k in sorted(prev_keys - cur_keys):
                old = float(prev_map.get(k, 0.0))
                if old >= threshold:
                    changes.append({
                        "label": k,
                        "before": round(old, 3),
                        "after": 0.0,
                        "delta": round(-old, 3),
                    })

            if changes:
                diffs["masteryChanges"] = changes
    except Exception:
        pass

    try:
        inc = 0
        dec = 0
        for ch in diffs.get("masteryChanges", []) or []:
            d = float(ch.get("delta") or 0.0)
            if d > 0:
                inc += 1
            elif d < 0:
                dec += 1
        adj = 0.0
        if inc > dec:
            adj = 0.03
        elif dec > inc:
            adj = -0.03
        if adj != 0.0:
            try:
                conf = float(forecast_payload.get("nextExamConfidence") or 0.0)
                conf = max(0.1, min(0.95, conf + adj))
                forecast_payload["nextExamConfidence"] = round(conf, 3)
            except Exception:
                pass
    except Exception:
        pass

    synthetic_examples: Optional[List[Dict[str, Any]]] = None
    try:
        if bool(getattr(settings, "AI_CONSENT", False)):
            synthetic_examples = _generate_synthetic_examples(insight_payload, per_concept=1)
            if isinstance(synthetic_examples, list):
                insight_payload["syntheticExamples"] = synthetic_examples
    except Exception:
        synthetic_examples = None

    t_insight = time.perf_counter()

    if "masteryChanges" not in diffs:
        diffs["masteryChanges"] = []
    if "warningsDiff" not in diffs:
        diffs["warningsDiff"] = {"added": [], "removed": []}

    # Add a warning when no usable baseline exists
    if not baseline_available:
        try:
            warnings.append("diffs_baseline_unavailable")
        except Exception:
            pass

    result = {
        "summary": {
            "docCount": len(doc_id_set),
            "chunkCount": len(selected_chunks),
            "questionCount": len(questions),
        },
        "topics": topics,
        "conceptGraph": graph_payload,
        "insight": insight_payload,
        "forecast": forecast_payload,
        "template": template_info,
        "warnings": warnings if warnings else None,
        "diffs": diffs,
        "timings": {
            "topics": round(max(0.0, t_topics - t0), 3),
            "graph": round(max(0.0, t_graph - t_topics), 3),
            "insight": round(max(0.0, t_insight - t_graph), 3),
            "total": round(max(0.0, t_insight - t0), 3),
        },
    }

    try:
        if bool(getattr(settings, "AI_CONSENT", False)):
            llm = str(getattr(settings, "LLM_PROVIDER", "none")).lower()
            study_plan: str | None = None
            if llm == "local":
                study_plan = LocalSummarizer().summarize(
                    insight_payload.get("studyPlan", []),
                    len(doc_id_set),
                    len(selected_chunks),
                )
            elif llm == "openai" and getattr(settings, "OPENAI_API_KEY", None):
                study_plan = OpenAISummarizer(api_key=getattr(settings, "OPENAI_API_KEY")).summarize(
                    insight_payload.get("studyPlan", []),
                    len(doc_id_set),
                    len(selected_chunks),
                )
            if study_plan:
                result["studyPlanNarrative"] = study_plan
                result["studyPlan"] = study_plan
    except Exception:
        logger.warning("[Insight] Summarization failed; proceeding without study plan narrative")

    reporter.send(
        status="READY",
        stage="insight-ready",
        ratio=0.98,
        payload={
            "insight": insight_payload,
            "riskConcepts": insight_payload.get("riskConcepts"),
            "studyPlan": insight_payload.get("studyPlan"),
            "template": template_info,
            "warnings": warnings if warnings else None,
            "diffs": diffs,
            "conceptGraph": graph_payload,
        },
        forecast=forecast_payload,
        publish=True,
    )

    try:
        path = f"/internal/subjects/{subject_id}/insight-sessions/{session_id}"
        body = {"status": "READY", "result": result}
        up = _api_put(api, path, body)
        if 200 <= up.status_code < 300:
            logger.info("[Insight] Updated session %s READY (topics=%s)", session_id, len(topics))
            try:
                summary_log = {
                    "kind": "insight_session_summary",
                    "sessionId": session_id,
                    "subjectId": subject_id,
                    "docCount": len(doc_id_set),
                    "timings": result.get("timings"),
                    "conceptCount": len(graph_payload.get("concepts", [])),
                    "warnings": warnings if warnings else [],
                    "warningCount": len(warnings or []),
                    "hasSyntheticExamples": bool(insight_payload.get("syntheticExamples")),
                    "diffMasteryChanges": len(diffs.get("masteryChanges", []) or []),
                }
                logger.info("insight_session_summary %s", json.dumps(summary_log))
            except Exception:
                pass
        else:
            logger.warning("[Insight] Update session failed status=%s body=%s", up.status_code, up.text)
    except Exception:
        logger.exception("[Insight] Failed to update session")
        raise

    return {"status": "ok", "subjectId": subject_id, "sessionId": session_id, "topics": len(topics)}


def _fetch_subject_questions(api: InternalApi, subject_id: str) -> List[Dict[str, Any]]:
    try:
        resp = _api_get(api, f"/internal/subjects/{subject_id}/questions")
    except Exception:
        logger.warning("[Insight] Failed to fetch questions for subjectId=%s", subject_id, exc_info=True)
        return []
    if resp.status_code == 404:
        return []
    if _is_transient_http(resp):
        logger.warning("[Insight] Question fetch transient error subjectId=%s", subject_id)
        return []
    resp.raise_for_status()
    data = resp.json() or []
    if isinstance(data, list):
        return data
    return []


def _infer_template_blueprint(questions: List[Dict[str, Any]]) -> Dict[str, Any]:
    modes: Dict[str, int] = {}
    total = 0
    total_marks = 0.0
    marks_list: List[float] = []
    for q in questions:
        mode = str(q.get("assessmentMode") or "UNKNOWN").upper()
        modes[mode] = modes.get(mode, 0) + 1
        total += 1
        try:
            m = float(q.get("marks")) if q.get("marks") is not None else 0.0
            total_marks += m
            marks_list.append(m)
        except Exception:
            marks_list.append(0.0)
    mix = {k: (v / total) for k, v in modes.items()} if total else {}
    # MCQ ratio approximated by OBJECTIVE share
    mcq_ratio = float(mix.get("OBJECTIVE", 0.0) or 0.0)
    # Marks histogram buckets similar to utils.structure
    hist = {"small": 0, "medium": 0, "large": 0}
    for v in marks_list:
        iv = int(v)
        if iv <= 5:
            hist["small"] += 1
        elif iv <= 10:
            hist["medium"] += 1
        else:
            hist["large"] += 1
    max_mark = max(marks_list) if marks_list else 0.0
    # Determine last question by highest index; fall back to sequence
    last_mark = None
    try:
        if questions:
            last_q = max(questions, key=lambda q: float(q.get("index") or 0.0))
            lm = last_q.get("marks")
            last_mark = float(lm) if lm is not None else 0.0
    except Exception:
        last_mark = marks_list[-1] if marks_list else 0.0
    big_last = bool(last_mark is not None and last_mark >= max(5.0, 0.5 * float(max_mark or 0.0)))
    return {
        "modeMix": mix,
        "questionCount": total,
        "marksTotal": round(total_marks, 3),
        "marksHistogram": hist,
        "mcqRatio": round(mcq_ratio, 3),
        "bigLastQuestion": big_last,
    }


def _should_update_template(prev: Optional[Dict[str, Any]], cur: Dict[str, Any]) -> bool:
    if not cur:
        return False
    if not prev:
        return True
    prev_mix = prev.get("modeMix") if isinstance(prev.get("modeMix"), dict) else {}
    cur_mix = cur.get("modeMix") if isinstance(cur.get("modeMix"), dict) else {}
    keys = set(prev_mix.keys()) | set(cur_mix.keys())
    delta = 0.0
    for k in keys:
        a = float(prev_mix.get(k, 0.0) or 0.0)
        b = float(cur_mix.get(k, 0.0) or 0.0)
        delta += abs(a - b)
    # Consider big-last-question toggle
    big_last_changed = bool(prev.get("bigLastQuestion") != cur.get("bigLastQuestion"))
    # Consider MCQ ratio shift
    mcq_prev = float(prev.get("mcqRatio", 0.0) or 0.0)
    mcq_cur = float(cur.get("mcqRatio", 0.0) or 0.0)
    mcq_delta = abs(mcq_prev - mcq_cur)
    return delta > 0.2 or big_last_changed or mcq_delta > 0.25


def _teacher_style_warnings(cur: Dict[str, Any]) -> List[str]:
    warns: List[str] = []
    mix = cur.get("modeMix") if isinstance(cur.get("modeMix"), dict) else {}
    calc = float(mix.get("CALCULATION", 0.0) or 0.0)
    theory = float(mix.get("THEORY", 0.0) or 0.0)
    app = float(mix.get("APPLICATION", 0.0) or 0.0)
    if calc > 0.5:
        warns.append("calculation_heavy")
    if theory > 0.6 and app < 0.2:
        warns.append("theory_heavy_low_application")
    if (calc + theory + app) < 0.4:
        warns.append("insufficient_classified_modes")
    mcq = float(cur.get("mcqRatio", 0.0) or 0.0)
    if mcq > 0.5:
        warns.append("mcq_heavy")
    if bool(cur.get("bigLastQuestion")):
        warns.append("big_last_question")
    return warns


def _compute_insight_diffs(
    prev: Optional[Dict[str, Any]],
    cur: Dict[str, Any],
    prev_graph: Optional[Dict[str, Any]] = None,
    cur_graph: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    if not isinstance(cur, dict):
        return out

    settings = get_settings()
    threshold = float(getattr(settings, "DIFF_MASTERY_DELTA_THRESHOLD", 0.05) or 0.05)
    fuzzy_enabled = bool(getattr(settings, "DIFF_FUZZY_MATCH_ENABLED", False))
    j_min = float(getattr(settings, "DIFF_FUZZY_JACCARD_MIN", 0.25) or 0.25)

    # Build previous overview and optional graph-based mastery/terms
    prev_over: Dict[str, tuple[float, str]] = {}
    if isinstance(prev, dict) and isinstance(prev.get("conceptOverview"), list):
        for c in prev.get("conceptOverview"):
            try:
                label = str(c.get("label"))
                prev_over[label.lower()] = (float(c.get("mastery")), label)
            except Exception:
                continue

    def _terms_map(graph: Optional[Dict[str, Any]]) -> Dict[str, Set[str]]:
        m: Dict[str, Set[str]] = {}
        if isinstance(graph, dict) and isinstance(graph.get("concepts"), list):
            for cc in graph.get("concepts") or []:
                try:
                    lab = str(cc.get("label"))
                    terms = cc.get("metadata", {}).get("topTerms") or []
                    s: Set[str] = set()
                    for t in terms:
                        term = t.get("term")
                        if isinstance(term, str):
                            s.add(term.strip().lower())
                    m[lab.lower()] = s
                except Exception:
                    continue
        return m

    def _mastery_map(graph: Optional[Dict[str, Any]]) -> Dict[str, float]:
        m: Dict[str, float] = {}
        if isinstance(graph, dict) and isinstance(graph.get("concepts"), list):
            for cc in graph.get("concepts") or []:
                try:
                    lab = str(cc.get("label"))
                    ms = float(cc.get("masteryScore")) if cc.get("masteryScore") is not None else 0.0
                    m[lab.lower()] = ms
                except Exception:
                    continue
        return m

    def _label_map(graph: Optional[Dict[str, Any]]) -> Dict[str, str]:
        m: Dict[str, str] = {}
        if isinstance(graph, dict) and isinstance(graph.get("concepts"), list):
            for cc in graph.get("concepts") or []:
                try:
                    lab = str(cc.get("label"))
                    m[lab.lower()] = lab
                except Exception:
                    continue
        return m

    prev_terms = _terms_map(prev_graph)
    cur_terms = _terms_map(cur_graph)
    prev_graph_mastery = _mastery_map(prev_graph)
    prev_label_original = _label_map(prev_graph)

    # Graph-driven diff: compare normalized label sets using conceptGraph mastery scores.
    def jaccard(a: Set[str], b: Set[str]) -> float:
        if not a or not b:
            return 0.0
        inter = len(a & b)
        if inter == 0:
            return 0.0
        return inter / float(len(a) + len(b) - inter)

    def norm(s: str) -> str:
        return str(s).strip().lower()

    changes: List[Dict[str, Any]] = []
    cur_graph_mastery: Dict[str, float] = {}
    if isinstance(cur_graph, dict) and isinstance(cur_graph.get("concepts"), list):
        for cc in cur_graph.get("concepts") or []:
            try:
                lab = str(cc.get("label"))
                ln = norm(lab)
            except Exception:
                continue
            try:
                cur_ms = float(cc.get("masteryScore")) if cc.get("masteryScore") is not None else 0.0
            except Exception:
                cur_ms = 0.0
            cur_graph_mastery[ln] = cur_ms

    # For each current label, find previous mastery via exact or fuzzy match, else treat as new.
    new_cnt = 0
    upd_cnt = 0
    drop_cnt = 0
    for ln, cur_ms in cur_graph_mastery.items():
        prev_m: Optional[float] = None
        label_out = None
        # exact label in previous overview first (preserve casing when possible)
        if ln in prev_over:
            prev_m = prev_over[ln][0]
            label_out = prev_over[ln][1]
        else:
            # try previous graph exact
            if ln in prev_graph_mastery:
                prev_m = prev_graph_mastery.get(ln)
                label_out = None
            # fuzzy fallback via topTerms
            elif fuzzy_enabled:
                cur_set = cur_terms.get(ln) or set()
                best_label = None
                best_score = 0.0
                if cur_set:
                    for prev_lab_norm, prev_set in prev_terms.items():
                        score = jaccard(cur_set, prev_set)
                        if score >= j_min and score > best_score:
                            best_label = prev_lab_norm
                            best_score = score
                if best_label is not None:
                    if best_label in prev_over:
                        prev_m = prev_over[best_label][0]
                        label_out = prev_over[best_label][1]
                    else:
                        prev_m = prev_graph_mastery.get(best_label, None)
                        label_out = None

        if prev_m is None:
            # newly introduced concept
            if cur_ms >= threshold:
                changes.append({
                    "label": label_out or ln,
                    "before": 0.0,
                    "after": round(cur_ms, 3),
                    "delta": round(cur_ms, 3),
                })
                new_cnt += 1
        else:
            delta = cur_ms - float(prev_m)
            if abs(delta) >= threshold:
                changes.append({
                    "label": label_out or ln,
                    "before": round(float(prev_m), 3),
                    "after": round(cur_ms, 3),
                    "delta": round(delta, 3),
                })
                upd_cnt += 1

    # dropped concepts present previously but not in current graph
    prev_only = set(prev_graph_mastery.keys()) - set(cur_graph_mastery.keys())
    for ln in sorted(prev_only):
        try:
            old = float(prev_graph_mastery.get(ln, 0.0))
        except Exception:
            old = 0.0
        if old >= threshold:
            label_out = prev_over.get(ln, (None, None))[1] or prev_label_original.get(ln) or ln
            changes.append({
                "label": label_out,
                "before": round(old, 3),
                "after": 0.0,
                "delta": round(-old, 3),
            })
            drop_cnt += 1

    # Debug log for observability
    try:
        logger.info(
            "insight_diff_debug %s",
            json.dumps({
                "prev_over_count": len(prev_over),
                "prev_graph_count": len(prev_graph_mastery),
                "cur_graph_count": len(cur_graph_mastery),
                "new_count": new_cnt,
                "updated_count": upd_cnt,
                "dropped_count": drop_cnt,
                "threshold": threshold,
                "fuzzy": fuzzy_enabled,
                "j_min": j_min,
            }),
        )
    except Exception:
        pass

    if changes:
        out["masteryChanges"] = changes

    # Warnings diff (best-effort; uses warnings inside insight payload if present)
    prev_w = set(prev.get("warnings") or []) if isinstance(prev, dict) else set()
    cur_w = set(cur.get("warnings") or [])
    add = sorted(cur_w - prev_w)
    rem = sorted(prev_w - cur_w)
    if add or rem:
        out["warningsDiff"] = {"added": add, "removed": rem}

    if "masteryChanges" not in out:
        out["masteryChanges"] = []
    if "warningsDiff" not in out:
        out["warningsDiff"] = {"added": [], "removed": []}
    return out


def _generate_synthetic_examples(insight: Dict[str, Any], per_concept: int = 1) -> List[Dict[str, Any]]:
    ex: List[Dict[str, Any]] = []
    risk = insight.get("riskConcepts") or []
    selected = [x for x in risk][:3]
    for c in selected:
        label = str(c.get("label") or "Concept")
        qs = []
        for i in range(max(1, int(per_concept))):
            qs.append({
                "prompt": f"Draft an exam-style question for {label}. Include one applied reasoning step.",
                "marks": None,
            })
        ex.append({"label": label, "questions": qs})
    return ex


@shared_task(name="oracle.process_insight_session")
def process_insight_session(payload: dict[str, Any]) -> dict[str, Any]:
    settings = get_settings()

    # Validate payload
    subject_id = str(payload.get("subjectId") or "").strip()
    session_id = str(payload.get("sessionId") or "").strip()
    doc_ids = payload.get("documentIds")
    if not subject_id or not session_id or not isinstance(doc_ids, list) or not doc_ids:
        logger.error("process_insight_session received invalid payload: %r", payload)
        return {"status": "error", "reason": "invalid payload"}

    doc_id_set: Set[str] = {str(x).strip() for x in doc_ids if str(x).strip()}
    if not doc_id_set:
        return {"status": "error", "reason": "no documentIds"}

    api = InternalApi(
        settings.CORE_SERVICE_URL,
        settings.INTERNAL_API_SECRET,
        default_timeout=max(settings.http_timeouts) if isinstance(settings.http_timeouts, (list, tuple)) else 30.0,
        legacy_api_key=getattr(settings, "INTERNAL_API_KEY", None),
    )

    reporter = InsightVersionReporter(api, subject_id, session_id)

    try:
        return _run_insight_pipeline(
            api,
            reporter,
            settings,
            subject_id,
            session_id,
            doc_id_set,
        )
    except Exception:
        reporter.send(status="FAILED", stage="error", ratio=1.0)
        raise
