#!/usr/bin/env python3
"""Inspect embedded animation actions in a GLB/GLTF model for generic Pose Lab review."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

import bpy


def cli_args() -> argparse.Namespace:
    argv = sys.argv
    argv = argv[argv.index("--") + 1 :] if "--" in argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--asset", required=True)
    parser.add_argument("--out", required=True)
    return parser.parse_args(argv)


def normalized_label(name: str) -> str:
    label = re.sub(r"(?:_Armature|_rig)$", "", name)
    return label or name


def main() -> None:
    args = cli_args()
    asset = Path(args.asset).resolve()
    out = Path(args.out).resolve()
    if not asset.is_file():
        raise RuntimeError(f"Asset does not exist: {asset}")

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(asset))

    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    actions = []
    for action in sorted(bpy.data.actions, key=lambda item: item.name.lower()):
        start, end = (float(value) for value in action.frame_range)
        actions.append(
            {
                "name": action.name,
                "label": normalized_label(action.name),
                "frameRange": [start, end],
            }
        )

    payload = {
        "schema": "pose-lab-model-action-inspection-v1",
        "asset": str(asset),
        "armatures": [obj.name for obj in armatures],
        "actions": actions,
    }
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2) + "\n")
    print(json.dumps({"status": "PASS", "actions": len(actions), "out": str(out)}))


if __name__ == "__main__":
    main()
