# Çapraz Manşet 7.0 — site structure redesign

Date: 2026-11-05 · Status: approved in conversation, awaiting written-spec review

## 1. Purpose and success

**Purpose.** Report objectively how Turkish media cover the same events. The site tells the story by
*showing* how outlets reported an event and whether the differences form patterns; it does not tell the
reader which outlet is biased.

**Audience.** Both general readers and journalists/researchers, layered: a plain-language layer on top,
and every finding opens into a technical "Nasıl ölçtük" layer.

**Success criteria**
1. A first-time visitor understands within seconds, from the homepage alone, that the site shows the same
   event told differently across the spectrum (an interactive narrative map).
2. Every analysis has exactly one home. No finding is repeated on two pages (outlet profiles may *link to*
   or *quote the number of* a finding, never re-render its chart or explanation).
3. Every finding has a one-to-two sentence "Bu ne anlama geliyor" in plain Turkish.
4. AI-made content is visually marked within the site's existing look (same fonts, same colour tokens):
   an outlined "YZ" badge plus a dotted left rule. No new accent colour, no monospace body text.
5. The public site never shows the status label "bağlam gerekli"; each AI finding instead says in plain
   words what the AI noticed and why that is not conclusive.
6. **Priority rule (owner, 2026-11-05):** the Anlatı haritası graph and advanced, interactive analyses of
   the existing data always come first. Wherever a page could show a static table or an interactive view
   of the same data, it shows the interactive view (filter, hover, click-through, recolour) with the table
   behind "Nasıl ölçtük"; the narrative map is the first thing on the homepage and on every coded event
   page, and each Örüntüler page leads with its most interactive chart.

**Kept unchanged:** data, collection, pipeline analyses, 6.0 visual identity (Newsreader, IBM Plex Sans,
IBM Plex Mono for numbers only, left/right colours, yellow highlight for differing words), the artifact
delivery, the Yönetim review desk (owner-only reject/correct/undo on the shared `reviews` store; AI
results public until rejected), Benim.

## 2. Site map

Main menu: **Anlatı · Olaylar · Örüntüler · Kurumlar · Yöntem**
Header utilities: **Ara · Resmî ilan bul · Benim · theme**. Footer: **Yönetim** (owner).

| Route | Page | One job |
|---|---|---|
| `#/` and `#/anlati` | Anlatı (homepage) | Same event, different story: interactive narrative map |
| `#/olaylar` | Olaylar | Find any event (list, filters, search; topics are a filter) |
| `#/olay?e=` | Event page | The single complete view of one event |
| `#/oruntu?q=secim` | Kim neyi haber yapıyor? | Selection and blind spots |
| `#/oruntu?q=dil` | Nasıl anlatıyor? | Wording and framing (rule + AI) |
| `#/oruntu?q=anlati` | Kimi sorumlu tutuyor? | Narrative patterns across coded events |
| `#/oruntu?q=hiz` | Kim önce veriyor? | Timing and headline–lede gap |
| `#/kurumlar`, `#/kurum?s=`, `#/karsilastir` | Kurumlar | Outlet list, profile, two-outlet comparison |
| `#/yontem` | Yöntem | Method, Türkiye bağlamı, AI review, concept library, limits |
| `#/ilan` | Resmî ilan bul | Search official notices in the collection |
| `#/benim` | Benim | Personal follows and news balance (unchanged) |
| `#/yonetim` | Yönetim | Editor area incl. the AI review desk (unchanged) |

**Removed or merged.** Bulgular (Veriler/Yorumlar/İleri analiz/Hız), Çerçeveleme (Yapılar, Kütüphane,
Başlık çözümleyici, Üretim aşamaları, Türkiye bağlamı), Olaylar › Kör noktalar / Kapsama / Konular tabs,
the homepage "Öne çıkan olaylar" and "Kör noktalar" rails, version-comparison text (2.0→3.0, 5.0).
Their content is redistributed per §4; anything not listed there is deleted. The headline analyser
leaves the public menu (removed). Old routes redirect: `#/bulgular*` → `#/oruntu?q=secim`,
`#/yanlilik*` → `#/oruntu?q=dil`, `#/yanlilik?t=kutuphane` → `#/yontem?s=kavramlar`,
`#/olaylar?t=kor` → `#/oruntu?q=secim`.

## 3. Anlatı (homepage)

- **Event picker:** the selected week's narrative events ordered by divergence score S (Yöntem § 6.3),
  rejected AI items excluded. Default: latest week, top event. **Week switcher** over all coded weeks.
- **Map:** rows = outlets ordered by placement (left → right), each with the left/mid/right colour bar;
  columns = the event's focus dimensions; cells = pills, equal colour = equal choice; empty = "başlıkta yok".
- **Interaction:** click a column header → that dimension is "active": rows regroup by value and a legend
  lists each value with its outlet count; click an outlet → its headline expands under the row; hover/tap a
  pill → all outlets with the same value highlight.
- **Side text:** what happened / where they agree / where they differ (the event's coded `q`), YZ badge on
  AI-coded weeks.
- **"Nasıl okunur"** (3 lines) and one link: "Bu tek seferlik mi? → Kimi sorumlu tutuyor".
- **"Bu hafta"** strip: the three most-covered events of the latest week → their event pages.
- Reuses the existing pill matrix and flow components; no new chart libraries.

## 4. Örüntüler — four question pages

Every finding is one **finding block**:
1. claim sentence (neutral, one number);
2. one chart or table;
3. **Bu ne anlama geliyor** (1–2 sentences: what it does and does not show, no outlet verdicts);
4. **Nasıl ölçtük** (collapsed: rule, thresholds, n, link to the Yöntem section).
Each page ends with **Örnek olaylar** (3 events illustrating the page's patterns).

**4.1 Kim neyi haber yapıyor? (`q=secim`)**
- coverage split of events across the spectrum;
- blind spots: count, side, widest examples (normalised rule + binomial);
- agenda similarity between outlets (phi clustering, Mantel vs placement);
- topic mix by bloc (headline topic model);
- weekly blind-spot trend.

**4.2 Nasıl anlatıyor? (`q=dil`)**
- within-event score range (how differently the same event is worded);
- loaded-language density by bloc and by outlet;
- **top 20 framing devices**: rule-detected devices (headline counts) and AI-raised concepts (event counts)
  in one ranked table, AI rows with the YZ badge; row click opens the concept (definition, examples,
  events);
- differing words (marked words) examples;
- writing-style similarity vs placement (framing PCA; registry vs behaviour);
- **YZ block:** which blocs' headlines the AI review cited most and, in plain words, why it reads the
  wording as framing and why that is not proof (per-bloc rates; per-outlet rates live on outlet profiles).

**4.3 Kimi sorumlu tutuyor? (`q=anlati`)**
- across all coded narrative events: share of events where each dimension is a focus dimension;
- who is held responsible, by bloc (blame values × bloc);
- weekly trend, hand-coded and AI-coded weeks marked;
- link back to the map.

**4.4 Kim önce veriyor? (`q=hiz`)**
- first-to-report share and median lag by outlet (lead–lag);
- headline vs lede gap (hotter/cooler shares by outlet).

## 5. Event page (`#/olay?e=`)

Reading order:
1. title, date span, outlet count, coverage split bar, blind-spot status;
2. split card (far left vs far right, marked words) then all headlines (lede on demand);
3. narrative map (same component as §3) if the event is coded;
4. **Bilişsel inceleme [YZ]** (if reviewed), one entry per live concept:
   - **Ne fark etti:** concept name + one plain sentence + exact quotes with outlet names;
   - **Neden kesin değil:** one plain sentence (alternative explanation / missing context);
   - an owner correction replaces the AI text, marked "Editör notu";
   - no status label ("bağlam gerekli", "desteklendi") is shown; supported findings, if any ever exist,
     say so in the sentence ("iki inceleyici de destekledi");
5. timing (who first), lede gap, links to the outlets.

## 6. Kurumlar

List (placement, ownership, active, counts); profile = placement + ownership (supplied, unverified) +
the outlet's numbers from each Örüntüler page as one-line links (no re-rendered charts) + AI note
(share of its reviewed events whose headline the AI cited, with the YZ marker and the plain caveat) +
recent events; two-outlet comparison (existing six-axis rows and shared events).

## 7. Yöntem

Sections: Veri · Olay tespiti · Yüklü dil puanlayıcısı · Anlatı kodlaması · Bilişsel inceleme (YZ):
how it works, what it can and cannot prove, the editor review · Yapay zekâ ile üretilen içerik ·
**Türkiye bağlamı** (rewritten) · Kavram kütüphanesi (all 129 library entries incl. the 116 BiasGuard
concepts, searchable, with review counts) · Sınırlılıklar · Kaynaklar (former reading list, short).

**Türkiye bağlamı** — one block per adaptation, each: the problem, what we did, known limits:
Turkish case folding (İ/ı); suffix-aware word matching (apostrophe split, 5-letter stems); Turkish
stop-words incl. "son dakika", "flaş"; negation and modality (what the checklist shows the scorer still
misses); quote vs own voice; official notices separated from events; a right-heavy outlet set
(11 right / 4 left active) → side-normalised blind spots with binomial test and the half-window active
rule; supplied placements and ownership; 48-hour event window for sitemap collection; AI review on
Turkish input with an English catalog and Turkish explanations.

## 8. Resmî ilan bul (`#/ilan`)

Search box + filters (type: mahkeme / icra / kamu ihalesi / diğer, date range, outlet). Results: title,
outlet, date, link to the original, newest first; "this week" count; short explainer of what an official
notice is. Source: the existing notice classifier over collected headlines. Empty result → says the
collection does not have it and names ilan.gov.tr as text (no embed, no invented results).

## 9. AI presentation

- Marker: `.yz` block = dotted 2px left rule in `--line2`, regular site fonts and ink colours; heading
  carries an outlined pill badge "YZ" (`--ink2` border/text). Table rows: badge in the source column.
  The violet + mono styles from 7.0-v4 are removed.
- Public AI text per finding = two sentences (**Ne fark etti / Neden kesin değil**) generated once by an
  AI pass from the advocate and skeptic texts, stored in the data bundle (`BG.events[].explain`), editable
  via Yönetim corrections. Long reviewer texts remain only in Yönetim.
- Yöntem › Yapay zekâ ile üretilen içerik lists every AI-made part (review texts, explanations, AI-coded
  narrative weeks, catalog paraphrases, simulation scenarios, 7.0 code).

## 10. Build

- `site/js/app.js` keeps loader, data indexes and reused components (split card, pill matrix, charts,
  Benim, Yönetim). Removed pages are deleted from it.
- New/rewritten views in separate files assembled by `site.py` in order: `v7-core.js` (router, nav, YZ
  marker, finding block), `v7-anlati.js`, `v7-oruntu.js`, `v7-olay.js`, `v7-kurum.js`, `v7-yontem.js`,
  `v7-ilan.js`.
- Pipeline: one new step `biasguard.news explain` that writes `explain` for each live finding from agent
  outputs (same file-based agent pattern as the reviews), validated (two non-empty Turkish sentences, quotes
  must exist in the event text) and packed with `pack`.

## 11. Testing

- Python: unit tests for `explain` validation and packing.
- Browser smoke test (Playwright): every route at 1280px and 390px, light and dark; fails on console
  errors, horizontal scroll, or an empty finding block; screenshots reviewed before publishing.
- One functional check of the review store after publish (list `reviews`; non-owner write refused).

## 12. Out of scope

Coding the six older narrative weeks to 20 events; new data collection; changes to the scoring rules or
the BiasGuard engine; an API-key based reviewer.
