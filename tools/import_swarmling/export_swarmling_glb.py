#!/usr/bin/env python3
"""Export the native Swarmling rig, skin, materials, and actions to one GLB."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

import bpy

ROOT = Path(__file__).resolve().parents[2]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


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
        default=ROOT / "public" / "assets" / "swarmling" / "swarmling_rigged_animations.glb",
    )
    parser.add_argument(
        "--manifest",
        type=Path,
        default=ROOT / "public" / "assets" / "swarmling" / "swarmling_manifest.json",
    )
    return parser.parse_args(argv)


def main() -> None:
    args = cli_args()
    source = args.blend.resolve()
    bpy.ops.wm.open_mainfile(filepath=str(source))
    armatures = [obj for obj in bpy.data.objects if obj.type == "ARMATURE"]
    meshes = [
        obj
        for obj in bpy.data.objects
        if obj.type == "MESH" and not obj.name.startswith("WGT-")
    ]
    if len(armatures) != 1:
        raise RuntimeError(f"expected one Swarmling armature, found {[obj.name for obj in armatures]}")
    if not meshes:
        raise RuntimeError("Swarmling source contains no exportable meshes")
    if not bpy.data.actions:
        raise RuntimeError("Swarmling source contains no actions")

    bpy.ops.object.select_all(action="DESELECT")
    selected = [*armatures, *meshes]
    for obj in selected:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = armatures[0]
    for action in bpy.data.actions:
        action.use_fake_user = True

    args.out.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(args.out.resolve()),
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_nla_strips=False,
        export_extra_animations=True,
        export_frame_range=False,
        export_yup=True,
        export_apply=False,
        export_skins=True,
        export_morph=True,
    )
    payload = {
        "schema": "pose-lab-v2-swarmling-runtime-v1",
        "source": {
            "path": str(args.blend),
            "sha256": sha256(source),
        },
        "runtime": {
            "path": str(args.out.relative_to(ROOT)),
            "sha256": sha256(args.out),
            "sizeBytes": args.out.stat().st_size,
        },
        "selectedObjects": [obj.name for obj in selected],
        "armature": armatures[0].name,
        "animations": [
            {
                "name": action.name,
                "frameRange": [
                    float(action.frame_range[0]),
                    float(action.frame_range[1]),
                ],
                "fcurves": len(action.fcurves),
            }
            for action in bpy.data.actions
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
        "status": "native-source-export-awaiting-visual-review",
    }
    args.manifest.parent.mkdir(parents=True, exist_ok=True)
    args.manifest.write_text(json.dumps(payload, indent=2) + "\n")
    print(
        json.dumps(
            {
                "ok": True,
                "out": str(args.out),
                "bytes": args.out.stat().st_size,
                "actions": len(payload["animations"]),
            }
        )
    )


if __name__ == "__main__":
    main()
