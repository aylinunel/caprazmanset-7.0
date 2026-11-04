"""Core evidence-bound cognitive-bias review engine."""
from __future__ import annotations

from copy import deepcopy
from hashlib import sha256
import json
import re
from typing import Any

from .catalog import card_hash, coverage, load_cards, load_source_index, rank_candidates, validate_cards
from .providers import PROMPTS_VERSION, OpenAIReviewer, ProviderCallError, ProviderConfigurationError
from .schemas import ReviewerSchemaError, validate_reviewer_structure

_MAX_INPUT_CHARS = 20_000
_DIRECT_REVIEW_LIMIT = 12
_EXHAUSTIVE_BATCH_SIZE = 12
_ROLES = ("advocate", "skeptic")
_PRIORITY = {
    "low": "routine human review",
    "medium": "standard human review",
    "high": "priority human review",
}
_SECRETISH = re.compile(r"(?i)(sk-[a-z0-9_-]+|bearer\s+[a-z0-9._-]+|api[_ -]?key\s*[:=]\s*\S+)")


class InputRejectedError(ValueError):
    """Input is not safe/within the bounded API contract."""


def _sha(value: str) -> str:
    return sha256(value.encode("utf-8")).hexdigest()


def _safe_message(error: Exception | str) -> str:
    text = str(error).replace("\n", " ")[:500]
    return _SECRETISH.sub("[redacted]", text)


def _all_offsets(haystack: str, needle: str) -> list[int]:
    """Return every (including overlapping) occurrence of an exact quote."""
    offsets: list[int] = []
    start = 0
    while True:
        location = haystack.find(needle, start)
        if location < 0:
            return offsets
        offsets.append(location)
        start = location + 1


def _copy_call_metadata(reviewer: Any) -> dict[str, Any] | None:
    value = getattr(reviewer, "last_call", None)
    if not isinstance(value, dict):
        return None
    try:
        return json.loads(json.dumps(value, ensure_ascii=False, default=str))
    except (TypeError, ValueError):  # pragma: no cover - defensive provider compatibility
        return {"note": "provider call metadata was not serializable"}


class BiasGuard:
    """Review text against local operationalized cognitive-bias cards.

    Offline mode performs only local BM25 candidate retrieval. AI mode directly reviews
    every card in catalogs of 12 or fewer. Larger catalogs receive an untrusted semantic
    shortlist plus a BM25 floor, unless ``exhaustive=True`` explicitly requests all-card
    review in bounded batches. The result always exposes unassessed catalog coverage.
    """

    def __init__(
        self,
        cards: list[dict[str, Any]] | None = None,
        reviewer: Any | None = None,
        *,
        model: str | None = None,
        timeout_seconds: int = 90,
        max_retries: int = 2,
        provider_capabilities: dict[str, Any] | None = None,
    ) -> None:
        self.cards = validate_cards(cards) if cards is not None else load_cards()
        self.source_index = load_source_index()
        self.reviewer = reviewer
        self.model = model
        self.timeout_seconds = timeout_seconds
        self.max_retries = max_retries
        self.provider_capabilities = provider_capabilities
        self._card_by_id = {card["id"]: card for card in self.cards}
        self._card_hash = card_hash(self.cards)
        self._coverage = coverage(self.cards, self.source_index)

    def _validate_input(self, text: str, context: str, stakes: str, mode: str, max_candidates: int, exhaustive: bool) -> None:
        if not isinstance(text, str) or not text.strip():
            raise InputRejectedError("text must be a non-empty string")
        if not isinstance(context, str):
            raise InputRejectedError("context must be a string")
        if len(text) + len(context) > _MAX_INPUT_CHARS:
            raise InputRejectedError(f"text plus context exceeds the {_MAX_INPUT_CHARS}-character limit; input was not truncated")
        if stakes not in _PRIORITY:
            raise InputRejectedError("stakes must be low, medium, or high")
        if mode not in {"offline", "ai"}:
            raise InputRejectedError("mode must be offline or ai")
        if isinstance(max_candidates, bool) or not isinstance(max_candidates, int) or not 4 <= max_candidates <= 30:
            raise InputRejectedError("max_candidates must be an integer from 4 through 30")
        if not isinstance(exhaustive, bool):
            raise InputRejectedError("exhaustive must be a boolean")
        if exhaustive and mode != "ai":
            raise InputRejectedError("exhaustive review is available only in ai mode; offline mode is retrieval only")

    def _base_output(self, text: str, context: str, stakes: str, candidates: list[dict[str, Any]], max_candidates: int) -> dict[str, Any]:
        return {
            "supported_findings": [],
            "uncertain_findings": [],
            "contextual_effects": [],
            "candidates": candidates,
            "candidate_ids": [candidate["id"] for candidate in candidates],
            "catalog_card_count": len(self.cards),
            "selected_card_count": 0,
            "assessed_card_count": 0,
            "unassessed_card_count": len(self.cards),
            "retrieval_limited": True,
            "completion_limited": False,
            "selection": None,
            "batch_progress": [],
            "coverage": deepcopy(self._coverage),
            "limitations": [
                "This is a cognitive-bias reasoning review aid, not a diagnosis, a demographic model-fairness assessment, or an inference of intent or protected traits.",
                "Candidate retrieval and reviewer verdicts are not probabilities, confidence scores, or composite bias scores.",
                "No supported pattern, no candidate, a suppressed card, or an unassessed card never means bias-free; missing context and taxonomy coverage can matter.",
                "BiasGuard does not rewrite decisions or take actions automatically. Human review remains responsible for any decision.",
                "Catalog entries are local research operationalizations and should not be represented as independently validated by BiasGuard.",
            ],
            "privacy_notes": "Output can include exact quotations from submitted text and context. Treat the result as sensitive input-derived data; BiasGuard stores no persistent service state.",
            "audit": {
                "text_sha256": _sha(text),
                "context_sha256": _sha(context),
                "card_hash_sha256": self._card_hash,
                "prompts_version": PROMPTS_VERSION,
                "stakes": stakes,
                "max_candidates": max_candidates,
                "input_characters": {"text": len(text), "context": len(context), "total": len(text) + len(context)},
            },
        }

    def _input_rejected(self, text: Any, context: Any, stakes: Any, max_candidates: Any, error: Exception) -> dict[str, Any]:
        text_value = text if isinstance(text, str) else ""
        context_value = context if isinstance(context, str) else ""
        safe_limit = max_candidates if isinstance(max_candidates, int) and not isinstance(max_candidates, bool) else 12
        result = self._base_output(text_value, context_value, str(stakes), [], safe_limit)
        result.update({
            "status": "input_rejected",
            "error": {"code": "invalid_input", "message": _safe_message(error)},
            "adjudication": [],
            "reviewer_outcomes": [],
            "rejected_evidence": [],
            "selection": None,
        })
        return result

    def _reviewer(self) -> Any:
        if self.reviewer is None:
            self.reviewer = OpenAIReviewer(
                self.model,
                timeout_seconds=self.timeout_seconds,
                max_retries=self.max_retries,
                provider_capabilities=self.provider_capabilities,
            )
        if not callable(getattr(self.reviewer, "review", None)):
            raise ProviderConfigurationError("reviewer must expose review(text, context, cards, role)")
        return self.reviewer

    def _provider_info(self, reviewer: Any | None) -> dict[str, Any]:
        if reviewer is None:
            return {"provider": None, "model": self.model, "catalog_validated": False}
        info_method = getattr(reviewer, "provider_info", None)
        if callable(info_method):
            try:
                info = info_method()
                if isinstance(info, dict):
                    return json.loads(json.dumps(info, ensure_ascii=False, default=str))
            except Exception:  # pragma: no cover - provider metadata must not hide review result
                pass
        return {"provider": type(reviewer).__name__, "model": getattr(reviewer, "model", self.model), "catalog_validated": False}

    def _normalize_review(
        self,
        raw: Any,
        role: str,
        text: str,
        context: str,
        review_cards: list[dict[str, Any]],
    ) -> tuple[dict[str, Any], list[dict[str, Any]]]:
        if isinstance(raw, str):
            try:
                raw = json.loads(raw)
            except json.JSONDecodeError as exc:
                raise ReviewerSchemaError("reviewer returned a non-JSON string") from exc
        cards_by_id = {card["id"]: card for card in review_cards}
        card_ids = [card["id"] for card in review_cards]
        validate_reviewer_structure(raw, card_ids, role)
        rejected_evidence: list[dict[str, Any]] = []
        normalized_assessments: list[dict[str, Any]] = []
        for assessment in raw["assessments"]:
            card = cards_by_id[assessment["card_id"]]
            verified_evidence: list[dict[str, Any]] = []
            evidence_valid: dict[int, bool] = {}
            for evidence_index, evidence in enumerate(assessment["evidence"]):
                quote = evidence["quote"]
                source = evidence["source"]
                source_text = text if source == "text" else context
                reason: str | None = None
                if not quote.strip():
                    reason = "quote is empty or whitespace"
                elif len(re.sub(r"\s+", "", quote)) < 8:
                    reason = "quote has fewer than eight non-whitespace characters"
                else:
                    starts = _all_offsets(source_text, quote)
                    if not starts:
                        reason = f"quote is not an exact contiguous quotation in declared {source} field"
                if reason:
                    evidence_valid[evidence_index] = False
                    rejected_evidence.append({
                        "role": role,
                        "card_id": assessment["card_id"],
                        "evidence_index": evidence_index,
                        "source": source,
                        "quote": quote,
                        "reason": reason,
                    })
                    continue
                ends = [start + len(quote) for start in starts]
                evidence_valid[evidence_index] = True
                verified_evidence.append({
                    "evidence_index": evidence_index,
                    "kind": evidence["kind"],
                    "source": source,
                    "quote": quote,
                    "start_offsets": starts,
                    "end_offsets": ends,
                    "repeated": len(starts) > 1,
                })

            expected_count = len(card["necessary_conditions"])
            by_condition: dict[int, dict[str, Any]] = {}
            condition_problems: list[str] = []
            for condition in assessment["necessary_conditions"]:
                index = condition["condition_index"]
                if index >= expected_count:
                    condition_problems.append(f"condition_index {index} is outside this card's necessary conditions")
                    continue
                if index in by_condition:
                    condition_problems.append(f"condition_index {index} is duplicated")
                    continue
                by_condition[index] = condition
            missing_indices = [index for index in range(expected_count) if index not in by_condition]
            if missing_indices:
                condition_problems.append("missing condition assessments for indices " + ", ".join(map(str, missing_indices)))

            support_problems = list(condition_problems)
            for index in range(expected_count):
                condition = by_condition.get(index)
                if condition is None:
                    continue
                evidence_indices = condition["evidence_indices"]
                in_range = [item for item in evidence_indices if item < len(assessment["evidence"])]
                if len(in_range) != len(evidence_indices):
                    support_problems.append(f"condition {index} references an out-of-range evidence index")
                if condition["status"] == "satisfied":
                    if not in_range:
                        support_problems.append(f"satisfied condition {index} has no evidence reference")
                    elif not any(evidence_valid.get(item, False) for item in in_range):
                        support_problems.append(f"satisfied condition {index} has no valid exact quote")
                elif assessment["verdict"] == "supported":
                    support_problems.append(f"supported verdict has necessary condition {index} marked {condition['status']}")

            if assessment["verdict"] == "supported" and card.get("review_policy", "bias_error_review") == "requires_behavioral_evidence":
                satisfied_evidence_indices = [
                    evidence_index
                    for condition in by_condition.values()
                    if condition["status"] == "satisfied"
                    for evidence_index in condition["evidence_indices"]
                    if evidence_index < len(assessment["evidence"])
                ]
                # 7.0: a verified comparative or longitudinal observation counts from either field;
                # the requirement for behavioral evidence itself is unchanged.
                has_behavioral_evidence = any(
                    evidence_valid.get(evidence_index, False)
                    and assessment["evidence"][evidence_index]["kind"] == "behavioral"
                    for evidence_index in satisfied_evidence_indices
                )
                if not has_behavioral_evidence:
                    support_problems.append(
                        "requires_behavioral_evidence policy needs a verified comparative or longitudinal (behavioral) quote; generic one-off text alone cannot publish a bias-error finding"
                    )

            verdict = assessment["verdict"]
            validation_reasons: list[str] = []
            if verdict == "supported" and support_problems:
                verdict = "uncertain"
                validation_reasons = sorted(set(support_problems))
            elif condition_problems:
                validation_reasons = sorted(set(condition_problems))

            normalized_assessments.append({
                "card_id": assessment["card_id"],
                "verdict": verdict,
                "original_verdict": assessment["verdict"],
                "necessary_conditions": assessment["necessary_conditions"],
                "verified_evidence": verified_evidence,
                "mechanism": assessment["mechanism"],
                "alternative_explanation": assessment["alternative_explanation"],
                "missing_context": assessment["missing_context"],
                "validation_reasons": validation_reasons,
            })
        return {"role": role, "assessments": normalized_assessments}, rejected_evidence

    def _validate_selection(self, raw: Any, max_candidates: int) -> dict[str, Any]:
        """Validate an injected/provider semantic selection with a closed field contract."""
        if not isinstance(raw, dict) or set(raw) != {"candidate_ids", "selection_uncertainty", "selection_note"}:
            raise ReviewerSchemaError("semantic selector must return only candidate_ids, selection_uncertainty, and selection_note")
        ids = raw["candidate_ids"]
        uncertainty = raw["selection_uncertainty"]
        note = raw["selection_note"]
        if not isinstance(ids, list) or len(ids) > max_candidates or not all(isinstance(item, str) for item in ids):
            raise ReviewerSchemaError("semantic selector candidate_ids must be a string array within max_candidates")
        if len(ids) != len(set(ids)) or any(item not in self._card_by_id for item in ids):
            raise ReviewerSchemaError("semantic selector returned duplicate or unknown card id")
        if not isinstance(uncertainty, list) or not all(isinstance(item, str) for item in uncertainty) or not isinstance(note, str):
            raise ReviewerSchemaError("semantic selector has invalid uncertainty or note fields")
        return {"candidate_ids": ids, "selection_uncertainty": uncertainty, "selection_note": note}

    def _select_cards(
        self,
        reviewer: Any,
        text: str,
        context: str,
        max_candidates: int,
        exhaustive: bool,
        bm25_candidates: list[dict[str, Any]],
        calls: list[dict[str, Any]],
    ) -> tuple[list[dict[str, Any]], dict[str, Any]]:
        """Choose review scope without treating selection as a finding."""
        bm25_seed_ids = [candidate["id"] for candidate in bm25_candidates[:min(6, max_candidates)]]
        if exhaustive:
            return self.cards, {
                "strategy": "exhaustive_batched_review",
                "selected_card_ids": [card["id"] for card in self.cards],
                "semantic_candidate_ids": [],
                "semantic_selection_uncertainty": [],
                "selection_note": "Explicit exhaustive mode reviews all operationalized cards in batches of at most 12 per reviewer.",
                "bm25_seed_ids": bm25_seed_ids,
                "retrieval_limited": False,
            }
        if len(self.cards) <= _DIRECT_REVIEW_LIMIT:
            return self.cards, {
                "strategy": "direct_full_catalog_review",
                "selected_card_ids": [card["id"] for card in self.cards],
                "semantic_candidate_ids": [],
                "semantic_selection_uncertainty": [],
                "selection_note": "Catalog is at or below the direct-review threshold; every card is reviewed.",
                "bm25_seed_ids": bm25_seed_ids,
                "retrieval_limited": False,
            }
        selector = getattr(reviewer, "select", None)
        if not callable(selector):
            raise ProviderConfigurationError("catalog exceeds 12 cards: reviewer must expose select(text, context, cards, max_candidates), or use exhaustive=True")
        try:
            raw_selection = selector(text, context, self.cards, max_candidates)
        except Exception:
            call = _copy_call_metadata(reviewer)
            if call is not None:
                calls.append(call)
            raise
        call = _copy_call_metadata(reviewer)
        if call is not None:
            calls.append(call)
        selection = self._validate_selection(raw_selection, max_candidates)
        selected_ids: list[str] = []
        for card_id in [*selection["candidate_ids"], *bm25_seed_ids]:
            if card_id not in selected_ids and len(selected_ids) < max_candidates:
                selected_ids.append(card_id)
        # A selector can legitimately be uncertain/empty; BM25 may also have no lexical hit.
        # In that case, use deterministic catalog order only to honor a nonzero bounded review.
        if not selected_ids:
            selected_ids = [card["id"] for card in self.cards[:max_candidates]]
            selection["selection_uncertainty"].append("No semantic or lexical candidate was returned; deterministic first-card fallback is a review scope, not evidence.")
        selected_cards = [self._card_by_id[card_id] for card_id in selected_ids]
        return selected_cards, {
            "strategy": "semantic_plus_bm25_bounded_review",
            "selected_card_ids": selected_ids,
            "semantic_candidate_ids": selection["candidate_ids"],
            "semantic_selection_uncertainty": selection["selection_uncertainty"],
            "selection_note": selection["selection_note"],
            "bm25_seed_ids": bm25_seed_ids,
            "retrieval_limited": len(selected_cards) < len(self.cards),
        }

    def _merge_evidence(self, assessments: list[dict[str, Any]]) -> list[dict[str, Any]]:
        merged: dict[tuple[str, str], dict[str, Any]] = {}
        for assessment in assessments:
            for evidence in assessment["verified_evidence"]:
                key = (evidence["source"], evidence["quote"])
                if key not in merged:
                    merged[key] = {**deepcopy(evidence), "reviewer_roles": []}
                merged[key]["reviewer_roles"].append(assessment["role"])
        for evidence in merged.values():
            evidence["reviewer_roles"] = sorted(set(evidence["reviewer_roles"]))
        return list(merged.values())

    def _finding(self, card: dict[str, Any], status: str, advocate: dict[str, Any], skeptic: dict[str, Any], stakes: str) -> dict[str, Any]:
        evidence_sources = [{**advocate, "role": "advocate"}, {**skeptic, "role": "skeptic"}]
        review_policy = card.get("review_policy", "bias_error_review")
        return {
            "id": card["id"],
            "name": card["name"],
            "status": status,
            "entry_type": card.get("entry_type", "bias"),
            "review_policy": review_policy,
            "not_necessarily_an_error": review_policy == "effect_context_only",
            "source_url": card["source_url"],
            "source_accessed": card["source_accessed"],
            "provenance": card["provenance"],
            "definition": card["definition"],
            "evidence": self._merge_evidence(evidence_sources),
            "mechanisms": [{"role": "advocate", "text": advocate["mechanism"]}, {"role": "skeptic", "text": skeptic["mechanism"]}],
            "alternative_explanations": [
                {"role": "advocate", "text": advocate["alternative_explanation"]},
                {"role": "skeptic", "text": skeptic["alternative_explanation"]},
            ],
            "missing_context": sorted(set(advocate["missing_context"] + skeptic["missing_context"])),
            "mitigations": card["mitigations"],
            "questions": card["questions"],
            "limitations": card["limitations"],
            "action_review_priority": _PRIORITY[stakes],
        }

    def _outcome_summary(self, normalized: dict[str, Any], batch_index: int) -> dict[str, Any]:
        return {
            "role": normalized["role"],
            "batch_index": batch_index,
            "valid": True,
            "assessments": [
                {
                    "card_id": item["card_id"],
                    "verdict": item["verdict"],
                    "original_verdict": item["original_verdict"],
                    "validation_reasons": item["validation_reasons"],
                    "verified_evidence": item["verified_evidence"],
                    "necessary_conditions": item["necessary_conditions"],
                    "mechanism": item["mechanism"],
                    "alternative_explanation": item["alternative_explanation"],
                    "missing_context": item["missing_context"],
                }
                for item in normalized["assessments"]
            ],
        }

    @staticmethod
    def _fully_assessed_card_ids(outcomes: list[dict[str, Any]]) -> set[str]:
        """Return cards completed by both normalized reviewer roles."""
        by_role: dict[str, set[str]] = {role: set() for role in _ROLES}
        for outcome in outcomes:
            role = outcome.get("role")
            if role not in by_role or outcome.get("valid") is not True:
                continue
            assessments = outcome.get("assessments")
            if not isinstance(assessments, list):
                continue
            by_role[role].update(
                item["card_id"]
                for item in assessments
                if isinstance(item, dict) and isinstance(item.get("card_id"), str)
            )
        return by_role["advocate"] & by_role["skeptic"]

    def _analysis_incomplete(
        self,
        base: dict[str, Any],
        error: Exception,
        reviewer: Any | None,
        outcomes: list[dict[str, Any]],
        rejected_evidence: list[dict[str, Any]],
        calls: list[dict[str, Any]],
        batch_progress: list[dict[str, Any]],
    ) -> dict[str, Any]:
        assessed_card_count = len(self._fully_assessed_card_ids(outcomes))
        base.update({
            "status": "analysis_incomplete",
            "error": {"code": "ai_review_failed", "message": _safe_message(error)},
            "assessed_card_count": assessed_card_count,
            "unassessed_card_count": len(self.cards) - assessed_card_count,
            "completion_limited": True,
            "adjudication": [],
            "reviewer_outcomes": outcomes,
            "rejected_evidence": rejected_evidence,
            "batch_progress": batch_progress,
        })
        base["audit"].update({
            "provider": self._provider_info(reviewer),
            "reviewer_calls": calls,
            "fail_closed": True,
            "note": "AI review did not complete. BiasGuard did not silently substitute offline retrieval for an AI review.",
        })
        return base

    def analyze(
        self,
        text: str,
        context: str = "",
        stakes: str = "medium",
        mode: str = "offline",
        max_candidates: int = 12,
        exhaustive: bool = False,
    ) -> dict[str, Any]:
        """Return a JSON-serializable retrieval result or a fail-closed AI review."""
        try:
            self._validate_input(text, context, stakes, mode, max_candidates, exhaustive)
        except InputRejectedError as exc:
            return self._input_rejected(text, context, stakes, max_candidates, exc)

        bm25_candidates = rank_candidates(self.cards, text, context, limit=max_candidates)
        base = self._base_output(text, context, stakes, bm25_candidates, max_candidates)
        if mode == "offline":
            base.update({
                "status": "offline_candidates_only",
                "candidate_ids": [candidate["id"] for candidate in bm25_candidates],
                "assessed_card_count": 0,
                "unassessed_card_count": len(self.cards),
                "retrieval_limited": len(bm25_candidates) < len(self.cards),
                "selection": {
                    "strategy": "offline_bm25_only",
                    "selected_card_ids": [candidate["id"] for candidate in bm25_candidates],
                    "semantic_candidate_ids": [],
                    "semantic_selection_uncertainty": ["Offline mode does not make a semantic selection or a finding."],
                    "selection_note": "Local BM25 retrieval only; source-index-only entries are not detectors.",
                    "bm25_seed_ids": [candidate["id"] for candidate in bm25_candidates[:min(6, max_candidates)]],
                    "retrieval_limited": len(bm25_candidates) < len(self.cards),
                },
                "adjudication": [],
                "reviewer_outcomes": [],
                "rejected_evidence": [],
                "batch_progress": [],
                "offline_notice": "Offline mode performs local candidate retrieval only. It makes no bias finding, and no candidate/supported pattern never means bias-free.",
            })
            base["audit"].update({"provider": None, "reviewer_calls": [], "mode": "offline"})
            return base

        reviewer: Any | None = None
        outcomes: list[dict[str, Any]] = []
        rejected_evidence: list[dict[str, Any]] = []
        calls: list[dict[str, Any]] = []
        batch_progress: list[dict[str, Any]] = []
        normalized_items: dict[str, list[dict[str, Any]]] = {role: [] for role in _ROLES}
        try:
            reviewer = self._reviewer()
            selected_cards, selection = self._select_cards(reviewer, text, context, max_candidates, exhaustive, bm25_candidates, calls)
            base.update({
                "selection": selection,
                "candidate_ids": selection["selected_card_ids"],
                "selected_card_count": len(selected_cards),
                "assessed_card_count": 0,
                "unassessed_card_count": len(self.cards),
                "retrieval_limited": selection["retrieval_limited"],
                "completion_limited": False,
            })
            batches = [selected_cards[index:index + _EXHAUSTIVE_BATCH_SIZE] for index in range(0, len(selected_cards), _EXHAUSTIVE_BATCH_SIZE)] if exhaustive else [selected_cards]
            for batch_index, batch_cards in enumerate(batches):
                progress = {
                    "batch_index": batch_index,
                    "card_ids": [card["id"] for card in batch_cards],
                    "advocate": "pending",
                    "skeptic": "pending",
                }
                batch_progress.append(progress)
                for role in _ROLES:
                    call_recorded = False
                    try:
                        # Reviewers see original source fields and this same batch only, never the other review.
                        raw = reviewer.review(text, context, batch_cards, role)
                        call = _copy_call_metadata(reviewer)
                        if call is not None:
                            calls.append(call)
                            call_recorded = True
                        normalized, rejected = self._normalize_review(raw, role, text, context, batch_cards)
                        normalized_items[role].extend(normalized["assessments"])
                        rejected_evidence.extend(rejected)
                        outcomes.append(self._outcome_summary(normalized, batch_index))
                        progress[role] = "completed"
                    except Exception:
                        if not call_recorded:
                            call = _copy_call_metadata(reviewer)
                            if call is not None:
                                calls.append(call)
                        progress[role] = "error"
                        for remaining_cards in batches[batch_index + 1:]:
                            batch_progress.append({
                                "batch_index": len(batch_progress),
                                "card_ids": [card["id"] for card in remaining_cards],
                                "advocate": "skipped",
                                "skeptic": "skipped",
                            })
                        if progress["advocate"] == "pending":
                            progress["advocate"] = "skipped"
                        if progress["skeptic"] == "pending":
                            progress["skeptic"] = "skipped"
                        raise
            for progress in batch_progress:
                if progress["advocate"] == "pending":
                    progress["advocate"] = "skipped"
                if progress["skeptic"] == "pending":
                    progress["skeptic"] = "skipped"
        except (ProviderConfigurationError, ProviderCallError, ReviewerSchemaError, ValueError, TypeError) as exc:
            return self._analysis_incomplete(base, exc, reviewer, outcomes, rejected_evidence, calls, batch_progress)
        except Exception as exc:  # Defensive fail-closed boundary for injected/provider clients.
            return self._analysis_incomplete(base, exc, reviewer, outcomes, rejected_evidence, calls, batch_progress)

        advocate = {item["card_id"]: item for item in normalized_items["advocate"]}
        skeptic = {item["card_id"]: item for item in normalized_items["skeptic"]}
        assessed_card_count = len(self._fully_assessed_card_ids(outcomes))
        supported_findings: list[dict[str, Any]] = []
        uncertain_findings: list[dict[str, Any]] = []
        contextual_effects: list[dict[str, Any]] = []
        adjudication: list[dict[str, Any]] = []
        for card in selected_cards:
            card_id = card["id"]
            advocate_assessment, skeptic_assessment = advocate[card_id], skeptic[card_id]
            advocate_verdict = advocate_assessment["verdict"]
            skeptic_verdict = skeptic_assessment["verdict"]
            if advocate_verdict == skeptic_verdict == "supported":
                if card.get("review_policy", "bias_error_review") == "effect_context_only":
                    final_status = "contextual_effect_consensus"
                    contextual_effects.append(self._finding(card, final_status, advocate_assessment, skeptic_assessment, stakes))
                else:
                    final_status = "pattern_supported"
                    supported_findings.append(self._finding(card, final_status, advocate_assessment, skeptic_assessment, stakes))
            elif "supported" in {advocate_verdict, skeptic_verdict}:
                final_status = "reviewer_disagreement"
                uncertain_findings.append(self._finding(card, final_status, advocate_assessment, skeptic_assessment, stakes))
            elif "uncertain" in {advocate_verdict, skeptic_verdict}:
                final_status = "needs_context"
                uncertain_findings.append(self._finding(card, final_status, advocate_assessment, skeptic_assessment, stakes))
            else:
                final_status = "suppressed"
            adjudication.append({
                "card_id": card_id,
                "status": final_status,
                "review_policy": card.get("review_policy", "bias_error_review"),
                "advocate_verdict": advocate_verdict,
                "skeptic_verdict": skeptic_verdict,
            })

        base.update({
            "status": "review_complete",
            "supported_findings": supported_findings,
            "uncertain_findings": uncertain_findings,
            "contextual_effects": contextual_effects,
            "adjudication": adjudication,
            "reviewer_outcomes": outcomes,
            "rejected_evidence": rejected_evidence,
            "batch_progress": batch_progress,
            "assessed_card_count": assessed_card_count,
            "unassessed_card_count": len(self.cards) - assessed_card_count,
            "completion_limited": False,
        })
        base["audit"].update({
            "mode": "ai",
            "provider": self._provider_info(reviewer),
            "reviewer_calls": calls,
            "reviewer_design_note": "Advocate and skeptic are separate calls that do not see one another. If they use the same base model, their errors may be correlated; this is not statistical independence or calibrated confidence.",
        })
        return base
