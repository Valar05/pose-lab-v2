#!/usr/bin/env python3
"""Compose saved poses into an arbitrarily timed animation candidate."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_ROOT = ROOT / "generated" / "composed-animations"
SCHEMA = "pose-lab-v2-composed-animation-v1"
TOOL = "compose_saved_poses.py"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def slugify(value: str) -> str:
    value = re.sub(r"[^A-Za-z0-9._-]+", "-", value.strip()).strip("-._")
    return value[:96] or "animation"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def normalize_quat(q: list[float]) -> list[float]:
    length = math.sqrt(sum(float(value) * float(value) for value in q)) or 1.0
    return [round(float(value) / length, 6) for value in q]


def pose_from_manual_key(manual: dict, key_label: str) -> dict:
    key = manual.get("keys", {}).get(key_label)
    if not key:
        raise SystemExit(f"manual draft key not found: {key_label}")
    return {
        "id": key_label,
        "label": key_label,
        "source": {
            "schema": manual.get("schema"),
            "manualKey": key_label,
        },
        "bones": key.get("bones", {}),
        "saberGrip": key.get("saberGrip"),
        "sabreLocal": key.get("sabreLocal"),
    }


def load_pose_library(path: Path) -> dict[str, dict]:
    data = json.loads(path.read_text())
    poses = {}
    if data.get("schema") == "pose-lab-v2-manual-animation-v1":
        for label in data.get("keys", {}):
            poses[label] = pose_from_manual_key(data, label)
        return poses
    for pose in data.get("poses", []):
        poses[pose["id"]] = pose
    if not poses:
        raise SystemExit(f"no poses found in {path}")
    return poses


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--poses", required=True, help="pose library JSON or manual animation draft")
    parser.add_argument("--recipe", required=True, help="timing recipe JSON")
    parser.add_argument("--out")
    args = parser.parse_args()

    pose_path = Path(args.poses)
    recipe_path = Path(args.recipe)
    poses = load_pose_library(pose_path)
    recipe = json.loads(recipe_path.read_text())
    label = recipe.get("label") or recipe_path.stem
    frames = []
    for entry in recipe.get("keys", []):
        pose_id = entry.get("poseId") or entry.get("pose")
        if pose_id not in poses:
            raise SystemExit(f"recipe references unknown pose: {pose_id}")
        pose = poses[pose_id]
        bones = {
            name: normalize_quat(values)
            for name, values in (pose.get("bones") or {}).items()
        }
        frames.append({
            "label": entry.get("phase") or pose_id,
            "poseId": pose_id,
            "time": round(float(entry["time"]), 6),
            "easingToNext": entry.get("easingToNext", "slerp"),
            "holdAfter": round(float(entry.get("holdAfter", 0)), 6),
            "bones": bones,
            "saberGrip": pose.get("saberGrip"),
            "sabreLocal": pose.get("sabreLocal"),
        })
    frames.sort(key=lambda frame: frame["time"])
    if not frames:
        raise SystemExit("recipe must contain keys")
    duration = float(recipe.get("duration", frames[-1]["time"]))
    if duration < frames[-1]["time"]:
        raise SystemExit("duration cannot be earlier than final frame")
    output = {
        "schema": SCHEMA,
        "status": "candidate",
        "tool": TOOL,
        "label": label,
        "generatedAt": utc_now(),
        "source": {
            "poseLibrary": str(pose_path),
            "poseLibrarySha256": sha256(pose_path),
            "recipe": str(recipe_path),
            "recipeSha256": sha256(recipe_path),
        },
        "duration": round(duration, 6),
        "primeKeys": {frame["label"]: frame["time"] for frame in frames},
        "frames": frames,
        "segments": recipe.get("segments", []),
        "metadata": recipe.get("metadata", {}),
    }
    out_path = Path(args.out) if args.out else OUT_ROOT / f"{slugify(label)}.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(output, indent=2) + "\n")
    print(str(out_path))


if __name__ == "__main__":
    main()
