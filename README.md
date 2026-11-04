# Çapraz Manşet 7.0

Çapraz Manşet compares how Turkish outlets headline the same events. 7.0 is 6.0
([`aylinunel/caprazmanset-6`](https://github.com/aylinunel/caprazmanset-6)) rebuilt on a longer window,
with one new, experimental layer: **BiasGuard**, an evidence-bound cognitive-bias review, applied to the
most widely covered events. The interface is 6.0's; the new views are Bulgular › Bilişsel inceleme,
a section on each reviewed event's page, and Yöntem § 11.

| | |
|---|---|
| Window | 1 September – 3 November 2026 (Türkiye time); 29–30 October are missing from the collector, 4 November was a partial day and is left out |
| Articles | 245,935 (181,274 with a lede), 33 outlets, no sampling |
| Events | 5,341 (5,201 automatic, 140 hand-checked and unchanged) |
| Active outlets | 17 (4 left, 2 middle, 11 right by the supplied placements) |
| Validation | clustering pair F1 0.845 against the reference events; event-topic micro-F1 0.755 (`docs/build-report.json`) |
| Source | `backfill-data` branch of `aylinunel/turkish-news-scraper` (runs and `data/recent` up to 4 Nov 14:42 UTC) |
| BiasGuard | 116-concept catalog, top events by outlet count, reviewed by separate Claude Code agents (no API key); see `biasguard/AGENT_REVIEW.md` |

## Open the site

`public/` is the whole site. Serve it with any static server:

```bash
cd public && python3 -m http.server 8000
```

## Rebuild

```bash
python -m pip install -r pipeline/requirements.txt jsonschema     # Python 3.11+, Node 22
cd pipeline
python -m capraz_pipeline run --from <collector export> --since 2026-09-01 --until 2026-11-03

# BiasGuard (from the repo root)
python -m biasguard.news inputs --build dist/capraz-7/build --run runs/bg --top 150
python -m biasguard.news tasks  --run runs/bg --stage select     # then run selector agents
python -m biasguard.news tasks  --run runs/bg --stage review     # then advocate + skeptic agents
python -m biasguard.news apply  --run runs/bg --out dist/capraz-7/build/biasguard.json
cd pipeline && python -m capraz_pipeline build --since 2026-09-01 --until 2026-11-03 \
  && python -m capraz_pipeline site --site ../public          # packs BG into core.bin
```

## What changed from 6.0

- **Data:** the window runs to 3 November; the collector's `data/recent` runs are ingested with the backfill runs.
- **BiasGuard, adapted to news** (`biasguard/news.py`): one event is one review: each outlet's first
  headline and lede side by side, with placements and non-covering outlets as context.
- **Fixes from BiasGuard's own 2026-10-28 simulation** (`docs/biasguard-simulation/`):
  - evidence type (`statement` / `behavioral`) is declared per quote and no longer depends on which
    input field carries it (the simulation lost delegation creep to that field gate);
  - a missing or invalid reviewer output is `analysis_incomplete`, no output at all is `not_attempted`;
    neither is ever counted as "no bias";
  - a dispatch circuit breaker stops after five consecutive failed batches;
  - each review is capped at six concepts, one batch per role (the simulation had a length failure).
- Version labels read 7.0.

## Boundaries

BiasGuard verdicts are experimental machine output: two reviewer agents of the same base model are not
independent, quote checks prove location not meaning, the catalog was written for decision processes,
and the tool's own simulation completed 23 of 52 cases on AI-authored labels. The site labels the
layer "deneysel / otomatik" and never shows an unreviewed event as bias-free. Everything else is as in
6.0: machine results are labelled "otomatik"; outlet placements, ownership notes, narrative coding and
hand-checked events are supplied material carried unchanged.
