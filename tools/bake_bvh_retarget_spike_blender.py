#!/usr/bin/env python3
"""Bake Vanguard ORG motion through a canonical BVH proxy onto Crimson.

This is an experiment, not a production retargeter.  It deliberately proves the
interchange boundary before weapon closure, contact solving, or mesh correction.
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
SWORD = ROOT / "public" / "assets" / "crimson" / "arborblade_sword.glb"
MAP = EXPERIMENT / "bone-map.json"
SKELETON = EXPERIMENT / "canonical-skeleton.json"
CALIBRATION = ROOT / "public" / "assets" / "crimson" / "crimson_sword_calibration.json"
DEFAULT_OUT = ROOT / "generated" / "bvh-retarget-spike"
SAMPLES = (0, 6, 12, 18, 24)
SCHEMA = "pose-lab-v2-org-bvh-retarget-spike-v1"
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
            bone.head = source.matrix_world @ original.head_local
            bone.tail = source.matrix_world @ original.tail_local
            bone.roll = original.matrix_local.to_euler().y
        else:
            lower = source.data.bones[source_map["spineLower"]]
            chest = source.data.bones[source_map["chest"]]
            bone.head = (source.matrix_world @ lower.head_local).lerp(
                source.matrix_world @ chest.head_local, 0.5
            )
            bone.tail = (source.matrix_world @ lower.tail_local).lerp(
                source.matrix_world @ chest.tail_local, 0.5
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
) -> tuple[bpy.types.Action, dict[int, dict[str, Matrix]]]:
    action = bpy.data.actions.new("CanonicalSwordAttack1")
    proxy.animation_data_create()
    proxy.animation_data.action = action
    sampled: dict[int, dict[str, Matrix]] = {}
    for frame in frames:
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        sampled[frame] = {}
        for canonical in source_map:
            desired_world = canonical_source_matrix(source, source_map, canonical, rest=False)
            proxy.pose.bones[canonical].matrix = proxy.matrix_world.inverted() @ desired_world
            sampled[frame][canonical] = desired_world.copy()
        bpy.context.view_layer.update()
        for bone in proxy.pose.bones:
            bone.keyframe_insert("location", frame=frame, group=bone.name)
            bone.keyframe_insert("rotation_quaternion", frame=frame, group=bone.name)
            bone.keyframe_insert("scale", frame=frame, group=bone.name)
    return action, sampled


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


def import_bvh(path: Path) -> bpy.types.Object:
    before = set(bpy.data.objects)
    bpy.ops.import_anim.bvh(
        filepath=str(path),
        global_scale=1.0,
        frame_start=0,
        use_fps_scale=False,
        update_scene_fps=False,
        update_scene_duration=False,
        rotate_mode="NATIVE",
        axis_forward="-Z",
        axis_up="Y",
    )
    created = [obj for obj in bpy.data.objects if obj not in before and obj.type == "ARMATURE"]
    if len(created) != 1:
        raise RuntimeError(f"BVH round trip created {len(created)} armatures")
    created[0].name = "CanonicalBVHRoundTrip"
    return created[0]


def matrix_error(a: Matrix, b: Matrix) -> dict:
    return {
        "position": (a.translation - b.translation).length,
        "rotationDeg": math.degrees(a.to_quaternion().rotation_difference(b.to_quaternion()).angle),
    }


def verify_roundtrip(
    imported: bpy.types.Object,
    sampled: dict[int, dict[str, Matrix]],
    source_proxy_world: Matrix,
) -> dict:
    errors = []
    for frame, bones in sampled.items():
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        for name, original_world in bones.items():
            imported_bone = imported.pose.bones.get(name)
            if imported_bone is None:
                raise RuntimeError(f"BVH round trip lost {name}")
            original_proxy = source_proxy_world.inverted() @ original_world
            error = matrix_error(imported_bone.matrix, original_proxy)
            errors.append({"frame": frame, "bone": name, **error})
    return {
        "maxPositionError": max(entry["position"] for entry in errors),
        "maxRotationErrorDeg": max(entry["rotationDeg"] for entry in errors),
        "samples": len(errors),
        "worstPosition": max(errors, key=lambda item: item["position"]),
        "worstRotation": max(errors, key=lambda item: item["rotationDeg"]),
    }


def rest_local(armature: bpy.types.Object, bone_name: str) -> Matrix:
    bone = armature.data.bones[bone_name]
    return bone.parent.matrix_local.inverted() @ bone.matrix_local if bone.parent else bone.matrix_local.copy()


def bake_target(
    canonical: bpy.types.Object,
    target: bpy.types.Object,
    skeleton: dict,
    target_map: dict[str, str],
    frames: tuple[int, ...],
) -> bpy.types.Action:
    action = bpy.data.actions.new("CrimsonCanonicalSwordAttack1")
    target.animation_data_create()
    target.animation_data.action = action
    # Crimson's GLB has no root *bone*.  Its map intentionally names the
    # armature object for the canonical root, while Hips is the first skinned
    # joint.  Root/object motion is therefore a sidecar concern in this spike;
    # body retargeting starts at hips instead of pretending the object is a
    # pose bone.
    order = [entry["name"] for entry in skeleton["joints"] if entry["name"] != "root"]
    parent_by_name = {
        entry["name"]: None if entry["parent"] == "root" else entry["parent"]
        for entry in skeleton["joints"]
        if entry["name"] != "root"
    }
    canonical_rest = {name: canonical.data.bones[name].matrix_local.copy() for name in order}
    target_rest = {name: target.data.bones[target_map[name]].matrix_local.copy() for name in order}
    target_local = {name: rest_local(target, target_map[name]) for name in order}
    for frame in frames:
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        desired: dict[str, Matrix] = {}
        for name in order:
            source_pose = canonical.pose.bones[name].matrix.copy()
            delta = source_pose.to_quaternion() @ canonical_rest[name].to_quaternion().inverted()
            rotation = delta @ target_rest[name].to_quaternion()
            parent = parent_by_name[name]
            if parent:
                head = desired[parent] @ target_local[name].translation
            else:
                root_delta = source_pose.translation - canonical_rest[name].translation
                head = target_rest[name].translation + root_delta
            desired[name] = Matrix.LocRotScale(head, rotation, Vector((1, 1, 1)))
            target.pose.bones[target_map[name]].matrix = desired[name]
        bpy.context.view_layer.update()
        for name in order:
            bone = target.pose.bones[target_map[name]]
            bone.rotation_mode = "QUATERNION"
            bone.keyframe_insert("location", frame=frame, group=bone.name)
            bone.keyframe_insert("rotation_quaternion", frame=frame, group=bone.name)
            bone.keyframe_insert("scale", frame=frame, group=bone.name)
    return action


def top_level(objects: list[bpy.types.Object]) -> list[bpy.types.Object]:
    owned = set(objects)
    return [obj for obj in objects if obj.parent not in owned]


def browser_transform(transform: dict) -> Matrix:
    location = Matrix.Translation(Vector(transform.get("position", (0, 0, 0))))
    angles = transform.get("rotationDeg", (0, 0, 0))
    rotation = Euler(tuple(math.radians(value) for value in angles), "XYZ").to_matrix().to_4x4()
    scale = transform.get("scale", (1, 1, 1))
    browser = location @ rotation @ Matrix.Diagonal((*scale, 1))
    return BROWSER_TO_BLENDER @ browser @ BLENDER_TO_BROWSER


def attach_sword(
    target: bpy.types.Object, sword_objects: list[bpy.types.Object], initial: dict[str, Matrix], calibration: dict
) -> Matrix:
    hand = target.matrix_world @ target.pose.bones["RightHand"].matrix
    socket = hand @ browser_transform(calibration["saberGripLocal"]) @ browser_transform(calibration["swordLocal"])
    for obj in top_level(sword_objects):
        obj.matrix_world = socket @ initial[obj.name]
    return socket


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


def pose_metrics(
    target: bpy.types.Object, target_map: dict[str, str], socket: Matrix, calibration: dict
) -> dict:
    joints = {}
    for canonical in (
        "clavicle.L", "upperArm.L", "lowerArm.L", "hand.L",
        "clavicle.R", "upperArm.R", "lowerArm.R", "hand.R",
    ):
        matrix = target.matrix_world @ target.pose.bones[target_map[canonical]].matrix
        joints[canonical] = [round(value, 6) for value in matrix.translation]
    right = target.matrix_world @ target.pose.bones[target_map["hand.R"]].matrix
    left = target.matrix_world @ target.pose.bones[target_map["hand.L"]].matrix
    hilt = socket @ (BROWSER_TO_BLENDER @ Vector((*calibration["hiltLocalPoint"], 1))).to_3d()
    blade_axis = (
        socket @ (BROWSER_TO_BLENDER @ Vector((*calibration["tipLocalPoint"], 1))).to_3d()
    ) - hilt
    left_offset = left.translation - hilt
    along = left_offset.dot(blade_axis.normalized())
    radial = (left_offset - blade_axis.normalized() * along).length
    return {
        "joints": joints,
        "rightHandToHilt": (right.translation - hilt).length,
        "leftHandToBladeAxis": radial,
        "leftHandAlongBladeAxis": along,
        "weaponOwnership": "primary socket only; bilateral closure intentionally not solved",
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT))
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    args = parser.parse_args(argv)
    out = Path(args.out_dir)
    if not out.is_absolute():
        out = ROOT / out
    out.mkdir(parents=True, exist_ok=True)
    mapping = json.loads(MAP.read_text())
    skeleton = json.loads(SKELETON.read_text())
    calibration = json.loads(CALIBRATION.read_text())
    source_map = mapping["source"]["map"]
    target_map = mapping["target"]["map"]
    bpy.context.scene.render.fps = skeleton["frameRate"]

    clear_scene()
    source_objects = import_glb(SOURCE)
    source = find_armature(source_objects, "Vanguard")
    source_action = activate_action(source, mapping["source"]["clip"])
    proxy = create_proxy(source, skeleton, source_map)
    proxy_action, sampled = bake_proxy(source, proxy, source_map, SAMPLES)
    bvh_path = out / "vanguard_swordattack1_org_proxy.bvh"
    export_proxy_bvh(proxy, bvh_path, min(SAMPLES), max(SAMPLES))
    source_proxy_world = proxy.matrix_world.copy()

    source.hide_render = True
    for obj in source_objects:
        obj.hide_viewport = True
        obj.hide_render = True
    proxy.hide_viewport = True
    proxy.hide_render = True
    canonical = import_bvh(bvh_path)
    roundtrip = verify_roundtrip(canonical, sampled, source_proxy_world)

    target_objects = import_glb(TARGET)
    target = find_armature(target_objects, "Crimson")
    target_action = bake_target(canonical, target, skeleton, target_map, SAMPLES)
    sword_objects = import_glb(SWORD)
    sword_initial = {obj.name: obj.matrix_world.copy() for obj in top_level(sword_objects)}
    render_objects = target_objects + sword_objects
    camera = setup_render()
    evidence = []
    for frame in SAMPLES:
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        socket = attach_sword(target, sword_objects, sword_initial, calibration)
        bpy.context.view_layer.update()
        image = out / f"locked-side-{frame:03d}.png"
        render(image, camera, render_objects, Vector((0, -1, 0.12)))
        evidence.append(
            {"frame": frame, "view": "locked-side", "image": image.name, "sha256": sha256(image),
             "metrics": pose_metrics(target, target_map, socket, calibration)}
        )
    contact_frame = SAMPLES[len(SAMPLES) // 2]
    for label, direction in (
        ("front", Vector((-1, 0, 0.08))),
        ("three-quarter", Vector((-1, -1, 0.12))),
        ("rear-three-quarter", Vector((1, 1, 0.12))),
    ):
        bpy.context.scene.frame_set(contact_frame)
        bpy.context.view_layer.update()
        socket = attach_sword(target, sword_objects, sword_initial, calibration)
        image = out / f"diagnostic-{label}.png"
        render(image, camera, render_objects, direction)
        evidence.append(
            {"frame": contact_frame, "view": label, "image": image.name, "sha256": sha256(image),
             "metrics": pose_metrics(target, target_map, socket, calibration)}
        )

    blend_path = out / "crimson_org_bvh_retarget.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    manifest = {
        "schema": SCHEMA,
        "status": "executed-diagnostic-not-accepted",
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
            "sourceLayer": "ORG only",
            "proxyAction": proxy_action.name,
        },
        "roundTrip": roundtrip,
        "evidence": evidence,
        "conclusions": {
            "bvhSolved": [
                "small inspectable anatomical hierarchy",
                "evaluated ORG motion separated from Rigify controls and DEF segmentation",
                "deterministic hierarchy/channel/frame-rate/root interchange",
                "rest-corrected body seed on Crimson",
            ],
            "stillRed": [
                "bilateral two-hand sword closure",
                "off-hand grip interval and prop ownership",
                "foot contact locking",
                "Crimson twist and armor deformation correction",
                "screen-readable acting and final visual acceptance",
            ],
        },
        "blend": {"file": blend_path.name, "sha256": sha256(blend_path)},
    }
    manifest_path = out / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({"ok": True, "out": str(out), "manifest": str(manifest_path), "roundTrip": roundtrip}, indent=2))


if __name__ == "__main__":
    main()
