#!/usr/bin/env python3
"""Author a Davin idle pose candidate from the latest screenshot target.

The authoring pass uses temporary Blender IK/target constraints, then bakes the
result to plain local bone quaternions for the Three.js candidate. It does not
ship runtime IK and it does not promote visual acceptance.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

import bpy
from mathutils import Euler, Vector

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_GLB = ROOT / "public" / "assets" / "davin" / "davin_wingsworth_kestrel_man_rigged_pbr_tail3.glb"
DEFAULT_SCREENSHOT = Path("/storage/emulated/0/Pictures/Screenshots/Screenshot_20260716-182009.png")
OUT_DIR = ROOT / "generated" / "davin-idle" / "screenshot-1"
OUT_JSON = OUT_DIR / "davin-idle-screenshot-1.json"
OUT_MODULE = ROOT / "src" / "review-candidates" / "davin-idle-screenshot-1.js"
EXPORT_NAME = "DAVIN_IDLE_SCREENSHOT_1"

BONE_ORDER = [
    "Hips", "Spine", "Spine01", "Spine02", "neck", "Head",
    "LeftShoulder", "LeftArm", "LeftForeArm", "LeftHand",
    "RightShoulder", "RightArm", "RightForeArm", "RightHand",
    "LeftUpLeg", "LeftLeg", "LeftFoot", "LeftToeBase",
    "RightUpLeg", "RightLeg", "RightFoot", "RightToeBase",
    "Tail01", "Tail02", "Tail03",
]

# FK seed before IK constraints. These values deliberately stay moderate: IK owns
# feet and wing endpoint placement, while FK gives the torso/head/tail the target
# attitude from Screenshot_20260716-182009.png.
POSE_DEGREES = {
    "Hips": (0, -4, -3),
    "Spine": (5, 0, 3),
    "Spine01": (5, 0, 3),
    "Spine02": (3, 0, 2),
    "neck": (-4, 6, -4),
    "Head": (-5, 18, -7),

    "LeftShoulder": (-18, 0, 12),
    "LeftArm": (-18, 14, 24),
    "LeftForeArm": (4, 10, 20),
    "LeftHand": (0, 6, 10),

    "RightShoulder": (-18, 0, -12),
    "RightArm": (-16, -12, -24),
    "RightForeArm": (0, -10, -20),
    "RightHand": (0, -6, -10),

    "LeftUpLeg": (0, 0, 0),
    "LeftLeg": (0, 0, 0),
    "LeftFoot": (0, 0, 0),
    "LeftToeBase": (0, 0, 0),
    "RightUpLeg": (0, 0, 0),
    "RightLeg": (0, 0, 0),
    "RightFoot": (0, 0, 0),
    "RightToeBase": (0, 0, 0),

    "Tail01": (-12, 0, -10),
    "Tail02": (-15, 0, -9),
    "Tail03": (-18, 0, -7),
}

IK_TARGETS = {
    # World-space targets chosen from the screenshot read: wide, grounded talons.
    # Constrain toe bones rather than ankles so the visible claws define the stance.
    "LeftToeBase": {"target": (0.43, 0.12, 0.03), "pole": (0.42, -0.42, 0.45), "chain": 4},
    "RightToeBase": {"target": (-0.42, 0.18, 0.03), "pole": (-0.42, -0.34, 0.45), "chain": 4},
    # Wing endpoint targets: one broad open wing and one tighter guard wing.
    "LeftHand": {"target": (0.72, -0.10, 0.92), "pole": (0.48, -0.55, 1.15), "chain": 3},
    "RightHand": {"target": (-0.46, -0.22, 1.03), "pole": (-0.28, -0.62, 1.28), "chain": 3},
}


def argv_after_blender() -> list[str]:
    return sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--glb", default=str(DEFAULT_GLB))
    parser.add_argument("--screenshot", default=str(DEFAULT_SCREENSHOT))
    parser.add_argument("--out-dir", default=str(OUT_DIR))
    parser.add_argument("--out-json", default=str(OUT_JSON))
    parser.add_argument("--out-module", default=str(OUT_MODULE))
    return parser.parse_args(argv_after_blender())


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def round_float(value: float, places: int = 6) -> float:
    return float(f"{value:.{places}f}")


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def import_glb(path: Path) -> list[bpy.types.Object]:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    return [obj for obj in bpy.data.objects if obj not in before]


def find_armature(objects: list[bpy.types.Object]) -> bpy.types.Object:
    for obj in objects:
        if obj.type == "ARMATURE":
            return obj
    raise RuntimeError("Davin armature not found")


def quat_from_degrees(values: tuple[float, float, float]) -> list[float]:
    euler = Euler(tuple(math.radians(v) for v in values), "XYZ")
    quat = euler.to_quaternion()
    return [round_float(quat.x), round_float(quat.y), round_float(quat.z), round_float(quat.w)]


def quat_to_list(quat) -> list[float]:
    return [round_float(quat.x), round_float(quat.y), round_float(quat.z), round_float(quat.w)]


def make_empty(name: str, location: tuple[float, float, float]) -> bpy.types.Object:
    empty = bpy.data.objects.new(name, None)
    empty.empty_display_type = "SPHERE"
    empty.empty_display_size = 0.04
    empty.location = location
    bpy.context.collection.objects.link(empty)
    return empty


def pose_world_head(armature: bpy.types.Object, bone_name: str) -> list[float] | None:
    pb = armature.pose.bones.get(bone_name)
    if pb is None:
        return None
    return [round_float(v, 4) for v in (armature.matrix_world @ pb.head)]


def apply_fk_seed(armature: bpy.types.Object) -> None:
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.mode_set(mode="POSE")
    for name in BONE_ORDER:
        pb = armature.pose.bones.get(name)
        if pb is None:
            continue
        pb.rotation_mode = "QUATERNION"
        quat_values = quat_from_degrees(POSE_DEGREES.get(name, (0, 0, 0)))
        pb.rotation_quaternion = (quat_values[3], quat_values[0], quat_values[1], quat_values[2])
    bpy.context.view_layer.update()


def add_ik_constraints(armature: bpy.types.Object) -> tuple[list[bpy.types.Object], dict]:
    controls = []
    report = {}
    for bone_name, spec in IK_TARGETS.items():
        pb = armature.pose.bones.get(bone_name)
        if pb is None:
            continue
        target = make_empty(f"DavinIdleIK_{bone_name}_target", spec["target"])
        pole = make_empty(f"DavinIdleIK_{bone_name}_pole", spec["pole"])
        controls.extend([target, pole])
        constraint = pb.constraints.new(type="IK")
        constraint.name = "DavinIdle_TemporaryIK"
        constraint.target = target
        constraint.pole_target = pole
        constraint.chain_count = int(spec["chain"])
        constraint.use_rotation = True
        constraint.weight = 1.0
        report[bone_name] = {
            "target": [round_float(v, 4) for v in spec["target"]],
            "pole": [round_float(v, 4) for v in spec["pole"]],
            "chain": int(spec["chain"]),
            "solvedHeadBeforeBake": None,
        }
    bpy.context.view_layer.update()
    # Several updates let Blender settle the IK constraints before baking.
    for _ in range(8):
        bpy.context.scene.frame_set(bpy.context.scene.frame_current)
        bpy.context.view_layer.update()
    for bone_name in report:
        report[bone_name]["solvedHeadBeforeBake"] = pose_world_head(armature, bone_name)
    return controls, report


def bake_visual_pose(armature: bpy.types.Object, controls: list[bpy.types.Object]) -> None:
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.mode_set(mode="POSE")
    bpy.ops.pose.select_all(action="SELECT")
    try:
        bpy.ops.pose.visual_transform_apply()
    except RuntimeError:
        # If Blender refuses the operator for this imported armature, leave the
        # evaluated constraint result in place long enough to snapshot quaternions.
        pass
    for pb in armature.pose.bones:
        for constraint in list(pb.constraints):
            if constraint.name == "DavinIdle_TemporaryIK":
                pb.constraints.remove(constraint)
    bpy.context.view_layer.update()
    bpy.ops.object.mode_set(mode="OBJECT")
    for obj in controls:
        bpy.data.objects.remove(obj, do_unlink=True)


def snapshot_bones(armature: bpy.types.Object) -> dict[str, list[float]]:
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.mode_set(mode="POSE")
    bones = {}
    missing = []
    for name in BONE_ORDER:
        pb = armature.pose.bones.get(name)
        if pb is None:
            missing.append(name)
            continue
        pb.rotation_mode = "QUATERNION"
        bones[name] = quat_to_list(pb.rotation_quaternion)
    bpy.ops.object.mode_set(mode="OBJECT")
    if missing:
        print(json.dumps({"warning": "missing bones", "bones": missing}))
    return bones


def author_pose(armature: bpy.types.Object) -> tuple[dict[str, list[float]], dict]:
    apply_fk_seed(armature)
    controls, ik_report = add_ik_constraints(armature)
    bake_visual_pose(armature, controls)
    bones = snapshot_bones(armature)
    return bones, ik_report


def main() -> None:
    args = parse_args()
    glb = Path(args.glb).resolve()
    screenshot = Path(args.screenshot).resolve()
    out_dir = Path(args.out_dir).resolve()
    out_json = Path(args.out_json).resolve()
    out_module = Path(args.out_module).resolve()
    if out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    out_json.parent.mkdir(parents=True, exist_ok=True)
    out_module.parent.mkdir(parents=True, exist_ok=True)
    clear_scene()
    imported = import_glb(glb)
    armature = find_armature(imported)
    bones, ik_report = author_pose(armature)
    output = {
        "schema": "pose-lab-v2-davin-idle-candidate-v1",
        "label": "Davin Wingsworth screenshot idle 1",
        "status": "quarantined-review",
        "source": {
            "actor": "Davin Wingsworth",
            "targetModel": "./public/assets/davin/davin_wingsworth_kestrel_man_rigged_pbr_tail3.glb",
            "sourceScreenshot": str(screenshot),
            "sourceScreenshotSha256": sha256(screenshot) if screenshot.exists() else None,
            "sourceScreenshotTimestamp": "2026-07-16T18:20:09-05:00",
            "method": "temporary-blender-ik-solve-baked-to-local-quaternion-candidate",
            "weaponless": True,
            "authoringControls": {
                "runtimeIk": False,
                "openPose": False,
                "temporaryIkTargets": ik_report,
                "fkSeedDegrees": POSE_DEGREES,
            },
            "retargetPolicy": {
                "channels": ["quaternion"],
                "ignoredChannels": ["position", "scale"],
                "noRuntimeSolver": True,
            },
            "visualContract": [
                "head faces viewer-right in a hawk-cop guard stance",
                "torso leans forward, not a neutral A-pose",
                "screen-left wing sweeps back and open",
                "screen-right wing bends up as a guard",
                "wide crouched talon stance with both feet grounded",
                "tail reads as a low rear fan, driven by Tail01/Tail02/Tail03",
            ],
        },
        "primeKeys": {"idle": 0, "idleHold": 0.041667},
        "guardReport": {
            "status": "QUARANTINED",
            "visualAcceptance": "not-run",
            "phaseCount": 2,
            "mappedBoneCount": len(bones),
            "note": "IK-assisted screenshot-derived idle pose pass. Local render decides whether to iterate before hosted review.",
        },
        "frames": [
            {
                "label": "idle",
                "time": 0,
                "evidenceKey": "davin:idle:screenshot:20260716-182009",
                "sourceExpectedPath": str(screenshot),
                "note": "Target screenshot idle pose, not accepted visual truth.",
                "bones": bones,
            },
            {
                "label": "idleHold",
                "time": 0.041667,
                "evidenceKey": "davin:idle:screenshot:20260716-182009:hold",
                "sourceExpectedPath": str(screenshot),
                "note": "Duplicate hold key for static idle render/playback compatibility.",
                "bones": bones,
            },
        ],
    }
    out_json.write_text(json.dumps(output, indent=2) + "\n")
    out_module.write_text(f"export const {EXPORT_NAME} = {json.dumps(output, indent=2)};\n")
    print(json.dumps({
        "ok": True,
        "outJson": str(out_json.relative_to(ROOT)),
        "outModule": str(out_module.relative_to(ROOT)),
        "bones": len(bones),
        "sourceScreenshot": str(screenshot),
        "ikTargets": sorted(ik_report.keys()),
    }, indent=2))


if __name__ == "__main__":
    main()
