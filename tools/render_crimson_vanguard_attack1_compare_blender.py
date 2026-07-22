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
PROTECTED_BODY_BASELINE_JSON = ROOT / "public" / "assets" / "crimson" / "crimson-frame-zero-480eb888-protected-baseline.json"
CANDIDATE_JS = ROOT / "src" / "review-candidates" / "crimson-light-attack1-vanguard-4.js"
DEFAULT_OUT = ROOT / "generated" / "crimson-vanguard-attack1-compare" / "latest"
SCHEMA = "pose-lab-v2-crimson-vanguard-attack1-blender-compare-v1"
BROWSER_TO_BLENDER = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
BLENDER_TO_BROWSER = BROWSER_TO_BLENDER.inverted()
FRAME_LABELS = ["start", "earlyWindup", "anticipation", "snapPrep", "contact", "contactHold", "settle", "followThrough"]
AUTHORED_BONE_NAMES = [
    "Hips", "Spine", "Spine01", "Spine02", "neck", "Head",
    "LeftShoulder", "LeftArm", "LeftForeArm", "LeftHand",
    "RightShoulder", "RightArm", "RightForeArm", "RightHand",
    "LeftUpLeg", "LeftLeg", "LeftFoot",
    "RightUpLeg", "RightLeg", "RightFoot",
]
PROTECTED_BODY_POSITION_NAMES = {"Hips"}
PROTECTED_BODY_BONE_NAMES = {
    "Hips", "Spine", "Spine01", "Spine02", "neck", "Head",
    "LeftUpLeg", "LeftLeg", "LeftFoot",
    "RightUpLeg", "RightLeg", "RightFoot",
}
REJECTED_480_AUTHORED_GLB_SHA256 = "4e57cc6a443b6cdd0cae1177357536234e4c4e7de98069e7027af74070bd0b56"
REJECTED_480_POSE_SHA256 = "b5ef5555ba060546f4d6dd3921f09cf0e4251dfac8a346d4db7f4f30858bd554"
REJECTED_480_CANDIDATE_ID = "crimson-frame-zero-480eb888-rejected"
# Crimson's imported Hand tails are not palm landmarks: they extend several
# metres away from the visible gauntlets. Grip evidence must come from the
# evaluated, skinned hand mesh instead of a guessed offset from the wrist.
HAND_MESH_WEIGHT_MINIMUM = 0.75
HAND_MESH_FOREARM_WEIGHT_MAXIMUM = 0.05
HAND_MESH_MEAN_WEIGHT_MINIMUM = 0.95
HAND_MESH_MINIMUM_VERTICES = 250
HAND_LANDMARK_MIN_TORSO_FRACTION = 0.20
HAND_LANDMARK_MAX_TORSO_FRACTION = 0.50
GRIP_SURFACE_CLEARANCE_TORSO_FRACTION = 0.005
GRIP_SURFACE_SEAT_CLEARANCE_TORSO_FRACTION = 0.0055
HEAD_MESH_WEIGHT_MINIMUM = 0.75
HEAD_MESH_MINIMUM_VERTICES = 500
# These are measured Blender 4.3 -> glTF -> parser round-trip floors from the
# exact rejected-480 protected channels.  They remain far below a visible pose
# change while avoiding false failures from 32-bit exporter quantization.
PROTECTED_BODY_EXPORT_POSITION_TOLERANCE = 0.00002
PROTECTED_BODY_EXPORT_QUATERNION_TOLERANCE = 0.000001
PROTECTED_BODY_RUNTIME_BASIS_TOLERANCE = 0.0000002


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def load_candidate(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    match = re.search(r"export const \w+ = (.*);\s*$", text, re.S)
    if not match:
        raise RuntimeError(f"candidate module is not a plain exported object: {path}")
    payload = match.group(1)
    try:
        return json.loads(payload)
    except json.JSONDecodeError:
        # Historical review candidates are JSON-shaped ESM object literals
        # (single quoted strings, unquoted keys, and trailing commas). Keep the
        # reader compatible with those committed candidates while generated
        # candidates use strict JSON inside the ESM export.
        payload = re.sub(
            r'([\{,]\s*)([A-Za-z_$][A-Za-z0-9_$]*)(\s*:)',
            r'\1"\2"\3',
            payload,
        )
        converted = []
        index = 0
        while index < len(payload):
            if payload[index] != "'":
                converted.append(payload[index])
                index += 1
                continue
            index += 1
            value = []
            while index < len(payload):
                character = payload[index]
                if character == "\\" and index + 1 < len(payload):
                    following = payload[index + 1]
                    if following == "'":
                        value.append("'")
                    else:
                        value.extend((character, following))
                    index += 2
                    continue
                if character == "'":
                    index += 1
                    break
                value.append(character)
                index += 1
            converted.append(json.dumps("".join(value)))
        payload = "".join(converted)
        payload = re.sub(r",\s*([}\]])", r"\1", payload)
        return json.loads(payload)


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


def read_accessor_values(gltf: dict, bin_chunk: bytes, accessor_index: int) -> list[list[float]]:
    accessor = gltf["accessors"][accessor_index]
    if accessor.get("sparse"):
        raise RuntimeError(f"sparse GLB accessor is unsupported: {accessor_index}")
    view = gltf["bufferViews"][accessor["bufferView"]]
    if view.get("buffer", 0) != 0:
        raise RuntimeError(f"external GLB buffer is unsupported: accessor {accessor_index}")
    component_formats = {
        5120: ("b", 1),
        5121: ("B", 1),
        5122: ("h", 2),
        5123: ("H", 2),
        5125: ("I", 4),
        5126: ("f", 4),
    }
    component_counts = {
        "SCALAR": 1,
        "VEC2": 2,
        "VEC3": 3,
        "VEC4": 4,
        "MAT4": 16,
    }
    try:
        component_format, component_size = component_formats[accessor["componentType"]]
        component_count = component_counts[accessor["type"]]
    except KeyError as error:
        raise RuntimeError(f"unsupported GLB accessor layout: {accessor}") from error
    packed_size = component_size * component_count
    stride = view.get("byteStride", packed_size)
    base = view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
    values = []
    for index in range(accessor["count"]):
        values.append(list(struct.unpack_from(
            "<" + component_format * component_count,
            bin_chunk,
            base + index * stride,
        )))
    return values


def extract_authored_frame_from_glb(
    path: Path,
    action_name: str,
    calibration: dict,
) -> tuple[dict, dict]:
    """Extract browser locals from the exact exported glTF animation authority."""
    gltf, bin_chunk = parse_glb(path)
    matches = [
        animation
        for animation in gltf.get("animations", [])
        if animation.get("name") == action_name
    ]
    if len(matches) != 1:
        available = [animation.get("name") for animation in gltf.get("animations", [])]
        raise RuntimeError(
            f"expected one exported GLB animation named {action_name!r}; "
            f"matches={len(matches)} available={available}"
        )
    animation = matches[0]
    bones = {}
    positions = {}
    extracted_channels = []
    exported_sample_times = []
    for channel in animation.get("channels", []):
        target = channel.get("target", {})
        node_index = target.get("node")
        path_name = target.get("path")
        if node_index is None:
            continue
        node_name = gltf["nodes"][node_index].get("name")
        canonical_channel = (
            path_name == "rotation" and node_name in AUTHORED_BONE_NAMES
        ) or (
            path_name == "translation" and node_name == "Hips"
        )
        if not canonical_channel:
            continue
        sampler = animation["samplers"][channel["sampler"]]
        input_samples = read_accessor_values(gltf, bin_chunk, sampler["input"])
        samples = read_accessor_values(gltf, bin_chunk, sampler["output"])
        if len(input_samples) != 1 or len(samples) != 1:
            raise RuntimeError(
                "canonical exported channel must contain exactly one matching input/output sample: "
                f"{node_name}.{path_name} inputs={len(input_samples)} outputs={len(samples)}"
            )
        expected_components = 4 if path_name == "rotation" else 3
        if len(input_samples[0]) != 1 or len(samples[0]) != expected_components:
            raise RuntimeError(
                "canonical exported channel has the wrong component count: "
                f"{node_name}.{path_name} inputComponents={len(input_samples[0])} "
                f"outputComponents={len(samples[0])} expectedOutputComponents={expected_components}"
            )
        input_time = float(input_samples[0][0])
        if not math.isfinite(input_time):
            raise RuntimeError(
                f"canonical exported channel has a non-finite sample time: "
                f"{node_name}.{path_name} time={input_time}"
            )
        exported_sample_times.append((f"{node_name}.{path_name}", input_time))
        if any(not math.isfinite(float(value)) for value in samples[0]):
            raise RuntimeError(
                f"canonical exported channel has non-finite output values: {node_name}.{path_name}"
            )
        values = [round(float(value), 8) for value in samples[0]]
        if path_name == "rotation" and node_name in AUTHORED_BONE_NAMES:
            if node_name in bones:
                raise RuntimeError(f"duplicate canonical rotation channel: {node_name}")
            bones[node_name] = values
            extracted_channels.append(f"{node_name}.rotation")
        elif path_name == "translation" and node_name == "Hips":
            if node_name in positions:
                raise RuntimeError(f"duplicate canonical translation channel: {node_name}")
            positions[node_name] = values
            extracted_channels.append(f"{node_name}.translation")
    missing_rotations = sorted(set(AUTHORED_BONE_NAMES) - set(bones))
    if missing_rotations or "Hips" not in positions:
        raise RuntimeError(
            "exact authored GLB is missing canonical channels: "
            f"rotations={missing_rotations}, hipsTranslation={'Hips' not in positions}"
        )
    exported_time_values = [value for _channel, value in exported_sample_times]
    exported_input_time = exported_time_values[0]
    if max(exported_time_values) - min(exported_time_values) > 0.000001:
        raise RuntimeError(
            "canonical exported channels do not share one authored sample time: "
            + ", ".join(
                f"{channel}={value:.9f}"
                for channel, value in exported_sample_times
            )
        )
    frame = {
        "label": "start",
        "time": 0,
        "positions": positions,
        "sabreLocal": authored_sabre_local(calibration),
        "bones": bones,
    }
    pose_sha = sha256_bytes(canonical_frame_bytes(frame))
    return frame, {
        "authority": {
            "bonesAndHips": "authored_frame_zero.glb CrimsonCombatReadyFrameZero animation channels",
            "sabreLocal": "newly baked calibration and weapon seating solve; the character GLB contains no sword transform",
        },
        "animation": action_name,
        "exportedInputTimeSeconds": round(exported_input_time, 9),
        "canonicalCandidateTimeSeconds": 0,
        "timeNormalization": "the sole consistent Blender-authored sample is represented as candidate frame-zero time 0",
        "canonicalSamplesPerChannel": 1,
        "channelCount": len(extracted_channels),
        "channels": sorted(extracted_channels),
        "poseSha256": pose_sha,
        "glbSha256": sha256(path),
    }


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
        for bone, position in (frame.get("positions") or {}).items():
            node_frames.setdefault(bone, {}).setdefault("translation", {})[label] = position
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


def delete_imported_objects_and_actions(
    objects: list[bpy.types.Object],
    actions_before: set,
) -> None:
    for obj in objects:
        bpy.data.objects.remove(obj, do_unlink=True)
    for action in list(bpy.data.actions):
        if action not in actions_before:
            bpy.data.actions.remove(action)
    bpy.context.view_layer.update()


def freeze_armature_pose_and_remove_new_actions(
    armature: bpy.types.Object,
    actions_before: set,
) -> None:
    bases = {bone.name: bone.matrix_basis.copy() for bone in armature.pose.bones}
    armature.animation_data_clear()
    for bone_name, basis in bases.items():
        armature.pose.bones[bone_name].matrix_basis = basis
    for action in list(bpy.data.actions):
        if action not in actions_before:
            bpy.data.actions.remove(action)
    bpy.context.view_layer.update()


def top_level(objects: list[bpy.types.Object]) -> list[bpy.types.Object]:
    owned = set(objects)
    return [obj for obj in objects if obj.parent not in owned]


def create_stage_root(objects: list[bpy.types.Object], name: str) -> bpy.types.Object:
    """Parent imported roots under one non-animated transform that survives frame evaluation."""
    stage = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(stage)
    for obj in top_level(objects):
        world = obj.matrix_world.copy()
        obj.parent = stage
        obj.matrix_world = world
    bpy.context.view_layer.update()
    return stage


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
    scale = transform.get("scale") or [1, 1, 1]
    translation = Matrix.Translation(Vector(position))
    quaternion = transform.get("quaternion")
    if quaternion:
        rotation = Quaternion((
            float(quaternion[3]),
            float(quaternion[0]),
            float(quaternion[1]),
            float(quaternion[2]),
        )).normalized().to_matrix().to_4x4()
    else:
        rotation_deg = transform.get("rotationDeg") or [0, 0, 0]
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
    bpy.context.view_layer.update()


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
    for bone_name, position in (frame.get("positions") or {}).items():
        bone = armature.pose.bones.get(bone_name)
        if not bone:
            missing.append(bone_name)
            continue
        bone.location = tuple(float(value) for value in position)
    for bone_name, quat in (frame.get("bones") or {}).items():
        if not apply_bone_quaternion(armature, bone_name, quat):
            missing.append(bone_name)
    if missing:
        raise RuntimeError(f"Crimson Blender armature missing candidate bones: {missing[:8]}")
    bpy.context.view_layer.update()


def validate_requested_candidate(candidate: dict, requested_id: str) -> dict:
    if candidate.get("id") != requested_id:
        raise RuntimeError(
            f"comparison candidate mismatch: expected {requested_id}, got {candidate.get('id')}"
        )
    frame = next(
        (entry for entry in candidate.get("frames", []) if entry.get("label") == "start"),
        None,
    )
    if not frame:
        raise RuntimeError(f"requested candidate {requested_id} has no start frame")
    canonical = canonical_frame(frame)
    if not canonical["bones"]:
        raise RuntimeError(f"requested candidate {requested_id} start frame has no bones")
    return canonical


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
    result = {}
    for name in AUTHORED_BONE_NAMES:
        bone = armature.pose.bones.get(name)
        if not bone:
            continue
        quaternion = bone.matrix_basis.to_quaternion().normalized()
        result[name] = [round(quaternion.x, 8), round(quaternion.y, 8), round(quaternion.z, 8), round(quaternion.w, 8)]
    return result


def export_authored_positions(armature: bpy.types.Object) -> dict[str, list[float]]:
    """Export keyed local translations without laundering tiny rotation noise into positions."""
    result = {}
    for name in ["Hips"]:
        bone = armature.pose.bones.get(name)
        if not bone:
            continue
        translation = bone.matrix_basis.to_translation()
        result[name] = [round(value, 8) for value in translation]
    return result


def authored_sabre_local(calibration: dict) -> dict:
    transform = calibration["swordLocal"]
    quaternion = Euler(
        tuple(math.radians(value) for value in transform["rotationDeg"]),
        "XYZ",
    ).to_quaternion().normalized()
    return {
        "position": [round(float(value), 8) for value in transform["position"]],
        "quaternion": [
            round(quaternion.x, 8),
            round(quaternion.y, 8),
            round(quaternion.z, 8),
            round(quaternion.w, 8),
        ],
        "scale": [round(float(value), 8) for value in transform["scale"]],
    }


def canonical_frame(frame: dict) -> dict:
    """Return the exact payload whose bytes define one authored pose."""
    return {
        "label": frame.get("label"),
        "time": frame.get("time"),
        "positions": frame.get("positions") or {},
        "sabreLocal": frame.get("sabreLocal") or {},
        "bones": frame.get("bones") or {},
    }


def canonical_frame_bytes(frame: dict) -> bytes:
    return json.dumps(
        canonical_frame(frame),
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")


def validate_protected_body_baseline(baseline: dict) -> None:
    """Reject any baseline that weakens the exact accepted-body lock."""
    if baseline.get("schema") != "pose-lab-v2-crimson-frame-zero-protected-baseline-v1":
        raise RuntimeError(
            f"unexpected protected-body baseline schema: {baseline.get('schema')}"
        )
    if baseline.get("authoredGlbSha256") != REJECTED_480_AUTHORED_GLB_SHA256:
        raise RuntimeError(
            "protected-body baseline is not bound to the canonical rejected-480 GLB: "
            f"got {baseline.get('authoredGlbSha256')}"
        )
    positions = baseline.get("positions")
    bones = baseline.get("bones")
    if not isinstance(positions, dict) or set(positions) != PROTECTED_BODY_POSITION_NAMES:
        raise RuntimeError(
            "protected-body baseline position keys must be exact: "
            f"got={sorted(positions) if isinstance(positions, dict) else positions} "
            f"expected={sorted(PROTECTED_BODY_POSITION_NAMES)}"
        )
    if not isinstance(bones, dict) or set(bones) != PROTECTED_BODY_BONE_NAMES:
        raise RuntimeError(
            "protected-body baseline bone keys must be exact: "
            f"got={sorted(bones) if isinstance(bones, dict) else bones} "
            f"expected={sorted(PROTECTED_BODY_BONE_NAMES)}"
        )
    for channel, values, component_count in [
        *((f"{name}.translation", positions[name], 3) for name in sorted(positions)),
        *((f"{name}.rotation", bones[name], 4) for name in sorted(bones)),
    ]:
        valid = (
            isinstance(values, list)
            and len(values) == component_count
            and all(
                isinstance(value, (int, float))
                and not isinstance(value, bool)
                and math.isfinite(float(value))
                for value in values
            )
        )
        if not valid:
            raise RuntimeError(
                f"protected-body baseline channel {channel} must contain "
                f"{component_count} finite numeric components: {values}"
            )


def validate_protected_body_against_rejected_frame(baseline: dict, rejected_frame: dict) -> None:
    """Bind the separate lock file to the runtime-validated exact rejected frame."""
    expected_positions = {
        name: rejected_frame.get("positions", {}).get(name)
        for name in sorted(PROTECTED_BODY_POSITION_NAMES)
    }
    expected_bones = {
        name: rejected_frame.get("bones", {}).get(name)
        for name in sorted(PROTECTED_BODY_BONE_NAMES)
    }
    if baseline.get("positions") != expected_positions or baseline.get("bones") != expected_bones:
        raise RuntimeError(
            "protected-body baseline values do not exactly match the runtime-validated rejected-480 frame"
        )


def protected_body_parity_report(frame: dict, baseline: dict) -> dict:
    """Prove the new arm pass did not move the canonical center or lower body."""
    position_tolerance = PROTECTED_BODY_EXPORT_POSITION_TOLERANCE
    quaternion_tolerance = PROTECTED_BODY_EXPORT_QUATERNION_TOLERANCE
    position_reports = {}
    quaternion_reports = {}
    failures = []

    for name, expected in baseline.get("positions", {}).items():
        actual = (frame.get("positions") or {}).get(name)
        delta = None
        if actual is not None and len(actual) == len(expected):
            delta = max(abs(float(left) - float(right)) for left, right in zip(actual, expected))
        passed = delta is not None and delta <= position_tolerance
        position_reports[name] = {
            "baseline": expected,
            "generated": actual,
            "maxAbsDelta": round(delta, 9) if delta is not None else None,
            "status": "PASS" if passed else "FAIL",
        }
        if not passed:
            failures.append({
                "channel": f"{name}.translation",
                "actual": position_reports[name],
                "expected": f"maxAbsDelta <= {position_tolerance}",
            })

    for name, expected in baseline.get("bones", {}).items():
        actual = (frame.get("bones") or {}).get(name)
        delta = None
        if actual is not None and len(actual) == len(expected):
            same_sign = max(
                abs(float(left) - float(right))
                for left, right in zip(actual, expected)
            )
            opposite_sign = max(
                abs(float(left) + float(right))
                for left, right in zip(actual, expected)
            )
            delta = min(same_sign, opposite_sign)
        passed = delta is not None and delta <= quaternion_tolerance
        quaternion_reports[name] = {
            "baseline": expected,
            "generated": actual,
            "signInvariantMaxComponentDelta": round(delta, 9) if delta is not None else None,
            "status": "PASS" if passed else "FAIL",
        }
        if not passed:
            failures.append({
                "channel": f"{name}.rotation",
                "actual": quaternion_reports[name],
                "expected": f"signInvariantMaxComponentDelta <= {quaternion_tolerance}",
            })

    position_deltas = [
        report["maxAbsDelta"]
        for report in position_reports.values()
        if report["maxAbsDelta"] is not None
    ]
    quaternion_deltas = [
        report["signInvariantMaxComponentDelta"]
        for report in quaternion_reports.values()
        if report["signInvariantMaxComponentDelta"] is not None
    ]
    return {
        "status": "FAIL" if failures else "PASS",
        "baseline": {
            "path": str(PROTECTED_BODY_BASELINE_JSON.relative_to(ROOT)),
            "sha256": sha256(PROTECTED_BODY_BASELINE_JSON),
            "sourceCommit": baseline.get("sourceCommit"),
            "authoredGlbSha256": baseline.get("authoredGlbSha256"),
            "contract": baseline.get("protectedContract"),
        },
        "tolerances": {
            "positionMaxAbs": position_tolerance,
            "quaternionSignInvariantMaxComponent": quaternion_tolerance,
        },
        "maxPositionDelta": max(position_deltas, default=None),
        "maxQuaternionDelta": max(quaternion_deltas, default=None),
        "positions": position_reports,
        "bones": quaternion_reports,
        "failures": failures,
    }


def pose_basis_snapshot(armature: bpy.types.Object, names: list[str]) -> dict[str, list[float]]:
    snapshot = {}
    for name in names:
        bone = armature.pose.bones.get(name)
        if bone:
            snapshot[name] = [round(float(value), 12) for row in bone.matrix_basis for value in row]
    return snapshot


def pose_basis_lock_report(armature: bpy.types.Object, expected: dict[str, list[float]], stage: str) -> dict:
    actual = pose_basis_snapshot(armature, list(expected))
    deltas = {
        name: max(abs(before - after) for before, after in zip(values, actual.get(name, [])))
        if len(actual.get(name, [])) == len(values)
        else float("inf")
        for name, values in expected.items()
    }
    maximum = max(deltas.values(), default=0.0)
    expected_bytes = json.dumps(expected, sort_keys=True, separators=(",", ":")).encode("utf-8")
    actual_bytes = json.dumps(actual, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return {
        "stage": stage,
        "bones": list(expected),
        "snapshotSha256": sha256_bytes(expected_bytes),
        "actualSha256": sha256_bytes(actual_bytes),
        "maxAbsBasisDelta": round(maximum, 12),
        "unchanged": maximum <= PROTECTED_BODY_RUNTIME_BASIS_TOLERANCE,
        "tolerance": PROTECTED_BODY_RUNTIME_BASIS_TOLERANCE,
    }


def arm_landmarks(armature: bpy.types.Object) -> dict[str, list[float]]:
    names = [
        "LeftArm", "LeftForeArm", "LeftHand",
        "RightArm", "RightForeArm", "RightHand",
        "neck", "Head",
    ]
    return {
        name: [round(value, 6) for value in find_pose_bone_world(armature, name).translation]
        for name in names
        if armature.pose.bones.get(name)
    }


def arm_landmark_delta(before: dict[str, list[float]], after: dict[str, list[float]], body_scale: float) -> dict:
    required_thresholds = {
        "LeftHand": 0.10,
        "RightHand": 0.10,
        "LeftForeArm": 0.08,
        "RightForeArm": 0.08,
    }
    landmarks = {}
    for name in sorted(set(before) & set(after)):
        delta = (Vector(after[name]) - Vector(before[name])).length
        delta_body_scale = delta / max(body_scale, 0.000001)
        required_threshold = required_thresholds.get(name)
        landmarks[name] = {
            "committedRejectedWorld": before[name],
            "authoredWorld": after[name],
            "deltaWorld": round(delta, 6),
            "deltaBodyScale": round(delta_body_scale, 6),
            "requiredThresholdBodyScale": required_threshold,
            "status": (
                "PASS"
                if required_threshold is None or delta_body_scale >= required_threshold
                else "FAIL"
            ),
        }
    required = {}
    for name, threshold in required_thresholds.items():
        report = landmarks.get(name)
        passed = report is not None and report["deltaBodyScale"] >= threshold
        required[name] = {
            "role": "wrist" if name.endswith("Hand") else "elbow/forearm head",
            "thresholdBodyScale": threshold,
            "deltaBodyScale": report["deltaBodyScale"] if report else None,
            "status": "PASS" if passed else "FAIL",
        }
    materially_different = all(
        report["status"] == "PASS"
        for report in required.values()
    )
    return {
        "bodyScale": round(body_scale, 6),
        "landmarks": landmarks,
        "requiredLandmarks": required,
        "materiallyDifferent": materially_different,
    }


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


def project_elbow_to_two_bone_circle(
    shoulder: Vector,
    requested_wrist: Vector,
    authored_elbow_hint: Vector,
    upper_length: float,
    lower_length: float,
) -> tuple[Vector, Vector, dict]:
    """Project an authored hint onto the exact elbow circle for a reachable wrist."""
    shoulder_to_wrist = requested_wrist - shoulder
    requested_distance = shoulder_to_wrist.length
    if requested_distance < 0.000001:
        shoulder_to_wrist = Vector((0.0, -1.0, 0.0))
        requested_distance = 1.0
    axis = shoulder_to_wrist.normalized()
    minimum = abs(upper_length - lower_length) + 0.00001
    maximum = upper_length + lower_length - 0.00001
    target_distance = min(max(requested_distance, minimum), maximum)
    target_wrist = shoulder + axis * target_distance
    circle_offset = (
        upper_length * upper_length
        - lower_length * lower_length
        + target_distance * target_distance
    ) / (2.0 * target_distance)
    circle_radius = math.sqrt(max(0.0, upper_length * upper_length - circle_offset * circle_offset))
    circle_center = shoulder + axis * circle_offset
    hint_radial = authored_elbow_hint - circle_center
    hint_radial -= axis * hint_radial.dot(axis)
    if hint_radial.length < 0.000001:
        fallback = axis.cross(Vector((0.0, 0.0, 1.0)))
        if fallback.length < 0.000001:
            fallback = axis.cross(Vector((1.0, 0.0, 0.0)))
        hint_radial = fallback
    elbow = circle_center + hint_radial.normalized() * circle_radius
    projection = {
        "requestedWrist": [round(value, 6) for value in requested_wrist],
        "reachableWrist": [round(value, 6) for value in target_wrist],
        "authoredElbowHint": [round(value, 6) for value in authored_elbow_hint],
        "projectedElbow": [round(value, 6) for value in elbow],
        "upperLength": round(upper_length, 6),
        "lowerLength": round(lower_length, 6),
        "requestedReach": round(requested_distance, 6),
        "reachableRange": [round(minimum, 6), round(maximum, 6)],
        "wristClampDistance": round((target_wrist - requested_wrist).length, 6),
        "circleCenter": [round(value, 6) for value in circle_center],
        "circleRadius": round(circle_radius, 6),
        "elbowUpperLengthError": round(abs((elbow - shoulder).length - upper_length), 9),
        "elbowLowerLengthError": round(abs((target_wrist - elbow).length - lower_length), 9),
    }
    return elbow, target_wrist, projection


def solve_two_bone_elbow_wrist_pin(
    armature: bpy.types.Object,
    chain: list[str],
    requested_wrist: Vector,
    authored_elbow_hint: Vector,
) -> dict:
    """Solve direction once per segment after projecting a physically valid elbow."""
    upper_name, lower_name, end_name = chain
    shoulder = find_pose_bone_world(armature, upper_name).translation
    initial_elbow = find_pose_bone_world(armature, lower_name).translation
    initial_wrist = find_pose_bone_world(armature, end_name).translation
    upper_length = (initial_elbow - shoulder).length
    lower_length = (initial_wrist - initial_elbow).length
    target_elbow, target_wrist, projection = project_elbow_to_two_bone_circle(
        shoulder,
        requested_wrist,
        authored_elbow_hint,
        upper_length,
        lower_length,
    )

    rotate_pose_bone_world(
        armature,
        upper_name,
        initial_elbow - shoulder,
        target_elbow - shoulder,
    )
    actual_elbow = find_pose_bone_world(armature, lower_name).translation
    wrist_after_upper = find_pose_bone_world(armature, end_name).translation
    rotate_pose_bone_world(
        armature,
        lower_name,
        wrist_after_upper - actual_elbow,
        target_wrist - actual_elbow,
    )
    actual_elbow = find_pose_bone_world(armature, lower_name).translation
    actual_wrist = find_pose_bone_world(armature, end_name).translation
    return {
        "chain": chain,
        "projection": projection,
        "targetElbow": [round(value, 6) for value in target_elbow],
        "actualElbow": [round(value, 6) for value in actual_elbow],
        "targetWrist": [round(value, 6) for value in target_wrist],
        "actualWrist": [round(value, 6) for value in actual_wrist],
        "elbowPinError": round((actual_elbow - target_elbow).length, 9),
        "wristPinError": round((actual_wrist - target_wrist).length, 9),
        "requestedWristError": round((actual_wrist - requested_wrist).length, 9),
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
    # chosen for Crimson; it does not derive targets from Vanguard. The incoming
    # armature is already frozen at the exact rejected-480 GLB pose. Capture the
    # complete accepted body before touching only the two arm chains.
    protected_body_names = sorted(PROTECTED_BODY_BONE_NAMES | {"LeftToeBase", "RightToeBase"})
    protected_body_basis = pose_basis_snapshot(target_armature, protected_body_names)

    authored_arm_names = [
        "LeftShoulder", "LeftArm", "LeftForeArm", "LeftHand",
        "RightShoulder", "RightArm", "RightForeArm", "RightHand",
    ]
    for bone_name in authored_arm_names:
        bone = target_armature.pose.bones.get(bone_name)
        if not bone:
            raise RuntimeError(f"missing target arm bone {bone_name}")
        bone.matrix_basis.identity()
    bpy.context.view_layer.update()

    # The rejected candidate placed both hands above the neck and then tried to
    # repair the silhouette with wrist roll. These targets put the grip cluster
    # below and viewer-left of the face while the accepted body remains frozen.
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
    neck = find_pose_bone_world(target_armature, "neck").translation
    # Keep the entire two-hand guard unmistakably below the face.  The first
    # Mesh-hull review proved that the proxy-era target still put both visible
    # gauntlets at helmet height in the right profile. Lower and extend the
    # whole guard cluster; never weaken the silhouette-clearance thresholds.
    right_hand_target = neck + Vector((
        -0.48 * shoulder_span,
        -0.34 * torso_height,
        -0.52 * torso_height,
    ))
    # The support hand occupies the pommel side of the same grip line. This is
    # an authored body-scale relationship, not a second independent hand pose.
    left_hand_target = right_hand_target + Vector((
        -0.18 * shoulder_span,
        0.025 * torso_height,
        -0.04 * torso_height,
    ))
    right_shoulder = find_pose_bone_world(target_armature, "RightArm").translation
    left_shoulder = find_pose_bone_world(target_armature, "LeftArm").translation
    right_elbow_hint = right_shoulder + Vector((-0.25 * shoulder_span, -0.14 * torso_height, -0.46 * torso_height))
    left_elbow_hint = left_shoulder + Vector((-0.15 * shoulder_span, 0.02 * torso_height, -0.42 * torso_height))
    arm_reports = [
        solve_two_bone_elbow_wrist_pin(
            target_armature,
            ["RightArm", "RightForeArm", "RightHand"],
            right_hand_target,
            right_elbow_hint,
        ),
        solve_two_bone_elbow_wrist_pin(
            target_armature,
            ["LeftArm", "LeftForeArm", "LeftHand"],
            left_hand_target,
            left_elbow_hint,
        ),
    ]

    # These are applied only after the empty-handed checkpoint is captured.
    # Wrist roll is presentation, never a substitute for elbow/wrist occupancy.
    hand_rotations = [
        ("RightHand", (0, 0, 1), 5.0),
        ("RightHand", (0, 1, 0), -8.0),
        ("LeftHand", (0, 0, 1), -6.0),
        ("LeftHand", (0, 1, 0), 5.0),
    ]

    author_failures = []
    pin_tolerance = max(0.00001, torso_height * 0.002)
    for report in arm_reports:
        if report["elbowPinError"] > pin_tolerance or report["wristPinError"] > pin_tolerance:
            author_failures.append({
                "code": "AUTHOR_ARM_PIN_ERROR",
                "chain": report["chain"],
                "actual": {
                    "elbow": report["elbowPinError"],
                    "wrist": report["wristPinError"],
                },
                "expected": f"both <= {pin_tolerance:.9f}",
            })
        if report["projection"]["wristClampDistance"] > torso_height * 0.02:
            author_failures.append({
                "code": "AUTHOR_WRIST_TARGET_OUTSIDE_REACH",
                "chain": report["chain"],
                "actual": report["projection"]["wristClampDistance"],
                "expected": f"<= {torso_height * 0.02:.9f}",
            })

    empty_handed_lock = pose_basis_lock_report(
        target_armature,
        protected_body_basis,
        "after-arm-pin-before-wrist-roll",
    )
    if not empty_handed_lock["unchanged"]:
        author_failures.append({
            "code": "AUTHOR_PROTECTED_BODY_BASIS_CHANGED_DURING_ARM_PIN",
            "actual": empty_handed_lock,
            "expected": "exact accepted center, head, and lower-body basis lock",
        })

    return {
        "method": "crimson-native-two-bone-elbow-circle-projection-plus-exact-pins",
        "sourceAuthority": "Vanguard pixels only; source armature and logical mapping are deliberately unread",
        "compositionIntent": {
            "forceLine": "rear foot through turned pelvis into an offset ready guard",
            "stance": "depth-staggered, loaded, and narrower in screen width",
            "guard": "materially off-center hand cluster below the face with unequal low elbows",
        },
        "crossRigPoseInputs": [],
        "bodySeed": {
            "candidateId": REJECTED_480_CANDIDATE_ID,
            "poseSha256": REJECTED_480_POSE_SHA256,
            "authoredGlbSha256": REJECTED_480_AUTHORED_GLB_SHA256,
            "protectedBones": protected_body_names,
            "contract": "exact imported/frozen 480 body; shoulders and arms only are reset and authored",
        },
        "armIk": arm_reports,
        "bodyScale": {
            "shoulderSpan": round(shoulder_span, 6),
            "torsoHeight": round(torso_height, 6),
        },
        "emptyHandedCheckpoint": {
            "stage": "after-elbow-wrist-pin-before-wrist-roll-and-sword",
            "armLandmarks": arm_landmarks(target_armature),
            "protectedBodyLock": empty_handed_lock,
        },
        "handRotations": [
            {"bone": bone, "axisWorld": list(axis), "degrees": degrees}
            for bone, axis, degrees in hand_rotations
        ],
        "weaponContract": "Empty-handed occupancy first; then wrist roll, blade direction, baked right-palm hilt seating, and left-hand hilt-pommel ownership",
        "keyframeContract": "one authored Crimson pose at frame 1",
        "authorFailures": author_failures,
        "_protectedBodyBasis": protected_body_basis,
    }


def apply_authored_hand_rotations(armature: bpy.types.Object, author_report: dict) -> None:
    for rotation in author_report["handRotations"]:
        rotate_pose_bone_world_axis(
            armature,
            rotation["bone"],
            Vector(rotation["axisWorld"]),
            rotation["degrees"],
        )


def author_crimson_blade_direction(
    target_armature: bpy.types.Object,
    sword_objects: list[bpy.types.Object],
    sword_initial: dict[str, Matrix],
    calibration: dict,
) -> dict:
    # This threat line is visually authored for Crimson. It is not measured or
    # imported from Vanguard. The hand is rotated as an FK control until the
    # actual Arborblade mesh follows this chosen direction.
    # Keep meaningful depth in the threat line so profile views do not collapse
    # it into a vertical spike through the helmet. The shallow rise clears the
    # face in front/three-quarter views without dropping through the torso.
    desired = Vector((0.875, -0.470, 0.110)).normalized()
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


def weighted_bone_min_z(objects: list[bpy.types.Object], bone_names: list[str]) -> float:
    """Return the visible mesh floor carried by named bones, excluding unrelated asset meshes."""
    wanted = {canon_bone_name(name) for name in bone_names if name}
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
                    points.append((evaluated.matrix_world @ vertex.co).z)
        finally:
            evaluated.to_mesh_clear()
    if points:
        return min(points)
    raise RuntimeError(f"no weighted mesh vertices found for ground bones: {sorted(wanted)}")


def nearby_bone_mesh_min_z(
    objects: list[bpy.types.Object],
    armature: bpy.types.Object,
    bone_names: list[str],
    radius: float = 0.28,
) -> float:
    """Ground unweighted source rigs from visible vertices local to mapped foot bones."""
    origins = [
        find_pose_bone_world(armature, name).translation
        for name in bone_names
        if name and armature.pose.bones.get(name)
    ]
    if not origins:
        raise RuntimeError(f"source armature has none of the mapped ground bones: {bone_names}")
    points = []
    depsgraph = bpy.context.evaluated_depsgraph_get()
    for obj in objects:
        if obj.type != "MESH":
            continue
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        try:
            for vertex in mesh.vertices:
                world = evaluated.matrix_world @ vertex.co
                if min((world - origin).length for origin in origins) <= radius:
                    points.append(world.z)
        finally:
            evaluated.to_mesh_clear()
    if not points:
        raise RuntimeError(f"no visible mesh vertices found near mapped ground bones: {bone_names}")
    return min(points)


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


def hand_mesh_landmark(
    objects: list[bpy.types.Object],
    armature: bpy.types.Object,
    bone_name: str,
    torso_height: float,
) -> tuple[Vector, list[Vector], dict]:
    """Return the evaluated center of visible geometry carried by one Hand bone."""
    if bone_name not in {"LeftHand", "RightHand"}:
        raise RuntimeError(f"hand mesh landmark requires LeftHand or RightHand, got {bone_name}")
    side = "Left" if bone_name.startswith("Left") else "Right"
    wanted = canon_bone_name(bone_name)
    excluded = canon_bone_name(f"{side}ForeArm")
    samples = []
    depsgraph = bpy.context.evaluated_depsgraph_get()
    for obj in objects:
        if obj.type != "MESH":
            continue
        group_indices = {
            group.index
            for group in obj.vertex_groups
            if canon_bone_name(group.name) == wanted
        }
        excluded_group_indices = {
            group.index
            for group in obj.vertex_groups
            if canon_bone_name(group.name) == excluded
        }
        if not group_indices:
            continue
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh(preserve_all_data_layers=True, depsgraph=depsgraph)
        try:
            for vertex in mesh.vertices:
                weight = sum(
                    group.weight
                    for group in vertex.groups
                    if group.group in group_indices
                )
                excluded_weight = sum(
                    group.weight
                    for group in vertex.groups
                    if group.group in excluded_group_indices
                )
                if (
                    weight >= HAND_MESH_WEIGHT_MINIMUM
                    and excluded_weight <= HAND_MESH_FOREARM_WEIGHT_MAXIMUM
                ):
                    samples.append((
                        evaluated.matrix_world @ vertex.co,
                        weight,
                        excluded_weight,
                    ))
        finally:
            evaluated.to_mesh_clear()
    if len(samples) < HAND_MESH_MINIMUM_VERTICES:
        raise RuntimeError(
            f"{bone_name} visible mesh landmark has {len(samples)} weighted vertices; "
            f"expected at least {HAND_MESH_MINIMUM_VERTICES} at weight "
            f">= {HAND_MESH_WEIGHT_MINIMUM}"
        )
    mean_weight = sum(weight for _point, weight, _excluded in samples) / len(samples)
    if mean_weight < HAND_MESH_MEAN_WEIGHT_MINIMUM:
        raise RuntimeError(
            f"{bone_name} visible mesh landmark mean Hand weight is too weak: "
            f"{mean_weight:.6f} < {HAND_MESH_MEAN_WEIGHT_MINIMUM:.6f}"
        )
    total_weight = sum(weight for _point, weight, _excluded in samples)
    landmark = sum(
        (point * weight for point, weight, _excluded in samples),
        Vector((0, 0, 0)),
    ) / total_weight
    wrist = find_pose_bone_world(armature, bone_name).translation
    wrist_distance = (landmark - wrist).length
    minimum_distance = torso_height * HAND_LANDMARK_MIN_TORSO_FRACTION
    maximum_distance = torso_height * HAND_LANDMARK_MAX_TORSO_FRACTION
    if wrist_distance < minimum_distance or wrist_distance > maximum_distance:
        raise RuntimeError(
            f"{bone_name} visible mesh landmark has an implausible wrist distance: "
            f"{wrist_distance:.6f} not in [{minimum_distance:.6f}, {maximum_distance:.6f}]"
        )
    return landmark, [point for point, _weight, _excluded in samples], {
        "bone": bone_name,
        "definition": (
            "weighted centroid of evaluated visible mesh vertices influenced by "
            f"{bone_name}; imported Hand tail excluded"
        ),
        "minimumVertexWeight": HAND_MESH_WEIGHT_MINIMUM,
        "maximumForeArmWeight": HAND_MESH_FOREARM_WEIGHT_MAXIMUM,
        "meanHandWeight": round(mean_weight, 6),
        "maximumObservedForeArmWeight": round(
            max(excluded_weight for _point, _weight, excluded_weight in samples),
            6,
        ),
        "vertexCount": len(samples),
        "world": [round(value, 6) for value in landmark],
        "wristWorld": [round(value, 6) for value in wrist],
        "wristDistanceWorld": round(wrist_distance, 6),
        "wristDistanceBodyScale": round(
            wrist_distance / max(torso_height, 0.000001),
            6,
        ),
    }


def dominant_head_mesh_points(objects: list[bpy.types.Object]) -> list[Vector]:
    wanted = canon_bone_name("Head")
    points = []
    weights = []
    depsgraph = bpy.context.evaluated_depsgraph_get()
    for obj in objects:
        if obj.type != "MESH":
            continue
        group_indices = {
            group.index
            for group in obj.vertex_groups
            if canon_bone_name(group.name) == wanted
        }
        if not group_indices:
            continue
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh(preserve_all_data_layers=True, depsgraph=depsgraph)
        try:
            for vertex in mesh.vertices:
                weight = sum(
                    group.weight
                    for group in vertex.groups
                    if group.group in group_indices
                )
                if weight >= HEAD_MESH_WEIGHT_MINIMUM:
                    points.append(evaluated.matrix_world @ vertex.co)
                    weights.append(weight)
        finally:
            evaluated.to_mesh_clear()
    if len(points) < HEAD_MESH_MINIMUM_VERTICES:
        raise RuntimeError(
            f"visible Head mesh cloud has {len(points)} weighted vertices; "
            f"expected at least {HEAD_MESH_MINIMUM_VERTICES} at weight "
            f">= {HEAD_MESH_WEIGHT_MINIMUM}"
        )
    return points


def percentile(values: list[float], fraction: float) -> float:
    if not values:
        raise RuntimeError("cannot compute a percentile of an empty collection")
    ordered = sorted(values)
    position = max(0.0, min(1.0, fraction)) * (len(ordered) - 1)
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return ordered[lower]
    blend = position - lower
    return ordered[lower] * (1.0 - blend) + ordered[upper] * blend


def hand_axis_extents(points: list[Vector], center: Vector, direction: Vector) -> tuple[float, float]:
    projections = [(point - center).dot(direction) for point in points]
    return percentile(projections, 0.05), percentile(projections, 0.95)


def normalized_sword_crossguard_points(calibration: dict) -> tuple[list[Vector], dict]:
    """Select crossguard vertices from the normalized sword's radial geometry."""
    gltf, bin_chunk = parse_glb(SWORD_GLB)
    points = []
    for mesh in gltf.get("meshes", []):
        for primitive in mesh.get("primitives", []):
            accessor_index = primitive.get("attributes", {}).get("POSITION")
            if accessor_index is not None:
                points.extend(Vector(values[:3]) for values in read_accessor_values(
                    gltf,
                    bin_chunk,
                    accessor_index,
                ))
    if len(points) < 100:
        raise RuntimeError(f"normalized sword mesh has too few vertices: {len(points)}")
    hilt_local = Vector(calibration.get("hiltLocalPoint") or [0, 0, 0])
    pommel_local = Vector(calibration.get("pommelLocalPoint") or [0, 0, -0.35])
    local_handle = pommel_local - hilt_local
    local_handle_length = local_handle.length
    if local_handle_length < 0.000001:
        raise RuntimeError("degenerate local hilt-pommel span cannot select the crossguard")
    handle_direction = local_handle.normalized()
    radial_distances = []
    for point in points:
        offset = point - hilt_local
        axial = offset.dot(handle_direction)
        radial_distances.append((offset - handle_direction * axial).length)
    maximum_radial = max(radial_distances)
    radial_threshold = maximum_radial * 0.45
    crossguard_points = [
        point
        for point, radial in zip(points, radial_distances)
        if radial >= radial_threshold
    ]
    if len(crossguard_points) < 50:
        raise RuntimeError(
            f"crossguard radial selection is too small: {len(crossguard_points)} vertices"
        )
    return crossguard_points, {
        "meshVertexCount": len(points),
        "crossguardVertexCount": len(crossguard_points),
        "maximumRadialLocal": round(maximum_radial, 8),
        "radialThresholdLocal": round(radial_threshold, 8),
    }


def sword_crossguard_geometry(calibration: dict, handle_length_world: float) -> dict:
    """Measure the crossguard's pommel-side face from the normalized sword mesh."""
    crossguard_points, selection = normalized_sword_crossguard_points(calibration)
    hilt_local = Vector(calibration.get("hiltLocalPoint") or [0, 0, 0])
    pommel_local = Vector(calibration.get("pommelLocalPoint") or [0, 0, -0.35])
    local_handle = pommel_local - hilt_local
    local_handle_length = local_handle.length
    if local_handle_length < 0.000001 or handle_length_world < 0.000001:
        raise RuntimeError("degenerate hilt-pommel span cannot measure the crossguard")
    handle_direction = local_handle.normalized()
    local_extent = max(
        (point - hilt_local).dot(handle_direction)
        for point in crossguard_points
    )
    if local_extent <= 0 or local_extent >= local_handle_length * 0.25:
        raise RuntimeError(
            f"crossguard pommel extent is implausible: {local_extent:.6f} local units"
        )
    world_extent = handle_length_world * local_extent / local_handle_length
    return {
        "definition": (
            "pommel-side axial extent of normalized sword vertices at or beyond "
            "45% of maximum radial distance"
        ),
        **selection,
        "pommelExtentLocal": round(local_extent, 8),
        "pommelExtentWorld": world_extent,
        "pommelExtentHandleFraction": round(local_extent / local_handle_length, 8),
    }


def blender_point_to_browser(point: Vector) -> Vector:
    return (BLENDER_TO_BROWSER @ Vector((point.x, point.y, point.z, 1.0))).to_3d()


def weapon_world_axes(sword_socket: Matrix, calibration: dict) -> dict:
    hilt = sword_socket @ browser_vector(calibration.get("hiltLocalPoint") or [0, 0, 0])
    pommel = sword_socket @ browser_vector(
        calibration.get("pommelLocalPoint") or [0, 0, -0.35]
    )
    tip = sword_socket @ browser_vector(calibration.get("tipLocalPoint") or [0, 0, 1])
    handle = pommel - hilt
    blade = tip - hilt
    if handle.length < 0.000001 or blade.length < 0.000001:
        raise RuntimeError("weapon hilt-pommel and hilt-tip axes must be nondegenerate")
    opposition = handle.normalized().dot(blade.normalized())
    if opposition > -0.98:
        raise RuntimeError(
            f"weapon blade and handle axes are not opposed: dot={opposition:.6f} > -0.98"
        )
    return {
        "hilt": hilt,
        "pommel": pommel,
        "tip": tip,
        "handleDirection": handle.normalized(),
        "bladeDirection": blade.normalized(),
        "handleLength": handle.length,
        "bladeLength": blade.length,
        "oppositionDot": opposition,
    }


def seat_sword_hilt_at_right_palm(
    armature: bpy.types.Object,
    body_objects: list[bpy.types.Object],
    sword_objects: list[bpy.types.Object],
    sword_initial: dict[str, Matrix],
    calibration: dict,
    torso_height: float,
) -> dict:
    """Bake the handle through the visible right gauntlet with the guard outside it."""
    hand_world = find_pose_bone_world(armature, "RightHand")
    palm_anchor, palm_points, palm_evidence = hand_mesh_landmark(
        body_objects,
        armature,
        "RightHand",
        torso_height,
    )
    provisional_socket = place_crimson_sword(
        sword_objects,
        sword_initial,
        hand_world,
        calibration,
    )
    provisional_axes = weapon_world_axes(provisional_socket, calibration)
    handle_direction = provisional_axes["handleDirection"]
    handle_length = provisional_axes["handleLength"]
    blade_side_extent, pommel_side_extent = hand_axis_extents(
        palm_points,
        palm_anchor,
        handle_direction,
    )
    crossguard_geometry = sword_crossguard_geometry(calibration, handle_length)
    guard_pommel_extent = crossguard_geometry["pommelExtentWorld"]
    guard_clearance = (
        torso_height * GRIP_SURFACE_SEAT_CLEARANCE_TORSO_FRACTION
    )
    desired_hilt_world = palm_anchor + handle_direction * (
        blade_side_extent - guard_pommel_extent - guard_clearance
    )
    grip_world = hand_world @ browser_transform_matrix(calibration["saberGripLocal"])
    desired_hilt_grip_blender = grip_world.inverted() @ desired_hilt_world
    desired_hilt_grip_browser = blender_point_to_browser(desired_hilt_grip_blender)

    sword_transform = calibration["swordLocal"]
    zero_translation_transform = {
        **sword_transform,
        "position": [0.0, 0.0, 0.0],
    }
    hilt_local = Vector(calibration.get("hiltLocalPoint") or [0.0, 0.0, 0.0])
    transformed_hilt_offset = transform_matrix(zero_translation_transform) @ hilt_local
    old_position = [float(value) for value in sword_transform.get("position", [0, 0, 0])]
    new_position = desired_hilt_grip_browser - transformed_hilt_offset
    calibration["swordLocal"]["position"] = [float(value) for value in new_position]

    socket = place_crimson_sword(sword_objects, sword_initial, hand_world, calibration)
    actual_axes = weapon_world_axes(socket, calibration)
    actual_hilt = actual_axes["hilt"]
    actual_pommel = actual_axes["pommel"]
    palm_handle_error, palm_handle_parameter, palm_handle_closest = point_segment_distance_3d(
        palm_anchor,
        actual_hilt,
        actual_pommel,
    )
    actual_handle_direction = actual_axes["handleDirection"]
    actual_guard_face = actual_hilt + actual_handle_direction * guard_pommel_extent
    palm_blade_side_surface = palm_anchor + actual_handle_direction * blade_side_extent
    actual_guard_clearance = (
        palm_blade_side_surface - actual_guard_face
    ).dot(actual_handle_direction)
    return {
        "authority": "baked swordLocal translation after blade direction; character GLB has no sword transform",
        "anchorDefinition": palm_evidence["definition"],
        "palmMeshEvidence": palm_evidence,
        "palmAnchorWorld": [round(value, 6) for value in palm_anchor],
        "bladeSideMeshExtentWorld": round(blade_side_extent, 6),
        "pommelSideMeshExtentWorld": round(pommel_side_extent, 6),
        "crossguardGeometry": crossguard_geometry,
        "weaponAxisOppositionDot": round(actual_axes["oppositionDot"], 8),
        "guardClearanceWorld": round(guard_clearance, 6),
        "actualGuardClearanceWorld": round(actual_guard_clearance, 9),
        "actualGuardPommelFaceWorld": [round(value, 6) for value in actual_guard_face],
        "desiredHiltWorld": [round(value, 6) for value in desired_hilt_world],
        "actualHiltWorld": [round(value, 6) for value in actual_hilt],
        "hiltSeatErrorWorld": round((actual_hilt - desired_hilt_world).length, 9),
        "palmToHandleWorld": round(palm_handle_error, 9),
        "palmHandleParameter": round(palm_handle_parameter, 6),
        "palmClosestHandleWorld": [round(value, 6) for value in palm_handle_closest],
        "oldSwordLocalPosition": [round(value, 8) for value in old_position],
        "bakedSwordLocalPosition": [round(value, 8) for value in new_position],
    }


def point_segment_distance_3d(point: Vector, start: Vector, end: Vector) -> tuple[float, float, Vector]:
    segment = end - start
    if segment.length_squared < 0.000000000001:
        return (point - start).length, 0.0, start.copy()
    parameter = max(0.0, min(1.0, (point - start).dot(segment) / segment.length_squared))
    closest = start + segment * parameter
    return (point - closest).length, parameter, closest


def weapon_grip_contract(
    armature: bpy.types.Object,
    body_objects: list[bpy.types.Object],
    sword_socket: Matrix,
    calibration: dict,
    torso_height: float,
) -> dict:
    right_hand = find_pose_bone_world(armature, "RightHand").translation
    left_hand = find_pose_bone_world(armature, "LeftHand").translation
    right_palm, right_points, right_palm_evidence = hand_mesh_landmark(
        body_objects,
        armature,
        "RightHand",
        torso_height,
    )
    left_palm, left_points, left_palm_evidence = hand_mesh_landmark(
        body_objects,
        armature,
        "LeftHand",
        torso_height,
    )
    weapon_axes = weapon_world_axes(sword_socket, calibration)
    hilt = weapon_axes["hilt"]
    pommel = weapon_axes["pommel"]
    right_palm_error, right_palm_parameter, right_palm_closest = point_segment_distance_3d(
        right_palm,
        hilt,
        pommel,
    )
    left_palm_error, left_palm_parameter, left_palm_closest = point_segment_distance_3d(
        left_palm,
        hilt,
        pommel,
    )
    left_hand_error, left_hand_parameter, left_hand_closest = point_segment_distance_3d(
        left_hand,
        hilt,
        pommel,
    )
    handle_length = weapon_axes["handleLength"]
    handle_direction = weapon_axes["handleDirection"]
    right_blade_extent, right_pommel_extent = hand_axis_extents(
        right_points,
        right_palm,
        handle_direction,
    )
    left_blade_extent, left_pommel_extent = hand_axis_extents(
        left_points,
        left_palm,
        handle_direction,
    )
    crossguard_geometry = sword_crossguard_geometry(calibration, handle_length)
    guard_face_axis = crossguard_geometry["pommelExtentWorld"]
    right_center_axis = (right_palm - hilt).dot(handle_direction)
    left_center_axis = (left_palm - hilt).dot(handle_direction)
    guard_surface_clearance = (
        right_center_axis + right_blade_extent - guard_face_axis
    )
    inter_hand_surface_clearance = (
        left_center_axis + left_blade_extent
        - right_center_axis - right_pommel_extent
    )
    palm_separation = (left_palm - right_palm).length
    palm_axis_separation = (left_palm - right_palm).dot(handle_direction)
    thresholds = {
        "rightPalmToHandleBodyScale": 0.035,
        "leftPalmToHandleBodyScale": 0.035,
        "minimumHandleLengthBodyScale": 0.05,
        "minimumRightPalmHandleParameter": 0.03,
        "minimumGripSurfaceClearanceBodyScale": GRIP_SURFACE_CLEARANCE_TORSO_FRACTION,
        "maximumGuardSurfaceClearanceBodyScale": 0.03,
        "minimumPommelEndClearanceBodyScale": GRIP_SURFACE_CLEARANCE_TORSO_FRACTION,
        "minimumPalmSeparationBodyScale": 0.12,
    }
    failures = []
    checks = [
        (
            "rightPalmToHandle",
            right_palm_error,
            thresholds["rightPalmToHandleBodyScale"],
        ),
        (
            "leftPalmToHandle",
            left_palm_error,
            thresholds["leftPalmToHandleBodyScale"],
        ),
    ]
    for name, distance, body_threshold in checks:
        if distance > torso_height * body_threshold:
            failures.append({
                "check": name,
                "distanceWorld": round(distance, 6),
                "distanceBodyScale": round(distance / max(torso_height, 0.000001), 6),
                "expected": f"<= {body_threshold} torso-height",
            })
    if handle_length < torso_height * thresholds["minimumHandleLengthBodyScale"]:
        failures.append({
            "check": "nondegenerateHandle",
            "distanceWorld": round(handle_length, 6),
            "distanceBodyScale": round(handle_length / max(torso_height, 0.000001), 6),
            "expected": f">= {thresholds['minimumHandleLengthBodyScale']} torso-height",
        })
    if right_palm_parameter < thresholds["minimumRightPalmHandleParameter"]:
        failures.append({
            "check": "rightPalmBehindGuard",
            "handleParameter": round(right_palm_parameter, 6),
            "expected": f">= {thresholds['minimumRightPalmHandleParameter']} from hilt toward pommel",
        })
    minimum_surface_clearance = (
        torso_height * thresholds["minimumGripSurfaceClearanceBodyScale"]
    )
    if guard_surface_clearance < minimum_surface_clearance:
        failures.append({
            "check": "crossguardOutsideRightHand",
            "distanceWorld": round(guard_surface_clearance, 6),
            "distanceBodyScale": round(
                guard_surface_clearance / max(torso_height, 0.000001),
                6,
            ),
            "expected": (
                f">= {thresholds['minimumGripSurfaceClearanceBodyScale']} torso-height "
                "between the guard's pommel-side face and the right hand's blade-side surface"
            ),
        })
    if guard_surface_clearance > torso_height * thresholds["maximumGuardSurfaceClearanceBodyScale"]:
        failures.append({
            "check": "crossguardTooFarFromRightHand",
            "distanceWorld": round(guard_surface_clearance, 6),
            "distanceBodyScale": round(
                guard_surface_clearance / max(torso_height, 0.000001),
                6,
            ),
            "expected": (
                f"<= {thresholds['maximumGuardSurfaceClearanceBodyScale']} torso-height"
            ),
        })
    if inter_hand_surface_clearance < minimum_surface_clearance:
        failures.append({
            "check": "nonoverlappingHandSurfaces",
            "distanceWorld": round(inter_hand_surface_clearance, 6),
            "distanceBodyScale": round(
                inter_hand_surface_clearance / max(torso_height, 0.000001),
                6,
            ),
            "expected": (
                f">= {thresholds['minimumGripSurfaceClearanceBodyScale']} torso-height "
                "between right pommel-side and left blade-side hand surfaces"
            ),
        })
    pommel_end_clearance = handle_length - (left_center_axis + left_pommel_extent)
    if pommel_end_clearance < torso_height * thresholds["minimumPommelEndClearanceBodyScale"]:
        failures.append({
            "check": "leftHandInsidePommelEnd",
            "distanceWorld": round(pommel_end_clearance, 6),
            "distanceBodyScale": round(
                pommel_end_clearance / max(torso_height, 0.000001),
                6,
            ),
            "expected": (
                f">= {thresholds['minimumPommelEndClearanceBodyScale']} torso-height "
                "between the left hand's pommel-side surface and the pommel endpoint"
            ),
        })
    if palm_separation < torso_height * thresholds["minimumPalmSeparationBodyScale"]:
        failures.append({
            "check": "distinctTwoHandGrip",
            "distanceWorld": round(palm_separation, 6),
            "distanceBodyScale": round(palm_separation / max(torso_height, 0.000001), 6),
            "expected": f">= {thresholds['minimumPalmSeparationBodyScale']} torso-height",
        })
    return {
        "status": "FAIL" if failures else "PASS",
        "torsoHeight": round(torso_height, 6),
        "thresholds": thresholds,
        "rightPalmMeshEvidence": right_palm_evidence,
        "leftPalmMeshEvidence": left_palm_evidence,
        "rightHandHeadWorld": [round(value, 6) for value in right_hand],
        "rightPalmWorld": [round(value, 6) for value in right_palm],
        "leftHandHeadWorld": [round(value, 6) for value in left_hand],
        "leftPalmWorld": [round(value, 6) for value in left_palm],
        "hiltWorld": [round(value, 6) for value in hilt],
        "pommelWorld": [round(value, 6) for value in pommel],
        "handleLengthWorld": round(handle_length, 6),
        "crossguardGeometry": crossguard_geometry,
        "weaponAxisOppositionDot": round(weapon_axes["oppositionDot"], 8),
        "rightHandAxisExtentsWorld": {
            "bladeSideQ05": round(right_blade_extent, 6),
            "pommelSideQ95": round(right_pommel_extent, 6),
        },
        "leftHandAxisExtentsWorld": {
            "bladeSideQ05": round(left_blade_extent, 6),
            "pommelSideQ95": round(left_pommel_extent, 6),
        },
        "guardSurfaceClearanceWorld": round(guard_surface_clearance, 6),
        "guardSurfaceClearanceBodyScale": round(
            guard_surface_clearance / max(torso_height, 0.000001),
            6,
        ),
        "interHandSurfaceClearanceWorld": round(inter_hand_surface_clearance, 6),
        "interHandSurfaceClearanceBodyScale": round(
            inter_hand_surface_clearance / max(torso_height, 0.000001),
            6,
        ),
        "pommelEndClearanceWorld": round(pommel_end_clearance, 6),
        "pommelEndClearanceBodyScale": round(
            pommel_end_clearance / max(torso_height, 0.000001),
            6,
        ),
        "palmSeparationWorld": round(palm_separation, 6),
        "palmSeparationBodyScale": round(palm_separation / max(torso_height, 0.000001), 6),
        "palmAxisSeparationWorld": round(palm_axis_separation, 6),
        "palmAxisSeparationBodyScale": round(
            palm_axis_separation / max(torso_height, 0.000001),
            6,
        ),
        "rightPalmToHandleWorld": round(right_palm_error, 9),
        "rightPalmHandleParameter": round(right_palm_parameter, 6),
        "rightPalmClosestHandleWorld": [round(value, 6) for value in right_palm_closest],
        "leftPalmToHandleWorld": round(left_palm_error, 6),
        "leftPalmHandleParameter": round(left_palm_parameter, 6),
        "leftPalmClosestHandleWorld": [round(value, 6) for value in left_palm_closest],
        "leftHandHeadToHandleWorld": round(left_hand_error, 6),
        "leftHandHeadHandleParameter": round(left_hand_parameter, 6),
        "leftHandHeadClosestHandleWorld": [round(value, 6) for value in left_hand_closest],
        "failures": failures,
    }


def pin_left_support_palm_to_handle(
    armature: bpy.types.Object,
    body_objects: list[bpy.types.Object],
    sword_socket: Matrix,
    calibration: dict,
    torso_height: float,
) -> dict:
    """Close the support-hand loop against the actual oriented hilt-pommel segment."""
    weapon_axes = weapon_world_axes(sword_socket, calibration)
    hilt = weapon_axes["hilt"]
    pommel = weapon_axes["pommel"]
    handle_length = weapon_axes["handleLength"]
    # The calibrated hilt-pommel span scales with the standalone sword and is
    # much longer than the character's visible two-hand grip.  Choose the
    # support point by body scale, then express it on the actual handle segment.
    right_palm, right_points, right_palm_evidence = hand_mesh_landmark(
        body_objects,
        armature,
        "RightHand",
        torso_height,
    )
    _right_error, right_parameter, _right_closest = point_segment_distance_3d(
        right_palm,
        hilt,
        pommel,
    )
    handle_direction = weapon_axes["handleDirection"]
    _right_blade_extent, right_pommel_extent = hand_axis_extents(
        right_points,
        right_palm,
        handle_direction,
    )
    right_center_axis = (right_palm - hilt).dot(handle_direction)
    surface_gap = torso_height * GRIP_SURFACE_CLEARANCE_TORSO_FRACTION
    elbow_hint = find_pose_bone_world(armature, "LeftForeArm").translation.copy()
    tolerance = torso_height * 0.01
    iterations = []
    for index in range(12):
        wrist_before = find_pose_bone_world(armature, "LeftHand").translation.copy()
        palm_before, points_before, evidence_before = hand_mesh_landmark(
            body_objects,
            armature,
            "LeftHand",
            torso_height,
        )
        left_blade_extent, _left_pommel_extent = hand_axis_extents(
            points_before,
            palm_before,
            handle_direction,
        )
        target_axis = (
            right_center_axis
            + right_pommel_extent
            - left_blade_extent
            + surface_gap
        )
        target_parameter = target_axis / max(handle_length, 0.000001)
        if not 0.0 < target_parameter < 1.0:
            raise RuntimeError(
                f"geometry-derived left support target is outside the handle: "
                f"parameter={target_parameter:.6f}"
            )
        palm_target = hilt + handle_direction * target_axis
        wrist_target = wrist_before + (palm_target - palm_before)
        pin = solve_two_bone_elbow_wrist_pin(
            armature,
            ["LeftArm", "LeftForeArm", "LeftHand"],
            wrist_target,
            elbow_hint,
        )
        palm_after, _points_after, evidence_after = hand_mesh_landmark(
            body_objects,
            armature,
            "LeftHand",
            torso_height,
        )
        iterations.append({
            "iteration": index + 1,
            "targetHandleParameter": round(target_parameter, 6),
            "leftBladeSideExtentWorld": round(left_blade_extent, 6),
            "palmMeshEvidenceBefore": evidence_before,
            "wristTarget": [round(value, 6) for value in wrist_target],
            "palmErrorWorld": round((palm_after - palm_target).length, 9),
            "palmMeshEvidence": evidence_after,
            "pin": pin,
        })
        if (palm_after - palm_target).length <= tolerance:
            break
    actual_palm, actual_points, actual_palm_evidence = hand_mesh_landmark(
        body_objects,
        armature,
        "LeftHand",
        torso_height,
    )
    actual_left_blade_extent, _actual_left_pommel_extent = hand_axis_extents(
        actual_points,
        actual_palm,
        handle_direction,
    )
    target_axis = (
        right_center_axis
        + right_pommel_extent
        - actual_left_blade_extent
        + surface_gap
    )
    target_parameter = target_axis / max(handle_length, 0.000001)
    if not 0.0 < target_parameter < 1.0:
        raise RuntimeError(
            f"final geometry-derived left support target is outside the handle: "
            f"parameter={target_parameter:.6f}"
        )
    palm_target = hilt + handle_direction * target_axis
    palm_error = (actual_palm - palm_target).length
    shoulder = find_pose_bone_world(armature, "LeftArm").translation
    elbow = find_pose_bone_world(armature, "LeftForeArm").translation
    wrist = find_pose_bone_world(armature, "LeftHand").translation
    upper_length = (elbow - shoulder).length
    lower_length = (wrist - elbow).length
    arm_reach = (wrist - shoulder).length
    reach_reserve = upper_length + lower_length - arm_reach
    elbow_angle = math.degrees((shoulder - elbow).angle(wrist - elbow))
    minimum_reach_reserve = torso_height * 0.03
    maximum_elbow_angle = 165.0
    failures = []
    if palm_error > tolerance:
        failures.append("visible palm pin error")
    if reach_reserve < minimum_reach_reserve:
        failures.append("support-arm reach reserve")
    if elbow_angle > maximum_elbow_angle:
        failures.append("support elbow too straight")
    return {
        "status": "FAIL" if failures else "PASS",
        "authority": "post-blade-orientation left-arm pin to actual hilt-pommel segment",
        "anchorDefinition": actual_palm_evidence["definition"],
        "rightPalmMeshEvidence": right_palm_evidence,
        "leftPalmMeshEvidence": actual_palm_evidence,
        "rightPalmHandleParameter": round(right_parameter, 6),
        "rightPommelSideExtentWorld": round(right_pommel_extent, 6),
        "leftBladeSideExtentWorld": round(actual_left_blade_extent, 6),
        "requiredSurfaceGapWorld": round(surface_gap, 6),
        "targetHandleParameter": round(target_parameter, 6),
        "hiltWorld": [round(value, 6) for value in hilt],
        "pommelWorld": [round(value, 6) for value in pommel],
        "handleLengthWorld": round(handle_length, 6),
        "weaponAxisOppositionDot": round(weapon_axes["oppositionDot"], 8),
        "targetPalmWorld": [round(value, 6) for value in palm_target],
        "actualPalmWorld": [round(value, 6) for value in actual_palm],
        "palmPinErrorWorld": round(palm_error, 9),
        "toleranceWorld": round(tolerance, 9),
        "finalArmGeometry": {
            "upperLengthWorld": round(upper_length, 6),
            "lowerLengthWorld": round(lower_length, 6),
            "shoulderToWristWorld": round(arm_reach, 6),
            "reachReserveWorld": round(reach_reserve, 6),
            "reachReserveBodyScale": round(
                reach_reserve / max(torso_height, 0.000001),
                6,
            ),
            "minimumReachReserveWorld": round(minimum_reach_reserve, 6),
            "elbowAngleDeg": round(elbow_angle, 3),
            "maximumElbowAngleDeg": maximum_elbow_angle,
        },
        "failures": failures,
        "iterations": iterations,
    }


def point_segment_distance_2d(
    point: tuple[float, float, float],
    start: tuple[float, float, float],
    end: tuple[float, float, float],
) -> float:
    segment_x = end[0] - start[0]
    segment_y = end[1] - start[1]
    length_squared = segment_x * segment_x + segment_y * segment_y
    if length_squared < 0.000000000001:
        return screen_distance(point, start)
    parameter = max(0.0, min(
        1.0,
        ((point[0] - start[0]) * segment_x + (point[1] - start[1]) * segment_y)
        / length_squared,
    ))
    closest = (
        start[0] + segment_x * parameter,
        start[1] + segment_y * parameter,
        0.0,
    )
    return screen_distance(point, closest)


def segment_segment_distance_2d(
    first_start: tuple[float, float, float],
    first_end: tuple[float, float, float],
    second_start: tuple[float, float, float],
    second_end: tuple[float, float, float],
) -> float:
    """Return projected segment clearance, including zero for any intersection."""
    def cross(a, b, c):
        return (
            (b[0] - a[0]) * (c[1] - a[1])
            - (b[1] - a[1]) * (c[0] - a[0])
        )

    first_a = cross(first_start, first_end, second_start)
    first_b = cross(first_start, first_end, second_end)
    second_a = cross(second_start, second_end, first_start)
    second_b = cross(second_start, second_end, first_end)
    epsilon = 0.000000000001
    proper_intersection = (
        ((first_a > epsilon and first_b < -epsilon) or (first_a < -epsilon and first_b > epsilon))
        and ((second_a > epsilon and second_b < -epsilon) or (second_a < -epsilon and second_b > epsilon))
    )
    endpoint_intersection = any(
        distance <= epsilon
        for distance in [
            point_segment_distance_2d(first_start, second_start, second_end),
            point_segment_distance_2d(first_end, second_start, second_end),
            point_segment_distance_2d(second_start, first_start, first_end),
            point_segment_distance_2d(second_end, first_start, first_end),
        ]
    )
    if proper_intersection or endpoint_intersection:
        return 0.0
    return min(
        point_segment_distance_2d(first_start, second_start, second_end),
        point_segment_distance_2d(first_end, second_start, second_end),
        point_segment_distance_2d(second_start, first_start, first_end),
        point_segment_distance_2d(second_end, first_start, first_end),
    )


def validated_projected_points(
    camera: bpy.types.Object,
    world_points: list[Vector],
    label: str,
) -> list[tuple[float, float, float]]:
    projected = [project(camera, point) for point in world_points]
    invalid = [
        point
        for point in projected
        if (
            not all(math.isfinite(float(value)) for value in point)
            or point[2] < camera.data.clip_start
            or point[2] > camera.data.clip_end
        )
    ]
    if invalid:
        raise RuntimeError(
            f"{label} contains {len(invalid)} invalid or behind-camera projections"
        )
    return projected


def convex_hull_2d(
    points: list[tuple[float, float, float]],
) -> list[tuple[float, float, float]]:
    unique = sorted({(float(point[0]), float(point[1])) for point in points})
    if len(unique) < 3:
        raise RuntimeError(f"projected mesh hull has only {len(unique)} unique points")

    def cross(origin, first, second):
        return (
            (first[0] - origin[0]) * (second[1] - origin[1])
            - (first[1] - origin[1]) * (second[0] - origin[0])
        )

    lower = []
    for point in unique:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], point) <= 0:
            lower.pop()
        lower.append(point)
    upper = []
    for point in reversed(unique):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], point) <= 0:
            upper.pop()
        upper.append(point)
    hull = [(x, y, 0.0) for x, y in lower[:-1] + upper[:-1]]
    if len(hull) < 3:
        raise RuntimeError(f"projected mesh hull collapsed to {len(hull)} points")
    area = abs(sum(
        point[0] * hull[(index + 1) % len(hull)][1]
        - hull[(index + 1) % len(hull)][0] * point[1]
        for index, point in enumerate(hull)
    )) * 0.5
    if area <= 0.00000001:
        raise RuntimeError(f"projected mesh hull has non-positive area: {area}")
    return hull


def point_inside_convex_polygon_2d(
    point: tuple[float, float, float],
    polygon: list[tuple[float, float, float]],
) -> bool:
    signs = []
    for index, start in enumerate(polygon):
        end = polygon[(index + 1) % len(polygon)]
        cross = (
            (end[0] - start[0]) * (point[1] - start[1])
            - (end[1] - start[1]) * (point[0] - start[0])
        )
        if abs(cross) > 0.000000000001:
            signs.append(cross > 0)
    return not signs or all(sign == signs[0] for sign in signs)


def point_polygon_distance_2d(
    point: tuple[float, float, float],
    polygon: list[tuple[float, float, float]],
) -> float:
    if point_inside_convex_polygon_2d(point, polygon):
        return 0.0
    return min(
        point_segment_distance_2d(point, start, polygon[(index + 1) % len(polygon)])
        for index, start in enumerate(polygon)
    )


def segment_polygon_distance_2d(
    start: tuple[float, float, float],
    end: tuple[float, float, float],
    polygon: list[tuple[float, float, float]],
) -> float:
    if point_inside_convex_polygon_2d(start, polygon) or point_inside_convex_polygon_2d(end, polygon):
        return 0.0
    return min(
        segment_segment_distance_2d(
            start,
            end,
            edge_start,
            polygon[(index + 1) % len(polygon)],
        )
        for index, edge_start in enumerate(polygon)
    )


def polygon_polygon_distance_2d(
    first: list[tuple[float, float, float]],
    second: list[tuple[float, float, float]],
) -> float:
    if any(point_inside_convex_polygon_2d(point, second) for point in first):
        return 0.0
    if any(point_inside_convex_polygon_2d(point, first) for point in second):
        return 0.0
    return min(
        segment_segment_distance_2d(
            first_start,
            first[(first_index + 1) % len(first)],
            second_start,
            second[(second_index + 1) % len(second)],
        )
        for first_index, first_start in enumerate(first)
        for second_index, second_start in enumerate(second)
    )


def projected_head_mesh_hull(
    body_objects: list[bpy.types.Object],
    camera: bpy.types.Object,
) -> dict:
    world_points = dominant_head_mesh_points(body_objects)
    screen_points = validated_projected_points(camera, world_points, "dominant Head mesh")
    hull = convex_hull_2d(screen_points)
    return {
        "weightedVertexCount": len(world_points),
        "minimumVertexWeight": HEAD_MESH_WEIGHT_MINIMUM,
        "hull": hull,
    }


def crimson_review_view_specs() -> list[tuple[str, Vector]]:
    return [
        ("close-front", Vector((0.0, -4.2, 1.05))),
        ("close-three-quarter", Vector((3.1, -3.2, 1.2))),
        ("close-profile-right", Vector((4.15, 0, 1.15))),
        ("close-profile-left", Vector((-4.15, 0, 1.15))),
        ("close-rear", Vector((0.0, 4.2, 1.05))),
    ]


def face_clearance_at_camera(
    armature: bpy.types.Object,
    body_objects: list[bpy.types.Object],
    camera: bpy.types.Object,
    view_name: str,
    gated: bool,
) -> dict:
    head_mesh = projected_head_mesh_hull(body_objects, camera)
    head_hull = head_mesh["hull"]
    body_height = body_screen_box(body_objects, camera)["height"]
    segment_threshold = body_height * 0.015
    hand_threshold = body_height * 0.015
    torso_height = max(
        0.000001,
        (
            find_pose_bone_world(armature, "neck").translation
            - find_pose_bone_world(armature, "Hips").translation
        ).length,
    )
    arms = {}
    failures = []
    for side in ["Left", "Right"]:
        elbow, wrist = validated_projected_points(
            camera,
            [
                find_pose_bone_world(armature, f"{side}ForeArm").translation,
                find_pose_bone_world(armature, f"{side}Hand").translation,
            ],
            f"{side} elbow-wrist segment",
        )
        palm, hand_points, hand_evidence = hand_mesh_landmark(
            body_objects,
            armature,
            f"{side}Hand",
            torso_height,
        )
        palm_screen = validated_projected_points(
            camera,
            [palm],
            f"{side} visible palm centroid",
        )[0]
        hand_hull = convex_hull_2d(validated_projected_points(
            camera,
            hand_points,
            f"{side} dominant Hand mesh",
        ))
        segment_clearance = segment_polygon_distance_2d(
            elbow,
            wrist,
            head_hull,
        )
        hand_clearance = polygon_polygon_distance_2d(
            hand_hull,
            head_hull,
        )
        side_failures = []
        if segment_clearance < segment_threshold:
            side_failures.append("elbow-to-wrist segment")
        if hand_clearance < hand_threshold:
            side_failures.append("visible hand silhouette")
        arms[side.lower()] = {
            "elbow": [round(value, 6) for value in elbow],
            "wrist": [round(value, 6) for value in wrist],
            "palm": [round(value, 6) for value in palm_screen],
            "handMeshEvidence": hand_evidence,
            "handHull": [
                [round(value, 6) for value in point]
                for point in hand_hull
            ],
            "segmentFaceClearance": round(segment_clearance, 6),
            "handFaceClearance": round(hand_clearance, 6),
            "status": "FAIL" if side_failures and gated else "PASS",
            "failed": side_failures,
        }
        if gated and side_failures:
            failures.append({
                "side": side,
                "failed": side_failures,
                "actual": arms[side.lower()],
            })
    return {
        "view": view_name,
        "gated": gated,
        "status": "FAIL" if failures else "PASS",
        "bodyScreenHeight": round(body_height, 6),
        "thresholds": {
            "segmentFaceClearance": round(segment_threshold, 6),
            "handFaceClearance": round(hand_threshold, 6),
        },
        "headSilhouette": {
            "weightedVertexCount": head_mesh["weightedVertexCount"],
            "minimumVertexWeight": head_mesh["minimumVertexWeight"],
            "hull": [
                [round(value, 6) for value in point]
                for point in head_hull
            ],
        },
        "arms": arms,
        "failures": failures,
    }


def face_clearance_views(
    armature: bpy.types.Object,
    body_objects: list[bpy.types.Object],
    camera: bpy.types.Object,
    center_x: float,
) -> dict:
    original_location = camera.location.copy()
    original_rotation = camera.rotation_euler.copy()
    original_angle = camera.data.angle
    views = [face_clearance_at_camera(
        armature,
        body_objects,
        camera,
        "primary",
        True,
    )]
    gated_views = {view_name for view_name, _location in crimson_review_view_specs()}
    try:
        for view_name, relative_location in crimson_review_view_specs():
            aim_camera(
                camera,
                relative_location + Vector((center_x, 0, 0)),
                Vector((center_x, 0, 0.78)),
                46,
            )
            views.append(face_clearance_at_camera(
                armature,
                body_objects,
                camera,
                view_name,
                view_name in gated_views,
            ))
    finally:
        camera.location = original_location
        camera.rotation_euler = original_rotation
        camera.data.angle = original_angle
        bpy.context.view_layer.update()
    failures = [
        {"view": view["view"], **failure}
        for view in views
        for failure in view["failures"]
    ]
    return {
        "status": "FAIL" if failures else "PASS",
        "gatedViews": [
            "primary",
            *[view_name for view_name, _location in crimson_review_view_specs()],
        ],
        "views": views,
        "failures": failures,
    }


def blade_face_clearance_at_camera(
    armature: bpy.types.Object,
    body_objects: list[bpy.types.Object],
    camera: bpy.types.Object,
    view_name: str,
    gated: bool,
    sword_socket: Matrix,
    calibration: dict,
) -> dict:
    del armature
    body_height = body_screen_box(body_objects, camera)["height"]
    head_mesh = projected_head_mesh_hull(body_objects, camera)
    head_hull = head_mesh["hull"]
    weapon_axes = weapon_world_axes(sword_socket, calibration)
    hilt, tip = validated_projected_points(
        camera,
        [weapon_axes["hilt"], weapon_axes["tip"]],
        "hilt-tip blade segment",
    )
    crossguard_local_points, crossguard_selection = normalized_sword_crossguard_points(
        calibration
    )
    crossguard_world_points = [
        sword_socket @ browser_vector(list(point))
        for point in crossguard_local_points
    ]
    crossguard_hull = convex_hull_2d(validated_projected_points(
        camera,
        crossguard_world_points,
        "crossguard mesh",
    ))
    blade_threshold = body_height * 0.02
    guard_threshold = body_height * 0.01
    blade_clearance = segment_polygon_distance_2d(hilt, tip, head_hull)
    guard_clearance = polygon_polygon_distance_2d(crossguard_hull, head_hull)
    failed_checks = []
    if blade_clearance < blade_threshold:
        failed_checks.append("blade centerline to head silhouette")
    if guard_clearance < guard_threshold:
        failed_checks.append("crossguard silhouette to head silhouette")
    failed = gated and bool(failed_checks)
    return {
        "view": view_name,
        "gated": gated,
        "status": "FAIL" if failed else "PASS",
        "bodyScreenHeight": round(body_height, 6),
        "thresholds": {
            "bladeToHeadSilhouette": round(blade_threshold, 6),
            "crossguardToHeadSilhouette": round(guard_threshold, 6),
        },
        "clearances": {
            "bladeToHeadSilhouette": round(blade_clearance, 6),
            "crossguardToHeadSilhouette": round(guard_clearance, 6),
        },
        "weaponAxisOppositionDot": round(weapon_axes["oppositionDot"], 8),
        "blade": {
            "hilt": [round(value, 6) for value in hilt],
            "tip": [round(value, 6) for value in tip],
        },
        "crossguard": {
            **crossguard_selection,
            "hull": [
                [round(value, 6) for value in point]
                for point in crossguard_hull
            ],
        },
        "headSilhouette": {
            "weightedVertexCount": head_mesh["weightedVertexCount"],
            "minimumVertexWeight": head_mesh["minimumVertexWeight"],
            "hull": [
                [round(value, 6) for value in point]
                for point in head_hull
            ],
        },
        "failures": failed_checks if failed else [],
    }


def blade_face_clearance_views(
    armature: bpy.types.Object,
    body_objects: list[bpy.types.Object],
    camera: bpy.types.Object,
    center_x: float,
    sword_socket: Matrix,
    calibration: dict,
) -> dict:
    original_location = camera.location.copy()
    original_rotation = camera.rotation_euler.copy()
    original_angle = camera.data.angle
    views = [blade_face_clearance_at_camera(
        armature,
        body_objects,
        camera,
        "primary",
        True,
        sword_socket,
        calibration,
    )]
    gated_views = {view_name for view_name, _location in crimson_review_view_specs()}
    try:
        for view_name, relative_location in crimson_review_view_specs():
            aim_camera(
                camera,
                relative_location + Vector((center_x, 0, 0)),
                Vector((center_x, 0, 0.78)),
                46,
            )
            views.append(blade_face_clearance_at_camera(
                armature,
                body_objects,
                camera,
                view_name,
                view_name in gated_views,
                sword_socket,
                calibration,
            ))
    finally:
        camera.location = original_location
        camera.rotation_euler = original_rotation
        camera.data.angle = original_angle
        bpy.context.view_layer.update()
    failures = [
        {"view": view["view"], "failed": view["failures"], "actual": view}
        for view in views
        if view["failures"]
    ]
    return {
        "status": "FAIL" if failures else "PASS",
        "gatedViews": [
            "primary",
            "close-front",
            "close-three-quarter",
            "close-profile-right",
            "close-profile-left",
            "close-rear",
        ],
        "views": views,
        "failures": failures,
    }


def body_screen_box(objects: list[bpy.types.Object], camera: bpy.types.Object) -> dict:
    low, high, _ = mesh_bounds(objects)
    corners = [Vector((x, y, z)) for x in (low.x, high.x) for y in (low.y, high.y) for z in (low.z, high.z)]
    projected = [project(camera, corner) for corner in corners]
    xs = [p[0] for p in projected]
    ys = [p[1] for p in projected]
    return {"xMin": min(xs), "xMax": max(xs), "yMin": min(ys), "yMax": max(ys), "height": max(ys) - min(ys), "width": max(xs) - min(xs)}


def add_label(text: str, location: tuple[float, float, float]) -> bpy.types.Object:
    font_curve = bpy.data.curves.new(text, "FONT")
    font_curve.body = text
    font_curve.size = 0.08
    font_curve.align_x = "CENTER"
    obj = bpy.data.objects.new(text, font_curve)
    obj.location = location
    bpy.context.collection.objects.link(obj)
    return obj


def write_empty_handed_checkpoint(
    out_dir: Path,
    candidate_id: str,
    armature: bpy.types.Object,
    author_report: dict,
    camera: bpy.types.Object,
    crimson_objects: list[bpy.types.Object],
    hidden_objects: list[bpy.types.Object],
    skip_render: bool,
) -> dict:
    payload = {
        "schema": "pose-lab-v2-empty-handed-arm-checkpoint-v1",
        "createdAt": utc_now(),
        "candidate": candidate_id,
        "stage": "after-elbow-wrist-pin-before-wrist-roll-and-sword",
        "armIk": author_report["armIk"],
        "armLandmarks": arm_landmarks(armature),
        "protectedBodyLock": author_report["emptyHandedCheckpoint"]["protectedBodyLock"],
        "bones": export_authored_pose(armature),
    }
    json_path = out_dir / "empty_handed_arm_checkpoint.json"
    json_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    result = {
        "json": json_path.name,
        "jsonSha256": sha256(json_path),
        "image": None,
        "imageSha256": None,
    }
    if skip_render:
        return result

    camera_location = camera.location.copy()
    camera_rotation = camera.rotation_euler.copy()
    camera_angle = camera.data.angle
    render_samples = bpy.context.scene.cycles.samples
    hidden_states = {obj.name: obj.hide_render for obj in hidden_objects}
    visible_states = {obj.name: obj.hide_render for obj in crimson_objects}
    try:
        for obj in hidden_objects:
            obj.hide_render = True
        for obj in crimson_objects:
            obj.hide_render = False
        bpy.context.scene.cycles.samples = min(render_samples, 8)
        aim_camera(
            camera,
            Vector((1.05, -4.2, 1.05)),
            Vector((1.05, 0.0, 0.92)),
            46,
        )
        image_path = out_dir / "empty_handed_arm_checkpoint.png"
        bpy.context.scene.render.filepath = str(image_path)
        bpy.ops.render.render(write_still=True)
        result["image"] = image_path.name
        result["imageSha256"] = sha256(image_path)
    finally:
        camera.location = camera_location
        camera.rotation_euler = camera_rotation
        camera.data.angle = camera_angle
        bpy.context.scene.cycles.samples = render_samples
        for obj in hidden_objects:
            obj.hide_render = hidden_states[obj.name]
        for obj in crimson_objects:
            obj.hide_render = visible_states[obj.name]
    return result


def write_generated_candidate(
    committed_candidate: dict,
    requested_id: str,
    frame: dict,
    authored_glb: dict,
    out_dir: Path,
    exact_authored_glb: bool,
    author_eligible: bool,
) -> dict:
    canonical = canonical_frame(frame)
    pose_bytes = canonical_frame_bytes(canonical)
    pose_sha = sha256_bytes(pose_bytes)
    generated = json.loads(json.dumps(committed_candidate))
    generated["schema"] = generated.get("schema") or "pose-lab-v2-attack-candidate-v1"
    generated["id"] = requested_id
    generated["primeKeys"] = {"start": 0}
    generated["frames"] = [canonical]
    source = generated.setdefault("source", {})
    source["exactAuthoredGlb"] = exact_authored_glb
    source["poseSha256"] = pose_sha
    source["authoredGlbSha256"] = authored_glb["sha256"]
    source["poseProvenance"] = {
        "bonesAndHips": "extracted from authored_frame_zero.glb CrimsonCombatReadyFrameZero animation channels",
        "sabreLocal": "newly baked calibration after blade-direction and two-hand weapon seating solve; not extracted from character GLB",
    }
    source["status"] = (
        "generated-visual-pending-candidate-parity"
        if exact_authored_glb and author_eligible
        else (
            "authoring-red-validation-failed"
            if exact_authored_glb
            else "authoring-red-glb-extraction-failed"
        )
    )
    source["authorEligibleBeforeCandidateParity"] = bool(author_eligible)

    export_name = re.sub(r"[^A-Za-z0-9]+", "_", requested_id).strip("_").upper() + "_SEQUENCE"
    module_text = f"export const {export_name} = {json.dumps(generated, indent=2)};\n"
    payload_text = json.dumps(canonical, indent=2) + "\n"
    pose_text = pose_sha + "\n"

    canonical_dir = ROOT / "generated" / "pose-candidates"
    canonical_dir.mkdir(parents=True, exist_ok=True)
    canonical_module = canonical_dir / f"{requested_id}.js"
    canonical_payload = canonical_dir / f"{requested_id}.json"
    canonical_pose_sha = canonical_dir / f"{requested_id}.pose.sha256"
    artifact_module = out_dir / "generated_candidate.js"
    artifact_payload = out_dir / "generated_candidate_payload.json"
    artifact_pose_sha = out_dir / "pose.sha256"
    for path, text_payload in [
        (canonical_module, module_text),
        (artifact_module, module_text),
        (canonical_payload, payload_text),
        (artifact_payload, payload_text),
        (canonical_pose_sha, pose_text),
        (artifact_pose_sha, pose_text),
    ]:
        path.write_text(text_payload, encoding="utf-8")

    return {
        "id": requested_id,
        "candidateId": requested_id,
        "poseSha256": pose_sha,
        "module": artifact_module.name,
        "moduleSha256": sha256(artifact_module),
        "payload": artifact_payload.name,
        "payloadSha256": sha256(artifact_payload),
        "poseShaFile": artifact_pose_sha.name,
        "poseShaFileSha256": sha256(artifact_pose_sha),
        "canonicalModule": str(canonical_module.relative_to(ROOT)),
        "canonicalPayload": str(canonical_payload.relative_to(ROOT)),
        "canonicalPoseShaFile": str(canonical_pose_sha.relative_to(ROOT)),
        "source": {
            "exactAuthoredGlb": exact_authored_glb,
            "poseSha256": pose_sha,
            "authoredGlbSha256": authored_glb["sha256"],
            "status": source["status"],
            "authorEligibleBeforeCandidateParity": bool(author_eligible),
        },
    }


def candidate_parity_report(
    committed_candidate: dict,
    committed_frame: dict | None,
    generated_frame: dict,
    candidate_path: Path,
    generated_exact_authored_glb: bool,
    generated_authored_glb_sha: str,
) -> dict:
    generated_canonical = canonical_frame(generated_frame)
    generated_bytes = canonical_frame_bytes(generated_canonical)
    generated_sha = sha256_bytes(generated_bytes)
    declared_sha = committed_candidate.get("source", {}).get("poseSha256")
    declared_valid = bool(
        isinstance(declared_sha, str)
        and re.fullmatch(r"[a-f0-9]{64}", declared_sha)
    )
    committed_exact_glb = committed_candidate.get("source", {}).get("exactAuthoredGlb") is True
    committed_status = committed_candidate.get("source", {}).get("status")
    committed_status_match = committed_status == "generated-visual-pending-candidate-parity"
    committed_author_eligible = (
        committed_candidate.get("source", {}).get("authorEligibleBeforeCandidateParity") is True
    )
    exact_glb = committed_exact_glb and generated_exact_authored_glb
    declared_glb_sha = committed_candidate.get("source", {}).get("authoredGlbSha256")
    declared_glb_valid = bool(
        isinstance(declared_glb_sha, str)
        and re.fullmatch(r"[a-f0-9]{64}", declared_glb_sha)
    )
    authored_glb_sha_match = (
        declared_glb_valid
        and declared_glb_sha == generated_authored_glb_sha
    )
    if committed_frame is None:
        return {
            "status": "FAIL",
            "exactFramePayloadMatch": False,
            "exactAuthoredGlb": exact_glb,
            "committedExactAuthoredGlb": committed_exact_glb,
            "committedStatus": committed_status,
            "committedStatusMatch": committed_status_match,
            "committedAuthorEligibleBeforeCandidateParity": committed_author_eligible,
            "generatedExactAuthoredGlb": generated_exact_authored_glb,
            "committedCandidate": str(candidate_path),
            "committedCandidateSha256": sha256(candidate_path) if candidate_path.exists() else None,
            "committedPoseSha256": None,
            "committedDeclaredPoseSha256": declared_sha,
            "committedDeclaredPoseShaValid": declared_valid,
            "declaredPoseShaMatch": False,
            "generatedPoseSha256": generated_sha,
            "committedDeclaredAuthoredGlbSha256": declared_glb_sha,
            "committedDeclaredAuthoredGlbShaValid": declared_glb_valid,
            "generatedAuthoredGlbSha256": generated_authored_glb_sha,
            "authoredGlbShaMatch": authored_glb_sha_match,
            "differentTopLevelFields": list(generated_canonical),
        }
    committed_canonical = canonical_frame(committed_frame)
    committed_bytes = canonical_frame_bytes(committed_canonical)
    committed_sha = sha256_bytes(committed_bytes)
    different = [
        field
        for field in ["label", "time", "positions", "sabreLocal", "bones"]
        if json.dumps(committed_canonical[field], sort_keys=True, separators=(",", ":"))
        != json.dumps(generated_canonical[field], sort_keys=True, separators=(",", ":"))
    ]
    exact = committed_bytes == generated_bytes
    declared_match = declared_valid and declared_sha == generated_sha
    passed = (
        exact
        and declared_match
        and exact_glb
        and authored_glb_sha_match
        and committed_status_match
        and committed_author_eligible
    )
    return {
        "status": "PASS" if passed else "FAIL",
        "exactFramePayloadMatch": exact,
        "exactAuthoredGlb": exact_glb,
        "committedExactAuthoredGlb": committed_exact_glb,
        "committedStatus": committed_status,
        "committedStatusMatch": committed_status_match,
        "committedAuthorEligibleBeforeCandidateParity": committed_author_eligible,
        "generatedExactAuthoredGlb": generated_exact_authored_glb,
        "committedCandidate": str(candidate_path.relative_to(ROOT)) if candidate_path.is_relative_to(ROOT) else str(candidate_path),
        "committedCandidateSha256": sha256(candidate_path),
        "committedPoseSha256": committed_sha,
        "committedDeclaredPoseSha256": declared_sha,
        "committedDeclaredPoseShaValid": declared_valid,
        "declaredPoseShaMatch": declared_match,
        "generatedPoseSha256": generated_sha,
        "committedDeclaredAuthoredGlbSha256": declared_glb_sha,
        "committedDeclaredAuthoredGlbShaValid": declared_glb_valid,
        "generatedAuthoredGlbSha256": generated_authored_glb_sha,
        "authoredGlbShaMatch": authored_glb_sha_match,
        "differentTopLevelFields": different,
    }


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
    torso_height = max(
        0.000001,
        (
            find_pose_bone_world(crimson_armature, "neck").translation
            - find_pose_bone_world(crimson_armature, "Hips").translation
        ).length,
    )
    grip_contract = weapon_grip_contract(
        crimson_armature,
        crimson_objects,
        sword_socket,
        calibration,
        torso_height,
    )
    if crimson_line["screenLength"] < 0.055:
        failures.append({"code": "CRIMSON_SWORD_TOO_SHORT_OR_HIDDEN", "actual": round(crimson_line["screenLength"], 4), "expected": ">= 0.055 screen units"})
    for grip_failure in grip_contract["failures"]:
        failures.append({
            "code": f"CRIMSON_WEAPON_GRIP_{grip_failure['check'].upper()}",
            "actual": grip_failure,
            "expected": "strict two-hand hilt/pommel ownership",
        })
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
        "crimson": {"blade": crimson_line, "hiltHandWorld": round(hilt_hand_world, 5), "hiltHandScreen": round(hilt_hand_screen, 5), "weaponGripContract": grip_contract, "bodyBox": cbox, "joints": joint_screens(crimson_armature, camera, {name: name for name in logical_bones}), "feet": feet},
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
    author_failures = []
    protected_body_baseline = None
    try:
        protected_body_baseline = load_json(PROTECTED_BODY_BASELINE_JSON)
        validate_protected_body_baseline(protected_body_baseline)
    except Exception as error:
        if not args.author_frame_zero:
            raise
        author_failures.append({
            "code": "AUTHOR_PROTECTED_BODY_BASELINE_INVALID",
            "actual": str(error),
            "expected": "loadable canonical 480eb888 protected-body baseline",
        })
    committed_frame = None
    try:
        candidate = load_candidate(candidate_path)
        committed_frame = validate_requested_candidate(candidate, args.candidate_id)
    except Exception as error:
        if not args.author_frame_zero:
            raise
        author_failures.append({
            "code": "AUTHOR_REQUESTED_CANDIDATE_INVALID",
            "actual": str(error),
            "expected": f"loadable candidate {args.candidate_id} with a populated start frame",
        })
        candidate = {
            "schema": "pose-lab-v2-attack-candidate-v1",
            "id": args.candidate_id,
            "label": "authoring fallback after requested candidate validation failure",
            "primeKeys": {"start": 0},
            "source": {},
            "frames": [],
        }
    rejected_baseline_candidate = candidate
    rejected_baseline_frame = committed_frame
    rejected_baseline_path = candidate_path
    if args.author_frame_zero:
        declared_rejected_baseline_id = (
            candidate.get("source", {})
            .get("rejectedBaseline", {})
            .get("candidateId")
        )
        if declared_rejected_baseline_id != REJECTED_480_CANDIDATE_ID:
            author_failures.append({
                "code": "AUTHOR_REJECTED_BASELINE_DECLARATION_INVALID",
                "actual": declared_rejected_baseline_id,
                "expected": REJECTED_480_CANDIDATE_ID,
            })
        rejected_baseline_path = (
            ROOT / "src" / "review-candidates" / f"{REJECTED_480_CANDIDATE_ID}.js"
        )
        try:
            rejected_baseline_candidate = load_candidate(rejected_baseline_path)
            rejected_baseline_frame = validate_requested_candidate(
                rejected_baseline_candidate,
                REJECTED_480_CANDIDATE_ID,
            )
            rejected_source = rejected_baseline_candidate.get("source", {})
            actual_rejected_pose_sha = sha256_bytes(
                canonical_frame_bytes(rejected_baseline_frame)
            )
            if (
                actual_rejected_pose_sha != REJECTED_480_POSE_SHA256
                or rejected_source.get("poseSha256") != REJECTED_480_POSE_SHA256
                or rejected_source.get("authoredGlbSha256") != REJECTED_480_AUTHORED_GLB_SHA256
            ):
                raise RuntimeError(
                    "rejected baseline provenance mismatch: "
                    f"actualPose={actual_rejected_pose_sha} "
                    f"declaredPose={rejected_source.get('poseSha256')} "
                    f"declaredGlb={rejected_source.get('authoredGlbSha256')}"
                )
            if protected_body_baseline is None:
                raise RuntimeError("protected-body baseline is unavailable")
            validate_protected_body_against_rejected_frame(
                protected_body_baseline,
                rejected_baseline_frame,
            )
        except Exception as error:
            author_failures.append({
                "code": "AUTHOR_REJECTED_BASELINE_INVALID",
                "actual": str(error),
                "expected": (
                    f"exact {REJECTED_480_CANDIDATE_ID} payload "
                    f"{REJECTED_480_POSE_SHA256} from GLB {REJECTED_480_AUTHORED_GLB_SHA256}"
                ),
            })
            # Do not render a substitute pose under a rejected-480 label.
            rejected_baseline_candidate = {}
            rejected_baseline_frame = None
    calibration = load_json(CALIBRATION_JSON)
    if args.author_frame_zero:
        calibration["swordLocal"]["scale"] = [value * 1.55 for value in calibration["swordLocal"]["scale"]]
    if reference.get("schema") != "pose-lab-v2-crimson-vanguard-swordattack1-reference-v2":
        raise RuntimeError("Vanguard reference is not full-body v2")
    rejected_baseline_anim = None
    if args.author_frame_zero and rejected_baseline_frame is not None:
        baseline_frames, baseline_nodes = crimson_node_frames(rejected_baseline_candidate)
        rejected_baseline_anim = inject_animation(
            CRIMSON_GLB,
            baseline_frames,
            baseline_nodes,
            tmp_dir / "committed_rejected_candidate.glb",
            rejected_baseline_candidate["id"],
        )
    if args.author_frame_zero:
        crimson_anim = rejected_baseline_anim or CRIMSON_GLB
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
    vanguard_stage = create_stage_root(vanguard_objects, "vanguard_evidence_stage")
    committed_rejected_landmarks = {}
    baseline_objects = []
    baseline_armature = None
    baseline_ground_offset = None
    if rejected_baseline_anim is not None:
        actions_before_baseline = set(bpy.data.actions)
        baseline_objects = import_glb(rejected_baseline_anim)
        baseline_armature = find_armature(baseline_objects, "Committed rejected Crimson")
        # Normalize the raw/rest import before activating its candidate action;
        # posed bounds must never change the authoring camera or body scale.
        clear_pose(baseline_armature)
        normalize_and_offset(baseline_objects, 1.7, 1.05)
        activate_action_containing(
            baseline_armature,
            rejected_baseline_candidate["id"],
        )
        set_frame(0.0, 24)
        freeze_armature_pose_and_remove_new_actions(
            baseline_armature,
            actions_before_baseline,
        )
        baseline_ground_offset = settle_crimson_boots(
            baseline_objects,
            baseline_armature,
        )
        committed_rejected_landmarks = arm_landmarks(baseline_armature)
        for obj in baseline_objects:
            obj.hide_render = True
    actions_before_crimson = set(bpy.data.actions)
    crimson_objects = import_glb(crimson_anim)
    crimson_armature = find_armature(crimson_objects, "Crimson")
    if args.author_frame_zero:
        # Match the rejected evidence normalization contract: rest bounds first,
        # then activate and freeze the exact rejected pose at the same scale.
        clear_pose(crimson_armature)
    normalize_and_offset(crimson_objects, 1.7, 1.05)
    author_report = None
    authored_frame = None
    generated_candidate = None
    parity_report = None
    empty_handed_checkpoint = None
    if args.author_frame_zero:
        if rejected_baseline_anim is not None:
            activate_action_containing(
                crimson_armature,
                REJECTED_480_CANDIDATE_ID,
            )
            set_frame(0.0, 24)
            freeze_armature_pose_and_remove_new_actions(
                crimson_armature,
                actions_before_crimson,
            )
        else:
            clear_pose(crimson_armature)
        source_start_time = float(reference["samples"]["start"]["sourceTime"])
        set_frame(source_start_time, 24)
        suppress_vanguard_root_motion(vanguard_armature)
        source_foot_bones = [
            reference["logicalBones"].get("LeftFoot"),
            reference["logicalBones"].get("RightFoot"),
        ]
        try:
            source_ground_offset = weighted_bone_min_z(vanguard_objects, source_foot_bones)
            source_ground_method = "foot-weighted vertices"
        except RuntimeError:
            source_ground_offset = nearby_bone_mesh_min_z(
                vanguard_objects,
                vanguard_armature,
                source_foot_bones,
            )
            source_ground_method = "mesh vertices near mapped foot bones"
        vanguard_stage.location.z -= source_ground_offset
        bpy.context.view_layer.update()
        author_report = author_crimson_frame_zero(vanguard_armature, crimson_armature, reference["logicalBones"])
        protected_body_basis = author_report.pop("_protectedBodyBasis")
        author_failures.extend(author_report.pop("authorFailures"))
        author_report["sourceStartTime"] = source_start_time
        author_report["sourceGroundBones"] = source_foot_bones
        author_report["sourceGroundMethod"] = source_ground_method
        author_report["sourceGroundOffset"] = round(source_ground_offset, 5)
        author_report["crimsonGroundOffset"] = round(settle_crimson_boots(crimson_objects, crimson_armature), 5)
        add_ground_plane()
        empty_handed_checkpoint = write_empty_handed_checkpoint(
            out_dir,
            args.candidate_id,
            crimson_armature,
            author_report,
            camera,
            crimson_objects,
            vanguard_objects,
            args.skip_render,
        )
        author_report["emptyHandedCheckpoint"]["artifact"] = empty_handed_checkpoint
        apply_authored_hand_rotations(crimson_armature, author_report)
        after_wrist_lock = pose_basis_lock_report(
            crimson_armature,
            protected_body_basis,
            "after-wrist-roll-before-sword",
        )
        author_report["protectedBodyBasisLock"] = [
            author_report["emptyHandedCheckpoint"]["protectedBodyLock"],
            after_wrist_lock,
        ]
        if not after_wrist_lock["unchanged"]:
            author_failures.append({
                "code": "AUTHOR_PROTECTED_BODY_BASIS_CHANGED_DURING_WRIST_ROLL",
                "actual": after_wrist_lock,
                "expected": "exact accepted center, head, and lower-body basis lock",
            })
    else:
        activate_action_containing(crimson_armature, candidate["id"])
    sword_objects = import_glb(SWORD_GLB)
    apply_crimson_sword_material(sword_objects)
    sword_initial = {obj.name: obj.matrix_world.copy() for obj in top_level(sword_objects)}
    baseline_sword_objects = []
    baseline_sword_initial = {}
    baseline_sword_socket = None
    baseline_calibration = None
    if args.author_frame_zero and baseline_armature is not None and rejected_baseline_frame is not None:
        baseline_sword_objects = import_glb(SWORD_GLB)
        apply_crimson_sword_material(baseline_sword_objects)
        baseline_sword_initial = {
            obj.name: obj.matrix_world.copy()
            for obj in top_level(baseline_sword_objects)
        }
        baseline_calibration = json.loads(json.dumps(calibration))
        baseline_calibration["swordLocal"] = json.loads(json.dumps(
            rejected_baseline_frame["sabreLocal"]
        ))
        baseline_sword_socket = place_crimson_sword(
            baseline_sword_objects,
            baseline_sword_initial,
            find_pose_bone_world(baseline_armature, "RightHand"),
            baseline_calibration,
        )
        for obj in baseline_sword_objects:
            obj.hide_render = True
    if args.author_frame_zero:
        author_report["blade"] = author_crimson_blade_direction(
            crimson_armature, sword_objects, sword_initial, calibration
        )
        author_report["swordSeating"] = seat_sword_hilt_at_right_palm(
            crimson_armature,
            crimson_objects,
            sword_objects,
            sword_initial,
            calibration,
            author_report["bodyScale"]["torsoHeight"],
        )
        current_sword_socket = place_crimson_sword(
            sword_objects,
            sword_initial,
            find_pose_bone_world(crimson_armature, "RightHand"),
            calibration,
        )
        author_report["supportHandPin"] = pin_left_support_palm_to_handle(
            crimson_armature,
            crimson_objects,
            current_sword_socket,
            calibration,
            author_report["bodyScale"]["torsoHeight"],
        )
        if author_report["supportHandPin"]["status"] != "PASS":
            author_failures.append({
                "code": "AUTHOR_LEFT_SUPPORT_PALM_PIN_FAILED",
                "actual": author_report["supportHandPin"],
                "expected": (
                    "left visible palm pinned within 0.01 torso-height of the oriented handle, "
                    "with at least 0.03 torso-height reach reserve and elbow bend <= 165 degrees"
                ),
            })
        author_report["armLandmarkDeltaVsCommittedRejectedCandidate"] = arm_landmark_delta(
            committed_rejected_landmarks,
            arm_landmarks(crimson_armature),
            author_report["bodyScale"]["torsoHeight"],
        )
        author_report["armLandmarkDeltaVsCommittedRejectedCandidate"].update({
            "candidateId": rejected_baseline_candidate.get("id"),
            "candidatePath": str(rejected_baseline_path.relative_to(ROOT))
            if rejected_baseline_path.is_relative_to(ROOT)
            else str(rejected_baseline_path),
            "candidateSha256": sha256(rejected_baseline_path)
            if rejected_baseline_path.exists()
            else None,
        })
        if not author_report["armLandmarkDeltaVsCommittedRejectedCandidate"]["materiallyDifferent"]:
            author_failures.append({
                "code": "AUTHOR_ARM_LANDMARK_DELTA_TOO_SMALL",
                "actual": author_report["armLandmarkDeltaVsCommittedRejectedCandidate"],
                "expected": "both wrists move >= 0.10 torso-height and both elbow/forearm heads move >= 0.08 versus exact 480eb888",
            })
        author_report["weaponGripContract"] = weapon_grip_contract(
            crimson_armature,
            crimson_objects,
            current_sword_socket,
            calibration,
            author_report["bodyScale"]["torsoHeight"],
        )
        if author_report["weaponGripContract"]["status"] != "PASS":
            author_failures.append({
                "code": "AUTHOR_TWO_HAND_WEAPON_GRIP_FAILED",
                "actual": author_report["weaponGripContract"],
                "expected": (
                    "guard seated just outside the dominant right-hand mesh, handle through both visible "
                    "hand centroids, nonoverlapping hand surfaces, and support hand inside the pommel"
                ),
            })
        author_report["faceClearance"] = face_clearance_views(
            crimson_armature,
            crimson_objects,
            camera,
            1.05,
        )
        if author_report["faceClearance"]["status"] != "PASS":
            author_failures.append({
                "code": "AUTHOR_ARM_FACE_CLEARANCE_FAILED",
                "actual": author_report["faceClearance"],
                "expected": (
                    "both visible Hand mesh hulls and elbow-to-wrist segments clear the dominant-Head "
                    "silhouette in every review camera"
                ),
            })
        author_report["bladeFaceClearance"] = blade_face_clearance_views(
            crimson_armature,
            crimson_objects,
            camera,
            1.05,
            current_sword_socket,
            calibration,
        )
        if author_report["bladeFaceClearance"]["status"] != "PASS":
            author_failures.append({
                "code": "AUTHOR_BLADE_FACE_CLEARANCE_FAILED",
                "actual": author_report["bladeFaceClearance"],
                "expected": (
                    "blade centerline and projected crossguard mesh clear the dominant-Head silhouette "
                    "in primary, front, three-quarter, both profiles, and rear review views"
                ),
            })
        if baseline_sword_socket is not None:
            baseline_torso_height = (
                find_pose_bone_world(baseline_armature, "neck").translation
                - find_pose_bone_world(baseline_armature, "Hips").translation
            ).length
            author_report["rejectedBaselineEvidence"] = {
                "candidateId": rejected_baseline_candidate.get("id"),
                "candidatePath": str(rejected_baseline_path.relative_to(ROOT))
                if rejected_baseline_path.is_relative_to(ROOT)
                else str(rejected_baseline_path),
                "candidateSha256": sha256(rejected_baseline_path),
                "poseSha256": rejected_baseline_candidate.get("source", {}).get("poseSha256"),
                "authoredGlbSha256": rejected_baseline_candidate.get("source", {}).get("authoredGlbSha256"),
                "groundOffset": round(baseline_ground_offset, 6)
                if baseline_ground_offset is not None
                else None,
                "weaponGripContract": weapon_grip_contract(
                    baseline_armature,
                    baseline_objects,
                    baseline_sword_socket,
                    baseline_calibration,
                    baseline_torso_height,
                ),
            }
        after_blade_lock = pose_basis_lock_report(
            crimson_armature,
            protected_body_basis,
            "after-blade-alignment",
        )
        author_report["protectedBodyBasisLock"].append(after_blade_lock)
        if not after_blade_lock["unchanged"]:
            author_failures.append({
                "code": "AUTHOR_PROTECTED_BODY_BASIS_CHANGED_DURING_BLADE_ALIGNMENT",
                "actual": after_blade_lock,
                "expected": "exact accepted center, head, and lower-body basis lock",
            })
        author_report["glbExport"] = export_authored_glb(
            crimson_objects, crimson_armature, out_dir / "authored_frame_zero.glb"
        )
        after_export_lock = pose_basis_lock_report(
            crimson_armature,
            protected_body_basis,
            "after-exact-glb-export",
        )
        author_report["protectedBodyBasisLock"].append(after_export_lock)
        if not after_export_lock["unchanged"]:
            author_failures.append({
                "code": "AUTHOR_PROTECTED_BODY_BASIS_CHANGED_DURING_GLB_EXPORT",
                "actual": after_export_lock,
                "expected": "exact accepted center, head, and lower-body basis lock",
            })
        exact_authored_glb = True
        try:
            authored_frame, extraction_report = extract_authored_frame_from_glb(
                out_dir / author_report["glbExport"]["path"],
                author_report["glbExport"]["action"],
                calibration,
            )
        except Exception as error:
            exact_authored_glb = False
            author_failures.append({
                "code": "AUTHOR_EXACT_GLB_FRAME_EXTRACTION_FAILED",
                "actual": str(error),
                "expected": "canonical frame extracted from CrimsonCombatReadyFrameZero GLB animation channels",
            })
            # Diagnostic fallback keeps the red artifact inspectable. It is
            # explicitly not allowed to claim exact authored-GLB authority.
            authored_frame = {
                "label": "start",
                "time": 0,
                "positions": export_authored_positions(crimson_armature),
                "sabreLocal": authored_sabre_local(calibration),
                "bones": export_authored_pose(crimson_armature),
            }
            extraction_report = {
                "authority": {
                    "bonesAndHips": "diagnostic Blender matrix-basis fallback; not exact GLB authority",
                    "sabreLocal": "newly baked calibration and weapon seating solve; not extracted from character GLB",
                },
                "error": str(error),
                "poseSha256": sha256_bytes(canonical_frame_bytes(authored_frame)),
                "glbSha256": author_report["glbExport"]["sha256"],
            }
        author_report["glbFrameExtraction"] = extraction_report
        if protected_body_baseline is not None:
            protected_body_parity = protected_body_parity_report(
                authored_frame,
                protected_body_baseline,
            )
        else:
            protected_body_parity = {
                "status": "FAIL",
                "baseline": {
                    "path": str(PROTECTED_BODY_BASELINE_JSON.relative_to(ROOT)),
                    "sha256": sha256(PROTECTED_BODY_BASELINE_JSON)
                    if PROTECTED_BODY_BASELINE_JSON.exists()
                    else None,
                    "sourceCommit": None,
                },
                "failures": [{
                    "channel": "protected-body-baseline",
                    "actual": None,
                    "expected": "loadable canonical 480eb888 protected-body baseline",
                }],
            }
        author_report["protectedBodyParity"] = protected_body_parity
        if protected_body_parity["status"] != "PASS":
            author_failures.append({
                "code": "AUTHOR_PROTECTED_BODY_PARITY_MISMATCH",
                "actual": protected_body_parity,
                "expected": "exported Hips, center, and lower-body channels match canonical 480eb888; shoulders and arms remain unprotected",
            })
        generated_candidate = write_generated_candidate(
            candidate,
            args.candidate_id,
            authored_frame,
            author_report["glbExport"],
            out_dir,
            exact_authored_glb,
            exact_authored_glb and not author_failures,
        )
        parity_report = candidate_parity_report(
            candidate,
            committed_frame,
            authored_frame,
            candidate_path,
            exact_authored_glb,
            author_report["glbExport"]["sha256"],
        )
        if parity_report["status"] != "PASS":
            author_failures.append({
                "code": "AUTHOR_COMMITTED_CANDIDATE_PARITY_MISMATCH",
                "actual": parity_report,
                "expected": "committed candidate contains the exact GLB-extracted frame, declares matching pose and authored-GLB SHAs, and sets source.exactAuthoredGlb=true",
            })
    vanguard_label = add_label("VANGUARD SOURCE", (-1.05, -0.18, 1.9))
    current_label = add_label("CRIMSON CURRENT", (1.05, -0.18, 1.9))
    baseline_label = add_label("REJECTED 480eb888", (1.05, -0.18, 1.9))
    baseline_label.hide_render = True
    fps = 24
    bpy.context.scene.render.fps = fps
    frames = []
    all_failures = [
        {"frame": "author", **failure}
        for failure in author_failures
    ]
    for index, label in enumerate(requested_frames, start=1):
        source_sample = reference["samples"][label]
        set_frame(float(source_sample["sourceTime"]), fps)
        suppress_vanguard_root_motion(vanguard_armature)
        hand = find_pose_bone_world(crimson_armature, "RightHand")
        sword_socket = place_crimson_sword(sword_objects, sword_initial, hand, calibration)
        entry = evaluate_frame(label, camera, vanguard_objects, vanguard_armature, crimson_objects, crimson_armature, sword_objects, sword_socket, calibration, reference["logicalBones"])
        filename = f"{index:02d}-{label}.png"
        if args.author_frame_zero:
            comparison_views = [
                name
                for name, _location in crimson_review_view_specs()
            ]
            entry["referenceViews"] = []
            entry["currentViews"] = []
            entry["crimsonViews"] = []
            entry["rejectedBaselineViews"] = []
            entry["baselineComparison"] = {
                "sameCamera": True,
                "views": comparison_views,
                "rejected": {
                    "candidateId": rejected_baseline_candidate.get("id"),
                    "poseSha256": rejected_baseline_candidate.get("source", {}).get("poseSha256"),
                    "moduleSha256": sha256(rejected_baseline_path)
                    if rejected_baseline_path.exists()
                    else None,
                },
                "current": {
                    "candidateId": args.candidate_id,
                    "poseSha256": generated_candidate.get("poseSha256")
                    if generated_candidate
                    else None,
                },
                "armLandmarkDelta": author_report.get("armLandmarkDeltaVsCommittedRejectedCandidate"),
            }
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
                view_specs = crimson_review_view_specs()
                review_sets = [
                    ("reference", -1.05, vanguard_objects + [vanguard_label], crimson_objects + sword_objects, "referenceViews"),
                    ("current", 1.05, crimson_objects + sword_objects + [current_label], vanguard_objects, "currentViews"),
                ]
                if baseline_objects and baseline_sword_objects:
                    review_sets.append((
                        "rejected-baseline",
                        1.05,
                        baseline_objects + baseline_sword_objects + [baseline_label],
                        vanguard_objects,
                        "rejectedBaselineViews",
                    ))
                all_review_objects = (
                    vanguard_objects
                    + crimson_objects
                    + sword_objects
                    + baseline_objects
                    + baseline_sword_objects
                    + [vanguard_label, current_label, baseline_label]
                )
                saved_visibility = [
                    (obj, obj.hide_render)
                    for obj in all_review_objects
                ]
                for subject_name, center_x, visible_objects, _hidden_objects, manifest_key in review_sets:
                    for obj in all_review_objects:
                        obj.hide_render = True
                    for obj in visible_objects:
                        obj.hide_render = False
                    for view_name, relative_location in view_specs:
                        location = relative_location + Vector((center_x, 0, 0))
                        aim_camera(camera, location, Vector((center_x, 0, 0.78)), 46)
                        view_filename = f"{index:02d}-{label}-{subject_name}-{view_name}.png"
                        bpy.context.scene.render.filepath = str(out_dir / view_filename)
                        bpy.ops.render.render(write_still=True)
                        entry[manifest_key].append({
                            "view": view_name,
                            "image": view_filename,
                            "sha256": sha256(out_dir / view_filename),
                            "cameraSubject": subject_name,
                        })
                for obj, hidden in saved_visibility:
                    obj.hide_render = hidden
                entry["crimsonViews"] = list(entry["currentViews"])
                camera.location = original_location
                camera.rotation_euler = original_rotation
                camera.data.angle = original_angle
                bpy.context.scene.cycles.samples = original_samples
                bpy.context.view_layer.update()
        frames.append(entry)
        for failure in entry["failures"]:
            all_failures.append({"frame": label, **failure})
    source_paths = {
        "vanguard": VANGUARD_GLB,
        "crimson": CRIMSON_GLB,
        "sword": SWORD_GLB,
        "reference": REFERENCE_JSON,
        "calibration": CALIBRATION_JSON,
        "protectedBodyBaseline": PROTECTED_BODY_BASELINE_JSON,
        "requestedCandidate": candidate_path,
        "rejectedBaselineCandidate": rejected_baseline_path,
    }
    source_hashes = {
        name: {
            "path": str(path.relative_to(ROOT)) if path.is_relative_to(ROOT) else str(path),
            "sha256": sha256(path) if path.exists() else None,
        }
        for name, path in source_paths.items()
    }
    authored_frame_manifest = None
    if args.author_frame_zero:
        authored_frame_manifest = {
            "frame": authored_frame,
            "poseSha256": generated_candidate["poseSha256"],
            "exactAuthoredGlb": generated_candidate["source"]["exactAuthoredGlb"],
            "glb": author_report["glbExport"],
        }
    manifest = {
        "schema": SCHEMA,
        "createdAt": utc_now(),
        "classification": "diagnostic-blocker-not-acceptance",
        "candidate": args.candidate_id,
        "candidateParity": parity_report,
        "generatedCandidate": generated_candidate,
        "authorReport": author_report,
        "authorFailures": author_failures,
        "emptyHandedArmCheckpoint": empty_handed_checkpoint,
        "authoredFrameZero": authored_frame_manifest,
        "source": {
            "vanguard": str(VANGUARD_GLB.relative_to(ROOT)),
            "crimson": str(CRIMSON_GLB.relative_to(ROOT)),
            "sword": str(SWORD_GLB.relative_to(ROOT)),
            "reference": str(REFERENCE_JSON.relative_to(ROOT)),
            "calibration": str(CALIBRATION_JSON.relative_to(ROOT)),
            "protectedBodyBaseline": str(PROTECTED_BODY_BASELINE_JSON.relative_to(ROOT)),
            "requestedCandidate": str(candidate_path.relative_to(ROOT)) if candidate_path.is_relative_to(ROOT) else str(candidate_path),
            "rejectedBaselineCandidate": str(rejected_baseline_path.relative_to(ROOT)) if rejected_baseline_path.is_relative_to(ROOT) else str(rejected_baseline_path),
        },
        "sourceHashes": source_hashes,
        "expected": "Vanguard and Crimson perform the same readable sword attack side by side; Crimson hilt stays in right hand and blade leads contact.",
        "status": "FAIL" if all_failures else "PASS",
        "frames": frames,
        "failureCount": len(all_failures),
        "brokenTransformsPath": "broken_transforms.json" if all_failures else None,
        "note": "This Blender diagnostic is agent eyesight and a cloud-dispatch blocker. It is not final hosted visual acceptance.",
    }
    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    if all_failures:
        broken = {"schema": "pose-lab-v2-broken-transform-report-v1", "createdAt": utc_now(), "candidate": args.candidate_id, "failures": all_failures}
        (out_dir / "broken_transforms.json").write_text(json.dumps(broken, indent=2), encoding="utf-8")
        print(json.dumps({"ok": False, "outDir": str(out_dir.relative_to(ROOT)), "failureCount": len(all_failures), "brokenTransforms": str((out_dir / "broken_transforms.json").relative_to(ROOT))}, indent=2))
        sys.exit(1)
    print(json.dumps({"ok": True, "outDir": str(out_dir.relative_to(ROOT)), "frames": len(frames)}, indent=2))


if __name__ == "__main__":
    main()
