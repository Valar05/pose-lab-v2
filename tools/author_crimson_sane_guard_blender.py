#!/usr/bin/env python3
"""Author one deliberately simple guarded idle directly on Crimson.

This is not a retarget.  Vanguard/BVH data is not loaded.  Crimson's own rest
geometry supplies bone lengths and roll; explicit world-space contacts, hand
targets, and a rigid Arborblade line supply the pose.
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
CHARACTER = ROOT / "public/assets/crimson/crimson_plume_knight_rigged_pbr.glb"
SWORD = ROOT / "public/assets/crimson/arborblade_sword.glb"
CALIBRATION = ROOT / "public/assets/crimson/crimson_sword_calibration.json"
BONE_MAP = ROOT / "experiments/bvh-retarget/bone-map.json"
DEFAULT_OUT = ROOT / "generated/crimson-sane-guard"
FRAMES = tuple(range(0, 24, 2))
ACTION_NAME = "CrimsonSaneGuardIdle"
SCHEMA = "pose-lab-v2-crimson-sane-guard-v1"
BROWSER_TO_BLENDER = Matrix(
    ((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1))
)
BLENDER_TO_BROWSER = BROWSER_TO_BLENDER.inverted()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in (
        bpy.data.actions,
        bpy.data.armatures,
        bpy.data.meshes,
        bpy.data.cameras,
    ):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


def import_glb(path: Path) -> list[bpy.types.Object]:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    return [obj for obj in bpy.data.objects if obj not in before]


def find_armature(objects: list[bpy.types.Object]) -> bpy.types.Object:
    armatures = [obj for obj in objects if obj.type == "ARMATURE"]
    if len(armatures) != 1:
        raise RuntimeError(
            f"expected one Crimson armature, found {[obj.name for obj in armatures]}"
        )
    return armatures[0]


def top_level(objects: list[bpy.types.Object]) -> list[bpy.types.Object]:
    owned = set(objects)
    return [obj for obj in objects if obj.parent not in owned]


def transform_matrix(transform: dict) -> Matrix:
    position = transform.get("position") or [0, 0, 0]
    rotation_deg = transform.get("rotationDeg") or [0, 0, 0]
    scale = transform.get("scale") or [1, 1, 1]
    return (
        Matrix.Translation(Vector(position))
        @ Euler(
            tuple(math.radians(value) for value in rotation_deg), "XYZ"
        ).to_matrix().to_4x4()
        @ Matrix.Diagonal((scale[0], scale[1], scale[2], 1.0))
    )


def browser_matrix(matrix: Matrix) -> Matrix:
    return BROWSER_TO_BLENDER @ matrix @ BLENDER_TO_BROWSER


def browser_transform_matrix(transform: dict) -> Matrix:
    return browser_matrix(transform_matrix(transform))


def browser_vector(values: list[float]) -> Vector:
    return (
        BROWSER_TO_BLENDER
        @ Vector((values[0], values[1], values[2], 0.0))
    ).to_3d()


def rest_joint_world(
    armature: bpy.types.Object, bone_map: dict[str, str], canonical: str
) -> Vector:
    return (
        armature.matrix_world
        @ armature.data.bones[bone_map[canonical]].matrix_local
    ).translation.copy()


def rest_rotation_world(
    armature: bpy.types.Object, bone_map: dict[str, str], canonical: str
) -> Quaternion:
    return (
        armature.matrix_world.to_quaternion()
        @ armature.data.bones[bone_map[canonical]].matrix_local.to_quaternion()
    ).normalized()


def rest_bone_direction_world(
    armature: bpy.types.Object, bone_map: dict[str, str], canonical: str
) -> Vector:
    bone = armature.data.bones[bone_map[canonical]]
    head = armature.matrix_world @ bone.head_local
    tail = armature.matrix_world @ bone.tail_local
    return (tail - head).normalized()


def joint_world(
    armature: bpy.types.Object, bone_map: dict[str, str], canonical: str
) -> Vector:
    return (
        armature.matrix_world @ armature.pose.bones[bone_map[canonical]].matrix
    ).translation.copy()


def body_basis(points: dict[str, Vector]) -> tuple[Vector, Vector, Vector]:
    up = (points["chest"] - points["hips"]).normalized()
    right = points["clavicle.R"] - points["clavicle.L"]
    right = (right - up * right.dot(up)).normalized()
    forward = right.cross(up).normalized()
    right = up.cross(forward).normalized()
    return right, up, forward


def solve_two_bone(
    root: Vector,
    target: Vector,
    pole_hint: Vector,
    upper_length: float,
    lower_length: float,
) -> tuple[Vector, Vector, float]:
    epsilon = max(1e-5, (upper_length + lower_length) * 1e-5)
    offset = target - root
    requested_distance = offset.length
    if requested_distance < epsilon:
        offset = Vector((0, 0, 1))
        requested_distance = 1.0
    minimum = abs(upper_length - lower_length) + epsilon
    maximum = upper_length + lower_length - epsilon
    distance = min(max(requested_distance, minimum), maximum)
    solved_target = root + offset.normalized() * distance
    direction = (solved_target - root).normalized()
    along = (
        upper_length * upper_length
        - lower_length * lower_length
        + distance * distance
    ) / (2.0 * distance)
    height = math.sqrt(max(0.0, upper_length * upper_length - along * along))
    pole = pole_hint - root
    pole_off_axis = pole - direction * pole.dot(direction)
    if pole_off_axis.length < epsilon:
        fallback = Vector((0, 1, 0))
        if abs(fallback.dot(direction)) > 0.95:
            fallback = Vector((1, 0, 0))
        pole_off_axis = fallback - direction * fallback.dot(direction)
    middle = root + direction * along + pole_off_axis.normalized() * height
    return middle, solved_target, (target - solved_target).length


def set_bone_direction_world(
    target: bpy.types.Object,
    target_map: dict[str, str],
    canonical: str,
    head_world: Vector,
    desired_direction: Vector,
    rest_direction: Vector,
    rest_rotation: Quaternion,
) -> None:
    desired = desired_direction.normalized()
    world_rotation = (
        rest_direction.rotation_difference(desired) @ rest_rotation
    ).normalized()
    bone = target.pose.bones[target_map[canonical]]
    bone.matrix = Matrix.LocRotScale(
        target.matrix_world.inverted() @ head_world,
        (
            target.matrix_world.to_quaternion().inverted() @ world_rotation
        ).normalized(),
        Vector((1, 1, 1)),
    )
    bpy.context.view_layer.update()


def set_bone_world_rotation(
    target: bpy.types.Object,
    target_map: dict[str, str],
    canonical: str,
    world_rotation: Quaternion,
) -> None:
    bone = target.pose.bones[target_map[canonical]]
    head = joint_world(target, target_map, canonical)
    bone.matrix = Matrix.LocRotScale(
        target.matrix_world.inverted() @ head,
        (
            target.matrix_world.to_quaternion().inverted() @ world_rotation
        ).normalized(),
        Vector((1, 1, 1)),
    )
    bpy.context.view_layer.update()


def reset_pose(target: bpy.types.Object) -> None:
    for pose_bone in target.pose.bones:
        pose_bone.matrix_basis = Matrix.Identity(4)
    bpy.context.view_layer.update()


def move_hips_world(
    target: bpy.types.Object,
    target_map: dict[str, str],
    desired_world: Vector,
) -> None:
    hips = target.pose.bones[target_map["hips"]]
    matrix = hips.matrix.copy()
    correction = desired_world - joint_world(target, target_map, "hips")
    matrix.translation += target.matrix_world.inverted().to_3x3() @ correction
    hips.matrix = matrix
    bpy.context.view_layer.update()


def set_leaf_rest_rotation(
    target: bpy.types.Object,
    target_map: dict[str, str],
    canonical: str,
    rest_rotations: dict[str, Quaternion],
) -> None:
    set_bone_world_rotation(
        target, target_map, canonical, rest_rotations[canonical]
    )


def solve_limb(
    target: bpy.types.Object,
    target_map: dict[str, str],
    rest_directions: dict[str, Vector],
    rest_rotations: dict[str, Quaternion],
    upper: str,
    lower: str,
    end: str,
    requested_end: Vector,
    pole: Vector,
    lengths: tuple[float, float],
) -> dict:
    root = joint_world(target, target_map, upper)
    middle, solved_end, clamp = solve_two_bone(
        root, requested_end, pole, lengths[0], lengths[1]
    )
    set_bone_direction_world(
        target,
        target_map,
        upper,
        root,
        middle - root,
        rest_directions[upper],
        rest_rotations[upper],
    )
    evaluated_middle = joint_world(target, target_map, lower)
    set_bone_direction_world(
        target,
        target_map,
        lower,
        evaluated_middle,
        solved_end - evaluated_middle,
        rest_directions[lower],
        rest_rotations[lower],
    )
    actual = joint_world(target, target_map, end)
    return {
        "requested": list(requested_end),
        "solved": list(solved_end),
        "actual": list(actual),
        "clamp": clamp,
        "endpointError": (actual - solved_end).length,
        "pole": list(pole),
    }


def sword_socket_matrix(
    target: bpy.types.Object,
    target_map: dict[str, str],
    hand_to_sword: Matrix,
) -> Matrix:
    hand = target.pose.bones[target_map["hand.R"]]
    return target.matrix_world @ hand.matrix @ hand_to_sword


def author_guard(
    target: bpy.types.Object,
    target_map: dict[str, str],
    calibration: dict,
) -> tuple[bpy.types.Action, dict]:
    order = [
        "hips",
        "spineLower",
        "spineMid",
        "chest",
        "neck",
        "head",
        "clavicle.L",
        "upperArm.L",
        "lowerArm.L",
        "hand.L",
        "clavicle.R",
        "upperArm.R",
        "lowerArm.R",
        "hand.R",
        "upperLeg.L",
        "lowerLeg.L",
        "foot.L",
        "upperLeg.R",
        "lowerLeg.R",
        "foot.R",
    ]
    rest_points = {
        name: rest_joint_world(target, target_map, name) for name in order
    }
    rest_rotations = {
        name: rest_rotation_world(target, target_map, name) for name in order
    }
    leaf_rest_directions = {
        name: rest_bone_direction_world(target, target_map, name)
        for name in ("head", "hand.L", "hand.R", "foot.L", "foot.R")
    }
    child = {
        "hips": "spineLower",
        "spineLower": "spineMid",
        "spineMid": "chest",
        "chest": "neck",
        "neck": "head",
        "clavicle.L": "upperArm.L",
        "upperArm.L": "lowerArm.L",
        "lowerArm.L": "hand.L",
        "clavicle.R": "upperArm.R",
        "upperArm.R": "lowerArm.R",
        "lowerArm.R": "hand.R",
        "upperLeg.L": "lowerLeg.L",
        "lowerLeg.L": "foot.L",
        "upperLeg.R": "lowerLeg.R",
        "lowerLeg.R": "foot.R",
    }
    rest_directions = {
        name: (rest_points[next_name] - rest_points[name]).normalized()
        for name, next_name in child.items()
    }
    right, up, forward = body_basis(rest_points)
    screen_right = Vector((1, 0, 0))
    screen_right = (
        screen_right - up * screen_right.dot(up)
    ).normalized()
    screen_left = -screen_right
    body_height = (rest_points["head"] - rest_points["hips"]).length
    whole_height = max(
        body_height,
        (rest_points["head"] - rest_points["foot.L"]).length,
        (rest_points["head"] - rest_points["foot.R"]).length,
    )
    lengths = {
        "arm.L": (
            (rest_points["lowerArm.L"] - rest_points["upperArm.L"]).length,
            (rest_points["hand.L"] - rest_points["lowerArm.L"]).length,
        ),
        "arm.R": (
            (rest_points["lowerArm.R"] - rest_points["upperArm.R"]).length,
            (rest_points["hand.R"] - rest_points["lowerArm.R"]).length,
        ),
        "leg.L": (
            (rest_points["lowerLeg.L"] - rest_points["upperLeg.L"]).length,
            (rest_points["foot.L"] - rest_points["lowerLeg.L"]).length,
        ),
        "leg.R": (
            (rest_points["lowerLeg.R"] - rest_points["upperLeg.R"]).length,
            (rest_points["foot.R"] - rest_points["lowerLeg.R"]).length,
        ),
    }

    grip = browser_transform_matrix(calibration["saberGripLocal"])
    sword_local = browser_transform_matrix(calibration["swordLocal"])
    hand_to_sword = grip @ sword_local
    blade_local = browser_vector(calibration["bladeLocalAxis"]).normalized()
    rest_hand_world = (
        target.matrix_world @ target.data.bones[target_map["hand.R"]].matrix_local
    )
    rest_blade_world = (
        (rest_hand_world @ hand_to_sword).to_3x3() @ blade_local
    ).normalized()
    desired_blade = (
        up * 0.88 + screen_left * 0.45 + forward * 0.12
    ).normalized()
    desired_hand_rotation = (
        rest_blade_world.rotation_difference(desired_blade)
        @ rest_hand_world.to_quaternion()
    ).normalized()
    zero_hand = Matrix.LocRotScale(
        Vector((0, 0, 0)),
        desired_hand_rotation,
        rest_hand_world.to_scale(),
    )
    hand_to_hilt_offset = (zero_hand @ hand_to_sword).translation

    # Feet are explicit contacts.  Left advances, right braces; neither moves
    # during the loop.
    left_foot = (
        rest_points["foot.L"]
        + forward * whole_height * 0.105
        + screen_right * whole_height * 0.025
    )
    right_foot = (
        rest_points["foot.R"]
        - forward * whole_height * 0.065
        + screen_left * whole_height * 0.025
    )
    base_hips = rest_points["hips"] - up * whole_height * 0.055

    action = bpy.data.actions.new(ACTION_NAME)
    target.animation_data_create()
    target.animation_data.action = None
    diagnostics = {
        "method": "direct Crimson authoring; no source rig and no retarget",
        "action": ACTION_NAME,
        "frames": [],
        "basis": {
            "right": list(right),
            "up": list(up),
            "forward": list(forward),
            "screenRight": list(screen_right),
        },
        "contacts": {
            "leftFoot": list(left_foot),
            "rightFoot": list(right_foot),
        },
        "desiredBlade": list(desired_blade),
    }

    for frame in FRAMES:
        phase = math.sin((frame / 24.0) * math.tau)
        breath = phase * whole_height * 0.003
        target.animation_data.action = None
        reset_pose(target)
        move_hips_world(target, target_map, base_hips + up * breath * 0.35)

        # Compact upright trunk with a tiny breath, not a transferred sway.
        trunk_directions = {
            "hips": (up + forward * 0.035).normalized(),
            "spineLower": (up + forward * (0.055 + phase * 0.008)).normalized(),
            "spineMid": (up + forward * (0.075 + phase * 0.010)).normalized(),
            "chest": (up + forward * (0.045 + phase * 0.008)).normalized(),
            "neck": (up - forward * 0.025).normalized(),
        }
        for name in ("hips", "spineLower", "spineMid", "chest", "neck"):
            set_bone_direction_world(
                target,
                target_map,
                name,
                joint_world(target, target_map, name),
                trunk_directions[name],
                rest_directions[name],
                rest_rotations[name],
            )

        # Shoulders stay low and broad.  They do not rise into the helmet.
        for side, direction in (
            ("L", (-right + forward * 0.06 - up * 0.08).normalized()),
            ("R", (right + forward * 0.06 - up * 0.08).normalized()),
        ):
            name = f"clavicle.{side}"
            set_bone_direction_world(
                target,
                target_map,
                name,
                joint_world(target, target_map, name),
                direction,
                rest_directions[name],
                rest_rotations[name],
            )

        # Planted legs: knees bend toward the stance direction, never sideways
        # into a kneel.
        leg_l = solve_limb(
            target,
            target_map,
            rest_directions,
            rest_rotations,
            "upperLeg.L",
            "lowerLeg.L",
            "foot.L",
            left_foot,
            left_foot + forward * whole_height * 0.18 + up * whole_height * 0.32,
            lengths["leg.L"],
        )
        leg_r = solve_limb(
            target,
            target_map,
            rest_directions,
            rest_rotations,
            "upperLeg.R",
            "lowerLeg.R",
            "foot.R",
            right_foot,
            right_foot + forward * whole_height * 0.14 + up * whole_height * 0.32,
            lengths["leg.R"],
        )
        set_leaf_rest_rotation(target, target_map, "foot.L", rest_rotations)
        set_leaf_rest_rotation(target, target_map, "foot.R", rest_rotations)

        chest = joint_world(target, target_map, "chest")
        desired_hilt = (
            chest
            + screen_right * whole_height * 0.105
            + forward * whole_height * 0.035
            + up * (whole_height * 0.015 + breath)
        )
        right_hand_target = desired_hilt - hand_to_hilt_offset
        right_root = joint_world(target, target_map, "upperArm.R")
        arm_r = solve_limb(
            target,
            target_map,
            rest_directions,
            rest_rotations,
            "upperArm.R",
            "lowerArm.R",
            "hand.R",
            right_hand_target,
            right_root
            + right * whole_height * 0.16
            + forward * whole_height * 0.13
            - up * whole_height * 0.06,
            lengths["arm.R"],
        )
        set_bone_world_rotation(
            target, target_map, "hand.R", desired_hand_rotation
        )
        socket = sword_socket_matrix(target, target_map, hand_to_sword)
        hilt = socket.translation.copy()
        grip_point = socket @ browser_vector([0, 0, -0.17])
        left_root = joint_world(target, target_map, "upperArm.L")
        arm_l = solve_limb(
            target,
            target_map,
            rest_directions,
            rest_rotations,
            "upperArm.L",
            "lowerArm.L",
            "hand.L",
            grip_point,
            left_root
            - right * whole_height * 0.14
            + forward * whole_height * 0.12
            - up * whole_height * 0.07,
            lengths["arm.L"],
        )
        # Let the left hand continue the left forearm into the lower grip.
        left_forearm_direction = (
            grip_point - joint_world(target, target_map, "lowerArm.L")
        ).normalized()
        set_bone_direction_world(
            target,
            target_map,
            "hand.L",
            joint_world(target, target_map, "hand.L"),
            left_forearm_direction,
            leaf_rest_directions["hand.L"],
            rest_rotations["hand.L"],
        )
        set_leaf_rest_rotation(target, target_map, "head", rest_rotations)

        frame_report = {
            "frame": frame,
            "phase": phase,
            "limbs": {
                "leg.L": leg_l,
                "leg.R": leg_r,
                "arm.R": arm_r,
                "arm.L": arm_l,
            },
            "hilt": list(hilt),
            "leftGripTarget": list(grip_point),
            "rightHand": list(joint_world(target, target_map, "hand.R")),
            "leftHand": list(joint_world(target, target_map, "hand.L")),
            "bladeDirection": list(
                ((socket.to_3x3() @ blade_local).normalized())
            ),
        }
        diagnostics["frames"].append(frame_report)

        keyed_basis = {
            name: target.pose.bones[target_map[name]].matrix_basis.copy()
            for name in order
        }
        target.animation_data.action = action
        bpy.context.scene.frame_set(frame)
        for name, matrix_basis in keyed_basis.items():
            target.pose.bones[target_map[name]].matrix_basis = matrix_basis
        bpy.context.view_layer.update()
        for name in order:
            bone = target.pose.bones[target_map[name]]
            bone.rotation_mode = "QUATERNION"
            bone.keyframe_insert("location", frame=frame, group=bone.name)
            bone.keyframe_insert(
                "rotation_quaternion", frame=frame, group=bone.name
            )
            bone.keyframe_insert("scale", frame=frame, group=bone.name)

    target.animation_data.action = action
    bpy.context.scene.frame_set(FRAMES[0])
    bpy.context.view_layer.update()
    diagnostics["maxClamp"] = max(
        limb["clamp"]
        for frame in diagnostics["frames"]
        for limb in frame["limbs"].values()
    )
    diagnostics["maxEndpointError"] = max(
        limb["endpointError"]
        for frame in diagnostics["frames"]
        for limb in frame["limbs"].values()
    )
    diagnostics["maxFootDrift"] = max(
        max(
            (
                Vector(frame["limbs"]["leg.L"]["actual"]) - left_foot
            ).length,
            (
                Vector(frame["limbs"]["leg.R"]["actual"]) - right_foot
            ).length,
        )
        for frame in diagnostics["frames"]
    )
    diagnostics["maxGripGap"] = max(
        (
            Vector(frame["leftHand"]) - Vector(frame["leftGripTarget"])
        ).length
        for frame in diagnostics["frames"]
    )
    return action, diagnostics


def mesh_bounds(objects: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    low = Vector((math.inf, math.inf, math.inf))
    high = Vector((-math.inf, -math.inf, -math.inf))
    depsgraph = bpy.context.evaluated_depsgraph_get()
    found = False
    for obj in objects:
        if obj.type != "MESH":
            continue
        found = True
        evaluated = obj.evaluated_get(depsgraph)
        for corner in evaluated.bound_box:
            point = evaluated.matrix_world @ Vector(corner)
            low.x, low.y, low.z = (
                min(low.x, point.x),
                min(low.y, point.y),
                min(low.z, point.z),
            )
            high.x, high.y, high.z = (
                max(high.x, point.x),
                max(high.y, point.y),
                max(high.z, point.z),
            )
    if not found:
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
    camera = bpy.data.objects.new(
        "CrimsonSaneGuardCamera", bpy.data.cameras.new("CrimsonSaneGuardCamera")
    )
    bpy.context.collection.objects.link(camera)
    camera.data.type = "ORTHO"
    scene.camera = camera
    return camera


def frame_camera(
    camera: bpy.types.Object,
    objects: list[bpy.types.Object],
    direction: Vector,
) -> None:
    low, high = mesh_bounds(objects)
    center = (low + high) * 0.5
    size = high - low
    camera.location = center + direction.normalized() * max(
        size.length * 2.2, 4.0
    )
    camera.rotation_euler = (
        center - camera.location
    ).to_track_quat("-Z", "Y").to_euler()
    camera.data.ortho_scale = max(size.x, size.y, size.z) * 1.28
    camera.data.clip_start = 0.01
    camera.data.clip_end = 1000


def apply_sword_material(objects: list[bpy.types.Object]) -> None:
    material = bpy.data.materials.new("CrimsonArborbladeVisibleSteel")
    material.diffuse_color = (0.58, 0.68, 0.74, 1.0)
    for obj in objects:
        if obj.type == "MESH":
            obj.data.materials.clear()
            obj.data.materials.append(material)


def place_sword(
    target: bpy.types.Object,
    target_map: dict[str, str],
    hand_to_sword: Matrix,
    sword_objects: list[bpy.types.Object],
    sword_base_matrices: dict[str, Matrix],
) -> None:
    socket = sword_socket_matrix(target, target_map, hand_to_sword)
    for obj in top_level(sword_objects):
        obj.matrix_world = socket @ sword_base_matrices[obj.name]
    bpy.context.view_layer.update()


def render(
    path: Path,
    camera: bpy.types.Object,
    objects: list[bpy.types.Object],
    direction: Vector,
) -> None:
    frame_camera(camera, objects, direction)
    bpy.context.scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT))
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    args = parser.parse_args(argv)
    out = Path(args.out_dir)
    if not out.is_absolute():
        out = ROOT / out
    out.mkdir(parents=True, exist_ok=True)

    calibration = json.loads(CALIBRATION.read_text())
    target_map = json.loads(BONE_MAP.read_text())["target"]["map"]
    bpy.context.scene.render.fps = 24
    hand_to_sword = (
        browser_transform_matrix(calibration["saberGripLocal"])
        @ browser_transform_matrix(calibration["swordLocal"])
    )
    clear_scene()
    character_objects = import_glb(CHARACTER)
    target = find_armature(character_objects)
    target.data.pose_position = "POSE"
    target.animation_data_clear()
    action, diagnostics = author_guard(target, target_map, calibration)
    (out / "diagnostics.json").write_text(
        json.dumps(diagnostics, indent=2) + "\n"
    )
    if diagnostics["maxClamp"] > 0.005:
        raise RuntimeError(
            f"guard target unreachable by {diagnostics['maxClamp']:.6f}m"
        )
    if diagnostics["maxEndpointError"] > 0.002:
        raise RuntimeError(
            "guard endpoint solve exceeded tolerance: "
            f"{diagnostics['maxEndpointError']:.6f}m"
        )

    sword_objects = import_glb(SWORD)
    apply_sword_material(sword_objects)
    sword_base_matrices = {
        obj.name: obj.matrix_world.copy() for obj in top_level(sword_objects)
    }
    render_objects = character_objects + sword_objects
    camera = setup_render()
    evidence = []
    for frame in FRAMES:
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        place_sword(
            target,
            target_map,
            hand_to_sword,
            sword_objects,
            sword_base_matrices,
        )
        image = out / f"guard-side-{frame:03d}.png"
        render(image, camera, render_objects, Vector((0, -1, 0.12)))
        evidence.append(
            {
                "frame": frame,
                "view": "locked-side",
                "image": image.name,
                "sha256": sha256(image),
            }
        )
    diagnostic_frame = FRAMES[len(FRAMES) // 2]
    for label, direction in (
        ("front", Vector((-1, 0, 0.08))),
        ("three-quarter", Vector((-1, -1, 0.12))),
        ("rear-three-quarter", Vector((1, 1, 0.12))),
    ):
        bpy.context.scene.frame_set(diagnostic_frame)
        bpy.context.view_layer.update()
        place_sword(
            target,
            target_map,
            hand_to_sword,
            sword_objects,
            sword_base_matrices,
        )
        image = out / f"guard-{label}.png"
        render(image, camera, render_objects, direction)
        evidence.append(
            {
                "frame": diagnostic_frame,
                "view": label,
                "image": image.name,
                "sha256": sha256(image),
            }
        )

    for obj in sword_objects:
        bpy.data.objects.remove(obj, do_unlink=True)
    blend_path = out / "crimson_sane_guard_idle.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    glb_path = out / "crimson_sane_guard_idle.glb"
    bpy.ops.object.select_all(action="DESELECT")
    for obj in character_objects:
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
        "status": "direct-authored-candidate-pending-human-review",
        "blender": bpy.app.version_string,
        "character": {
            "asset": str(CHARACTER.relative_to(ROOT)),
            "sha256": sha256(CHARACTER),
        },
        "sword": {
            "asset": str(SWORD.relative_to(ROOT)),
            "sha256": sha256(SWORD),
            "calibration": str(CALIBRATION.relative_to(ROOT)),
            "hierarchy": calibration["hierarchy"],
        },
        "action": {
            "name": action.name,
            "frames": list(FRAMES),
            "fps": 24,
            "loop": True,
        },
        "constraints": {
            "sourceRigLoaded": False,
            "retargetUsed": False,
            "bvhUsed": False,
            "feetLocked": True,
            "rigidSwordLine": True,
            "bilateralGripTargeted": True,
        },
        "diagnostics": {
            "maxClamp": diagnostics["maxClamp"],
            "maxEndpointError": diagnostics["maxEndpointError"],
            "maxFootDrift": diagnostics["maxFootDrift"],
            "maxGripGap": diagnostics["maxGripGap"],
        },
        "evidence": evidence,
        "reviewGlb": {
            "file": glb_path.name,
            "sha256": sha256(glb_path),
        },
        "blend": {"file": blend_path.name, "sha256": sha256(blend_path)},
    }
    manifest_path = out / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    print(
        json.dumps(
            {
                "ok": True,
                "manifest": str(manifest_path),
                "reviewGlb": str(glb_path),
                "diagnostics": manifest["diagnostics"],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
