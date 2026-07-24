#!/usr/bin/env python3
"""Transfer Vanguard's native Idle through an ORG-only BVH proxy onto Crimson.

BVH is only the transport boundary.  The target pass synchronizes the two rest
bases, projects evaluated ORG landmarks into Crimson world space, and solves
Crimson's two-bone limbs from those targets while preserving Crimson lengths.
It loads no weapon and applies no grip correction.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Euler, Matrix, Quaternion, Vector


ROOT = Path(__file__).resolve().parents[1]
EXPERIMENT = ROOT / "experiments" / "bvh-retarget"
SOURCE = ROOT / "public" / "assets" / "vanguard" / "vanguard_rigged_animations.glb"
TARGET = ROOT / "public" / "assets" / "crimson" / "crimson_plume_knight_rigged_pbr.glb"
MAP = EXPERIMENT / "bone-map.json"
SKELETON = EXPERIMENT / "canonical-skeleton.json"
DEFAULT_OUT = ROOT / "generated" / "bvh-retarget-spike"
SAMPLES = tuple(range(0, 24, 2))
SCHEMA = "pose-lab-v2-org-bvh-idle-transfer-v1"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.actions, bpy.data.armatures, bpy.data.meshes, bpy.data.cameras):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


def import_glb(path: Path) -> list[bpy.types.Object]:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    return [obj for obj in bpy.data.objects if obj not in before]


def find_armature(objects: list[bpy.types.Object], label: str) -> bpy.types.Object:
    armatures = [obj for obj in objects if obj.type == "ARMATURE"]
    if len(armatures) != 1:
        raise RuntimeError(f"{label}: expected one armature, found {[obj.name for obj in armatures]}")
    return armatures[0]


def activate_action(armature: bpy.types.Object, requested: str) -> bpy.types.Action:
    matches = [action for action in bpy.data.actions if action.name == requested or action.name.startswith(f"{requested}_")]
    if not matches:
        raise RuntimeError(f"missing {requested}; available={sorted(action.name for action in bpy.data.actions)}")
    action = sorted(matches, key=lambda item: (item.name != requested, item.name))[0]
    armature.animation_data_create()
    armature.animation_data.action = action
    for track in armature.animation_data.nla_tracks:
        track.mute = True
    armature.data.pose_position = "POSE"
    return action


def source_matrix_world(armature: bpy.types.Object, bone_name: str) -> Matrix:
    pose_bone = armature.pose.bones.get(bone_name)
    if pose_bone is None:
        raise RuntimeError(f"source pose bone missing: {bone_name}")
    return armature.matrix_world @ pose_bone.matrix


def source_rest_world(armature: bpy.types.Object, bone_name: str) -> Matrix:
    bone = armature.data.bones.get(bone_name)
    if bone is None:
        raise RuntimeError(f"source rest bone missing: {bone_name}")
    return armature.matrix_world @ bone.matrix_local


def interpolated_matrix(a: Matrix, b: Matrix, factor: float) -> Matrix:
    location = a.translation.lerp(b.translation, factor)
    rotation = a.to_quaternion().slerp(b.to_quaternion(), factor)
    return Matrix.LocRotScale(location, rotation, Vector((1, 1, 1)))


def canonical_source_matrix(
    armature: bpy.types.Object, source_map: dict[str, str | None], canonical: str, rest: bool
) -> Matrix:
    mapped = source_map[canonical]
    getter = source_rest_world if rest else source_matrix_world
    if mapped is not None:
        return getter(armature, mapped)
    if canonical != "spineMid":
        raise RuntimeError(f"no source interpolation rule for {canonical}")
    return interpolated_matrix(
        getter(armature, source_map["spineLower"]),
        getter(armature, source_map["chest"]),
        0.5,
    )


def create_proxy(
    source: bpy.types.Object, skeleton: dict, source_map: dict[str, str | None]
) -> bpy.types.Object:
    data = bpy.data.armatures.new("CanonicalBVH")
    proxy = bpy.data.objects.new("CanonicalBVH", data)
    bpy.context.collection.objects.link(proxy)
    proxy.matrix_world = Matrix.Identity(4)
    bpy.context.view_layer.objects.active = proxy
    proxy.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    edit = {}
    for entry in skeleton["joints"]:
        name = entry["name"]
        source_bone = source_map[name]
        bone = data.edit_bones.new(name)
        if source_bone is not None:
            original = source.data.bones[source_bone]
            rest_world = source.matrix_world @ original.matrix_local
            bone.matrix = rest_world
            bone.length = max(
                0.001,
                (source.matrix_world @ original.tail_local - source.matrix_world @ original.head_local).length,
            )
        else:
            rest_world = canonical_source_matrix(source, source_map, name, rest=True)
            bone.matrix = rest_world
            bone.length = max(
                0.001,
                (
                    canonical_source_matrix(source, source_map, "chest", rest=True).translation
                    - canonical_source_matrix(source, source_map, "spineLower", rest=True).translation
                ).length
                * 0.5,
            )
        if (bone.tail - bone.head).length < 0.001:
            bone.tail = bone.head + Vector((0, 0.05, 0))
        edit[name] = bone
    for entry in skeleton["joints"]:
        parent = entry["parent"]
        if parent:
            edit[entry["name"]].parent = edit[parent]
            edit[entry["name"]].use_connect = False
    bpy.ops.object.mode_set(mode="POSE")
    for bone in proxy.pose.bones:
        bone.rotation_mode = "QUATERNION"
    bpy.ops.object.mode_set(mode="OBJECT")
    return proxy


def bake_proxy(
    source: bpy.types.Object,
    proxy: bpy.types.Object,
    source_map: dict[str, str | None],
    frames: tuple[int, ...],
) -> tuple[bpy.types.Action, dict[int, dict[str, dict[str, Matrix]]]]:
    action = bpy.data.actions.new("CanonicalIdle")
    proxy.animation_data_create()
    proxy.animation_data.action = action
    sampled: dict[int, dict[str, dict[str, Matrix]]] = {}

    for frame in frames:
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        sampled[frame] = {}

        # The imported GLTF action is fully baked: evaluated ORG joints carry
        # translation as well as orientation. Copy the evaluated matrices
        # exactly into the small proxy and let BVH transport those channels.
        for canonical in source_map:
            desired_world = canonical_source_matrix(
                source, source_map, canonical, rest=False
            )
            bone = proxy.pose.bones[canonical]
            bone.matrix = proxy.matrix_world.inverted() @ desired_world
            bpy.context.view_layer.update()

        for canonical in source_map:
            pose_bone = proxy.pose.bones[canonical]
            rest = proxy.data.bones[canonical].matrix_local
            if pose_bone.parent:
                local_pose = pose_bone.parent.matrix.inverted() @ pose_bone.matrix
                local_rest = (
                    proxy.data.bones[pose_bone.parent.name].matrix_local.inverted() @ rest
                )
            else:
                local_pose = pose_bone.matrix.copy()
                local_rest = rest.copy()
            basis_delta = local_rest.inverted() @ local_pose
            sampled[frame][canonical] = {
                "world": (proxy.matrix_world @ pose_bone.matrix).copy(),
                "expected": canonical_source_matrix(
                    source, source_map, canonical, rest=False
                ).copy(),
                "delta": basis_delta.copy(),
                "motion": (
                    basis_delta
                    if pose_bone.parent is None
                    else local_rest @ basis_delta @ local_rest.inverted()
                ).copy(),
            }
            pose_bone.rotation_mode = "QUATERNION"
            pose_bone.keyframe_insert("location", frame=frame, group=pose_bone.name)
            pose_bone.keyframe_insert(
                "rotation_quaternion", frame=frame, group=pose_bone.name
            )
            pose_bone.keyframe_insert("scale", frame=frame, group=pose_bone.name)
    return action, sampled

def verify_source_proxy(
    sampled: dict[int, dict[str, dict[str, Matrix]]],
) -> dict:
    errors = []
    for frame, bones in sampled.items():
        for name, record in bones.items():
            error = matrix_error(record["world"], record["expected"])
            errors.append({"frame": frame, "bone": name, **error})
    return {
        "maxPositionError": max(item["position"] for item in errors),
        "maxRotationErrorDeg": max(item["rotationDeg"] for item in errors),
        "samples": len(errors),
        "worstPosition": max(errors, key=lambda item: item["position"]),
        "worstRotation": max(errors, key=lambda item: item["rotationDeg"]),
    }


def export_proxy_bvh(proxy: bpy.types.Object, output: Path, frame_start: int, frame_end: int) -> None:
    bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.select_all(action="DESELECT")
    proxy.select_set(True)
    bpy.context.view_layer.objects.active = proxy
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_anim.bvh(
        filepath=str(output),
        frame_start=frame_start,
        frame_end=frame_end,
        global_scale=1.0,
        rotate_mode="ZXY",
        root_transform_only=False,
    )


def import_bvh(path: Path, axis_forward: str, axis_up: str) -> bpy.types.Object:
    before = set(bpy.data.objects)
    bpy.ops.import_anim.bvh(
        filepath=str(path),
        global_scale=1.0,
        frame_start=0,
        use_fps_scale=False,
        update_scene_fps=False,
        update_scene_duration=False,
        rotate_mode="NATIVE",
        axis_forward=axis_forward,
        axis_up=axis_up,
    )
    created = [obj for obj in bpy.data.objects if obj not in before and obj.type == "ARMATURE"]
    if len(created) != 1:
        raise RuntimeError(f"BVH round trip created {len(created)} armatures")
    created[0].name = f"CanonicalBVH_{axis_forward}_{axis_up}"
    return created[0]


def matrix_error(a: Matrix, b: Matrix) -> dict:
    angle = a.to_quaternion().rotation_difference(b.to_quaternion()).angle
    angle = min(angle, math.tau - angle)
    return {
        "position": (a.translation - b.translation).length,
        "rotationDeg": math.degrees(angle),
    }


def direction(matrix: Matrix) -> Vector:
    return (matrix.to_3x3() @ Vector((0, 1, 0))).normalized()


def trajectory_errors(
    imported: bpy.types.Object,
    sampled: dict[int, dict[str, dict[str, Matrix]]],
) -> list[dict]:
    skeleton = json.loads(SKELETON.read_text())
    primary_child = {}
    for entry in skeleton["joints"]:
        parent = entry["parent"]
        if parent and parent not in primary_child:
            primary_child[parent] = entry["name"]
    errors = []
    for frame, bones in sampled.items():
        # Blender's BVH importer places the first motion row at frame 1 even
        # when frame_start=0. The canonical authoring contract remains 0-based.
        bpy.context.scene.frame_set(frame + 1)
        bpy.context.view_layer.update()
        for name, original in bones.items():
            imported_bone = imported.pose.bones.get(name)
            if imported_bone is None:
                raise RuntimeError(f"BVH round trip lost {name}")
            actual_world = imported.matrix_world @ imported_bone.matrix
            expected_world = original["world"]
            child_name = primary_child.get(name)
            direction_error = 0.0
            if child_name:
                actual_child = (
                    imported.matrix_world @ imported.pose.bones[child_name].matrix
                ).translation
                expected_child = bones[child_name]["world"].translation
                actual_segment = (actual_child - actual_world.translation).normalized()
                expected_segment = (expected_child - expected_world.translation).normalized()
                dot = max(-1.0, min(1.0, actual_segment.dot(expected_segment)))
                direction_error = math.degrees(math.acos(dot))
            errors.append({
                "frame": frame,
                "bone": name,
                "position": (actual_world.translation - expected_world.translation).length,
                "directionErrorDeg": direction_error,
                "expectedPosition": list(expected_world.translation),
                "actualPosition": list(actual_world.translation),
            })
    return errors


def choose_bvh_axes(
    path: Path,
    sampled: dict[int, dict[str, dict[str, Matrix]]],
) -> tuple[bpy.types.Object, dict]:
    axes = ("X", "Y", "Z", "-X", "-Y", "-Z")
    candidates = []
    for forward in axes:
        for up in axes:
            if forward.lstrip("-") == up.lstrip("-"):
                continue
            armature = import_bvh(path, forward, up)
            errors = trajectory_errors(armature, sampled)
            candidates.append({
                "forward": forward,
                "up": up,
                "armature": armature,
                "meanPositionError": sum(item["position"] for item in errors) / len(errors),
                "maxPositionError": max(item["position"] for item in errors),
                "maxDirectionErrorDeg": max(item["directionErrorDeg"] for item in errors),
            })
    best = min(candidates, key=lambda item: (item["meanPositionError"], item["maxPositionError"]))
    for candidate in candidates:
        if candidate is best:
            continue
        bpy.data.objects.remove(candidate["armature"], do_unlink=True)
    report = {
        key: value for key, value in best.items() if key != "armature"
    }
    report["testedAxisPairs"] = len(candidates)
    best["armature"].name = "CanonicalBVHRoundTrip"
    return best["armature"], report


def verify_roundtrip(
    imported: bpy.types.Object,
    sampled: dict[int, dict[str, dict[str, Matrix]]],
) -> dict:
    errors = trajectory_errors(imported, sampled)
    return {
        "maxPositionError": max(entry["position"] for entry in errors),
        "maxDirectionErrorDeg": max(entry["directionErrorDeg"] for entry in errors),
        "samples": len(errors),
        "worstPosition": max(errors, key=lambda item: item["position"]),
        "worstDirection": max(errors, key=lambda item: item["directionErrorDeg"]),
    }


def rest_local(armature: bpy.types.Object, bone_name: str) -> Matrix:
    bone = armature.data.bones[bone_name]
    return bone.parent.matrix_local.inverted() @ bone.matrix_local if bone.parent else bone.matrix_local.copy()


def rest_joint_world(
    armature: bpy.types.Object, bone_map: dict[str, str], canonical: str
) -> Vector:
    return (
        armature.matrix_world @ armature.data.bones[bone_map[canonical]].matrix_local
    ).translation.copy()


def rest_rotation_world(
    armature: bpy.types.Object, bone_map: dict[str, str], canonical: str
) -> Quaternion:
    return (
        armature.matrix_world.to_quaternion()
        @ armature.data.bones[bone_map[canonical]].matrix_local.to_quaternion()
    ).normalized()


def body_basis(points: dict[str, Vector]) -> Matrix:
    """Build an orthonormal anatomical frame from hips, chest, and shoulders."""
    up = (points["chest"] - points["hips"]).normalized()
    right = (points["clavicle.R"] - points["clavicle.L"])
    right = (right - up * right.dot(up)).normalized()
    forward = right.cross(up).normalized()
    right = up.cross(forward).normalized()
    # Matrix expects rows; transpose so the anatomical axes are columns.
    return Matrix((right, up, forward)).transposed()


def clamp_target(root: Vector, target: Vector, minimum: float, maximum: float) -> Vector:
    offset = target - root
    distance = offset.length
    if distance < 1e-8:
        return root + Vector((0, maximum, 0))
    return root + offset.normalized() * min(max(distance, minimum), maximum)


def solve_two_bone(
    root: Vector,
    target: Vector,
    pole_hint: Vector,
    upper_length: float,
    lower_length: float,
) -> tuple[Vector, Vector]:
    """Return the middle joint and a reach-clamped end target."""
    epsilon = max(1e-5, (upper_length + lower_length) * 1e-5)
    solved_target = clamp_target(
        root,
        target,
        abs(upper_length - lower_length) + epsilon,
        upper_length + lower_length - epsilon,
    )
    axis = solved_target - root
    distance = axis.length
    direction = axis.normalized()
    along = (
        upper_length * upper_length
        - lower_length * lower_length
        + distance * distance
    ) / (2.0 * distance)
    height = math.sqrt(max(0.0, upper_length * upper_length - along * along))

    pole = pole_hint - root
    pole_off_axis = pole - direction * pole.dot(direction)
    if pole_off_axis.length < epsilon:
        fallback = Vector((0, 0, 1))
        if abs(fallback.dot(direction)) > 0.95:
            fallback = Vector((1, 0, 0))
        pole_off_axis = fallback - direction * fallback.dot(direction)
    bend = pole_off_axis.normalized()
    return root + direction * along + bend * height, solved_target


def set_bone_direction_world(
    target: bpy.types.Object,
    target_map: dict[str, str],
    canonical: str,
    head_world: Vector,
    desired_direction: Vector,
    target_rest_direction: Vector,
    target_rest_rotation: Quaternion,
) -> None:
    """Point one target bone while preserving its target-rest roll."""
    if desired_direction.length < 1e-8:
        raise RuntimeError(f"zero desired direction for {canonical}")
    world_rotation = (
        target_rest_direction.rotation_difference(desired_direction.normalized())
        @ target_rest_rotation
    ).normalized()
    armature_head = target.matrix_world.inverted() @ head_world
    armature_rotation = (
        target.matrix_world.to_quaternion().inverted() @ world_rotation
    ).normalized()
    bone = target.pose.bones[target_map[canonical]]
    bone.matrix = Matrix.LocRotScale(
        armature_head, armature_rotation, Vector((1, 1, 1))
    )
    bpy.context.view_layer.update()


def bake_target(
    canonical: bpy.types.Object,
    target: bpy.types.Object,
    skeleton: dict,
    target_map: dict[str, str],
    frames: tuple[int, ...],
) -> tuple[bpy.types.Action, dict]:
    action = bpy.data.actions.new("CrimsonCanonicalIdle")
    target.animation_data_create()
    target.animation_data.action = action

    order = [entry["name"] for entry in skeleton["joints"] if entry["name"] != "root"]
    primary_child: dict[str, str] = {}
    for entry in skeleton["joints"]:
        parent = entry["parent"]
        if parent and parent != "root" and parent not in primary_child:
            primary_child[parent] = entry["name"]

    source_rest_points = {
        name: (
            canonical.matrix_world @ canonical.data.bones[name].matrix_local
        ).translation.copy()
        for name in order
    }
    target_rest_points = {
        name: rest_joint_world(target, target_map, name)
        for name in order
    }
    source_rest_rotations = {
        name: (
            canonical.matrix_world.to_quaternion()
            @ canonical.data.bones[name].matrix_local.to_quaternion()
        ).normalized()
        for name in order
    }
    target_rest_rotations = {
        name: rest_rotation_world(target, target_map, name) for name in order
    }
    source_basis = body_basis(source_rest_points)
    target_basis = body_basis(target_rest_points)
    rest_alignment = (
        target_basis.to_quaternion() @ source_basis.to_quaternion().inverted()
    ).normalized()
    source_height = (
        source_rest_points["head"] - source_rest_points["hips"]
    ).length
    target_height = (
        target_rest_points["head"] - target_rest_points["hips"]
    ).length
    body_scale = target_height / source_height

    target_rest_directions = {
        name: (
            target_rest_points[child] - target_rest_points[name]
        ).normalized()
        for name, child in primary_child.items()
    }
    source_rest_directions = {
        name: (
            source_rest_points[child] - source_rest_points[name]
        ).normalized()
        for name, child in primary_child.items()
    }
    rest_direction_corrections = {
        name: target_rest_directions[name].rotation_difference(
            rest_alignment @ source_rest_directions[name]
        )
        for name in primary_child
    }
    # rotation_difference above maps target -> aligned-source.  Invert it so
    # aligned source-rest maps exactly onto Crimson rest.
    rest_direction_corrections = {
        name: correction.inverted().normalized()
        for name, correction in rest_direction_corrections.items()
    }

    limb_specs = (
        ("arm.L", "upperArm.L", "lowerArm.L", "hand.L"),
        ("arm.R", "upperArm.R", "lowerArm.R", "hand.R"),
        ("leg.L", "upperLeg.L", "lowerLeg.L", "foot.L"),
        ("leg.R", "upperLeg.R", "lowerLeg.R", "foot.R"),
    )
    limb_lengths = {}
    for label, upper, lower, end in limb_specs:
        limb_lengths[label] = (
            (target_rest_points[lower] - target_rest_points[upper]).length,
            (target_rest_points[end] - target_rest_points[lower]).length,
        )

    def projected_delta(name: str, source_pose_points: dict[str, Vector]) -> Vector:
        return (
            target_rest_points[name]
            + rest_alignment
            @ (source_pose_points[name] - source_rest_points[name])
            * body_scale
        )

    def corrected_source_direction(
        name: str, source_pose_points: dict[str, Vector]
    ) -> Vector:
        child = primary_child[name]
        posed = (
            source_pose_points[child] - source_pose_points[name]
        ).normalized()
        return (
            rest_direction_corrections[name] @ (rest_alignment @ posed)
        ).normalized()

    diagnostics = {
        "method": "rest-synchronized projected landmarks plus analytic two-bone IK",
        "restAlignmentQuaternion": list(rest_alignment),
        "bodyScale": body_scale,
        "frames": [],
    }

    for frame in frames:
        bpy.context.scene.frame_set(frame + 1)
        bpy.context.view_layer.update()
        source_pose_points = {
            name: (
                canonical.matrix_world @ canonical.pose.bones[name].matrix
            ).translation.copy()
            for name in order
        }

        # Begin from the immutable Crimson rest pose every frame.  No previous
        # solved frame is allowed to become the next frame's accidental basis.
        for pose_bone in target.pose.bones:
            pose_bone.matrix_basis = Matrix.Identity(4)
        bpy.context.view_layer.update()

        # Hips translation is the only projected body translation.  Root motion
        # remains suppressed, but source hip bob survives in target scale.
        hips_world = projected_delta("hips", source_pose_points)
        hips = target.pose.bones[target_map["hips"]]
        hips.location += target.matrix_world.inverted().to_3x3() @ (
            hips_world - joint_world(target, target_map, "hips")
        )
        bpy.context.view_layer.update()

        # Solve the central chain first, then clavicles.  These roots define the
        # actual shoulder and hip anchors used by the limb inverse solve.
        for name in (
            "hips", "spineLower", "spineMid", "chest",
            "neck", "clavicle.L", "clavicle.R",
        ):
            if name not in primary_child:
                continue
            head = joint_world(target, target_map, name)
            set_bone_direction_world(
                target,
                target_map,
                name,
                head,
                corrected_source_direction(name, source_pose_points),
                target_rest_directions[name],
                target_rest_rotations[name],
            )

        frame_diagnostics = {"frame": frame, "limbs": {}}
        for label, upper, lower, end in limb_specs:
            root = joint_world(target, target_map, upper)
            requested_end = projected_delta(end, source_pose_points)
            projected_mid = projected_delta(lower, source_pose_points)
            upper_length, lower_length = limb_lengths[label]
            middle, solved_end = solve_two_bone(
                root,
                requested_end,
                projected_mid,
                upper_length,
                lower_length,
            )
            set_bone_direction_world(
                target,
                target_map,
                upper,
                root,
                middle - root,
                target_rest_directions[upper],
                target_rest_rotations[upper],
            )
            # Re-read the child head after the parent solve.  This is the
            # inverse reconstruction step; Crimson's evaluated hierarchy owns
            # the root, while the known-good projected endpoint owns the aim.
            evaluated_middle = joint_world(target, target_map, lower)
            set_bone_direction_world(
                target,
                target_map,
                lower,
                evaluated_middle,
                solved_end - evaluated_middle,
                target_rest_directions[lower],
                target_rest_rotations[lower],
            )
            actual_end = joint_world(target, target_map, end)
            frame_diagnostics["limbs"][label] = {
                "requestedTarget": list(requested_end),
                "solvedTarget": list(solved_end),
                "actualEnd": list(actual_end),
                "targetClamp": (requested_end - solved_end).length,
                "endpointError": (actual_end - solved_end).length,
                "poleTarget": list(projected_mid),
                "lengths": [upper_length, lower_length],
            }

        # Leaves keep target-rest roll plus the source's rest-relative twist.
        for name in ("head", "hand.L", "hand.R", "foot.L", "foot.R"):
            source_pose_rotation = (
                canonical.matrix_world.to_quaternion()
                @ canonical.pose.bones[name].matrix.to_quaternion()
            ).normalized()
            source_delta = (
                source_rest_rotations[name].inverted() @ source_pose_rotation
            ).normalized()
            desired_world_rotation = (
                target_rest_rotations[name] @ source_delta
            ).normalized()
            bone = target.pose.bones[target_map[name]]
            head = joint_world(target, target_map, name)
            armature_head = target.matrix_world.inverted() @ head
            armature_rotation = (
                target.matrix_world.to_quaternion().inverted()
                @ desired_world_rotation
            ).normalized()
            bone.matrix = Matrix.LocRotScale(
                armature_head, armature_rotation, Vector((1, 1, 1))
            )
            bpy.context.view_layer.update()

        for name in order:
            bone = target.pose.bones[target_map[name]]
            bone.rotation_mode = "QUATERNION"
            bone.keyframe_insert("location", frame=frame, group=bone.name)
            bone.keyframe_insert("rotation_quaternion", frame=frame, group=bone.name)
            bone.keyframe_insert("scale", frame=frame, group=bone.name)
        diagnostics["frames"].append(frame_diagnostics)

    endpoint_errors = [
        limb["endpointError"]
        for frame in diagnostics["frames"]
        for limb in frame["limbs"].values()
    ]
    target_clamps = [
        limb["targetClamp"]
        for frame in diagnostics["frames"]
        for limb in frame["limbs"].values()
    ]
    diagnostics["maxEndpointError"] = max(endpoint_errors)
    diagnostics["maxTargetClamp"] = max(target_clamps)
    return action, diagnostics

def top_level(objects: list[bpy.types.Object]) -> list[bpy.types.Object]:
    owned = set(objects)
    return [obj for obj in objects if obj.parent not in owned]


def mesh_bounds(objects: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    low = Vector((math.inf, math.inf, math.inf))
    high = Vector((-math.inf, -math.inf, -math.inf))
    for obj in objects:
        if obj.type != "MESH":
            continue
        for corner in obj.bound_box:
            point = obj.matrix_world @ Vector(corner)
            low.x, low.y, low.z = min(low.x, point.x), min(low.y, point.y), min(low.z, point.z)
            high.x, high.y, high.z = max(high.x, point.x), max(high.y, point.y), max(high.z, point.z)
    if not math.isfinite(low.x):
        raise RuntimeError("no rendered mesh bounds")
    return low, high


def setup_render() -> bpy.types.Object:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.resolution_x = 640
    scene.render.resolution_y = 640
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    scene.display.shading.light = "STUDIO"
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "WORLD"
    camera = bpy.data.objects.new("BVHSpikeCamera", bpy.data.cameras.new("BVHSpikeCamera"))
    bpy.context.collection.objects.link(camera)
    camera.data.type = "ORTHO"
    scene.camera = camera
    return camera


def frame_camera(camera: bpy.types.Object, objects: list[bpy.types.Object], direction: Vector) -> None:
    low, high = mesh_bounds(objects)
    center = (low + high) * 0.5
    size = high - low
    camera.location = center + direction.normalized() * max(size.length * 2.2, 4.0)
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.ortho_scale = max(size.x, size.y, size.z) * 1.28
    camera.data.clip_start = 0.01
    camera.data.clip_end = 1000


def render(path: Path, camera: bpy.types.Object, objects: list[bpy.types.Object], direction: Vector) -> None:
    frame_camera(camera, objects, direction)
    bpy.context.scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)


def joint_world(target: bpy.types.Object, target_map: dict[str, str], canonical: str) -> Vector:
    return (target.matrix_world @ target.pose.bones[target_map[canonical]].matrix).translation.copy()


def foot_midpoint(target: bpy.types.Object, target_map: dict[str, str]) -> Vector:
    return (joint_world(target, target_map, "foot.L") + joint_world(target, target_map, "foot.R")) * 0.5


def idle_metrics(
    target: bpy.types.Object,
    target_map: dict[str, str],
    baseline_foot_midpoint: Vector,
    baseline_hips: Vector,
) -> dict:
    names = (
        "hips", "chest", "head",
        "clavicle.L", "upperArm.L", "lowerArm.L", "hand.L",
        "clavicle.R", "upperArm.R", "lowerArm.R", "hand.R",
        "upperLeg.L", "lowerLeg.L", "foot.L",
        "upperLeg.R", "lowerLeg.R", "foot.R",
    )
    joints = {
        name: [round(value, 6) for value in joint_world(target, target_map, name)]
        for name in names
    }
    current_foot_midpoint = foot_midpoint(target, target_map)
    hips = joint_world(target, target_map, "hips")
    return {
        "joints": joints,
        "footMidpointDrift": (current_foot_midpoint - baseline_foot_midpoint).length,
        "hipsDrift": (hips - baseline_hips).length,
        "weaponLoaded": False,
        "constraintLayers": [],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT))
    parser.add_argument(
        "--skip-renders",
        action="store_true",
        help="Run numeric solve/export without initializing a headless render context.",
    )
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    args = parser.parse_args(argv)
    out = Path(args.out_dir)
    if not out.is_absolute():
        out = ROOT / out
    out.mkdir(parents=True, exist_ok=True)
    mapping = json.loads(MAP.read_text())
    skeleton = json.loads(SKELETON.read_text())
    source_map = mapping["source"]["map"]
    target_map = mapping["target"]["map"]
    bpy.context.scene.render.fps = skeleton["frameRate"]

    clear_scene()
    source_objects = import_glb(SOURCE)
    source = find_armature(source_objects, "Vanguard")
    source_action = activate_action(source, mapping["source"]["clip"])
    proxy = create_proxy(source, skeleton, source_map)
    proxy_action, sampled = bake_proxy(source, proxy, source_map, SAMPLES)
    source_proxy = verify_source_proxy(sampled)
    (out / "source-proxy.json").write_text(json.dumps(source_proxy, indent=2) + "\n")
    if source_proxy["maxPositionError"] > 0.01 or source_proxy["maxRotationErrorDeg"] > 1.0:
        raise RuntimeError(
            "ORG source to canonical proxy exceeded tolerance: "
            f"position={source_proxy['maxPositionError']:.6f}m "
            f"rotation={source_proxy['maxRotationErrorDeg']:.6f}deg"
        )
    bvh_path = out / "vanguard_idle_org_proxy.bvh"
    export_proxy_bvh(proxy, bvh_path, min(SAMPLES), max(SAMPLES))
    source_proxy_world = proxy.matrix_world.copy()

    # Render the native source clip as an independent visual authority. The
    # target cannot be judged from target pixels alone.
    source_evidence = []
    if not args.skip_renders:
        source_camera = setup_render()
        for frame in SAMPLES:
            bpy.context.scene.frame_set(frame)
            bpy.context.view_layer.update()
            image = out / f"source-side-{frame:03d}.png"
            render(image, source_camera, source_objects, Vector((0, -1, 0.12)))
            source_evidence.append(
                {"frame": frame, "view": "locked-side", "image": image.name, "sha256": sha256(image)}
            )
        source_diagnostic_frame = SAMPLES[len(SAMPLES) // 2]
        bpy.context.scene.frame_set(source_diagnostic_frame)
        bpy.context.view_layer.update()
        source_diagnostic = out / "source-diagnostic-three-quarter.png"
        render(source_diagnostic, source_camera, source_objects, Vector((-1, -1, 0.12)))
        source_evidence.append(
            {"frame": source_diagnostic_frame, "view": "three-quarter",
             "image": source_diagnostic.name, "sha256": sha256(source_diagnostic)}
        )

    source.hide_render = True
    for obj in source_objects:
        obj.hide_viewport = True
        obj.hide_render = True
    proxy.hide_viewport = True
    proxy.hide_render = True
    canonical, axis_selection = choose_bvh_axes(bvh_path, sampled)
    roundtrip = verify_roundtrip(canonical, sampled)
    (out / "roundtrip.json").write_text(
        json.dumps(
            {
                "importedObjectMatrix": [list(row) for row in canonical.matrix_world],
                "axisSelection": axis_selection,
                "result": roundtrip,
            },
            indent=2,
        )
        + "\n"
    )
    if roundtrip["maxPositionError"] > 0.01 or roundtrip["maxDirectionErrorDeg"] > 1.0:
        raise RuntimeError(
            "BVH round trip exceeded tolerance: "
            f"position={roundtrip['maxPositionError']:.6f}m "
            f"direction={roundtrip['maxDirectionErrorDeg']:.6f}deg"
        )

    target_objects = import_glb(TARGET)
    target = find_armature(target_objects, "Crimson")
    target_action, target_solve = bake_target(
        canonical, target, skeleton, target_map, SAMPLES
    )
    (out / "target-solve.json").write_text(
        json.dumps(target_solve, indent=2) + "\n"
    )
    if target_solve["maxEndpointError"] > 0.02:
        raise RuntimeError(
            "Crimson inverse solve exceeded endpoint tolerance: "
            f"{target_solve['maxEndpointError']:.6f}m"
        )
    render_objects = target_objects
    evidence = []
    bpy.context.scene.frame_set(SAMPLES[0])
    bpy.context.view_layer.update()
    baseline_foot_midpoint = foot_midpoint(target, target_map)
    baseline_hips = joint_world(target, target_map, "hips")
    if not args.skip_renders:
        camera = setup_render()
        for frame in SAMPLES:
            bpy.context.scene.frame_set(frame)
            bpy.context.view_layer.update()
            image = out / f"locked-side-{frame:03d}.png"
            render(image, camera, render_objects, Vector((0, -1, 0.12)))
            evidence.append(
                {"frame": frame, "view": "locked-side", "image": image.name, "sha256": sha256(image),
                 "metrics": idle_metrics(target, target_map, baseline_foot_midpoint, baseline_hips)}
            )
        diagnostic_frame = SAMPLES[len(SAMPLES) // 2]
        for label, direction in (
            ("front", Vector((-1, 0, 0.08))),
            ("three-quarter", Vector((-1, -1, 0.12))),
            ("rear-three-quarter", Vector((1, 1, 0.12))),
        ):
            bpy.context.scene.frame_set(diagnostic_frame)
            bpy.context.view_layer.update()
            image = out / f"diagnostic-{label}.png"
            render(image, camera, render_objects, direction)
            evidence.append(
                {"frame": diagnostic_frame, "view": label, "image": image.name, "sha256": sha256(image),
                 "metrics": idle_metrics(target, target_map, baseline_foot_midpoint, baseline_hips)}
            )
    else:
        for frame in SAMPLES:
            bpy.context.scene.frame_set(frame)
            bpy.context.view_layer.update()
            evidence.append(
                {"frame": frame, "view": "numeric-only",
                 "metrics": idle_metrics(target, target_map, baseline_foot_midpoint, baseline_hips)}
            )

    blend_path = out / "crimson_org_bvh_idle_transfer.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))

    # Emit the exact baked target as a browser-loadable review asset. The GLB
    # is diagnostic evidence for Pose Lab; it does not promote or alter motion.
    glb_path = out / "crimson_org_bvh_idle_transfer.glb"
    bpy.ops.object.select_all(action="DESELECT")
    for obj in target_objects:
        obj.hide_viewport = False
        obj.hide_render = False
        obj.select_set(True)
    bpy.context.view_layer.objects.active = target
    bpy.ops.export_scene.gltf(
        filepath=str(glb_path),
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_yup=True,
    )
    manifest = {
        "schema": SCHEMA,
        "status": "executed-idle-transfer-pending-visual-acceptance",
        "blender": bpy.app.version_string,
        "source": {"asset": str(SOURCE.relative_to(ROOT)), "sha256": sha256(SOURCE), "action": source_action.name},
        "target": {"asset": str(TARGET.relative_to(ROOT)), "sha256": sha256(TARGET), "action": target_action.name},
        "interchange": {
            "asset": bvh_path.name,
            "sha256": sha256(bvh_path),
            "jointCount": len(skeleton["joints"]),
            "frames": list(SAMPLES),
            "frameRate": skeleton["frameRate"],
            "units": skeleton["units"],
            "rootConvention": skeleton["rootMotion"],
            "rotationChannels": skeleton["rotationChannels"],
            "axisSelection": axis_selection,
            "sourceLayer": "ORG only",
            "proxyAction": proxy_action.name,
        },
        "sourceToProxy": source_proxy,
        "roundTrip": roundtrip,
        "targetSolve": target_solve,
        "sourceEvidence": source_evidence,
        "evidence": evidence,
        "conclusions": {
            "bvhSolved": [
                "small inspectable anatomical hierarchy",
                "evaluated ORG motion separated from Rigify controls and DEF segmentation",
                "deterministic hierarchy/channel/frame-rate/root interchange",
                "ORG-only native Idle transported to a clean canonical skeleton",
            ],
            "acceptanceGate": [
                "recognizable Crimson anatomy in every frame",
                "stable feet and root through the idle loop",
                "hands and arms arrive naturally without weapon constraints",
                "projected endpoints reconstruct under preserved Crimson limb lengths",
            ],
            "excluded": [
                "weapon loading or prop ownership",
                "grip sockets or bilateral closure",
                "weapon metrics",
                "armor-specific correction",
            ],
        },
        "blend": {"file": blend_path.name, "sha256": sha256(blend_path)},
        "reviewGlb": {
            "file": glb_path.name,
            "sha256": sha256(glb_path),
            "purpose": "hosted Pose Lab experimental review; exact baked target motion",
        },
    }
    manifest_path = out / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({"ok": True, "out": str(out), "manifest": str(manifest_path), "roundTrip": roundtrip}, indent=2))


if __name__ == "__main__":
    main()
