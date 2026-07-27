#!/usr/bin/env python3
"""Bake a sparse capture-direction packet onto Regnet's final Meshy rig in Blender."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
import tempfile
import zipfile
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

JOINTS = (
    "Hips", "Spine02", "Spine01", "Spine", "neck", "Head",
    "LeftShoulder", "LeftArm", "LeftForeArm", "LeftHand",
    "RightShoulder", "RightArm", "RightForeArm", "RightHand",
    "LeftUpLeg", "LeftLeg", "LeftFoot", "LeftToeBase",
    "RightUpLeg", "RightLeg", "RightFoot", "RightToeBase",
)
BONES = (
    ("Hips", "Spine02"), ("Spine02", "Spine01"), ("Spine01", "Spine"),
    ("Spine", "neck"), ("neck", "Head"),
    ("LeftShoulder", "LeftArm"),
    ("LeftArm", "LeftForeArm"), ("LeftForeArm", "LeftHand"),
    ("RightShoulder", "RightArm"),
    ("RightArm", "RightForeArm"), ("RightForeArm", "RightHand"),
    ("LeftUpLeg", "LeftLeg"),
    ("LeftLeg", "LeftFoot"),
    ("RightUpLeg", "RightLeg"),
    ("RightLeg", "RightFoot"),
)
SCHEMA = "pose-lab-v2-regnet-capture-bake-v1"


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
    return [item for item in bpy.data.objects if item not in before]


def armature(objects: list[bpy.types.Object], label: str) -> bpy.types.Object:
    matches = [item for item in objects if item.type == "ARMATURE"]
    if len(matches) != 1:
        raise RuntimeError(f"{label}: expected one armature, found {[item.name for item in matches]}")
    missing = sorted(set(JOINTS) - set(matches[0].pose.bones.keys()))
    if missing:
        raise RuntimeError(f"{label}: missing Regnet joints {missing}")
    return matches[0]


def action_for(source: bpy.types.Object, actions: list[bpy.types.Action]) -> bpy.types.Action:
    if len(actions) != 1:
        raise RuntimeError(f"source clip expected one imported action, found {[item.name for item in actions]}")
    source.animation_data_create()
    source.animation_data.action = actions[0]
    for track in source.animation_data.nla_tracks:
        track.mute = True
    return actions[0]


def find_archive_entry(archive: zipfile.ZipFile, clip_title: str) -> str:
    wanted = clip_title.lower().replace(" ", "_")
    candidates = [
        name for name in archive.namelist()
        if name.lower().endswith(".glb") and wanted in Path(name).stem.lower()
    ]
    if len(candidates) != 1:
        raise RuntimeError(f"cannot uniquely resolve clip {clip_title!r}: {candidates}")
    return candidates[0]


def world_head(rig: bpy.types.Object, name: str) -> Vector:
    return (rig.matrix_world @ rig.pose.bones[name].matrix).translation.copy()


def basis(points: dict[str, Vector]) -> tuple[Vector, Vector, Vector]:
    right = points["RightArm"] - points["LeftArm"]
    up = points["Head"] - points["Hips"]
    up.normalize()
    right = right - up * right.dot(up)
    right.normalize()
    forward = right.cross(up)
    forward.normalize()
    right = up.cross(forward)
    right.normalize()
    return right, up, forward


def packet_points(key: dict) -> dict[str, Vector]:
    return {
        name: Vector(values)
        for name, values in key["descriptor"]["positions"].items()
    }


def mapped_capture_direction(key: dict, start: str, end: str, target_basis: tuple[Vector, Vector, Vector]) -> Vector:
    points = packet_points(key)
    capture_basis = basis(points)
    source = points[end] - points[start]
    source.normalize()
    coordinates = Vector(tuple(source.dot(axis) for axis in capture_basis))
    mapped = (
        target_basis[0] * coordinates.x
        + target_basis[1] * coordinates.y
        + target_basis[2] * coordinates.z
    )
    mapped.normalize()
    return mapped


def set_direction(rig: bpy.types.Object, bone_name: str, desired: Vector) -> None:
    bone = rig.pose.bones[bone_name]
    world = rig.matrix_world @ bone.matrix
    current = world.to_3x3() @ Vector((0, 1, 0))
    current.normalize()
    desired.normalize()
    delta = current.rotation_difference(desired)
    rotation = delta @ world.to_quaternion()
    head = world.translation
    bone.matrix = rig.matrix_world.inverted() @ Matrix.LocRotScale(
        head, rotation, Vector((1, 1, 1))
    )
    bpy.context.view_layer.update()


def set_world_head_z(rig: bpy.types.Object, bone_name: str, world_z: float) -> None:
    bone = rig.pose.bones[bone_name]
    world = rig.matrix_world @ bone.matrix
    world.translation.z = world_z
    bone.matrix = rig.matrix_world.inverted() @ world
    bpy.context.view_layer.update()


def compression_ratio(key: dict, baseline: dict) -> float:
    if not key["descriptor"].get("screenPositions"):
        return 1.0

    def pelvis_to_support(item: dict) -> float:
        screen = item["descriptor"]["screenPositions"]
        support_y = (screen["LeftFoot"][1] + screen["RightFoot"][1]) * 0.5
        return max(1e-6, support_y - screen["Hips"][1])

    return max(0.35, min(1.15, pelvis_to_support(key) / pelvis_to_support(baseline)))


def solve_two_bone(root: Vector, target: Vector, pole: Vector, upper: float, lower: float) -> tuple[Vector, Vector]:
    direction = target - root
    distance = direction.length
    epsilon = max(1e-5, (upper + lower) * 1e-5)
    clamped = min(max(distance, abs(upper - lower) + epsilon), upper + lower - epsilon)
    direction.normalize()
    target = root + direction * clamped
    along = (upper * upper - lower * lower + clamped * clamped) / (2 * clamped)
    height = math.sqrt(max(0.0, upper * upper - along * along))
    pole_direction = pole - root
    pole_direction -= direction * pole_direction.dot(direction)
    if pole_direction.length < epsilon:
        pole_direction = Vector((0, 0, 1))
        pole_direction -= direction * pole_direction.dot(direction)
    pole_direction.normalize()
    return root + direction * along + pole_direction * height, target


def apply_contact_lock(
    rig: bpy.types.Object,
    upper_name: str,
    lower_name: str,
    end_name: str,
    anchor: Vector,
) -> None:
    root = world_head(rig, upper_name)
    pole = world_head(rig, lower_name)
    object_scale = sum(abs(value) for value in rig.matrix_world.to_scale()) / 3.0
    upper = rig.data.bones[upper_name].length * object_scale
    lower = rig.data.bones[lower_name].length * object_scale
    middle, solved = solve_two_bone(root, anchor, pole, upper, lower)
    set_direction(rig, upper_name, middle - root)
    lower_head = world_head(rig, lower_name)
    set_direction(rig, lower_name, solved - lower_head)


def key_contacts(packet: dict, source_frame: int) -> list[str]:
    return [
        item["joint"] for item in packet.get("contactHypotheses", [])
        if item["startFrame"] <= source_frame <= item["endFrame"]
    ]


def copy_native_pose(source: bpy.types.Object, target: bpy.types.Object) -> None:
    for name in JOINTS:
        target.pose.bones[name].matrix_basis = source.pose.bones[name].matrix_basis.copy()
    bpy.context.view_layer.update()


def frame_camera(camera: bpy.types.Object, objects: list[bpy.types.Object], direction: Vector) -> None:
    low = Vector((math.inf, math.inf, math.inf))
    high = Vector((-math.inf, -math.inf, -math.inf))
    for item in objects:
        if item.type != "MESH":
            continue
        for corner in item.bound_box:
            point = item.matrix_world @ Vector(corner)
            for axis in range(3):
                low[axis] = min(low[axis], point[axis])
                high[axis] = max(high[axis], point[axis])
    center = (low + high) * 0.5
    extent = high - low
    camera.location = center + direction.normalized() * max(extent.length * 2.2, 4.0)
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.ortho_scale = max(extent) * 1.32
    camera.data.clip_start = 0.01
    camera.data.clip_end = 1000


def render_evidence(
    out: Path,
    target_objects: list[bpy.types.Object],
    frame_map: list[dict],
) -> list[dict]:
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
    camera = bpy.data.objects.new("RegnetCaptureCamera", bpy.data.cameras.new("RegnetCaptureCamera"))
    bpy.context.collection.objects.link(camera)
    camera.data.type = "ORTHO"
    scene.camera = camera
    evidence = []
    directions = {"locked": Vector((0, -1, 0.1)), "orthogonal": Vector((-1, 0, 0.1))}
    frame_camera(camera, target_objects, directions["locked"])
    locked_matrix = camera.matrix_world.copy()
    locked_scale = camera.data.ortho_scale
    for item in frame_map:
        scene.frame_set(item["bakedFrame"])
        camera.matrix_world = locked_matrix
        camera.data.ortho_scale = locked_scale
        path = out / f"locked-{item['keyId']}.png"
        scene.render.filepath = str(path)
        bpy.ops.render.render(write_still=True)
        evidence.append({"keyId": item["keyId"], "view": "locked", "path": path.name, "sha256": sha256(path)})
    middle = frame_map[len(frame_map) // 2]
    scene.frame_set(middle["bakedFrame"])
    frame_camera(camera, target_objects, directions["orthogonal"])
    path = out / f"orthogonal-{middle['keyId']}.png"
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    evidence.append({"keyId": middle["keyId"], "view": "orthogonal", "path": path.name, "sha256": sha256(path)})
    return evidence


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", required=True)
    parser.add_argument("--archive", required=True)
    parser.add_argument("--packet", required=True)
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--strength", type=float, default=0.65)
    parser.add_argument("--fps", type=int, default=30)
    parser.add_argument("--skip-renders", action="store_true")
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    args = parser.parse_args(argv)
    target_path = Path(args.target).resolve()
    archive_path = Path(args.archive).resolve()
    packet_path = Path(args.packet).resolve()
    out = Path(args.out_dir).resolve()
    out.mkdir(parents=True, exist_ok=True)
    packet = json.loads(packet_path.read_text())
    if packet.get("schema") != "pose-lab-v2-regnet-capture-direction-v1":
        raise RuntimeError("not a Regnet capture direction packet")
    if not 0 <= args.strength <= 1:
        raise RuntimeError("--strength must be between 0 and 1")

    clear_scene()
    target_objects = import_glb(target_path)
    target = armature(target_objects, "target")
    for bone in target.pose.bones:
        bone.rotation_mode = "QUATERNION"
    target.animation_data_clear()
    target.animation_data_create()
    baked = bpy.data.actions.new("RegnetCaptureCandidate")
    target.animation_data.action = baked
    scene = bpy.context.scene
    scene.render.fps = args.fps
    anchors: dict[str, Vector] = {}
    frame_map = []
    baseline_key = packet["keyframes"][0]
    baseline_hip_z = None
    support_z = None

    with tempfile.TemporaryDirectory() as temp, zipfile.ZipFile(archive_path) as archive:
        sources: dict[str, tuple[bpy.types.Object, bpy.types.Action]] = {}
        for order, key in enumerate(packet["keyframes"]):
            match = key["nearestRegnetPoses"][0]
            clip = match["clipTitle"]
            if clip not in sources:
                entry = find_archive_entry(archive, clip)
                extracted = Path(temp) / f"{len(sources):03d}.glb"
                extracted.write_bytes(archive.read(entry))
                before_actions = set(bpy.data.actions)
                objects = import_glb(extracted)
                source = armature(objects, f"source {clip}")
                action = action_for(source, [item for item in bpy.data.actions if item not in before_actions])
                for item in objects:
                    item.hide_render = True
                    item.hide_viewport = True
                sources[clip] = source, action
            source, action = sources[clip]
            source.animation_data.action = action
            scene.frame_set(round(action.frame_range[0] + match["timeSeconds"] * args.fps))
            bpy.context.view_layer.update()
            copy_native_pose(source, target)

            contacts = key_contacts(packet, key["sourceFrame"])
            for joint in contacts:
                anchors.setdefault(joint, world_head(target, joint))
            support_names = [
                name for name in ("LeftFoot", "RightFoot")
                if name in anchors
            ]
            ratio = compression_ratio(key, baseline_key)
            if support_names:
                if baseline_hip_z is None:
                    baseline_hip_z = world_head(target, "Hips").z
                    support_z = sum(anchors[name].z for name in support_names) / len(support_names)
                desired_hip_z = support_z + (baseline_hip_z - support_z) * ratio
                set_world_head_z(target, "Hips", desired_hip_z)
            else:
                desired_hip_z = world_head(target, "Hips").z

            target_points = {name: world_head(target, name) for name in JOINTS}
            target_basis = basis(target_points)
            confidence = key["descriptor"]["confidence"]
            for start, end in BONES:
                prior = world_head(target, end) - world_head(target, start)
                if prior.length < 1e-8:
                    continue
                prior.normalize()
                directed = mapped_capture_direction(key, start, end, target_basis)
                alpha = args.strength * min(confidence.get(start, 1.0), confidence.get(end, 1.0))
                blended = prior.lerp(directed, alpha)
                if blended.length > 1e-8:
                    set_direction(target, start, blended)

            for joint in contacts:
                if joint == "LeftFoot":
                    apply_contact_lock(target, "LeftUpLeg", "LeftLeg", joint, anchors[joint])
                elif joint == "RightFoot":
                    apply_contact_lock(target, "RightUpLeg", "RightLeg", joint, anchors[joint])

            baked_frame = max(
                order if not frame_map else frame_map[-1]["bakedFrame"] + 1,
                round(key["timeSeconds"] * args.fps),
            )
            authored_basis = {
                bone.name: bone.matrix_basis.copy()
                for bone in target.pose.bones
            }
            scene.frame_set(baked_frame)
            for bone in target.pose.bones:
                bone.matrix_basis = authored_basis[bone.name]
                bone.keyframe_insert("location", frame=baked_frame, group=bone.name)
                bone.keyframe_insert("rotation_quaternion", frame=baked_frame, group=bone.name)
                bone.keyframe_insert("scale", frame=baked_frame, group=bone.name)
            frame_map.append({
                "keyId": key["id"],
                "sourceFrame": key["sourceFrame"],
                "timeSeconds": key["timeSeconds"],
                "bakedFrame": baked_frame,
                "nativePrior": match,
                "semanticRoles": key.get("semanticRoles", []),
                "contacts": contacts,
                "compressionRatio": round(ratio, 6),
                "hipsWorldZ": round(desired_hip_z, 6),
            })

    scene.frame_start = frame_map[0]["bakedFrame"]
    scene.frame_end = frame_map[-1]["bakedFrame"]
    for curve in baked.fcurves:
        for point_ in curve.keyframe_points:
            point_.interpolation = "LINEAR"

    evidence = [] if args.skip_renders else render_evidence(out, target_objects, frame_map)
    blend = out / "regnet_capture_candidate.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend))
    glb = out / "regnet_capture_candidate.glb"
    bpy.ops.object.select_all(action="DESELECT")
    for item in target_objects:
        item.hide_render = False
        item.hide_viewport = False
        item.select_set(True)
    bpy.context.view_layer.objects.active = target
    bpy.ops.export_scene.gltf(
        filepath=str(glb),
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_yup=True,
    )
    manifest = {
        "schema": SCHEMA,
        "status": "quarantined-pending-visual-review",
        "source": {
            "target": str(target_path),
            "targetSha256": sha256(target_path),
            "archive": str(archive_path),
            "archiveSha256": sha256(archive_path),
            "packet": str(packet_path),
            "packetSha256": sha256(packet_path),
        },
        "authoring": {
            "lane": "native-pose-prior-plus-capture-directed-final-rig",
            "strength": args.strength,
            "fps": args.fps,
            "pelvisDepthPolicy": (
                "when stationary-camera screen landmarks and support contacts exist, "
                "map pelvis-to-ankle image ratio onto final-rig pelvis height"
            ),
            "keys": frame_map,
            "contactAnchors": {name: list(value) for name, value in anchors.items()},
            "interpolation": "LINEAR pending sparse-key visual acceptance",
            "evidence": evidence,
        },
        "outputs": {
            "blend": {"path": blend.name, "sha256": sha256(blend)},
            "glb": {"path": glb.name, "sha256": sha256(glb)},
        },
        "acceptance": {
            "fixedCamera": "pending-human-read",
            "orthogonal": "pending-human-read",
            "hostedPoseLab": "pending",
            "humanVerdict": "pending",
        },
    }
    manifest_path = out / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({"ok": True, "manifest": str(manifest_path), "glb": str(glb)}, indent=2))


if __name__ == "__main__":
    main()
