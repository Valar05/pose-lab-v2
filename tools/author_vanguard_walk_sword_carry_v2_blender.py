#!/usr/bin/env python3
"""Author a quarantined Steel Vanguard sword-carry acting pass.

The approved Walk v1 lower body and timing remain authoritative. This direct
final-rig pass adds restrained, phase-lagged secondary motion to the complete
shoulder/arm/hand/Weapon.R system without retargeting or changing locomotion.
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from author_vanguard_walk_blender import (  # noqa: E402
    LANDMARKS,
    POSES,
    SUPPORT,
    TIMING_MS,
    apply_snapshot,
    authored_walk_snapshot,
    bone_point,
    bounds,
    configure,
    point,
    pose_snapshot,
    render_set,
)
from render_animation_pose_packet import (  # noqa: E402
    clear_scene,
    evaluated_world_vertices,
    flatten_matrix,
    is_weapon_object,
    lock_camera,
    make_camera,
    select_action,
    select_armature,
    sha256,
)

UPPER_WEIGHT = 0.24
UPPER_PHASE_LAG = 1


def cli_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--asset", required=True)
    parser.add_argument("--out-dir", required=True)
    values = sys.argv
    return parser.parse_args(values[values.index("--") + 1 :] if "--" in values else [])


def is_carry_bone(name: str) -> bool:
    compact = name.lower()
    return (
        any(token in compact for token in ("shoulder", "upper_arm", "forearm", "hand"))
        or compact == "weapon.r"
    )


def blend_transform(base, motion, weight: float):
    base_loc, mode, base_quat, base_euler, base_scale = base
    motion_loc, _, motion_quat, motion_euler, motion_scale = motion
    location = base_loc.lerp(motion_loc, weight)
    scale = base_scale.lerp(motion_scale, weight)
    quaternion = base_quat.slerp(motion_quat, weight)
    euler = base_euler.copy()
    if mode != "QUATERNION":
        euler.x += (motion_euler.x - base_euler.x) * weight
        euler.y += (motion_euler.y - base_euler.y) * weight
        euler.z += (motion_euler.z - base_euler.z) * weight
    return location, mode, quaternion, euler, scale


def carry_snapshot(walk_v1, idle, lagged_motion):
    result = dict(walk_v1)
    for name in result:
        if is_carry_bone(name):
            result[name] = blend_transform(idle[name], lagged_motion[name], UPPER_WEIGHT)
    return result


def transforms_match(left, right, epsilon: float = 1e-8) -> bool:
    if left is right:
        return True
    left_loc, left_mode, left_quat, left_euler, left_scale = left
    right_loc, right_mode, right_quat, right_euler, right_scale = right
    return (
        left_mode == right_mode
        and (left_loc - right_loc).length <= epsilon
        and abs(left_quat.dot(right_quat)) >= 1.0 - epsilon
        and (left_euler - right_euler).length <= epsilon
        and (left_scale - right_scale).length <= epsilon
    )


def assert_locomotion_identity(walk_v1_snaps, candidate_snaps) -> None:
    for frame, (walk_v1, candidate) in enumerate(zip(walk_v1_snaps, candidate_snaps)):
        for name in walk_v1:
            if is_carry_bone(name):
                continue
            if not transforms_match(walk_v1[name], candidate[name]):
                raise RuntimeError(f"Walk v1 locomotion changed at frame {frame}: {name}")


def lock_front_camera(camera, lower: Vector, upper: Vector, aspect: float) -> None:
    center = (lower + upper) * 0.5
    span = upper - lower
    visible_width = span.x
    visible_height = span.z
    camera.data.ortho_scale = max(visible_height * 1.16, (visible_width / aspect) * 1.16)
    distance = max(span.x, span.y, span.z) * 3.0 + 3.0
    camera.location = Vector((center.x, lower.y - distance, center.z))
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.view_layer.update()


def add_blade_angles(records) -> None:
    for record in records:
        weapon = record["weapon"]
        dx = weapon["tip"]["x"] - weapon["hilt"]["x"]
        dy = weapon["tip"]["y"] - weapon["hilt"]["y"]
        weapon["bladeAngleDeg"] = round(math.degrees(math.atan2(dy, dx)), 4)


def motion_summary(records) -> dict[str, float]:
    hilt_x = [frame["weapon"]["hilt"]["x"] for frame in records]
    hilt_y = [frame["weapon"]["hilt"]["y"] for frame in records]
    tip_x = [frame["weapon"]["tip"]["x"] for frame in records]
    tip_y = [frame["weapon"]["tip"]["y"] for frame in records]
    angles = [frame["weapon"]["bladeAngleDeg"] for frame in records]
    return {
        "hiltRangeXpx": round(max(hilt_x) - min(hilt_x), 4),
        "hiltRangeYpx": round(max(hilt_y) - min(hilt_y), 4),
        "tipRangeXpx": round(max(tip_x) - min(tip_x), 4),
        "tipRangeYpx": round(max(tip_y) - min(tip_y), 4),
        "bladeAngleRangeDeg": round(max(angles) - min(angles), 4),
    }


def assert_guarded_arc(records, summary) -> None:
    hilt_span = math.hypot(summary["hiltRangeXpx"], summary["hiltRangeYpx"])
    tip_span = math.hypot(summary["tipRangeXpx"], summary["tipRangeYpx"])
    if hilt_span < 3.0 or tip_span < 8.0 or summary["bladeAngleRangeDeg"] < 1.0:
        raise RuntimeError(f"Sword carry is still frozen: {summary}")
    if hilt_span > 55.0 or tip_span > 110.0 or summary["bladeAngleRangeDeg"] > 24.0:
        raise RuntimeError(f"Sword carry reads as wag/attack: {summary}")
    for frame in records:
        weapon = frame["weapon"]
        if weapon["leftHandHiltDistancePx"] > 75 or weapon["rightHandHiltDistancePx"] > 75:
            raise RuntimeError(f"Grip detached at frame {frame['index']}: {weapon}")
        if weapon["handDepthDelta"] > 1.0:
            raise RuntimeError(f"Grip depth split at frame {frame['index']}: {weapon}")


def main() -> None:
    args = cli_args()
    root = Path(__file__).resolve().parents[1]
    asset = (root / args.asset).resolve()
    out = (root / args.out_dir).resolve()

    clear_scene()
    bpy.ops.import_scene.gltf(filepath=str(asset))
    scene = bpy.context.scene
    armature = select_armature()
    armature.animation_data_create()
    legacy = select_action("RunForwardOld")
    idle = select_action("Idle")
    start, end = map(float, legacy.frame_range)
    samples = [start + (end - start) * index / 8 for index in range(8)]

    armature.animation_data.action = idle
    scene.frame_set(int(idle.frame_range[0]))
    bpy.context.view_layer.update()
    idle_snapshot = pose_snapshot(armature)

    motion_snapshots = []
    armature.animation_data.action = legacy
    for frame in samples:
        scene.frame_set(int(frame), subframe=frame - int(frame))
        bpy.context.view_layer.update()
        motion_snapshots.append(pose_snapshot(armature))

    walk_v1_snaps = [
        authored_walk_snapshot(idle_snapshot, motion)
        for motion in motion_snapshots
    ]
    candidate_snaps = [
        carry_snapshot(
            walk_v1_snaps[index],
            idle_snapshot,
            motion_snapshots[(index - UPPER_PHASE_LAG) % 8],
        )
        for index in range(8)
    ]
    assert_locomotion_identity(walk_v1_snaps, candidate_snaps)

    action = bpy.data.actions.new("WalkSwordCarryV2")
    armature.animation_data.action = action
    for index, snapshot in enumerate(candidate_snaps):
        apply_snapshot(armature, snapshot, index)
    for fcurve in action.fcurves:
        for keyframe in fcurve.keyframe_points:
            keyframe.interpolation = "BEZIER"
    action["pose_authority"] = "Steel Vanguard Walk v1 lower body"
    action["authoring_lane"] = "direct-final-rig"
    action["authored_pose_count"] = 8
    action["root_motion_suppressed"] = True
    action["weapon_contract"] = "embedded: Weapon.R"

    meshes = [obj for obj in scene.objects if obj.type == "MESH" and not obj.hide_render]
    weapon_meshes = [obj.name for obj in meshes if is_weapon_object(obj)]
    if len(weapon_meshes) != 1:
        raise RuntimeError(f"Expected one embedded sword mesh, found {weapon_meshes}")
    configure(scene, meshes)
    lower, upper = bounds(scene, armature, meshes, [(action, list(range(8)))])

    side_camera = make_camera(scene)
    lock_camera(side_camera, "left", lower, upper, 1.0)
    side_records = render_set(
        scene, armature, action, list(range(8)), side_camera, meshes,
        out / "side", "walkswordcarryv2", False,
    )
    add_blade_angles(side_records)
    summary = motion_summary(side_records)
    assert_guarded_arc(side_records, summary)

    front_camera = make_camera(scene)
    lock_front_camera(front_camera, lower, upper, 1.0)
    orthogonal_records = render_set(
        scene, armature, action, list(range(8)), front_camera, meshes,
        out / "orthogonal", "walkswordcarryv2-front", False,
    )
    add_blade_angles(orthogonal_records)

    armature.animation_data.action = action
    export = out / "vanguard_walk_sword_carry_v2.glb"
    bpy.ops.export_scene.gltf(
        filepath=str(export),
        export_format="GLB",
        export_animations=True,
        export_current_frame=False,
    )

    metadata = {
        "schema": "pose-lab-v2-vanguard-walk-sword-carry-v2",
        "status": "rendered-pending-visual-review",
        "source": {
            "asset": args.asset,
            "assetSha256": sha256(asset),
            "lowerBodyAuthority": "Steel Vanguard Walk v1 construction at PR #8 head 90ca534c46a47c660e7bf5ef7bd2efcf35dbeb9e",
            "action": "WalkSwordCarryV2",
            "authoringLane": "direct-final-rig",
            "motionPrinciple": "restrained guarded carry with one-pose inertial lag",
        },
        "contract": {
            "poseCount": 8,
            "poseOrder": list(POSES),
            "screenFacing": "right",
            "timingMs": list(TIMING_MS),
            "rootMotionSuppressed": True,
            "retargeting": False,
            "mirroring": False,
            "perFrameStabilization": False,
            "reframing": False,
            "weapon": {
                "mode": "embedded",
                "mesh": weapon_meshes[0],
                "driverBone": "Weapon.R",
            },
            "upperWeight": UPPER_WEIGHT,
            "upperPhaseLagPoses": UPPER_PHASE_LAG,
        },
        "sideCamera": {
            "matrixWorld": flatten_matrix(side_camera.matrix_world),
            "orthoScale": round(side_camera.data.ortho_scale, 9),
        },
        "orthogonalCamera": {
            "matrixWorld": flatten_matrix(front_camera.matrix_world),
            "orthoScale": round(front_camera.data.ortho_scale, 9),
        },
        "motionSummary": summary,
        "frames": side_records,
        "orthogonalFrames": orthogonal_records,
        "export": {
            "path": export.name,
            "sha256": sha256(export),
        },
    }
    out.mkdir(parents=True, exist_ok=True)
    (out / "metadata.json").write_text(json.dumps(metadata, indent=2) + "\n")
    print(json.dumps({"status": "RENDERED", "poses": 8, "motion": summary}))


if __name__ == "__main__":
    main()
