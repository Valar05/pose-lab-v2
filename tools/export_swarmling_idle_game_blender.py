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
from bpy_extras import anim_utils
from mathutils import Matrix, Vector


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


def restore_basis(
    armature: bpy.types.Object,
    basis: dict[str, Matrix],
) -> None:
    for name, matrix in basis.items():
        armature.pose.bones[name].matrix_basis = matrix.copy()


def apply_test_idle(
    armature: bpy.types.Object,
    basis: dict[str, Matrix],
    index: int,
    frame_count: int,
) -> None:
    """Add bounded breathing to the source's static Idle pose only."""
    restore_basis(armature, basis)
    phase = math.tau * index / frame_count
    breath = math.sin(phase)
    secondary = math.sin(phase * 2.0) * 0.2
    rotations = {
        "Spine01": math.radians(0.45) * breath,
        "Spine02": math.radians(0.7) * breath,
        "Head": math.radians(-0.35) * breath + math.radians(0.08) * secondary,
    }
    for name, angle in rotations.items():
        bone = armature.pose.bones.get(name)
        if bone is not None:
            bone.matrix_basis = bone.matrix_basis @ Matrix.Rotation(angle, 4, "X")
    chest = armature.pose.bones.get("Spine02")
    if chest is not None:
        chest.scale.z *= 1.0 + 0.004 * breath
    bpy.context.view_layer.update()


def sampled_bounds(
    scene: bpy.types.Scene,
    armature: bpy.types.Object,
    meshes: list[bpy.types.Object],
    frames: list[float],
    authored_basis: dict[str, Matrix] | None,
) -> tuple[Vector, Vector]:
    low = Vector((math.inf, math.inf, math.inf))
    high = Vector((-math.inf, -math.inf, -math.inf))
    for index, frame in enumerate(frames):
        set_pose(scene, frame)
        if authored_basis is not None:
            apply_test_idle(armature, authored_basis, index, len(frames))
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
    animation_data = armature.animation_data_create()
    animation_data.use_nla = False
    animation_data.action = action
    action_slot, skeletal_curves = skeletal_slot(action)
    animation_data.action_slot = action_slot
    action_start, action_end = (float(value) for value in action.frame_range)
    source_fps = float(scene.render.fps) / float(scene.render.fps_base)
    authored_test_idle = action_end <= action_start
    if authored_test_idle:
        duration_seconds = 1.0
        render_frames = [action_start] * args.frame_count
        set_pose(scene, action_start)
        authored_basis = {
            bone.name: bone.matrix_basis.copy() for bone in armature.pose.bones
        }
    else:
        duration_seconds = (action_end - action_start) / source_fps
        render_frames = [
            action_start + (action_end - action_start) * index / args.frame_count
            for index in range(args.frame_count)
        ]
        authored_basis = None
    armature_matrix = flatten_matrix(armature.matrix_world)
    mesh_matrices = {obj.name: flatten_matrix(obj.matrix_world) for obj in meshes}

    low, high = sampled_bounds(
        scene,
        armature,
        meshes,
        render_frames,
        authored_basis,
    )
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
        if authored_basis is not None:
            apply_test_idle(
                armature,
                authored_basis,
                index,
                len(render_frames),
            )
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
            "actionSlot": action_slot.identifier,
            "skeletalCurves": skeletal_curves,
            "actionFrameRange": [round(action_start, 6), round(action_end, 6)],
            "sourceFps": source_fps,
            "durationSeconds": round(duration_seconds, 8),
            "samplePolicy": (
                "six-phase authored breathing loop from one immutable source pose"
                if authored_test_idle
                else "six uniform native loop samples; terminal duplicate excluded"
            ),
            "nativeActionStatic": authored_test_idle,
            "animationModified": authored_test_idle,
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
            "poseAuthoring": (
                "bounded-test-idle-from-static-source"
                if authored_test_idle
                else False
            ),
            "animationModifications": (
                [
                    "Spine01 local-X rotation <= 0.45 degrees",
                    "Spine02 local-X rotation <= 0.7 degrees",
                    "Spine02 local-Z scale <= 0.4 percent",
                    "Head local-X rotation <= 0.43 degrees",
                ]
                if authored_test_idle
                else []
            ),
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
