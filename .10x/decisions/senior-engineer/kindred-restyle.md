# Senior-engineer pre-push review — kindred-restyle

## Push of 63fd2b4, 0abfe81 (hero), 6fb0273 (spec) — requested by the user ("push the repo")
Reviewed with the task reviewer's findings (review-ab6d208..0abfe81) as input.
- Correctness: hero renders, tests pass (logic 11/11, smoke ok). Known open defects, being fixed in round 2 (not in this push):
  band knock-out text illegible; reduced-motion frame not t=1; fonts measured before Turkish glyph subsets load.
- Clarity/simplicity: dead hero branches remain in dmMake (to be removed in round 2).
- Performance: 30 fps cap and IntersectionObserver gate present.
- Security: no new inputs; canvas text comes from the site's own data, rendered via fillText (no HTML injection); hidden paragraph uses esc().
- Karpathy check: every changed line traces to the hero/restyle request; no unrelated edits. Spec is docs only.
Decision: push as requested, with the open findings above recorded; round 2 follows in the next push.

## Push of 4d876ad, 9865df6 (hero fix rounds 2–3)
- Correctness: band text legible (≥7 dot rows), reduced-motion still frame at t=1, Inter 700/800 + Turkish glyphs awaited, header band draws joined text once. Tests: logic 11/11, smoke ok.
- Simplicity: dead hero branches removed from dmMake (Karpathy: orphans our change created, removed).
- Note: this hero is about to be replaced by the Lumen-style fog hero (user request); the dot engine stays for header bands and feed cards.
Decision: push.

## Push of c456113 (UX Task 1: fog split-card hero, ticker removed)
- Correctness: clock constants/shader match the reference; queued clicks; reduced motion instant; IO gate + 30 fps; WebGL2 fallback. Tests: logic 11/11, smoke ok (new toggle + click checks). Task review: Approved.
- Simplicity/Karpathy: old LED hero code and ticker removed (orphans of this change); no unrelated edits.
- Performance/leaks: observers not disconnected on removal (minor, deferred; guarded by alive()).
- Security: headline text goes through esc()/markText(); no new inputs.
Decision: push.

## Push of ae6a8cf (UX Task 2: tokens, Inter, chrome)
- Correctness: tokens match spec in both themes; hero colours tokenised and mixed on --k/--k2. Tests: logic 11/11, smoke ok. Task review: Approved.
- Simplicity/Karpathy: one appended override block (house style: later rules win); dead warm rules left shadowed — deferred cleanup (Task 10) rather than a sweeping delete in this task.
- Security/performance: CSS + one class name; nothing new at runtime.
Decision: push.

## Push of b7329d5, bcb795d (UX Task 3: nav names, tabs, redirects)
- Correctness: redirect table unit-tested (logic 12/12); smoke ok incl. old routes and a topic-chip filter assertion; touch targets 44px.
- Simplicity/Karpathy: tabs merged by reusing existing renderers; dead code (v3noticeEventsPage, v3sub stub) noted for Task 10 cleanup rather than removed here.
- Security: search input goes to #/ara via the existing search renderer (escaped there).
Decision: push.

## Push of 836dde9, 986f824 (UX Task 4: splits feed, feed-card dot effect)
- Correctness: weeklySplits/whatDiffers unit-tested (logic 14/14); smoke covers feed, more-button hiding, zero-event state, hover effect. Taps always navigate (wide-audience ruling).
- Simplicity/Karpathy: old 10-card grid and its stats removed (replaced by the spec's feed); appeal button no longer nested inside card links (invalid HTML).
- Performance: effect runs only on hover/focus or once per card in view on touch; off under reduced motion.
Decision: push.

## Push of 86525c1, 70cdc81, 6635d55 (UX Task 5: finding block, glossary, tables)
- Correctness: logic 15/15 (glossTerms); smoke covers popover open by tap, Tab into link, Esc close + focus return, close on navigation.
- Accessibility: popover in DOM order after its term; focus management fixed; shadow token for dark mode.
- Simplicity/Karpathy: findingBlock backward compatible (old findings render without undefined); no unrelated edits.
Decision: push.
