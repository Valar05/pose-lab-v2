#!/usr/bin/env python3
"""Project Davin candidate bones into review-camera pixels for screenshot comparison."""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT / "tools"
if str(TOOLS) not in sys.path:
    sys.path.insert(0, str(TOOLS))

from render_davin_lowbackkick_blender import (  # noqa: E402
    activate_gltf_animation,
    camera_direction_from_text,
    clear_scene,
    find_armature,
    import_glb,
    look_at,
    make_animated_candidate_glb,
    posed_mesh_bounds,
    setup_scene,
)

DEFAULT_GLB = ROOT / "public" / "assets" / "davin" / "davin_wingsworth_kestrel_man_rigged_pbr_tail3.glb"
DEFAULT_CANDIDATE = ROOT / "generated" / "davin-idle" / "screenshot-1" / "davin-idle-screenshot-1.json"
DEFAULT_OUT = ROOT / "generated" / "davin-idle" / "screenshot-1" / "projection" / "landmarks.json"
SCHEMA = "pose-lab-v2-davin-idle-screen-projection-v1"

# Normalized landmarks on the 2026-07-16 target screenshot. These are explicit
# visual predicates, not acceptance: implementation must move projected rig points
# toward these before another candidate can be reviewed.
TARGET_LANDMARKS = {
    "head": {"xy": [0.636, 0.300], "bone": "Head", "role": "head center faces viewer-right"},
    "beak": {"xy": [0.691, 0.332], "bone": "Head", "role": "beak/right-facing head silhouette"},
    "neck": {"xy": [0.560, 0.340], "bone": "neck", "role": "neck forward lean"},
    "leftWingTip": {"xy": [0.262, 0.485], "bone": "LeftHand", "role": "screen-left open wing tip"},
    "rightWingTip": {"xy": [0.753, 0.575], "bone": "RightHand", "role": "screen-right guard wing tip"},
    "leftToe": {"xy": [0.366, 0.854], "bone": "LeftToeBase", "role": "screen-left grounded talon"},
    "rightToe": {"xy": [0.688, 0.803], "bone": "RightToeBase", "role": "screen-right grounded talon"},
    "tailBase": {"xy": [0.418, 0.620], "bone": "Tail01", "role": "tail exits low behind torso"},
    "tailTip": {"xy": [0.286, 0.706], "bone": "Tail03", "role": "low rear fan tip"},
}


def argv_after_blender() -> list[str]:
    return sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def project_world(scene, camera, coord: Vector, width: int, height: int) -> list[float]:
    ndc = world_to_camera_view(scene, camera, coord)
    return [round(float(ndc.x * width), 2), round(float((1.0 - ndc.y) * height), 2)]


def bone_world(armature: bpy.types.Object, name: str) -> Vector | None:
    pb = armature.pose.bones.get(name)
    if pb is None:
        return None
    return armature.matrix_world @ pb.head


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--glb", default=str(DEFAULT_GLB))
    parser.add_argument("--candidate", default=str(DEFAULT_CANDIDATE))
    parser.add_argument("--out", default=str(DEFAULT_OUT))
    parser.add_argument("--width", type=int, default=960)
    parser.add_argument("--height", type=int, default=720)
    parser.add_argument("--samples", type=int, default=4)
    parser.add_argument("--camera-direction", default="1.45,-0.38,0.20")
    parser.add_argument("--ortho-padding", type=float, default=1.18)
    args = parser.parse_args(argv_after_blender())

    glb = Path(args.glb)
    candidate_path = Path(args.candidate)
    out = Path(args.out)
    if not glb.is_absolute():
        glb = ROOT / glb
    if not candidate_path.is_absolute():
        candidate_path = ROOT / candidate_path
    if not out.is_absolute():
        out = ROOT / out
    out.parent.mkdir(parents=True, exist_ok=True)

    candidate = json.loads(candidate_path.read_text())
    animated_glb = out.parent / "davin-idle-screenshot-1.projection.animated.glb"
    make_animated_candidate_glb(glb, candidate, animated_glb)

    clear_scene()
    bpy.context.scene.render.fps = 24
    objects = import_glb(animated_glb)
    armature = find_armature(objects)
    activate_gltf_animation(armature)
    camera = setup_scene(args.width, args.height, args.samples)
    bpy.context.scene.frame_set(1)
    bpy.context.view_layer.update()
    posed_center, posed_size = posed_mesh_bounds()
    frame_size = max(posed_size.x, posed_size.y, posed_size.z, 1.0)
    camera_direction = camera_direction_from_text(args.camera_direction)
    camera.location = posed_center + camera_direction * frame_size * 2.0
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = max(posed_size.x * args.ortho_padding, posed_size.z * args.ortho_padding, 1.0)
    look_at(camera, posed_center + Vector((0, 0, posed_size.z * 0.04)))
    bpy.context.view_layer.update()

    landmarks = []
    total_error = 0.0
    measured = 0
    for name, target in TARGET_LANDMARKS.items():
        bone_name = target["bone"]
        world = bone_world(armature, bone_name)
        target_px = [round(target["xy"][0] * args.width, 2), round(target["xy"][1] * args.height, 2)]
        projected_px = None
        error_px = None
        if world is not None:
            projected_px = project_world(bpy.context.scene, camera, world, args.width, args.height)
            error_px = round(((projected_px[0] - target_px[0]) ** 2 + (projected_px[1] - target_px[1]) ** 2) ** 0.5, 2)
            total_error += error_px
            measured += 1
        landmarks.append({
            "name": name,
            "role": target["role"],
            "bone": bone_name,
            "targetPx": target_px,
            "projectedPx": projected_px,
            "errorPx": error_px,
        })

    mean_error = round(total_error / measured, 2) if measured else None
    result = {
        "schema": SCHEMA,
        "status": "failed-diagnostic" if mean_error is None or mean_error > 90 else "diagnostic-needs-human-review",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "asset": {"path": str(glb), "sha256": sha256(glb)},
        "candidate": {"path": str(candidate_path), "sha256": sha256(candidate_path)},
        "viewport": {"width": args.width, "height": args.height},
        "camera": {"direction": args.camera_direction, "orthoPadding": args.ortho_padding},
        "meanErrorPx": mean_error,
        "thresholdPx": 90,
        "landmarks": landmarks,
        "note": "Projection diagnostic only. A smoke/build pass cannot accept screenshot pose if these points are visually wrong.",
    }
    out.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({"ok": True, "out": str(out), "status": result["status"], "meanErrorPx": mean_error}, indent=2))


if __name__ == "__main__":
    main()
