#!/usr/bin/env python3
"""Compare generated animation artifacts and fail on no-op churn."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load(path: Path):
    if path.suffix.lower() in {".json", ".js"}:
        text = path.read_text()
        if path.suffix.lower() == ".js":
            start = text.find("{")
            end = text.rfind("}")
            if start >= 0 and end > start:
                text = text[start:end + 1]
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return text
    return None


def flatten(value, prefix=""):
    out = {}
    if isinstance(value, dict):
        for key, item in value.items():
            out.update(flatten(item, f"{prefix}.{key}" if prefix else str(key)))
    elif isinstance(value, list):
        for index, item in enumerate(value):
            out.update(flatten(item, f"{prefix}[{index}]"))
    else:
        out[prefix] = value
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("before")
    parser.add_argument("after")
    parser.add_argument("--fail-on-noop", action="store_true")
    parser.add_argument("--out")
    args = parser.parse_args()
    before_path = Path(args.before)
    after_path = Path(args.after)
    before_hash = sha256(before_path)
    after_hash = sha256(after_path)
    before = load(before_path)
    after = load(after_path)
    changed_paths = []
    if before is not None and after is not None and type(before) is type(after):
        flat_before = flatten(before)
        flat_after = flatten(after)
        keys = sorted(set(flat_before) | set(flat_after))
        changed_paths = [key for key in keys if flat_before.get(key) != flat_after.get(key)]
    report = {
        "schema": "pose-lab-v2-animation-artifact-comparison-v1",
        "before": {"path": str(before_path), "sha256": before_hash},
        "after": {"path": str(after_path), "sha256": after_hash},
        "changed": before_hash != after_hash,
        "changedPathCount": len(changed_paths),
        "changedPaths": changed_paths[:500],
    }
    text = json.dumps(report, indent=2) + "\n"
    if args.out:
        out_path = Path(args.out)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(text)
    print(text, end="")
    if args.fail_on_noop and not report["changed"]:
        raise SystemExit("no-op artifact comparison failed: hashes match")


if __name__ == "__main__":
    main()
