#!/usr/bin/env python3
"""Directly author one Crimson idle frame on her final rig.

This is deliberately a small pose-authoring script, not a retargeter or IK
solver. It manipulates named bones on Crimson's production armature, embeds the
real Arborblade in the same GLB, keys one frame, exports, re-imports, and renders
the exact delivered bytes from a locked side view plus an orthogonal view.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Quaternion, Vector


ROOT = Path(__file__).resolve().parents[1]
CHARACTER = ROOT / "public/assets/crimson/crimson_plume_knight_rigged_pbr.glb"
SWORD = ROOT / "public/assets/crimson/arborblade_sword.glb"
ACTION_NAME = "CrimsonIdleStance"
SCHEMA = "pose-lab-v2-crimson-idle-one-frame-v1"

# Artist-authored variants. These are readable pose choices, not solver inputs.
# Values are fractions of character height in the character's anatomical basis.
VARIANTS = (
    {
        "name": "square-low",
        "hilt": (0.04, 0.15, -0.18),
        "right_elbow": (0.11, 0.08, -0.14),
        "left_elbow": (-0.10, 0.11, -0.12),
        "blade": (0.02, -0.42, 0.91),
    },
    {
        "name": "loaded-low",
        "hilt": (0.06, 0.18, -0.14),
        "right_elbow": (0.13, 0.09, -0.13),
        "left_elbow": (-0.11, 0.13, -0.10),
        "blade": (0.02, -0.48, 0.88),
    },
    {
        "name": "center-guard",
        "hilt": (0.02, 0.16, -0.08),
        "right_elbow": (0.11, 0.08, -0.10),
        "left_elbow": (-0.10, 0.12, -0.07),
        "blade": (0.01, -0.40, 0.92),
    },
    {
        "name": "compact-high",
        "hilt": (0.00, 0.18, 0.00),
        "right_elbow": (0.10, 0.09, -0.06),
        "left_elbow": (-0.09, 0.13, -0.03),
        "blade": (0.01, -0.34, 0.95),
    },
)


def parse_args() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--selected", type=int, default=2)
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
        bpy.data.actions,
        bpy.data.armatures,
        bpy.data.meshes,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for datablock in list(collection):
            if datablock.users == 0:
                collection.remove(datablock)


def import_glb(path: Path) -> list[bpy.types.Object]:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    return [obj for obj in bpy.data.objects if obj not in before]


def one_armature(objects: list[bpy.types.Object]) -> bpy.types.Object:
    armatures = [obj for obj in objects if obj.type == "ARMATURE"]
    if len(armatures) != 1:
        raise RuntimeError(
            f"Expected one Crimson armature, found {[obj.name for obj in armatures]}"
        )
    return armatures[0]


def reset_pose(armature: bpy.types.Object) -> None:
    armature.animation_data_clear()
    armature.data.pose_position = "POSE"
    for bone in armature.pose.bones:
        bone.matrix_basis = Matrix.Identity(4)
    bpy.context.view_layer.update()


def bone_head_world(armature: bpy.types.Object, name: str) -> Vector:
    return armature.matrix_world @ armature.pose.bones[name].head


def bone_tail_world(armature: bpy.types.Object, name: str) -> Vector:
    return armature.matrix_world @ armature.pose.bones[name].tail


def bone_world_rotation(armature: bpy.types.Object, name: str) -> Quaternion:
    return (
        armature.matrix_world.to_quaternion()
        @ armature.pose.bones[name].matrix.to_quaternion()
    ).normalized()


def set_bone_world_rotation(
    armature: bpy.types.Object,
    name: str,
    rotation: Quaternion,
) -> None:
    bone = armature.pose.bones[name]
    armature_rotation_inverse = armature.matrix_world.to_quaternion().inverted()
    bone.matrix = Matrix.LocRotScale(
        bone.head.copy(),
        (armature_rotation_inverse @ rotation).normalized(),
        Vector((1.0, 1.0, 1.0)),
    )
    bpy.context.view_layer.update()


def point_bone(
    armature: bpy.types.Object,
    name: str,
    desired_direction: Vector,
) -> None:
    """Rotate one named final-rig bone toward an artist-chosen direction."""
    current_direction = bone_tail_world(armature, name) - bone_head_world(armature, name)
    if current_direction.length < 1e-7 or desired_direction.length < 1e-7:
        raise RuntimeError(f"Cannot orient zero-length bone {name}")
    current_rotation = bone_world_rotation(armature, name)
    swing = current_direction.normalized().rotation_difference(
        desired_direction.normalized()
    )
    set_bone_world_rotation(armature, name, swing @ current_rotation)


def anatomical_basis(armature: bpy.types.Object) -> tuple[Vector, Vector, Vector, float]:
    hips = bone_head_world(armature, "Hips")
    head = bone_tail_world(armature, "Head")
    left = bone_head_world(armature, "LeftArm")
    right = bone_head_world(armature, "RightArm")
    up = Vector((0.0, 0.0, 1.0))
    body_right = right - left
    body_right -= up * body_right.dot(up)
    body_right.normalize()
    face = bone_head_world(armature, "headfront") - bone_head_world(armature, "Head")
    face -= up * face.dot(up)
    if face.length < 1e-6:
        face = body_right.cross(up)
    forward = face.normalized()
    if abs(forward.dot(body_right)) > 0.15:
        forward = body_right.cross(up).normalized()
    body_right = up.cross(forward).normalized()
    return body_right, forward, up, (head - hips).length


def world_point(
    origin: Vector,
    right: Vector,
    forward: Vector,
    up: Vector,
    height: float,
    coordinates: tuple[float, float, float],
) -> Vector:
    return (
        origin
        + right * height * coordinates[0]
        + forward * height * coordinates[1]
        + up * height * coordinates[2]
    )


def straighten_torso(armature: bpy.types.Object, up: Vector) -> None:
    for name in ("Spine02", "Spine01", "Spine", "neck", "Head"):
        point_bone(armature, name, up)


def place_arm(
    armature: bpy.types.Object,
    upper_name: str,
    lower_name: str,
    elbow_target: Vector,
    wrist_target: Vector,
) -> None:
    point_bone(
        armature,
        upper_name,
        elbow_target - bone_head_world(armature, upper_name),
    )
    point_bone(
        armature,
        lower_name,
        wrist_target - bone_head_world(armature, lower_name),
    )


def orient_hand_for_blade(
    armature: bpy.types.Object,
    hand_name: str,
    blade_direction: Vector,
) -> None:
    # The embedded sword is placed independently at the authored hand. Keep the
    # gauntlet continuing the forearm line; the weapon itself owns blade roll.
    forearm_name = "RightForeArm" if hand_name == "RightHand" else "LeftForeArm"
    forearm_direction = (
        bone_tail_world(armature, forearm_name)
        - bone_head_world(armature, forearm_name)
    ).normalized()
    point_bone(armature, hand_name, forearm_direction)


def author_variant(
    armature: bpy.types.Object,
    variant: dict[str, object],
) -> dict[str, object]:
    reset_pose(armature)
    right, forward, up, height = anatomical_basis(armature)
    straighten_torso(armature, up)

    chest = bone_head_world(armature, "Spine")
    hilt = world_point(
        chest,
        right,
        forward,
        up,
        height,
        variant["hilt"],
    )
    right_elbow = world_point(
        bone_head_world(armature, "RightArm"),
        right,
        forward,
        up,
        height,
        variant["right_elbow"],
    )
    left_elbow = world_point(
        bone_head_world(armature, "LeftArm"),
        right,
        forward,
        up,
        height,
        variant["left_elbow"],
    )
    blade = (
        right * variant["blade"][0]
        + forward * variant["blade"][1]
        + up * variant["blade"][2]
    ).normalized()

    place_arm(armature, "RightArm", "RightForeArm", right_elbow, hilt)
    orient_hand_for_blade(armature, "RightHand", blade)
    actual_right_wrist = bone_head_world(armature, "RightHand")
    left_grip = actual_right_wrist - blade * height * 0.035
    place_arm(armature, "LeftArm", "LeftForeArm", left_elbow, left_grip)
    orient_hand_for_blade(armature, "LeftHand", blade)
    bpy.context.view_layer.update()

    return {
        "name": variant["name"],
        "height": height,
        "basis": {
            "right": list(right),
            "forward": list(forward),
            "up": list(up),
        },
        "hiltTarget": list(hilt),
        "rightWrist": list(bone_head_world(armature, "RightHand")),
        "leftWrist": list(bone_head_world(armature, "LeftHand")),
        "bladeDirection": list(blade),
    }


def orient_object_z(object_: bpy.types.Object, direction: Vector) -> Quaternion:
    current = Vector((0.0, 0.0, 1.0))
    return current.rotation_difference(direction.normalized())


def place_embedded_sword(
    sword_objects: list[bpy.types.Object],
    hilt: Vector,
    blade_direction: Vector,
    scale: float,
) -> None:
    rotation = orient_object_z(sword_objects[0], blade_direction)
    matrix = Matrix.LocRotScale(
        hilt,
        rotation,
        Vector((scale, scale, scale)),
    )
    for obj in sword_objects:
        if obj.parent is None:
            obj.matrix_world = matrix
    bpy.context.view_layer.update()


def key_once(armature: bpy.types.Object) -> bpy.types.Action:
    action = bpy.data.actions.new(ACTION_NAME)
    action.use_fake_user = True
    armature.animation_data_create()
    armature.animation_data.action = action
    for bone in armature.pose.bones:
        bone.keyframe_insert("location", frame=0.0, group=bone.name)
        bone.rotation_mode = "QUATERNION"
        bone.keyframe_insert("rotation_quaternion", frame=0.0, group=bone.name)
        bone.keyframe_insert("scale", frame=0.0, group=bone.name)
    bpy.context.scene.frame_set(0)
    return action


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
        mesh = evaluated.to_mesh()
        try:
            for vertex in mesh.vertices:
                point = evaluated.matrix_world @ vertex.co
                for axis in range(3):
                    low[axis] = min(low[axis], point[axis])
                    high[axis] = max(high[axis], point[axis])
        finally:
            evaluated.to_mesh_clear()
    if not found:
        raise RuntimeError("No rendered mesh bounds")
    return low, high


def configure_render(width: int, height: int) -> bpy.types.Object:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_shadows = False
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "WORLD"
    camera = bpy.data.objects.new(
        "CrimsonIdleFrameCamera",
        bpy.data.cameras.new("CrimsonIdleFrameCamera"),
    )
    bpy.context.collection.objects.link(camera)
    camera.data.type = "ORTHO"
    scene.camera = camera
    return camera


def render_view(
    path: Path,
    camera: bpy.types.Object,
    objects: list[bpy.types.Object],
    direction: Vector,
) -> None:
    low, high = mesh_bounds(objects)
    center = (low + high) * 0.5
    span = high - low
    distance = max(span.length * 2.0, 4.0)
    camera.location = center + direction.normalized() * distance
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.ortho_scale = max(span.x, span.y, span.z) * 1.18
    camera.data.clip_start = 0.01
    camera.data.clip_end = 1000.0
    bpy.context.scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)


def select_export_objects(
    armature: bpy.types.Object,
    character_objects: list[bpy.types.Object],
    sword_objects: list[bpy.types.Object],
) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in character_objects + sword_objects:
        if obj.name in bpy.context.scene.objects:
            obj.select_set(True)
    bpy.context.view_layer.objects.active = armature


def export_candidate(
    path: Path,
    armature: bpy.types.Object,
    character_objects: list[bpy.types.Object],
    sword_objects: list[bpy.types.Object],
) -> None:
    for action in list(bpy.data.actions):
        action.use_fake_user = action.name == ACTION_NAME
        if action.name != ACTION_NAME:
            bpy.data.actions.remove(action)
    armature.animation_data.action = bpy.data.actions[ACTION_NAME]
    select_export_objects(armature, character_objects, sword_objects)
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


def render_reimport(
    candidate: Path,
    out: Path,
    width: int,
    height: int,
) -> dict[str, object]:
    clear_scene()
    objects = import_glb(candidate)
    armature = one_armature(objects)
    matches = [action for action in bpy.data.actions if action.name == ACTION_NAME]
    if len(matches) != 1:
        raise RuntimeError(
            f"Re-import lost {ACTION_NAME}; actions are {[a.name for a in bpy.data.actions]}"
        )
    armature.animation_data_create()
    armature.animation_data.action = matches[0]
    bpy.context.scene.frame_set(0)
    bpy.context.view_layer.update()
    if not any("Arborblade" in obj.name for obj in objects):
        raise RuntimeError("Re-import lost embedded Arborblade")
    right, forward, up, _ = anatomical_basis(armature)
    camera = configure_render(width, height)
    side = out / "selected-locked-side.png"
    front = out / "selected-orthogonal-front.png"
    render_view(side, camera, objects, right)
    render_view(front, camera, objects, forward)
    return {
        "action": matches[0].name,
        "embeddedSword": True,
        "lockedSide": {"path": side.name, "sha256": sha256(side)},
        "orthogonalFront": {"path": front.name, "sha256": sha256(front)},
        "up": list(up),
    }


def main() -> None:
    args = parse_args()
    if args.selected < 0 or args.selected >= len(VARIANTS):
        raise RuntimeError(f"--selected must be 0..{len(VARIANTS) - 1}")
    out = Path(args.out_dir)
    if not out.is_absolute():
        out = ROOT / out
    out.mkdir(parents=True, exist_ok=True)

    clear_scene()
    character_objects = import_glb(CHARACTER)
    armature = one_armature(character_objects)
    reset_pose(armature)
    sword_objects = import_glb(SWORD)
    for obj in sword_objects:
        if obj.type == "MESH":
            obj.name = "ArborbladeSword"
    render_objects = character_objects + sword_objects
    camera = configure_render(args.width, args.height)

    reports = []
    for index, variant in enumerate(VARIANTS):
        report = author_variant(armature, variant)
        blade = Vector(report["bladeDirection"])
        wrist = bone_head_world(armature, "RightHand")
        # Blender's imported Arborblade basis is larger than its normalized
        # browser bounds. The direct world factor below is visually calibrated
        # against Crimson's actual final-rig height.
        place_embedded_sword(sword_objects, wrist, blade, report["height"] * 0.04)
        right = Vector(report["basis"]["right"])
        forward = Vector(report["basis"]["forward"])
        side = out / f"variant-{index}-{variant['name']}-side.png"
        front = out / f"variant-{index}-{variant['name']}-front.png"
        render_view(side, camera, render_objects, right)
        render_view(front, camera, render_objects, forward)
        report["evidence"] = {
            "side": {"path": side.name, "sha256": sha256(side)},
            "front": {"path": front.name, "sha256": sha256(front)},
        }
        reports.append(report)

    selected_variant = VARIANTS[args.selected]
    selected_report = author_variant(armature, selected_variant)
    selected_blade = Vector(selected_report["bladeDirection"])
    selected_wrist = bone_head_world(armature, "RightHand")
    place_embedded_sword(
        sword_objects,
        selected_wrist,
        selected_blade,
        selected_report["height"] * 0.04,
    )
    action = key_once(armature)
    candidate = out / "crimson_idle_stance.glb"
    export_candidate(
        candidate,
        armature,
        character_objects,
        sword_objects,
    )
    candidate_sha = sha256(candidate)
    reimport = render_reimport(candidate, out, args.width, args.height)
    manifest = {
        "schema": SCHEMA,
        "status": "quarantined",
        "source": {
            "character": str(CHARACTER.relative_to(ROOT)),
            "characterSha256": sha256(CHARACTER),
            "sourceAnimation": None,
            "retargeting": False,
            "solver": False,
        },
        "authoring": {
            "lane": "direct-final-rig",
            "finalRig": True,
            "action": action.name,
            "frameCount": 1,
            "selectedVariant": args.selected,
            "selectedName": selected_variant["name"],
            "variants": reports,
            "weapon": {
                "mode": "embedded",
                "asset": str(SWORD.relative_to(ROOT)),
                "assetSha256": sha256(SWORD),
                "hierarchy": [
                    "CrimsonIdleStanceScene",
                    "ArborbladeSword",
                ],
                "hiltAlignedTo": "RightHand",
                "externalAttachment": False,
            },
        },
        "export": {
            "file": candidate.name,
            "sha256": candidate_sha,
        },
        "reimportVerification": reimport,
        "human": {"verdict": "pending"},
    }
    manifest_path = out / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    print(
        json.dumps(
            {
                "ok": True,
                "candidate": str(candidate),
                "sha256": candidate_sha,
                "selected": selected_variant["name"],
                "manifest": str(manifest_path),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
