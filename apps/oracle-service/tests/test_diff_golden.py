import json
import pathlib
import os
import pytest

import config as cfg
from workers.insights_session_worker import _compute_insight_diffs

FIXTURES = pathlib.Path(__file__).parent / "fixtures"


def _load(name: str):
    return json.loads((FIXTURES / name).read_text())


def _by_label(items):
    return {i["label"]: i for i in items}


def test_diff_golden(monkeypatch):
    # Stable config for this golden
    monkeypatch.setenv("DIFF_MASTERY_DELTA_THRESHOLD", "0.05")
    monkeypatch.setenv("DIFF_FUZZY_MATCH_ENABLED", "false")
    monkeypatch.setattr(cfg, "_SETTINGS", None, raising=False)

    prev = _load("diff_baseline.json")
    cur = _load("diff_current.json")
    expected = _load("diff_expected.json")

    out = _compute_insight_diffs(
        prev=prev["insight"],
        cur=cur["insight"],
        prev_graph=prev["conceptGraph"],
        cur_graph=cur["conceptGraph"],
    )

    actual = _by_label(out.get("masteryChanges") or [])
    expected_by_label = _by_label(expected["masteryChanges"])

    # Same concept set
    assert actual.keys() == expected_by_label.keys()

    # Same numbers (no surprise semantics changes)
    for label, exp in expected_by_label.items():
        act = actual[label]
        assert act["before"] == pytest.approx(exp["before"], rel=0, abs=1e-6)
        assert act["after"] == pytest.approx(exp["after"], rel=0, abs=1e-6)
        assert act["delta"] == pytest.approx(exp["delta"], rel=0, abs=1e-6)
