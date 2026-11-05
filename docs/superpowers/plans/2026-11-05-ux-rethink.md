# Çapraz Manşet UX Rethink Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the site usable by everyday readers, students and researchers (layered), splits-first, in the Kindred style, without losing its dynamic visuals.

**Architecture:** A static single-page app: `site/` sources are assembled into `public/index.html` by `pipeline/capraz_pipeline/site.py`. Pure logic goes in `site/js/v7/logic.js` (unit-tested with node:test); views live in `site/js/v7/*.js` and `site/js/app.js` (one IIFE, functions hoisted); styles in `site/styles.css` (later rules win). Routing is hash-based (`route()` in app.js) with `redirectRoute()` in logic.js.

**Tech Stack:** ES5-style vanilla JS, CSS, canvas, AntV G6 (vendored), Playwright smoke tests, node:test.

**Spec:** `docs/superpowers/specs/2026-11-05-ux-rethink-design.md`

## Global Constraints

- Repo `/home/user/caprazmanset-7.0`, branch `claude/adoring-ramanujan-4sy721`. Never hand-edit `public/index.html`; rebuild: `cd pipeline && python3 -c "from capraz_pipeline.site import assemble; from capraz_pipeline.config import REPO; assemble(REPO/'public'/'data', REPO/'public')"`.
- Tests after every task: `node --test site/tests/logic.test.cjs` (all pass) and `timeout 600 node site/tests/smoke.cjs public /tmp/claude-0/-home-user-caprazmanset-7-0/99086cf1-b0c4-5ee2-a4e0-aa1cd8ace843/scratchpad/smoke` → `smoke ok`.
- ES5 style (var, function); no new dependencies; Turkish UI copy.
- Tokens light: paper #f7f7f5, surface #ffffff, raise #fcfcfb, sunk #efefec, line #e5e5e1, line2 #cfcfca, ink #111111, ink2 #3a3a3a, muted #7b7b7b, mist #9a9a9a. Dark: paper #0f0f0f, surface #171717, raise #1c1c1c, sunk #0a0a0a, line #262626, line2 #3a3a3a, ink #f2f2f0, ink2 #d4d4d0, muted #9a9a9a, mist #7b7b7b. Data colours unchanged (light left #E11D48 / right #2563EB / mid #79839A; dark left #E8556B / right #4586EE / mid #C9C2B2).
- Fonts: Inter 400/500/600/700/800 everything; IBM Plex Mono for numbers/eyebrows/labels.
- Every colour is a token with light values on `:root` and dark values on `:root[data-theme="dark"]` (and under `@media (prefers-color-scheme:dark) :root:not([data-theme="light"])`).
- First sentence of every finding contains none of: `φ`, `ρ`, ` r = `, ` p = `, `%95`, `güven aralığı`, `PCA`, `Mantel`, `binom`, `Wilson`, `permütasyon`.
- Phone 390px: no horizontal page scroll; touch targets ≥ 44px; text contrast ≥ 4.5:1 both themes.
- prefers-reduced-motion: still frames, no entrance animation. Canvases stop off-screen; ≤ 30 fps.
- Every old URL keeps working (redirect table, Task 3).
- Commit per task ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_019ixFxCVKuk51z78ofCNHna`. Pushing is the controller's job after review.

## Review Focus

1. A week with no event covered by both sides (or fewer than 6) → the feed shows what exists; with zero, it shows one line "Bu hafta iki taraftan da verilen olay yok" and the "Tüm olaylar →" link — no empty section, no error. (Task 4 test)
2. Unknown or outdated tab/anchor in a bookmarked URL (`#/kurumlar?t=xyz`, `#/yontem?s=old`) → lands on the section's default tab, never a blank page. (Task 3 test)
3. Outlet without a placement ("Yerleşimsiz") or with < 20 political headlines → its Kısaca omits the bloc comparison sentence instead of printing NaN or "undefined". (Task 8 test)
4. Very long Turkish headlines and outlet names at 390px (split cards, feed, chip pickers) → wrap inside their box; no overflow. (Task 10 smoke at 390)
5. Touch-only users → tapping a chart mark or glossary term shows its content and a second tap elsewhere closes it; nothing requires hover. (Task 5 / Task 10 smoke `--click`)

---

### Task 1: Fog split-card hero and ticker removal

Replaces the LED-billboard hero (dmHero / dmHeroMake in `site/js/v7/dots.js`) with the spec §3.1.1 fog hero. The dot engine's page-header band (`dmMake`, `dmHeads`, `dmMount`) stays.

**Files:** Create `site/js/v7/fog.js` (hero markup builder + clock + WebGL2 fog); modify `pipeline/capraz_pipeline/site.py` (`V7_ORDER`: add "fog" after "dots"), `site/js/v7/dots.js` (delete dmHero/dmHeroMake and their CSS hooks), `site/js/v7/home.js`, `site/js/app.js` (`cyberChrome`, `v2bAfter` → call `fogMount(view)`), `site/styles.css`, `site/tests/smoke.cjs`.

**Interfaces:**
- Produces `fogHero(e) -> html` (uses `SPLITPAIR[e.i] || defaultPair(e)`, `artOf`, `compareHeads`, `markText`, `bloc`, `SRC`, `srcName`) and `fogMount(root)` (starts the clock on `.fh` if present; stops when removed or off-screen).
- Produces element `#bu-hafta` (feed anchor, filled by Task 4) and `.fh-cta` link `href="#bu-hafta"`.

- [ ] **Step 1:** Smoke additions: on every route `.xtick` is null; on `#/` `.fh [role=group] button` count is 2 with exactly one `aria-pressed="true"`; clicking the second button (`--click ".fh [role=group] button:nth-child(2)"`), after 1.2 s the right set `.fh-set.r` has class `is-on`; `.fh-cta` text is `Bu haftanın ayrışmalarını gör ↓`. Run → FAIL.
- [ ] **Step 2:** Ticker: `cyberChrome` no longer inserts `.xtick`.
- [ ] **Step 3:** fog.js per spec §3.1.1 — port the reference's clock and shader verbatim except: the palette (left warm red-grey day `(.96,.90,.88)`/`(.80,.72,.71)`, right cool blue-grey `(.88,.91,.97)`/`(.70,.75,.85)`; dark theme: left `(.30,.20,.21)`/`(.14,.09,.10)`, right `(.20,.25,.36)`/`(.08,.11,.18)`, chosen by a uniform `D` = 1 in dark theme), no porch glow, 30 fps cap, IntersectionObserver gate, theme change re-reads colours. `--k`, `--k2`, `--dip`, `--sink` are set on the `.fh` element (not `:root`). Starts on the left set (k=0). Without WebGL2: `.fh-fog` gets a CSS gradient class and the clock still runs sink/colours.
- [ ] **Step 4:** CSS (`/* 7.0 · fog hero */` block): sizes on `--u:min(calc(100vw/1600),calc(100vh/900))` (1px ≤ 820px), hero `height:calc(100svh - 64px)`, `min-height:560px`; sky fields as radial gradients blurred; card at hero scale (max-width calc(1100*var(--u)), headline Inter 500 calc(46*var(--u)) with `mark.mw` yellow highlights, label IBM Plex Mono, rail 6u in `--left`/`--right`, the tilted black band with the shared words in `--hl`); glass toggle 524u × 86u, radius 16u, rgba(120,132,140,.34) bg, 1px rgba(255,255,255,.2) border, blur(14u), `:before` highlight `linear-gradient(160deg,#f7f8dc,#e2ee9f 90%)` with opacity `--on`; text colours `color-mix` on `--k`; phone rules from spec.
- [ ] **Step 5:** home.js: `fogHero(lead)` before `.wrap.page`; remove `.v7-htop` (lede, example split card, button) and the dmHero call; emit `<section id="bu-hafta" class="v7-feed"></section>` after the hero. dots.js: delete the hero code paths and their CSS.
- [ ] **Step 6:** Rebuild; logic + smoke pass; screenshots of `#/` at 1280×800 light, 1280×800 dark, 390×844 light — at rest (left), mid-switch (≈300 ms after clicking right: card sunk in fog) and after the switch (right set, blue-tinted). LOOK at them.
- [ ] **Step 7:** Commit `feat(site): fog split-card hero, remove ticker`.
### Task 2: Kindred tokens, type and chrome

**Files:** Modify `site/styles.css` (one final block `/* 7.0 · Kindred style */` at the end), `site/head.html`, `site/js/app.js` (`navHTML`).

**Interfaces:** Produces CSS classes `.xutil.xpill` (black pill link), `.k-glow` (rainbow underglow for any primary pill), page header `.phead` light variant used by all later tasks.

- [ ] **Step 1:** Tokens exactly as Global Constraints; `--ff-d,--ff-b,--ff-w,--ff-g` = `"Inter", system-ui, -apple-system, "Segoe UI", sans-serif`; `--grain:none; --fibre:none`; body background-image none.
- [ ] **Step 2:** head.html fonts = Inter 400;500;600;700;800 + IBM Plex Mono 400;500 only; grep styles.css for literal `Newsreader|Bricolage|IBM Plex Sans` outside variable definitions and point them at the variables.
- [ ] **Step 3:** Headings Inter 500 (h1 −.03em, h2/h3 −.02em). `.phead`: light (transparent on paper, ink text, border-bottom 1px line, padding 48px top / 40px bottom, full-bleed kept), all hard-coded light-on-dark `.phead …` colours overridden to tokens. Ink bands (`.sec.xink`, `.xsp-band`, `.xpromise`, `.foot.xfoot`) neutral #111 (dark #000) with #f7f7f5 text; no warm colours remain (`#1B1813 #F5F0E3 #26231C #4A4437 #14120E #0E0C09`).
- [ ] **Step 4:** `.xbtn` black pill (Inter 500 14px, 11px 20px, radius 999px, hover translateY(−1px)); `.k-glow` = pill fill on `::before` (z −1) + rainbow glow on `::after` (z −2, gradient `#ffcf5a,#7dffa8,#5ad7ff,#9b7bff,#ff6fd8,#ffb36b`, blur 9px, opacity .85; hover blur 12px, opacity 1). `.chip` transparent + 1px line2; pressed black pill, no dot images. `.icobtn` round.
- [ ] **Step 5:** Nav: background paper 92% + blur, 1px line border; `.xnav-a` Inter 14px ink2, active ink 600 + 2px ink underline. navHTML: add class `xpill` to the "Benim" link.
- [ ] **Step 6:** Rebuild; screenshots (1280 light, 1280 dark, 390 light) of `#/`, `#/oruntu?q=secim`, `#/olay?e=s4374`, `#/kurum?s=takvim`, `#/yontem`; fix any unreadable text; logic + smoke pass.
- [ ] **Step 7:** Commit `feat(site): Kindred tokens, Inter and chrome`.

### Task 3: Navigation names, subtitles, search field, tab declutter, redirects

**Files:** Modify `site/js/v7/logic.js` (`redirectRoute`, new `NAV_SUB`), `site/js/v7/core.js` (NAV), `site/js/app.js` (SECTIONS tabs, `navHTML`, `pgSources`, `pgEvents`, mobile menu), `site/js/v7/yontem.js` (title, TOC), `site/tests/logic.test.cjs`.

**Interfaces:**
- Produces `NAV_SUB` (logic.js, exported): `{"/olaylar": "Bütün olaylar, arama ve kör noktalar", "/anlati": "Kurumlar bir olayı nasıl çerçeveledi", "/oruntu": "Haberlerde tekrar eden farklar", "/kurumlar": "Kim nasıl yazıyor, yan yana", "/yontem": "Yöntem, sözlük ve sınırlar"}`.
- Produces tabs: Olaylar `[["liste","Tüm olaylar"],["kor","Kör noktalar"],["ilan","Resmî ilanlar"]]`; Kurumlar `[["liste","Kurumlar"],["karsilastir","Karşılaştır"],["kayit","Kayıt ve güven"]]`.
- Produces `redirectRoute(path, params) -> string|null` with the spec §4 table.

- [ ] **Step 1: Failing tests** in logic.test.cjs, `test("redirectRoute v8 table", …)`:
  - `("/kurumlar",{t:"genel"})` → `"/kurumlar?t=liste"`; `{t:"siralama"}` → `"/kurumlar?t=liste"`; `{t:"guven"}` → `"/kurumlar?t=kayit"`; `{t:"xyz"}` → `"/kurumlar?t=liste"`.
  - `("/harita",{})` → `"/kurumlar?t=liste&v=harita"`; `("/karsilastir",{})` → `"/kurumlar?t=karsilastir"`.
  - `("/olaylar",{t:"konular"})` → `"/olaylar?t=liste&f=konu"`; `{t:"kapsama"}` → `"/yontem?s=kapsama"`; `{t:"kor"}` → `null`; `("/ilan",{})` → `"/olaylar?t=ilan"`.
  - `("/yontem",{s:"9"})` → `null` (anchors still handled by `yontemAnchor`); `("/bulgular",{})` → `"/oruntu?q=secim"` (kept).
  - `L.NAV_SUB["/yontem"] === "Yöntem, sözlük ve sınırlar"`.
  Run → FAIL.
- [ ] **Step 2:** Implement redirectRoute + NAV_SUB; remove the old `/olaylar?t=kor` redirect; export both. Unknown `t` for a section with tabs → that section's first tab. Run → PASS.
- [ ] **Step 3:** NAV labels: "Anlatı haritası", "Nasıl çalışır" (other three unchanged); each desktop link gets `title=NAV_SUB[path]`; mobile menu shows label + subtitle (13px muted line); every `.phead` gets the subtitle as its `.eyebrow` text ("<Section> · <subtitle>"). Desktop: replace the search icon with `<form class="xsearch" role="search"><input type="search" id="navq" placeholder="Olay ya da kurum ara" aria-label="Olay ya da kurum ara"></form>` submitting to `#/ara?q=`; ≤1080px keep the icon. Remove "Resmî ilan bul" from the header.
- [ ] **Step 4:** SECTIONS tabs per Interfaces. Kurumlar `liste` renders genel + liste + siralama content in that order (one page) with a `Liste / Harita` chip switch (`v=harita` shows `pgMap` content inside the tab); `kayit` renders kayıt defteri then güven. Olaylar `liste` gets the topic filter chips (`f=konu` opens them); `kor` renders the blind-spot finding (`orFindBlind`) and `v5BlindTable()`; `ilan` renders `pgIlan`. Yöntem page title "Nasıl çalışır"; TOC gains `["sozluk","Sözlük"]`, `["kapsama","Kapsama"]` (kapsama = the coverage-matrix content from `pgEventsV1` kapsama tab).
- [ ] **Step 5:** Rebuild; smoke default routes plus `#/harita #/kurumlar?t=genel #/olaylar?t=kor #/olaylar?t=ilan #/yontem?s=kapsama` (pass these as extra routes) → `smoke ok`.
- [ ] **Step 6:** Commit `feat(site): plain-language nav, decluttered tabs, redirects`.

### Task 4: Homepage splits feed, how-it-works steps, go-deeper links

**Files:** Modify `site/js/v7/logic.js` (`weeklySplits`, `whatDiffers`), `site/js/v7/home.js`, `site/styles.css`, `site/tests/logic.test.cjs`.

**Interfaces:**
- Consumes `#bu-hafta` (Task 1), `NAV_SUB` (Task 3), `splitCard(e, pair, {small:true})` and `defaultPair(e)` (app.js), `covOf(e) -> [left, mid, right]`.
- Produces `weeklySplits(events, lastDay, opt) -> Event[]` and `whatDiffers(e, narr) -> string`.

- [ ] **Step 1: Failing tests:** `weeklySplits` keeps events with `f` (first headline `"YYYY-MM-DDTHH:MM"`) within the 7 days ending `lastDay` (inclusive), `cov[0] ≥ 1 && cov[2] ≥ 1`, `s.length ≥ 6`, excludes `opt.exclude` ids, sorts by `p` desc then `s.length` desc; returns `[]` for none. Fixtures: 5 events covering each rule (pass `opt.cov` as a function so the test needs no D). `whatDiffers`: `{p:45}` → `"Birinde belirgin biçimde daha sert bir dil var"`; `{p:25}` → `"Birinde daha yüklü bir dil var"`; `{p:5}` → `"Aynı olay, farklı sözcükler"`; with `narr = {rows:[{blame:"A"},{blame:"B"}]}` and `{p:45}` → `"Sorumlu tutulan farklı"`. Run → FAIL.
- [ ] **Step 2:** Implement both in logic.js and export. Run → PASS.
- [ ] **Step 3:** home.js fills `#bu-hafta`: `<h2>Bu hafta en farklı anlatılan olaylar</h2>`, a 2-column (1 on ≤760px) grid of 6 cards, each `<a class="v7-fc" href="#/olay?e=ID">` with title (storyLabel 90), `splitCard(e, null, {small:true, link:false})`, the whatDiffers line and `N kurum verdi`; buttons `Daha fazla göster` (+6, hidden when none left) and link `Tüm olaylar →` (`#/olaylar`). Zero events → the Review-Focus line. Exclude the hero's event.
- [ ] **Step 3b:** Feed-card dot effect: on `pointerenter`/`focus` (and first tap on touch) of a `.v7-fc`, overlay each `mark.mw` in the card with a small canvas that renders the word as dots (reuse dots.js helpers: `dmHash`, quantised LEVELS) and runs a 1.2 s crackle-and-reform once (seed-ordered dissolve front, then re-form); nothing runs while idle; disabled under reduced motion. Smoke: hovering the first `.v7-fc` adds a `canvas.dm-word` inside it.
- [ ] **Step 4:** Replace the 10-card grid with `Çapraz Manşet nasıl çalışır` (three steps: Karşılaştır — "Aynı olayın bütün başlıklarını yan yana koyarız."; Fark et — "Kurumlar arasında ayrışan sözcükleri işaretleriz."; Ölç — "Bu farkların haftalar boyunca tekrar edip etmediğini sayarız.") and `Daha derine in` (five links: label + NAV_SUB). Keep the agenda network section, retitled `Kim kiminle aynı haberleri seçiyor?`.
- [ ] **Step 5:** Rebuild; logic + smoke; screenshot `#/` scrolled to the feed at 1280 and 390.
- [ ] **Step 6:** Commit `feat(site): this week's splits feed on the homepage`.

### Task 5: Finding block v8, glossary popovers, data tables

**Files:** Modify `site/js/v7/core.js` (`findingBlock`), `site/js/v7/logic.js` (`GLOSSARY`, `glossTerms`), `site/js/v7/viz.js` (`vzTable`), `site/js/v7/yontem.js` (Sözlük section), `site/styles.css`, `site/tests/logic.test.cjs`.

**Interfaces:**
- Produces `findingBlock(f)` where `f = {id, claim, viz, read, means, example, how, table}` (all html strings except `example` = event id or null). Renders: `.v7-claim`, `.v7-viz`, `.v7-read` ("Nasıl okunur" line), `<details class="v7-why"><summary>Neden önemli?</summary>means + "Bir örnek olay →"</details>`, `<details class="v7-how"><summary>Nasıl ölçtük?</summary>how + <details class="v7-tbl"><summary>Tabloyu göster</summary>table</details></details>`. Missing `read`/`table` → omitted, never "undefined".
- Produces `vzTable(headers: string[], rows: (string|number)[][]) -> html` (`<div class="scroller"><table>`).
- Produces `GLOSSARY` = `{ "kör nokta": "…", "yerleşim": "…", "yüklü dil": "…", "çerçeve": "…", "φ": "…", "spot": "…", "kodlama": "…" }` (one Turkish sentence each, written in this task) and `glossTerms(html) -> html` wrapping the FIRST occurrence of each term outside tags in `<button type="button" class="gl" data-gl="term">term</button>`.
- [ ] **Step 1: Failing tests:** `glossTerms("Bu bir kör nokta olayı")` contains exactly one `data-gl="kör nokta"`; text inside a tag attribute (`<a title="kör nokta">x</a>`) is not wrapped; unknown text unchanged. Run → FAIL; implement; PASS.
- [ ] **Step 2:** findingBlock per Interfaces; claim and means pass through `glossTerms`. Popover: one delegated click/focus handler on `.gl` shows a small card (`role="dialog"`, the definition + `Sözlük →` link to `#/yontem?s=sozluk`), Esc / click elsewhere closes; works by tap.
- [ ] **Step 3:** Nasıl çalışır `sozluk` section renders GLOSSARY as a definition list (alphabetical, tr collation).
- [ ] **Step 4:** Smoke: on `#/oruntu?q=secim` click the first `.gl` (`--click .gl:first`) → a `.gl-pop` visible. Rebuild; logic + smoke pass.
- [ ] **Step 5:** Commit `feat(site): layered finding block, glossary popovers, data tables`.

### Task 6: Rewrite every finding in plain language

**Files:** Modify `site/js/v7/oruntu.js` (all 17 `orFind*`), `site/js/v7/kurum.js`, the Kurumlar overview sections in `site/js/app.js` (cmean, ckeys), `site/tests/smoke.cjs`.

**Interfaces:** Consumes `findingBlock` fields and `vzTable` (Task 5).

- [ ] **Step 1:** Smoke check: for each `#/oruntu?q=…` route, every `.v7-claim` text must not match `/φ|ρ| r = | p = |%95|güven aralığı|PCA|Mantel|binom|Wilson|permütasyon/`, and every `.v7-find` with a chart has a `.v7-tbl table`. Run → FAIL.
- [ ] **Step 2:** For every finding: claim rewritten per spec §5 writing rules (whole-number %, names outlets/blocs, observed facts only); statistics moved verbatim into `how`; `means` rewritten plainly as `means`, with an `example` event where the finding has one (blind spots, widest range, top split); add a one-line `read` caption ("Her nokta bir kurum; …"); add `table` via `vzTable` from the same rows the chart uses (G6 findings: the edge list `Kurum A | Kurum B | değer`).
- [ ] **Step 3:** Rebuild; logic + smoke pass; screenshot each Örüntüler tab at 1280 light.
- [ ] **Step 4:** Commit `feat(site): plain-language findings with tables`.

### Task 7: Event page order

**Files:** Modify `site/js/v7/olay.js` (`pgOlay7`, `olayHead`), `site/tests/smoke.cjs` (adjust the existing `.v7-map` order check).

**Interfaces:** Consumes `splitBlock(e)`, `olayHeadlines(e)`, `olayTiming(e)`, `olayReview(e)`, `narrMap(key)`, `v7Body(n, e)` (anlati.js), `compareHeads(a,b)`.

- [ ] **Step 1:** Update smoke's event-page check: order must be `.phead|header` → `.v7-kisaca` → `.xspwrap` → `#alist` section → `.v7-time` → `details.v7-deep` (0–2) → outlets. Run → FAIL.
- [ ] **Step 2:** Implement spec §3.2: header line "N kurum verdi · a sol, b merkez, c sağ · first – last"; plain blind-spot badge; `.v7-kisaca` (coded `q` fields with YZ badge if `status==="agent_coded"`, else the generated line); split block titled "En farklı iki başlık" with pickers under it labelled "Başka iki kurumu karşılaştır"; headlines default sort `lean`; timing; `<details class="v7-deep">` rows "Anlatı ayrıntısı" and "Yapay zekâ ne fark etti? (YZ)" (content built on first open); outlets with lean dots.
- [ ] **Step 3:** Rebuild; logic + smoke pass; screenshot `#/olay?e=s4374` 1280 + 390.
- [ ] **Step 4:** Commit `feat(site): event page reads story-first`.

### Task 8: Kurumlar picker, outlet page, compare summary

**Files:** Modify `site/js/v7/logic.js` (`outletKisaca`, `recentSplits`), `site/js/v7/kurum.js`, `site/js/app.js` (`pgSources` liste tab, `pgSource`, compare), `site/styles.css`, `site/tests/logic.test.cjs`.

**Interfaces:**
- Produces `outletKisaca(o) -> string[]` where `o = {name, events, total, mean, blocMean, placed, nb: [name, name]}`; sentences: coverage ("<name> bu dönemde <events> olayı verdi (olayların %<round>’i)."), language (blocMean null or !placed → omitted; |mean − blocMean| ≤ 1 → "Başlıkları kendi bloğunun ortalamasına yakın."; higher → "… biraz daha yüklü."; lower → "… daha sakin."), neighbours ("Gündemi en çok <a> ve <b>’ye benziyor." — omitted if nb empty).
- Produces `recentSplits(events, s, opt) -> [{e, other}]` — the outlet's 5 most recent events (≥ 5 outlets) by `f` desc where `opt.load(e, s)` and an opposite-bloc outlet's load differ most; `other` = that outlet.
- [ ] **Step 1: Failing tests** for outletKisaca (placed/unplaced, ±1 band edges 1.0 and 1.01, empty nb) and recentSplits (ordering, opposite-bloc only via `opt.bloc`, ≤ 5). Implement; PASS.
- [ ] **Step 2:** Kurumlar `liste` tab top: "Bir kurum seç" — four chip groups (Sol / Merkez / Sağ / Yerleşimsiz) with lean dots and a filter input (`id="kq"`, filters chips by `trFold`).
- [ ] **Step 3:** Outlet page per spec §3.3: breadcrumb, placement chip with glossary, ownership line, "Kısaca" from outletKisaca, "Son ayrışan başlıkları" (compact `splitCard(e,[s,other],{small:true})`), finding blocks (agenda ego network, loaded language, fingerprint, first-share), `<details>` "Kayıt ve sahiplik" and "Veri toplama", button `Başka bir kurumla karşılaştır →` (`#/kurumlar?t=karsilastir&a=<s>`).
- [ ] **Step 4:** Karşılaştır: grouped-chip pickers; result opens with "Kısaca" (agenda overlap % from `orShared` / sizes) then shared events as split cards.
- [ ] **Step 5:** Rebuild; logic + smoke pass; screenshots `#/kurumlar`, `#/kurum?s=takvim`, a placed and an unplaced outlet, at 1280 + 390.
- [ ] **Step 6:** Commit `feat(site): outlet picker, outlet page summary, compare summary`.

### Task 9: Dot-matrix charts and page-header bands

**Files:** Modify `site/js/v7/viz.js` (`vzDist`, `vzLine` drawing), `site/js/v7/dots.js` (dmHeads band uses `NAV_SUB` section name), `site/styles.css`.

**Interfaces:** Consumes VZ registry (`VZ[id]`), tokens; `dmHeads(root)` / `dmMount(root)` already called in `v2bAfter`.

- [ ] **Step 1:** Replace the svg in vzDist/vzLine with `<canvas class="vz-cv" data-cv="d:<id>|l:<id>">`. Paint on insertion (MutationObserver, rAF-debounced), resize (ResizeObserver), theme change; backing = CSS size × min(2, DPR). Dist: pitch 6px, r 2.4px, full dots up to the bin height, quantised top dot (.38/.52/.78 r), faint pinpoint wall (r .7, line2). Line: same wall; series dots every 4px r 2.2 (thin r 1.2, α .5); area series fill below the line r 1.1 α .28. Colours resolved from CSS vars at paint time. Keep every overlay and interaction.
- [ ] **Step 2:** Page-header band shows the section name (from `NAV` label) in ink at low alpha on the right; reduced motion = still frame.
- [ ] **Step 3:** Verify with shot2.cjs on `#/oruntu?q=secim`, `#/oruntu?q=dil`, `#/kurum?s=takvim`, `#/olaylar?t=ilan` (light, dark, 1280, 390); drag on the coverage distribution lists events; weekly line hover shows the tooltip; logic + smoke pass.
- [ ] **Step 4:** Commit `feat(site): dot-matrix charts and header bands`.

### Task 10: Mobile and accessibility pass

**Files:** Modify `site/styles.css`, `site/js/v7/viz.js` (tap-to-pin tooltips), `site/js/app.js` (sub-tab chip row scroll-into-view), `site/tests/smoke.cjs`.

- [ ] **Step 1:** Smoke additions at 390: every `a, button, [role=link], summary` inside `#view` has a bounding box ≥ 44×44 or is inline text inside a paragraph (allow `.lnk` and `.gl`); `--click` on a `.vz-r[data-vtip]` shows `#tip.on`; no element wider than the viewport (`scrollWidth`). Run → FAIL where it fails.
- [ ] **Step 2:** Fix target sizes; tap pins tooltip (second tap elsewhere hides); sub-tab row is one horizontally scrolling chip row with the active chip `scrollIntoView({inline:"center"})`; focus-visible rings on chips, expanders, chart rows, popovers; charts' hint text says "dokunun" under `(hover:none)`.
- [ ] **Step 3:** Contrast check script (scratchpad Playwright): for text elements on `#/`, `#/oruntu?q=dil`, `#/kurum?s=takvim` in both themes compute contrast vs the nearest opaque background; all ≥ 4.5 (≥ 3 for ≥ 24px text). Fix tokens/usages that fail.
- [ ] **Step 4:** Rebuild; logic + smoke pass; final screenshot sweep (every section, 1280 light, 1280 dark, 390 light).
- [ ] **Step 5:** Commit `feat(site): mobile and accessibility pass`.
