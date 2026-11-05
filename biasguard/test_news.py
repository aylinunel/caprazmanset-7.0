"""Offline checks for the 7.0 changes: field-independent behavioral gate and fail-closed replay.

    python -m unittest biasguard.test_news -v
"""
import json
import tempfile
import unittest
from pathlib import Path

from biasguard.engine import BiasGuard
from biasguard.news import FileReviewer, apply, merge_explain, validate_explain

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


GOOD = {"noticed": "A ve B aynı olayı farklı başlıkla verdi; B “Krizi herkes görüyor, bakan inkâr etti” dedi.",
        "why": "Başlık farkı tek başına niyet göstermez, okuyucuya bakan açıklamasının tamamı verilmemiş olabilir."}


class ExplainTests(unittest.TestCase):
    def test_validate_explain_accepts_good(self):
        self.assertEqual(validate_explain(GOOD, TEXT), [])

    def test_validate_explain_rejects_status_words(self):
        for w in ("bağlam gerekli", "desteklendi", "uncertain"):
            bad = {**GOOD, "why": f"Bu durumda {w} çünkü başlıklar farklı ve okuyucu için eksik bilgi kalıyor."}
            self.assertTrue(validate_explain(bad, TEXT), w)

    def test_validate_explain_rejects_invented_quote(self):
        bad = {**GOOD, "noticed": "B başlığında “Bakan tamamen yalan söyledi ve istifa etti” yazıyor ve A bunu vermedi."}
        self.assertTrue(any("quote" in p for p in validate_explain(bad, TEXT)))

    def test_validate_explain_rejects_length_and_sentences(self):
        self.assertTrue(validate_explain({"noticed": "Kısa.", "why": GOOD["why"]}, TEXT))
        three = "Bir cümle burada yazıyor. İkinci cümle de burada yazıyor. Üçüncü cümle fazla olur burada."
        self.assertTrue(validate_explain({"noticed": three, "why": GOOD["why"]}, TEXT))

    def test_sentence_count_ignores_quotes_and_decimals(self):
        t = "[A · 09:00] Kanser tedavisi görüyordu! İş adamı Ahmet hayatını kaybetti\n[B · 09:01] 3.5 milyon lira"
        a = {"noticed": "A haberi “Kanser tedavisi görüyordu! İş adamı Ahmet hayatını kaybetti” diye verdi.", "why": GOOD["why"]}
        self.assertEqual(validate_explain(a, t), [])
        b = {"noticed": "B haberi 3.5 milyon lira diye verdi, A ise rakam vermedi ve başka bir çerçeve seçti.", "why": GOOD["why"]}
        self.assertEqual(validate_explain(b, t), [])

    def test_pack_carries_explain(self):
        with tempfile.TemporaryDirectory() as d:
            run = Path(d)
            (run / "explain").mkdir()
            (run / "explain" / "e0__c1.json").write_text(json.dumps(GOOD))
            (run / "explain" / "e0__c2.json").write_text(json.dumps({"noticed": "x", "why": "y"}))
            (run / "inputs.jsonl").write_text(json.dumps({"event": "e0", "text": TEXT, "context": CONTEXT}) + "\n")
            bg = {"events": [{"event": "e0", "supported": [{"id": "c1"}], "uncertain": [{"id": "c2"}]}]}
            merge_explain(bg, run)
            ev = bg["events"][0]
            self.assertEqual(ev["supported"][0]["explain"], GOOD)
            self.assertNotIn("explain", ev["uncertain"][0])


if __name__ == "__main__":
    unittest.main()
