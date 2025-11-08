import os
import json
import pytest

import config as cfg
from workers.insights_session_worker import _compute_insight_diffs


def _graph(concepts):
    return {
        "concepts": [
            {
                "label": label,
                "masteryScore": score,
                "metadata": {"topTerms": []},
            }
            for (label, score) in concepts
        ]
    }


def test_compute_insight_diffs_new_and_updates(monkeypatch):
    # Lower threshold so small deltas are counted
    monkeypatch.setenv("DIFF_MASTERY_DELTA_THRESHOLD", "0.01")
    monkeypatch.setenv("DIFF_FUZZY_MATCH_ENABLED", "false")
    # Reset cached settings to pick up env
    monkeypatch.setattr(cfg, "_SETTINGS", None, raising=False)

    # Previous payload/graph (baseline)
    prev_insight = {
        "conceptOverview": [
            {"label": "Core Foundations", "mastery": 0.438},
            {"label": "algorithm", "mastery": 0.645},
        ]
    }
    prev_graph = _graph([
        ("Core Foundations", 0.438),
        ("algorithm", 0.645),
    ])

    # Current graph with two updates and two new concepts
    cur_graph = _graph([
        ("Core Foundations", 0.486),  # +0.048
        ("algorithm", 0.578),         # -0.067
        ("interval", 0.81),           # new
        ("posterior", 0.728),         # new
    ])

    diffs = _compute_insight_diffs(prev_insight, {}, prev_graph, cur_graph)

    assert isinstance(diffs, dict)
    mc = diffs.get("masteryChanges")
    assert isinstance(mc, list)
    # Expect 4 changes (2 updates + 2 new)
    assert len(mc) == 4

    # Convert to map for easy lookup
    by_label = {d["label"]: d for d in mc}
    assert by_label["Core Foundations"]["before"] == pytest.approx(0.438, rel=0, abs=1e-3)
    assert by_label["Core Foundations"]["after"] == pytest.approx(0.486, rel=0, abs=1e-3)
    assert by_label["algorithm"]["before"] == pytest.approx(0.645, rel=0, abs=1e-3)
    assert by_label["algorithm"]["after"] == pytest.approx(0.578, rel=0, abs=1e-3)
    assert by_label["interval"]["before"] == 0.0
    assert by_label["posterior"]["before"] == 0.0


def test_compute_insight_diffs_dropped(monkeypatch):
    monkeypatch.setenv("DIFF_MASTERY_DELTA_THRESHOLD", "0.05")
    monkeypatch.setenv("DIFF_FUZZY_MATCH_ENABLED", "false")
    monkeypatch.setattr(cfg, "_SETTINGS", None, raising=False)

    prev_insight = {"conceptOverview": [{"label": "algorithm", "mastery": 0.2}]}
    prev_graph = _graph([("algorithm", 0.2)])
    cur_graph = _graph([])

    diffs = _compute_insight_diffs(prev_insight, {}, prev_graph, cur_graph)
    mc = diffs.get("masteryChanges") or []
    assert any(d.get("label") == "algorithm" and d.get("after") == 0.0 and d.get("delta") == pytest.approx(-0.2, rel=0, abs=1e-3) for d in mc)


def test_compute_insight_diffs_fuzzy_alignment(monkeypatch):
    # Enable fuzzy with a moderate cutoff and confirm alignment produces an update
    monkeypatch.setenv("DIFF_MASTERY_DELTA_THRESHOLD", "0.05")
    monkeypatch.setenv("DIFF_FUZZY_MATCH_ENABLED", "true")
    monkeypatch.setenv("DIFF_FUZZY_JACCARD_MIN", "0.5")
    monkeypatch.setattr(cfg, "_SETTINGS", None, raising=False)

    def g(items):
        return {
            "concepts": [
                {
                    "label": label,
                    "masteryScore": score,
                    "metadata": {"topTerms": [{"term": t} for t in terms]},
                }
                for (label, score, terms) in items
            ]
        }

    prev_insight = {"conceptOverview": []}
    prev_graph = g([("interval estimation", 0.60, ["interval", "estimation"])])
    cur_graph = g([("interval", 0.70, ["interval", "estimation"] )])

    diffs = _compute_insight_diffs(prev_insight, {}, prev_graph, cur_graph)
    mc = diffs.get("masteryChanges") or []
    # Should include a +0.10 update via fuzzy match
    assert any(d.get("after") == pytest.approx(0.70, rel=0, abs=1e-3) and d.get("before") == pytest.approx(0.60, rel=0, abs=1e-3) for d in mc)
