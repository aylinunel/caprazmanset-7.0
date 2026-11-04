"""Strict, per-catalog schemas for untrusted reviewer outputs."""
from __future__ import annotations

from typing import Any

from jsonschema import Draft202012Validator


class ReviewerSchemaError(ValueError):
    """The reviewer response does not meet the required structural contract."""


def build_reviewer_schema(card_ids: list[str], role: str) -> dict[str, Any]:
    """Build a closed JSON Schema whose card_id enum matches this catalog exactly."""
    condition = {
        "type": "object",
        "properties": {
            "condition_index": {"type": "integer", "minimum": 0},
            "status": {"type": "string", "enum": ["satisfied", "unknown", "contradicted"]},
            "evidence_indices": {
                "type": "array",
                "items": {"type": "integer", "minimum": 0},
                "uniqueItems": True,
            },
        },
        "required": ["condition_index", "status", "evidence_indices"],
        "additionalProperties": False,
    }
    evidence = {
        "type": "object",
        "properties": {
            "source": {"type": "string", "enum": ["text", "context"]},
            # Exactness/minimum non-whitespace length are checked locally against source fields.
            "quote": {"type": "string", "minLength": 1},
            # 7.0: evidence type is declared separately from the field that carries it
            # (2026-10-28 simulation: delegation creep was lost to a field-provenance gate).
            "kind": {"type": "string", "enum": ["statement", "behavioral"]},
        },
        "required": ["source", "quote", "kind"],
        "additionalProperties": False,
    }
    assessment = {
        "type": "object",
        "properties": {
            "card_id": {"type": "string", "enum": card_ids},
            "verdict": {"type": "string", "enum": ["supported", "uncertain", "not_supported"]},
            "evidence": {"type": "array", "items": evidence},
            "necessary_conditions": {"type": "array", "items": condition},
            "mechanism": {"type": "string"},
            "alternative_explanation": {"type": "string"},
            "missing_context": {"type": "array", "items": {"type": "string"}},
        },
        "required": [
            "card_id", "verdict", "evidence", "necessary_conditions", "mechanism",
            "alternative_explanation", "missing_context",
        ],
        "additionalProperties": False,
    }
    return {
        "type": "object",
        "properties": {
            "role": {"type": "string", "const": role},
            "assessments": {
                "type": "array",
                "minItems": len(card_ids),
                "maxItems": len(card_ids),
                "items": assessment,
            },
        },
        "required": ["role", "assessments"],
        "additionalProperties": False,
    }


def validate_reviewer_structure(payload: Any, card_ids: list[str], role: str) -> None:
    validator = Draft202012Validator(build_reviewer_schema(card_ids, role))
    errors = sorted(validator.iter_errors(payload), key=lambda error: list(error.absolute_path))
    if errors:
        error = errors[0]
        path = ".".join(str(part) for part in error.absolute_path) or "response"
        raise ReviewerSchemaError(f"schema validation failed at {path}: {error.message}")
    ids = [assessment["card_id"] for assessment in payload["assessments"]]
    if len(ids) != len(set(ids)):
        raise ReviewerSchemaError("schema validation failed: duplicate card assessments")
    if set(ids) != set(card_ids):
        raise ReviewerSchemaError("schema validation failed: every operationalized card must be assessed exactly once")
