#!/usr/bin/env python3
"""Render Vanguard's native Idle action as a deterministic game sprite sequence."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import bpy
from mathutils import Vector

TOOL_DIR = Path(__file__).resolve().parent
if str(TOOL_DIR) not in sys.path:
    sys.path.insert(0, str(TOOL_DIR))

from render_animation_pose_packet import (  # noqa: E402
    capture_weapon,
    clear_scene,
    evaluated_world_vertices,
    flatten_matrix,
    is_weapon_object,
    lock_camera,
    make_camera,
    select_action,
    select_armature,
    set_native_pose,
    sha256,
    suppress_root_motion,
)


SCHEMA = "pose-lab-v2-vanguard-idle-game-export-v1"
FOOT_BONE_CANDIDATES = {
    "left": ("foot.fk.L", "foot.ik.L", "DEF-foot.L", "foot.L"),
    "right": ("foot.fk.R", "foot.ik.R", "DEF-foot.R", "foot.R"),
}


def cli_args() -> argparse.Namespace:
    argv = sys.argv
    argv = argv[argv.index("--") + 1 :] if "--" in argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--asset", required=True)
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--action", default="Idle")
    parser.add_argument("--frame-count", type=int, default=12)
    parser.add_argument("--output-fps", type=float, default=12.0)
    parser.add_argument("--source-fps", type=float, default=60.0)
    parser.add_argument("--camera-side", choices=("left", "right"), default="right")
    parser.add_argument("--width", type=int, default=512)
    parser.add_argument("--height", type=int, default=512)
    parser.add_argument("--foot-anchor-tolerance-px", type=float, default=2.0)
    return parser.parse_args(argv)


def require_positive(name: str, value: float) -> None:
    if value <= 0:
        raise RuntimeError(f"{name} must be positive, received {value}")


def resolve_bone(armature: bpy.types.Object, names: tuple[str, ...]) -> bpy.types.PoseBone:
    for name in names:
        bone = armature.pose.bones.get(name)
        if bone is not None:
            return bone
    raise RuntimeError(
        f"Canonical Vanguard rig is missing required bone; searched {list(names)}"
    )


def bone_world_head(armature: bpy.types.Object, bone: bpy.types.PoseBone) -> Vector:
    return armature.matrix_world @ bone.head


def foot_midpoint_world(
    armature: bpy.types.Object,
    left_foot: bpy.types.PoseBone,
    right_foot: bpy.types.PoseBone,
) -> Vector:
    return (
        bone_world_head(armature, left_foot)
        + bone_world_head(armature, right_foot)
    ) * 0.5


def anchor_corrections(
    scene: bpy.types.Scene,
    armature: bpy.types.Object,
    left_foot: bpy.types.PoseBone,
    right_foot: bpy.types.PoseBone,
    frames: list[float],
) -> tuple[Vector, list[Vector]]:
    raw_anchors: list[Vector] = []
    for frame in frames:
        set_native_pose(scene, armature, frame)
        raw_anchors.append(foot_midpoint_world(armature, left_foot, right_foot))
    baseline = raw_anchors[0]
    corrections = [
        Vector((0.0, baseline.y - anchor.y, baseline.z - anchor.z))
        for anchor in raw_anchors
    ]
    return baseline, corrections


def set_game_export_pose(
    scene: bpy.types.Scene,
    armature: bpy.types.Object,
    frame: float,
    correction: Vector,
) -> None:
    set_native_pose(scene, armature, frame)
    armature.location = correction
    bpy.context.view_layer.update()


def stabilized_bounds(
    scene: bpy.types.Scene,
    armature: bpy.types.Object,
    mesh_objects: list[bpy.types.Object],
    frames: list[float],
    corrections: list[Vector],
) -> tuple[Vector, Vector]:
    lower = Vector((float("inf"), float("inf"), float("inf")))
    upper = Vector((-float("inf"), -float("inf"), -float("inf")))
    for frame, correction in zip(frames, corrections):
        set_game_export_pose(scene, armature, frame, correction)
        for obj in mesh_objects:
            for point in evaluated_world_vertices(obj):
                for axis in range(3):
                    lower[axis] = min(lower[axis], point[axis])
                    upper[axis] = max(upper[axis], point[axis])
    return lower, upper


def projected_pixel(
    scene: bpy.types.Scene,
    camera: bpy.types.Object,
    point: Vector,
    width: int,
    height: int,
) -> dict[str, float | bool | str]:
    from bpy_extras.object_utils import world_to_camera_view

    projected = world_to_camera_view(scene, camera, point)
    x = float(projected.x) * width
    y = (1.0 - float(projected.y)) * height
    return {
        "x": round(x, 4),
        "y": round(y, 4),
        "space": "pixels-top-left",
        "inFrame": bool(0.0 <= x <= width and 0.0 <= y <= height),
    }


def projected_weapon_pixel(
    record: dict[str, object],
    key: str,
    width: int,
    height: int,
) -> dict[str, float | bool | str]:
    point = record[key]
    return {
        "x": round(float(point["x"]) * width, 4),
        "y": round(float(point["y"]) * height, 4),
        "space": "pixels-top-left",
        "inFrame": bool(point["inFrame"]),
    }


def configure_game_render(
    scene: bpy.types.Scene,
    mesh_objects: list[bpy.types.Object],
    width: int,
    height: int,
    fps: float,
) -> None:
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.image_settings.compression = 15
    scene.render.film_transparent = True
    scene.render.fps = round(fps)
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "OBJECT"
    scene.display.shading.show_shadows = False
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "WORLD"
    for obj in mesh_objects:
        obj.color = (
            (0.72, 0.70, 0.64, 1.0)
            if is_weapon_object(obj)
            else (0.46, 0.76, 0.96, 1.0)
        )


def clean_owned_outputs(out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    for pattern in ("idle_*.png", "contact_sheet.png", "idle.gif", "metadata.json"):
        for path in out_dir.glob(pattern):
            if path.is_file():
                path.unlink()


def main() -> None:
    args = cli_args()
    require_positive("--frame-count", args.frame_count)
    require_positive("--output-fps", args.output_fps)
    require_positive("--source-fps", args.source_fps)
    require_positive("--width", args.width)
    require_positive("--height", args.height)
    if args.foot_anchor_tolerance_px < 0:
        raise RuntimeError("--foot-anchor-tolerance-px cannot be negative")

    root = Path(__file__).resolve().parents[1]
    asset = Path(args.asset)
    if not asset.is_absolute():
        asset = root / asset
    asset = asset.resolve()
    out_dir = Path(args.out_dir)
    if not out_dir.is_absolute():
        out_dir = root / out_dir
    out_dir = out_dir.resolve()
    if not asset.is_file():
        raise FileNotFoundError(
            f"Canonical Vanguard rig not found: {asset}; "
            "expected public/assets/vanguard/vanguard_rigged_animations.glb"
        )
    clean_owned_outputs(out_dir)

    clear_scene()
    bpy.ops.import_scene.gltf(filepath=str(asset))
    scene = bpy.context.scene
    armature = select_armature()
    action = select_action(args.action)
    armature.animation_data_create()
    armature.animation_data.action = action
    muted_root_curves = suppress_root_motion(action, armature)
    action_start, action_end = (float(value) for value in action.frame_range)
    action_span = action_end - action_start
    if action_span <= 0:
        raise RuntimeError(f"Idle action has invalid frame range {action.frame_range[:]}")
    render_frames = [
        action_start + action_span * (index / args.frame_count)
        for index in range(args.frame_count)
    ]

    mesh_objects = [
        obj for obj in scene.objects if obj.type == "MESH" and not obj.hide_render
    ]
    if not mesh_objects:
        raise RuntimeError("Canonical Vanguard rig imported no renderable meshes")
    weapon_objects = [obj for obj in mesh_objects if is_weapon_object(obj)]
    if len(weapon_objects) != 1:
        raise RuntimeError(
            f"Canonical Vanguard rig must contain one sword mesh, found "
            f"{[obj.name for obj in weapon_objects]}"
        )

    left_foot = resolve_bone(armature, FOOT_BONE_CANDIDATES["left"])
    right_foot = resolve_bone(armature, FOOT_BONE_CANDIDATES["right"])
    root_bone = armature.pose.bones.get("root") or armature.pose.bones.get("Root")
    if root_bone is None:
        raise RuntimeError("Canonical Vanguard rig is missing required root bone")

    configure_game_render(
        scene,
        mesh_objects,
        args.width,
        args.height,
        args.output_fps,
    )
    baseline_foot_world, corrections = anchor_corrections(
        scene,
        armature,
        left_foot,
        right_foot,
        render_frames,
    )
    lower, upper = stabilized_bounds(
        scene,
        armature,
        mesh_objects,
        render_frames,
        corrections,
    )
    camera = make_camera(scene)
    lock_camera(camera, args.camera_side, lower, upper, args.width / args.height)
    camera_matrix = flatten_matrix(camera.matrix_world)
    camera_ortho_scale = round(float(camera.data.ortho_scale), 9)
    frame_duration_ms = 1000.0 / args.output_fps

    frames: list[dict[str, object]] = []
    for index, (blender_frame, correction) in enumerate(
        zip(render_frames, corrections)
    ):
        set_game_export_pose(scene, armature, blender_frame, correction)
        actual_matrix = flatten_matrix(camera.matrix_world)
        actual_scale = round(float(camera.data.ortho_scale), 9)
        if actual_matrix != camera_matrix or actual_scale != camera_ortho_scale:
            raise RuntimeError(f"Locked camera changed before frame {index}")

        foot_world = foot_midpoint_world(armature, left_foot, right_foot)
        pivot_world = bone_world_head(armature, root_bone)
        weapon = capture_weapon(scene, camera, armature, mesh_objects)
        if not isinstance(weapon, dict) or weapon.get("status") != "measured":
            raise RuntimeError(f"Unable to measure Vanguard sword at frame {index}: {weapon}")

        file_name = f"idle_{index:04d}.png"
        image_path = out_dir / file_name
        scene.render.filepath = str(image_path)
        bpy.ops.render.render(write_still=True)
        if not image_path.is_file():
            raise RuntimeError(f"Blender did not write {image_path}")
        if (
            flatten_matrix(camera.matrix_world) != camera_matrix
            or round(float(camera.data.ortho_scale), 9) != camera_ortho_scale
        ):
            raise RuntimeError(f"Locked camera changed while rendering frame {index}")

        frames.append(
            {
                "frame": index,
                "sourceFrame": round(blender_frame, 6),
                "image": file_name,
                "imageSha256": sha256(image_path),
                "pivot": projected_pixel(
                    scene, camera, pivot_world, args.width, args.height
                ),
                "footAnchor": {
                    **projected_pixel(
                        scene, camera, foot_world, args.width, args.height
                    ),
                    "bones": [left_foot.name, right_foot.name],
                    "method": "projected midpoint of canonical left/right FK foot heads",
                },
                "footAnchorCorrectionWorld": {
                    "x": round(float(correction.x), 8),
                    "y": round(float(correction.y), 8),
                    "z": round(float(correction.z), 8),
                    "method": "whole-rig translation in camera plane; articulation unchanged",
                },
                "swordRoot": projected_weapon_pixel(
                    weapon, "hilt", args.width, args.height
                ),
                "swordTip": projected_weapon_pixel(
                    weapon, "tip", args.width, args.height
                ),
                "frameDurationMs": round(frame_duration_ms, 6),
                "cameraMatrixWorld": actual_matrix,
                "cameraOrthoScale": actual_scale,
            }
        )

    metadata = {
        "schema": SCHEMA,
        "status": "rendered-pending-verification",
        "source": {
            "repository": "Valar05/pose-lab-v2",
            "asset": str(asset.relative_to(root)),
            "assetSha256": sha256(asset),
            "actionRequested": args.action,
            "actionResolved": action.name,
            "actionFrameRange": [
                round(action_start, 6),
                round(action_end, 6),
            ],
            "sourceFps": args.source_fps,
            "samplePolicy": "uniform loop samples; terminal duplicate excluded",
            "rootMotionSuppressed": True,
            "mutedRootMotionCurves": muted_root_curves,
            "rawFootAnchorBaselineWorld": [
                round(float(value), 8) for value in baseline_foot_world
            ],
        },
        "output": {
            "width": args.width,
            "height": args.height,
            "colorMode": "RGBA",
            "background": "transparent",
            "frameCount": args.frame_count,
            "outputFps": args.output_fps,
            "sequencePattern": "idle_%04d.png",
            "contactSheet": "contact_sheet.png",
            "previewGif": "idle.gif",
        },
        "contract": {
            "camera": "one locked orthographic side-view camera",
            "cameraType": camera.data.type,
            "cameraSide": f"model-{args.camera_side}",
            "cameraMatrixWorld": camera_matrix,
            "cameraOrthoScale": camera_ortho_scale,
            "cameraTransformTolerance": 0.0,
            "footAnchorTolerancePx": args.foot_anchor_tolerance_px,
            "footAnchorStabilization": (
                "whole-rig camera-plane translation to frame-zero two-foot midpoint"
            ),
            "retargeting": False,
            "poseAuthoring": False,
            "nativeIdleOnly": True,
        },
        "frames": frames,
        "verification": {
            "status": "PENDING",
            "failures": [],
        },
    }
    (out_dir / "metadata.json").write_text(json.dumps(metadata, indent=2) + "\n")
    print(
        json.dumps(
            {
                "status": "RENDERED",
                "outDir": str(out_dir),
                "frames": len(frames),
                "action": action.name,
                "camera": "locked-orthographic",
            }
        )
    )


if __name__ == "__main__":
    main()
