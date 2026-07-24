#!/usr/bin/env python3
"""Freeze one evaluated native Vanguard Idle pose on the final rig.

This is deliberately not a solver. It imports the production GLB, evaluates
one frame of the embedded Idle action, writes those final-rig transforms into
one new action with one key per transform channel, exports the same embedded
body/sword/rig selection, then re-imports that export for two evidence renders.
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


ACTION_NAME = "VanguardIdleStance"
SCHEMA = "pose-lab-v2-vanguard-idle-stance-v1"


def args() -> argparse.Namespace:
    argv = sys.argv
    argv = argv[argv.index("--") + 1 :] if "--" in argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--asset", required=True)
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--source-action", default="Idle")
    parser.add_argument("--source-frame", type=float, default=0.0)
    parser.add_argument("--width", type=int, default=768)
    parser.add_argument("--height", type=int, default=768)
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
    for collection in (
        bpy.data.meshes,
        bpy.data.armatures,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for datablock in list(collection):
            if datablock.users == 0:
                collection.remove(datablock)


def one_armature() -> bpy.types.Object:
    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    if len(armatures) != 1:
        raise RuntimeError(
            f"Expected exactly one final-rig armature, found {[obj.name for obj in armatures]}"
        )
    return armatures[0]


def action_named(name: str) -> bpy.types.Action:
    matches = [
        action
        for action in bpy.data.actions
        if action.name == name or action.name == f"{name}_rig"
    ]
    if len(matches) != 1:
        raise RuntimeError(
            f"Expected exactly one action named {name!r}, found {[a.name for a in bpy.data.actions]}"
        )
    return matches[0]


def capture_pose(armature: bpy.types.Object) -> dict[str, object]:
    return {bone.name: bone.matrix_basis.copy() for bone in armature.pose.bones}


def key_pose_once(
    armature: bpy.types.Object,
    matrices: dict[str, object],
) -> bpy.types.Action:
    action = bpy.data.actions.new(ACTION_NAME)
    action.use_fake_user = True
    armature.animation_data_create()
    armature.animation_data.action = action
    for bone in armature.pose.bones:
        bone.matrix_basis = matrices[bone.name]
    bpy.context.view_layer.update()
    for bone in armature.pose.bones:
        bone.keyframe_insert("location", frame=0.0, group=bone.name)
        if bone.rotation_mode == "QUATERNION":
            bone.keyframe_insert("rotation_quaternion", frame=0.0, group=bone.name)
        elif bone.rotation_mode == "AXIS_ANGLE":
            bone.keyframe_insert("rotation_axis_angle", frame=0.0, group=bone.name)
        else:
            bone.keyframe_insert("rotation_euler", frame=0.0, group=bone.name)
        bone.keyframe_insert("scale", frame=0.0, group=bone.name)
    return action


def select_performer(armature: bpy.types.Object) -> list[str]:
    bpy.ops.object.select_all(action="DESELECT")
    selected = []
    for obj in bpy.context.scene.objects:
        if obj == armature or obj.type == "MESH":
            obj.select_set(True)
            selected.append(obj.name)
    bpy.context.view_layer.objects.active = armature
    return sorted(selected)


def export_candidate(path: Path, armature: bpy.types.Object) -> list[str]:
    selected = select_performer(armature)
    for action in list(bpy.data.actions):
        action.use_fake_user = action.name == ACTION_NAME
        if action.name != ACTION_NAME:
            bpy.data.actions.remove(action)
    armature.animation_data.action = bpy.data.actions[ACTION_NAME]
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_nla_strips=False,
        export_extra_animations=False,
        export_frame_range=False,
        export_force_sampling=False,
        export_optimize_animation_size=False,
        export_yup=True,
        export_apply=False,
        export_skins=True,
        export_morph=False,
    )
    return selected


def evaluated_bounds(meshes: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    lower = Vector((math.inf, math.inf, math.inf))
    upper = Vector((-math.inf, -math.inf, -math.inf))
    for obj in meshes:
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
    return lower, upper


def make_camera(
    scene: bpy.types.Scene,
    name: str,
    location: Vector,
    center: Vector,
    ortho_scale: float,
) -> bpy.types.Object:
    data = bpy.data.cameras.new(name)
    data.type = "ORTHO"
    data.ortho_scale = ortho_scale
    camera = bpy.data.objects.new(name, data)
    scene.collection.objects.link(camera)
    camera.location = location
    camera.rotation_euler = (center - location).to_track_quat("-Z", "Y").to_euler()
    return camera


def configure_render(scene: bpy.types.Scene, meshes: list[bpy.types.Object], width: int, height: int) -> None:
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "OBJECT"
    scene.display.shading.show_shadows = False
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "WORLD"
    for obj in meshes:
        obj.color = (
            (0.72, 0.70, 0.64, 1.0)
            if "sword" in obj.name.lower()
            else (0.46, 0.76, 0.96, 1.0)
        )


def render_evidence(
    candidate: Path,
    out_dir: Path,
    width: int,
    height: int,
) -> dict[str, object]:
    clear_scene()
    bpy.ops.import_scene.gltf(filepath=str(candidate))
    scene = bpy.context.scene
    armature = one_armature()
    action = action_named(ACTION_NAME)
    armature.animation_data_create()
    armature.animation_data.action = action
    scene.frame_set(0)
    bpy.context.view_layer.update()
    meshes = [obj for obj in scene.objects if obj.type == "MESH"]
    if not any("sword" in obj.name.lower() for obj in meshes):
        raise RuntimeError("Candidate export lost the embedded Long_Sword")
    configure_render(scene, meshes, width, height)
    lower, upper = evaluated_bounds(meshes)
    center = (lower + upper) * 0.5
    span = upper - lower
    distance = max(span) * 3.0 + 3.0
    ortho_scale = max(span.z * 1.14, span.y * 1.14, span.x * 1.14)
    cameras = {
        "lockedSide": make_camera(
            scene,
            "VanguardIdleStanceLockedSide",
            Vector((lower.x - distance, center.y, center.z)),
            center,
            ortho_scale,
        ),
        "orthogonalFront": make_camera(
            scene,
            "VanguardIdleStanceOrthogonalFront",
            Vector((center.x, lower.y - distance, center.z)),
            center,
            ortho_scale,
        ),
    }
    evidence = {}
    for key, camera in cameras.items():
        path = out_dir / ("locked-side.png" if key == "lockedSide" else "orthogonal-front.png")
        scene.camera = camera
        scene.render.filepath = str(path)
        bpy.ops.render.render(write_still=True)
        evidence[key] = {
            "path": path.name,
            "sha256": sha256(path),
            "cameraMatrixWorld": [
                round(float(value), 9)
                for row in camera.matrix_world
                for value in row
            ],
        }
    return {
        "action": action.name,
        "actionFrameRange": [float(value) for value in action.frame_range],
        "actionSlots": len(action.slots),
        "armature": armature.name,
        "meshObjects": sorted(obj.name for obj in meshes),
        "evidence": evidence,
    }


def main() -> None:
    options = args()
    root = Path(__file__).resolve().parents[1]
    asset = (root / options.asset).resolve()
    out_dir = (root / options.out_dir).resolve()
    if not asset.is_file():
        raise FileNotFoundError(asset)
    out_dir.mkdir(parents=True, exist_ok=True)
    for owned in (
        "vanguard-idle-stance.glb",
        "locked-side.png",
        "orthogonal-front.png",
        "metadata.json",
    ):
        path = out_dir / owned
        if path.exists():
            path.unlink()

    clear_scene()
    bpy.ops.import_scene.gltf(filepath=str(asset))
    scene = bpy.context.scene
    armature = one_armature()
    source_action = action_named(options.source_action)
    armature.animation_data_create()
    armature.animation_data.action = source_action
    scene.frame_set(
        int(options.source_frame),
        subframe=options.source_frame - int(options.source_frame),
    )
    bpy.context.view_layer.update()
    matrices = capture_pose(armature)
    action = key_pose_once(armature, matrices)
    candidate = out_dir / "vanguard-idle-stance.glb"
    selected = export_candidate(candidate, armature)
    rendered = render_evidence(candidate, out_dir, options.width, options.height)

    metadata = {
        "schema": SCHEMA,
        "status": "quarantined",
        "source": {
            "asset": str(asset.relative_to(root)),
            "assetSha256": sha256(asset),
            "action": options.source_action,
            "frame": options.source_frame,
            "animationModified": False,
            "retargeting": False,
            "solver": False,
        },
        "authoring": {
            "lane": "direct-final-rig",
            "action": action.name,
            "authoredKeyframesPerTransformChannel": 1,
            "selectedObjects": selected,
            "weapon": {
                "mode": "embedded",
                "object": "Long_Sword",
                "externalAttachment": False,
            },
        },
        "candidate": {
            "path": candidate.name,
            "bytes": candidate.stat().st_size,
            "sha256": sha256(candidate),
        },
        "reimportVerification": rendered,
    }
    (out_dir / "metadata.json").write_text(json.dumps(metadata, indent=2) + "\n")
    print(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    main()
