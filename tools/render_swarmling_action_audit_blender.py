#!/usr/bin/env python3
"""Render comparable samples of every native Swarmling action and action slot."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from bpy_extras import anim_utils
from mathutils import Vector


def cli_args() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--blend", required=True, type=Path)
    parser.add_argument("--out-dir", required=True, type=Path)
    parser.add_argument("--actions", default="Idle,Attack,Damaged,Hurt")
    parser.add_argument("--samples", type=int, default=6)
    parser.add_argument("--size", type=int, default=384)
    return parser.parse_args(argv)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def evaluated_vertices(obj: bpy.types.Object) -> list[Vector]:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    try:
        return [evaluated.matrix_world @ vertex.co for vertex in mesh.vertices]
    finally:
        evaluated.to_mesh_clear()


def skeletal_slot(action: bpy.types.Action) -> tuple[object, int]:
    candidates: list[tuple[int, object]] = []
    for slot in getattr(action, "slots", []):
        channelbag = anim_utils.action_get_channelbag_for_slot(action, slot)
        curves = list(channelbag.fcurves) if channelbag else []
        score = sum("pose.bones[" in curve.data_path for curve in curves)
        candidates.append((score, slot))
    if not candidates:
        raise RuntimeError(f"Action {action.name!r} exposes no assignable slots")
    score, slot = max(candidates, key=lambda item: item[0])
    if score <= 0:
        raise RuntimeError(f"Action {action.name!r} has no skeletal action slot")
    return slot, score


def bind_action(
    armature: bpy.types.Object,
    action: bpy.types.Action,
) -> tuple[str, int]:
    data = armature.animation_data_create()
    data.use_nla = False
    data.action = action
    slot, curve_count = skeletal_slot(action)
    data.action_slot = slot
    return slot.identifier, curve_count


def set_pose(scene: bpy.types.Scene, frame: float) -> None:
    scene.frame_set(int(frame), subframe=frame - int(frame))
    bpy.context.view_layer.update()


def make_camera(
    scene: bpy.types.Scene,
    low: Vector,
    high: Vector,
    size: int,
) -> bpy.types.Object:
    center = (low + high) * 0.5
    span = high - low
    data = bpy.data.cameras.new("SwarmlingActionAuditCamera")
    data.type = "ORTHO"
    data.ortho_scale = max(span.z * 1.18, span.y * 1.18, 1.0)
    data.clip_start = 0.01
    data.clip_end = 1000.0
    camera = bpy.data.objects.new("SwarmlingActionAuditCamera", data)
    scene.collection.objects.link(camera)
    direction = Vector((1.0, 0.0, 0.12)).normalized()
    camera.location = center + direction * max(span.length * 1.8, 4.0)
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
    scene.camera = camera
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.resolution_x = size
    scene.render.resolution_y = size
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "WORLD"
    return camera


def main() -> None:
    args = cli_args()
    root = Path(__file__).resolve().parents[1]
    blend = args.blend if args.blend.is_absolute() else root / args.blend
    out_dir = args.out_dir if args.out_dir.is_absolute() else root / args.out_dir
    blend = blend.resolve()
    out_dir = out_dir.resolve()
    bpy.ops.wm.open_mainfile(filepath=str(blend))
    scene = bpy.context.scene
    armatures = [obj for obj in scene.objects if obj.type == "ARMATURE"]
    meshes = [obj for obj in scene.objects if obj.type == "MESH" and not obj.hide_render]
    if len(armatures) != 1 or not meshes:
        raise RuntimeError(
            f"Expected one armature and renderable meshes; found {len(armatures)}, {len(meshes)}"
        )
    armature = armatures[0]
    requested = [name.strip() for name in args.actions.split(",") if name.strip()]
    actions = []
    for name in requested:
        action = bpy.data.actions.get(name)
        if action is None:
            raise RuntimeError(f"Missing audit action {name!r}")
        actions.append(action)

    action_samples: dict[str, list[float]] = {}
    bindings: dict[str, dict[str, object]] = {}
    low = Vector((math.inf, math.inf, math.inf))
    high = Vector((-math.inf, -math.inf, -math.inf))
    for action in actions:
        slot, skeletal_curves = bind_action(armature, action)
        start, end = (float(value) for value in action.frame_range)
        frames = (
            [start] * args.samples
            if end <= start
            else [
                start + (end - start) * index / args.samples
                for index in range(args.samples)
            ]
        )
        action_samples[action.name] = frames
        bindings[action.name] = {
            "slot": slot,
            "skeletalCurves": skeletal_curves,
            "frameRange": [start, end],
        }
        for frame in frames:
            set_pose(scene, frame)
            for mesh in meshes:
                for point in evaluated_vertices(mesh):
                    for axis in range(3):
                        low[axis] = min(low[axis], point[axis])
                        high[axis] = max(high[axis], point[axis])
    if not all(math.isfinite(value) for value in (*low, *high)):
        raise RuntimeError("Action audit found no finite evaluated bounds")
    camera = make_camera(scene, low, high, args.size)
    camera_matrix = [
        round(float(value), 9) for row in camera.matrix_world for value in row
    ]
    camera_scale = round(float(camera.data.ortho_scale), 9)

    out_dir.mkdir(parents=True, exist_ok=True)
    records = []
    for action in actions:
        slot, skeletal_curves = bind_action(armature, action)
        for index, frame in enumerate(action_samples[action.name]):
            set_pose(scene, frame)
            image_name = f"{action.name.lower()}_{index:02d}.png"
            image_path = out_dir / image_name
            scene.render.filepath = str(image_path)
            bpy.ops.render.render(write_still=True)
            records.append(
                {
                    "action": action.name,
                    "slot": slot,
                    "skeletalCurves": skeletal_curves,
                    "sample": index,
                    "sourceFrame": round(frame, 6),
                    "image": image_name,
                    "sha256": sha256(image_path),
                }
            )

    manifest = {
        "schema": "pose-lab-v2-swarmling-action-audit-v1",
        "source": str(blend.relative_to(root)),
        "sourceSha256": sha256(blend),
        "view": "world_pos_x",
        "cameraMatrixWorld": camera_matrix,
        "cameraOrthoScale": camera_scale,
        "bindings": bindings,
        "records": records,
    }
    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({"ok": True, "actions": bindings, "renders": len(records)}))


if __name__ == "__main__":
    main()
