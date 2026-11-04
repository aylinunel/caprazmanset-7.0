# Extended Simulation Harness

`run_simulation.py` runs the fixed 52-case BiasGuard evaluation against **only** `extended_simulation/snapshot/biasguard`. It is designed for the locked authored dataset and does not generate cases, alter annotations, repair detector output, or use cached repeat results.

## Preconditions

- `dataset.json` must be a JSON array containing exactly 52 cases: 13 `family_id` values with one `positive`, `rational`, `ambiguous`, and `adversarial` case each.
- The runner validates the full annotation schema and every referenced card ID against the frozen 116-card snapshot before creating a provider client.
- The local `model_catalog.json` must contain the explicit model ID, with strict JSON-schema and OpenAI reasoning capabilities. The intended run model is `gpt-6.1-sol`.
- The frozen manifest and dataset bytes are hashed before and after a run. A changed snapshot or dataset causes a refusal/nonzero exit, while retaining already-written records for audit.

The package import path is force-prepended to `snapshot`, previously imported `biasguard` modules are evicted, and both the package and `BiasGuard` implementation paths are asserted to be under the snapshot. An editable installation cannot substitute for the frozen engine.

## Run commands

From `/home/ubuntu/biasguard`:

```bash
# No network/provider work: schema, model-catalog, frozen-manifest, and task-plan validation only.
python3 extended_simulation/run_simulation.py \
  --model gpt-6.1-sol \
  --dataset extended_simulation/dataset.json \
  --output extended_simulation/runs/extended_2026-10-28 \
  --phase all \
  --dry-run

# Full benchmark: 52 shortlist main tasks plus 4 independent repeats and 4 all-116 exhaustive tasks.
python3 extended_simulation/run_simulation.py \
  --model gpt-6.1-sol \
  --dataset extended_simulation/dataset.json \
  --output extended_simulation/runs/extended_2026-10-28 \
  --phase all \
  --workers 4

# Resume matching work only. It skips matching completed tasks and does NOT retry prior failures.
python3 extended_simulation/run_simulation.py \
  --model gpt-6.1-sol \
  --dataset extended_simulation/dataset.json \
  --output extended_simulation/runs/extended_2026-10-28 \
  --phase all \
  --workers 4 \
  --resume

# A retry is deliberate and must be explicitly requested with --resume.
python3 extended_simulation/run_simulation.py \
  --model gpt-6.1-sol \
  --dataset extended_simulation/dataset.json \
  --output extended_simulation/runs/extended_2026-10-28 \
  --phase all --workers 4 --resume --retry-failed
```

`--workers` is constrained to 1–4 (default 4). `--limit N` is an operator-testing control and limits the fixed phase order; it is not for the published run. There is no harness-wide 900-second deadline. Each provider call receives the engine’s configured 180-second timeout and at most two provider transport retries.

### Fixed tasks

- **Main:** `main__<case-id>` for every 52 case, bounded AI mode with `max_candidates=12`.
- **Repeat shortlist:** `repeat__migration-board--positive`, `repeat__recruiting-panel--rational`, `repeat__emergency-response--adversarial`, and `repeat__supplier-negotiation--ambiguous`. Each uses a new `BiasGuard`/provider path and the same source input, never a fabricated cache.
- **Exhaustive 116-card:** `exhaustive__ai-dispatch--positive`, `exhaustive__insurance-budget--rational`, `exhaustive__research-audit--ambiguous`, and `exhaustive__learning-program--positive`.

The auxiliary set is selected before any result exists. With `--phase all`, one exhaustive task starts near the beginning so all lengthy tasks are not deferred to the end.

### Queue and failure behavior

The queue submits at most four futures at a time; it does not enqueue all work upfront. A provider insufficent-credit, unsupported-model, or authentication fatal signal stops further unscheduled tasks. Already-running calls finish and are saved. Every remaining unscheduled task receives a `not_attempted` ledger record. Detector/provider/schema errors are captured as failed results without runner-level retries.

Only `text`, `context`, and `stakes` are supplied to `BiasGuard.analyze`; annotations, target IDs, rationales, expected statuses, and tags never cross the detector boundary.

## Output layout

For `--output RUN_DIR`:

```text
RUN_DIR/
├── run_metadata.json                 # model, hashes, manifest before/after, fixed task plan
├── dry_run_plan.json                 # only when --dry-run
├── task_results.jsonl                # append-only attempt ledger
├── summary_main.json                 # first-attempt counts, including failures/not-attempted
└── results/
    └── <task-key>/attempt-001/output.json
```

Each ledger record has the run identity (`model`, prompt hash, card hash, dataset hash, and task key), source text/context hashes, timing, raw-result path, detector/assessment counts, evidence-integrity results, and an explicit terminal state. `summary_main.json` intentionally reports first attempts and does not hide incomplete, failed, or not-attempted work.

Every final published quote from `supported_findings`, `uncertain_findings`, and `contextual_effects` is independently checked against the case’s supplied text/context. The harness records exact-quote and offset errors separately from the engine’s own `rejected_evidence` and verdict-downgrade counts. Exact matching validates location only; it does not establish semantic adequacy.

## Offline analysis

```bash
python3 extended_simulation/analyze_simulation.py \
  --dataset extended_simulation/dataset.json \
  --results extended_simulation/runs/extended_2026-10-28/task_results.jsonl \
  --output extended_simulation/analysis/extended_2026-10-28
```

The analyzer makes no model calls and writes:

- `metrics.json`: main completion over the fixed 52 denominator; per-kind breakdown; completed and all-first-attempt target micro recall with execution/schema failures separate; target-outcome reasons; evidence integrity; latency (mean/median/nearest-rank p95); and provider-reported token fields split between main and auxiliary tasks.
- `case_results.csv`: one row per benchmark case, including selected/supported/uncertain/contextual labels, offline lexical top-12 candidates, known forbidden-label violations, and unadjudicated extra labels.
- `per_entry.csv`: one row per required target with detected, selection miss, reviewer rejection, missing context, reviewer disagreement, schema failure, or execution-failure outcome.
- `paired_results.csv`: valid-pair-only positive→adversarial target retention/Jaccard and positive→rational target-removal comparisons. Missing/incomplete pairs are explicit.
- `auxiliary_comparison.json`: repeat status/label-set consistency and exhaustive-vs-shortlist assessed coverage/additional labels/discrepancies. Differences are descriptive, not automatic correctness findings.
- `errors.json`, `findings.json`, and (when Matplotlib is installed) `chart.png` showing completed counts against clear case denominators.

The analyzer treats only pre-labelled `forbidden_supported` (and rational-control unapproved supports) as violations. Other extra supported labels are reported as **unadjudicated**, not called false positives. It does not calculate global accuracy or real-world confidence. The dataset is AI-authored/reviewed rather than human gold; its 13 four-variant families are clustered, not independent samples.

## Tests (no live calls)

```bash
python3 extended_simulation/tests_harness.py
```

The mock-only suite covers annotation label isolation, forced frozen import, unknown-ID refusal, missing-result denominators, evidence-offset errors, timing statistics, resume/no-automatic-failure-retry behavior, fatal-queue stopping, and descriptive all-116 auxiliary comparison.
