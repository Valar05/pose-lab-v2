#!/usr/bin/env python3
"""Inspect embedded animation actions and authored keyframes for generic Pose Lab review."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Iterable

import bpy
from bpy_extras import anim_utils


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


def action_fcurves(action: bpy.types.Action, armature: bpy.types.Object) -> Iterable[bpy.types.FCurve]:
    armature.animation_data_create()
    armature.animation_data.action = action
    action_slot = getattr(armature.animation_data, "action_slot", None)
    get_channelbag = getattr(anim_utils, "action_get_channelbag_for_slot", None)
    if action_slot is not None and get_channelbag is not None:
        channelbag = get_channelbag(action, action_slot)
        if channelbag is not None:
            return list(channelbag.fcurves)
    return list(action.fcurves)


def authored_keyframes(action: bpy.types.Action, armature: bpy.types.Object) -> list[float]:
    values: set[float] = set()
    for curve in action_fcurves(action, armature):
        for point in curve.keyframe_points:
            values.add(round(float(point.co.x), 6))
    return sorted(values)


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
    if len(armatures) != 1:
        raise RuntimeError(f"Expected one armature, found {[obj.name for obj in armatures]}")
    armature = armatures[0]

    actions = []
    for action in sorted(bpy.data.actions, key=lambda item: item.name.lower()):
        start, end = (float(value) for value in action.frame_range)
        keyframes = authored_keyframes(action, armature)
        actions.append(
            {
                "name": action.name,
                "label": normalized_label(action.name),
                "frameRange": [start, end],
                "keyframes": keyframes,
                "keyframeCount": len(keyframes),
            }
        )

    payload = {
        "schema": "pose-lab-model-action-inspection-v2",
        "asset": str(asset),
        "armatures": [obj.name for obj in armatures],
        "actions": actions,
    }
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2) + "\n")
    print(json.dumps({
        "status": "PASS",
        "actions": len(actions),
        "keyframes": sum(item["keyframeCount"] for item in actions),
        "out": str(out),
    }))


if __name__ == "__main__":
    main()
