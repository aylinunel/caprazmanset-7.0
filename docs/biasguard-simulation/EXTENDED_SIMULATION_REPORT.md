# BiasGuard extended simulation — results and reliability findings

**Execution date:** October 28, 2026. **Analysis completed:** November 4, 2026.  
**System:** frozen BiasGuard prototype, 116 sourced specifications, `gpt-6.1-sol`, medium reasoning effort.  
**Bottom line:** the completed analyses show promising pattern recognition, but the run **does not pass an operational-readiness check**. Only **23 of 52 primary analyses completed (44.2%)**. Reliability, incomplete domain coverage, and a field-sensitive evidence gate prevent a general accuracy claim.

## 1. What was actually tested

The custom dataset contains **52 new fictional scenarios in 13 matched families**: twelve complex decision contexts and a useful-learning-effects family. Thirty bias/error concepts and three context-only concepts are represented in the annotations. Each family includes a positive, rational, ambiguous, and adversarial variant; learning variants are treated as benign effects, not ordinary bias-positive cases. There are 62 predeclared supported-target assignments and five contextual-effect assignments.

The contexts cover legacy migrations, emergency budgets, fellowship selection, AI freight dispatch, screening allocation, research audits, safety insurance, incident reviews, supplier negotiations, community consultations, launch forecasting, customer programs, and staff training. Records contain competing evidence, constraints, stakeholder reasoning, chronology, and fictional quantitative data. No exact scenario text was reused from the earlier 28-case pilot.

Thirteen separate authors created the families, and a separate reviewer checked annotations before detection. **These were AI-authored and AI-reviewed expectations—not independent human ground truth.** Their alignment with the frozen specifications can make performance look better than performance on unstructured real decisions. Four variants within a family are also correlated.

All 52 primary tasks used bounded shortlist review. Four predeclared tasks additionally used exhaustive all-116 review, and four inputs received fresh repeat attempts: **60 total attempted tasks**. Expected labels, annotation rationales, and tags were not submitted to the detector. The snapshot and dataset hashes remained unchanged throughout execution. No failed attempts have been overwritten or retried in this report.

## 2. Execution reliability

| Primary scenario type | Planned | Completed | Incomplete |
|---|---:|---:|---:|
| Adversarial positive | 12 | 4 | 8 |
| Missing decisive evidence | 12 | 6 | 6 |
| Useful learning / heuristic effects | 4 | 0 | 4 |
| Complex multi-bias | 12 | 7 | 5 |
| Matched rational | 12 | 6 | 6 |
| **Total primary** | **52** | **23** | **29** |

![Actual primary completion counts](analysis/extended_2026-10-28/chart.png)

Across the whole task set, **24 of 60 tasks completed**: 23 primary tasks and one exhaustive task. All four repeat tasks and the other three exhaustive tasks failed. The recorded causes across the 36 incomplete tasks were:

- **34:** `provider returned no completion choice`.
- **1:** a selector response violated the required schema.
- **1:** reviewer output ended with `finish_reason=length`.

The no-choice failures clustered later in the run, with many returning very quickly. The stored audit does not retain an upstream response envelope or enough information to identify whether the underlying cause was provider availability, account limits, authentication, rate limiting, or another upstream error. **The cause is therefore unestablished.** It would be misleading to call these 34 cases psychological-detection mistakes, successful abstentions, or confirmed credit exhaustion.

The engine correctly returned `analysis_incomplete` and withheld final findings. However, the runner did not halt the repeated no-choice failures: its fatal-error classifier never received a recognized fatal message, and it lacked a general repeated-failure circuit breaker. A process exit code of zero indicated that the queue finished and hashes matched—not that every analysis succeeded. The first-attempt ledger is the completion source of truth.

## 3. Detection behavior in completed analyses

| Measure | Actual result | Proper interpretation |
|---|---:|---|
| Required labels captured in completed positive cases | **24/26 (92.3%)** | Conditional label recall on successfully executed authored scenarios |
| Positive cases capturing every required label | **9/11** | Nine complete captures; two partial captures |
| Required labels delivered over all planned target assignments | **24/62 (38.7%)** | End-to-end yield, including failed execution—not model-only recall |
| Completed rational controls with any supported error finding | **0/6** | No supported findings on these six controls; six more did not complete |
| Completed ambiguous cases with a forbidden supported target | **0/6** | No focused unsupported assertion on these six cases |
| Expected uncertain labels explicitly covered in completed ambiguous cases | **14/15** | One expected ambiguity label was not returned as uncertain |
| Benign-learning primary cases completed | **0/4** | Context-only routing could not be evaluated in this run |

Only **17 of the 30 intended bias/error concepts** had completed positive or adversarial cases. Entire later scenario families failed execution. Consequently, the 92.3% conditional figure must not be generalized to all 30 targeted concepts, all 116 catalog entries, or real-world decisions.

There were **nine additional supported-label occurrences** outside the predeclared targets: three belief-perseverance occurrences, four illusion-of-validity occurrences, one base-rate-fallacy occurrence, and one messenger-effect occurrence. They are **unadjudicated extras**, not automatically correct overlapping mechanisms or automatically false positives. Exact-label precision is not established.

### Concrete evidence-gate mismatch: delegation creep

Both completed AI-dispatch positive variants supported automation bias but returned delegation creep as uncertain. The normalized reviewer outcomes show that the two reviewers originally marked delegation creep supported with every necessary condition satisfied. The local policy then downgraded the verdicts because **all cited evidence came from the `text` field rather than the separate `context` field**.

The supplied record described an actual Monday-to-Wednesday expansion from copying check-ins to scoring loads and releasing tenders, an executed departure instruction, and no recorded scope review or effective cancel control. Those are behavioral and longitudinal observations, but the hard gate required at least one verified quotation from the context field. The supplied context did not help unless a reviewer cited it.

This is a **field-provenance dependency**, not simply an absence of behavioral information and not a failure to shortlist the label. It explains the two target misses in the completed-case metric. A future version should distinguish evidence type from the form field that carries it. The present run preserves the original uncertain verdicts; it does not retroactively count them as detections or move quotes between fields.

### Concrete ambiguity-coverage gap

For `research-audit--ambiguous`, look-elsewhere effect was returned as uncertain, while the expected survivorship uncertainty was not. An uncertain scenario-level result is not proof that every relevant label was assessed or expressed as uncertain. This gap remains visible rather than being counted as complete abstention coverage.

## 4. Matched pairs, adversarial wording, and repeats

Four positive/adversarial pairs completed on both sides: migration-board, AI-dispatch, screening-allocation, and research-audit. **All four retained the same supported-label sets** (Jaccard 1.0). Across these pairs, adversarial variants captured 8 of 9 required targets; the one missing target was delegation creep, which was already missing from its ordinary counterpart. This is limited evidence of presentation stability, not broad injection resistance. Two other adversarial cases failed at schema/length boundaries, and six further adversarial cases did not produce a usable completion.

Six positive/rational pairs completed. The rational counterparts contained none of the 15 original required targets, and produced no supported error findings. This indicates sensitivity to the changed justification in these matched examples rather than merely triggering on topic vocabulary.

**Repeat consistency is unmeasurable:** every fresh repeat attempt failed. Zero eligible repeat pairs must not be displayed as either 0% consistency or perfect consistency of empty output sets.

## 5. Exhaustive all-116 review

The AI-dispatch positive scenario completed **116 of 116 assessments** through twenty reviewer calls, compared with 10 assessed entries in its shortlist run. It took approximately **14.7 minutes**. Its supported labels were:

- Automation bias.
- Accountability diffusion in AI.
- Illusion of validity.
- Law of the instrument.

The latter three were not supported in the corresponding shortlist output. They are coverage-and-review differences, not independent proof that exhaustive mode is more accurate. The predeclared delegation-creep target still remained uncertain because of the evidence-field gate. The other three exhaustive attempts completed **zero** assessments and yielded no valid negative or benign-effect evaluation.

This confirms that the live all-116 execution path can work for at least one complex input. It does not validate 116 independent detectors, and its latency makes exhaustive review a separate operating mode rather than a free improvement over shortlisting.

## 6. Evidence integrity, latency, and logged usage

All **481 published evidence quotations** in the primary outputs matched their declared source fields and exact offsets. Four primary reviewer verdicts were downgraded by local gates. No rejected-quotation entries were recorded in the primary results. These checks establish quotation location and mechanical consistency, **not the semantic correctness of the mechanism labels**.

The median completed primary analysis took **108.3 seconds**. Median latency over all 52 primary attempts was 51.4 seconds, but many no-choice failures terminated almost immediately; that mixed median is not a meaningful successful-service response time.

Logged main-task usage was **1,625,540 input tokens and 290,532 completion tokens**. Auxiliary tasks logged **259,238 input tokens and 97,761 completion tokens**. Failed responses without usage metadata, transport retries, and authoring work are not fully represented. These totals are not a billing statement.

The original engine suite passed 153 tests, and the simulation harness passed nine mock-only checks. These software checks did not prevent the upstream no-choice failure pattern; they validate different properties.

## 7. Recommended next-version priorities

1. **Diagnose provider envelopes before reading completion choices.** Record safe structured error code/type/status when available, preserve missing-choice diagnostics, and detect fatal provider conditions instead of collapsing them into a generic parser error.
2. **Add a circuit breaker for repeated no-choice or equivalent provider-wide failures.** Stop new work after a bounded consecutive failure threshold, retain in-flight results, and mark remaining tasks not attempted. Never treat those tasks as negative detections.
3. **Make behavioral-evidence gating independent of input form fields.** Validate explicitly provided comparative or longitudinal observations from either field. Do not loosen the requirement for actual behavioral evidence.
4. **Address long reviewer responses.** Use smaller review batches or suitable output budgets, while still failing closed on truncation. Do not arbitrarily extract partial JSON or invent missing assessments.
5. **Adjudicate overlapping labels with independent human reviewers.** Review the nine extras and the three added exhaustive labels, and separately test useful effects after service reliability is restored.
6. **Repeat the remaining frozen cases as a separately labeled recovery run.** Preserve all original attempts and report recovery counts separately. Do not tune the algorithm on these cases and then present the result as untouched hold-out validation.

No production changes or fresh model calls were made when this saved run was resumed for analysis. The recommendation is **not production-ready on this evidence**: retain human oversight and the fail-closed design, fix integration reliability and the evidence-field mismatch, then conduct a separately reported recovery and expert validation.

## 8. Artifacts and reproduction

The complete archive includes the 52-case machine-readable dataset, readable scenarios, pre-run protocol and annotation notes, frozen engine/catalog, first-attempt raw outputs, model metadata, per-case and per-target CSVs, paired comparisons, auxiliary results, and runnable test/analysis scripts. `HARNESS.md` documents exact commands. Only text/context/stakes reach the detector. No credentials are included.

Raw model outputs and dataset hashes are preserved. Archive export changes result-file locations to relative paths for portability; it does not change labels, annotations, or output content. A provider-specific model ID is historical execution metadata, not a guarantee of current availability. Any new live run must inspect its provider's live model catalog first.
