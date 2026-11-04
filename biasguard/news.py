"""Çapraz Manşet 7.0: BiasGuard review of news events.

One event = one review. ``text`` holds one line per outlet (its first headline in the event and
its lede); ``context`` holds the event's date, outlet placements and which active outlets did not
cover it. Reviewer outputs come from files (written by Claude Code reviewer agents, or by any
other reviewer that follows ``prompts()``); the engine's own quote, condition and evidence-type
gates decide every verdict.

    python -m biasguard.news inputs  --build dist/capraz-7/build --run runs/2026-11-04 --top 150
    python -m biasguard.news tasks   --run runs/2026-11-04 --stage select|review --batch 10
    python -m biasguard.news apply   --run runs/2026-11-04 --out dist/capraz-7/build/biasguard.json

A missing or invalid reviewer file never counts as a negative: the event is
``analysis_incomplete`` (some output present) or ``not_attempted`` (none).
"""
from __future__ import annotations

import argparse
import gzip
import json
from pathlib import Path
from typing import Any

from .engine import BiasGuard
from .providers import ProviderCallError, _selector_system_prompt, _system_prompt, _selector_schema
from .schemas import build_reviewer_schema

MAX_CANDIDATES = 6  # one reviewer batch per role; the 2026-10-28 run lost a case to finish_reason=length
LEDE_CHARS = 280
BREAKER = 5  # consecutive failed batches before the dispatcher stops (see AGENT_REVIEW.md)


def _load(path: Path) -> Any:
    return json.loads(gzip.decompress(path.read_bytes()))


def event_inputs(build: Path, top: int) -> list[dict[str, Any]]:
    core = _load(build / "core.bin")
    packs = core["meta"]["packs"]
    arts: dict[str, dict] = {}
    for m in packs["months"]:
        a = _load(build / f"a-{m}.bin")
        for k, i in enumerate(a["i"]):
            arts[i] = {"s": packs["sources"][a["s"][k]], "t": a["t"][k], "d": a["d"][k]}
        lp = build / f"l-{m}.bin"
        if lp.exists():
            l = _load(lp)
            for i, lede in zip(l["i"], l["l"]):
                if i in arts:
                    arts[i]["l"] = lede
    lean = {s["s"]: s.get("lean") for s in core.get("S", [])}
    active = set(core["meta"]["v2"]["activeSet"])
    events = sorted(core["E"], key=lambda e: (-len(e["s"]), -e["n"], e["i"]))[:top]
    out = []
    for e in events:
        first: dict[str, dict] = {}
        for i in e["a"]:
            a = arts.get(i)
            if a and (a["s"] not in first or a["d"] < first[a["s"]]["d"]):
                first[a["s"]] = a
        lines = []
        for s, a in sorted(first.items(), key=lambda x: x[1]["d"]):
            lede = (a.get("l") or "").strip().replace("\n", " ")
            if len(lede) > LEDE_CHARS:
                lede = lede[:LEDE_CHARS].rsplit(" ", 1)[0] + " …"
            lines.append(f"[{s} · {a['d'][11:16]}] {a['t']}" + (f" — {lede}" if lede else ""))
        def place(s: str) -> str:
            v = lean.get(s)
            return "yerleşim yok" if v is None else ("sol" if v < 45 else "sağ" if v > 55 else "orta") + f" ({v})"
        missing = sorted(active - set(first))
        context = (f"Olay: {e['t']}\nİlk başlık: {e['f']} · son başlık: {e['l']} (Türkiye saati)\n"
                   f"Kurumlar ve verilen yerleşimler: " + "; ".join(f"{s}: {place(s)}" for s in sorted(first)) + "\n"
                   f"Olayı vermeyen etkin kurumlar: " + (", ".join(missing) if missing else "yok"))
        out.append({"event": e["i"], "title": e["t"], "outlets": len(first), "text": "\n".join(lines), "context": context})
    return out


class FileReviewer:
    """Replays reviewer outputs for one event; anything missing raises, so the engine fails closed."""

    def __init__(self, run: Path, event: str) -> None:
        self.run, self.event = run, event
        self.last_call: dict[str, Any] | None = None

    def _read(self, rel: str) -> dict[str, Any]:
        p = self.run / rel / f"{self.event}.json"
        if not p.exists():
            self.last_call = {"role": rel, "status": "failed", "failure": "reviewer output file missing"}
            raise ProviderCallError(f"no reviewer output: {rel}/{self.event}.json")
        try:
            data = json.loads(p.read_text())
        except json.JSONDecodeError as exc:
            self.last_call = {"role": rel, "status": "failed", "failure": "reviewer output is not JSON"}
            raise ProviderCallError(f"reviewer output is not JSON: {rel}/{self.event}.json") from exc
        self.last_call = {"role": rel, "status": "completed", "content_length": p.stat().st_size}
        return data

    def select(self, text, context, cards, max_candidates):
        return self._read("selections")

    def review(self, text, context, cards, role):
        return self._read(f"reviews/{role}")

    def provider_info(self) -> dict[str, Any]:
        return {"provider": "claude_code_reviewer_agents", "catalog_validated": False,
                "note": "Selector, advocate and skeptic were separate agents that did not see one another's output."}


def _inputs(run: Path) -> list[dict[str, Any]]:
    return [json.loads(l) for l in (run / "inputs.jsonl").read_text().splitlines() if l.strip()]


def selected_cards(bg: BiasGuard, run: Path, item: dict) -> list[str] | None:
    """The card set the engine will send to both reviewers (selector ids + lexical floor)."""
    p = run / "selections" / f"{item['event']}.json"
    if not p.exists():
        return None
    try:
        sel = bg._validate_selection(json.loads(p.read_text()), MAX_CANDIDATES)
    except Exception:
        return None
    from .catalog import rank_candidates
    seeds = [c["id"] for c in rank_candidates(bg.cards, item["text"], item["context"], limit=MAX_CANDIDATES)[:min(6, MAX_CANDIDATES)]]
    ids: list[str] = []
    for cid in [*sel["candidate_ids"], *seeds]:
        if cid not in ids and len(ids) < MAX_CANDIDATES:
            ids.append(cid)
    return ids or [c["id"] for c in bg.cards[:MAX_CANDIDATES]]


def prompts(stage: str, role: str | None = None) -> str:
    if stage == "select":
        return _selector_system_prompt()
    return _system_prompt(role) + (
        "\n\nNEWS INPUT\ntext has one line per outlet: [outlet · HH:MM] headline — lede. context has the event, "
        "outlet placements and active outlets that did not cover it. A behavioral quote is a comparative observation "
        "of what an outlet actually published (e.g. its headline set against the others); quote it exactly from text. "
        "Write mechanism, alternative_explanation and missing_context in Turkish.")


def write_tasks(run: Path, stage: str, batch: int) -> list[Path]:
    bg = BiasGuard()
    items = _inputs(run)
    tdir = run / "tasks" / stage
    tdir.mkdir(parents=True, exist_ok=True)
    card_by_id = {c["id"]: c for c in bg.cards}
    todo = []
    for it in items:
        if stage == "select":
            if not (run / "selections" / f"{it['event']}.json").exists():
                todo.append({"event": it["event"], "text": it["text"], "context": it["context"]})
        else:
            ids = selected_cards(bg, run, it)
            if ids is None:
                continue
            todo.append({"event": it["event"], "text": it["text"], "context": it["context"], "card_ids": ids})
    paths = []
    for n in range(0, len(todo), batch):
        chunk = todo[n:n + batch]
        if stage == "select":
            compact = [{"id": c["id"], "name": c["name"], "definition": c["definition"],
                        "necessary_conditions": c["necessary_conditions"]} for c in bg.cards]
            task = {"stage": stage, "system_prompt": prompts("select"),
                    "output_schema": _selector_schema([c["id"] for c in bg.cards], MAX_CANDIDATES),
                    "cards": compact, "events": chunk}
        else:
            used = sorted({cid for x in chunk for cid in x["card_ids"]})
            task = {"stage": stage, "system_prompts": {r: prompts("review", r) for r in ("advocate", "skeptic")},
                    "output_schema_note": "per event: build_reviewer_schema(card_ids, role); see schema_example",
                    "schema_example": build_reviewer_schema(chunk[0]["card_ids"], "advocate"),
                    "cards": [card_by_id[c] for c in used], "events": chunk}
        p = tdir / f"batch-{n // batch:03d}.json"
        p.write_text(json.dumps(task, ensure_ascii=False, indent=1))
        paths.append(p)
    return paths


def apply(run: Path) -> dict[str, Any]:
    bg = BiasGuard()
    results = []
    tripped = (run / "BREAKER_TRIPPED").exists()  # written by the dispatcher when it stopped early
    for it in _inputs(run):
        ev = it["event"]
        present = any((run / d / f"{ev}.json").exists() for d in ("selections", "reviews/advocate", "reviews/skeptic"))
        if not present:
            results.append({"event": ev, "title": it["title"], "outlets": it["outlets"], "status": "not_attempted"})
            continue
        r = BiasGuard(reviewer=FileReviewer(run, ev)).analyze(it["text"], it["context"], stakes="medium", mode="ai",
                                                             max_candidates=MAX_CANDIDATES)
        slim = lambda f: {"id": f["id"], "name": f["name"], "status": f["status"], "definition": f["definition"],
                          "source_url": f["source_url"], "evidence": [{"q": x["quote"], "src": x["source"], "kind": x.get("kind")}
                                                                      for x in f["evidence"]],
                          "mechanisms": f["mechanisms"], "alternatives": f["alternative_explanations"],
                          "missing": f["missing_context"]}
        results.append({
            "event": ev, "title": it["title"], "outlets": it["outlets"], "status": r["status"],
            "error": r.get("error"), "selected": r.get("candidate_ids"),
            "supported": [slim(f) for f in r["supported_findings"]],
            "uncertain": [slim(f) for f in r["uncertain_findings"]],
            "effects": [slim(f) for f in r["contextual_effects"]],
            "downgraded": sum(1 for o in r.get("reviewer_outcomes", []) for a in o["assessments"]
                              if a["original_verdict"] == "supported" and a["verdict"] != "supported"),
            "rejectedQuotes": len(r.get("rejected_evidence", [])),
            "quotesVerified": sum(len(a["verified_evidence"]) for o in r.get("reviewer_outcomes", []) for a in o["assessments"]),
        })
    done = [x for x in results if x["status"] == "review_complete"]
    count = lambda k: sum(len(x[k]) for x in done)
    by_card: dict[str, dict] = {}
    for x in done:
        for k in ("supported", "uncertain"):
            for f in x[k]:
                by_card.setdefault(f["id"], {"id": f["id"], "name": f["name"], "supported": 0, "uncertain": 0})[k] += 1
    summary = {
        "planned": len(results), "completed": len(done),
        "incomplete": sum(1 for x in results if x["status"] == "analysis_incomplete"),
        "notAttempted": sum(1 for x in results if x["status"] == "not_attempted"),
        "breakerTripped": tripped, "supported": count("supported"), "uncertain": count("uncertain"),
        "effects": count("effects"), "eventsWithSupported": sum(1 for x in done if x["supported"]),
        "downgraded": sum(x.get("downgraded", 0) for x in done), "quotesVerified": sum(x.get("quotesVerified", 0) for x in done),
        "rejectedQuotes": sum(x.get("rejectedQuotes", 0) for x in done),
        "cards": sorted(by_card.values(), key=lambda c: (-c["supported"], -c["uncertain"], c["id"])),
        "catalog": len(bg.cards), "maxCandidates": MAX_CANDIDATES,
    }
    return {"summary": summary, "events": results}


def main() -> None:
    p = argparse.ArgumentParser(prog="python -m biasguard.news")
    p.add_argument("cmd", choices=["inputs", "tasks", "apply", "pack"])
    p.add_argument("--build", type=Path)
    p.add_argument("--run", type=Path, required=True)
    p.add_argument("--top", type=int, default=150)
    p.add_argument("--stage", choices=["select", "review"])
    p.add_argument("--batch", type=int, default=10)
    p.add_argument("--out", type=Path)
    a = p.parse_args()
    a.run.mkdir(parents=True, exist_ok=True)
    if a.cmd == "inputs":
        items = event_inputs(a.build, a.top)
        (a.run / "inputs.jsonl").write_text("".join(json.dumps(x, ensure_ascii=False) + "\n" for x in items))
        print(json.dumps({"events": len(items), "maxChars": max(len(x["text"]) + len(x["context"]) for x in items)}))
    elif a.cmd == "tasks":
        for path in write_tasks(a.run, a.stage, a.batch):
            print(path)
    elif a.cmd == "pack":
        # Same keys build.py adds, without re-running the 20-minute pipeline.
        core_path = a.build / "core.bin"
        core = _load(core_path)
        core["BG"] = json.loads((a.build / "biasguard.json").read_text())
        import sys; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "pipeline"))
        from capraz_pipeline.narratives import merge
        merge(core)
        core["BGS"] = json.loads((Path(__file__).resolve().parents[1] / "docs" / "biasguard-simulation" / "summary.json").read_text())
        core_path.write_bytes(gzip.compress(json.dumps(core, ensure_ascii=False, separators=(",", ":")).encode()))
        print(core_path)
    else:
        res = apply(a.run)
        (a.out or a.run / "biasguard.json").write_text(json.dumps(res, ensure_ascii=False))
        print(json.dumps({k: v for k, v in res["summary"].items() if k != "cards"}))


if __name__ == "__main__":
    main()
