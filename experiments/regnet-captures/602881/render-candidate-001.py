#!/usr/bin/env python3
"""Bake a sparse capture-direction packet onto Regnet's final Meshy rig in Blender."""

from __future__ import annotations

import base64
import gzip
import hashlib
import json
import math
import re
import sys
import traceback
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
    ("Spine", "LeftShoulder"), ("LeftShoulder", "LeftArm"),
    ("LeftArm", "LeftForeArm"), ("LeftForeArm", "LeftHand"),
    ("Spine", "RightShoulder"), ("RightShoulder", "RightArm"),
    ("RightArm", "RightForeArm"), ("RightForeArm", "RightHand"),
    ("Hips", "LeftUpLeg"), ("LeftUpLeg", "LeftLeg"),
    ("LeftLeg", "LeftFoot"),
    ("Hips", "RightUpLeg"), ("RightUpLeg", "RightLeg"),
    ("RightLeg", "RightFoot"),
)
SCHEMA = "pose-lab-v2-regnet-capture-bake-v1"
PACKET_GZIP_BASE64 = "H4sIAAAAAAACA+2dbW8jyZHn38+nIPTWI008ZTzMAQ3s3a3hu/MdDI9398VhYZTIUjfdEqmj2D3uXfi7H5JSt0RmsEoqasbz4HlhuFXFyqqKrMzIyF/84z+/ms3O7ubv+pvu7NvZ2e36rj+/7i7PP9L5pn+76rfn8+52+2HTny+Wm36+Xa5X5x/x7Ovdz7bd9sPd7mebdf3l4ny13p53H7bv1pvP/5jP+9ttv7j/xXzTd9t+8U/b+iMC0nOwc7I/gX9b/FuEC4pSgH4D8C3AQyPrD5t5f/bt7D+/ms1ms7PrbrW46Tbvd+32f73tN8ubfrW9+2b/du++USB3/ObL+Rd/uVuvdtd8epXv3nVUtF5LYN45oxewmBOVRVxe9oEchefG8zkxCtHV4orVelG2K+mQQZQvfWHzxedLf1wu+nW94PXyctNtPn37zTfXy8ur5XX/Z7LoOukIy5U4Bnbd1aKjriBeLgK937vE450BX3oX8x550SnEpQlCFwUuAwFU5nQ5v4KepIMFd4urBfvlfGGX4NjB5RXE3mX/sFlfPr7OnRU3fXdTX+f/ffjT7MvB3QnL1aL/69m3M/j66V/n60U///P202292MNDJyesupvdCe/6j/P9498vF9t3Z9/OMGj/yu/65dt3tYcg+P6RzZ+vNt1N/+dNt91dlOQbPPtywt++Hr5/HLj/7sNiOXj/XXdw+3fdze31462Iw0OPfbzAu2616q/rm6XHm3z4f//++dSzq/Xmpts+schsdrb4sOnqp1avjBdu4uZPLn52t/yPh1YduDxt9+xyuX18P+Ak6F/e0X3jf/v8Ddz3z98ur/v/sXjosC/qph9ur9fdol/8n4d3dP/FXdzcyuczPj/Hd/18vVrUN/H5ab56uI+zj92H68enP7vtdp0i+7Jv1vejT/3BN7v/3fuk7758L9E7kc+vLnuUYKO5XHo/Z76a2+VVJ706F8NFJ65cLvmqc3Yql8xCorC4/HLF3dDzT5v5u+XH/slAcSUL68KYgPtyVUyCL22ulzYX7AuYXl72aleBKiQxv0KwRddxucQyD/3ycu7e99f9dr16vHLnl5eXumApV4tOL5UXdMWXPfDc8coEe6XL3uCKhNQv1aHr5ordVceXvVxd8tmXt3rXX98P1k/e7Pp6Of+0e7erxe16udrezX4zu92st/182y9m8/XN7aa/u1uuV7Pb627bdx++ue2797PfzPpVv3n7adb/dbvpb7rZb2bz9epquehX8/78+93X2i9mV91m+66/257XmWC2+zyWq7efH3bT/78P/d22X/yv/lPtB/75JexutPnz4sPt9XLebfs/vdv0d+/W17WDwgVw+fK7m261Xc7/+f6e9ge0z9NS97FbXneX1/2XD+Tspt9ulvN68O5mvd6+6xez2/764/Jutrzp3vbnn2ab/rrbLj/2s+16dtN3q1m3en/dfz78eKX5er1ZLFfdtv/uttvNUGer+ilfL/+jX5w/nH6+WH+/evzNqu82f+i7939aX/ebbrX7FVyAfzlh063e3v8RES30y4Fqid9u7j808r0//2l50z/9wFBV1R5Pubfld9tus/1yBUoP718JLgKzK/3zavH5OozJwcP7oXoZ2xt6Nv1fdlavk86/f+m01+v5blp/6LDz7qbf7LyS+w9x9jC1zx4OfO4J803fr/77Z+/k3h3p7/rNx3724Dx8bnW93v7vdXPScjW7d1mWq7f/ZXb34Xb3GczWq+tP9VidARazt91NP+v/ervebD9f7vu+u72/1Gq9+tLIdnlTu/3jXW+XN/3dtru5vXv8POfr1babb3/36bZ2wbv+cfb90ov/Ur/Qepnf91fb367X28dedPfUlF9myPpZf/6jyP7JB4Z9+pNDaznX/x7P+Hj/nR/t409u67bvF/vfKx05+C+r5fYu/WI+1CPnt/3m/G53U3tPfeht1kFluenvzt99uOlW55v+47L//uxpT2tf5x/rcPWP9/ni9/nVg89y9r7/tPPCkj673LkR7596Qg9fQft2t0dfYZ1r9v70ONv89nq93uzehDmiPrHKw3Twx/X1/Y09+leL/m6+Wd5udz984mPdru+WdSy42/vzbHb2u+Xtvjdc/9tzRNt/PvnXv+85gd/dLlc9UHu9C0APx4PrXBACPHaX+//O68mmVkZawawVtlA+bEUIQLVthQuPNJI1UUpxP2xCsUAkTRQ05aNtrPr5+6wJNYvmXVkBRGubUEY6/hi/67tF1gRFFD1swsMP2z2HC2FD8KMt1BH7u3frD9eLfpO0hCKFonkYJofSPoyxahls6p82N0kr5AaPw9aXVgC0SNtKMHEMtvLb9abPW5K6Rm56mIhF0o/VSHSwod91q8w+wi522AoqKiStkJodt89uCjhq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"
EXPECTED_PACKET_SHA256 = "e867718b105795231107d7b7d98e79845b07878a2c3da317acf2bf4c72fbe19c"
EXPECTED_INPUT_SHA256 = "c10707777c404e9dda6af4d9cd450b321d12688402ac6894d54859cd30a06b35"
AUTHORITATIVE_NATIVE_PRIOR_SHA256 = "cd94cff1a5c04e49e34cc914052ad2c5ca7533a4f9fcd4e01a3822f6c478020f"
CAPTURE_STRENGTH = 0.85
FPS = 30
DRIVEN_BONES = (
    ("Hips", "Spine02"), ("Spine02", "Spine01"), ("Spine01", "Spine"),
    ("Spine", "neck"), ("neck", "Head"),
    ("LeftShoulder", "LeftArm"), ("LeftArm", "LeftForeArm"),
    ("LeftForeArm", "LeftHand"),
    ("RightShoulder", "RightArm"), ("RightArm", "RightForeArm"),
    ("RightForeArm", "RightHand"),
    ("LeftUpLeg", "LeftLeg"), ("LeftLeg", "LeftFoot"),
    ("RightUpLeg", "RightLeg"), ("RightLeg", "RightFoot"),
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def locate_glb() -> Path:
    candidates = [
        Path(argument).resolve()
        for argument in sys.argv
        if argument.lower().endswith(".glb") and Path(argument).is_file()
    ]
    if not candidates:
        candidates = list(Path.cwd().glob("*.glb"))
    if not candidates:
        raise FileNotFoundError("host-supplied Regnet GLB not found")
    source = max(candidates, key=lambda path: path.stat().st_size)
    if source.read_bytes()[:4] != b"glTF":
        raise RuntimeError("host-supplied input is not a binary glTF")
    if sha256(source) != EXPECTED_INPUT_SHA256:
        raise RuntimeError("host-supplied Regnet GLB hash mismatch")
    return source


def render_arguments() -> tuple[Path, Path, Path, Path]:
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    if len(args) < 4:
        raise RuntimeError(
            "Expected arguments: input.glb output_dir settings.json "
            "script-output-manifest.json"
        )
    source = Path(args[0]).resolve()
    output_dir = Path(args[1]).resolve()
    settings_path = Path(args[2]).resolve()
    manifest_path = Path(args[3]).resolve()
    if not source.is_file() or source.suffix.lower() != ".glb":
        raise FileNotFoundError(f"Host-supplied Regnet GLB not found: {source}")
    if source.read_bytes()[:4] != b"glTF":
        raise RuntimeError("host-supplied input is not a binary glTF")
    if sha256(source) != EXPECTED_INPUT_SHA256:
        raise RuntimeError("host-supplied Regnet GLB hash mismatch")
    output_dir.mkdir(parents=True, exist_ok=True)
    return source, output_dir, settings_path, manifest_path


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
    frame_camera(camera, target_objects, directions["orthogonal"])
    orthogonal_matrix = camera.matrix_world.copy()
    orthogonal_scale = camera.data.ortho_scale
    for item in frame_map:
        scene.frame_set(item["bakedFrame"])
        camera.matrix_world = orthogonal_matrix
        camera.data.ortho_scale = orthogonal_scale
        path = out / f"orthogonal-{item['keyId']}.png"
        scene.render.filepath = str(path)
        bpy.ops.render.render(write_still=True)
        evidence.append({
            "keyId": item["keyId"],
            "view": "orthogonal",
            "path": path.name,
            "sha256": sha256(path),
        })
    return evidence


def main() -> None:
    target_path, out, _settings_path, script_manifest_path = render_arguments()
    packet_bytes = gzip.decompress(base64.b64decode(PACKET_GZIP_BASE64))
    if sha256_bytes(packet_bytes) != EXPECTED_PACKET_SHA256:
        raise RuntimeError("embedded capture packet hash mismatch")
    packet = json.loads(packet_bytes)
    if packet.get("schema") != "pose-lab-v2-regnet-capture-direction-v1":
        raise RuntimeError("not a Regnet capture direction packet")
    if {item["clipTitle"] for key in packet["keyframes"] for item in key["nearestRegnetPoses"][:1]} != {
        "Sprint and Sudden Stop"
    }:
        raise RuntimeError("embedded packet does not resolve one locked native prior clip")

    clear_scene()
    source_action_before = set(bpy.data.actions)
    source_objects = import_glb(target_path)
    source = armature(source_objects, "source")
    source_action = action_for(
        source,
        [item for item in bpy.data.actions if item not in source_action_before],
    )
    for item in source_objects:
        item.hide_render = True
        item.hide_viewport = True

    target_objects = import_glb(target_path)
    target = armature(target_objects, "target")
    for bone in target.pose.bones:
        bone.rotation_mode = "QUATERNION"
    target.animation_data_clear()
    target.animation_data_create()
    baked = bpy.data.actions.new("RegnetSquatCapture001")
    target.animation_data.action = baked
    scene = bpy.context.scene
    scene.render.fps = FPS
    anchors: dict[str, Vector] = {}
    frame_map = []
    baseline_key = packet["keyframes"][0]
    baseline_hip_z = None
    support_z = None
    for order, key in enumerate(packet["keyframes"]):
        match = key["nearestRegnetPoses"][0]
        source.animation_data.action = source_action
        scene.frame_set(round(source_action.frame_range[0] + match["timeSeconds"] * FPS))
        bpy.context.view_layer.update()
        copy_native_pose(source, target)

        contacts = key_contacts(packet, key["sourceFrame"])
        for joint in contacts:
            anchors.setdefault(joint, world_head(target, joint))
        if baseline_hip_z is None:
            baseline_hip_z = world_head(target, "Hips").z
            support_z = sum(anchors[name].z for name in ("LeftFoot", "RightFoot")) * 0.5
        ratio = compression_ratio(key, baseline_key)
        desired_hip_z = support_z + (baseline_hip_z - support_z) * ratio
        set_world_head_z(target, "Hips", desired_hip_z)

        target_points = {name: world_head(target, name) for name in JOINTS}
        target_basis = basis(target_points)
        confidence = key["descriptor"]["confidence"]
        for start, end in DRIVEN_BONES:
            prior = world_head(target, end) - world_head(target, start)
            if prior.length < 1e-8:
                continue
            prior.normalize()
            directed = mapped_capture_direction(key, start, end, target_basis)
            alpha = CAPTURE_STRENGTH * min(
                confidence.get(start, 1.0),
                confidence.get(end, 1.0),
            )
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
            round(key["timeSeconds"] * FPS),
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

    evidence = render_evidence(out, target_objects, frame_map)
    blend = out / "regnet_squat_capture_001.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend))
    glb = out / "regnet_squat_capture_001.glb"
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
            "finalRigAndNativePrior": target_path.name,
            "finalRigAndNativePriorSha256": sha256(target_path),
            "authoritativeNativePriorSha256": AUTHORITATIVE_NATIVE_PRIOR_SHA256,
            "nativePriorClip": "Sprint and Sudden Stop",
            "diagnosticDerivative": {
                "tool": "gltf-transform 4.4.2",
                "operations": ["dedup", "textureResize png 128x128"],
                "geometrySimplified": False,
                "animationResampled": False,
                "nodeNamesPreserved": True,
                "skinJointCount": 24,
                "animationChannels": 72,
            },
            "sourceArchiveSha256": packet["vault"]["sourceArchiveSha256"],
            "captureVideoSha256": packet["source"]["videoSha256"],
            "packetSha256": EXPECTED_PACKET_SHA256,
        },
        "authoring": {
            "lane": "native-pose-prior-plus-capture-directed-final-rig",
            "action": "RegnetSquatCapture001",
            "weapon": {"mode": "none", "hierarchy": [], "calibrationSha256": None},
            "strength": CAPTURE_STRENGTH,
            "fps": FPS,
            "pelvisDepthPolicy": (
                "stationary-camera normalized-image pelvis-to-ankle ratio "
                "mapped onto final-rig pelvis height"
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
    rendered_frames = [item["path"] for item in evidence]
    fixed_camera = [
        item["path"] for item in evidence if item["view"] == "locked"
    ]
    diagnostic_views = [
        item["path"] for item in evidence if item["view"] == "orthogonal"
    ]
    script_manifest_path.write_text(
        json.dumps(
            {
                "renderedFrames": rendered_frames,
                "fixedCameraRenders": fixed_camera,
                "diagnosticViewRenders": diagnostic_views,
                "nativePoseAnimationData": manifest_path.name,
                "threeDArtifacts": [glb.name],
                "modifiedBlend": blend.name,
                "animatedGlb": glb.name,
                "evidenceFrames": [
                    item["bakedFrame"] for item in frame_map
                ],
            },
            indent=2,
        ),
        "utf-8",
    )
    print(json.dumps({"ok": True, "manifest": str(manifest_path), "glb": str(glb)}, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        try:
            _, output_dir, _, script_manifest_path = render_arguments()
            error_path = output_dir / "renderer-error.json"
            error_path.write_text(
                json.dumps(
                    {
                        "schema": "pose-lab-v2-regnet-render-error-v1",
                        "exceptionType": type(exc).__name__,
                        "message": str(exc),
                        "traceback": traceback.format_exc(),
                    },
                    indent=2,
                ),
                "utf-8",
            )
            slug = re.sub(
                r"[^A-Za-z0-9_.-]+",
                "-",
                f"{type(exc).__name__}-{exc}",
            ).strip("-")[:150]
            diagnostic_name = f"ERROR-{slug or 'unknown'}.txt"
            diagnostic_path = output_dir / diagnostic_name
            diagnostic_path.write_text(str(exc), "utf-8")
            script_manifest_path.write_text(
                json.dumps(
                    {
                        "renderedFrames": [],
                        "fixedCameraRenders": [],
                        "diagnosticViewRenders": [],
                        "nativePoseAnimationData": error_path.name,
                        "threeDArtifacts": [],
                        "evidenceFrames": [],
                    },
                    indent=2,
                ),
                "utf-8",
            )
            print(f"SCRIPT_ERROR {type(exc).__name__}: {exc}")
        finally:
            raise
