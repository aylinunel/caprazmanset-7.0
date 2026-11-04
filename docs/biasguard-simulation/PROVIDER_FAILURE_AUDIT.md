# BiasGuard extended simulation: provider-failure audit

**Scope:** read-only review of the frozen integration and all 60 recorded task outputs for `extended_2026-10-28`. No model calls, searches, retries, or changes to the frozen engine, dataset, or result files were made. This audit assesses integration reliability, not detector accuracy.

**Verdict:** task-level fail-closed behavior was correct; provider diagnostics and run-level stopping need changes **in the next version only**. The records do **not** establish credit exhaustion, rate limiting, authentication failure, or an actual HTTP-200 error envelope.

## 1. Verified denominators

Source: all lines of the [task ledger](./runs/extended_2026-10-28/task_results.jsonl), cross-checked against each `result_file` and its `audit.reviewer_calls`.

| Task type | Recorded / attempted | Completed | Failed |
|---|---:|---:|---:|
| Main | 52 | 23 | 29 |
| Exhaustive | 4 | 1 | 3 |
| Repeat | 4 | 0 | 4 |
| **Total** | **60** | **24** | **36** |

All were attempt 1; none were `not_attempted`. **34 of the 36 failed tasks** recorded `provider returned no completion choice`: 27 main, 3 exhaustive, 4 repeat. The other two were one selector-schema failure and one `finish_reason=length` failure. Thus **34/36 describes failure composition**, while **34/60 describes affected attempted tasks**; total task failures are **36/60**.

There are **131 retained completion-call records: 95 completed and 36 failed**. The 34 no-choice call failures divide into selector 28, advocate 5, skeptic 1. These are application-level records, not a count of HTTP requests, SDK retries, or catalog requests. The [main summary](./runs/extended_2026-10-28/summary_main.json), lines 2–15, independently confirms 23 completed / 29 failed and no fatal queue stop.

## 2. Recorded ordering, latency, and call evidence

Ledger lines are **completion/record order**, not submission or individual-call start order. All times below are UTC on 2026-10-28. The [run metadata](./runs/extended_2026-10-28/run_metadata.json), lines 67–132, records fixed ordering and four workers; the early exhaustive task overlapped the main queue.

| Ledger line(s) | Task / evidence | Recorded call chain and task timing |
|---|---|---|
| 7 | [Main emergency-response adversarial](./runs/extended_2026-10-28/results/main__emergency-response--adversarial/attempt-001/output.json), lines 38–69 | `reviewer_calls[0]`: selector failed local schema validation despite `stop`, 1,349 content characters, and usage present. End 04:40:25.663640; elapsed 12.199 s. This is distinct from the later no-choice cluster. |
| 12 | [Main recruiting-panel adversarial](./runs/extended_2026-10-28/results/main__recruiting-panel--adversarial/attempt-001/output.json), lines 38–129 | `[0]` selector completed → `[1]` advocate completed → `[2]` skeptic failed `length`. End 04:44:23.847398; elapsed 149.996 s. Skeptic used 8,192 completion tokens, including 4,944 reasoning tokens, and retained 8,947 content characters. |
| 24, 26 | Exhaustive AI-dispatch positive; main insurance-budget positive | Both completed. Exhaustive: 20 completed review calls, 116 assessed cards, 881.937 s; end 04:51:14.118190. Insurance positive: three completed calls; end 04:51:49.616051. |
| 27 | [Main incident-review positive](./runs/extended_2026-10-28/results/main__incident-review--positive/attempt-001/output.json), lines 38–51 | First no-choice **task result recorded**: `[0]` selector failed; finish reason, content type/length, and usage all null. Start 04:51:49.621164; end 04:51:49.788762; elapsed 0.168 s. |
| 27–57 | 31 consecutive ledger records | All no-choice failures, with task elapsed times 0.140–0.234 s, median 0.156 s. These include 28 selector failures and three first-batch exhaustive advocate failures. |
| 58 | [Main insurance-budget rational](./runs/extended_2026-10-28/results/main__insurance-budget--rational/attempt-001/output.json), lines 38–112 | `[0]` selector completed → `[1]` advocate completed → `[2]` skeptic no-choice. Start 04:50:40.115834; end 04:51:55.895437; elapsed 75.780 s. |
| 59–60 | [Insurance ambiguous](./runs/extended_2026-10-28/results/main__insurance-budget--ambiguous/attempt-001/output.json), lines 38–81; [insurance adversarial](./runs/extended_2026-10-28/results/main__insurance-budget--adversarial/attempt-001/output.json), lines 38–81 | Each: `[0]` selector completed → `[1]` advocate no-choice. Starts 04:51:14.146557 / 04:51:20.195765; ends 04:52:06.010221 / 04:52:11.213747; elapsed 51.864 / 51.018 s. |

The 23 completed main tasks took 74.885–149.858 s, median 108.266 s. The sharp late shift to sub-second noncompletion is real, but the longer insurance failures include preceding successful work. **Individual-call timestamps are missing**, so the first recorded failure is not proof of the exact earliest provider-failure onset or of per-call latency.

Usage exists for 97/131 call records: 1,884,778 prompt tokens + 388,293 completion tokens = **2,273,071 recorded total tokens**. Completion tokens include 126,179 reported reasoning tokens; do not add them again. The 28 selector records with usage each report 36,497–36,770 prompt tokens. All 34 no-choice records have null usage: this is **unknown usage, not evidence of zero usage or billing**. Neither cumulative usage nor catalog pricing establishes available account balance or the failure cause.

## 3. Why the underlying cause can disappear, and why the queue continued

The exact local evidence chain is:

1. [Provider code](./snapshot/biasguard/providers.py), lines 410–417 / 342–348: SDK `create()` returns a response; `_response_content_or_error()` runs next.
2. Lines 284–287: a missing, empty, or non-list/tuple `choices` value becomes the same generic `ProviderCallError`. **No top-level provider error envelope is inspected first.** The record cannot distinguish these malformed shapes.
3. Lines 250–281: `_record_call()` preserves selected completion metadata and the generic failure, but not response error fields, HTTP status, or request ID.
4. [Engine code](./snapshot/biasguard/engine.py), lines 363–369 / 585–602 and 472–500: call metadata is copied, remaining review work is skipped, and `analysis_incomplete` is returned with `ai_review_failed` and `fail_closed=true`.
5. [Runner](./run_simulation.py), lines 50–54, 410–425, 531, 583–592: fatal detection searches surviving error strings for specific markers. “No completion choice” matches none; all 60 ledger records have `fatal_provider_signal=false`, so the queue keeps replenishing. **Thirty tasks started after line 27's failure ended.** There is no repeated-malformed-response circuit breaker.

**Can HTTP 200 with an error body follow this path? Yes, technically; not proven for this run.** The currently installed SDK defaults to non-strict response validation ([`_client.py`](/usr/local/lib/python3.12/dist-packages/openai/_client.py), line 214). Its [status handling](/usr/local/lib/python3.12/dist-packages/openai/_base_client.py), lines 1226–1258, raises for HTTP status errors; its [response construction](/usr/local/lib/python3.12/dist-packages/openai/_base_client.py), lines 751–787, otherwise uses loose construction. [`_models.py`](/usr/local/lib/python3.12/dist-packages/openai/_models.py), lines 270–306 and 685–697, retains extra fields without requiring a valid completion shape. A JSON error envelope can therefore survive as extra response data while `choices` is invalid/missing; BiasGuard then masks it with the generic choice error. This is not necessarily the SDK deleting the error. The SDK version is not recorded in run metadata, so installed-source inspection establishes a possible mechanism, not an exact historical transport replay.

## 4. Fail-closed assessment and logging gaps

**Correct:** all 36 failed outputs have `analysis_incomplete`, `fail_closed=true`, `completion_limited=true`, zero fully assessed cards, 116 unassessed cards, and empty supported/uncertain/contextual findings and adjudication. Completed advocate work remains audit-only; it is not published as a consensus. The [failed exhaustive output](./runs/extended_2026-10-28/results/exhaustive__insurance-budget--rational/attempt-001/output.json), lines 38–51 and 56–242, shows the failed first advocate and skipped skeptic/later batches. Empty findings and vacuously valid evidence-integrity checks are **not** successful negative assessments.

**Missing:** HTTP status, allowlisted error code/type, safe error message, request ID, retry count/history, per-call timing, response envelope shape, and SDK version. Catalog calls are outside completion-call recording (`providers.py`, lines 203–235). The mutable `last_call` is not cleared before pre-call validation, leaving a next-version risk of stale metadata after an early exception—not demonstrated here. Selector error strings are truncated to 300/500 characters (`providers.py`, lines 41–48; `engine.py`, lines 34–37); the recorded schema error loses its diagnostic tail and structured field path. “Raw output” is the engine result, not the original provider response body.

Run metadata records `integrity_ok=true` and matching before/after hashes. This audit also verified the current frozen manifest and dataset hash still match, and ledger input hashes match the referenced outputs.

## 5. Prioritized next-version recommendations — no changes to this run

1. **P0 — Classify provider errors before checking choices.** Normalize mapping/SDK-object envelopes; inspect top-level error fields and transport exceptions; preserve a typed, sanitized classification. Keep genuine empty-choice responses classified separately. Example order: `capture_transport → inspect_error_envelope → validate_choices → check_finish_reason → validate_JSON/schema`. Do not guess “credits” from null choices.
2. **P0 — Add a shared stop circuit breaker.** Stop new submissions immediately for recognized fatal provider conditions; pause/stop after a predeclared threshold of repeated malformed/no-choice responses even when the cause is unknown. Propagate the signal between roles/batches in already-running tasks; retain their completed work and explicit skipped/not-attempted records. Do not silently retry or alter the evaluation denominator.
3. **P1 — Capture robust, privacy-safe diagnostics.** Record role/batch/call ID, start/end/elapsed, SDK version, HTTP status/request ID, allowlisted error code/type/message, response shape, usage availability, and actual retries. Reset `last_call` at call entry and record catalog/pre-call failures separately. Store schema validator/path/type without dumping input-derived arrays. Never persist credentials, unrestricted headers, or unredacted bodies.
4. **P1 — Handle `length` explicitly.** Preserve the current fail-closed rejection, but label it output-budget exhaustion, distinct from transport/schema errors. The recorded skeptic exactly reached the configured 8,192-token cap (`providers.py`, lines 325–327); substantial reasoning usage consumed that budget. Evaluate smaller batches, concise output, or an explicitly justified larger budget only in a separately versioned run; do not salvage partial JSON or claim that a budget change is already validated.

**Test gap:** the [harness stop test](./tests_harness.py), lines 97–111, injects an already-true fatal flag with one worker; it does not test error-envelope extraction or four-worker degradation. [Provider mocks](/home/ubuntu/biasguard/tests/test_provider.py), lines 122–148, cover schema/length failures but not this error-envelope chain. Next-version offline tests should cover HTTP-200 error envelopes, empty/malformed choices, structured HTTP errors, redaction, repeated unknown failures, four-worker stopping, and no further role/batch calls after a shared stop signal. No tests were rerun in this audit.
