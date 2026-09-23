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


def action_fcurves(action: bpy.types.Action) -> list[bpy.types.FCurve]:
    """Return both legacy and Blender 4.4 slotted-action curves."""
    curves: list[bpy.types.FCurve] = []
    try:
        curves.extend(action.fcurves)
    except Exception:
        pass
    for layer in getattr(action, "layers", []):
        for strip in getattr(layer, "strips", []):
            for channelbag in getattr(strip, "channelbags", []):
                curves.extend(getattr(channelbag, "fcurves", []))
    unique: dict[int, bpy.types.FCurve] = {}
    for curve in curves:
        unique[curve.as_pointer()] = curve
    return list(unique.values())


def action_record(action: bpy.types.Action) -> dict[str, object]:
    curves = action_fcurves(action)
    keyed_frames = sorted(
        {
            round(float(point.co.x), 6)
            for curve in curves
            for point in curve.keyframe_points
        }
    )
    return {
        "name": action.name,
        "frameRange": [
            float(action.frame_range[0]),
            float(action.frame_range[1]),
        ],
        "fcurves": len(curves),
        "keyedFrameRange": (
            [keyed_frames[0], keyed_frames[-1]] if keyed_frames else None
        ),
        "keyedFrames": keyed_frames,
        "groups": [group.name for group in action.groups],
        "slots": [
            {
                "identifier": slot.identifier,
                "targetIdType": slot.target_id_type,
                "handle": int(slot.handle),
            }
            for slot in getattr(action, "slots", [])
        ],
        "layers": [
            {
                "name": layer.name,
                "strips": len(getattr(layer, "strips", [])),
            }
            for layer in getattr(action, "layers", [])
        ],
    }


def animation_record(obj: bpy.types.Object) -> dict[str, object] | None:
    data = obj.animation_data
    if data is None:
        return None
    return {
        "action": data.action.name if data.action else None,
        "actionSlot": (
            getattr(getattr(data, "action_slot", None), "identifier", None)
        ),
        "nlaTracks": [
            {
                "name": track.name,
                "mute": bool(track.mute),
                "solo": bool(track.is_solo),
                "strips": [
                    {
                        "name": strip.name,
                        "action": strip.action.name if strip.action else None,
                        "frameRange": [
                            float(strip.frame_start),
                            float(strip.frame_end),
                        ],
                        "actionFrameRange": [
                            float(strip.action_frame_start),
                            float(strip.action_frame_end),
                        ],
                    }
                    for strip in track.strips
                ],
            }
            for track in data.nla_tracks
        ],
    }


def pose_signature(
    scene: bpy.types.Scene,
    armature: bpy.types.Object,
    frame: int,
) -> list[float]:
    scene.frame_set(frame)
    bpy.context.view_layer.update()
    return [
        round(float(value), 6)
        for bone in armature.pose.bones
        for row in bone.matrix
        for value in row
    ]


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
        "actions": [action_record(action) for action in bpy.data.actions],
        "objectAnimation": [
            {
                "object": obj.name,
                "type": obj.type,
                **record,
            }
            for obj in bpy.data.objects
            if (record := animation_record(obj)) is not None
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
    armatures = [
        obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"
    ]
    if len(armatures) == 1:
        scene = bpy.context.scene
        sample_frames = sorted(
            {
                int(scene.frame_start),
                int(scene.frame_start + 1),
                int(round((scene.frame_start + scene.frame_end) / 2)),
                int(scene.frame_end),
            }
        )
        signatures = {
            str(frame): pose_signature(scene, armatures[0], frame)
            for frame in sample_frames
        }
        first = signatures[str(sample_frames[0])]
        payload["timelinePoseSamples"] = [
            {
                "frame": frame,
                "differsFromFirst": signatures[str(frame)] != first,
            }
            for frame in sample_frames
        ]
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
