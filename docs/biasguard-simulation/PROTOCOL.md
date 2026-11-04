# Extended simulation protocol

This is a custom synthetic decision-making stress test of the previously delivered BiasGuard prototype. It is not a clinical study, population-level fairness audit, or representative real-world benchmark. The user explicitly requested a simulation; scenarios are fictional and all measured outputs come from actual executed model calls.

## Frozen system and independent test construction

The algorithm, prompts, and complete 116-entry operational catalog are copied into `snapshot/` before the new dataset is authored. `frozen_engine_manifest.json` records every file hash. No detection rules, prompts, labels, or scenarios will be tuned after model outputs are seen in this test. Improvements suggested by the results are recommendations for a later version, not changes to this run.

Thirteen independent scenario-family authors create new decision contexts without access to earlier pilot inputs or detector outputs. A separate annotation reviewer checks the scenario expectations against the frozen operational specifications before execution. The merged dataset and its expected labels are hashed and locked. These are AI-authored, AI-reviewed expectations, not independent human expert ground truth. Card-aware authorship and shared model-family behavior can make the test easier than real deployment.

Expected-label metadata never enters the detector request. Only the scenario's text, supplied context, and stakes level are submitted. Some identifiers used to analyze expected outcomes remain in local test records but are not model instructions.

## Scenario families and controlled variants

The planned dataset contains 52 scenarios: thirteen families with four variants each. Twelve families address complex decisions involving migration funding, emergency preparedness, fellowship selection, AI dispatch governance, screening allocation, research publication, insurance and safety budgets, incident review, supplier negotiation, community consultation, launch forecasts, and customer programs. The thirteenth examines useful training and memory effects that should not automatically become reasoning-error findings.

Each bias-oriented family has a multi-bias positive case, a matched rational case, an ambiguous case lacking decisive evidence, and an adversarial version of the positive case. The variants preserve meaningful constraints and plausible alternative explanations. The rational variant changes the justification rather than simply removing bias vocabulary. The adversarial variant changes presentation or adds explicitly quoted instruction strings without changing the endorsed reasoning to be assessed.

The training family checks context-only routing for benign effects. It is not counted as four ordinary positive bias cases. Some effects require comparative behavioral evidence, which is deliberately provided or withheld in the relevant variant.

## Primary execution

All 52 scenarios receive a first-attempt AI review in shortlist mode with `max_candidates=12`. The semantic selector considers compact specifications for all 116 entries, but only the selected subset is reviewed in depth. Unselected labels remain unassessed, not ruled out.

Use the same `gpt-6.1-sol` model as the prior pilot, confirmed present in the current live catalog, at the frozen medium reasoning effort. Provider calls retain the existing strict-schema requests, exact quotation checks, bounded transport retries, and fail-closed behavior. At most four scenario tasks are in flight. Response-format or evidence failures are not automatically retried, repaired, or silently converted to offline findings.

If a fatal credit, authentication, or model-availability error occurs, stop further unscheduled work, preserve completed and in-flight outcomes, and mark remaining tasks as not attempted. A failed or not-attempted analysis is not a successful negative case. Ordinary per-case schema failures remain visible in first-attempt completion counts.

## Auxiliary checks selected before results

Four additional exhaustive reviews use the full 116-entry catalog:

- `ai-dispatch--positive`: interacting AI-related mechanisms with documented behavioral context.
- `insurance-budget--rational`: justified risk management with bias-like vocabulary.
- `research-audit--ambiguous`: incomplete search and sampling evidence.
- `learning-program--positive`: benign learning effects and context-only classification.

For this catalog each exhaustive review can require twenty reviewer calls. A completed exhaustive task must report 116 completed assessments. An interrupted task reports its actual completed coverage, not planned coverage. More labels from exhaustive review are differences to inspect, not automatically correct improvements.

Four fresh shortlist repeats test the same exact inputs:

- `migration-board--positive`
- `recruiting-panel--rational`
- `emergency-response--adversarial`
- `supplier-negotiation--ambiguous`

Repeat tasks make new model calls. They do not reuse cached first-run outputs as evidence of consistency. Exact label-set agreement and target-status agreement are evaluated only for pairs where both analyses complete; ineligible pairs remain reported.

## Measures and interpretation

Completion rate is reported separately from detection behavior. For predeclared positive targets, report label-level recall, the number of scenarios capturing every intended target, partial captures, and missed targets. Keep execution failures separate from reviewer rejection, insufficient evidence, and shortlist omission. Report both completed-case and all-planned denominators so conditioning on success cannot hide failures.

On rational controls, count scenarios receiving any supported reasoning-error finding. On ambiguous cases, count focused forbidden labels that are supported without the required evidence and report whether the expected uncertain labels were actually selected and given uncertainty or disagreement status. A failure to select a label is not successful abstention on that label.

Known forbidden labels and unexpected extras are distinct. Extra overlapping labels on positive cases are not automatically scored as correct or as false positives; they are unadjudicated unless the pre-run annotations explicitly permit or forbid them. Context-only effects have their own routing measures. The training family should not receive reasoning-error findings simply because a useful effect is observed.

Inspect adversarial versus ordinary positive pairs for target retention and full-set changes. Inspect rational counterparts for removal of the original target findings. Report fresh-repeat label stability separately from target stability. Compare the four exhaustive runs with their corresponding shortlist runs, including completed coverage, added labels, removed labels, and interrupted analyses.

Recheck every published quotation's source field and offsets against the exact submitted text and context. This tests mechanical integrity, not whether a quoted sentence proves the proposed psychological mechanism. Record model-rejected quotations, condition downgrades, reviewer disagreement, and source attribution where available.

Report latency and logged token usage, with main and auxiliary calls distinguished. Catalog-price estimates, if included, are not billing statements. The scenarios in a family are related, so 52 inputs are not 52 independent samples. Per-entry sample sizes are small; a broad confidence or universal accuracy percentage would be misleading.

## Reproducibility

Deliver the locked dataset, annotations, frozen algorithm and catalog, run configuration, complete raw outputs, per-case metrics, pair comparisons, and runnable harness. Preserve this test separately from the earlier 28-case pilot. Do not overwrite the previous validation record or present a rerun on newly tuned rules as a held-out result.
