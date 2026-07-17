#!/usr/bin/env python3
"""Render deterministic local Blender truth frames for Pose Lab V2 assets."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT_ROOT = ROOT / "generated" / "blender-render-truth"
MESHY = ROOT / "public" / "assets" / "meshy" / "meshy_apose_walking_with_skin.glb"
SABRE = ROOT / "public" / "assets" / "meshy" / "meshy_real_sabre.glb"
SCHEMA = "pose-lab-v2-blender-render-truth-v1"
TOOL = "blender_render_pose_truth.py"


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


def import_glb(path: Path) -> list[bpy.types.Object]:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    return [obj for obj in bpy.data.objects if obj not in before]


def scene_bounds(objects: list[bpy.types.Object]) -> tuple[Vector, Vector, Vector]:
    low = Vector((float("inf"), float("inf"), float("inf")))
    high = Vector((float("-inf"), float("-inf"), float("-inf")))
    for obj in objects:
        if obj.type not in {"MESH", "ARMATURE", "EMPTY"}:
            continue
        for corner in obj.bound_box:
            world = obj.matrix_world @ Vector(corner)
            low.x = min(low.x, world.x)
            low.y = min(low.y, world.y)
            low.z = min(low.z, world.z)
            high.x = max(high.x, world.x)
            high.y = max(high.y, world.y)
            high.z = max(high.z, world.z)
    center = (low + high) * 0.5
    size = high - low
    return center, size, high


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    direction = target - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def setup_scene(width: int, height: int, samples: int) -> bpy.types.Object:
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.cycles.use_denoising = False
    for view_layer in scene.view_layers:
        view_layer.cycles.use_denoising = False
    scene.world.color = (0.045, 0.05, 0.055)
    camera = bpy.data.objects.new("truth_camera", bpy.data.cameras.new("truth_camera"))
    bpy.context.collection.objects.link(camera)
    scene.camera = camera
    sun = bpy.data.objects.new("truth_sun", bpy.data.lights.new("truth_sun", "SUN"))
    sun.rotation_euler = (math.radians(42), 0, math.radians(28))
    sun.data.energy = 2.4
    bpy.context.collection.objects.link(sun)
    area = bpy.data.objects.new("truth_softbox", bpy.data.lights.new("truth_softbox", "AREA"))
    area.location = (0, -3, 2.2)
    area.data.energy = 420
    area.data.size = 4
    bpy.context.collection.objects.link(area)
    return camera


def render_view(camera: bpy.types.Object, target: Vector, size: Vector, view: dict, out_dir: Path) -> dict:
    frame_size = max(size.x, size.y, size.z, 1.0)
    direction = Vector(view["direction"]).normalized()
    camera.location = target + direction * frame_size * view["distance"]
    camera.data.lens = view["lens"]
    camera.data.clip_start = 0.01
    camera.data.clip_end = 100
    look_at(camera, target)
    path = out_dir / f"{view['id']}.png"
    bpy.context.scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    return {"id": view["id"], "label": view["label"], "path": str(path.relative_to(out_dir.parent)), "sha256": sha256(path)}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--meshy", default=str(MESHY))
    parser.add_argument("--sabre", default=str(SABRE))
    parser.add_argument("--out-dir", default=str(OUT_ROOT / "default"))
    parser.add_argument("--width", type=int, default=960)
    parser.add_argument("--height", type=int, default=720)
    parser.add_argument("--samples", type=int, default=16)
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    args = parser.parse_args(argv)

    meshy_path = Path(args.meshy)
    sabre_path = Path(args.sabre)
    out_dir = Path(args.out_dir)
    if not meshy_path.is_absolute():
        meshy_path = ROOT / meshy_path
    if not sabre_path.is_absolute():
        sabre_path = ROOT / sabre_path
    if not out_dir.is_absolute():
        out_dir = ROOT / out_dir
    render_dir = out_dir / "renders"
    render_dir.mkdir(parents=True, exist_ok=True)
    clear_scene()
    meshy_objects = import_glb(meshy_path)
    sabre_objects = import_glb(sabre_path)
    # Put the sabre near the right hand region for visibility in baseline truth
    # renders. This is a diagnostic scene assembly, not accepted runtime pose data.
    for obj in sabre_objects:
        obj.location.x += 0.28
        obj.location.y -= 0.1
        obj.location.z += 1.0
        obj.scale = (0.48, 0.48, 0.48)
    camera = setup_scene(args.width, args.height, args.samples)
    center, size, _ = scene_bounds([*meshy_objects, *sabre_objects])
    views = [
        {"id": "fpv", "label": "FPV diagnostic", "direction": (0, -1.7, 0.25), "distance": 1.15, "lens": 24},
        {"id": "front", "label": "Front", "direction": (0, -1, 0.18), "distance": 1.8, "lens": 45},
        {"id": "right", "label": "Right side", "direction": (1, -0.45, 0.2), "distance": 1.8, "lens": 45},
        {"id": "top", "label": "Top", "direction": (0.01, 0.01, 1), "distance": 1.7, "lens": 55},
    ]
    images = [render_view(camera, center, size, view, render_dir) for view in views]
    manifest = {
        "schema": SCHEMA,
        "status": "diagnostic",
        "tool": TOOL,
        "generatedAt": utc_now(),
        "assets": {
            "meshy": {"path": str(meshy_path), "sha256": sha256(meshy_path)},
            "sabre": {"path": str(sabre_path), "sha256": sha256(sabre_path)},
        },
        "blender": bpy.app.version_string,
        "images": images,
        "note": "Local Blender render truth artifact. This does not promote pose data.",
    }
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(str(out_dir / "manifest.json"))


if __name__ == "__main__":
    main()
