"""Local catalog loading and retrieval; never fetches content from card URLs."""
from __future__ import annotations

from collections import Counter
from hashlib import sha256
from importlib import resources
import json
import math
import re
from typing import Any, Iterable

CARD_REQUIRED_FIELDS = {
    "id", "name", "definition", "necessary_conditions", "detection_cues",
    "non_examples", "mitigations", "questions", "limitations", "source_url",
    "source_accessed", "provenance",
}
ENTRY_TYPES = {"bias", "heuristic", "memory_learning_effect", "ai_interaction_concept", "other"}
REVIEW_POLICIES = {"bias_error_review", "effect_context_only", "requires_behavioral_evidence"}


class CatalogError(ValueError):
    """Raised for malformed or unavailable local catalog resources."""


def _resource_json(name: str) -> Any:
    try:
        text = resources.files("biasguard").joinpath("data", name).read_text(encoding="utf-8")
    except FileNotFoundError as exc:
        raise CatalogError(f"Local catalog resource biasguard/data/{name} is unavailable") from exc
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        raise CatalogError(f"Local catalog resource {name} is not valid JSON") from exc


def validate_cards(cards: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    """Validate the operationalized cards needed for retrieval and review.

    The parent-owned catalog is expected to contain 12 cards in production.  Injection
    with a smaller catalog is intentionally supported for focused unit tests.
    """
    if not isinstance(cards, list) or not cards:
        raise CatalogError("cards must be a non-empty JSON array")
    normalized: list[dict[str, Any]] = []
    seen: set[str] = set()
    for position, card in enumerate(cards):
        if not isinstance(card, dict):
            raise CatalogError(f"card at index {position} is not an object")
        missing = CARD_REQUIRED_FIELDS.difference(card)
        if missing:
            raise CatalogError(f"card at index {position} is missing fields: {', '.join(sorted(missing))}")
        card_id = card["id"]
        if not isinstance(card_id, str) or not card_id.strip():
            raise CatalogError(f"card at index {position} has an invalid id")
        if card_id in seen:
            raise CatalogError(f"duplicate card id: {card_id}")
        seen.add(card_id)
        string_fields = ("name", "definition", "limitations", "source_url", "source_accessed", "provenance")
        for key in string_fields:
            if not isinstance(card[key], str):
                raise CatalogError(f"card {card_id} field {key} must be a string")
        for key in ("necessary_conditions", "detection_cues", "non_examples", "mitigations", "questions"):
            if not isinstance(card[key], list) or not all(isinstance(v, str) for v in card[key]):
                raise CatalogError(f"card {card_id} field {key} must be an array of strings")
        if "entry_type" in card and card["entry_type"] not in ENTRY_TYPES:
            raise CatalogError(f"card {card_id} has unsupported entry_type")
        if "review_policy" in card and card["review_policy"] not in REVIEW_POLICIES:
            raise CatalogError(f"card {card_id} has unsupported review_policy")
        normalized.append(card)
    return normalized


def load_cards() -> list[dict[str, Any]]:
    return validate_cards(_resource_json("cards.json"))


def load_source_index() -> list[dict[str, Any]]:
    """Load citation/index metadata only; entries are never treated as detectors."""
    try:
        index = _resource_json("source_index.json")
    except CatalogError as exc:
        # The engine can still describe unavailable index coverage when a test injects cards.
        if "unavailable" in str(exc):
            return []
        raise
    if not isinstance(index, list):
        raise CatalogError("source_index.json must be a JSON array")
    result: list[dict[str, Any]] = []
    for position, item in enumerate(index):
        if not isinstance(item, dict) or not all(isinstance(item.get(k), str) for k in ("id", "name", "url")):
            raise CatalogError(f"source index entry at index {position} must contain string id, name, and url")
        result.append(item)
    return result


def card_hash(cards: list[dict[str, Any]]) -> str:
    canonical = json.dumps(cards, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return sha256(canonical.encode("utf-8")).hexdigest()


def coverage(cards: list[dict[str, Any]], source_index: list[dict[str, Any]]) -> dict[str, Any]:
    operational_ids = {card["id"] for card in cards}
    indexed_ids = {item["id"] for item in source_index}
    return {
        "operationalized_card_count": len(cards),
        "source_index_entry_count": len(source_index),
        "source_index_entries_with_operationalized_cards": len(operational_ids & indexed_ids),
        "source_index_only_ids": sorted(indexed_ids - operational_ids),
        "note": "Only operationalized cards are candidate detectors; source-index-only entries are citation metadata, not detectors.",
    }

_TOKEN_RE = re.compile(r"[\w'-]+", re.UNICODE)
_STOPWORDS = frozenset({
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "in", "is", "it", "of", "on", "or", "that", "the", "to", "was", "with", "will", "would", "this", "these", "those", "we", "they", "you", "our",
})


def _tokens(value: str) -> list[str]:
    return [token.lower() for token in _TOKEN_RE.findall(value) if len(token) > 1 and token.lower() not in _STOPWORDS]


def _card_document(card: dict[str, Any]) -> list[str]:
    parts = [card["name"], card["definition"], *card["necessary_conditions"], *card["detection_cues"]]
    return _tokens(" ".join(parts))


def rank_candidates(cards: list[dict[str, Any]], text: str, context: str = "", limit: int = 8) -> list[dict[str, Any]]:
    """Return deterministic BM25 candidates, explicitly not findings or probabilities."""
    query = _tokens(f"{text}\n{context}")
    if not query:
        return []
    documents = [_card_document(card) for card in cards]
    if not documents:
        return []
    doc_count = len(documents)
    avg_len = sum(len(doc) for doc in documents) / doc_count or 1.0
    document_frequency: Counter[str] = Counter()
    for document in documents:
        document_frequency.update(set(document))
    query_terms = set(query)
    k1, b = 1.2, 0.75
    ranked: list[tuple[float, dict[str, Any]]] = []
    for card, document in zip(cards, documents):
        term_frequency = Counter(document)
        score = 0.0
        for term in query_terms:
            freq = term_frequency.get(term, 0)
            if not freq:
                continue
            idf = math.log(1 + (doc_count - document_frequency[term] + 0.5) / (document_frequency[term] + 0.5))
            denominator = freq + k1 * (1 - b + b * len(document) / avg_len)
            score += idf * (freq * (k1 + 1)) / denominator
        if score > 0:
            ranked.append((score, card))
    ranked.sort(key=lambda item: (-item[0], item[1]["id"]))
    return [
        {
            "id": card["id"],
            "name": card["name"],
            "ranking_score": round(score, 8),
            "ranking_score_note": "Local BM25 retrieval score; not a probability, confidence, diagnosis, or bias finding.",
        }
        for score, card in ranked[:limit]
    ]
