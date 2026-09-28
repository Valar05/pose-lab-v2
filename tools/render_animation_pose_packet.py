#!/usr/bin/env python3
"""Render a native animation into a single-camera, machine-auditable pose packet.

This script is intentionally appearance-blind. It samples the embedded action,
locks one orthographic camera for the entire sequence, and emits geometry
evidence. It never retargets, solves IK, names a stance, or authors a pose.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import sys
from collections import defaultdict
from pathlib import Path
from typing import Iterable

import bpy
from bpy_extras import anim_utils
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector


POSE_PACKET_SCHEMA = "animation-pose-packet-v1"
PASS_NAMES = ("beauty", "silhouette", "limb-id", "depth")
LIMB_COLORS = {
    "head": (0.98, 0.78, 0.18, 1.0),
    "torso": (0.58, 0.62, 0.68, 1.0),
    "left-shoulder": (0.56, 0.10, 0.08, 1.0),
    "left-upper-arm": (0.88, 0.16, 0.12, 1.0),
    "left-forearm": (1.00, 0.43, 0.08, 1.0),
    "left-hand": (1.00, 0.82, 0.12, 1.0),
    "right-shoulder": (0.10, 0.30, 0.62, 1.0),
    "right-upper-arm": (0.08, 0.58, 0.92, 1.0),
    "right-forearm": (0.16, 0.82, 0.95, 1.0),
    "right-hand": (0.54, 0.92, 0.98, 1.0),
    "left-upper-leg": (0.42, 0.78, 0.18, 1.0),
    "left-lower-leg": (0.66, 0.92, 0.22, 1.0),
    "left-foot": (0.82, 1.00, 0.42, 1.0),
    "right-upper-leg": (0.50, 0.18, 0.72, 1.0),
    "right-lower-leg": (0.72, 0.28, 0.92, 1.0),
    "right-foot": (0.90, 0.54, 1.00, 1.0),
    "weapon": (0.98, 0.98, 0.98, 1.0),
    "other": (0.34, 0.24, 0.18, 1.0),
}


def cli_args() -> argparse.Namespace:
    argv = sys.argv
    argv = argv[argv.index("--") + 1 :] if "--" in argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--asset", required=True)
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--action", required=True)
    parser.add_argument("--frames", required=True)
    parser.add_argument("--source-fps", type=float, default=60.0)
    parser.add_argument("--camera-side", choices=("left", "right"), required=True)
    parser.add_argument("--width", type=int, default=420)
    parser.add_argument("--height", type=int, default=520)
    parser.add_argument("--columns", type=int, default=4)
    parser.add_argument("--rows", type=int, default=3)
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
    candidates = [action for action in bpy.data.actions if action.name == f"{name}_rig"]
    if len(candidates) != 1:
        raise RuntimeError(
            f"Expected exactly one action named {name!r} or {name + '_rig'!r}; "
            f"found {[action.name for action in bpy.data.actions]}"
        )
    return candidates[0]


def select_armature() -> bpy.types.Object:
    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    if len(armatures) != 1:
        raise RuntimeError(f"Expected one armature, found {[obj.name for obj in armatures]}")
    return armatures[0]


def action_fcurves(
    action: bpy.types.Action,
    armature: bpy.types.Object,
) -> Iterable[bpy.types.FCurve]:
    animation_data = armature.animation_data
    action_slot = getattr(animation_data, "action_slot", None)
    get_channelbag = getattr(anim_utils, "action_get_channelbag_for_slot", None)
    if action_slot is not None and get_channelbag is not None:
        channelbag = get_channelbag(action, action_slot)
        if channelbag is not None:
            return list(channelbag.fcurves)
    return list(action.fcurves)


def suppress_root_motion(action: bpy.types.Action, armature: bpy.types.Object) -> list[str]:
    root_names = {bone.name for bone in armature.pose.bones if bone.name.lower() == "root"}
    root_paths = {f'pose.bones["{name}"].location' for name in root_names}
    muted: list[str] = []
    for fcurve in action_fcurves(action, armature):
        if fcurve.data_path == "location" or fcurve.data_path in root_paths:
            fcurve.mute = True
            muted.append(f"{fcurve.data_path}[{fcurve.array_index}]")
    return muted


def set_native_pose(scene: bpy.types.Scene, armature: bpy.types.Object, frame: float) -> None:
    scene.frame_set(int(frame), subframe=frame - int(frame))
    armature.location = (0.0, 0.0, 0.0)
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
    data = bpy.data.cameras.new("PosePacketLockedOrthographicCamera")
    data.type = "ORTHO"
    camera = bpy.data.objects.new("PosePacketLockedOrthographicCamera", data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    return camera


def lock_camera(
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
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.view_layer.update()


def flatten_matrix(matrix: object) -> list[float]:
    return [round(float(value), 9) for row in matrix for value in row]


def normalized_name(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", name.lower())


def bone_side(name: str) -> str | None:
    lower = name.lower()
    compact = normalized_name(name)
    if (
        "left" in compact
        or lower.endswith((".l", "_l", "-l"))
        or lower.startswith(("l_", "l-", "l."))
    ):
        return "left"
    if (
        "right" in compact
        or lower.endswith((".r", "_r", "-r"))
        or lower.startswith(("r_", "r-", "r."))
    ):
        return "right"
    return None


def semantic_role(name: str) -> str | None:
    compact = normalized_name(name)
    side = bone_side(name)
    if any(token in compact for token in ("head", "skull")):
        return "head"
    if any(token in compact for token in ("hips", "pelvis", "spine", "chest", "torso", "neck")):
        return "torso"
    if side:
        if any(token in compact for token in ("clavicle", "shoulder")):
            return f"{side}-shoulder"
        if "forearm" in compact or "lowerarm" in compact:
            return f"{side}-forearm"
        if "upperarm" in compact or compact.endswith("arm"):
            return f"{side}-upper-arm"
        if "hand" in compact or "wrist" in compact:
            return f"{side}-hand"
        if any(token in compact for token in ("thigh", "upleg", "upperleg")):
            return f"{side}-upper-leg"
        if any(token in compact for token in ("shin", "calf", "leg", "lowerleg")):
            return f"{side}-lower-leg"
        if any(token in compact for token in ("foot", "ankle", "toe")):
            return f"{side}-foot"
    return None


def is_weapon_object(obj: bpy.types.Object) -> bool:
    compact = normalized_name(obj.name)
    return any(token in compact for token in ("sword", "weapon", "blade", "saber", "sabre"))


def material(name: str, color: tuple[float, float, float, float]) -> bpy.types.Material:
    existing = bpy.data.materials.get(name)
    if existing:
        return existing
    created = bpy.data.materials.new(name)
    created.diffuse_color = color
    return created


def configure_workbench(scene: bpy.types.Scene, mesh_objects: list[bpy.types.Object]) -> None:
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "FLAT"
    scene.display.shading.show_shadows = False
    scene.display.shading.show_cavity = False
    scene.display.shading.background_type = "VIEWPORT"
    scene.display.shading.background_color = (0.012, 0.016, 0.021)
    scene.render.film_transparent = False
    for obj in mesh_objects:
        obj.color = (
            (0.96, 0.97, 1.0, 1.0)
            if is_weapon_object(obj)
            else (0.62, 0.72, 0.82, 1.0)
        )


def install_limb_materials(mesh_objects: list[bpy.types.Object]) -> dict[str, int]:
    indices: dict[str, int] = {}
    for obj in mesh_objects:
        for role, color in LIMB_COLORS.items():
            obj.data.materials.append(material(f"PosePacket-{role}", color))
            indices[f"{obj.name}:{role}"] = len(obj.data.materials) - 1
    return indices


def dominant_polygon_role(obj: bpy.types.Object, polygon: bpy.types.MeshPolygon) -> str:
    if is_weapon_object(obj):
        return "weapon"
    weights: defaultdict[str, float] = defaultdict(float)
    for vertex_index in polygon.vertices:
        vertex = obj.data.vertices[vertex_index]
        for membership in vertex.groups:
            if membership.group >= len(obj.vertex_groups):
                continue
            role = semantic_role(obj.vertex_groups[membership.group].name)
            if role:
                weights[role] += membership.weight
    return max(weights, key=weights.get) if weights else "other"


def assign_limb_ids(mesh_objects: list[bpy.types.Object], indices: dict[str, int]) -> None:
    for obj in mesh_objects:
        for polygon in obj.data.polygons:
            role = dominant_polygon_role(obj, polygon)
            polygon.material_index = indices[f"{obj.name}:{role}"]


def install_depth_materials(
    mesh_objects: list[bpy.types.Object],
    buckets: int = 64,
) -> dict[str, list[int]]:
    result: dict[str, list[int]] = {}
    for obj in mesh_objects:
        object_indices = []
        for bucket in range(buckets):
            value = bucket / max(1, buckets - 1)
            obj.data.materials.append(
                material(f"PosePacket-depth-{bucket:02d}", (value, value, value, 1.0))
            )
            object_indices.append(len(obj.data.materials) - 1)
        result[obj.name] = object_indices
    return result


def sampled_camera_depth_range(
    scene: bpy.types.Scene,
    armature: bpy.types.Object,
    camera: bpy.types.Object,
    mesh_objects: list[bpy.types.Object],
    frames: list[float],
) -> tuple[float, float]:
    camera_inverse = camera.matrix_world.inverted()
    minimum = math.inf
    maximum = -math.inf
    for frame in frames:
        set_native_pose(scene, armature, frame)
        for obj in mesh_objects:
            for point in evaluated_world_vertices(obj):
                depth = -(camera_inverse @ point).z
                minimum = min(minimum, depth)
                maximum = max(maximum, depth)
    return minimum, maximum


def assign_depth_ids(
    obj: bpy.types.Object,
    camera: bpy.types.Object,
    minimum: float,
    maximum: float,
    material_indices: list[int],
) -> None:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    try:
        if len(mesh.polygons) != len(obj.data.polygons):
            raise RuntimeError(
                f"Depth pass requires stable topology for {obj.name}: "
                f"{len(obj.data.polygons)} source polygons != {len(mesh.polygons)} evaluated"
            )
        matrix = evaluated.matrix_world
        camera_inverse = camera.matrix_world.inverted()
        span = max(maximum - minimum, 1e-9)
        for source_polygon, evaluated_polygon in zip(obj.data.polygons, mesh.polygons):
            depths = [
                -(camera_inverse @ (matrix @ mesh.vertices[index].co)).z
                for index in evaluated_polygon.vertices
            ]
            normalized = min(1.0, max(0.0, (sum(depths) / len(depths) - minimum) / span))
            bucket = int(round(normalized * (len(material_indices) - 1)))
            source_polygon.material_index = material_indices[bucket]
    finally:
        evaluated.to_mesh_clear()


def project_point(
    scene: bpy.types.Scene,
    camera: bpy.types.Object,
    point: Vector,
) -> dict[str, float | bool]:
    projected = world_to_camera_view(scene, camera, point)
    return {
        "x": round(float(projected.x), 8),
        "y": round(float(1.0 - projected.y), 8),
        "depth": round(float(projected.z), 8),
        "inFrame": bool(0.0 <= projected.x <= 1.0 and 0.0 <= projected.y <= 1.0),
    }


def weighted_bone_names(mesh_objects: list[bpy.types.Object]) -> set[str]:
    names: set[str] = set()
    for obj in mesh_objects:
        for vertex in obj.data.vertices:
            for membership in vertex.groups:
                if membership.weight <= 1e-6 or membership.group >= len(obj.vertex_groups):
                    continue
                names.add(obj.vertex_groups[membership.group].name)
    return names


def capture_joints(
    scene: bpy.types.Scene,
    camera: bpy.types.Object,
    armature: bpy.types.Object,
    weighted_bones: set[str],
) -> list[dict[str, object]]:
    joints = []
    for bone in armature.pose.bones:
        if bone.name not in weighted_bones:
            continue
        role = semantic_role(bone.name)
        if not role:
            continue
        head = armature.matrix_world @ bone.head
        tail = armature.matrix_world @ bone.tail
        joints.append(
            {
                "bone": bone.name,
                "parent": bone.parent.name if bone.parent else None,
                "role": role,
                "head": project_point(scene, camera, head),
                "tail": project_point(scene, camera, tail),
            }
        )
    joints.sort(key=lambda item: str(item["bone"]))
    return joints


def principal_axis_endpoints(points: list[Vector]) -> tuple[Vector, Vector]:
    if len(points) < 2:
        raise RuntimeError("Weapon endpoint extraction requires at least two vertices")
    center = sum(points, Vector((0.0, 0.0, 0.0))) / len(points)
    covariance = [[0.0] * 3 for _ in range(3)]
    for point in points:
        delta = point - center
        for row in range(3):
            for column in range(3):
                covariance[row][column] += delta[row] * delta[column]
    vector = Vector((1.0, 1.0, 1.0)).normalized()
    for _ in range(32):
        candidate = Vector(
            tuple(sum(covariance[row][column] * vector[column] for column in range(3)) for row in range(3))
        )
        if candidate.length < 1e-12:
            break
        vector = candidate.normalized()
    projections = [(point - center).dot(vector) for point in points]
    return center + vector * min(projections), center + vector * max(projections)


def capture_weapon(
    scene: bpy.types.Scene,
    camera: bpy.types.Object,
    armature: bpy.types.Object,
    mesh_objects: list[bpy.types.Object],
) -> dict[str, object] | None:
    weapons = [obj for obj in mesh_objects if is_weapon_object(obj)]
    if len(weapons) != 1:
        return {
            "status": "ambiguous",
            "objects": [obj.name for obj in weapons],
        }
    weapon = weapons[0]
    first, second = principal_axis_endpoints(evaluated_world_vertices(weapon))
    hand_points = [
        armature.matrix_world @ bone.tail
        for bone in armature.pose.bones
        if semantic_role(bone.name) in ("left-hand", "right-hand")
    ]
    if hand_points:
        first_distance = min((first - hand).length for hand in hand_points)
        second_distance = min((second - hand).length for hand in hand_points)
        hilt, tip = (first, second) if first_distance <= second_distance else (second, first)
    else:
        hilt, tip = first, second
    return {
        "status": "measured",
        "object": weapon.name,
        "hilt": project_point(scene, camera, hilt),
        "tip": project_point(scene, camera, tip),
    }


def set_pass_style(scene: bpy.types.Scene, pass_name: str) -> None:
    if pass_name == "beauty":
        scene.display.shading.color_type = "OBJECT"
    elif pass_name == "silhouette":
        scene.display.shading.color_type = "SINGLE"
        scene.display.shading.single_color = (1.0, 1.0, 1.0)
    else:
        scene.display.shading.color_type = "MATERIAL"


def render_frame(
    scene: bpy.types.Scene,
    path: Path,
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    if not path.is_file():
        raise RuntimeError(f"Blender reported success but did not write {path}")


def main() -> None:
    args = cli_args()
    asset = Path(args.asset).resolve()
    out_dir = Path(args.out_dir).resolve()
    source_frames = [float(value) for value in args.frames.split(",") if value.strip()]
    if not asset.is_file():
        raise FileNotFoundError(asset)
    grid_capacity = args.columns * args.rows
    minimum_for_rows = max(1, (args.rows - 1) * args.columns + 1)
    if len(source_frames) > grid_capacity or len(source_frames) < minimum_for_rows:
        raise RuntimeError(
            f"Grid {args.columns}x{args.rows} has capacity {grid_capacity} and expects "
            f"a populated final row; received {len(source_frames)} frames: {source_frames}"
        )
    if args.source_fps <= 0:
        raise RuntimeError("--source-fps must be positive")

    clear_scene()
    bpy.ops.import_scene.gltf(filepath=str(asset))
    scene = bpy.context.scene
    armature = select_armature()
    action = select_action(args.action)
    armature.animation_data_create()
    armature.animation_data.action = action
    muted_root_curves = suppress_root_motion(action, armature)
    action_start, action_end = (float(value) for value in action.frame_range)
    source_start = min(source_frames)
    source_end = max(source_frames)
    source_span = source_end - source_start
    if source_span <= 0:
        render_frames = [action_start for _frame in source_frames]
    else:
        render_frames = [
            action_start + ((frame - source_start) / source_span) * (action_end - action_start)
            for frame in source_frames
        ]
    mesh_objects = [obj for obj in scene.objects if obj.type == "MESH" and not obj.hide_render]
    if not mesh_objects:
        raise RuntimeError("Source asset imported no renderable mesh objects")

    scene.render.resolution_x = args.width
    scene.render.resolution_y = args.height
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.fps = round(args.source_fps)
    configure_workbench(scene, mesh_objects)

    lower, upper = sampled_bounds(scene, armature, mesh_objects, render_frames)
    camera = make_camera(scene)
    lock_camera(camera, args.camera_side, lower, upper, args.width / args.height)
    locked_camera_matrix = flatten_matrix(camera.matrix_world)
    locked_ortho_scale = round(float(camera.data.ortho_scale), 9)

    limb_material_indices = install_limb_materials(mesh_objects)
    assign_limb_ids(mesh_objects, limb_material_indices)
    depth_material_indices = install_depth_materials(mesh_objects)
    depth_minimum, depth_maximum = sampled_camera_depth_range(
        scene,
        armature,
        camera,
        mesh_objects,
        render_frames,
    )
    weighted_bones = weighted_bone_names(mesh_objects)
    if not weighted_bones:
        raise RuntimeError("Source asset has no nonzero weighted bone groups")

    records: list[dict[str, object]] = []
    for index, (source_frame, render_frame_value) in enumerate(zip(source_frames, render_frames)):
        set_native_pose(scene, armature, render_frame_value)
        actual_camera_matrix = flatten_matrix(camera.matrix_world)
        actual_ortho_scale = round(float(camera.data.ortho_scale), 9)
        record: dict[str, object] = {
            "index": index,
            "sourceFrame": source_frame,
            "sourceSeconds": round(source_frame / args.source_fps, 8),
            "blenderImportedFrame": round(render_frame_value, 8),
            "cameraMatrixWorld": actual_camera_matrix,
            "cameraOrthoScale": actual_ortho_scale,
            "joints": capture_joints(scene, camera, armature, weighted_bones),
            "weapon": capture_weapon(scene, camera, armature, mesh_objects),
            "passes": {},
        }
        for pass_name in PASS_NAMES:
            set_pass_style(scene, pass_name)
            if pass_name == "limb-id":
                assign_limb_ids(mesh_objects, limb_material_indices)
            elif pass_name == "depth":
                for obj in mesh_objects:
                    assign_depth_ids(
                        obj,
                        camera,
                        depth_minimum,
                        depth_maximum,
                        depth_material_indices[obj.name],
                    )
            path = out_dir / pass_name / f"f{index:02d}.png"
            render_frame(scene, path)
            record["passes"][pass_name] = {
                "image": str(path.relative_to(out_dir)),
                "sha256": sha256(path),
            }
        records.append(record)

    manifest = {
        "schema": POSE_PACKET_SCHEMA,
        "status": "native-geometry-reference",
        "source": {
            "asset": str(asset),
            "assetSha256": sha256(asset),
            "actionRequested": args.action,
            "actionResolved": action.name,
            "actionFrameRange": [round(value, 8) for value in action.frame_range],
            "sourceFps": args.source_fps,
            "sampleFrames": source_frames,
            "mappedBlenderFrames": [round(value, 8) for value in render_frames],
            "mutedRootMotionCurves": muted_root_curves,
        },
        "contract": {
            "poseAuthority": "embedded native animation only",
            "appearanceAuthority": "none",
            "camera": "one locked orthographic camera for every frame and pass",
            "cameraSide": f"model-{args.camera_side}",
            "cameraMatrixWorld": locked_camera_matrix,
            "cameraOrthoScale": locked_ortho_scale,
            "retargeting": False,
            "poseAuthoring": False,
            "ik": False,
            "semanticPoseNames": False,
            "generatedFrameAsReference": False,
            "rootMotionSuppressed": True,
        },
        "grid": {
            "columns": args.columns,
            "rows": args.rows,
            "frameWidth": args.width,
            "frameHeight": args.height,
        },
        "depthRange": {
            "near": round(depth_minimum, 8),
            "far": round(depth_maximum, 8),
            "encoding": "near-black far-white quantized-64",
        },
        "limbIdPalette": {
            role: [round(channel, 4) for channel in color]
            for role, color in LIMB_COLORS.items()
        },
        "weightedDeformBones": sorted(weighted_bones),
        "frames": records,
    }
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = out_dir / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    print(
        json.dumps(
            {
                "status": "PASS",
                "schema": POSE_PACKET_SCHEMA,
                "outDir": str(out_dir),
                "frames": len(records),
                "cameraSide": args.camera_side,
                "passes": list(PASS_NAMES),
            }
        )
    )


if __name__ == "__main__":
    main()
