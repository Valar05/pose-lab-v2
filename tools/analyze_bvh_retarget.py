#!/usr/bin/env python3
"""Produce deterministic rig evidence for the BVH retarget spike.

This intentionally does not need Blender. It inspects the JSON chunk in each
GLB so the expensive Blender pass begins from a checked skeleton contract.
"""

from __future__ import annotations

import argparse
import json
import struct
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "public/assets/vanguard/vanguard_rigged_animations.glb"
DEFAULT_TARGET = ROOT / "public/assets/crimson/crimson_plume_knight_rigged_pbr.glb"
DEFAULT_MAP = ROOT / "experiments/bvh-retarget/bone-map.json"
DEFAULT_OUTPUT = ROOT / "experiments/bvh-retarget/rig-diff.json"


def read_glb_json(path: Path) -> dict:
    data = path.read_bytes()
    if len(data) < 20 or data[:4] != b"glTF":
        raise ValueError(f"{path} is not a GLB")
    version, total_length = struct.unpack_from("<II", data, 4)
    if version != 2 or total_length != len(data):
        raise ValueError(f"{path} has an invalid GLB header")
    offset = 12
    while offset < len(data):
        chunk_length, chunk_type = struct.unpack_from("<II", data, offset)
        offset += 8
        chunk = data[offset : offset + chunk_length]
        offset += chunk_length
        if chunk_type == 0x4E4F534A:
            return json.loads(chunk.rstrip(b"\x00 \t\r\n"))
    raise ValueError(f"{path} has no JSON chunk")


def node_parents(document: dict) -> dict[int, int]:
    parents: dict[int, int] = {}
    for parent_index, node in enumerate(document.get("nodes", [])):
        for child_index in node.get("children", []):
            parents[child_index] = parent_index
    return parents


def inspect(document: dict, clip_name: str | None) -> dict:
    nodes = document.get("nodes", [])
    names = {node.get("name", "") for node in nodes}
    parents = node_parents(document)
    skin_joints = {
        joint
        for skin in document.get("skins", [])
        for joint in skin.get("joints", [])
    }
    animation = next(
        (entry for entry in document.get("animations", []) if entry.get("name") == clip_name),
        None,
    )
    tracked_nodes: set[int] = set()
    channel_paths: dict[str, set[str]] = {}
    for channel in (animation or {}).get("channels", []):
        target = channel.get("target", {})
        node_index = target.get("node")
        if node_index is None:
            continue
        tracked_nodes.add(node_index)
        name = nodes[node_index].get("name", f"node-{node_index}")
        channel_paths.setdefault(name, set()).add(target.get("path", ""))

    return {
        "nodeCount": len(nodes),
        "skinJointCount": len(skin_joints),
        "rootNodes": [
            {
                "name": node.get("name", f"node-{index}"),
                "translation": node.get("translation", [0, 0, 0]),
                "rotation": node.get("rotation", [0, 0, 0, 1]),
                "scale": node.get("scale", [1, 1, 1]),
            }
            for index, node in enumerate(nodes)
            if index not in parents
        ],
        "animations": [entry.get("name", "") for entry in document.get("animations", [])],
        "selectedClip": clip_name,
        "selectedClipFound": animation is not None if clip_name else None,
        "selectedClipChannelCount": len((animation or {}).get("channels", [])),
        "selectedClipTrackedNodeCount": len(tracked_nodes),
        "selectedClipTrackPaths": {
            name: sorted(paths) for name, paths in sorted(channel_paths.items())
        },
        "parentByName": {
            node.get("name", f"node-{index}"): (
                nodes[parents[index]].get("name", f"node-{parents[index]}")
                if index in parents else None
            )
            for index, node in enumerate(nodes)
        },
        "_names": names,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--target", type=Path, default=DEFAULT_TARGET)
    parser.add_argument("--bone-map", type=Path, default=DEFAULT_MAP)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    mapping = json.loads(args.bone_map.read_text())
    source = inspect(read_glb_json(args.source), mapping["source"]["clip"])
    target = inspect(read_glb_json(args.target), None)

    missing_source = {
        canonical: node
        for canonical, node in mapping["source"]["map"].items()
        if node is not None and node not in source["_names"]
    }
    missing_target = {
        canonical: node
        for canonical, node in mapping["target"]["map"].items()
        if node is not None and node not in target["_names"]
    }
    source.pop("_names")
    target.pop("_names")

    report = {
        "schema": "pose-lab-v2-bvh-rig-diff-v1",
        "sourceAsset": str(args.source.relative_to(ROOT)),
        "targetAsset": str(args.target.relative_to(ROOT)),
        "source": source,
        "target": target,
        "canonicalJointCount": len(mapping["source"]["map"]),
        "mapping": {
            "missingSourceNodes": missing_source,
            "missingTargetNodes": missing_target,
            "complete": not missing_source and not missing_target,
            "intentionalSourceGaps": {
                key: value
                for key, value in mapping["source"]["map"].items()
                if value is None
            },
        },
        "diagnosis": [
            "Vanguard SwordAttack1 animates the complete exported Rigify graph, not a game-sized deform skeleton.",
            "Crimson exposes a small direct hierarchy and cannot consume Vanguard control/mechanism channels by name or local basis.",
            "The rigs use different rest orientations, hierarchy density, twist distribution, root conventions, and apparent units.",
            "A canonical proxy sampled from evaluated ORG bones is required before BVH export; direct Vanguard-to-BVH export preserves the wrong complexity.",
            "DEF segments are downstream deformation evidence, not interchange joints.",
            "BVH can carry canonical joint motion but cannot carry weapon closure, contacts, constraints, or armor correction."
        ],
        "status": "ready-for-blender-proxy-bake"
        if not missing_source and not missing_target
        else "blocked-by-missing-map-nodes",
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({
        "ok": report["status"] == "ready-for-blender-proxy-bake",
        "output": str(args.output.relative_to(ROOT)),
        "sourceNodes": source["nodeCount"],
        "sourceAnimatedNodes": source["selectedClipTrackedNodeCount"],
        "targetNodes": target["nodeCount"],
        "mappingComplete": report["mapping"]["complete"],
    }, indent=2))
    return 0 if report["mapping"]["complete"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
