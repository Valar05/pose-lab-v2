#!/usr/bin/env python3
"""Render six native Swarmling Idle samples through one locked gameplay camera."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


SCHEMA = "pose-lab-v2-swarmling-idle-game-export-v1"


def cli_args() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--blend", required=True, type=Path)
    parser.add_argument("--out-dir", required=True, type=Path)
    parser.add_argument("--action", default="Idle")
    parser.add_argument("--frame-count", type=int, default=6)
    parser.add_argument("--width", type=int, default=512)
    parser.add_argument("--height", type=int, default=512)
    return parser.parse_args(argv)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def flatten_matrix(matrix: object) -> list[float]:
    return [round(float(value), 9) for row in matrix for value in row]


def evaluated_vertices(obj: bpy.types.Object) -> list[Vector]:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    try:
        return [evaluated.matrix_world @ vertex.co for vertex in mesh.vertices]
    finally:
        evaluated.to_mesh_clear()


def set_pose(scene: bpy.types.Scene, frame: float) -> None:
    scene.frame_set(int(frame), subframe=frame - int(frame))
    bpy.context.view_layer.update()


def sampled_bounds(
    scene: bpy.types.Scene,
    meshes: list[bpy.types.Object],
    frames: list[float],
) -> tuple[Vector, Vector]:
    low = Vector((math.inf, math.inf, math.inf))
    high = Vector((-math.inf, -math.inf, -math.inf))
    for frame in frames:
        set_pose(scene, frame)
        for mesh in meshes:
            for point in evaluated_vertices(mesh):
                for axis in range(3):
                    low[axis] = min(low[axis], point[axis])
                    high[axis] = max(high[axis], point[axis])
    if not all(math.isfinite(value) for value in (*low, *high)):
        raise RuntimeError("Swarmling Idle has no finite evaluated mesh bounds")
    return low, high


def make_locked_camera(
    scene: bpy.types.Scene,
    low: Vector,
    high: Vector,
    aspect: float,
) -> bpy.types.Object:
    center = (low + high) * 0.5
    span = high - low
    visible_width = span.y
    visible_height = span.z
    camera_data = bpy.data.cameras.new("SwarmlingIdleLockedCamera")
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = max(
        visible_height * 1.18,
        (visible_width / aspect) * 1.18,
        1.0,
    )
    camera_data.clip_start = 0.01
    camera_data.clip_end = 1000.0
    camera = bpy.data.objects.new("SwarmlingIdleLockedCamera", camera_data)
    scene.collection.objects.link(camera)
    distance = max(span.length * 1.8, 4.0)
    direction = Vector((1.0, 0.0, 0.12)).normalized()
    camera.location = center + direction * distance
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
    scene.camera = camera
    bpy.context.view_layer.update()
    return camera


def configure_render(scene: bpy.types.Scene, width: int, height: int, fps: float) -> None:
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.image_settings.compression = 15
    scene.render.film_transparent = True
    scene.render.fps = max(1, round(fps))
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "WORLD"
    scene.view_settings.look = "AgX - Medium High Contrast"


def main() -> None:
    args = cli_args()
    root = Path(__file__).resolve().parents[1]
    blend = args.blend if args.blend.is_absolute() else root / args.blend
    out_dir = args.out_dir if args.out_dir.is_absolute() else root / args.out_dir
    blend = blend.resolve()
    out_dir = out_dir.resolve()
    if not blend.is_file():
        raise FileNotFoundError(f"Swarmling source blend not found: {blend}")
    if args.frame_count != 6:
        raise RuntimeError("Swarmling test Idle contract requires exactly six frames")
    if args.width != 512 or args.height != 512:
        raise RuntimeError("Swarmling test Idle contract requires 512x512 frames")

    bpy.ops.wm.open_mainfile(filepath=str(blend))
    scene = bpy.context.scene
    armatures = [obj for obj in scene.objects if obj.type == "ARMATURE"]
    if len(armatures) != 1:
        raise RuntimeError(
            f"Expected one Swarmling armature, found {[obj.name for obj in armatures]}"
        )
    meshes = [obj for obj in scene.objects if obj.type == "MESH" and not obj.hide_render]
    if not meshes:
        raise RuntimeError("Swarmling source has no renderable meshes")
    action = bpy.data.actions.get(args.action)
    if action is None:
        raise RuntimeError(
            f"Native action {args.action!r} missing; found {[item.name for item in bpy.data.actions]}"
        )

    armature = armatures[0]
    armature.animation_data_create()
    armature.animation_data.action = action
    action_start, action_end = (float(value) for value in action.frame_range)
    if action_end <= action_start:
        raise RuntimeError(f"Idle action has invalid frame range {action.frame_range[:]}")
    source_fps = float(scene.render.fps) / float(scene.render.fps_base)
    duration_seconds = (action_end - action_start) / source_fps
    render_frames = [
        action_start + (action_end - action_start) * index / args.frame_count
        for index in range(args.frame_count)
    ]
    armature_matrix = flatten_matrix(armature.matrix_world)
    mesh_matrices = {obj.name: flatten_matrix(obj.matrix_world) for obj in meshes}

    low, high = sampled_bounds(scene, meshes, render_frames)
    camera = make_locked_camera(scene, low, high, args.width / args.height)
    configure_render(scene, args.width, args.height, args.frame_count / duration_seconds)
    camera_matrix = flatten_matrix(camera.matrix_world)
    camera_scale = round(float(camera.data.ortho_scale), 9)
    frame_duration_ms = duration_seconds * 1000.0 / args.frame_count

    out_dir.mkdir(parents=True, exist_ok=True)
    for pattern in ("idle_*.png", "metadata.json"):
        for stale in out_dir.glob(pattern):
            stale.unlink()

    records: list[dict[str, object]] = []
    for index, source_frame in enumerate(render_frames):
        set_pose(scene, source_frame)
        if flatten_matrix(armature.matrix_world) != armature_matrix:
            raise RuntimeError(f"Armature object transform changed at sample {index}")
        for mesh in meshes:
            if flatten_matrix(mesh.matrix_world) != mesh_matrices[mesh.name]:
                raise RuntimeError(f"Mesh object transform changed at sample {index}: {mesh.name}")
        if (
            flatten_matrix(camera.matrix_world) != camera_matrix
            or round(float(camera.data.ortho_scale), 9) != camera_scale
        ):
            raise RuntimeError(f"Locked camera changed at sample {index}")

        image_name = f"idle_{index:04d}.png"
        image_path = out_dir / image_name
        scene.render.filepath = str(image_path)
        bpy.ops.render.render(write_still=True)
        if not image_path.is_file():
            raise RuntimeError(f"Blender did not write {image_path}")
        records.append(
            {
                "frame": index,
                "sourceFrame": round(source_frame, 6),
                "image": image_name,
                "imageSha256": sha256(image_path),
                "frameDurationMs": round(frame_duration_ms, 6),
                "cameraMatrixWorld": camera_matrix,
                "cameraOrthoScale": camera_scale,
                "armatureMatrixWorld": armature_matrix,
                "meshMatricesWorld": mesh_matrices,
            }
        )

    metadata = {
        "schema": SCHEMA,
        "status": "rendered-pending-verification",
        "source": {
            "repository": "Valar05/pose-lab-v2",
            "asset": str(blend.relative_to(root)),
            "assetSha256": sha256(blend),
            "actionRequested": args.action,
            "actionResolved": action.name,
            "actionFrameRange": [round(action_start, 6), round(action_end, 6)],
            "sourceFps": source_fps,
            "durationSeconds": round(duration_seconds, 8),
            "samplePolicy": "six uniform native loop samples; terminal duplicate excluded",
            "animationModified": False,
        },
        "output": {
            "width": args.width,
            "height": args.height,
            "frameCount": args.frame_count,
            "background": "transparent",
            "colorMode": "RGBA",
        },
        "contract": {
            "facing": "screen-left",
            "cameraView": "world_pos_x",
            "camera": "one locked orthographic side-view camera",
            "cameraType": camera.data.type,
            "cameraMatrixWorld": camera_matrix,
            "cameraOrthoScale": camera_scale,
            "armatureMatrixWorld": armature_matrix,
            "meshMatricesWorld": mesh_matrices,
            "retargeting": False,
            "poseAuthoring": False,
            "animationModifications": [],
        },
        "frames": records,
        "verification": {"status": "PENDING", "failures": []},
    }
    (out_dir / "metadata.json").write_text(json.dumps(metadata, indent=2) + "\n")
    print(
        json.dumps(
            {
                "status": "RENDERED",
                "action": action.name,
                "sourceRange": [action_start, action_end],
                "sourceFps": source_fps,
                "durationSeconds": duration_seconds,
                "frames": len(records),
                "outDir": str(out_dir),
            }
        )
    )


if __name__ == "__main__":
    main()
