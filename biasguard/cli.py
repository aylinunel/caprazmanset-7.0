"""Command-line interface for local BiasGuard analysis."""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import sys
from typing import Any

from .catalog import CatalogError
from .engine import BiasGuard


def _read_utf8(path_value: str, label: str) -> str:
    try:
        return Path(path_value).read_text(encoding="utf-8")
    except OSError as exc:
        raise ValueError(f"could not read {label}: {exc}") from exc


def _load_capabilities(path_value: str | None) -> dict[str, Any] | None:
    if not path_value:
        return None
    try:
        value = json.loads(_read_utf8(path_value, "provider capabilities file"))
    except json.JSONDecodeError as exc:
        raise ValueError("provider capabilities file is not valid JSON") from exc
    if not isinstance(value, dict):
        raise ValueError("provider capabilities JSON must be an object")
    return value


def _emit(payload: dict[str, Any], output: str | None) -> None:
    content = json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    if output:
        Path(output).write_text(content, encoding="utf-8")
    else:
        sys.stdout.write(content)


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="biasguard", description="Evidence-bound cognitive-bias reasoning review")
    commands = parser.add_subparsers(dest="command", required=True)
    analyze = commands.add_parser("analyze", help="analyze one text file")
    analyze.add_argument("--file", required=True, help="UTF-8 text file to review")
    analyze.add_argument("--context-file", help="optional UTF-8 context file")
    analyze.add_argument("--mode", choices=("offline", "ai"), default="offline")
    analyze.add_argument("--stakes", choices=("low", "medium", "high"), default="medium")
    analyze.add_argument("--model", help="required for AI mode unless BIASGUARD_MODEL is set")
    analyze.add_argument("--max-candidates", type=int, default=12, help="AI shortlist bound, 4-30 (default: 12)")
    analyze.add_argument("--exhaustive", action="store_true", help="AI only: review every card in batches of at most 12 per reviewer")
    analyze.add_argument("--timeout-seconds", type=int, default=90, help="provider timeout, 1-180 seconds")
    analyze.add_argument("--max-retries", type=int, default=2, help="provider retry bound, 0-2")
    analyze.add_argument(
        "--provider-capabilities",
        help="explicit JSON object for an OpenAI-compatible provider whose live catalog lacks capabilities",
    )
    analyze.add_argument("--output", help="write JSON result to this path instead of stdout")
    commands.add_parser("catalog", help="print local operationalized-card and citation-index coverage")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    if args.command == "catalog":
        try:
            guard = BiasGuard()
        except CatalogError as exc:
            sys.stderr.write(f"biasguard catalog error: {exc}\n")
            return 1
        payload = {
            "catalog_card_count": len(guard.cards),
            "coverage": guard._coverage,  # CLI view of public catalog metadata; no network access.
            "cards": [
                {
                    "id": card["id"],
                    "name": card["name"],
                    "entry_type": card.get("entry_type", "bias"),
                    "review_policy": card.get("review_policy", "bias_error_review"),
                    "source_url": card["source_url"],
                }
                for card in guard.cards
            ],
        }
        _emit(payload, None)
        return 0

    try:
        text = _read_utf8(args.file, "--file")
        context = _read_utf8(args.context_file, "--context-file") if args.context_file else ""
        capabilities = _load_capabilities(args.provider_capabilities)
    except ValueError as exc:
        sys.stderr.write(f"biasguard input error: {exc}\n")
        return 2

    guard = BiasGuard(
        model=args.model or os.getenv("BIASGUARD_MODEL"),
        timeout_seconds=args.timeout_seconds,
        max_retries=args.max_retries,
        provider_capabilities=capabilities,
    )
    result = guard.analyze(
        text,
        context=context,
        stakes=args.stakes,
        mode=args.mode,
        max_candidates=args.max_candidates,
        exhaustive=args.exhaustive,
    )
    try:
        _emit(result, args.output)
    except OSError as exc:
        sys.stderr.write(f"biasguard output error: {exc}\n")
        return 2
    if result["status"] == "review_complete" or result["status"] == "offline_candidates_only":
        return 0
    return 1 if result["status"] == "analysis_incomplete" else 2
