#!/usr/bin/env python3
"""Render one static Crimson/Vanguard shared rest pose from ten angles."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys

DEBIAN_DIST_PACKAGES = "/usr/lib/python3/dist-packages"
if DEBIAN_DIST_PACKAGES not in sys.path:
    sys.path.append(DEBIAN_DIST_PACKAGES)
from datetime import datetime, timezone
from pathlib import Path

import bpy
from mathutils import Euler, Vector

TOOL_DIR = Path(__file__).resolve().parent
if str(TOOL_DIR) not in sys.path:
    sys.path.insert(0, str(TOOL_DIR))

from render_crimson_vanguard_attack1_compare_blender import (
    CALIBRATION_JSON,
    CANDIDATE_JS,
    CRIMSON_GLB,
    REFERENCE_JSON,
    SWORD_GLB,
    VANGUARD_GLB,
    activate_named_action,
    add_label,
    apply_crimson_sword_material,
    body_screen_box,
    clear_scene,
    find_armature,
    find_pose_bone_world,
    foot_mesh_contact_metrics,
    import_glb,
    inject_animation,
    load_candidate,
    load_json,
    mesh_bounds,
    crimson_node_frames,
    normalize_and_offset,
    place_crimson_sword,
    project,
    screen_distance,
    set_frame,
    setup_scene,
    sha256,
    suppress_vanguard_root_motion,
    top_level,
)

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUT = ROOT / "generated" / "crimson-vanguard-shared-rest-compare" / "latest"
SCHEMA = "pose-lab-v2-crimson-vanguard-shared-rest-blender-compare-v1"
SHARED_REST_JSON = ROOT / "public" / "assets" / "crimson" / "crimson_shared_rest_baseline.json"
STATIC_SOURCE_LABEL = "baseline"
VANGUARD_SOURCE_LABEL = "start"
CAMERA_ANGLES = [
    ("01-front", 0, 0.95, 7.2),
    ("02-front-left", -35, 0.95, 7.2),
    ("03-left", -90, 0.95, 7.2),
    ("04-back-left", -145, 0.95, 7.2),
    ("05-back", 180, 0.95, 7.2),
    ("06-back-right", 145, 0.95, 7.2),
    ("07-right", 90, 0.95, 7.2),
    ("08-front-right", 35, 0.95, 7.2),
    ("09-high-front", 0, 1.45, 7.4),
    ("10-low-front", 0, 0.45, 7.0),
]
LANDMARKS = [
    ("Hips", "Hips", 0.18),
    ("Spine02", "Spine02", 0.18),
    ("Head", "Head", 0.2),
    ("LeftArm", "LeftArm", 0.32),
    ("LeftForeArm", "LeftForeArm", 0.34),
    ("LeftHand", "LeftHand", 0.36),
    ("RightArm", "RightArm", 0.32),
    ("RightForeArm", "RightForeArm", 0.34),
    ("RightHand", "RightHand", 0.36),
    ("LeftUpLeg", "LeftUpLeg", 0.28),
    ("LeftLeg", "LeftLeg", 0.28),
    ("LeftFoot", "LeftFoot", 0.32),
    ("RightUpLeg", "RightUpLeg", 0.28),
    ("RightLeg", "RightLeg", 0.28),
    ("RightFoot", "RightFoot", 0.32),
]


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def set_camera_view(camera: bpy.types.Object, yaw_deg: float, target_z: float, distance: float) -> None:
    yaw = math.radians(yaw_deg)
    target = Vector((0, 0, target_z))
    camera.location = Vector((math.sin(yaw) * distance, -math.cos(yaw) * distance, target_z + 0.1))
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.view_layer.update()


def normalized_screen_point(camera: bpy.types.Object, point: Vector, box: dict) -> tuple[float, float]:
    screen = project(camera, point)
    width = max(0.000001, box["xMax"] - box["xMin"])
    height = max(0.000001, box["yMax"] - box["yMin"])
    return ((screen[0] - box["xMin"]) / width, (screen[1] - box["yMin"]) / height)


def screen_angle_2d(a: tuple[float, float], b: tuple[float, float]) -> float:
    return math.degrees(math.atan2(b[1] - a[1], b[0] - a[0]))


def angle_delta_deg(a: float, b: float) -> float:
    return abs((a - b + 180) % 360 - 180)


def bone_world_points(armature: bpy.types.Object, source_names: dict[str, str], logical_name: str) -> dict | None:
    node_name = source_names.get(logical_name, logical_name)
    bone = armature.pose.bones.get(node_name)
    if not bone:
        return None
    matrix = armature.matrix_world @ bone.matrix
    axes = [
        (matrix.to_3x3() @ Vector((1, 0, 0))).normalized(),
        (matrix.to_3x3() @ Vector((0, 1, 0))).normalized(),
        (matrix.to_3x3() @ Vector((0, 0, 1))).normalized(),
    ]
    sole_normal = max(axes, key=lambda axis: abs(axis.z))
    if sole_normal.z < 0:
        sole_normal.negate()
    return {
        "origin": matrix.translation,
        "head": armature.matrix_world @ bone.head,
        "tail": armature.matrix_world @ bone.tail,
        "soleNormal": sole_normal,
    }


def foot_screen_metrics(camera: bpy.types.Object, armature: bpy.types.Object, source_names: dict[str, str], box: dict, logical_name: str) -> dict | None:
    points = bone_world_points(armature, source_names, logical_name)
    if not points:
        return None
    head = normalized_screen_point(camera, points["head"], box)
    tail = normalized_screen_point(camera, points["tail"], box)
    origin = normalized_screen_point(camera, points["origin"], box)
    length = math.hypot(tail[0] - head[0], tail[1] - head[1])
    return {
        "origin": [round(origin[0], 5), round(origin[1], 5)],
        "head": [round(head[0], 5), round(head[1], 5)],
        "tail": [round(tail[0], 5), round(tail[1], 5)],
        "axisAngleDeg": round(screen_angle_2d(head, tail), 3),
        "axisLength": round(length, 5),
        "worldOriginZ": round(points["origin"].z, 5),
        "worldHeadZ": round(points["head"].z, 5),
        "worldTailZ": round(points["tail"].z, 5),
        "soleNormalWorld": [round(value, 5) for value in points["soleNormal"]],
        "soleUpDot": round(points["soleNormal"].dot(Vector((0, 0, 1))), 5),
    }


def shared_rest_node_frames(shared_rest: dict) -> tuple[list[dict], dict[str, dict[str, dict[str, list]]]]:
    frame = {"label": STATIC_SOURCE_LABEL, "time": 0.0}
    node_frames: dict[str, dict[str, dict[str, list]]] = {}
    for bone, entry in (shared_rest.get("pose", {}).get("bones") or {}).items():
        quaternion = entry.get("quaternion")
        if quaternion:
            node_frames.setdefault(bone, {}).setdefault("rotation", {})[STATIC_SOURCE_LABEL] = [round(float(value), 6) for value in quaternion]
            continue
        rotation = entry.get("rotationDeg")
        if not rotation:
            continue
        quat = Euler(tuple(math.radians(float(value)) for value in rotation), "XYZ").to_quaternion()
        node_frames.setdefault(bone, {}).setdefault("rotation", {})[STATIC_SOURCE_LABEL] = [round(quat.x, 6), round(quat.y, 6), round(quat.z, 6), round(quat.w, 6)]
    return [frame], node_frames


def foot_pair_metrics(camera: bpy.types.Object, armature: bpy.types.Object, source_names: dict[str, str], box: dict, objects: list[bpy.types.Object]) -> dict:
    left = foot_screen_metrics(camera, armature, source_names, box, "LeftFoot")
    right = foot_screen_metrics(camera, armature, source_names, box, "RightFoot")
    low, _, _ = mesh_bounds(objects)
    spread = None
    if left and right:
        spread = abs(left["origin"][0] - right["origin"][0])
        for foot in [left, right]:
            foot["groundZ"] = round(low.z, 5)
            foot["heelGroundDelta"] = round(abs(foot["worldHeadZ"] - low.z), 5)
            foot["toeGroundDelta"] = round(abs(foot["worldTailZ"] - low.z), 5)
    return {"left": left, "right": right, "screenSpread": None if spread is None else round(spread, 5), "groundZ": round(low.z, 5)}



def disable_armature_animation(armature: bpy.types.Object) -> None:
    armature.data.pose_position = "POSE"
    if armature.animation_data:
        armature.animation_data.action = None
        for track in armature.animation_data.nla_tracks:
            track.mute = True
    bpy.context.view_layer.update()


def landmark_pose(armature: bpy.types.Object, source_names: dict[str, str], logical_name: str) -> Vector | None:
    node_name = source_names.get(logical_name, logical_name)
    bone = armature.pose.bones.get(node_name)
    if not bone:
        return None
    return (armature.matrix_world @ bone.matrix).translation


def evaluate_static_angle(
    label: str,
    camera: bpy.types.Object,
    vanguard_objects: list[bpy.types.Object],
    crimson_objects: list[bpy.types.Object],
    vanguard_armature: bpy.types.Object,
    crimson_armature: bpy.types.Object,
    sword_objects: list[bpy.types.Object],
    sword_socket,
    calibration: dict,
    source_names: dict[str, str],
) -> dict:
    crimson_box = body_screen_box(crimson_objects + sword_objects, camera)
    vanguard_box = body_screen_box(vanguard_objects, camera)
    failures = []
    landmark_errors = []
    for logical, target, threshold in LANDMARKS:
        vanguard_point = landmark_pose(vanguard_armature, source_names, logical)
        crimson_point = landmark_pose(crimson_armature, {}, target)
        if not vanguard_point or not crimson_point:
            continue
        v_norm = normalized_screen_point(camera, vanguard_point, vanguard_box)
        c_norm = normalized_screen_point(camera, crimson_point, crimson_box)
        error = math.hypot(c_norm[0] - v_norm[0], c_norm[1] - v_norm[1])
        landmark_errors.append({"logical": logical, "error": round(error, 4), "threshold": threshold})
    worst = max(landmark_errors, key=lambda item: item["error"], default=None)
    pose_failures = [item for item in landmark_errors if item["error"] > item["threshold"]]
    if pose_failures:
        failures.append({
            "code": "CRIMSON_NOT_SAME_SHARED_REST_POSE_AS_VANGUARD",
            "actual": sorted(pose_failures, key=lambda item: item["error"], reverse=True)[:5],
            "expected": "Crimson normalized landmarks match Vanguard static rest landmarks from this camera angle",
        })
    hand_world = find_pose_bone_world(crimson_armature, "RightHand")
    hilt = sword_socket.translation
    hilt_hand_world = (hilt - hand_world.translation).length
    if hilt_hand_world > 0.28:
        failures.append({
            "code": "CRIMSON_SHARED_REST_HILT_NOT_OWNED_BY_RIGHT_HAND",
            "actual": round(hilt_hand_world, 4),
            "expected": "<= 0.28 world units",
        })
    low, high, _ = mesh_bounds(sword_objects)
    sword_visible = screen_distance(project(camera, low), project(camera, high))
    if sword_visible < 0.04:
        failures.append({
            "code": "CRIMSON_SHARED_REST_SWORD_NOT_READABLE",
            "actual": round(sword_visible, 4),
            "expected": ">= 0.04 screen units",
        })
    vanguard_feet = foot_pair_metrics(camera, vanguard_armature, source_names, vanguard_box, vanguard_objects)
    crimson_feet = foot_pair_metrics(camera, crimson_armature, {}, crimson_box, crimson_objects)
    crimson_ground_z = mesh_bounds(crimson_objects)[0].z
    crimson_contacts = {side.lower(): foot_mesh_contact_metrics(crimson_objects, crimson_armature, side, crimson_ground_z) for side in ["Left", "Right"]}
    foot_failures = []
    if vanguard_feet["screenSpread"] is None or crimson_feet["screenSpread"] is None:
        foot_failures.append({"code": "FOOT_LANDMARKS_MISSING", "actual": {"vanguard": vanguard_feet, "crimson": crimson_feet}, "expected": "both rigs expose LeftFoot and RightFoot landmarks"})
    else:
        ratio = crimson_feet["screenSpread"] / max(0.000001, vanguard_feet["screenSpread"])
        if crimson_feet["screenSpread"] < 0.1 or ratio < 0.72 or ratio > 1.32:
            foot_failures.append({"code": "CRIMSON_SHARED_REST_FOOT_SPREAD_DOES_NOT_MATCH_VANGUARD", "actual": {"crimsonSpread": crimson_feet["screenSpread"], "vanguardSpread": vanguard_feet["screenSpread"], "ratio": round(ratio, 4)}, "expected": "Crimson feet keep a comparable planted stance width"})
    for side in ["left", "right"]:
        vf = vanguard_feet.get(side)
        cf = crimson_feet.get(side)
        if not vf or not cf:
            continue
        if vf["axisLength"] >= 0.015 and cf["axisLength"] >= 0.015:
            delta = angle_delta_deg(cf["axisAngleDeg"], vf["axisAngleDeg"])
            if delta > 42:
                foot_failures.append({"code": f"CRIMSON_SHARED_REST_{side.upper()}_FOOT_AXIS_DIVERGES_FROM_VANGUARD", "actual": {"crimsonAxisDeg": cf["axisAngleDeg"], "vanguardAxisDeg": vf["axisAngleDeg"], "deltaDeg": round(delta, 3)}, "expected": "boot bone axis should read like the source foot, not only place the ankle"})
        contact = crimson_contacts.get(side)
        if not contact:
            foot_failures.append({"code": f"CRIMSON_SHARED_REST_{side.upper()}_FOOT_MESH_CONTACT_MISSING", "actual": None, "expected": "weighted boot vertices expose heel, toe, and sole contact"})
            continue
        if contact["soleUpDot"] < 0.82 or contact["lateralEdgeHeightDelta"] > 0.055:
            foot_failures.append({"code": f"CRIMSON_SHARED_REST_{side.upper()}_BOOT_ROLLED_OFF_SOLE", "actual": contact, "expected": "weighted boot contact plane faces ground-up without standing on an outer edge"})
        if contact["heelGroundDelta"] > 0.045 or contact["toeGroundDelta"] > 0.045:
            foot_failures.append({"code": f"CRIMSON_SHARED_REST_{side.upper()}_HEEL_TOE_NOT_ON_GROUND", "actual": contact, "expected": "weighted heel and toe vertices stay near the shared mesh ground plane"})
    if foot_failures:
        failures.append({
            "code": "CRIMSON_SHARED_REST_FEET_NOT_PLANTED_LIKE_VANGUARD",
            "actual": foot_failures,
            "expected": "Feet must satisfy spread and visible foot-axis predicates, not only ankle origins",
        })
    return {
        "label": label,
        "sourcePose": STATIC_SOURCE_LABEL,
        "crimson": {"bodyBox": crimson_box, "hiltHandWorld": round(hilt_hand_world, 5), "swordScreenLength": round(sword_visible, 5), "feet": crimson_feet, "meshContacts": crimson_contacts},
        "vanguard": {"bodyBox": vanguard_box, "feet": vanguard_feet},
        "landmarkWorst": worst,
        "landmarkErrors": landmark_errors,
        "failures": failures,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT))
    parser.add_argument("--samples", type=int, default=8)
    parser.add_argument("--width", type=int, default=1280)
    parser.add_argument("--height", type=int, default=720)
    parser.add_argument("--skip-render", action="store_true")
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    args = parser.parse_args(argv)
    out_dir = Path(args.out_dir)
    if not out_dir.is_absolute():
        out_dir = ROOT / out_dir
    out_dir.mkdir(parents=True, exist_ok=True)
    reference = load_json(REFERENCE_JSON)
    calibration = load_json(CALIBRATION_JSON)
    shared_rest = load_json(SHARED_REST_JSON)
    if shared_rest.get("schema") != "pose-lab-v2-crimson-shared-rest-baseline-v2":
        raise RuntimeError("SharedRest baseline artifact schema mismatch")
    tmp_dir = out_dir / "tmp"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    source_contract_failures = []
    for path_key, hash_key in [("characterAsset", "characterAssetSha256"), ("authoredPose", "authoredPoseSha256")]:
        source_path = ROOT / shared_rest.get("source", {}).get(path_key, "")
        expected_sha = shared_rest.get("source", {}).get(hash_key)
        if not source_path.exists() or not expected_sha:
            source_contract_failures.append({"frame": "source", "code": f"SHARED_REST_{path_key.upper()}_MISSING", "actual": str(source_path), "expected": "baseline cites an existing hashed source artifact"})
        else:
            actual_sha = hashlib.sha256(source_path.read_bytes()).hexdigest()
            if actual_sha != expected_sha:
                source_contract_failures.append({"frame": "source", "code": f"SHARED_REST_{path_key.upper()}_HASH_MISMATCH", "actual": actual_sha, "expected": expected_sha})
    if shared_rest.get("source", {}).get("notDerivedFromVanguardAttackFrameZero") is not True:
        source_contract_failures.append({"frame": "source", "code": "SHARED_REST_BASELINE_PROVENANCE_NOT_INDEPENDENT", "actual": shared_rest.get("source"), "expected": "baseline artifact proves it is not Attack1 frame zero"})
    foot_truth = shared_rest.get("footTruth", {})
    feet = foot_truth.get("feet", {})
    required_foot_fields = {"footBone", "toeBone", "ankleWorld", "expectedWorldQuaternion", "heelLocal", "toeLocal", "soleNormalLocal"}
    if foot_truth.get("status") != "calibrated" or any(not required_foot_fields.issubset((feet.get(side) or {}).keys()) for side in ["left", "right"]):
        source_contract_failures.append({
            "frame": "source",
            "code": "CRIMSON_SHARED_REST_FOOT_CONTRACT_INCOMPLETE",
            "actual": foot_truth,
            "expected": "calibrated left/right heel, toe, sole-normal, ankle, and orientation landmarks derived from hashed source artifacts",
        })
    if source_contract_failures:
        manifest = {
            "schema": SCHEMA,
            "createdAt": utc_now(),
            "classification": "diagnostic-blocker-not-acceptance",
            "sourcePose": {
                "vanguard": "blocked before Blender import",
                "crimson": shared_rest.get("id"),
                "animationPlayback": False,
            },
            "expected": "SharedRest must be an independent authored pose with solved foot truth before side-by-side Blender review.",
            "status": "FAIL",
            "frames": [],
            "failureCount": len(source_contract_failures),
            "brokenTransformsPath": "broken_shared_rest_pose.json",
            "note": "Fail-closed source contract gate. Blender import/render is skipped because the independent SharedRest baseline artifact is missing solved foot truth.",
        }
        (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
        broken = {"schema": "pose-lab-v2-broken-shared-rest-pose-v1", "createdAt": utc_now(), "failures": source_contract_failures}
        (out_dir / "broken_shared_rest_pose.json").write_text(json.dumps(broken, indent=2), encoding="utf-8")
        print(json.dumps({"ok": False, "outDir": str(out_dir.relative_to(ROOT)), "failureCount": len(source_contract_failures), "brokenTransforms": str((out_dir / "broken_shared_rest_pose.json").relative_to(ROOT))}, indent=2))
        sys.exit(1)
    static_frames, crimson_nodes = shared_rest_node_frames(shared_rest)
    if len(static_frames) != 1:
        raise RuntimeError("missing one static Crimson shared-rest frame")
    crimson_anim = inject_animation(CRIMSON_GLB, static_frames, crimson_nodes, tmp_dir / "crimson_shared_rest_compare.glb", "CrimsonSharedRestStatic")
    clear_scene()
    camera = setup_scene(args.width, args.height, args.samples)
    vanguard_objects = import_glb(VANGUARD_GLB)
    vanguard_armature = find_armature(vanguard_objects, "Vanguard")
    activate_named_action(vanguard_armature, "SwordAttack1_rig")
    normalize_and_offset(vanguard_objects, 1.7, -1.05)
    set_frame(float(reference["samples"][VANGUARD_SOURCE_LABEL]["sourceTime"]), 24)
    suppress_vanguard_root_motion(vanguard_armature)
    crimson_objects = import_glb(crimson_anim)
    crimson_armature = find_armature(crimson_objects, "Crimson")
    activate_named_action(crimson_armature, "CrimsonSharedRestStatic_CrimsonPlumeKnight_Armature")
    normalize_and_offset(crimson_objects, 1.7, 1.05)
    set_frame(0, 24)
    sword_objects = import_glb(SWORD_GLB)
    apply_crimson_sword_material(sword_objects)
    sword_initial = {obj.name: obj.matrix_world.copy() for obj in top_level(sword_objects)}
    bpy.context.view_layer.update()
    hand = find_pose_bone_world(crimson_armature, "RightHand")
    sword_socket = place_crimson_sword(sword_objects, sword_initial, hand, calibration)
    add_label("VANGUARD STATIC REST", (-1.05, -0.18, 1.9))
    add_label("CRIMSON SHARED REST", (1.05, -0.18, 1.9))
    source_names = reference.get("logicalBones") or {}
    frames = []
    all_failures = list(source_contract_failures)
    for index, (label, yaw, target_z, distance) in enumerate(CAMERA_ANGLES, start=1):
        set_camera_view(camera, yaw, target_z, distance)
        entry = evaluate_static_angle(label, camera, vanguard_objects, crimson_objects, vanguard_armature, crimson_armature, sword_objects, sword_socket, calibration, source_names)
        filename = f"{index:02d}-{label}.png"
        if args.skip_render:
            entry["image"] = None
            entry["sha256"] = None
        else:
            bpy.context.scene.render.filepath = str(out_dir / filename)
            bpy.ops.render.render(write_still=True)
            entry["image"] = filename
            entry["sha256"] = sha256(out_dir / filename)
        frames.append(entry)
        for failure in entry["failures"]:
            all_failures.append({"frame": label, **failure})
    manifest = {
        "schema": SCHEMA,
        "createdAt": utc_now(),
        "classification": "diagnostic-blocker-not-acceptance",
        "sourcePose": {
            "vanguard": "SwordAttack1 sample start/sourceTime 0, applied as static comparison pose",
            "crimson": "independent SharedRest baseline artifact",
            "animationPlayback": False,
        },
        "expected": "Ten screenshots show Crimson and Vanguard in one shared static rest pose; no timeline or animation playback hides pose mismatch.",
        "status": "FAIL" if all_failures else "PASS",
        "frames": frames,
        "failureCount": len(all_failures),
        "brokenTransformsPath": "broken_shared_rest_pose.json" if all_failures else None,
        "note": "Blender is diagnostic eyesight only. A pass here only permits cloud/browser review; it is not hosted visual acceptance.",
    }
    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    if all_failures:
        broken = {"schema": "pose-lab-v2-broken-shared-rest-pose-v1", "createdAt": utc_now(), "failures": all_failures}
        (out_dir / "broken_shared_rest_pose.json").write_text(json.dumps(broken, indent=2), encoding="utf-8")
        print(json.dumps({"ok": False, "outDir": str(out_dir.relative_to(ROOT)), "failureCount": len(all_failures), "brokenTransforms": str((out_dir / "broken_shared_rest_pose.json").relative_to(ROOT))}, indent=2))
        sys.exit(1)
    print(json.dumps({"ok": True, "outDir": str(out_dir.relative_to(ROOT)), "frames": len(frames)}, indent=2))


if __name__ == "__main__":
    main()
