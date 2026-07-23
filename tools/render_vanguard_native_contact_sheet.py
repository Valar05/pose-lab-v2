#!/usr/bin/env python3
"""Render Vanguard's native SwordAttack1 from two strict lateral cameras."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def cli_args() -> argparse.Namespace:
    argv = sys.argv
    argv = argv[argv.index("--") + 1 :] if "--" in argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--asset", required=True)
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--action", default="SwordAttack1")
    parser.add_argument("--frames", default="0,3,6,9,12,15,18,21,24,28,33,38")
    parser.add_argument("--width", type=int, default=420)
    parser.add_argument("--height", type=int, default=520)
    return parser.parse_args(argv)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def select_action(name: str) -> bpy.types.Action:
    exact = bpy.data.actions.get(name)
    if exact:
        return exact
    candidates = [
        action
        for action in bpy.data.actions
        if action.name == f"{name}_rig"
    ]
    if len(candidates) != 1:
        raise RuntimeError(
            f"Expected one {name!r} action, found {[action.name for action in bpy.data.actions]}"
        )
    return candidates[0]


def select_armature() -> bpy.types.Object:
    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    if len(armatures) != 1:
        raise RuntimeError(f"Expected one armature, found {[obj.name for obj in armatures]}")
    return armatures[0]


def set_native_pose(
    scene: bpy.types.Scene,
    armature: bpy.types.Object,
    frame: float,
) -> None:
    scene.frame_set(int(frame), subframe=frame - int(frame))
    root = armature.pose.bones.get("root") or armature.pose.bones.get("Root")
    if root:
        root.location = (0.0, 0.0, 0.0)
    bpy.context.view_layer.update()


def evaluated_world_vertices(obj: bpy.types.Object) -> list[Vector]:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    try:
        matrix = evaluated.matrix_world
        return [matrix @ vertex.co for vertex in mesh.vertices]
    finally:
        evaluated.to_mesh_clear()


def sampled_bounds(
    scene: bpy.types.Scene,
    armature: bpy.types.Object,
    mesh_objects: list[bpy.types.Object],
    frames: list[float],
) -> tuple[Vector, Vector]:
    lower = Vector((math.inf, math.inf, math.inf))
    upper = Vector((-math.inf, -math.inf, -math.inf))
    for frame in frames:
        set_native_pose(scene, armature, frame)
        for obj in mesh_objects:
            for point in evaluated_world_vertices(obj):
                for axis in range(3):
                    lower[axis] = min(lower[axis], point[axis])
                    upper[axis] = max(upper[axis], point[axis])
    return lower, upper


def make_camera(scene: bpy.types.Scene) -> bpy.types.Object:
    data = bpy.data.cameras.new("VanguardStrictLateral")
    data.type = "ORTHO"
    data.lens = 50
    camera = bpy.data.objects.new("VanguardStrictLateral", data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    return camera


def aim_camera(
    camera: bpy.types.Object,
    side: str,
    lower: Vector,
    upper: Vector,
    aspect: float,
) -> None:
    center = (lower + upper) * 0.5
    span = upper - lower
    visible_width = span.y
    visible_height = span.z
    camera.data.ortho_scale = max(visible_height * 1.16, (visible_width / aspect) * 1.16)
    distance = max(span.x, visible_width, visible_height) * 3.0 + 3.0
    x = lower.x - distance if side == "left" else upper.x + distance
    camera.location = Vector((x, center.y, center.z))
    direction = center - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def set_workbench_style(scene: bpy.types.Scene, mesh_objects: list[bpy.types.Object]) -> None:
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "WORLD"
    scene.display.shading.background_type = "VIEWPORT"
    scene.display.shading.background_color = (0.018, 0.025, 0.032)
    scene.render.film_transparent = False
    for obj in mesh_objects:
        is_sword = "sword" in obj.name.lower()
        color = (0.42, 0.46, 0.50, 1.0) if is_sword else (0.72, 0.82, 0.86, 1.0)
        for slot in obj.material_slots:
            if slot.material:
                slot.material.diffuse_color = color


def main() -> None:
    args = cli_args()
    asset = Path(args.asset).resolve()
    out_dir = Path(args.out_dir).resolve()
    frames = [float(value) for value in args.frames.split(",") if value.strip()]
    if not asset.is_file():
        raise FileNotFoundError(asset)
    if len(frames) != 12:
        raise RuntimeError(f"Expected 12 source frames, received {frames}")

    clear_scene()
    bpy.ops.import_scene.gltf(filepath=str(asset))
    scene = bpy.context.scene
    armature = select_armature()
    action = select_action(args.action)
    armature.animation_data_create()
    armature.animation_data.action = action
    mesh_objects = [
        obj
        for obj in scene.objects
        if obj.type == "MESH" and not obj.hide_render
    ]
    if not mesh_objects:
        raise RuntimeError("Vanguard GLB imported no renderable mesh objects")

    scene.render.resolution_x = args.width
    scene.render.resolution_y = args.height
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.fps = 60
    set_workbench_style(scene, mesh_objects)

    lower, upper = sampled_bounds(scene, armature, mesh_objects, frames)
    camera = make_camera(scene)
    manifest_frames: list[dict[str, object]] = []
    for side in ("left", "right"):
        side_dir = out_dir / side
        side_dir.mkdir(parents=True, exist_ok=True)
        aim_camera(camera, side, lower, upper, args.width / args.height)
        for index, frame in enumerate(frames):
            set_native_pose(scene, armature, frame)
            file_name = f"f{index:02d}_source-frame-{frame:05.1f}.png"
            path = side_dir / file_name
            scene.render.filepath = str(path)
            bpy.ops.render.render(write_still=True)
            manifest_frames.append(
                {
                    "view": side,
                    "index": index,
                    "sourceFrame": frame,
                    "sourceSecondsAt60Fps": round(frame / 60.0, 6),
                    "image": str(path.relative_to(out_dir)),
                    "sha256": sha256(path),
                }
            )

    manifest = {
        "schema": "fleshpunk-vanguard-native-side-contact-sheet-v1",
        "status": "reference-candidate",
        "source": {
            "repository": "Valar05/pose-lab-v2",
            "commit": "1e44aa47a5b52198b67826712d67e832b951176f",
            "asset": str(asset),
            "assetSha256": sha256(asset),
            "action": action.name,
            "actionFrameRange": [round(value, 6) for value in action.frame_range],
        },
        "contract": {
            "poseAuthority": "native Vanguard SwordAttack1 only",
            "camera": "strict orthographic lateral",
            "views": ["model-left", "model-right"],
            "retargeting": False,
            "poseAuthoring": False,
            "rootMotionSuppressed": True,
        },
        "sampleFrames": frames,
        "bounds": {
            "minimum": [round(value, 6) for value in lower],
            "maximum": [round(value, 6) for value in upper],
        },
        "frames": manifest_frames,
    }
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({"status": "PASS", "outDir": str(out_dir), "frames": len(manifest_frames)}))


if __name__ == "__main__":
    main()
