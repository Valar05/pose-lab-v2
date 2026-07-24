#!/usr/bin/env python3
"""Render Ivory Knight with the native Great Sword Idle frame-zero action.

This is a diagnostic only. It proves that the target FBX and the motion-only
FBX share a usable Mixamo action vocabulary before any direct pose correction.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


SIDE_VIEW_DIRECTIONS = {
    "pos_x": Vector((1.0, 0.0, 0.0)),
    "neg_x": Vector((-1.0, 0.0, 0.0)),
}
SAMPLE_FACTORS = (0.0, 0.25, 0.5, 0.75, 1.0)


def cli_args() -> argparse.Namespace:
    argv = sys.argv
    argv = argv[argv.index("--") + 1 :] if "--" in argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", required=True)
    parser.add_argument("--motion", required=True)
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--width", type=int, default=512)
    parser.add_argument("--height", type=int, default=512)
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
        bpy.data.actions,
        bpy.data.armatures,
        bpy.data.cameras,
        bpy.data.materials,
        bpy.data.meshes,
    ):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def import_fbx(path: Path) -> tuple[list[bpy.types.Object], list[bpy.types.Action]]:
    objects_before = set(bpy.data.objects)
    actions_before = set(bpy.data.actions)
    bpy.ops.import_scene.fbx(
        filepath=str(path),
        use_anim=True,
        automatic_bone_orientation=False,
    )
    objects = [obj for obj in bpy.data.objects if obj not in objects_before]
    actions = [action for action in bpy.data.actions if action not in actions_before]
    return objects, actions


def one_armature(objects: list[bpy.types.Object], label: str) -> bpy.types.Object:
    armatures = [obj for obj in objects if obj.type == "ARMATURE"]
    if len(armatures) != 1:
        raise RuntimeError(
            f"Expected one {label} armature, found {[obj.name for obj in armatures]}"
        )
    return armatures[0]


def motion_action(
    source_armature: bpy.types.Object,
    imported_actions: list[bpy.types.Action],
) -> bpy.types.Action:
    if source_armature.animation_data and source_armature.animation_data.action:
        return source_armature.animation_data.action
    candidates = [action for action in imported_actions if action.fcurves]
    if len(candidates) != 1:
        raise RuntimeError(
            "Expected exactly one imported motion action, found "
            f"{[(action.name, len(action.fcurves)) for action in candidates]}"
        )
    return candidates[0]


def target_meshes(
    objects: list[bpy.types.Object],
    armature: bpy.types.Object,
) -> list[bpy.types.Object]:
    meshes: list[bpy.types.Object] = []
    for obj in objects:
        if obj.type != "MESH":
            continue
        owns_target = obj.parent == armature or any(
            modifier.type == "ARMATURE" and modifier.object == armature
            for modifier in obj.modifiers
        )
        if owns_target:
            meshes.append(obj)
    if not meshes:
        raise RuntimeError("The target import produced no skinned mesh")
    return meshes


def evaluated_world_bounds(
    objects: list[bpy.types.Object],
) -> tuple[Vector, Vector]:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    lower = Vector((math.inf, math.inf, math.inf))
    upper = Vector((-math.inf, -math.inf, -math.inf))
    for obj in objects:
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        try:
            for vertex in mesh.vertices:
                point = evaluated.matrix_world @ vertex.co
                for axis in range(3):
                    lower[axis] = min(lower[axis], point[axis])
                    upper[axis] = max(upper[axis], point[axis])
        finally:
            evaluated.to_mesh_clear()
    if not all(math.isfinite(value) for value in (*lower, *upper)):
        raise RuntimeError("Unable to determine evaluated target bounds")
    return lower, upper


def evaluated_world_bounds_over_frames(
    scene: bpy.types.Scene,
    objects: list[bpy.types.Object],
    frames: list[float],
) -> tuple[Vector, Vector]:
    lower = Vector((math.inf, math.inf, math.inf))
    upper = Vector((-math.inf, -math.inf, -math.inf))
    for frame in frames:
        scene.frame_set(int(frame), subframe=frame - int(frame))
        bpy.context.view_layer.update()
        frame_lower, frame_upper = evaluated_world_bounds(objects)
        for axis in range(3):
            lower[axis] = min(lower[axis], frame_lower[axis])
            upper[axis] = max(upper[axis], frame_upper[axis])
    return lower, upper


def make_camera(
    name: str,
    view_direction: Vector,
    lower: Vector,
    upper: Vector,
    aspect: float,
) -> bpy.types.Object:
    center = (lower + upper) * 0.5
    extent = upper - lower
    distance = max(extent.length * 2.0, 5.0)
    data = bpy.data.cameras.new(name)
    data.type = "ORTHO"
    camera = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(camera)
    camera.location = center + view_direction.normalized() * distance
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()

    if abs(view_direction.x) > 0.5:
        visible_width = extent.y
    else:
        visible_width = extent.x
    visible_height = extent.z
    data.ortho_scale = max(
        visible_height * 1.18,
        (visible_width / max(aspect, 1e-6)) * 1.18,
        0.0001,
    )
    return camera


def configure_render(scene: bpy.types.Scene, width: int, height: int) -> None:
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.film_transparent = True
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "OBJECT"
    scene.display.shading.show_shadows = False
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "WORLD"
    scene.display.shading.show_specular_highlight = True


def matrix_values(matrix) -> list[float]:
    return [round(float(value), 8) for row in matrix for value in row]


def main() -> None:
    args = cli_args()
    root = Path(__file__).resolve().parents[1]
    target_path = (root / args.target).resolve()
    motion_path = (root / args.motion).resolve()
    out_dir = (root / args.out_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    if not target_path.is_file():
        raise FileNotFoundError(target_path)
    if not motion_path.is_file():
        raise FileNotFoundError(motion_path)

    clear_scene()
    target_objects, _ = import_fbx(target_path)
    target_armature = one_armature(target_objects, "target")
    meshes = target_meshes(target_objects, target_armature)
    target_bones = {bone.name for bone in target_armature.pose.bones}

    source_objects, imported_actions = import_fbx(motion_path)
    source_armature = one_armature(source_objects, "motion")
    action = motion_action(source_armature, imported_actions)
    source_bones = {bone.name for bone in source_armature.pose.bones}
    missing_target_bones = sorted(source_bones - target_bones)
    if missing_target_bones:
        raise RuntimeError(
            "Motion skeleton contains bones absent from target: "
            + ", ".join(missing_target_bones)
        )

    target_armature.animation_data_create()
    target_armature.animation_data.action = action
    action_start, action_end = (float(value) for value in action.frame_range)
    frames = sorted(
        {
            round(action_start + (action_end - action_start) * factor, 4)
            for factor in SAMPLE_FACTORS
        }
    )
    scene = bpy.context.scene

    for obj in source_objects:
        obj.hide_render = True
        obj.hide_set(True)
    for mesh in meshes:
        mesh.color = (0.72, 0.68, 0.60, 1.0)
    configure_render(scene, args.width, args.height)
    lower, upper = evaluated_world_bounds_over_frames(scene, meshes, frames)

    cameras: dict[str, bpy.types.Object] = {}
    for name, direction in SIDE_VIEW_DIRECTIONS.items():
        camera = make_camera(
            f"IvoryBaseline_{name}",
            direction,
            lower,
            upper,
            args.width / args.height,
        )
        cameras[name] = camera

    rendered: list[dict[str, object]] = []
    poses: dict[str, dict[str, list[float]]] = {}
    for frame in frames:
        scene.frame_set(int(frame), subframe=frame - int(frame))
        bpy.context.view_layer.update()
        poses[str(frame)] = {
            bone.name: matrix_values(bone.matrix_basis)
            for bone in target_armature.pose.bones
        }
        frame_label = f"{frame:07.3f}".replace(".", "_")
        for name, camera in cameras.items():
            scene.camera = camera
            output = out_dir / f"ivory_native_idle_{frame_label}_{name}.png"
            scene.render.filepath = str(output)
            bpy.ops.render.render(write_still=True)
            rendered.append(
                {
                    "frame": frame,
                    "view": name,
                    "file": output.name,
                }
            )
    for camera in cameras.values():
        bpy.data.objects.remove(camera, do_unlink=True)

    inventory = {
        "schema": "pose-lab-v2-ivory-native-idle-baseline-v1",
        "status": "diagnostic-only",
        "target": {
            "path": str(target_path.relative_to(root)),
            "sha256": sha256(target_path),
            "armature": target_armature.name,
            "boneCount": len(target_bones),
        },
        "motion": {
            "path": str(motion_path.relative_to(root)),
            "sha256": sha256(motion_path),
            "armature": source_armature.name,
            "boneCount": len(source_bones),
            "action": action.name,
            "frameRange": [float(value) for value in action.frame_range],
            "sampledFrames": frames,
            "fcurveCount": len(action.fcurves),
            "missingTargetBones": missing_target_bones,
        },
        "render": {
            "width": args.width,
            "height": args.height,
            "renders": rendered,
            "bounds": {
                "lower": [round(float(value), 8) for value in lower],
                "upper": [round(float(value), 8) for value in upper],
            },
