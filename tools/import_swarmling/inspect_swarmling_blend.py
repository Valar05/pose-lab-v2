#!/usr/bin/env python3
"""Inventory the project-owned Swarmling Blender source."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import bpy

ROOT = Path(__file__).resolve().parents[2]


def cli_args() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--blend",
        type=Path,
        default=ROOT / "authoring" / "swarmling" / "Swarmling.blend",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=ROOT / "generated" / "swarmling" / "source-inventory.json",
    )
    return parser.parse_args(argv)


def main() -> None:
    args = cli_args()
    bpy.ops.wm.open_mainfile(filepath=str(args.blend.resolve()))
    payload = {
        "schema": "pose-lab-v2-swarmling-blend-inventory-v1",
        "source": str(args.blend),
        "blender": bpy.app.version_string,
        "objects": [
            {
                "name": obj.name,
                "type": obj.type,
                "parent": obj.parent.name if obj.parent else None,
                "data": obj.data.name if getattr(obj, "data", None) else None,
            }
            for obj in bpy.data.objects
        ],
        "armatures": [
            {
                "name": armature.name,
                "bones": [bone.name for bone in armature.data.bones],
                "poseBones": [bone.name for bone in armature.pose.bones],
            }
            for armature in bpy.data.objects
            if armature.type == "ARMATURE"
        ],
        "actions": [
            {
                "name": action.name,
                "frameRange": [
                    float(action.frame_range[0]),
                    float(action.frame_range[1]),
                ],
                "fcurves": len(action.fcurves),
                "groups": [group.name for group in action.groups],
            }
            for action in bpy.data.actions
        ],
        "materials": [
            {"name": material.name, "useNodes": bool(material.use_nodes)}
            for material in bpy.data.materials
        ],
        "images": [
            {
                "name": image.name,
                "filepath": image.filepath,
                "packed": bool(image.packed_file),
                "size": [int(image.size[0]), int(image.size[1])],
            }
            for image in bpy.data.images
        ],
        "scenes": [
            {
                "name": scene.name,
                "frameStart": int(scene.frame_start),
                "frameEnd": int(scene.frame_end),
                "fps": float(scene.render.fps / scene.render.fps_base),
            }
            for scene in bpy.data.scenes
        ],
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(payload, indent=2) + "\n")
    print(
        json.dumps(
            {
                "ok": True,
                "out": str(args.out),
                "objects": len(payload["objects"]),
                "armatures": len(payload["armatures"]),
                "actions": len(payload["actions"]),
            }
        )
    )


if __name__ == "__main__":
    main()
