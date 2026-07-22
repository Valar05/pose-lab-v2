#!/usr/bin/env python3
"""Render Vanguard and Crimson Attack1 side by side and fail on broken transforms."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import struct
import sys

DEBIAN_DIST_PACKAGES = "/usr/lib/python3/dist-packages"
if DEBIAN_DIST_PACKAGES not in sys.path:
    sys.path.append(DEBIAN_DIST_PACKAGES)
from datetime import datetime, timezone
from itertools import combinations
from pathlib import Path

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Euler, Matrix, Quaternion, Vector

ROOT = Path(__file__).resolve().parents[1]
VANGUARD_GLB = ROOT / "public" / "assets" / "vanguard" / "vanguard_rigged_animations.glb"
CRIMSON_GLB = ROOT / "public" / "assets" / "crimson" / "crimson_plume_knight_rigged_pbr.glb"
SWORD_GLB = ROOT / "public" / "assets" / "crimson" / "arborblade_sword.glb"
REFERENCE_JSON = ROOT / "public" / "assets" / "crimson" / "vanguard_swordattack1_reference.json"
CALIBRATION_JSON = ROOT / "public" / "assets" / "crimson" / "crimson_sword_calibration.json"
CANDIDATE_JS = ROOT / "src" / "review-candidates" / "crimson-light-attack1-vanguard-4.js"
DEFAULT_OUT = ROOT / "generated" / "crimson-vanguard-attack1-compare" / "latest"
SCHEMA = "pose-lab-v2-crimson-vanguard-attack1-blender-compare-v1"
BROWSER_TO_BLENDER = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
BLENDER_TO_BROWSER = BROWSER_TO_BLENDER.inverted()
FRAME_LABELS = ["start", "earlyWindup", "anticipation", "snapPrep", "contact", "contactHold", "settle", "followThrough"]


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def load_candidate(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    match = re.search(r"export const \w+ = (.*);\s*$", text, re.S)
    if not match:
        raise RuntimeError(f"candidate module is not a plain exported object: {path}")
    return json.loads(match.group(1))


def pad4(data: bytes, byte: bytes = b"\x00") -> bytes:
    return data + byte * ((-len(data)) % 4)


def parse_glb(path: Path) -> tuple[dict, bytes]:
    raw = path.read_bytes()
    magic, version, total_length = struct.unpack_from("<4sII", raw, 0)
    if magic != b"glTF" or version != 2 or total_length != len(raw):
        raise RuntimeError(f"unsupported GLB header: {path}")
    offset = 12
    gltf = None
    bin_chunk = b""
    while offset < len(raw):
        chunk_length, chunk_type = struct.unpack_from("<I4s", raw, offset)
        offset += 8
        chunk = raw[offset:offset + chunk_length]
        offset += chunk_length
        if chunk_type == b"JSON":
            gltf = json.loads(chunk.rstrip(b" \t\r\n\x00").decode("utf-8"))
        elif chunk_type == b"BIN\x00":
            bin_chunk = chunk
    if gltf is None:
        raise RuntimeError(f"GLB has no JSON chunk: {path}")
    return gltf, bin_chunk


def write_glb(path: Path, gltf: dict, bin_chunk: bytes) -> None:
    json_chunk = pad4(json.dumps(gltf, separators=(",", ":")).encode("utf-8"), b" ")
    bin_chunk = pad4(bin_chunk, b"\x00")
    total = 12 + 8 + len(json_chunk) + 8 + len(bin_chunk)
    out = bytearray()
    out += struct.pack("<4sII", b"glTF", 2, total)
    out += struct.pack("<I4s", len(json_chunk), b"JSON")
    out += json_chunk
    out += struct.pack("<I4s", len(bin_chunk), b"BIN\x00")
    out += bin_chunk
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(out)


def append_accessor(gltf: dict, bin_chunk: bytes, payload: bytes, accessor: dict) -> tuple[bytes, int]:
    offset = len(bin_chunk)
    bin_chunk += payload
    bin_chunk = pad4(bin_chunk, b"\x00")
    gltf.setdefault("bufferViews", []).append({"buffer": 0, "byteOffset": offset, "byteLength": len(payload)})
    view_index = len(gltf["bufferViews"]) - 1
    gltf.setdefault("accessors", []).append({"bufferView": view_index, **accessor})
    return bin_chunk, len(gltf["accessors"]) - 1


def node_name_map(gltf: dict) -> dict[str, int]:
    return {node.get("name"): index for index, node in enumerate(gltf.get("nodes", [])) if node.get("name")}


def inject_animation(source_glb: Path, frames: list[dict], node_frames: dict[str, dict[str, list]], out_glb: Path, name: str) -> Path:
    gltf, bin_chunk = parse_glb(source_glb)
    by_name = node_name_map(gltf)
    times = [float(frame["time"]) for frame in frames]
    time_payload = struct.pack("<" + "f" * len(times), *times)
    bin_chunk, time_accessor = append_accessor(gltf, bin_chunk, time_payload, {
        "componentType": 5126,
        "type": "SCALAR",
        "count": len(times),
        "min": [min(times)],
        "max": [max(times)],
    })
    samplers = []
    channels = []
    animated = []
    for node_name, paths in sorted(node_frames.items()):
        node_index = by_name.get(node_name)
        if node_index is None:
            continue
        if "rotation" in paths:
            values = []
            for frame in frames:
                values.extend(float(v) for v in paths["rotation"][frame["label"]])
            bin_chunk, accessor = append_accessor(gltf, bin_chunk, struct.pack("<" + "f" * len(values), *values), {
                "componentType": 5126,
                "type": "VEC4",
                "count": len(frames),
            })
            sampler = len(samplers)
            samplers.append({"input": time_accessor, "output": accessor, "interpolation": "LINEAR"})
            channels.append({"sampler": sampler, "target": {"node": node_index, "path": "rotation"}})
            animated.append(f"{node_name}.rotation")
        if "translation" in paths:
            values = []
            for frame in frames:
                values.extend(float(v) for v in paths["translation"][frame["label"]])
            bin_chunk, accessor = append_accessor(gltf, bin_chunk, struct.pack("<" + "f" * len(values), *values), {
                "componentType": 5126,
                "type": "VEC3",
                "count": len(frames),
            })
            sampler = len(samplers)
            samplers.append({"input": time_accessor, "output": accessor, "interpolation": "LINEAR"})
            channels.append({"sampler": sampler, "target": {"node": node_index, "path": "translation"}})
            animated.append(f"{node_name}.translation")
    if not channels:
        raise RuntimeError(f"no animation channels matched nodes in {source_glb}")
    gltf.setdefault("animations", []).append({"name": name, "samplers": samplers, "channels": channels})
    gltf.setdefault("buffers", [{"byteLength": 0}])[0]["byteLength"] = len(bin_chunk)
    write_glb(out_glb, gltf, bin_chunk)
    return out_glb


def crimson_node_frames(candidate: dict) -> tuple[list[dict], dict[str, dict[str, dict[str, list]]]]:
    frames = [{"label": frame["label"], "time": float(frame["time"])} for frame in candidate["frames"] if frame["label"] in FRAME_LABELS]
    node_frames: dict[str, dict[str, dict[str, list]]] = {}
    for frame in candidate["frames"]:
        label = frame["label"]
        if label not in FRAME_LABELS:
            continue
        for bone, quat in (frame.get("bones") or {}).items():
            node_frames.setdefault(bone, {}).setdefault("rotation", {})[label] = quat
    return frames, node_frames


def vanguard_node_frames(reference: dict) -> tuple[list[dict], dict[str, dict[str, dict[str, list]]]]:
    frames = []
    node_frames: dict[str, dict[str, dict[str, list]]] = {}
    for label in FRAME_LABELS:
        sample = reference["samples"][label]
        frames.append({"label": label, "time": float(sample["sourceTime"])})
        for bone in sample.get("bones", {}).values():
            name = bone["sourceNode"]
            node_frames.setdefault(name, {}).setdefault("rotation", {})[label] = bone["localQuaternion"]
            if any(abs(v) > 0.000001 for v in bone.get("localPosition", [])):
                node_frames.setdefault(name, {}).setdefault("translation", {})[label] = bone["localPosition"]
        for name, prop in sample.get("props", {}).items():
            node_frames.setdefault(name, {}).setdefault("rotation", {})[label] = prop["localQuaternion"]
            node_frames.setdefault(name, {}).setdefault("translation", {})[label] = prop["localPosition"]
    return frames, node_frames


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def import_glb(path: Path) -> list[bpy.types.Object]:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    return [obj for obj in bpy.data.objects if obj not in before]


def top_level(objects: list[bpy.types.Object]) -> list[bpy.types.Object]:
    owned = set(objects)
    return [obj for obj in objects if obj.parent not in owned]


def find_armature(objects: list[bpy.types.Object], label: str) -> bpy.types.Object:
    for obj in objects:
        if obj.type == "ARMATURE":
            return obj
    raise RuntimeError(f"{label} import did not contain an armature")


def mesh_bounds(objects: list[bpy.types.Object]) -> tuple[Vector, Vector, Vector]:
    low = Vector((float("inf"), float("inf"), float("inf")))
    high = Vector((float("-inf"), float("-inf"), float("-inf")))
    found = False
    depsgraph = bpy.context.evaluated_depsgraph_get()
    for obj in objects:
        if obj.type != "MESH":
            continue
        found = True
        evaluated = obj.evaluated_get(depsgraph)
        for corner in evaluated.bound_box:
            world = evaluated.matrix_world @ Vector(corner)
            low.x = min(low.x, world.x); low.y = min(low.y, world.y); low.z = min(low.z, world.z)
            high.x = max(high.x, world.x); high.y = max(high.y, world.y); high.z = max(high.z, world.z)
    if not found:
        raise RuntimeError("no mesh bounds found")
    return low, high, high - low


def normalize_and_offset(objects: list[bpy.types.Object], target_height: float, offset_x: float) -> None:
    low, high, size = mesh_bounds(objects)
    height = max(0.001, size.z if size.z > size.y else size.y)
    center = (low + high) * 0.5
    scale = target_height / height
    transform = Matrix.Translation(Vector((offset_x, 0, 0))) @ Matrix.Diagonal((scale, scale, scale, 1.0)) @ Matrix.Translation(Vector((-center.x, -center.y, -low.z)))
    for obj in top_level(objects):
        obj.matrix_world = transform @ obj.matrix_world
    bpy.context.view_layer.update()


def activate_last_action(armature: bpy.types.Object) -> None:
    armature.data.pose_position = "POSE"
    armature.animation_data_create()
    if not bpy.data.actions:
        raise RuntimeError("no imported actions available")
    armature.animation_data.action = bpy.data.actions[-1]
    for track in armature.animation_data.nla_tracks:
        track.mute = True


def activate_action_containing(armature: bpy.types.Object, token: str) -> None:
    armature.data.pose_position = "POSE"
    armature.animation_data_create()
    wanted = re.sub(r"[^a-z0-9]", "", token.lower())
    matches = [action for action in bpy.data.actions if wanted in re.sub(r"[^a-z0-9]", "", action.name.lower())]
    if len(matches) != 1:
        available = sorted(action.name for action in bpy.data.actions)
        raise RuntimeError(f"expected one action containing {token!r}; matches={[a.name for a in matches]}; available={available}")
    armature.animation_data.action = matches[0]
    for track in armature.animation_data.nla_tracks:
        track.mute = True


def activate_named_action(armature: bpy.types.Object, action_name: str) -> None:
    armature.data.pose_position = "POSE"
    armature.animation_data_create()
    action = bpy.data.actions.get(action_name)
    if action is None:
        available = sorted(action.name for action in bpy.data.actions)
        raise RuntimeError(f"missing Blender action {action_name}; available={available}")
    armature.animation_data.action = action
    for track in armature.animation_data.nla_tracks:
        track.mute = True


def suppress_vanguard_root_motion(armature: bpy.types.Object) -> None:
    root = armature.pose.bones.get("root")
    if root:
        root.location = (0, 0, 0)
    bpy.context.view_layer.update()


def browser_vector(values: list[float]) -> Vector:
    return (BROWSER_TO_BLENDER @ Vector((values[0], values[1], values[2], 1.0))).to_3d()


def browser_matrix(matrix: Matrix) -> Matrix:
    return BROWSER_TO_BLENDER @ matrix @ BLENDER_TO_BROWSER


def transform_matrix(transform: dict) -> Matrix:
    position = transform.get("position") or [0, 0, 0]
    rotation_deg = transform.get("rotationDeg") or [0, 0, 0]
    scale = transform.get("scale") or [1, 1, 1]
    translation = Matrix.Translation(Vector(position))
    rotation = Euler(tuple(math.radians(v) for v in rotation_deg), "XYZ").to_matrix().to_4x4()
    scaling = Matrix.Diagonal((scale[0], scale[1], scale[2], 1.0))
    return translation @ rotation @ scaling


def browser_transform_matrix(transform: dict) -> Matrix:
    return browser_matrix(transform_matrix(transform))


def setup_scene(width: int, height: int, samples: int) -> bpy.types.Object:
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    scene.cycles.use_denoising = False
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.view_settings.view_transform = "Filmic"
    scene.view_settings.look = "Medium High Contrast"
    scene.world.color = (0.04, 0.045, 0.05)
    camera = bpy.data.objects.new("attack1_compare_camera", bpy.data.cameras.new("attack1_compare_camera"))
    bpy.context.collection.objects.link(camera)
    scene.camera = camera
    camera.location = (0, -7.2, 1.05)
    target = Vector((0, 0, 0.78))
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.angle = math.radians(43)
    camera.data.clip_start = 0.01
    camera.data.clip_end = 80
    sun = bpy.data.objects.new("attack1_compare_sun", bpy.data.lights.new("attack1_compare_sun", "SUN"))
    sun.rotation_euler = (math.radians(45), 0, math.radians(35))
    sun.data.energy = 2.2
    bpy.context.collection.objects.link(sun)
    area = bpy.data.objects.new("attack1_compare_softbox", bpy.data.lights.new("attack1_compare_softbox", "AREA"))
    area.location = (0, -3, 3.2)
    area.data.energy = 650
    area.data.size = 5
    bpy.context.collection.objects.link(area)
    return camera


def aim_camera(camera: bpy.types.Object, location: Vector, target: Vector, angle_degrees: float) -> None:
    camera.location = location
    camera.rotation_euler = (target - location).to_track_quat("-Z", "Y").to_euler()
    camera.data.angle = math.radians(angle_degrees)


def add_ground_plane() -> bpy.types.Object:
    bpy.ops.mesh.primitive_plane_add(size=8, location=(0, 0, 0))
    plane = bpy.context.object
    plane.name = "combat_pose_ground"
    material = bpy.data.materials.new("combat_pose_ground_material")
    material.diffuse_color = (0.07, 0.08, 0.09, 1)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (0.07, 0.08, 0.09, 1)
        bsdf.inputs["Roughness"].default_value = 0.86
    plane.data.materials.append(material)
    return plane


def set_frame(time_s: float, fps: int) -> None:
    bpy.context.scene.frame_set(round(time_s * fps))
    bpy.context.view_layer.update()


def apply_bone_quaternion(armature: bpy.types.Object, bone_name: str, quat_xyzw: list[float]) -> bool:
    bone = armature.pose.bones.get(bone_name)
    if not bone:
        return False
    bone.rotation_mode = "QUATERNION"
    bone.rotation_quaternion = (float(quat_xyzw[3]), float(quat_xyzw[0]), float(quat_xyzw[1]), float(quat_xyzw[2]))
    return True


def apply_crimson_candidate_pose(armature: bpy.types.Object, candidate: dict, label: str) -> None:
    frame = next((entry for entry in candidate.get("frames", []) if entry.get("label") == label), None)
    if not frame:
        raise RuntimeError(f"missing Crimson candidate frame {label}")
    missing = []
    for bone_name, quat in (frame.get("bones") or {}).items():
        if not apply_bone_quaternion(armature, bone_name, quat):
            missing.append(bone_name)
    if missing:
        raise RuntimeError(f"Crimson Blender armature missing candidate bones: {missing[:8]}")
    bpy.context.view_layer.update()


def apply_vanguard_reference_pose(armature: bpy.types.Object, reference: dict, label: str) -> None:
    sample = reference.get("samples", {}).get(label)
    if not sample:
        raise RuntimeError(f"missing Vanguard reference sample {label}")
    missing = []
    for logical, bone in (sample.get("bones") or {}).items():
        if not apply_bone_quaternion(armature, bone["sourceNode"], bone["localQuaternion"]):
            missing.append(bone["sourceNode"])
    # The exported source has a few helper props outside the armature. The body
    # pose is the comparison truth here; prop animation from the injected GLB is
    # left intact when Blender exposes it as object animation.
    if len(missing) > 4:
        raise RuntimeError(f"Vanguard Blender armature missing too many reference bones: {missing[:8]}")
    bpy.context.view_layer.update()


def project(camera: bpy.types.Object, point: Vector) -> tuple[float, float, float]:
    ndc = world_to_camera_view(bpy.context.scene, camera, point)
    return (float(ndc.x), float(ndc.y), float(ndc.z))


def screen_angle(a: tuple[float, float, float], b: tuple[float, float, float]) -> float:
    return math.degrees(math.atan2(b[1] - a[1], b[0] - a[0]))


def angle_delta(a: float, b: float) -> float:
    return abs((a - b + 180) % 360 - 180)


def screen_distance(a: tuple[float, float, float], b: tuple[float, float, float]) -> float:
    return math.hypot(b[0] - a[0], b[1] - a[1])


def find_pose_bone_world(armature: bpy.types.Object, name: str) -> Matrix:
    bone = armature.pose.bones.get(name)
    if not bone:
        raise RuntimeError(f"missing pose bone {name}")
    return armature.matrix_world @ bone.matrix


def clear_pose(armature: bpy.types.Object) -> None:
    armature.data.pose_position = "POSE"
    armature.animation_data_clear()
    for bone in armature.pose.bones:
        bone.matrix_basis.identity()
    bpy.context.view_layer.update()


def export_authored_pose(armature: bpy.types.Object) -> dict[str, list[float]]:
    names = [
        "Hips", "Spine", "Spine01", "Spine02", "neck", "Head",
        "LeftShoulder", "LeftArm", "LeftForeArm", "LeftHand",
        "RightShoulder", "RightArm", "RightForeArm", "RightHand",
        "LeftUpLeg", "LeftLeg", "LeftFoot",
        "RightUpLeg", "RightLeg", "RightFoot",
    ]
    result = {}
    for name in names:
        bone = armature.pose.bones.get(name)
        if not bone:
            continue
        quaternion = bone.matrix_basis.to_quaternion().normalized()
        result[name] = [round(quaternion.x, 8), round(quaternion.y, 8), round(quaternion.z, 8), round(quaternion.w, 8)]
    return result


def export_authored_glb(objects: list[bpy.types.Object], armature: bpy.types.Object, path: Path) -> dict:
    action = bpy.data.actions.new("CrimsonCombatReadyFrameZero")
    armature.animation_data_create()
    armature.animation_data.action = action
    for bone in armature.pose.bones:
        basis = bone.matrix_basis.copy()
        bone.rotation_mode = "QUATERNION"
        bone.location = basis.to_translation()
        bone.rotation_quaternion = basis.to_quaternion().normalized()
        bone.scale = basis.to_scale()
        bone.keyframe_insert(data_path="location", frame=1)
        bone.keyframe_insert(data_path="rotation_quaternion", frame=1)
        bone.keyframe_insert(data_path="scale", frame=1)
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 1
    bpy.context.scene.frame_set(1)
    bpy.context.view_layer.update()
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = armature
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_frame_range=True,
        export_force_sampling=True,
        export_def_bones=True,
        export_yup=True,
    )
    return {"path": path.name, "sha256": sha256(path), "action": action.name}


def set_pose_bone_world_rotation(armature: bpy.types.Object, bone_name: str, desired_world: Quaternion) -> None:
    bone = armature.pose.bones.get(bone_name)
    if not bone:
        raise RuntimeError(f"missing target pose bone {bone_name}")
    armature_rotation = armature.matrix_world.to_quaternion()
    desired_armature = armature_rotation.inverted() @ desired_world @ armature_rotation
    matrix = desired_armature.to_matrix().to_4x4()
    matrix.translation = bone.matrix.translation
    bone.matrix = matrix
    bpy.context.view_layer.update()


def rotate_pose_bone_world(armature: bpy.types.Object, bone_name: str, from_world: Vector, to_world: Vector, max_degrees: float = 180.0) -> float:
    if from_world.length < 0.000001 or to_world.length < 0.000001:
        return 0.0
    delta_world = from_world.normalized().rotation_difference(to_world.normalized())
    angle_degrees = math.degrees(delta_world.angle)
    if angle_degrees > max_degrees:
        delta_world = Quaternion().slerp(delta_world, max_degrees / angle_degrees)
        angle_degrees = max_degrees
    bone = armature.pose.bones.get(bone_name)
    if not bone:
        raise RuntimeError(f"missing target pose bone {bone_name}")
    armature_rotation = armature.matrix_world.to_quaternion()
    delta_armature = armature_rotation.inverted() @ delta_world @ armature_rotation
    head = bone.head.copy()
    bone.matrix = Matrix.Translation(head) @ delta_armature.to_matrix().to_4x4() @ Matrix.Translation(-head) @ bone.matrix
    bpy.context.view_layer.update()
    return angle_degrees


def rotate_pose_bone_world_axis(armature: bpy.types.Object, bone_name: str, axis_world: Vector, degrees: float) -> None:
    bone = armature.pose.bones.get(bone_name)
    if not bone:
        raise RuntimeError(f"missing target pose bone {bone_name}")
    delta_world = Quaternion(axis_world.normalized(), math.radians(degrees))
    armature_rotation = armature.matrix_world.to_quaternion()
    delta_armature = armature_rotation.inverted() @ delta_world @ armature_rotation
    head = bone.head.copy()
    bone.matrix = Matrix.Translation(head) @ delta_armature.to_matrix().to_4x4() @ Matrix.Translation(-head) @ bone.matrix
    bpy.context.view_layer.update()


def solve_pose_chain(armature: bpy.types.Object, chain: list[str], target_mid: Vector, target_end: Vector) -> dict:
    upper_name, lower_name, end_name = chain
    for _ in range(16):
        upper = find_pose_bone_world(armature, upper_name).translation
        lower = find_pose_bone_world(armature, lower_name).translation
        end = find_pose_bone_world(armature, end_name).translation
        rotate_pose_bone_world(armature, lower_name, end - lower, target_end - lower, 18)
        upper = find_pose_bone_world(armature, upper_name).translation
        end = find_pose_bone_world(armature, end_name).translation
        rotate_pose_bone_world(armature, upper_name, end - upper, target_end - upper, 12)
        upper = find_pose_bone_world(armature, upper_name).translation
        lower = find_pose_bone_world(armature, lower_name).translation
        rotate_pose_bone_world(armature, upper_name, lower - upper, target_mid - upper, 8)
    actual_mid = find_pose_bone_world(armature, lower_name).translation
    actual_end = find_pose_bone_world(armature, end_name).translation
    return {
        "chain": chain,
        "targetMid": [round(v, 5) for v in target_mid],
        "targetEnd": [round(v, 5) for v in target_end],
        "midError": round((actual_mid - target_mid).length, 5),
        "endError": round((actual_end - target_end).length, 5),
    }


def source_direction_targets(source_armature: bpy.types.Object, target_armature: bpy.types.Object, source_chain: list[str], target_chain: list[str]) -> tuple[Vector, Vector]:
    source_upper = find_pose_bone_world(source_armature, source_chain[0]).translation
    source_mid = find_pose_bone_world(source_armature, source_chain[1]).translation
    source_end = find_pose_bone_world(source_armature, source_chain[2]).translation
    upper_direction = (source_mid - source_upper).normalized()
    lower_direction = (source_end - source_mid).normalized()
    target_upper = find_pose_bone_world(target_armature, target_chain[0]).translation
    target_mid_now = find_pose_bone_world(target_armature, target_chain[1]).translation
    target_end_now = find_pose_bone_world(target_armature, target_chain[2]).translation
    upper_length = (target_mid_now - target_upper).length
    lower_length = (target_end_now - target_mid_now).length
    target_mid = target_upper + upper_direction * upper_length
    target_end = target_mid + lower_direction * lower_length
    return target_mid, target_end


def apply_source_world_deltas(source_armature: bpy.types.Object, target_armature: bpy.types.Object, logical_bones: dict[str, str]) -> list[dict]:
    # Retarget the authored world-space change from each Vanguard rest bone onto
    # Crimson's corresponding rest bone. Setting the complete hierarchy in
    # parent-to-child order preserves the source action and adapts bone bases;
    # solving chains independently only matched endpoints and discarded roll,
    # torso causality, and the two-hand weapon relationship.
    names = [
        "Hips", "Spine", "Spine01", "Spine02", "neck", "Head",
        "LeftShoulder", "LeftArm", "LeftForeArm", "LeftHand",
        "RightShoulder", "RightArm", "RightForeArm", "RightHand",
        "LeftUpLeg", "LeftLeg", "LeftFoot",
        "RightUpLeg", "RightLeg", "RightFoot",
    ]
    report = []
    for target_name in names:
        source_name = logical_bones[target_name]
        source_bone = source_armature.pose.bones.get(source_name)
        target_bone = target_armature.pose.bones.get(target_name)
        if not source_bone or not target_bone:
            continue
        source_rest = (source_armature.matrix_world @ source_bone.bone.matrix_local).to_quaternion()
        source_pose = (source_armature.matrix_world @ source_bone.matrix).to_quaternion()
        source_delta = source_pose @ source_rest.inverted()
        target_rest = (target_armature.matrix_world @ target_bone.bone.matrix_local).to_quaternion()
        desired = source_delta @ target_rest
        set_pose_bone_world_rotation(target_armature, target_name, desired)
        report.append({"bone": target_name, "source": source_name, "deltaDeg": round(math.degrees(source_delta.angle), 3)})
    return report


def solve_chain_with_pole(
    armature: bpy.types.Object,
    chain: list[str],
    target_end: Vector,
    pole: Vector,
    iterations: int = 20,
) -> dict:
    """Place one native Crimson limb while keeping its bend plane intentional."""
    upper_name, lower_name, end_name = chain
    for _ in range(iterations):
        lower = find_pose_bone_world(armature, lower_name).translation
        end = find_pose_bone_world(armature, end_name).translation
        rotate_pose_bone_world(armature, lower_name, end - lower, target_end - lower, 14)
        upper = find_pose_bone_world(armature, upper_name).translation
        end = find_pose_bone_world(armature, end_name).translation
        rotate_pose_bone_world(armature, upper_name, end - upper, target_end - upper, 10)

    upper = find_pose_bone_world(armature, upper_name).translation
    lower = find_pose_bone_world(armature, lower_name).translation
    end = find_pose_bone_world(armature, end_name).translation
    axis = end - upper
    if axis.length > 0.000001:
        axis_n = axis.normalized()
        current = lower - upper
        desired = pole - upper
        current_plane = current - axis_n * current.dot(axis_n)
        desired_plane = desired - axis_n * desired.dot(axis_n)
        if current_plane.length > 0.000001 and desired_plane.length > 0.000001:
            signed = math.atan2(
                axis_n.dot(current_plane.normalized().cross(desired_plane.normalized())),
                current_plane.normalized().dot(desired_plane.normalized()),
            )
            rotate_pose_bone_world_axis(
                armature,
                upper_name,
                axis_n,
                math.degrees(signed),
            )

    for _ in range(8):
        lower = find_pose_bone_world(armature, lower_name).translation
        end = find_pose_bone_world(armature, end_name).translation
        rotate_pose_bone_world(armature, lower_name, end - lower, target_end - lower, 10)
        upper = find_pose_bone_world(armature, upper_name).translation
        end = find_pose_bone_world(armature, end_name).translation
        rotate_pose_bone_world(armature, upper_name, end - upper, target_end - upper, 7)

    actual_mid = find_pose_bone_world(armature, lower_name).translation
    actual_end = find_pose_bone_world(armature, end_name).translation
    return {
        "chain": chain,
        "targetEnd": [round(v, 5) for v in target_end],
        "pole": [round(v, 5) for v in pole],
        "mid": [round(v, 5) for v in actual_mid],
        "endError": round((actual_end - target_end).length, 5),
    }


def pose_bone_world_direction(armature: bpy.types.Object, bone_name: str) -> Vector:
    bone = armature.pose.bones.get(bone_name)
    if not bone:
        raise RuntimeError(f"missing target pose bone {bone_name}")
    return (armature.matrix_world.to_3x3() @ (bone.tail - bone.head)).normalized()


def aim_pose_bone_direction(armature: bpy.types.Object, bone_name: str, desired_world: tuple[float, float, float]) -> float:
    """Directly pose one Crimson FK bone toward an authored visual direction."""
    desired = Vector(desired_world).normalized()
    current = pose_bone_world_direction(armature, bone_name)
    return rotate_pose_bone_world(armature, bone_name, current, desired)


def author_crimson_frame_zero(source_armature: bpy.types.Object, target_armature: bpy.types.Object, logical_bones: dict[str, str]) -> dict:
    # Vanguard remains on screen as visual reference only. This function never
    # reads source_armature or logical_bones. IK pins relationships deliberately
    # chosen for Crimson; it does not derive targets from Vanguard.
    clear_pose(target_armature)

    preserved_feet = {
        name: find_pose_bone_world(target_armature, name).to_quaternion()
        for name in ["LeftFoot", "RightFoot"]
    }

    # Restrained center. The body inclines into the guard without asking the
    # pelvis to manufacture the pose.
    center_rotations = [
        ("Hips", (0, 0, 1), -22.0),
        ("Hips", (1, 0, 0), 5.0),
        ("Spine", (1, 0, 0), 12.0),
        ("Spine01", (0, 0, 1), 4.0),
        ("Spine02", (0, 0, 1), 5.0),
        ("neck", (0, 0, 1), 3.0),
    ]
    for bone_name, axis, degrees in center_rotations:
        rotate_pose_bone_world_axis(target_armature, bone_name, Vector(axis), degrees)

    # Native Crimson leg IK. End targets create the stagger; poles establish the
    # knee planes. Both knees travel toward the threat (-Y), with a small outward
    # component so neither chain corkscrews inward.
    left_hip = find_pose_bone_world(target_armature, "LeftUpLeg").translation
    right_hip = find_pose_bone_world(target_armature, "RightUpLeg").translation
    left_ankle = find_pose_bone_world(target_armature, "LeftFoot").translation
    right_ankle = find_pose_bone_world(target_armature, "RightFoot").translation
    leg_scale = max((left_hip - left_ankle).length, (right_hip - right_ankle).length)
    hips_bone = target_armature.pose.bones.get("Hips")
    if not hips_bone:
        raise RuntimeError("missing target pose bone Hips")
    hips_drop_world = Vector((0.0, 0.0, -0.20 * leg_scale))
    hips_matrix = hips_bone.matrix.copy()
    hips_matrix.translation = hips_matrix.translation + (
        target_armature.matrix_world.inverted().to_3x3() @ hips_drop_world
    )
    hips_bone.matrix = hips_matrix
    bpy.context.view_layer.update()
    leg_reports = [
        solve_chain_with_pole(
            target_armature,
            ["LeftUpLeg", "LeftLeg", "LeftFoot"],
            left_ankle + Vector((0.10 * leg_scale, -0.34 * leg_scale, 0.0)),
            left_hip + Vector((0.10 * leg_scale, -0.74 * leg_scale, -0.42 * leg_scale)),
            iterations=24,
        ),
        solve_chain_with_pole(
            target_armature,
            ["RightUpLeg", "RightLeg", "RightFoot"],
            right_ankle + Vector((-0.06 * leg_scale, 0.18 * leg_scale, 0.0)),
            right_hip + Vector((-0.06 * leg_scale, -0.56 * leg_scale, -0.38 * leg_scale)),
            iterations=24,
        ),
    ]

    # Restore flat boot orientation after the leg chains move the ankles.
    for name, rotation in preserved_feet.items():
        set_pose_bone_world_rotation(target_armature, name, rotation)

    # Neutral clavicles first. The hands are close enough to own one hilt, but
    # deliberately offset so the arms do not form a mirrored prayer knot.
    for shoulder_name in ["LeftShoulder", "RightShoulder"]:
        shoulder = target_armature.pose.bones.get(shoulder_name)
        if shoulder:
            shoulder.matrix_basis.identity()
    bpy.context.view_layer.update()

    chest = find_pose_bone_world(target_armature, "Spine").translation
    shoulder_span = (
        find_pose_bone_world(target_armature, "LeftArm").translation
        - find_pose_bone_world(target_armature, "RightArm").translation
    ).length
    torso_height = max(
        0.001,
        (
            find_pose_bone_world(target_armature, "neck").translation
            - find_pose_bone_world(target_armature, "Hips").translation
        ).length,
    )
    right_hand_target = find_pose_bone_world(target_armature, "neck").translation + Vector((-0.34 * shoulder_span, -0.22 * torso_height, 0.30 * torso_height))
    left_hand_target = find_pose_bone_world(target_armature, "neck").translation + Vector((-0.28 * shoulder_span, -0.20 * torso_height, 0.38 * torso_height))
    right_shoulder = find_pose_bone_world(target_armature, "RightArm").translation
    left_shoulder = find_pose_bone_world(target_armature, "LeftArm").translation
    arm_reports = [
        solve_chain_with_pole(
            target_armature,
            ["RightArm", "RightForeArm", "RightHand"],
            right_hand_target,
            right_shoulder + Vector((-0.35 * shoulder_span, -0.04 * torso_height, -0.40 * torso_height)),
            iterations=28,
        ),
        solve_chain_with_pole(
            target_armature,
            ["LeftArm", "LeftForeArm", "LeftHand"],
            left_hand_target,
            left_shoulder + Vector((0.10 * shoulder_span, -0.02 * torso_height, -0.28 * torso_height)),
            iterations=28,
        ),
    ]

    # Small wrist rolls align rigid gauntlets after the arm silhouette is set.
    hand_rotations = [
        ("RightHand", (0, 0, 1), 5.0),
        ("RightHand", (0, 1, 0), -8.0),
        ("LeftHand", (0, 0, 1), -6.0),
        ("LeftHand", (0, 1, 0), 5.0),
    ]
    for bone_name, axis, degrees in hand_rotations:
        rotate_pose_bone_world_axis(target_armature, bone_name, Vector(axis), degrees)

    return {
        "method": "crimson-native-authored-ik-pins-plus-fk-keyframe",
        "sourceAuthority": "Vanguard pixels only; source armature and logical mapping are deliberately unread",
        "compositionIntent": {
            "forceLine": "rear foot through turned pelvis into an offset high guard",
            "stance": "depth-staggered, loaded, and narrower in screen width",
            "guard": "off-center hand cluster with unequal low elbows and a readable face",
        },
        "crossRigPoseInputs": [],
        "centerRotations": [
            {"bone": bone, "axisWorld": list(axis), "degrees": degrees}
            for bone, axis, degrees in center_rotations
        ],
        "hipsDropWorld": [round(value, 5) for value in hips_drop_world],
        "legIk": leg_reports,
        "armIk": arm_reports,
        "handRotations": [
            {"bone": bone, "axisWorld": list(axis), "degrees": degrees}
            for bone, axis, degrees in hand_rotations
        ],
        "weaponContract": "Arborblade remains ordinary RightHand-child FK after the authored pose",
        "keyframeContract": "one authored Crimson pose at frame 1",
    }


def author_crimson_blade_direction(
    target_armature: bpy.types.Object,
    sword_objects: list[bpy.types.Object],
    sword_initial: dict[str, Matrix],
    calibration: dict,
) -> dict:
    # This threat line is visually authored for Crimson. It is not measured or
    # imported from Vanguard. The hand is rotated as an FK control until the
    # actual Arborblade mesh follows this chosen direction.
    desired = Vector((0.940, -0.180, 0.290)).normalized()
    applied = 0.0
    for _ in range(3):
        hand = find_pose_bone_world(target_armature, "RightHand")
        socket = place_crimson_sword(sword_objects, sword_initial, hand, calibration)
        hilt = socket @ browser_vector(calibration.get("hiltLocalPoint") or [0, 0, 0])
        tip = socket @ browser_vector(calibration.get("tipLocalPoint") or [0, 0, 1])
        applied += rotate_pose_bone_world(target_armature, "RightHand", tip - hilt, desired, 35)
    return {
        "authority": "authored Crimson threat line; no Vanguard measurement",
        "desiredWorldDirection": [round(v, 6) for v in desired],
        "rightHandFkCorrectionDeg": round(applied, 3),
    }


def canon_bone_name(name: str) -> str:
    return "".join(character for character in str(name).lower() if character.isalnum())


def foot_mesh_contact_metrics(objects: list[bpy.types.Object], armature: bpy.types.Object, side: str, ground_z: float) -> dict | None:
    wanted = {canon_bone_name(f"{side}Foot"), canon_bone_name(f"{side}ToeBase")}
    points = []
    depsgraph = bpy.context.evaluated_depsgraph_get()
    for obj in objects:
        if obj.type != "MESH":
            continue
        group_indices = {group.index for group in obj.vertex_groups if canon_bone_name(group.name) in wanted}
        if not group_indices:
            continue
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh(preserve_all_data_layers=True, depsgraph=depsgraph)
        try:
            for vertex in mesh.vertices:
                weight = sum(group.weight for group in vertex.groups if group.group in group_indices)
                if weight >= 0.15:
                    points.append(evaluated.matrix_world @ vertex.co)
        finally:
            evaluated.to_mesh_clear()
    foot_bone = armature.pose.bones.get(f"{side}Foot")
    toe_bone = armature.pose.bones.get(f"{side}ToeBase")
    if len(points) < 12 or not foot_bone or not toe_bone:
        return None
    foot_origin = (armature.matrix_world @ foot_bone.matrix).translation
    toe_origin = (armature.matrix_world @ toe_bone.matrix).translation
    forward = toe_origin - foot_origin
    forward.z = 0
    if forward.length < 0.000001:
        return None
    forward.normalize()
    lateral = Vector((-forward.y, forward.x, 0)).normalized()
    ordered = sorted(points, key=lambda point: point.z)
    bottom = ordered[:max(12, len(ordered) // 8)]
    by_forward = sorted(bottom, key=lambda point: point.dot(forward))
    by_lateral = sorted(bottom, key=lambda point: point.dot(lateral))
    sample_count = max(3, len(bottom) // 5)
    heel = min(by_forward[:sample_count], key=lambda point: point.z)
    toe = min(by_forward[-sample_count:], key=lambda point: point.z)
    left_edge = sum((point for point in by_lateral[:sample_count]), Vector((0, 0, 0))) / sample_count
    right_edge = sum((point for point in by_lateral[-sample_count:]), Vector((0, 0, 0))) / sample_count
    edge = right_edge - left_edge
    sole_normal = forward.cross(edge).normalized()
    if sole_normal.z < 0:
        sole_normal.negate()
    return {
        "vertexCount": len(points),
        "bottomVertexCount": len(bottom),
        "heelWorld": [round(value, 5) for value in heel],
        "toeWorld": [round(value, 5) for value in toe],
        "groundZ": round(ground_z, 5),
        "heelGroundDelta": round(heel.z - ground_z, 5),
        "toeGroundDelta": round(toe.z - ground_z, 5),
        "soleNormalWorld": [round(value, 5) for value in sole_normal],
        "soleUpDot": round(sole_normal.z, 5),
        "lateralEdgeHeightDelta": round(abs(right_edge.z - left_edge.z), 5),
    }


def translate_import(objects: list[bpy.types.Object], delta: Vector) -> None:
    transform = Matrix.Translation(delta)
    for obj in top_level(objects):
        obj.matrix_world = transform @ obj.matrix_world
    bpy.context.view_layer.update()


def settle_crimson_boots(objects: list[bpy.types.Object], armature: bpy.types.Object) -> float:
    contacts = [foot_mesh_contact_metrics(objects, armature, side, 0.0) for side in ["Left", "Right"]]
    contact_z = min(
        value
        for contact in contacts if contact
        for value in [contact["heelWorld"][2], contact["toeWorld"][2]]
    )
    translate_import(objects, Vector((0, 0, -contact_z)))
    return contact_z


def imported_sword_line(objects: list[bpy.types.Object], camera: bpy.types.Object) -> dict:
    points = []
    depsgraph = bpy.context.evaluated_depsgraph_get()
    for obj in objects:
        if obj.type != "MESH" or "sword" not in obj.name.lower():
            continue
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        try:
            step = max(1, len(mesh.vertices) // 80)
            for vertex_index in range(0, len(mesh.vertices), step):
                points.append(obj.matrix_world @ mesh.vertices[vertex_index].co)
        finally:
            evaluated.to_mesh_clear()
    if len(points) < 2:
        low, high, _ = mesh_bounds(objects)
        points = [low, high]
    best = None
    for a, b in combinations(points, 2):
        pa, pb = project(camera, a), project(camera, b)
        dist = screen_distance(pa, pb)
        if not best or dist > best[0]:
            best = (dist, pa, pb, a, b)
    dist, pa, pb, wa, wb = best
    return {"screenA": pa, "screenB": pb, "worldA": wa, "worldB": wb, "screenLength": dist, "screenAngleDeg": screen_angle(pa, pb)}


def apply_crimson_sword_material(objects: list[bpy.types.Object]) -> None:
    material = bpy.data.materials.new("CompareVisibleArborbladeSteel")
    material.diffuse_color = (0.62, 0.72, 0.78, 1)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (0.62, 0.72, 0.78, 1)
        bsdf.inputs["Metallic"].default_value = 0.75
        bsdf.inputs["Roughness"].default_value = 0.32
    for obj in objects:
        if obj.type == "MESH":
            obj.data.materials.clear()
        obj.data.materials.append(material)


def apply_source_debug_material(objects: list[bpy.types.Object]) -> None:
    material = bpy.data.materials.new("Vanguard source readable gray")
    material.diffuse_color = (0.16, 0.21, 0.28, 1.0)
    material.use_nodes = True
    principled = material.node_tree.nodes.get("Principled BSDF")
    if principled:
        principled.inputs["Base Color"].default_value = (0.16, 0.21, 0.28, 1.0)
        principled.inputs["Roughness"].default_value = 0.62
        principled.inputs["Metallic"].default_value = 0.08
    for obj in objects:
        if obj.type != "MESH":
            continue
        obj.data.materials.clear()
        obj.data.materials.append(material)


def place_crimson_sword(sword_roots: list[bpy.types.Object], initial: dict[str, Matrix], hand_world: Matrix, calibration: dict) -> Matrix:
    socket_world = hand_world @ browser_transform_matrix(calibration["saberGripLocal"]) @ browser_transform_matrix(calibration["swordLocal"])
    for obj in top_level(sword_roots):
        obj.matrix_world = socket_world @ initial[obj.name]
    bpy.context.view_layer.update()
    return socket_world


def body_screen_box(objects: list[bpy.types.Object], camera: bpy.types.Object) -> dict:
    low, high, _ = mesh_bounds(objects)
    corners = [Vector((x, y, z)) for x in (low.x, high.x) for y in (low.y, high.y) for z in (low.z, high.z)]
    projected = [project(camera, corner) for corner in corners]
    xs = [p[0] for p in projected]
    ys = [p[1] for p in projected]
    return {"xMin": min(xs), "xMax": max(xs), "yMin": min(ys), "yMax": max(ys), "height": max(ys) - min(ys), "width": max(xs) - min(xs)}


def add_label(text: str, location: tuple[float, float, float]) -> None:
    font_curve = bpy.data.curves.new(text, "FONT")
    font_curve.body = text
    font_curve.size = 0.08
    font_curve.align_x = "CENTER"
    obj = bpy.data.objects.new(text, font_curve)
    obj.location = location
    bpy.context.collection.objects.link(obj)


def joint_screens(armature: bpy.types.Object, camera: bpy.types.Object, names: dict[str, str]) -> dict:
    result = {}
    for logical, bone_name in names.items():
        if armature.pose.bones.get(bone_name):
            result[logical] = project(camera, find_pose_bone_world(armature, bone_name).translation)
    return result


def evaluate_frame(label: str, camera: bpy.types.Object, vanguard_objects: list[bpy.types.Object], vanguard_armature: bpy.types.Object, crimson_objects: list[bpy.types.Object], crimson_armature: bpy.types.Object, sword_objects: list[bpy.types.Object], sword_socket: Matrix, calibration: dict, logical_bones: dict[str, str]) -> dict:
    hand_world = find_pose_bone_world(crimson_armature, "RightHand")
    hand_pos = hand_world.translation
    hilt = sword_socket @ browser_vector(calibration.get("hiltLocalPoint") or [0, 0, 0])
    tip = sword_socket @ browser_vector(calibration.get("tipLocalPoint") or [0, 0, 1])
    hilt_screen = project(camera, hilt)
    tip_screen = project(camera, tip)
    hand_screen = project(camera, hand_pos)
    crimson_line = {"screenLength": screen_distance(hilt_screen, tip_screen), "screenAngleDeg": screen_angle(hilt_screen, tip_screen), "hilt": hilt_screen, "tip": tip_screen}
    vanguard_line = imported_sword_line(vanguard_objects, camera)
    cbox = body_screen_box(crimson_objects + sword_objects, camera)
    vbox = body_screen_box(vanguard_objects, camera)
    failures = []
    hilt_hand_world = (hilt - hand_pos).length
    hilt_hand_screen = screen_distance(hilt_screen, hand_screen)
    if crimson_line["screenLength"] < 0.055:
        failures.append({"code": "CRIMSON_SWORD_TOO_SHORT_OR_HIDDEN", "actual": round(crimson_line["screenLength"], 4), "expected": ">= 0.055 screen units"})
    if hilt_hand_world > 0.28 or hilt_hand_screen > 0.12:
        failures.append({"code": "CRIMSON_HILT_NOT_OWNED_BY_RIGHT_HAND", "actual": {"world": round(hilt_hand_world, 4), "screen": round(hilt_hand_screen, 4)}, "expected": "hilt seated near right hand"})
    if label in {"earlyWindup", "anticipation"}:
        dx = abs(tip_screen[0] - hilt_screen[0])
        dy = abs(tip_screen[1] - hilt_screen[1])
        if dy > max(0.001, dx) * 2.3:
            failures.append({"code": "CRIMSON_WINDUP_BLADE_VERTICAL_CENTERLINE", "actual": {"dx": round(dx, 4), "dy": round(dy, 4)}, "expected": "windup blade should read as chambered/trailing, not a vertical line through the body"})
    # Tip-up/down is source-relative in this side-by-side gate. Vanguard's own
    # contact line can point down in the review camera, so absolute vertical
    # predicates are false-red here; angle divergence below owns this check.
    if label in {"snapPrep", "contact", "contactHold", "followThrough"}:
        diff = angle_delta(crimson_line["screenAngleDeg"], vanguard_line["screenAngleDeg"])
        if diff > 55:
            failures.append({"code": "CRIMSON_BLADE_LINE_DIVERGES_FROM_VANGUARD", "actual": round(diff, 2), "expected": "<= 55 deg from Vanguard sword screen line"})
    if label in {"snapPrep", "contact"} and cbox["height"] < vbox["height"] * 0.55:
        failures.append({"code": "CRIMSON_BODY_SILHOUETTE_COLLAPSED_OR_HIDDEN", "actual": {"crimsonHeight": round(cbox["height"], 4), "vanguardHeight": round(vbox["height"], 4)}, "expected": "Crimson should remain readable beside Vanguard"})
    ground_z = 0.0
    feet = {side.lower(): foot_mesh_contact_metrics(crimson_objects, crimson_armature, side, ground_z) for side in ["Left", "Right"]}
    for side, foot in feet.items():
        if not foot:
            failures.append({"code": f"CRIMSON_{side.upper()}_FOOT_MESH_CONTACT_MISSING", "actual": None, "expected": "weighted boot vertices for heel/toe/sole evaluation"})
            continue
        if foot["heelGroundDelta"] > 0.045 or foot["toeGroundDelta"] > 0.045:
            failures.append({"code": f"CRIMSON_{side.upper()}_HEEL_TOE_NOT_PLANTED", "actual": foot, "expected": "heel and toe weighted boot vertices remain within 0.045 world units of ground"})
        if foot["soleUpDot"] < 0.82 or foot["lateralEdgeHeightDelta"] > 0.055:
            failures.append({"code": f"CRIMSON_{side.upper()}_BOOT_ROLLED_OFF_SOLE", "actual": foot, "expected": "weighted boot contact plane faces ground-up without standing on an outer edge"})
    return {
        "label": label,
        "crimson": {"blade": crimson_line, "hiltHandWorld": round(hilt_hand_world, 5), "hiltHandScreen": round(hilt_hand_screen, 5), "bodyBox": cbox, "joints": joint_screens(crimson_armature, camera, {name: name for name in logical_bones}), "feet": feet},
        "vanguard": {"blade": {"screenLength": vanguard_line["screenLength"], "screenAngleDeg": vanguard_line["screenAngleDeg"]}, "bodyBox": vbox, "joints": joint_screens(vanguard_armature, camera, logical_bones)},
        "failures": failures,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT))
    parser.add_argument("--samples", type=int, default=8)
    parser.add_argument("--width", type=int, default=1280)
    parser.add_argument("--height", type=int, default=720)
    parser.add_argument("--frames", default=",".join(FRAME_LABELS), help="comma-separated frame labels to render")
    parser.add_argument("--candidate-js", default=str(CANDIDATE_JS))
    parser.add_argument("--candidate-id", default="crimson-light-attack1-vanguard-4")
    parser.add_argument("--author-frame-zero", action="store_true", help="author frame zero directly in Blender from evaluated Vanguard joints")
    parser.add_argument("--skip-render", action="store_true", help="write manifest/broken transform metrics without PNG renders")
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    args = parser.parse_args(argv)
    requested_frames = [label.strip() for label in args.frames.split(",") if label.strip()]
    unknown_frames = sorted(set(requested_frames) - set(FRAME_LABELS))
    if unknown_frames:
        raise RuntimeError(f"unknown frame labels: {unknown_frames}")
    if not requested_frames:
        raise RuntimeError("at least one frame label is required")
    candidate_path = Path(args.candidate_js)
    if not candidate_path.is_absolute():
        candidate_path = ROOT / candidate_path
    out_dir = Path(args.out_dir)
    if not out_dir.is_absolute():
        out_dir = ROOT / out_dir
    out_dir.mkdir(parents=True, exist_ok=True)
    tmp_dir = out_dir / "tmp"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    reference = load_json(REFERENCE_JSON)
    candidate = {"id": "crimson-combat-ready-blender-author-2", "frames": [{"label": "start", "time": 0, "bones": {}}]} if args.author_frame_zero else load_candidate(candidate_path)
    calibration = load_json(CALIBRATION_JSON)
    if args.author_frame_zero:
        calibration["swordLocal"]["scale"] = [value * 1.55 for value in calibration["swordLocal"]["scale"]]
    if reference.get("schema") != "pose-lab-v2-crimson-vanguard-swordattack1-reference-v2":
        raise RuntimeError("Vanguard reference is not full-body v2")
    if not args.author_frame_zero and candidate.get("id") != args.candidate_id:
        raise RuntimeError(f"comparison candidate mismatch: expected {args.candidate_id}, got {candidate.get('id')}")
    if args.author_frame_zero:
        crimson_anim = CRIMSON_GLB
    else:
        crimson_frames, crimson_nodes = crimson_node_frames(candidate)
        crimson_anim = inject_animation(CRIMSON_GLB, crimson_frames, crimson_nodes, tmp_dir / "crimson_attack1_compare.glb", candidate["id"])
    clear_scene()
    camera = setup_scene(args.width, args.height, args.samples)
    vanguard_objects = import_glb(VANGUARD_GLB)
    apply_source_debug_material(vanguard_objects)
    vanguard_armature = find_armature(vanguard_objects, "Vanguard")
    activate_named_action(vanguard_armature, "SwordAttack1_rig")
    normalize_and_offset(vanguard_objects, 1.7, -1.05)
    crimson_objects = import_glb(crimson_anim)
    crimson_armature = find_armature(crimson_objects, "Crimson")
    normalize_and_offset(crimson_objects, 1.7, 1.05)
    author_report = None
    if args.author_frame_zero:
        set_frame(0, 24)
        suppress_vanguard_root_motion(vanguard_armature)
        source_ground_offset = mesh_bounds(vanguard_objects)[0].z
        translate_import(vanguard_objects, Vector((0, 0, -source_ground_offset)))
        author_report = author_crimson_frame_zero(vanguard_armature, crimson_armature, reference["logicalBones"])
        author_report["sourceGroundOffset"] = round(source_ground_offset, 5)
        author_report["crimsonGroundOffset"] = round(settle_crimson_boots(crimson_objects, crimson_armature), 5)
    else:
        activate_action_containing(crimson_armature, candidate["id"])
    sword_objects = import_glb(SWORD_GLB)
    apply_crimson_sword_material(sword_objects)
    sword_initial = {obj.name: obj.matrix_world.copy() for obj in top_level(sword_objects)}
    if args.author_frame_zero:
        author_report["blade"] = author_crimson_blade_direction(
            crimson_armature, sword_objects, sword_initial, calibration
        )
        author_report["glbExport"] = export_authored_glb(
            crimson_objects, crimson_armature, out_dir / "authored_frame_zero.glb"
        )
    add_label("VANGUARD SOURCE", (-1.05, -0.18, 1.9))
    add_label("CRIMSON CANDIDATE", (1.05, -0.18, 1.9))
    if args.author_frame_zero:
        add_ground_plane()
    fps = 24
    bpy.context.scene.render.fps = fps
    frames = []
    all_failures = []
    for index, label in enumerate(requested_frames, start=1):
        source_sample = reference["samples"][label]
        set_frame(float(source_sample["sourceTime"]), fps)
        suppress_vanguard_root_motion(vanguard_armature)
        hand = find_pose_bone_world(crimson_armature, "RightHand")
        sword_socket = place_crimson_sword(sword_objects, sword_initial, hand, calibration)
        entry = evaluate_frame(label, camera, vanguard_objects, vanguard_armature, crimson_objects, crimson_armature, sword_objects, sword_socket, calibration, reference["logicalBones"])
        filename = f"{index:02d}-{label}.png"
        if args.skip_render:
            entry["image"] = None
            entry["sha256"] = None
        else:
            bpy.context.scene.render.filepath = str(out_dir / filename)
            bpy.ops.render.render(write_still=True)
            entry["image"] = filename
            entry["sha256"] = sha256(out_dir / filename)
            if args.author_frame_zero:
                original_location = camera.location.copy()
                original_rotation = camera.rotation_euler.copy()
                original_angle = camera.data.angle
                original_samples = bpy.context.scene.cycles.samples
                bpy.context.scene.cycles.samples = min(original_samples, 8)
                for obj in vanguard_objects:
                    obj.hide_render = True
                entry["crimsonViews"] = []
                for view_name, location in [
                    ("close-front", Vector((1.05, -4.2, 1.05))),
                    ("close-three-quarter", Vector((4.15, -3.2, 1.2))),
                    ("close-profile-right", Vector((5.2, 0, 1.15))),
                    ("close-profile-left", Vector((-3.1, 0, 1.15))),
                    ("close-rear", Vector((1.05, 4.2, 1.05))),
                ]:
                    aim_camera(camera, location, Vector((1.05, 0, 0.78)), 46)
                    view_filename = f"{index:02d}-{label}-{view_name}.png"
                    bpy.context.scene.render.filepath = str(out_dir / view_filename)
                    bpy.ops.render.render(write_still=True)
                    entry["crimsonViews"].append({"view": view_name, "image": view_filename, "sha256": sha256(out_dir / view_filename)})
                for obj in vanguard_objects:
                    obj.hide_render = False
                camera.location = original_location
                camera.rotation_euler = original_rotation
                camera.data.angle = original_angle
                bpy.context.scene.cycles.samples = original_samples
        frames.append(entry)
        for failure in entry["failures"]:
            all_failures.append({"frame": label, **failure})
    manifest = {
        "schema": SCHEMA,
        "createdAt": utc_now(),
        "classification": "diagnostic-blocker-not-acceptance",
        "candidate": candidate["id"],
        "authorReport": author_report,
        "authoredFrameZero": export_authored_pose(crimson_armature) if args.author_frame_zero else None,
        "source": {"vanguard": str(VANGUARD_GLB.relative_to(ROOT)), "crimson": str(CRIMSON_GLB.relative_to(ROOT)), "sword": str(SWORD_GLB.relative_to(ROOT))},
        "expected": "Vanguard and Crimson perform the same readable sword attack side by side; Crimson hilt stays in right hand and blade leads contact.",
        "status": "FAIL" if all_failures else "PASS",
        "frames": frames,
        "failureCount": len(all_failures),
        "brokenTransformsPath": "broken_transforms.json" if all_failures else None,
        "note": "This Blender diagnostic is agent eyesight and a cloud-dispatch blocker. It is not final hosted visual acceptance.",
    }
    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    if all_failures:
        broken = {"schema": "pose-lab-v2-broken-transform-report-v1", "createdAt": utc_now(), "candidate": candidate["id"], "failures": all_failures}
        (out_dir / "broken_transforms.json").write_text(json.dumps(broken, indent=2), encoding="utf-8")
        print(json.dumps({"ok": False, "outDir": str(out_dir.relative_to(ROOT)), "failureCount": len(all_failures), "brokenTransforms": str((out_dir / "broken_transforms.json").relative_to(ROOT))}, indent=2))
        sys.exit(1)
    print(json.dumps({"ok": True, "outDir": str(out_dir.relative_to(ROOT)), "frames": len(frames)}, indent=2))


if __name__ == "__main__":
    main()
