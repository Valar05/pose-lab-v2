#!/usr/bin/env python3
"""Shared fail-closed mechanics for Pose Lab campaigns.

This module deliberately does not own creative decisions. Campaign contracts own
mutable paths, locked files, and structural expectations. Campaign-specific
helpers own the actual mutation.
"""
from __future__ import annotations

import argparse
import fnmatch
import hashlib
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

SCHEMA = "pose-lab-v2-campaign-contract-v2"
DEFAULT_RULES = [
    "AGENTS.md",
    "docs/POSE_LAB_CAMPAIGN_RULES.md",
    "docs/POSE_IS_GOD.md",
]


class CampaignError(RuntimeError):
    pass


def fail(message: str) -> None:
    raise CampaignError(message)


def read_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        fail(f"missing JSON file: {path}")
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON {path}: {exc}")


def sha256(path: Path) -> str:
    if not path.is_file():
        fail(f"missing file for SHA-256: {path}")
    return hashlib.sha256(path.read_bytes()).hexdigest()


def json_pointer(value: Any, pointer: str) -> Any:
    if pointer == "":
        return value
    if not pointer.startswith("/"):
        fail(f"JSON pointer must begin with '/': {pointer}")
    cur = value
    for raw in pointer.split("/")[1:]:
        token = raw.replace("~1", "/").replace("~0", "~")
        if isinstance(cur, list):
            try:
                cur = cur[int(token)]
            except (ValueError, IndexError):
                fail(f"JSON pointer does not resolve: {pointer}")
        elif isinstance(cur, dict) and token in cur:
            cur = cur[token]
        else:
            fail(f"JSON pointer does not resolve: {pointer}")
    return cur


def machine(contract: dict[str, Any]) -> dict[str, Any]:
    if contract.get("schema") != SCHEMA:
        fail(f"contract must use {SCHEMA}")
    cfg = contract.get("machine")
    if not isinstance(cfg, dict):
        fail("contract.machine must be an object")
    mutable = cfg.get("mutablePaths")
    if not isinstance(mutable, list) or not mutable or not all(isinstance(x, str) and x for x in mutable):
        fail("contract.machine.mutablePaths must be a non-empty string array")
    return cfg


def path_allowed(path: str, patterns: list[str]) -> bool:
    normalized = path.replace("\\", "/")
    for pattern in patterns:
        p = pattern.replace("\\", "/")
        if normalized == p or fnmatch.fnmatchcase(normalized, p):
            return True
        if p.endswith("/**") and (normalized == p[:-3] or normalized.startswith(p[:-2])):
            return True
    return False


def changed_paths(root: Path, staged: bool) -> list[str]:
    args = ["git", "-C", str(root), "diff", "--name-only"]
    if staged:
        args.insert(4, "--cached")
    result = subprocess.run(args, capture_output=True, text=True, check=True)
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


def assert_diff_allowed(root: Path, contract: dict[str, Any], staged: bool = False) -> list[str]:
    cfg = machine(contract)
    patterns = cfg["mutablePaths"]
    changed = changed_paths(root, staged)
    bad = [p for p in changed if not path_allowed(p, patterns)]
    if bad:
        fail("unauthorized changed paths: " + ", ".join(bad))
    return changed


def assert_required_rules(root: Path, contract: dict[str, Any]) -> None:
    cfg = machine(contract)
    required = cfg.get("requiredRules", DEFAULT_RULES)
    if not isinstance(required, list) or not all(isinstance(x, str) and x for x in required):
        fail("contract.machine.requiredRules must be a string array")
    for rel in required:
        path = root / rel
        if not path.is_file() or path.stat().st_size == 0:
            fail(f"required rule missing/empty: {rel}")


def assert_locked_files(root: Path, contract: dict[str, Any]) -> None:
    cfg = machine(contract)
    locks = cfg.get("lockedFiles", [])
    if not isinstance(locks, list):
        fail("contract.machine.lockedFiles must be an array")
    for entry in locks:
        if not isinstance(entry, dict):
            fail("lockedFiles entries must be objects")
        rel = entry.get("path")
        expected = entry.get("sha256")
        if not isinstance(rel, str) or not isinstance(expected, str):
            fail("locked file requires path + sha256")
        actual = sha256(root / rel)
        if actual != expected:
            fail(f"LOCK VIOLATION {rel}: {actual} != {expected}")


def assert_checks(root: Path, contract: dict[str, Any]) -> None:
    cfg = machine(contract)
    checks = cfg.get("checks", [])
    if not isinstance(checks, list):
        fail("contract.machine.checks must be an array")
    for index, check in enumerate(checks):
        if not isinstance(check, dict):
            fail(f"check[{index}] must be an object")
        kind = check.get("kind")
        rel = check.get("path")
        if not isinstance(rel, str):
            fail(f"check[{index}] missing path")
        path = root / rel
        if kind == "json-equals":
            pointer = check.get("pointer")
            if not isinstance(pointer, str):
                fail(f"check[{index}] json-equals missing pointer")
            actual = json_pointer(read_json(path), pointer)
            expected = check.get("value")
            if actual != expected:
                fail(f"check[{index}] {rel}{pointer}: {actual!r} != {expected!r}")
        elif kind == "text-contains":
            needle = check.get("value")
            if not isinstance(needle, str):
                fail(f"check[{index}] text-contains value must be string")
            if needle not in path.read_text(encoding="utf-8"):
                fail(f"check[{index}] {rel} missing required text")
        elif kind == "sha256":
            expected = check.get("value")
            if not isinstance(expected, str):
                fail(f"check[{index}] sha256 value must be string")
            actual = sha256(path)
            if actual != expected:
                fail(f"check[{index}] SHA mismatch for {rel}: {actual} != {expected}")
        else:
            fail(f"unsupported check kind at index {index}: {kind!r}")


def validate_contract(contract: dict[str, Any]) -> None:
    cfg = machine(contract)
    if not isinstance(contract.get("id"), str) or not contract["id"]:
        fail("contract.id is required")
    if not isinstance(contract.get("mission"), str) or not contract["mission"]:
        fail("contract.mission is required")
    if "receiptPath" in cfg and not isinstance(cfg["receiptPath"], str):
        fail("contract.machine.receiptPath must be a string")


def receipt_payload(
    contract: dict[str, Any],
    start_revision: str,
    implementation_revision: str,
    final_revision: str | None,
    review_url: str | None,
    execution_lane: str,
    human_verdict: str = "pending",
) -> dict[str, Any]:
    return {
        "schema": "pose-lab-v2-campaign-receipt-v2",
        "campaign": contract["id"],
        "status": "implemented-awaiting-human-review" if human_verdict == "pending" else "complete",
        "startRevision": start_revision,
        "implementationRevision": implementation_revision,
        "finalRevision": final_revision,
        "executionLane": execution_lane,
        "reviewUrl": review_url,
        "humanVerdict": human_verdict,
        "mutablePaths": machine(contract)["mutablePaths"],
    }


def write_receipt(
    root: Path,
    contract: dict[str, Any],
    start_revision: str,
    implementation_revision: str,
    final_revision: str | None,
    review_url: str | None,
    execution_lane: str,
    human_verdict: str = "pending",
) -> Path:
    cfg = machine(contract)
    rel = cfg.get("receiptPath")
    if not isinstance(rel, str) or not rel:
        fail("contract.machine.receiptPath is required to write a receipt")
    path = root / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = receipt_payload(
        contract,
        start_revision,
        implementation_revision,
        final_revision,
        review_url,
        execution_lane,
        human_verdict,
    )
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return path


def load_contract(root: Path, rel: str) -> dict[str, Any]:
    contract = read_json(root / rel)
    if not isinstance(contract, dict):
        fail("contract root must be an object")
    validate_contract(contract)
    return contract


def cmd_preflight(args: argparse.Namespace) -> None:
    root = Path(args.root).resolve()
    contract = load_contract(root, args.contract)
    assert_required_rules(root, contract)
    assert_locked_files(root, contract)
    if not args.skip_diff:
        assert_diff_allowed(root, contract, staged=False)
    print("POSE_CAMPAIGN_PREFLIGHT_OK")
    print("campaign=" + contract["id"])
    print("mutable=" + ",".join(machine(contract)["mutablePaths"]))


def cmd_check_diff(args: argparse.Namespace) -> None:
    root = Path(args.root).resolve()
    contract = load_contract(root, args.contract)
    changed = assert_diff_allowed(root, contract, staged=args.staged)
    print("POSE_CAMPAIGN_DIFF_OK")
    print("changed=" + ",".join(changed))


def cmd_verify(args: argparse.Namespace) -> None:
    root = Path(args.root).resolve()
    contract = load_contract(root, args.contract)
    assert_required_rules(root, contract)
    assert_locked_files(root, contract)
    assert_checks(root, contract)
    print("POSE_CAMPAIGN_VERIFY_OK")
    print("campaign=" + contract["id"])


def cmd_receipt(args: argparse.Namespace) -> None:
    root = Path(args.root).resolve()
    contract = load_contract(root, args.contract)
    path = write_receipt(
        root,
        contract,
        args.start_revision,
        args.implementation_revision,
        args.final_revision,
        args.review_url,
        args.execution_lane,
        args.human_verdict,
    )
    print("POSE_CAMPAIGN_RECEIPT_OK")
    print("receipt=" + str(path.relative_to(root)))


def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser()
    p.add_argument("--root", default=str(Path(__file__).resolve().parents[2]))
    sub = p.add_subparsers(dest="command", required=True)

    s = sub.add_parser("preflight")
    s.add_argument("--contract", required=True)
    s.add_argument("--skip-diff", action="store_true")
    s.set_defaults(func=cmd_preflight)

    s = sub.add_parser("check-diff")
    s.add_argument("--contract", required=True)
    s.add_argument("--staged", action="store_true")
    s.set_defaults(func=cmd_check_diff)

    s = sub.add_parser("verify")
    s.add_argument("--contract", required=True)
    s.set_defaults(func=cmd_verify)

    s = sub.add_parser("receipt")
    s.add_argument("--contract", required=True)
    s.add_argument("--start-revision", required=True)
    s.add_argument("--implementation-revision", required=True)
    s.add_argument("--final-revision")
    s.add_argument("--review-url")
    s.add_argument("--execution-lane", default="repo-owned-campaign")
    s.add_argument("--human-verdict", default="pending")
    s.set_defaults(func=cmd_receipt)
    return p


def main() -> int:
    try:
        args = parser().parse_args()
        args.func(args)
        return 0
    except CampaignError as exc:
        print("STOP: " + str(exc), file=sys.stderr)
        return 2
    except subprocess.CalledProcessError as exc:
        print(f"STOP: command failed: {exc}", file=sys.stderr)
        return exc.returncode or 2


if __name__ == "__main__":
    raise SystemExit(main())
