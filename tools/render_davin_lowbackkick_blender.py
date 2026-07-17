#!/usr/bin/env python3
"""Render Davin LowBackKick candidate frames in Blender for local diagnostic review."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import struct
import sys
from datetime import datetime, timezone
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_GLB = ROOT / "public" / "assets" / "davin" / "davin_wingsworth_kestrel_man_rigged_pbr_tail3.glb"
DEFAULT_CANDIDATE = ROOT / "generated" / "davin-lowbackkick" / "ares-transfer-1" / "davin-lowbackkick-ares-transfer-1.json"
DEFAULT_OUT = ROOT / "generated" / "davin-lowbackkick" / "contact-sheet" / "ares-transfer-1"
SCHEMA = "pose-lab-v2-davin-lowbackkick-blender-frames-v1"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()




def pad4(data: bytes, byte: bytes = b"\x00") -> bytes:
    padding = (-len(data)) % 4
    return data + byte * padding


def parse_glb(path: Path) -> tuple[dict, bytes]:
    raw = path.read_bytes()
    magic, version, total_length = struct.unpack_from("<4sII", raw, 0)
    if magic != b"glTF" or version != 2 or total_length != len(raw):
        raise RuntimeError(f"unsupported GLB header for {path}")
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
    next_accessor = {"bufferView": view_index, **accessor}
    gltf.setdefault("accessors", []).append(next_accessor)
    return bin_chunk, len(gltf["accessors"]) - 1


def make_animated_candidate_glb(source_glb: Path, candidate: dict, out_glb: Path) -> Path:
    gltf, bin_chunk = parse_glb(source_glb)
    node_by_name = {node.get("name"): index for index, node in enumerate(gltf.get("nodes", [])) if node.get("name")}
    frames = candidate.get("frames") or []
    times = [float(frame.get("time") or 0.0) for frame in frames]
    if len(times) < 2:
        raise RuntimeError("candidate needs at least two keyed frames for animation injection")
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
    animated_bones = []
    first_bones = frames[0].get("bones") or {}
    for bone_name in first_bones:
        node_index = node_by_name.get(bone_name)
        if node_index is None:
            continue
        rotations = []
        for frame in frames:
            quat = (frame.get("bones") or {}).get(bone_name)
            if not quat or len(quat) != 4:
                quat = first_bones[bone_name]
            # glTF rotation order is [x, y, z, w], matching the Three.js candidate.
            rotations.extend(float(value) for value in quat)
        payload = struct.pack("<" + "f" * len(rotations), *rotations)
        bin_chunk, output_accessor = append_accessor(gltf, bin_chunk, payload, {
            "componentType": 5126,
            "type": "VEC4",
            "count": len(frames),
        })
        sampler_index = len(samplers)
        samplers.append({"input": time_accessor, "output": output_accessor, "interpolation": "LINEAR"})
        channels.append({"sampler": sampler_index, "target": {"node": node_index, "path": "rotation"}})
        animated_bones.append(bone_name)
    if not channels:
        raise RuntimeError("no candidate bones matched GLB nodes for animation injection")
    gltf.setdefault("animations", []).append({
        "name": "DavinLowBackKick_AresTransfer1",
        "samplers": samplers,
        "channels": channels,
    })
    gltf.setdefault("buffers", [{"byteLength": 0}])[0]["byteLength"] = len(bin_chunk)
    write_glb(out_glb, gltf, bin_chunk)
    return out_glb

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
    for obj in bpy.data.objects:
        if obj.type == "ARMATURE":
            return obj
    raise RuntimeError("Davin import did not contain an armature")


def scene_bounds(objects: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    low = Vector((float("inf"), float("inf"), float("inf")))
    high = Vector((float("-inf"), float("-inf"), float("-inf")))
    mesh_count = 0
    for obj in objects:
        if obj.type != "MESH":
            continue
        mesh_count += 1
        for corner in obj.bound_box:
            world = obj.matrix_world @ Vector(corner)
            low.x = min(low.x, world.x)
            low.y = min(low.y, world.y)
            low.z = min(low.z, world.z)
            high.x = max(high.x, world.x)
            high.y = max(high.y, world.y)
            high.z = max(high.z, world.z)
    if mesh_count == 0:
        raise RuntimeError("Davin import did not contain renderable mesh bounds")
    return (low + high) * 0.5, high - low


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    direction = target - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def setup_scene(width: int, height: int, samples: int) -> bpy.types.Object:
    scene = bpy.context.scene
    scene.render.fps = 24
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    scene.cycles.use_denoising = False
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.view_settings.view_transform = "Filmic"
    scene.view_settings.look = "Medium High Contrast"
    scene.world.color = (0.045, 0.05, 0.055)
    camera = bpy.data.objects.new("davin_lowbackkick_camera", bpy.data.cameras.new("davin_lowbackkick_camera"))
    bpy.context.collection.objects.link(camera)
    scene.camera = camera
    sun = bpy.data.objects.new("davin_lowbackkick_sun", bpy.data.lights.new("davin_lowbackkick_sun", "SUN"))
    sun.rotation_euler = (math.radians(48), 0, math.radians(32))
    sun.data.energy = 2.2
    bpy.context.collection.objects.link(sun)
    area = bpy.data.objects.new("davin_lowbackkick_softbox", bpy.data.lights.new("davin_lowbackkick_softbox", "AREA"))
    area.location = (0, -3.0, 2.5)
    area.data.energy = 520
    area.data.size = 4.5
    bpy.context.collection.objects.link(area)
    return camera


def activate_gltf_animation(armature: bpy.types.Object) -> None:
    bpy.context.view_layer.objects.active = armature
    armature.data.pose_position = "POSE"
    if not bpy.data.actions:
        raise RuntimeError("no GLTF animation actions were imported")
    # The renderer injects the review candidate after source GLB animations, so
    # the last imported action is the candidate. Do not leave walking/running in control.
    armature.animation_data_create()
    armature.animation_data.action = bpy.data.actions[-1]
    for track in armature.animation_data.nla_tracks:
        track.mute = True


def set_candidate_frame(frame: dict, fps: int) -> None:
    frame_number = 1 + round(float(frame.get("time") or 0.0) * fps)
    bpy.context.scene.frame_set(frame_number)
    bpy.context.view_layer.update()


def posed_mesh_bounds() -> tuple[Vector, Vector]:
    low = Vector((float("inf"), float("inf"), float("inf")))
    high = Vector((float("-inf"), float("-inf"), float("-inf")))
    mesh_count = 0
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH":
            continue
        mesh_count += 1
        depsgraph = bpy.context.evaluated_depsgraph_get()
        evaluated = obj.evaluated_get(depsgraph)
        for corner in evaluated.bound_box:
            world = evaluated.matrix_world @ Vector(corner)
            low.x = min(low.x, world.x)
            low.y = min(low.y, world.y)
            low.z = min(low.z, world.z)
            high.x = max(high.x, world.x)
            high.y = max(high.y, world.y)
            high.z = max(high.z, world.z)
    if mesh_count == 0:
        raise RuntimeError("no posed mesh bounds available")
    return (low + high) * 0.5, high - low


def camera_direction_from_text(text: str) -> Vector:
    parts = [float(value.strip()) for value in text.split(",")]
    if len(parts) != 3:
        raise RuntimeError("--camera-direction must be x,y,z")
    return Vector(tuple(parts)).normalized()


def render_frame(camera: bpy.types.Object, target: Vector, size: Vector, frame: dict, index: int, out_dir: Path, camera_direction: Vector, ortho_padding: float) -> dict:
    posed_center, posed_size = posed_mesh_bounds()
    frame_size = max(posed_size.x, posed_size.y, posed_size.z, 1.0)
    # Beat-em-up contact-sheet view: side-biased and slightly elevated so leg extension,
    # support foot, tail, and wings stay readable without clipping.
    camera.location = posed_center + camera_direction * frame_size * 2.0
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = max(posed_size.x * ortho_padding, posed_size.z * ortho_padding, 1.0)
    camera.data.clip_start = 0.01
    camera.data.clip_end = 1000
    look_at(camera, posed_center + Vector((0, 0, posed_size.z * 0.04)))
    safe_label = "".join(ch if ch.isalnum() or ch in "-_" else "_" for ch in str(frame.get("label") or index))
    path = out_dir / f"{index:02d}_{safe_label}.png"
    bpy.context.scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    return {
        "index": index,
        "label": frame.get("label"),
        "time": frame.get("time"),
        "path": str(path),
        "sha256": sha256(path),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--glb", default=str(DEFAULT_GLB))
    parser.add_argument("--candidate", default=str(DEFAULT_CANDIDATE))
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT))
    parser.add_argument("--width", type=int, default=720)
    parser.add_argument("--height", type=int, default=720)
    parser.add_argument("--samples", type=int, default=12)
    parser.add_argument("--camera-direction", default="1.55,-0.35,0.22")
    parser.add_argument("--ortho-padding", type=float, default=1.28)
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    args = parser.parse_args(argv)

    glb = Path(args.glb)
    candidate_path = Path(args.candidate)
    out_dir = Path(args.out_dir)
    if not glb.is_absolute():
        glb = ROOT / glb
    if not candidate_path.is_absolute():
        candidate_path = ROOT / candidate_path
    if not out_dir.is_absolute():
        out_dir = ROOT / out_dir
    frames_dir = out_dir / "frames"
    frames_dir.mkdir(parents=True, exist_ok=True)
    candidate = json.loads(candidate_path.read_text())

    animated_glb = out_dir / "davin-lowbackkick-ares-transfer-1.animated.glb"
    make_animated_candidate_glb(glb, candidate, animated_glb)

    clear_scene()
    bpy.context.scene.render.fps = 24
    objects = import_glb(animated_glb)
    armature = find_armature(objects)
    activate_gltf_animation(armature)
    camera = setup_scene(args.width, args.height, args.samples)
    center, size = scene_bounds(objects)
    center.z += size.z * 0.02
    camera_direction = camera_direction_from_text(args.camera_direction)

    rendered = []
    animated_bones = sorted((candidate.get("frames") or [{}])[0].get("bones", {}).keys())
    for index, frame in enumerate(candidate.get("frames") or []):
        set_candidate_frame(frame, bpy.context.scene.render.fps)
        entry = render_frame(camera, center, size, frame, index, frames_dir, camera_direction, args.ortho_padding)
        entry["appliedBones"] = animated_bones
        entry["blenderFrame"] = bpy.context.scene.frame_current
        rendered.append(entry)

    manifest = {
        "schema": SCHEMA,
        "status": "diagnostic-not-acceptance",
        "generatedAt": utc_now(),
        "blender": bpy.app.version_string,
        "asset": {"path": str(glb), "sha256": sha256(glb)},
        "animatedGlb": {"path": str(animated_glb), "sha256": sha256(animated_glb)},
        "candidate": {"path": str(candidate_path), "sha256": sha256(candidate_path), "label": candidate.get("label")},
        "frames": rendered,
        "camera": {"direction": args.camera_direction, "orthoPadding": args.ortho_padding},
        "note": "Local Blender contact-sheet frames for viability review only. This does not accept the pose candidate.",
    }
    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(str(out_dir / "manifest.json"))


if __name__ == "__main__":
    main()
