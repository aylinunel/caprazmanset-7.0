# Çapraz Manşet 7.0 — UX rethink for a wide audience (design spec)

Status: approved section by section in conversation on 2026-11-05; this document is the written spec for review.
Supersedes: nothing; extends `2026-11-05-capraz-7-structure-design.md` and absorbs Tasks 2–3 of `docs/superpowers/plans/2026-11-05-kindred-style.md` (site-wide Kindred style and dot-matrix charts), which are paused until this spec's plan is written.

## 1. Intent

**Goal.** Make the site easy to use for a wide audience without losing the dynamic, data-rich character it now has (dot-matrix hero, G6 networks, interactive charts).

**Audience (user's choice: "all three, layered").**
- Everyday news readers — first layer, phone-first, no statistics knowledge.
- Students and teachers — second layer: "why it matters", examples, plain caveats.
- Journalists and researchers — third layer: exact numbers, intervals, method, data tables.

**First thing a visitor should be able to do:** see this week's biggest splits (events the outlets told most differently).

**Constraints the user set.**
- Keep the current design as the base; restyle with the Kindred look (Inter, #f7f7f5 off-white, #111 ink, black pills, dot-matrix), keeping the data colours (left red, right blue, middle grey, amber evidence, yellow differing-word highlight).
- Keep the five sections; rename and declutter rather than restructure.
- Layering is done per block ("go deeper" expanders), with no site-wide reading-level switch.
- Ask before completely changing something; old links must keep working.

**Success criteria.**
- A first-time phone visitor sees a real split (two outlets' headlines, differing words marked) within the first screen, and the week's other big splits within one scroll.
- Every finding's first sentence contains no statistical term (no φ, r, p, ρ, CI, PCA, Mantel, binom) and names who it is about.
- Every chart has a keyboard/screen-reader equivalent (data table) and works by tap.
- No horizontal page scroll at 390px; text contrast ≥ 4.5:1 in light and dark.
- All old URLs (sections, tabs, `?s=` anchors) land on the right new place.
- Smoke and logic tests pass; no console errors.

## 2. Visual style (from the Kindred brief, as adapted)

- Tokens, light: paper #f7f7f5, surface #ffffff, raise #fcfcfb, sunk #efefec, line #e5e5e1, line2 #cfcfca, ink #111111, ink2 #3a3a3a, muted #7b7b7b, mist #9a9a9a. Dark: paper #0f0f0f, surface #171717, raise #1c1c1c, sunk #0a0a0a, line #262626, line2 #3a3a3a, ink #f2f2f0, ink2 #d4d4d0, muted #9a9a9a, mist #7b7b7b. Data colours unchanged (light left #E11D48 / right #2563EB / mid #79839A; dark left #E8556B / right #4586EE / mid #C9C2B2; amber, highlight, sequential ramps unchanged).
- Type: Inter 400/500/600/700/800 for everything except numbers; IBM Plex Mono for numbers, eyebrows and labels. Headlines Inter 500, tight tracking (−.03em h1, −.02em h2/h3). No paper grain.
- Buttons: black pills (#111 / white; inverted in dark), hover lifts 1px. The primary call to action carries the rainbow underglow.
- Chips: transparent with a line2 border; pressed = black pill.
- Dark ink bands (page headers, ticker, home blind-spot band) are removed or neutralised: page headers become light with a dot-matrix band; any remaining ink surface is neutral #111.
- Dot matrix: the feed cards' hover effect (§3.1.2), a quiet drifting band behind every page header showing the section name, and the distribution and line charts drawn as LED dot rows (pitch 6px, faint pinpoint wall, quantised dot sizes).

## 3. Pages

### 3.1 Homepage
1. **Hero — fog split card (Lumen Roof technique, user-approved 2026-11-05).** No photos (the reference's image host is blocked and off-topic). Layers, bottom to top:
   - *Sky* (still): two large blurred generated colour fields — warm red-grey (left outlet) and cool blue-grey (right outlet); the right field's opacity is `--k` (0 = left, 1 = right).
   - *Moving layer* (`translate3d(0,var(--sink),0)` only): the split card at hero scale, two sets of which only `.is-on` is visible — left set: label "<OUTLET> · SOL <lean>", red rail, full headline with its differing words highlighted (yellow `--hl`); right set: same for the right outlet with a blue rail. Shared by both: the tilted black band "ORTAK OLAN · <shared words>" across the card's lower edge (as in the existing split card).
   - *Tilt-shift*: `backdrop-filter` blur masked `linear-gradient(transparent 70%,#000 92%)`.
   - *Fog*: the reference WebGL2 fragment shader unchanged in form (5-octave value-noise fbm with the stated rotations, domain warp, rest fog = low + side·.2 + wisps·.18, surge front `1.02−S·.68`, haze `S·(.3+.46d)`, ≤ 960px canvas, premultiplied alpha), colours mixed on K between a warm red-grey palette (left) and a cool blue-grey palette (right), darker variants in dark theme; no porch glow. Without WebGL2, a CSS gradient fog.
   - *UI*: two-tone headline (grey "Aynı olay," / ink "farklı manşet."), the subline; bottom dock: glass toggle (`role="group"`, `aria-label="Hangi kurumun başlığı"`) with two `<button aria-pressed>` — "<Outlet> · Sol" / small "yerleşim <n>" and "<Outlet> · Sağ" / "yerleşim <n>", crossfading highlight (`--on` = 1−k / k); under it the caption "Ortak olan: <shared words>" and the link "Bu haftanın ayrışmalarını gör ↓" (scrolls to the feed).
   - *Switch*: one rAF clock, the reference's exact constants — SINK 240 ms, RISE 820 ms, DEPTH .27 (sink smoothstep, swap at the deepest point, rise `(1−x)^3.4`), surge `smooth(0,SINK·.92,d)·(1−smooth(SINK+70,SINK+RISE·.92,d))`, UI dip `smooth(30,190,d)·(1−smooth(330,720,d))`, k on `smooth(120,520,d)`, k2 on `smooth(340,760,d)`; all colours (sky, fog, rail, label, toggle) are `color-mix` on `--k`; clicks during an animation are queued; reduced motion switches instantly; the canvas stops off-screen and is capped at 30 fps; opens on the left outlet. Event and pair: the week's biggest split (same rule as the feed's first item).
   - *Phones (≤ 820px)*: the reference's phone rules — card full width, headline `clamp(34px,10.4vw,56px)`, toggle full width ≤ 440px and 74px tall.
   - The earlier LED-billboard hero is removed; the dot engine stays for page-header bands and the feed-card effect.
2. **"Bu hafta en farklı anlatılan olaylar"** — 6 split cards. Selection: events whose first headline falls in the last 7 days of the data window, covered by at least one left- and one right-placed outlet, at least 6 outlets, ranked by headline load range (`e.p`) then outlet count; the hero's event is excluded. Card: event title (plain), the default pair's two headlines with differing words marked (left above right), one plain "what differs" line, "N kurum verdi", the whole card links to the event page; on hover or tap the card's highlighted differing words crackle into dots and re-form (dot-matrix effect; runs only while active; off under reduced motion). "What differs" line rules, first match wins: narrative-coded event with differing blame → "Sorumlu tutulan farklı"; range ≥ 40 → "Birinde belirgin biçimde daha sert bir dil var"; range ≥ 20 → "Birinde daha yüklü bir dil var"; otherwise → "Aynı olay, farklı sözcükler". Below: "Daha fazla göster" (+6) and "Tüm olaylar →".
3. **"Çapraz Manşet nasıl çalışır"** — three short steps (Karşılaştır → Fark et → Ölç), one sentence each. Replaces the 10-card function grid.
4. **"Daha derine in"** — five compact links, one per section, each with its plain subtitle (§4).
5. **Gündem ağı** — the existing G6 agenda network, titled "Kim kiminle aynı haberleri seçiyor?".
6. The existing example split card block below the hero is removed (the hero and feed replace it).

**Ticker** — removed from every page.

### 3.2 Event page (`#/olay?e=`)
1. Header: breadcrumb "Olaylar › <title>", title, one plain line "N kurum verdi · a sol, b merkez, c sağ · <first> – <last>", coverage bar, blind-spot badge in plain words ("Sol kurumların çoğu bu olayı vermedi" / "Sağ kurumların çoğu …").
2. "Kısaca": coded summary (Ne oldu / Ortak nokta / Ayrışan nokta, YZ badge if agent-coded) or the generated line "Kurumların çoğu '<shared words>' dedi; en farklı başlık <outlet>'dan."
3. "En farklı iki başlık": split card for the default pair; outlet pickers below as "Başka iki kurumu karşılaştır".
4. "Bütün başlıklar": list with Hepsi/Sol/Merkez/Sağ tabs, default sort by placement; lede toggle kept.
5. "Kim önce verdi": the G6 publication timeline plus plain timing sentences.
6. Collapsed rows: "Anlatı ayrıntısı" (narrative table/map, coded events only), "Yapay zekâ ne fark etti? (YZ)" (cognitive review).
7. "Veren kurumlar": outlet links with lean dots.

### 3.3 Kurumlar
- **Kurumlar tab:** "Bir kurum seç" picker — outlet chips grouped Sol / Merkez / Sağ / Yerleşimsiz with lean dots and a type-to-filter box; then the overview findings (average loaded language with intervals; framing structures by bloc) as finding blocks (§5); Liste / Harita switch for the full table or the existing map.
- **Outlet page (`#/kurum?s=`):**
  1. Header: breadcrumb, name, placement chip with glossary popover ("Kayıt defterindeki yerleşim; doğrulanmamış"), one-line ownership note, headline count.
  2. "Kısaca": three generated sentences — coverage (events and share), loaded language vs own bloc (higher / about the same / lower: ±1 point bands), the two most similar outlets by agenda φ.
  3. "Son ayrışan başlıkları": the outlet's five most recent events (≥ 5 outlets) where its headline's load differs most from an outlet on the opposite side; compact split cards (this outlet vs that outlet) linking to the event.
  4. Finding blocks: Gündem komşuları (G6 ego network), Yüklü dil (dot vs own bloc), Yapı parmak izi (log lollipop around 1×), İlk veren payı.
  5. Collapsed rows: "Kayıt ve sahiplik" (six-axis profile, ownership, trust survey), "Veri toplama" (daily volume chart).
  6. Button "Başka bir kurumla karşılaştır →" opening Karşılaştır with this outlet preselected.
- **Karşılaştır:** two grouped-chip pickers; result = Kısaca ("İki kurumun gündemi %X örtüşüyor; …"), shared events as split cards, findings side by side.
- **Kayıt ve güven:** the registry and trust tabs merged into one page.

### 3.4 Örüntüler
Four question tabs unchanged in name and order; every finding converted to the finding block (§5).

### 3.5 Nasıl çalışır (was Yöntem)
One page with an on-page contents list and anchored sections: Yöntem, Türkiye bağlamı, Sözlük (new), Kapsama (moved from Olaylar), Sınırlar. The Sözlük is the single source for the glossary popovers.

### 3.6 Olaylar
Tabs: Tüm olaylar (list + search + filters; topics become filter chips), Kör noktalar, Resmî ilanlar (the notice finder, moved from the header).

## 4. Navigation

| Section | Name | Subtitle |
|---|---|---|
| /olaylar | Olaylar | Bütün olaylar, arama ve kör noktalar |
| /anlati | Anlatı haritası | Kurumlar bir olayı nasıl çerçeveledi |
| /oruntu | Örüntüler | Haberlerde tekrar eden farklar |
| /kurumlar | Kurumlar | Kim nasıl yazıyor, yan yana |
| /yontem | Nasıl çalışır | Yöntem, sözlük ve sınırlar |

- Logo → homepage. Desktop: visible search field "Olay ya da kurum ara"; "Benim" black pill; theme toggle. Phone: logo, search icon, Benim, menu button; the menu is a full-screen list of sections with subtitles, theme toggle at its foot.
- Subtitles appear in the phone menu, as the desktop link `title`, and under each page title.
- Sub-tabs on phone: one horizontally scrolling chip row with the active chip scrolled into view.
- Every page header: section name (eyebrow), subtitle, title; detail pages add a breadcrumb.
- **Redirects** (old → new): `/kurumlar?t=genel|liste|siralama` → Kurumlar tab; `?t=karsilastir` and `/karsilastir` → Karşılaştır; `?t=kayit|guven` → Kayıt ve güven; `/harita` → Kurumlar with Harita view; `/olaylar?t=konular` → Tüm olaylar with the topic filter open; `?t=kapsama` → Nasıl çalışır#kapsama; `/ilan` and `/olaylar?t=ilan` → Olaylar › Resmî ilanlar; `/yontem?s=<x>` → Nasıl çalışır#<x>; existing `/yanlilik`, `/bulgular` redirects keep working.

## 5. The finding block (Örüntüler, Kurumlar, outlet pages)

1. **Plain claim** — one sentence, ≤ ~25 words, rounded whole-number percentages, names the outlets/blocs, states only what was observed, no statistical terms.
2. **Visual** — the existing interactive chart or G6 network, unchanged in data and interaction, with one "Nasıl okunur" caption line under it ("dokunun" on touch devices, "gelin" with a pointer).
3. **"Neden önemli?"** expander — meaning and what it does not mean, in plain language (today's "Bu ne anlama geliyor", rewritten), ending with "Bir örnek olay →" where available.
4. **"Nasıl ölçtük?"** expander — the exact statistics removed from the claim, unit and method notes, a "Tabloyu göster" data table of the chart, link to the Nasıl çalışır section.
- Glossary popovers on remaining terms (kör nokta, yerleşim, yüklü dil, çerçeve, φ where it appears in tables): dotted underline; tap/hover/focus shows one line + "Sözlük →"; Esc closes.
- YZ badge and dotted rule on AI-made content unchanged; finding order unchanged.

## 6. Mobile, accessibility, motion, performance

- Phone-first at 390px; touch targets ≥ 44px; chart tap pins its tooltip until the next tap elsewhere; wide tables and charts scroll inside their own box.
- Every chart has its data table; every canvas has a text alternative; colour never carries meaning alone (lean also written; differing words also marked).
- Full keyboard reach with visible focus; hover behaviours also on focus/arrow keys.
- Reduced motion: still dot-matrix frames, no chart entrance animations.
- Motion budget: continuous motion only in the hero and the page-header bands (both stop off-screen); charts animate only on first view and in response to the reader; expanders slide, popovers fade; no decorative motion.
- Performance: G6 loads only on pages with a network; canvases ≤ 30 fps; expander contents render on first open.

## 7. Out of scope

- Changing data, analyses, numbers or the pipeline (only how they are presented and worded).
- New analyses beyond the generated "Kısaca" sentences, the weekly split feed and the outlet "Son ayrışan başlıkları" list (all computed from existing data).
- A guided first-visit tour; a site-wide reading-level switch.
- The admin area (`/yonetim`) beyond inheriting the new tokens.

## 8. Testing

- Unit (logic.test.cjs): weekly split-feed selection and the "what differs" rules; outlet "Kısaca" bands; redirect table (every old route maps to a new one).
- Smoke (smoke.cjs) at 1280 and 390, light and dark, over the new and redirected routes: no console errors, no horizontal scroll; first `.v7-find` claim contains none of the banned statistical terms; every chart has a "Tabloyu göster" table; ticker absent.
- Visual checks by screenshot of: homepage (first screen and feed), an event page, an outlet page, each Örüntüler tab, Nasıl çalışır — light, dark and phone.
