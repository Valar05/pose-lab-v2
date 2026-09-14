#!/usr/bin/env python3
"""Compact structural inspector for Blend Archaeology.

Run under Blender, for example through Pose Lab V2's existing Blender wrapper:

    node scripts/run-blender-tool.mjs tools/blend_archaeology_inspect.py -- \
      --blend /path/to/specimen.blend \
      --out generated/blend-archaeology/specimen/inventory.json

The output is deliberately compact. It is evidence for later human analysis,
not an acceptance verdict and not a replacement for rendered inspection.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
from typing import Any

import bpy


SCHEMA = "pose-lab-blend-archaeology-inventory-v1"


def parse_args() -> argparse.Namespace:
    argv = []
    if "--" in os.sys.argv:
        argv = os.sys.argv[os.sys.argv.index("--") + 1 :]
    parser = argparse.ArgumentParser()
    parser.add_argument("--blend", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--max-names", type=int, default=80)
    return parser.parse_args(argv)


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def clipped_names(items, max_names: int) -> list[str]:
    names = sorted({getattr(item, "name", str(item)) for item in items})
    if len(names) <= max_names:
        return names
    return names[:max_names] + [f"... {len(names) - max_names} more"]


def action_summary(action: bpy.types.Action) -> dict[str, Any]:
    frame_start, frame_end = action.frame_range
    path_groups: dict[str, int] = {}
    for curve in action.fcurves:
        path = curve.data_path
        if path.endswith("location"):
            kind = "location"
        elif path.endswith("rotation_quaternion") or path.endswith("rotation_euler"):
            kind = "rotation"
        elif path.endswith("scale"):
            kind = "scale"
        else:
            kind = "other"
        path_groups[kind] = path_groups.get(kind, 0) + 1
    return {
        "name": action.name,
        "frameRange": [round(float(frame_start), 4), round(float(frame_end), 4)],
        "fcurves": len(action.fcurves),
        "channelKinds": path_groups,
    }


def object_summary(obj: bpy.types.Object) -> dict[str, Any]:
    entry: dict[str, Any] = {
        "name": obj.name,
        "type": obj.type,
        "parent": obj.parent.name if obj.parent else None,
        "constraints": [c.type for c in obj.constraints],
        "modifiers": [m.type for m in getattr(obj, "modifiers", [])],
    }
    if obj.type == "ARMATURE" and obj.data:
        entry["boneCount"] = len(obj.data.bones)
        entry["poseBoneCount"] = len(obj.pose.bones) if obj.pose else 0
    if obj.animation_data:
        entry["activeAction"] = obj.animation_data.action.name if obj.animation_data.action else None
        if obj.animation_data.nla_tracks:
            entry["nlaTracks"] = [track.name for track in obj.animation_data.nla_tracks]
    return entry


def main() -> None:
    args = parse_args()
    blend_path = Path(args.blend).expanduser().resolve()
    out_path = Path(args.out).expanduser()
    if not out_path.is_absolute():
        out_path = Path.cwd() / out_path

    if not blend_path.exists():
        raise SystemExit(f"Blend not found: {blend_path}")

    bpy.ops.wm.open_mainfile(filepath=str(blend_path))

    objects = [object_summary(obj) for obj in bpy.data.objects]
    actions = [action_summary(action) for action in bpy.data.actions]

    inventory = {
        "schema": SCHEMA,
        "source": {
            "path": str(blend_path),
            "filename": blend_path.name,
            "sha256": sha256_file(blend_path),
            "sizeBytes": blend_path.stat().st_size,
            "blenderRuntimeVersion": bpy.app.version_string,
        },
        "counts": {
            "scenes": len(bpy.data.scenes),
            "collections": len(bpy.data.collections),
            "objects": len(bpy.data.objects),
            "meshes": len(bpy.data.meshes),
            "armatures": len(bpy.data.armatures),
            "actions": len(bpy.data.actions),
            "materials": len(bpy.data.materials),
            "cameras": len(bpy.data.cameras),
        },
        "scenes": clipped_names(bpy.data.scenes, args.max_names),
        "collections": clipped_names(bpy.data.collections, args.max_names),
        "armatures": clipped_names(bpy.data.armatures, args.max_names),
        "cameras": clipped_names(bpy.data.cameras, args.max_names),
        "actions": actions,
        "objects": objects[: args.max_names],
        "objectListTruncated": len(objects) > args.max_names,
        "notes": [
            "Inventory is structural evidence only.",
            "Rendered / human-visible evidence controls artistic interpretation.",
            "Do not promote every datablock into the durable blend record."
        ],
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(inventory, indent=2, sort_keys=False) + "\n", encoding="utf-8")
    print(out_path)


if __name__ == "__main__":
    main()
