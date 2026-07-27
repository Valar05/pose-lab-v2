#!/usr/bin/env python3
"""Index a Meshy with-skin GLB archive as a compact, searchable motion vault."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import struct
import zipfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

SCHEMA = "pose-lab-v2-regnet-motion-vault-v1"
TOOL_VERSION = "1.0.0"
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
    ("LeftLeg", "LeftFoot"), ("LeftFoot", "LeftToeBase"),
    ("Hips", "RightUpLeg"), ("RightUpLeg", "RightLeg"),
    ("RightLeg", "RightFoot"), ("RightFoot", "RightToeBase"),
)
TYPE_WIDTH = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}
COMPONENT = {
    5120: ("b", 1), 5121: ("B", 1), 5122: ("h", 2), 5123: ("H", 2),
    5125: ("I", 4), 5126: ("f", 4),
}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def slug(value: str) -> str:
    value = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return value or "clip"


def clip_title(entry_name: str) -> str:
    stem = Path(entry_name).stem
    match = re.search(r"_Animation_(.+?)_withSkin$", stem, flags=re.I)
    raw = match.group(1) if match else re.sub(r"_withSkin$", "", stem, flags=re.I)
    raw = raw.replace("_", " ")
    return re.sub(r"\s+", " ", raw).strip()


def tags_for(title: str) -> list[str]:
    text = title.lower()
    rules = {
        "locomotion": ("walk", "run", "sprint", "crouch"),
        "combat": ("punch", "boxing", "shoot", "gun"),
        "airborne": ("jump", "leap", "vault"),
        "interaction": ("push",),
        "unstable": ("unsteady", "sudden stop"),
        "directional": ("left", "right", "back"),
        "in-place": ("inplace",),
        "armed": ("shoot", "gun"),
    }
    return [tag for tag, words in rules.items() if any(word in text for word in words)]


@dataclass
class Glb:
    document: dict
    binary: bytes


def parse_glb(data: bytes) -> Glb:
    if len(data) < 20 or data[:4] != b"glTF":
        raise ValueError("not a GLB")
    version, total = struct.unpack_from("<II", data, 4)
    if version != 2 or total != len(data):
        raise ValueError("invalid GLB header")
    offset = 12
    document = None
    binary = b""
    while offset < len(data):
        length, kind = struct.unpack_from("<II", data, offset)
        offset += 8
        chunk = data[offset : offset + length]
        offset += length
        if kind == 0x4E4F534A:
            document = json.loads(chunk.rstrip(b"\x00 \t\r\n"))
        elif kind == 0x004E4942:
            binary = chunk
    if document is None:
        raise ValueError("GLB has no JSON chunk")
    return Glb(document, binary)


def accessor(glb: Glb, index: int) -> list[tuple[float, ...]]:
    item = glb.document["accessors"][index]
    view = glb.document["bufferViews"][item["bufferView"]]
    width = TYPE_WIDTH[item["type"]]
    fmt, size = COMPONENT[item["componentType"]]
    stride = view.get("byteStride", width * size)
    offset = view.get("byteOffset", 0) + item.get("byteOffset", 0)
    unpack = struct.Struct("<" + fmt * width).unpack_from
    return [
        tuple(float(value) for value in unpack(glb.binary, offset + row * stride))
        for row in range(item["count"])
    ]


def lerp(a: tuple[float, ...], b: tuple[float, ...], t: float) -> tuple[float, ...]:
    return tuple(x + (y - x) * t for x, y in zip(a, b))


def q_normalize(q: tuple[float, ...]) -> tuple[float, float, float, float]:
    length = math.sqrt(sum(value * value for value in q)) or 1.0
    return tuple(value / length for value in q)  # type: ignore[return-value]


def q_lerp(a: tuple[float, ...], b: tuple[float, ...], t: float) -> tuple[float, ...]:
    if sum(x * y for x, y in zip(a, b)) < 0:
        b = tuple(-value for value in b)
    return q_normalize(lerp(a, b, t))


def sample_track(times: list[tuple[float, ...]], values: list[tuple[float, ...]], time: float, rotation: bool) -> tuple[float, ...]:
    scalar = [row[0] for row in times]
    if time <= scalar[0]:
        return values[0]
    if time >= scalar[-1]:
        return values[-1]
    hi = next(index for index, value in enumerate(scalar) if value >= time)
    lo = hi - 1
    factor = (time - scalar[lo]) / max(1e-9, scalar[hi] - scalar[lo])
    return q_lerp(values[lo], values[hi], factor) if rotation else lerp(values[lo], values[hi], factor)


def mat_mul(a: tuple[float, ...], b: tuple[float, ...]) -> tuple[float, ...]:
    return tuple(
        sum(a[row * 4 + k] * b[k * 4 + col] for k in range(4))
        for row in range(4) for col in range(4)
    )


def trs(translation: tuple[float, ...], rotation: tuple[float, ...], scale: tuple[float, ...]) -> tuple[float, ...]:
    x, y, z, w = q_normalize(rotation)
    sx, sy, sz = scale
    return (
        (1 - 2 * (y*y + z*z)) * sx, (2 * (x*y - z*w)) * sy, (2 * (x*z + y*w)) * sz, translation[0],
        (2 * (x*y + z*w)) * sx, (1 - 2 * (x*x + z*z)) * sy, (2 * (y*z - x*w)) * sz, translation[1],
        (2 * (x*z - y*w)) * sx, (2 * (y*z + x*w)) * sy, (1 - 2 * (x*x + y*y)) * sz, translation[2],
        0.0, 0.0, 0.0, 1.0,
    )


def translation(matrix: tuple[float, ...]) -> tuple[float, float, float]:
    return matrix[3], matrix[7], matrix[11]


def sub(a: tuple[float, ...], b: tuple[float, ...]) -> tuple[float, float, float]:
    return a[0] - b[0], a[1] - b[1], a[2] - b[2]


def length(value: tuple[float, ...]) -> float:
    return math.sqrt(sum(axis * axis for axis in value))


def unit(value: tuple[float, ...]) -> tuple[float, float, float]:
    scale = length(value) or 1.0
    return value[0] / scale, value[1] / scale, value[2] / scale


def parents(document: dict) -> dict[int, int]:
    return {
        child: parent
        for parent, node in enumerate(document.get("nodes", []))
        for child in node.get("children", [])
    }


def skeleton_signature(document: dict) -> str:
    parent = parents(document)
    nodes = document.get("nodes", [])
    skin_joints = sorted({joint for skin in document.get("skins", []) for joint in skin.get("joints", [])})
    contract = [
        {
            "name": nodes[index].get("name"),
            "parent": nodes[parent[index]].get("name") if index in parent else None,
            "translation": nodes[index].get("translation", [0, 0, 0]),
            "rotation": nodes[index].get("rotation", [0, 0, 0, 1]),
            "scale": nodes[index].get("scale", [1, 1, 1]),
        }
        for index in skin_joints
    ]
    return sha256_bytes(json.dumps(contract, sort_keys=True, separators=(",", ":")).encode())


def build_tracks(glb: Glb, animation: dict) -> tuple[dict[int, dict[str, tuple[list, list]]], float]:
    tracks: dict[int, dict[str, tuple[list, list]]] = {}
    duration = 0.0
    for channel in animation.get("channels", []):
        target = channel.get("target", {})
        node = target.get("node")
        path = target.get("path")
        if node is None or path not in {"translation", "rotation", "scale"}:
            continue
        sampler = animation["samplers"][channel["sampler"]]
        if sampler.get("interpolation", "LINEAR") not in {"LINEAR", "STEP"}:
            raise ValueError("CUBICSPLINE animation is not supported by the vault indexer")
        times = accessor(glb, sampler["input"])
        values = accessor(glb, sampler["output"])
        duration = max(duration, times[-1][0])
        tracks.setdefault(node, {})[path] = (times, values)
    return tracks, duration


def pose_at(glb: Glb, tracks: dict, time: float) -> dict[str, tuple[float, float, float]]:
    document = glb.document
    nodes = document.get("nodes", [])
    parent = parents(document)
    locals_: list[tuple[float, ...]] = []
    for index, node in enumerate(nodes):
        translation_ = tuple(node.get("translation", [0, 0, 0]))
        rotation = tuple(node.get("rotation", [0, 0, 0, 1]))
        scale = tuple(node.get("scale", [1, 1, 1]))
        node_tracks = tracks.get(index, {})
        if "translation" in node_tracks:
            translation_ = sample_track(*node_tracks["translation"], time, rotation=False)
        if "rotation" in node_tracks:
            rotation = sample_track(*node_tracks["rotation"], time, rotation=True)
        if "scale" in node_tracks:
            scale = sample_track(*node_tracks["scale"], time, rotation=False)
        locals_.append(trs(translation_, rotation, scale))
    world: list[tuple[float, ...] | None] = [None] * len(nodes)

    def solve(index: int) -> tuple[float, ...]:
        if world[index] is None:
            world[index] = mat_mul(solve(parent[index]), locals_[index]) if index in parent else locals_[index]
        return world[index]  # type: ignore[return-value]

    by_name = {node.get("name"): index for index, node in enumerate(nodes)}
    return {name: translation(solve(by_name[name])) for name in JOINTS}


def descriptor(pose: dict[str, tuple[float, float, float]]) -> dict:
    hips = pose["Hips"]
    scale = length(sub(pose["Head"], hips)) or 1.0
    positions = {
        name: [round(axis / scale, 6) for axis in sub(pose[name], hips)]
        for name in JOINTS
    }
    directions = {
        f"{start}>{end}": [round(axis, 6) for axis in unit(sub(pose[end], pose[start]))]
        for start, end in BONES
    }
    return {"positions": positions, "directions": directions}


def motion_energy(previous: dict | None, current: dict) -> float:
    if previous is None:
        return 0.0
    return sum(
        length(sub(tuple(current["positions"][name]), tuple(previous["positions"][name])))
        for name in JOINTS
    ) / len(JOINTS)


def descriptor_distance(a: dict, b: dict) -> float:
    return sum(
        length(sub(tuple(a["directions"][key]), tuple(b["directions"][key])))
        for key in a["directions"]
    ) / len(a["directions"])


def select_descriptors(probes: list[dict], count: int) -> list[dict]:
    if count >= len(probes):
        return probes
    selected = {0, len(probes) - 1}
    maxima = [
        index for index in range(1, len(probes) - 1)
        if probes[index]["energy"] >= probes[index - 1]["energy"]
        and probes[index]["energy"] > probes[index + 1]["energy"]
    ]
    for index in sorted(maxima, key=lambda item: probes[item]["energy"], reverse=True):
        if len(selected) >= count:
            break
        selected.add(index)
    while len(selected) < count:
        candidates = [index for index in range(len(probes)) if index not in selected]
        selected.add(max(
            candidates,
            key=lambda index: min(
                descriptor_distance(probes[index], probes[other])
                + abs(index - other) / len(probes) * 0.1
                for other in selected
            ),
        ))
    result = []
    for sample, probe_index in enumerate(sorted(selected)):
        item = dict(probes[probe_index])
        item["sample"] = sample
        item["probeIndex"] = probe_index
        result.append(item)
    return result


def inspect_entry(data: bytes, entry: str, samples: int, probe_samples: int) -> dict:
    glb = parse_glb(data)
    nodes = glb.document.get("nodes", [])
    names = {node.get("name") for node in nodes}
    missing = sorted(set(JOINTS) - names)
    if missing:
        raise ValueError(f"{entry}: missing canonical joints {missing}")
    animations = glb.document.get("animations", [])
    if len(animations) != 1:
        raise ValueError(f"{entry}: expected one animation, found {len(animations)}")
    animation = animations[0]
    tracks, duration = build_tracks(glb, animation)
    sample_times = [duration * index / max(1, probe_samples - 1) for index in range(probe_samples)]
    probes = []
    previous = None
    for index, time in enumerate(sample_times):
        current = descriptor(pose_at(glb, tracks, time))
        probes.append({
            "sample": index,
            "timeSeconds": round(time, 6),
            "energy": round(motion_energy(previous, current), 6),
            **current,
        })
        previous = current
    descriptors = select_descriptors(probes, samples)
    title = clip_title(entry)
    return {
        "id": slug(title),
        "title": title,
        "entry": entry,
        "sha256": sha256_bytes(data),
        "byteCount": len(data),
        "animation": animation.get("name", ""),
        "durationSeconds": round(duration, 6),
        "nodeCount": len(nodes),
        "skinJointCount": len({joint for skin in glb.document.get("skins", []) for joint in skin.get("joints", [])}),
        "channelCount": len(animation.get("channels", [])),
        "skeletonSha256": skeleton_signature(glb.document),
        "tags": tags_for(title),
        "samples": descriptors,
    }


def build(args: argparse.Namespace) -> None:
    archive = Path(args.archive).resolve()
    output = Path(args.out).resolve()
    with zipfile.ZipFile(archive) as source:
        entries = sorted(name for name in source.namelist() if name.lower().endswith(".glb"))
        clips = [
            inspect_entry(source.read(name), name, args.samples, args.probe_samples)
            for name in entries
        ]
    skeletons = sorted({clip["skeletonSha256"] for clip in clips})
    result = {
        "schema": SCHEMA,
        "status": "indexed-not-human-accepted",
        "tool": {"name": Path(__file__).name, "version": TOOL_VERSION},
        "createdAt": utc_now(),
        "source": {
            "uri": args.source_uri or archive.name,
            "name": archive.name,
            "sha256": sha256_file(archive),
            "byteCount": archive.stat().st_size,
            "driveFileId": args.drive_file_id,
            "driveMd5": args.drive_md5,
        },
        "contract": {
            "jointNames": list(JOINTS),
            "boneDirections": [f"{start}>{end}" for start, end in BONES],
            "sampleCountPerClip": args.samples,
            "probeCountPerClip": args.probe_samples,
            "retentionPolicy": "endpoints + energy extrema + farthest-pose sampling",
            "skeletonCount": len(skeletons),
            "skeletonSha256": skeletons[0] if len(skeletons) == 1 else None,
        },
        "clips": clips,
        "rejected": [],
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    if args.shard_size:
        shard_dir = output.parent / f"{output.stem}-shards"
        shard_dir.mkdir(parents=True, exist_ok=True)
        shards = []
        for start in range(0, len(clips), args.shard_size):
            shard_clips = clips[start : start + args.shard_size]
            shard_path = shard_dir / f"clips-{start // args.shard_size + 1:03d}.json"
            shard = {
                "schema": "pose-lab-v2-regnet-motion-vault-shard-v1",
                "sourceArchiveSha256": result["source"]["sha256"],
                "skeletonSha256": result["contract"]["skeletonSha256"],
                "clips": shard_clips,
            }
            shard_path.write_text(json.dumps(shard, indent=2) + "\n")
            shards.append({
                "path": str(shard_path.relative_to(output.parent)),
                "sha256": sha256_file(shard_path),
                "clipIds": [clip["id"] for clip in shard_clips],
            })
        result["clipCount"] = len(clips)
        result["shards"] = shards
        result["clips"] = []
    output.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({
        "output": str(output),
        "clips": len(clips),
        "skeletonCount": len(skeletons),
        "durationSeconds": round(sum(clip["durationSeconds"] for clip in clips), 3),
    }, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive")
    parser.add_argument("--out", required=True)
    parser.add_argument("--samples", type=int, default=24)
    parser.add_argument("--probe-samples", type=int, default=48)
    parser.add_argument("--drive-file-id")
    parser.add_argument("--drive-md5")
    parser.add_argument("--source-uri")
    parser.add_argument("--shard-size", type=int, default=0)
    args = parser.parse_args()
    if args.samples < 4 or args.samples > 120:
        parser.error("--samples must be between 4 and 120")
    if args.probe_samples < args.samples or args.probe_samples > 240:
        parser.error("--probe-samples must be between --samples and 240")
    if args.shard_size < 0 or args.shard_size > 100:
        parser.error("--shard-size must be between 0 and 100")
    build(args)


if __name__ == "__main__":
    main()
