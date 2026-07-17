#!/usr/bin/env python3
"""Sample Blender-readable source asset inventory for animation extraction."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import bpy

ROOT = Path(__file__).resolve().parents[1]
OUT_ROOT = ROOT / "generated" / "source-clip-samples"
SCHEMA = "pose-lab-v2-blender-source-sample-v1"
TOOL = "sample_source_clip_blender.py"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--out", default=str(OUT_ROOT / "source_sample.json"))
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    args = parser.parse_args(argv)
    source = Path(args.source)
    if not source.is_absolute():
        source = ROOT / source
    if not source.exists():
        raise SystemExit(f"source not found: {source}")
    clear_scene()
    if source.suffix.lower() in {".glb", ".gltf"}:
        bpy.ops.import_scene.gltf(filepath=str(source))
    elif source.suffix.lower() == ".fbx":
        bpy.ops.import_scene.fbx(filepath=str(source))
    else:
        raise SystemExit(f"unsupported source type: {source.suffix}")
    armatures = [obj for obj in bpy.data.objects if obj.type == "ARMATURE"]
    meshes = [obj for obj in bpy.data.objects if obj.type == "MESH"]
    actions = []
    for action in bpy.data.actions:
        frames = [point.co.x for curve in action.fcurves for point in curve.keyframe_points]
        actions.append({
            "name": action.name,
            "frameStart": min(frames) if frames else None,
            "frameEnd": max(frames) if frames else None,
            "fcurveCount": len(action.fcurves),
            "dataPaths": sorted({curve.data_path for curve in action.fcurves})[:500],
        })
    bones = []
    for armature in armatures:
        for bone in armature.data.bones:
            bones.append({
                "armature": armature.name,
                "name": bone.name,
                "parent": bone.parent.name if bone.parent else None,
                "headLocal": [round(value, 6) for value in bone.head_local],
                "tailLocal": [round(value, 6) for value in bone.tail_local],
            })
    manifest = {
        "schema": SCHEMA,
        "status": "diagnostic",
        "tool": TOOL,
        "generatedAt": utc_now(),
        "source": {"path": str(source), "sha256": sha256(source)},
        "blender": bpy.app.version_string,
        "objects": {
            "armatures": [obj.name for obj in armatures],
            "meshes": [obj.name for obj in meshes],
        },
        "actions": actions,
        "bones": bones,
    }
    out = Path(args.out)
    if not out.is_absolute():
        out = ROOT / out
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(manifest, indent=2) + "\n")
    print(str(out))


if __name__ == "__main__":
    main()
