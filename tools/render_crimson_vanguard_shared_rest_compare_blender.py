#!/usr/bin/env python3
"""Render one static Crimson/Vanguard shared rest pose from ten angles."""

from __future__ import annotations

import argparse
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

import bpy
from mathutils import Vector

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
STATIC_SOURCE_LABEL = "start"
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
    return {
        "label": label,
        "sourcePose": STATIC_SOURCE_LABEL,
        "crimson": {"bodyBox": crimson_box, "hiltHandWorld": round(hilt_hand_world, 5), "swordScreenLength": round(sword_visible, 5)},
        "vanguard": {"bodyBox": vanguard_box},
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
    candidate = load_candidate(CANDIDATE_JS)
    calibration = load_json(CALIBRATION_JSON)
    if candidate.get("id") != "crimson-light-attack1-vanguard-3":
        raise RuntimeError("shared rest is bound to the current Crimson/Vanguard candidate source")
    tmp_dir = out_dir / "tmp"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    all_frames, crimson_nodes = crimson_node_frames(candidate)
    static_frames = [frame for frame in all_frames if frame["label"] == STATIC_SOURCE_LABEL]
    if len(static_frames) != 1:
        raise RuntimeError("missing one static Crimson shared-rest frame")
    crimson_anim = inject_animation(CRIMSON_GLB, static_frames, crimson_nodes, tmp_dir / "crimson_shared_rest_compare.glb", "CrimsonSharedRestStatic")
    clear_scene()
    camera = setup_scene(args.width, args.height, args.samples)
    vanguard_objects = import_glb(VANGUARD_GLB)
    vanguard_armature = find_armature(vanguard_objects, "Vanguard")
    activate_named_action(vanguard_armature, "SwordAttack1_rig")
    normalize_and_offset(vanguard_objects, 1.7, -1.05)
    set_frame(float(reference["samples"][STATIC_SOURCE_LABEL]["sourceTime"]), 24)
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
    all_failures = []
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
            "vanguard": "SwordAttack1 sample start/sourceTime 0, applied as static pose",
            "crimson": "crimson-light-attack1-vanguard-3 frame start, applied as static pose",
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
