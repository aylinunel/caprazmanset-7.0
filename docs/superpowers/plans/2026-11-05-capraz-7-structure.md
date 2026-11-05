# Çapraz Manşet 7.0 Structure Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the public site around one interactive narrative map, four "Örüntüler" question pages, one complete page per event, and AI results marked within the site's own look.

**Architecture:** The data bundle and pipeline stay. `site/js/app.js` (one IIFE) keeps the loader, indexes and reused components; new views live in `site/js/v7/*.js` and are inlined into the IIFE at a marker by `site.py`. Pure logic goes in `site/js/v7/logic.js`, which also exports CommonJS so Node tests can call it. One new pipeline step produces two-sentence public AI explanations.

**Tech Stack:** vanilla JS (ES5 style, as app.js), Python 3.13 pipeline, Node 22 `node --test`, Playwright (preinstalled) for the smoke test.

**Spec:** `docs/superpowers/specs/2026-11-05-capraz-7-structure-design.md`

## Global Constraints

- Turkish UI copy; concept names stay in English as in the catalog.
- Fonts: Newsreader (display), IBM Plex Sans (body), IBM Plex Mono only for numbers. No new colour tokens.
- AI marker: `.yz` = 2px dotted left rule in `var(--line2)`, normal fonts/ink; badge `.yz-badge` = outlined pill "YZ" in `var(--ink2)`. Remove `.ai`, `.ai-box`, `.ai-tag`, `.ai-line`, `tr.ai-row` and `--ai*` tokens.
- Public site never shows "bağlam gerekli", "desteklendi", or other review status labels.
- Priority rule: the narrative map is first on `#/` and on every coded event page; every Örüntüler page leads with its interactive chart; static tables only inside "Nasıl ölçtük".
- No finding renders its chart/explanation on two pages; outlet profiles link to Örüntüler with one-line numbers.
- Yönetim review desk behaviour unchanged (owner-only writes to `reviews`; AI results public until rejected; corrected text replaces AI text, shown as "Editör notu").
- No new libraries; every page works at 390px wide without horizontal scroll, in light and dark.

## Review Focus

- An event with a narrative entry whose AI coding was rejected in Yönetim: map, picker and Örüntüler counts must all drop it (test in Task 2 `weekEvents`, Task 7 smoke route).
- A week with no surviving events (all rejected or hand weeks with 0 keys): week switcher shows it disabled, map shows a plain empty state, not a crash (Task 2, Task 4).
- An outlet with no placement (`lean == null`, "yerleşimsiz"): map rows sort it last with the grey bar; bloc tables exclude it from left/mid/right but list it under outlets (Task 2 `blameByBloc`, Task 4).
- A reviewed event whose `explain` is missing (agent failed): event page falls back to the first sentence of the advocate/skeptic texts, never shows raw status labels (Task 2 `yzText`, Task 6).
- Ilan search with Turkish casing (`İCRA` vs `icra`, `ı/i`) and an empty result: matches case-insensitively with Turkish folding and shows the ilan.gov.tr pointer when empty (Task 2 `ilanSearch`, Task 10).

---

## File Structure

| File | Responsibility |
|---|---|
| `site/js/v7/logic.js` | Pure functions (no DOM, no globals except args); CommonJS export |
| `site/js/v7/core.js` | NAV/SECTIONS/DETAIL overrides, redirects, `yzBlock`, `findingBlock`, CSS-free helpers |
| `site/js/v7/anlati.js` | Homepage/Anlatı interactive map |
| `site/js/v7/olay.js` | Event page |
| `site/js/v7/oruntu.js` | Four Örüntüler pages |
| `site/js/v7/kurum.js` | Outlet profile additions |
| `site/js/v7/yontem.js` | Yöntem incl. Türkiye bağlamı and concept library |
| `site/js/v7/ilan.js` | Resmî ilan bul |
| `site/styles.css` | `.yz`, `.yz-badge`, `.v7-*` styles; remove violet AI styles |
| `pipeline/capraz_pipeline/site.py` | Inline `site/js/v7/*.js` at `/*@@V7@@*/` in fixed order |
| `biasguard/news.py` | `explain` stage (tasks/apply) |
| `site/tests/logic.test.cjs` | Node tests for logic.js |
| `site/tests/smoke.cjs` | Playwright route smoke test |

---

### Task 1: Assembly plumbing and smoke harness

**Files:**
- Modify: `site/js/app.js` (insert `/*@@V7@@*/` on the line before the final `rev7Init();` call, inside the IIFE)
- Modify: `pipeline/capraz_pipeline/site.py` (`assemble`)
- Create: `site/js/v7/logic.js`, `site/js/v7/core.js` (empty stubs with a header comment)
- Create: `site/tests/smoke.cjs`, `pipeline/tests/test_site_v7.py`

**Interfaces:**
- Produces: `V7_ORDER = ["logic", "core", "anlati", "olay", "oruntu", "kurum", "yontem", "ilan"]` in site.py; missing files are skipped. `node site/tests/smoke.cjs <siteDir> <outDir> [routes…]` exits 1 on any console error, horizontal scroll at 390px, or element `.v7-empty-bug` present; writes `<route>-<w>-<theme>.png`.

- [ ] **Step 1: Write the failing test** `test_v7_files_are_inlined_in_order` in `pipeline/tests/test_site_v7.py`: build into a tmp dir with two fixture files (`logic.js` containing `/*L*/`, `core.js` containing `/*C*/`), assert `/*@@V7@@*/` is gone from index.html and `/*L*/` appears before `/*C*/`, both inside the app `<script type="text/x-cm">`.
- [ ] **Step 2: Run** `cd pipeline && python -m pytest tests/test_site_v7.py -v` → FAIL (marker still present).
- [ ] **Step 3: Implement** in `assemble`: read each existing `SITE/js/v7/<name>.js` in `V7_ORDER`, join with `\n`, replace the marker; assert the marker exists in app.js.
- [ ] **Step 4: Run** the test → PASS; run `python -m unittest discover -s tests` → all pass.
- [ ] **Step 5: Write `smoke.cjs`**: serves `<siteDir>` on a free port with `http.createServer`, for each route × width (1280, 390) × theme (light, dark: set `localStorage yh-theme` before load) waits 9 s on the first route then 2.5 s, records `pageerror`/console errors, checks `scrollWidth <= innerWidth`, screenshots. Default routes: `#/`, `#/olaylar`, `#/olay?e=s4374`, `#/oruntu?q=secim`, `#/oruntu?q=dil`, `#/oruntu?q=anlati`, `#/oruntu?q=hiz`, `#/kurumlar`, `#/kurum?s=takvim`, `#/karsilastir`, `#/yontem`, `#/ilan`, `#/benim`, `#/yonetim?t=bilissel`.
- [ ] **Step 6: Run** `cd pipeline && python -m capraz_pipeline site && node ../site/tests/smoke.cjs ../dist/capraz-7/site /tmp/smoke '#/'` → exits 0 (current site still renders).
- [ ] **Step 7: Commit** `feat(site): inline v7 view files and add route smoke test`.

### Task 2: Pure logic (`logic.js`)

**Files:**
- Modify: `site/js/v7/logic.js`
- Create: `site/tests/logic.test.cjs`

**Interfaces (all pure; `module.exports` when `typeof module !== "undefined"`):**
- `trFold(s: string) -> string` — Turkish lower-case (`İ→i`, `I→ı`) then strip diacritics-free compare form.
- `weekEvents(N: object, NW: array, week: string, ok: (key)=>bool) -> string[]` — keys of `NW[week].keys` passing `ok`, ordered by `N[k].score` desc (missing score last, then key).
- `narrGroups(rows: array, dim: string) -> [{value: string, outlets: string[]}]` — groups by trimmed `row[dim]`; `""` group last; groups ordered by outlet count desc then value (Turkish collation).
- `orderOutlets(rows: array, lean: (s)=>number|null) -> array` — by lean asc, nulls last, then outlet id.
- `dimShares(N, keys) -> {dim: share}` — share of keys whose `focus` contains each of the nine dims.
- `blameByBloc(N, keys, bloc: (s)=>"left"|"mid"|"right"|"none") -> [{value, left, mid, right, none}]` — counts of rows by `blame` value per bloc, empty blame excluded, ordered by total desc.
- `yzText(f: finding, review: {status, note}|null) -> {noticed: string, why: string, editor: bool}|null` — `null` when review.status==="rejected"; editor note replaces both (`noticed = note, why = ""`, `editor = true`) when "corrected"; else `f.explain` if present, else first sentence (split on `. `) of advocate mechanism / skeptic alternative.
- `ilanSearch(items: [{t, s, d, u, kind, family}], q: {text, family, from, to, src}) -> items` — `trFold` substring on title, exact family/src, inclusive ISO date bounds, newest first.
- `redirectRoute(path: string, params: object) -> string|null` — `/bulgular*`→`/oruntu?q=secim`; `/yanlilik` with `t=kutuphane`→`/yontem?s=kavramlar`, other `/yanlilik*`→`/oruntu?q=dil`; `/olaylar` with `t=kor`→`/oruntu?q=secim`; `/anlati` keeps; else null.

- [ ] **Step 1: Write failing tests** in `logic.test.cjs` (node:test + assert), at least:
  - `weekEvents` drops a key rejected by `ok`, orders `[{score:.2},{score:.9}]` → `.9` first; unknown week → `[]`.
  - `narrGroups(rows, "blame")` with values `["Şüpheliler","Şüpheliler","Çete",""]` → `[{value:"Şüpheliler",outlets:2}, {value:"Çete"}, {value:""}]`.
  - `orderOutlets` puts `lean:null` last.
  - `blameByBloc` counts a `none` outlet under `none`, not left/mid/right.
  - `yzText` returns null for rejected; editor note for corrected; `explain` when present; fallback first sentence when `explain` missing.
  - `ilanSearch({text:"icra"})` matches title `"İSTANBUL 3. İCRA DAİRESİ"`; empty filter returns all newest first.
  - `redirectRoute("/yanlilik",{t:"kutuphane"})` → `"/yontem?s=kavramlar"`; `("/olaylar",{t:"kor"})` → `"/oruntu?q=secim"`; `("/olaylar",{})` → null.
- [ ] **Step 2: Run** `node --test site/tests/` → FAIL (functions undefined).
- [ ] **Step 3: Implement** the functions above.
- [ ] **Step 4: Run** `node --test site/tests/` → PASS.
- [ ] **Step 5: Commit** `feat(site): pure logic for v7 views`.

### Task 3: Core — navigation, redirects, YZ marker, finding block

**Files:**
- Modify: `site/js/v7/core.js`, `site/styles.css`, `site/js/app.js` (route(): call redirect first; delete violet helpers `bg7AiTag` styles usage replaced by `yzBadge`)

**Interfaces:**
- Consumes: `redirectRoute` (Task 2).
- Produces:
  - `yzBadge() -> html` (`<span class="yz-badge" title="Yapay zekâ ile üretildi · Yöntem › YZ">YZ</span>`).
  - `yzBlock(innerHtml, title?) -> html` (`<section class="yz">…`).
  - `findingBlock({id, claim, viz, means, how}) -> html` — `<section class="v7-find" id>` with `<p class="v7-claim">`, `<div class="v7-viz">`, `<p class="v7-means"><b>Bu ne anlama geliyor.</b> …`, `<details class="v7-how"><summary>Nasıl ölçtük</summary>…`.
  - `v7Nav`: `NAV = [["/anlati","Anlatı",[]],["/olaylar","Olaylar",["/olay"]],["/oruntu","Örüntüler",[]],["/kurumlar","Kurumlar",["/kurum","/karsilastir"]],["/yontem","Yöntem",[]]]`; utilities "Ara", "Resmî ilan bul" (`#/ilan`), "Benim"; `SECTIONS` gains `/oruntu` (fn `pgOruntu`), `/ilan` (fn `pgIlan`), `/` → `pgAnlati`; `SUB["/oruntu"]` = the four questions with `q` values `secim, dil, anlati, hiz` and labels "Kim neyi haber yapıyor", "Nasıl anlatıyor", "Kimi sorumlu tutuyor", "Kim önce veriyor".
- [ ] **Step 1:** Add to `smoke.cjs` an assertion mode `--expect-nav "Anlatı,Olaylar,Örüntüler,Kurumlar,Yöntem"` that reads `.xnav-l a` texts; run on current build → FAIL.
- [ ] **Step 2:** Implement core.js and CSS (`.yz`, `.yz-badge`, `.v7-find`, `.v7-claim` in Newsreader 22px, `.v7-means` IBM Plex Sans 15px `--ink2`, `.v7-how` summary styled like `.cm3-voices summary`); delete the violet rules from styles.css; in `route()` apply `redirectRoute` via `location.replace` before rendering.
- [ ] **Step 3:** Rebuild site; run smoke with `--expect-nav …` on `#/` and `#/bulgular` (must land on `#/oruntu?q=secim`) → PASS.
- [ ] **Step 4: Commit** `feat(site): v7 navigation, redirects and YZ marker`.

### Task 4: Anlatı — interactive narrative map (homepage)

**Files:**
- Create: `site/js/v7/anlati.js`
- Modify: `site/js/app.js` (remove old `pgHome`, `homeNarr`, home rails; keep `pillMatrix` only if still used elsewhere, else delete)

**Interfaces:**
- Consumes: `weekEvents`, `narrGroups`, `orderOutlets` (Task 2); `yzBadge` (Task 3); globals `D.N`, `NW`, `EV`, `SRC`, `bloc`, `narrOk`, `storyLabel`, `NDL`, `NORD`.
- Produces: `pgAnlati(params) -> html`, `wireAnlati(root)` (called from route() after render when path is `/` or `/anlati`), `narrMap(key, opts{active?:dim}) -> html` (reused by Task 6).

Behaviour (spec §3): `params.w` week (default last week with ≥1 surviving event), `params.n` event key (default first of `weekEvents`). Week switcher buttons disabled for empty weeks. Map rows from `orderOutlets(n.rows, lean)`, each row: left/mid/right bar, outlet name, one cell per focus dim (pill coloured by value index within that dim, "başlıkta yok" when empty). Column header click → `active` dim: rows regroup under `narrGroups` headings with counts and the pills of that column outlined; second click clears. Outlet name click toggles its headline (`row.hl`) beneath. Pill hover/focus adds `.v7-same` to all pills with equal value in that column. Side panel: `q.happened`, `q.agree`, `q.differ` (YZ badge + `.yz` when `n.status==="agent_coded"`). "Nasıl okunur" three lines (copy below). "Bu hafta" strip: three most-covered events of the latest week → `#/olay?e=`.

"Nasıl okunur" copy (exact):
1. "Her satır bir kurum; soldan sağa, kayıt defterindeki yerleşim sırasıyla."
2. "Aynı renk, aynı seçim: iki kurum aynı aktörü sorumlu tutuyorsa hücreleri aynı renktedir."
3. "Bir sütun başlığına tıklayın: kurumlar o boyuttaki seçimlerine göre gruplanır."

- [ ] **Step 1:** Extend smoke with `--click '#/:.v7-map th[data-dim]'` support (click first match, then assert `.v7-group` count ≥ 1) and `--click '#/:.v7-row .v7-out'` (assert `.v7-hl` visible). Run on current build → FAIL.
- [ ] **Step 2:** Implement anlati.js and its CSS (`.v7-map` table with sticky outlet column, `.v7-row`, `.v7-out`, `.v7-hl`, `.v7-group`, `.v7-same`, focus-visible rings; keyboard: headers and outlet names are `<button>`).
- [ ] **Step 3:** Rebuild; run smoke on `#/`, `#/anlati?w=w8`, `#/anlati?w=w1` at both widths and themes, plus the two click checks → PASS; inspect `#/-390-light.png` and `#/-1280-dark.png`.
- [ ] **Step 4: Commit** `feat(site): interactive narrative map as homepage`.

### Task 5: Public AI explanations (`explain` stage)

**Files:**
- Modify: `biasguard/news.py` (commands `explain-tasks`, `explain-apply`; `pack` copies `explain` into `BG.events[].{supported,uncertain}[].explain`)
- Modify: `biasguard/test_news.py`
- Create: `runs/bg/explain/` (agent outputs, committed)

**Interfaces:**
- Produces: per finding `explain = {"noticed": str, "why": str}` in `dist/.../biasguard.json` and core.bin `BG`.
- `explain-tasks --run runs/bg --batch 15` writes `runs/bg/explain/tasks/batch-NNN.json` with, per item, `key = "<event>__<card>"`, concept name, quotes with outlets, advocate mechanism, skeptic alternative, missing context.
- Agent output: `runs/bg/explain/<key>.json` = `{"noticed": "...", "why": "..."}`.
- `validate_explain(x: dict) -> list[str]` returns problems: each field 1–2 Turkish sentences, 40–320 chars, no "bağlam gerekli"/"desteklendi"/"uncertain", no quote longer than 8 chars that is absent from the event text.

- [ ] **Step 1: Write failing tests** `test_validate_explain_rejects_status_words`, `test_validate_explain_rejects_invented_quote` (quote in “…” not in event text), `test_pack_carries_explain` (fixture run with one explain file → packed finding has `explain`).
- [ ] **Step 2: Run** `python -m unittest biasguard.test_news -v` → FAIL.
- [ ] **Step 3: Implement** `validate_explain`, the two commands, and the pack change; invalid explain files are skipped (the site falls back per Task 2 `yzText`).
- [ ] **Step 4: Run** tests → PASS.
- [ ] **Step 5: Generate:** `python -m biasguard.news explain-tasks --run runs/bg`; dispatch one agent per batch (prompt: write plain Turkish for a general reader; "noticed" = what the headlines show, naming outlets; "why" = why that is not proof; use only given quotes; no status words), at most 20 concurrent; then `explain-apply`; report coverage (`explained / live findings`).
- [ ] **Step 6: Commit** `feat(biasguard): two-sentence public explanations`.

### Task 6: Event page

**Files:**
- Create: `site/js/v7/olay.js`
- Modify: `site/js/app.js` (`DETAIL["/olay"].fn = pgOlay7`; delete `pgEventV2`, `bg7Event`, `bg7finding` public use)

**Interfaces:**
- Consumes: `narrMap` (Task 4), `yzText`, `yzBlock`, `yzBadge`, `splitCard`, `NBYEV`, `bg7ev`, `rev7`.
- Produces: `pgOlay7(params) -> html`.

Order (spec §5): header (title, date span, outlet count, coverage bar, blind-spot line) → `narrMap` if `NBYEV[e.i]` and `narrOk` → split card + all headlines (existing lede button) → `yzBlock` "Bilişsel inceleme" with, per live finding: concept name (link to `#/yontem?s=kavramlar&k=`), "Ne fark etti" (`yzText.noticed`) with quotes + outlet names, "Neden kesin değil" (`yzText.why`), "Editör notu" label when `editor` → timing (first outlet, lag) and lede gap line → outlet links.

- [ ] **Step 1:** Smoke assertions: `#/olay?e=s4374` has `.v7-map` before `.xsp` in DOM order and `.yz` contains no text "bağlam gerekli"; run → FAIL.
- [ ] **Step 2:** Implement.
- [ ] **Step 3:** Rebuild; smoke `#/olay?e=s4374`, `#/olay?e=<an uncoded, unreviewed event>` → PASS; inspect screenshots.
- [ ] **Step 4: Commit** `feat(site): single complete event page`.

### Task 7: Örüntüler pages

**Files:**
- Create: `site/js/v7/oruntu.js`
- Modify: `site/js/app.js` (delete `pgFindings` and its tab pages, `pgVeriler`, `pgBias` tabs `kesif/bicimler/turkiye/cozumleyici`, `finding*` renderers no longer referenced; keep chart helpers they used that Task 7 reuses: `fig`, `legendHTML`, `advDraw` pieces, `v5Draw` pieces)

**Interfaces:**
- Consumes: `findingBlock`, `yzBlock`, `yzBadge` (Task 3); `dimShares`, `blameByBloc` (Task 2); existing data `D.E`, `D.V5`, `D.ADV`, `D.TP`, `deviceStats`, `bg7Stats`, `bg7Rates`.
- Produces: `pgOruntu(params) -> html`, `wireOruntu(q)` (draws charts after render).

Each page = intro line (the question, one sentence) + findings in this order; first finding's viz must be interactive (hover tooltips + click-through to events/outlets):
- `secim`: (1) interactive coverage strip of events by left share (click → event); (2) blind spots by side with widest examples; (3) agenda similarity heatmap (existing phi chart, hover pair → shared events count); (4) topic mix by bloc; (5) weekly blind-spot trend.
- `dil`: (1) within-event score range distribution with click-through to the widest events; (2) loaded-language by bloc/outlet (sortable bars); (3) top-20 devices table, filterable chips "Kural / YZ", YZ rows with `yzBadge`, row → concept; (4) differing-word examples; (5) style vs placement (PCA scatter, hover outlet); (6) `yzBlock`: per-bloc rates of AI citations with plain explanation (no per-outlet table here).
- `anlati`: (1) dimension shares over all surviving coded events with week toggle (`dimShares`); (2) blame × bloc (`blameByBloc`, hover shows outlets); (3) weekly trend, AI-coded weeks with `yzBadge`; link to `#/anlati`.
- `hiz`: (1) first-to-report share vs median lag scatter (hover outlet); (2) headline vs lede gap bars.
Each finding's `means` is written from the computed numbers (no fixed numbers in copy); `how` holds the rule, n, thresholds and link `#/yontem?s=<section>`.

- [ ] **Step 1:** Smoke assertions: each `#/oruntu?q=*` has ≥ 3 `.v7-find`, every `.v7-find` has non-empty `.v7-means`, first `.v7-viz` has an element with `[data-go]` or `[data-tip]`; no text "bağlam gerekli". Run → FAIL.
- [ ] **Step 2:** Implement page by page (secim, dil, anlati, hiz), rebuilding and running the smoke for that route after each.
- [ ] **Step 3:** Run full smoke → PASS; inspect the four 390px screenshots.
- [ ] **Step 4: Commit** `feat(site): Örüntüler question pages`.

### Task 8: Kurumlar

**Files:**
- Create: `site/js/v7/kurum.js`
- Modify: `site/js/app.js` (`pgSource` uses `kurumLines7(k)`; replace `bg7Outlet` with the YZ-marker version)

**Interfaces:**
- Produces: `kurumLines7(s) -> html` — one line each linking to the Örüntüler finding ids: share of events covered, blind-spot participation, mean load vs bloc mean, first-to-report share, AI citation rate (with `yzBadge`, from `bg7Rates`).
- [ ] **Step 1:** Smoke: `#/kurum?s=takvim` has `.v7-kurum-lines a[href^="#/oruntu"]` ≥ 4 and one `.yz`; run → FAIL.
- [ ] **Step 2:** Implement; ensure `#/karsilastir` still renders.
- [ ] **Step 3:** Rebuild; smoke → PASS.
- [ ] **Step 4: Commit** `feat(site): outlet profiles link to patterns`.

### Task 9: Yöntem with Türkiye bağlamı and concept library

**Files:**
- Create: `site/js/v7/yontem.js`
- Modify: `site/js/app.js` (`pgMethod` composes `methodPaper()` sections + new sections; delete old `bg7Method` once moved)

**Interfaces:**
- Produces: `pgYontem7(params) -> html`; section anchors `s=veri, olay, dil, anlati, yz, yzicerik, turkiye, kavramlar, sinir, kaynak`; `params.k` opens a concept in the library.

Türkiye bağlamı blocks (spec §7), each "Sorun / Ne yaptık / Sınır": case folding; suffix-aware matching; stop-words; negation and modality (cite `D.CL` failures computed from data); quote vs own voice; official notices; right-heavy outlet set (counts from `V2.active`); supplied placements/ownership; 48-hour window; AI review on Turkish input. Concept library: all `D.BR` entries searchable, tier chips, review counts from `bg7Stats` with `yzBadge`, no status labels. YZ section and "Yapay zekâ ile üretilen içerik" carry over from 7.0-v4 text, rewritten without "bağlam gerekli".
- [ ] **Step 1:** Smoke: `#/yontem?s=turkiye` contains ≥ 9 `.v7-tr-block`; `#/yontem?s=kavramlar` lists ≥ 129 `.v7-concept`; run → FAIL.
- [ ] **Step 2:** Implement.
- [ ] **Step 3:** Rebuild; smoke → PASS.
- [ ] **Step 4: Commit** `feat(site): Yöntem with Türkiye bağlamı and concept library`.

### Task 10: Resmî ilan bul

**Files:**
- Create: `site/js/v7/ilan.js`

**Interfaces:**
- Consumes: `ilanSearch`, `trFold` (Task 2); `CM3.notices(D).byArt`, `CM3.noticeKind(title)`.
- Produces: `pgIlan(params) -> html`, `wireIlan()`.
Items = articles in `byArt` mapped to `{t, s, d, u, kind, family}`. Controls: text input, family chips (Mahkeme `court`, İcra `enforcement`, Kamu `public`, Diğer `other`), date from/to, outlet select. Results: 50 per page with "daha fazla". Header: total count and "bu hafta" count. Empty state copy: "Bu aramayla eşleşen ilan bizim derlemimizde yok. Resmî ilanların tamamı için ilan.gov.tr adresine bakabilirsiniz."
- [ ] **Step 1:** Smoke: `#/ilan` typing "icra" into `#ilanq` yields ≥ 1 `.v7-ilan-row`; typing "zzzz" shows the empty-state text; run → FAIL.
- [ ] **Step 2:** Implement.
- [ ] **Step 3:** Rebuild; smoke → PASS.
- [ ] **Step 4: Commit** `feat(site): Resmî ilan bul search`.

### Task 11: Cleanup, full verification, publish

**Files:**
- Modify: `site/js/app.js` (delete unreferenced functions from removed pages), `README.md` (structure section), `public/` (rebuilt)

- [ ] **Step 1:** Find unreferenced top-level functions in app.js: `node -e` script that lists `function name(` declarations whose name occurs once in app.js + v7 files; delete those belonging to removed pages; rebuild.
- [ ] **Step 2:** Run `node --test site/tests/`, `cd pipeline && python -m unittest discover -s tests`, `python -m unittest biasguard.test_news` → all PASS.
- [ ] **Step 3:** Run full smoke (all default routes, both widths, both themes) → exit 0; review every 390px screenshot once.
- [ ] **Step 4:** `python -m capraz_pipeline site --fragment --site ../dist/capraz-7/artifact`; copy site to `public/`; update README "Layout" and "What changed"; commit `feat(site): 7.0 structure`; push.
- [ ] **Step 5:** Republish the artifact (same file path, omit `capabilities` to keep `db` + `user`); `ArtifactData list reviews`; `ArtifactData set` with `as_level: "interact"` must be refused.
