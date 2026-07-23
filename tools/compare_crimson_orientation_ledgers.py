#!/usr/bin/env python3
"""Reject drift between committed and freshly measured Crimson rig truth."""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
from pathlib import Path


def canonical(ledger: dict) -> dict:
    value = copy.deepcopy(ledger)
    value.pop("createdAt", None)
    # The generated GLB container hash is evidence for a run, not orientation
    # truth. Every measured rest, probe, mesh, bend, and conversion value below
    # it remains part of the exact drift contract.
    (value.get("probe") or {}).pop("exportedGlb", None)
    return value


def canonical_bytes(ledger: dict) -> bytes:
    return json.dumps(canonical(ledger), sort_keys=True, separators=(",", ":")).encode("utf-8")


def differences(left, right, path: str = "$") -> list[str]:
    if type(left) is not type(right):
        return [f"{path}: type {type(left).__name__} != {type(right).__name__}"]
    if isinstance(left, dict):
        result = []
        for key in sorted(set(left) | set(right)):
            if key not in left:
                result.append(f"{path}.{key}: missing from committed")
            elif key not in right:
                result.append(f"{path}.{key}: missing from measured")
            else:
                result.extend(differences(left[key], right[key], f"{path}.{key}"))
            if len(result) >= 20:
                break
        return result
    if isinstance(left, list):
        if len(left) != len(right):
            return [f"{path}: length {len(left)} != {len(right)}"]
        result = []
        for index, (left_item, right_item) in enumerate(zip(left, right)):
            result.extend(differences(left_item, right_item, f"{path}[{index}]"))
            if len(result) >= 20:
                break
        return result
    return [] if left == right else [f"{path}: {left!r} != {right!r}"]


def compare(committed: dict, measured: dict) -> dict:
    committed_bytes = canonical_bytes(committed)
    measured_bytes = canonical_bytes(measured)
    drift = differences(canonical(committed), canonical(measured))
    if drift:
        raise AssertionError("Crimson orientation ledger drift:\n" + "\n".join(drift[:20]))
    return {
        "ok": True,
        "check": "crimson-orientation-ledger-drift",
        "canonicalSha256": hashlib.sha256(committed_bytes).hexdigest(),
        "boneCount": len(committed["bones"]),
        "ignoredRunMetadata": ["createdAt", "probe.exportedGlb"],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("committed", type=Path)
    parser.add_argument("measured", type=Path)
    args = parser.parse_args()
    result = compare(
        json.loads(args.committed.read_text(encoding="utf-8")),
        json.loads(args.measured.read_text(encoding="utf-8")),
    )
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
