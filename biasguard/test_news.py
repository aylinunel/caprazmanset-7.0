"""Offline checks for the 7.0 changes: field-independent behavioral gate and fail-closed replay.

    python -m unittest biasguard.test_news -v
"""
import json
import tempfile
import unittest
from pathlib import Path

from biasguard.engine import BiasGuard
from biasguard.news import FileReviewer, apply

TEXT = "[A · 09:00] Bakan: kriz yok — Açıklama tekrarlandı\n[B · 09:05] Krizi herkes görüyor, bakan inkâr etti"
CONTEXT = "Olay: Bakan açıklaması\nKurumlar: A, B"


def _card(policy):
    bg = BiasGuard()
    return next(c for c in bg.cards if c.get("review_policy") == policy)


def _review(card, role, kind, source="text"):
    quote = "Krizi herkes görüyor, bakan inkâr etti" if source == "text" else "Olay: Bakan açıklaması"
    return {"role": role, "assessments": [{
        "card_id": card["id"], "verdict": "supported",
        "evidence": [{"source": source, "quote": quote, "kind": kind}],
        "necessary_conditions": [{"condition_index": i, "status": "satisfied", "evidence_indices": [0]}
                                 for i in range(len(card["necessary_conditions"]))],
        "mechanism": "m", "alternative_explanation": "a", "missing_context": []}]}


class Reviewer:
    def __init__(self, card, kind):
        self.card, self.kind = card, kind

    def select(self, text, context, cards, n):
        return {"candidate_ids": [self.card["id"]], "selection_uncertainty": [], "selection_note": ""}

    def review(self, text, context, cards, role):
        assert [c["id"] for c in cards][0] == self.card["id"]
        out = _review(self.card, role, self.kind)
        # every selected card must be assessed; the rest are plain not_supported
        for c in cards[1:]:
            out["assessments"].append({"card_id": c["id"], "verdict": "not_supported", "evidence": [],
                                       "necessary_conditions": [], "mechanism": "", "alternative_explanation": "",
                                       "missing_context": []})
        return out


class GateTests(unittest.TestCase):
    def run_card(self, kind):
        card = _card("requires_behavioral_evidence")
        r = BiasGuard(reviewer=Reviewer(card, kind)).analyze(TEXT, CONTEXT, mode="ai", max_candidates=6)
        self.assertEqual(r["status"], "review_complete")
        return card, r

    def test_behavioral_quote_from_text_field_is_accepted(self):
        card, r = self.run_card("behavioral")
        self.assertIn(card["id"], [f["id"] for f in r["supported_findings"]])

    def test_statement_quote_still_cannot_publish_behavioral_card(self):
        card, r = self.run_card("statement")
        self.assertNotIn(card["id"], [f["id"] for f in r["supported_findings"]])
        self.assertIn(card["id"], [f["id"] for f in r["uncertain_findings"]])


class ReplayTests(unittest.TestCase):
    def test_missing_outputs_never_count_as_complete(self):
        with tempfile.TemporaryDirectory() as d:
            run = Path(d)
            items = [{"event": f"e{i}", "title": "t", "outlets": 2, "text": TEXT, "context": CONTEXT} for i in range(3)]
            (run / "inputs.jsonl").write_text("".join(json.dumps(x) + "\n" for x in items))
            (run / "selections").mkdir()
            (run / "selections" / "e0.json").write_text(json.dumps(
                {"candidate_ids": [], "selection_uncertainty": [], "selection_note": ""}))
            (run / "selections" / "e1.json").write_text("{not json")
            res = apply(run)
            st = {x["event"]: x["status"] for x in res["events"]}
            self.assertEqual(st, {"e0": "analysis_incomplete", "e1": "analysis_incomplete", "e2": "not_attempted"})
            self.assertEqual(res["summary"]["completed"], 0)

    def test_file_reviewer_raises_on_missing(self):
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(Exception):
                FileReviewer(Path(d), "x").review("", "", [], "advocate")


if __name__ == "__main__":
    unittest.main()
