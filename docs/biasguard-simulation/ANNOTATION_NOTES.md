# Pre-run Annotation Notes

## Scope and assembly

This pre-run assembly used only the 13 supplied author-family JSON files and the frozen `cards.json` specification. No detector was run, no prior-pilot material was read, and no engine material was edited. `dataset.json` is a JSON array in the exact supplied family order, with each family ordered `positive`, `rational`, `ambiguous`, and `adversarial`.

## Validation summary

- **52 cases** across **13 families**; each family has exactly the four required variants.
- Case IDs are unique and follow `family_id--variant`; family and frozen target IDs are valid lowercase hyphenated slugs.
- **33 frozen target IDs** are represented. Kind counts: `{"adversarial_positive": 13, "ambiguous_context": 13, "mixed_positive": 13, "rational_control": 13}`.
- The longest composed case input (`text` + `context`) is **2,523 characters** (`consumer-program--adversarial`), below the 20,000-character per-case input ceiling.
- Every `annotation_rationale.evidence_quotes` string was exact-matched against that case's `text` or `context`.
- Input fields (`title`, `text`, `context`, and `stakes`) were scanned for frozen target IDs and expectation-field tokens; none were found. Label metadata therefore is not leaked into the model-facing scenario input.
- Each bias-positive case has at least two gold targets. Each supplied gold target was retained only where the record states the target-specific behavior, decision, comparison, or consequence required by its frozen card. No `acceptable_additional` label was added merely because targets overlap conceptually.
- Behavioral-policy and organizational cases retain concrete contextual behavioral evidence (for example, an adopted decision, recorded reason, changed workflow, allocation, selection, or review outcome) rather than relying on identities, tone, or outcomes alone.

## Annotation changes and pre-run resolutions

One concrete annotation correction was made during assembly. `launch-forecast--positive` and `launch-forecast--adversarial` originally expected both `spacing-effect` and `levels-of-processing-effect` as contextual. Their 12-versus-12 launch-rep comparison changes both calendar spacing and encoding activity at once, so it does not independently establish either frozen effect under reasonably comparable conditions. The scenario text is preserved as background, but those two contextual expectations were removed. Independently controlled contextual coverage remains in the learning-program family.

Other pre-run resolutions are deliberate:

1. `expected_supported` remains empty for every rational and ambiguous variant; rational examples retain evidence-backed controls, and ambiguous examples retain only unresolved targets.
2. Effect-context-only cards (`spacing-effect`, `levels-of-processing-effect`, and `take-the-best-heuristic`) are never gold-supported. Where a described comparison satisfies the frozen effect conditions, it is `expected_contextual`; where a learning comparison is incomplete, it remains `expected_uncertain`. This preserves “contextual only” for learning effects without falsely asserting an observed effect from incomplete records.
3. Potentially overlapping labels were retained only when their independent necessary conditions are stated. For example, availability versus salience, optimism versus planning versus confidence calibration, and hindsight versus outcome versus attribution each have separate direct evidence and decision links. No overlapping target was promoted from contextual/background material to gold.
4. Clearly rejected adversarial strings, reordered chronology, and irrelevant attachments remain in the original scenarios as robustness context only; their surrounding text identifies the operative signed/adopted record. They are not a separate source of gold evidence.

## Expected coverage

| Expectation bucket | Target assignments | Intended role |
|---|---:|---|
| `expected_supported` | 62 | Explicit, defensible bias/error patterns in positive and adversarial-positive records only |
| `expected_contextual` | 5 | Observed learning/heuristic context; never a bias-error gold label |
| `expected_uncertain` | 33 | Deliberately incomplete records lacking one or more necessary conditions |
| `forbidden_supported` | 66 | Negative controls that must not be labeled supported; may accompany an uncertain/contextual status |
| `acceptable_additional` | 0 | None; no permissive overlap labels are licensed |

All 13 families retain their named coverage. The learning family supplies separately controlled contextual learning-effect coverage; the launch-training detail is not treated as an independently established effect.

## Remaining ambiguities and caveats

- The ambiguous variants intentionally omit causal links, comparators, provenance, or outcome/action records. They are designed for evidence insufficiency, not negative proof that a pattern did not occur.
- Some positive patterns share a narrative setting or related cues. Their assigned labels depend only on separately quoted necessary-condition evidence; other plausible readings remain caveats rather than gold labels.
- “Synthetic,” “fictional,” and adversarial-test-data text describe scenario construction, not real people, institutions, customers, patients, or operational records. The screening scenario is not medical advice.
- This is an AI-authored and AI-reviewed evaluation set, **not human-validated gold**. It is a frozen-specification-aligned pre-run benchmark and should receive independent expert review before consequential deployment, reporting, or claims of detector validity.

## Manifest linkage

Dataset SHA-256: `fcd922d8c9390097e6a2339583bf2c8cdcc4eb01f84bec874ffe380d98bd5780`. The companion `dataset_manifest.json` records this hash, 52 cases, 13 families, all target IDs, kind counts, and empty `malformed`, `missingfiles`, and `failures` arrays.

## Final pre-execution metadata correction

The four learning-program variants are tagged `benign_effect`, not ordinary bias-positive/control kinds. Only analysis metadata changed; detector text, context and expected labels are unchanged. This correction occurred before any detector run. The final locked dataset SHA-256 is `2be0b8856def7c02f803e74b7d3e861de773267eb54ab3a1811a92bcde0515d8`. Final kind counts: {"mixed_positive": 12, "rational_control": 12, "ambiguous_context": 12, "adversarial_positive": 12, "benign_effect": 4}.
