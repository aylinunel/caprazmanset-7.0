# BiasGuard extended simulation — read me first

Start with `EXTENDED_SIMULATION_REPORT.md`. This archive contains the complete custom 52-scenario dataset, 60 first-attempt task outputs, frozen algorithm/catalog, transparent annotations, and measured results.

**The run is not a passing production-validation result.** Twenty-three of 52 primary analyses completed. Among those completed inputs, 24 of 26 intended target labels were supported; none of six completed rational controls was flagged. Thirty-four of 36 total incomplete tasks recorded a generic missing-completion error whose upstream cause is unknown. One all-116 exhaustive review completed. All repeat attempts failed, so repeat consistency is unmeasurable. Do not describe empty incomplete outputs as successful negative controls.

The dataset and algorithm were locked before model evaluation. No detection rule, expected label, or scenario was tuned after seeing results. The resumed work analyzed saved outputs without additional model calls. Changes to offline analysis scripts only improve reporting and path portability.

## Inspect without network calls

`dataset.json` is the machine-readable scenario array; `SCENARIOS.md` is the readable version with annotations clearly separate from model input. `PROTOCOL.md` records the planned evaluation. `ANNOTATION_NOTES.md` records pre-run annotation changes and final metadata correction.

`analysis/extended_2026-10-28/metrics.json` and CSV files preserve all primary results. `auxiliary_comparison.json` describes repeats and exhaustive comparisons. `failure_details.json` preserves recorded errors. `runs/extended_2026-10-28/results/` holds every complete or incomplete output. The task ledger is first-attempt data, not a filtered list of successes.

The archived ledger uses result paths relative to its run folder. This export changes file locations only; outputs, labels, hashes, and task outcomes are unchanged. Historical absolute paths in other audit metadata identify the original execution location and are not credentials.

## Reproduce offline analysis

Use Python 3.11 or later. Install the frozen package's local dependencies as appropriate:

```bash
python -m pip install jsonschema matplotlib
python analyze_simulation.py \
  --dataset dataset.json \
  --results runs/extended_2026-10-28/task_results.jsonl \
  --output analysis/reproduced
python tests_harness.py
```

These commands perform no model calls. The analyzer imports only `snapshot/biasguard`, not an editable installation elsewhere. The frozen manifest verifies package content. Do not edit snapshot files if you intend to reproduce this version.

## New live runs

`HARNESS.md` documents the runner. New live execution needs an authorized model provider, credentials in the environment, and a newly verified live model catalog. The recorded model ID is historical metadata, not a guarantee that the provider still offers it. Never use the saved catalog as proof of present availability.

Use a new output folder for a recovery run and retain the original first-attempt results. Do not rerun merely to remove inconvenient failures or tune on the dataset and call it untouched validation. Provider error logging and a repeated-failure circuit breaker should be fixed in a separate version before a large recovery batch.

These synthetic scenarios and labels were AI-authored and AI-reviewed, not independently human-validated. Quote/offset checks prove mechanical source consistency, not psychological truth or fairness. This is a review aid, not a diagnostic or automatic decision system.
