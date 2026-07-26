#!/usr/bin/env python3
"""Cloud-safe, reference-only SwordAttack1 evidence render for Vanguard."""

from __future__ import annotations

import hashlib
import json
import math
import os
import sys
from pathlib import Path

import bpy
from mathutils import Vector


SOURCE_FRAMES = [0.0, 3.0, 6.0, 9.0, 12.0, 15.0, 18.0, 21.0, 24.0, 28.0, 33.0, 38.0]
ACTION_NAME = "SwordAttack1"
RENDER_PROFILE = "vanguard-color-review-v1"
VANGUARD_REVIEW_PALETTE = {
    "armor": (0.42, 0.035, 0.025, 1.0),
    "cloth": (0.03, 0.075, 0.16, 1.0),
    "leather": (0.22, 0.07, 0.025, 1.0),
    "skin": (0.63, 0.28, 0.13, 1.0),
    "hair": (0.025, 0.012, 0.01, 1.0),
    "bone": (0.74, 0.58, 0.31, 1.0),
    "steel": (0.45, 0.50, 0.58, 1.0),
}



def renderer_args() -> tuple[Path, Path, Path, Path]:
    args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    if len(args) < 4:
        raise SystemExit("Usage after --: glb output_dir settings_json manifest_json")
    return tuple(Path(value).resolve() for value in args[:4])


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
            f"Expected one {name!r} action, found {[action.name for action in bpy.data.actions]}"
        )
    return candidates[0]


def select_armature() -> bpy.types.Object:
    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    if len(armatures) != 1:
        raise RuntimeError(f"Expected one armature, found {[obj.name for obj in armatures]}")
    return armatures[0]


def suppress_root_motion(
    action: bpy.types.Action, armature: bpy.types.Object
) -> list[str]:
    root_names = {bone.name for bone in armature.pose.bones if bone.name.lower() == "root"}
    root_paths = {f'pose.bones["{name}"].location' for name in root_names}
    muted: list[str] = []
    for fcurve in action.fcurves:
        if fcurve.data_path == "location" or fcurve.data_path in root_paths:
            fcurve.mute = True
            muted.append(f"{fcurve.data_path}[{fcurve.array_index}]")
    return muted


def set_native_pose(
    scene: bpy.types.Scene, armature: bpy.types.Object, frame: float
) -> None:
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
    data = bpy.data.cameras.new("VanguardLockedReview")
    data.type = "ORTHO"
    data.lens = 50
    camera = bpy.data.objects.new("VanguardLockedReview", data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    return camera


def aim_lateral(
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
    camera.data.ortho_scale = max(
        visible_height * 1.16, (visible_width / aspect) * 1.16
    )
    distance = max(span.x, visible_width, visible_height) * 3.0 + 3.0
    x = lower.x - distance if side == "left" else upper.x + distance
    camera.location = Vector((x, center.y, center.z))
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()


def aim_front(
    camera: bpy.types.Object, lower: Vector, upper: Vector, aspect: float
) -> None:
    center = (lower + upper) * 0.5
    span = upper - lower
    camera.data.ortho_scale = max(span.z * 1.16, (span.x / aspect) * 1.16)
    distance = max(span.x, span.y, span.z) * 3.0 + 3.0
    camera.location = Vector((center.x, lower.y - distance, center.z))
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()


def palette_family(name: str) -> str:
    lowered = name.lower()
    semantic_families = (
        ("steel", ("sword", "blade", "weapon", "metal", "steel")),
        ("skin", ("skin", "face", "head", "hand")),
        ("hair", ("hair", "brow", "lash")),
        ("leather", ("leather", "boot", "glove", "belt", "strap", "scabbard")),
        ("cloth", ("cloth", "fabric", "cape", "skirt", "tabard", "tunic")),
        ("bone", ("bone", "tooth", "horn", "ivory")),
    )
    for family, tokens in semantic_families:
        if any(token in lowered for token in tokens):
            return family
    return "armor"


def set_workbench_style(
    scene: bpy.types.Scene, mesh_objects: list[bpy.types.Object]
) -> list[dict[str, object]]:
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.display.shading.background_type = "VIEWPORT"
    scene.display.shading.background_color = (0.006, 0.009, 0.014)
    scene.render.film_transparent = False

    world = scene.world or bpy.data.worlds.new("VanguardReviewWorld")
    scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background") if world.node_tree else None
    if background:
        background.inputs["Color"].default_value = (0.006, 0.009, 0.014, 1.0)
        background.inputs["Strength"].default_value = 0.18

    assignments: list[dict[str, object]] = []
    for obj in mesh_objects:
        if not obj.material_slots:
            material = bpy.data.materials.new(f"{obj.name}_VanguardReview")
            obj.data.materials.append(material)
        for index, slot in enumerate(obj.material_slots):
            material = slot.material
            if material is None:
                material = bpy.data.materials.new(
                    f"{obj.name}_VanguardReview_{index:02d}"
                )
                obj.material_slots[index].material = material
            family = palette_family(f"{obj.name} {material.name}")
            color = VANGUARD_REVIEW_PALETTE[family]
            material.diffuse_color = color
            material.metallic = 0.72 if family == "steel" else 0.08
            material.roughness = 0.32 if family == "steel" else 0.68
            assignments.append(
                {
                    "object": obj.name,
                    "material": material.name,
                    "family": family,
                    "color": [round(value, 4) for value in color],
                }
            )
        obj.color = VANGUARD_REVIEW_PALETTE[
            palette_family(" ".join([obj.name] + [slot.material.name for slot in obj.material_slots if slot.material]))
        ]

    chromatic = [
        entry for entry in assignments
        if max(entry["color"][:3]) - min(entry["color"][:3]) >= 0.12
    ]
    if not chromatic:
        raise RuntimeError(
            "Vanguard color-review contract rejected an achromatic character render"
        )
    return assignments


def render_frame(
    scene: bpy.types.Scene,
    armature: bpy.types.Object,
    frame: float,
    path: Path,
) -> None:
    set_native_pose(scene, armature, frame)
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)


def matrix_rows(matrix) -> list[list[float]]:
    return [[round(float(value), 9) for value in row] for row in matrix]


def main() -> None:
    asset, output_dir, settings_path, script_manifest_path = renderer_args()
    settings = json.loads(settings_path.read_text(encoding="utf-8"))
    width = int(settings.get("width", 420))
    height = int(settings.get("height", 520))
    if not asset.is_file():
        raise FileNotFoundError(asset)

    output_dir.mkdir(parents=True, exist_ok=True)
    frames_dir = output_dir / "frames"
    diagnostic_dir = output_dir / "diagnostic"
    frames_dir.mkdir(parents=True, exist_ok=True)
    diagnostic_dir.mkdir(parents=True, exist_ok=True)

    clear_scene()
    bpy.ops.import_scene.gltf(filepath=str(asset))
    scene = bpy.context.scene
    armature = select_armature()
    action = select_action(ACTION_NAME)
    armature.animation_data_create()
    armature.animation_data.action = action
    muted_root_curves = suppress_root_motion(action, armature)

    action_start, action_end = (float(value) for value in action.frame_range)
    source_start = min(SOURCE_FRAMES)
    source_span = max(SOURCE_FRAMES) - source_start
    render_frames = [
        action_start
        + ((source_frame - source_start) / source_span) * (action_end - action_start)
        for source_frame in SOURCE_FRAMES
    ]
    mesh_objects = [
        obj for obj in scene.objects if obj.type == "MESH" and not obj.hide_render
    ]
    if not mesh_objects:
        raise RuntimeError("Vanguard GLB imported no renderable mesh objects")

    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.fps = 60
    palette_assignments = set_workbench_style(scene, mesh_objects)

    lower, upper = sampled_bounds(scene, armature, mesh_objects, render_frames)
    camera = make_camera(scene)
    aim_lateral(camera, "right", lower, upper, width / height)
    locked_right_matrix = matrix_rows(camera.matrix_world)

    rendered: list[str] = []
    for index, render_frame_value in enumerate(render_frames):
        path = frames_dir / f"f{index:02d}_source-frame-{SOURCE_FRAMES[index]:05.1f}.png"
        render_frame(scene, armature, render_frame_value, path)
        rendered.append(str(path.relative_to(output_dir)))

    diagnostics: list[str] = []
    diagnostic_index = [0, 6, 11]
    aim_lateral(camera, "left", lower, upper, width / height)
    locked_left_matrix = matrix_rows(camera.matrix_world)
    for index in diagnostic_index:
        path = diagnostic_dir / f"left_f{index:02d}.png"
        render_frame(scene, armature, render_frames[index], path)
        diagnostics.append(str(path.relative_to(output_dir)))

    aim_front(camera, lower, upper, width / height)
    front_matrix = matrix_rows(camera.matrix_world)
    front_path = diagnostic_dir / "front_contact.png"
    render_frame(scene, armature, render_frames[6], front_path)
    diagnostics.append(str(front_path.relative_to(output_dir)))

    native_data = {
        "schema": "fleshpunk-vanguard-cloud-swordattack1-evidence-v1",
        "status": "quarantined",
        "source": {
            "repository": "Valar05/pose-lab-v2",
            "assetPath": "public/assets/vanguard/vanguard_rigged_animations.glb",
            "assetSha256": sha256(asset),
            "action": action.name,
            "actionFrameRange": [round(action_start, 6), round(action_end, 6)],
        },
        "contract": {
            "lane": "reference-only-render",
            "poseAuthority": "native Vanguard SwordAttack1",
            "weaponMode": "embedded",
            "rootMotionSuppressedForReviewOnly": True,
            "retargeting": False,
            "poseAuthoring": False,
            "assetMutation": False,
            "modelBytesReturnedToCaller": False,
            "renderProfile": RENDER_PROFILE,
            "grayOnWhiteAllowed": False,
        },
        "sampleFrames": SOURCE_FRAMES,
        "mappedBlenderFrames": [round(frame, 6) for frame in render_frames],
        "mutedRootMotionCurves": muted_root_curves,
        "bounds": {
            "minimum": [round(value, 6) for value in lower],
            "maximum": [round(value, 6) for value in upper],
        },
        "cameras": {
            "rightLateral": locked_right_matrix,
            "leftLateralDiagnostic": locked_left_matrix,
            "frontDiagnostic": front_matrix,
        },
        "render": {
            "width": width,
            "height": height,
            "engine": scene.render.engine,
            "blenderVersion": bpy.app.version_string,
            "profile": RENDER_PROFILE,
            "background": [0.006, 0.009, 0.014],
            "palette": VANGUARD_REVIEW_PALETTE,
            "paletteAssignments": palette_assignments,
        },
    }
    native_path = output_dir / "native-pose-animation.json"
    native_path.write_text(json.dumps(native_data, indent=2) + "\n", encoding="utf-8")

    script_manifest = {
        "renderedFrames": rendered,
        "fixedCameraRenders": rendered,
        "diagnosticViewRenders": diagnostics,
        "nativePoseAnimationData": str(native_path.relative_to(output_dir)),
        "frameDurationsMs": [40] * len(rendered),
        "blenderVersion": bpy.app.version_string,
        "settings": settings,
        "renderProfile": RENDER_PROFILE,
        "grayOnWhiteAllowed": False,
    }
    script_manifest_path.write_text(
        json.dumps(script_manifest, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "status": "PASS",
                "action": action.name,
                "frames": len(rendered),
                "diagnostics": len(diagnostics),
                "assetSha256": native_data["source"]["assetSha256"],
                "renderProfile": RENDER_PROFILE,
                "grayOnWhiteAllowed": False,
            }
        )
    )


if __name__ == "__main__":
    main()
