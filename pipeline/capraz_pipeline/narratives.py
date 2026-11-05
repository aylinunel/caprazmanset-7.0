"""Anlatı haritası weeks after the hand-coded period (Yöntem § 6, same rules).

    python -m capraz_pipeline.narratives candidates --build ../dist/capraz-7/build --out ../runs/narr
    (coding agents write ../runs/narr/coded/<event>.json; see runs/narr/PROMPT.md)
    python -m capraz_pipeline.narratives finalize --out ../runs/narr      -> data/reference/narratives-7.json

§ 6.2 sample per week (7.0 pool): the 10 events with most outlets, plus 25 from coverage ranks 11-80 ranked by
score range / 100 + (1 - mean pairwise headline Jaccard). § 6.3 selection: a dimension is a focus
dimension when at least half the outlets fill it with at least two distinct values; s_d = w_d * c_d * H_d,
S = sum of the top three, events need two focus dimensions, at most KEEP per week by S.
"""
from __future__ import annotations

import argparse
import gzip
import json
import math
import re
from datetime import date, timedelta
from itertools import combinations
from pathlib import Path

from .config import REPO

WEEKS = [("w7", "11–17 Ekim", "2026-10-11", "2026-10-17"), ("w8", "18–24 Ekim", "2026-10-18", "2026-10-24"),
         ("w9", "25–31 Ekim", "2026-10-25", "2026-10-31"), ("w10", "1–3 Kasım", "2026-11-01", "2026-11-03")]
KEEP = 20  # most differentiated events shown per agent-coded week (S, § 6.3)
DIMS = ["frame", "hero", "blame", "cause", "cons", "aff", "sol", "moral", "start"]
WEIGHT = {"blame": 1.2, "sol": 1.2, "frame": 1.0, "cause": 1.0, "moral": 1.0, "start": 0.8, "aff": 0.8, "hero": 0.6, "cons": 0.5}
OUT = REPO / "data" / "reference" / "narratives-7.json"
METHOD = ("Başlıklardan otomatik kodlandı: her kurumun bu olaydaki ilk başlığını bir Claude ajanı okuyup dokuz boyut atadı "
          "(Yöntem § 6 şeması). Başlığın desteklemediği boyut boş bırakıldı. İnsan kodlayıcı denetiminden geçmedi.")


def _load(p: Path):
    return json.loads(gzip.decompress(p.read_bytes()))


def _words(t: str) -> set[str]:
    return {w for w in re.findall(r"\w+", t.lower()) if len(w) > 2}


def candidates(build: Path, out: Path) -> int:
    core = _load(build / "core.bin")
    packs = core["meta"]["packs"]
    arts = {}
    for m in packs["months"]:
        a = _load(build / f"a-{m}.bin")
        for k, i in enumerate(a["i"]):
            arts[i] = {"s": packs["sources"][a["s"][k]], "t": a["t"][k], "d": a["d"][k]}
    out.mkdir(parents=True, exist_ok=True)
    rows = []
    for wk, label, d0, d1 in WEEKS:
        evs = [e for e in core["E"] if d0 <= e["f"][:10] <= d1]
        evs.sort(key=lambda e: (-len(e["s"]), -e["n"], e["i"]))

        def first(e):
            f = {}
            for i in e["a"]:
                a = arts.get(i)
                if a and (a["s"] not in f or a["d"] < f[a["s"]]["d"]):
                    f[a["s"]] = a
            return f

        def diverge(e):
            ws = [_words(a["t"]) for a in first(e).values()]
            jac = [len(x & y) / len(x | y) for x, y in combinations(ws, 2) if x | y]
            return e["p"] / 100 + 1 - (sum(jac) / len(jac) if jac else 1)

        # 7.0: wider pool (35 per week) so the 20 most differentiated narratives can be kept.
        pick = evs[:10] + sorted(evs[10:80], key=lambda e: -diverge(e))[:25]
        for e in pick:
            f = first(e)
            rows.append({"event": e["i"], "week": wk, "title": e["t"],
                         "headlines": [{"s": s, "hl": a["t"]} for s, a in sorted(f.items(), key=lambda x: x[1]["d"])]})
    (out / "candidates.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1))
    return len(rows)


def _focus(rows: list[dict]) -> tuple[list[str], float]:
    n = len(rows)
    scores = {}
    for d in DIMS:
        vals = [(r.get(d) or "").strip() for r in rows]
        vals = [v for v in vals if v]
        if n < 2 or len(vals) < n / 2 or len(set(vals)) < 2:
            continue
        counts = {v: vals.count(v) for v in set(vals)}
        h = -sum(c / len(vals) * math.log(c / len(vals)) for c in counts.values()) / math.log(n)
        scores[d] = WEIGHT[d] * (len(vals) / n) * h
    top = sorted(scores, key=lambda d: -scores[d])
    return top, round(sum(scores[d] for d in top[:3]), 4)


def finalize(out: Path) -> dict:
    cands = json.loads((out / "candidates.json").read_text())
    N, NW = {}, []
    for wk, label, *_ in WEEKS:
        coded, kept = 0, []
        for c in (x for x in cands if x["week"] == wk):
            p = out / "coded" / f"{c['event']}.json"
            if not p.exists():
                continue
            x = json.loads(p.read_text())
            known = {h["s"]: h["hl"] for h in c["headlines"]}
            rows = [{"s": r["s"], "hl": known[r["s"]], **{d: (r.get(d) or "").strip() for d in DIMS}}
                    for r in x["rows"] if r.get("s") in known]
            coded += 1
            focus, score = _focus(rows)
            if len(focus) >= 2:
                key = f"{wk}-{c['event']}"
                N[key] = {"label": "", "ev": c["event"], "w": wk, "kind": "event", "status": "agent_coded", "method": METHOD,
                          "q": {k: x["q"].get(k, "") for k in ("happened", "agree", "differ", "care")},
                          "rows": rows, "score": score, "focus": focus}
                kept.append(key)
        kept.sort(key=lambda k: -N[k]["score"])
        for k in kept[KEEP:]:
            del N[k]
        NW.append({"k": wk, "l": label, "keys": kept[:KEEP], "pool": coded, "coded": "agent"})
    OUT.write_text(json.dumps({"N": N, "NW": NW}, ensure_ascii=False, indent=1))
    return {w["k"]: (w["pool"], len(w["keys"])) for w in NW}


def merge(core: dict) -> None:
    """7.0 analyses outside the main pipeline: agent-coded Anlatı haritası weeks and the checklist run
    on the current scorer (build.py and biasguard.news pack)."""
    cl = OUT.parent / "checklist-7.json"
    if cl.exists():
        core["CL"] = json.loads(cl.read_text())
    if OUT.exists():
        x = json.loads(OUT.read_text())
        core["N"] = {**core["N"], **x["N"]}
        core["NW"] = [w for w in core["NW"] if w["k"] not in {y["k"] for y in x["NW"]}] + x["NW"]


if __name__ == "__main__":
    p = argparse.ArgumentParser(prog="python -m capraz_pipeline.narratives")
    p.add_argument("cmd", choices=["candidates", "finalize"])
    p.add_argument("--build", type=Path)
    p.add_argument("--out", type=Path, required=True)
    a = p.parse_args()
    print(candidates(a.build, a.out) if a.cmd == "candidates" else finalize(a.out))
