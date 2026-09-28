#!/usr/bin/env python3
"""Render selected authored keyframes from one embedded action as beauty PNGs only.

This is the lightweight visual-selection lane. It intentionally does NOT render
silhouette, limb-id, depth, geometry overlays, or multi-action master atlases.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Iterable

TOOL_DIR = Path(__file__).resolve().parent
if str(TOOL_DIR) not in sys.path:
    sys.path.insert(0, str(TOOL_DIR))

import bpy
from bpy_extras import anim_utils

from render_animation_pose_packet import (
    clear_scene,
    evaluated_world_vertices,
    lock_camera,
    make_camera,
    render_frame,
    sampled_bounds,
    select_armature,
    set_native_pose,
    suppress_root_motion,
)


def cli_args() -> argparse.Namespace:
    argv = sys.argv
    argv = argv[argv.index("--") + 1 :] if "--" in argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--asset", required=True)
    parser.add_argument("--action", required=True)
    parser.add_argument("--out-dir", required=True)
    selection = parser.add_mutually_exclusive_group(required=True)
    selection.add_argument("--key-indices")
    selection.add_argument("--all-keyframes", action="store_true")
    parser.add_argument("--camera-side", choices=("left", "right"), required=True)
    parser.add_argument("--width", type=int, default=512)
    parser.add_argument("--height", type=int, default=512)
    parser.add_argument("--source-fps", type=float, default=60.0)
    return parser.parse_args(argv)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def normalized_action_name(name: str) -> str:
    return re.sub(r"(?:_Armature|_rig)$", "", name, flags=re.IGNORECASE).lower()


def resolve_action(name: str) -> bpy.types.Action:
    exact = bpy.data.actions.get(name)
    if exact:
        return exact
    direct = [
        bpy.data.actions.get(f"{name}_Armature"),
        bpy.data.actions.get(f"{name}_rig"),
    ]
    direct = [item for item in direct if item is not None]
    if len(direct) == 1:
        return direct[0]
    target = normalized_action_name(name)
    matches = [
        action for action in bpy.data.actions
        if normalized_action_name(action.name) == target
    ]
    if len(matches) != 1:
        raise RuntimeError(
            f"Expected exactly one action matching {name!r}; "
            f"found {[action.name for action in bpy.data.actions]}"
        )
    return matches[0]


def action_fcurves(
    action: bpy.types.Action,
    armature: bpy.types.Object,
) -> Iterable[bpy.types.FCurve]:
    armature.animation_data_create()
    armature.animation_data.action = action
    action_slot = getattr(armature.animation_data, "action_slot", None)
    get_channelbag = getattr(anim_utils, "action_get_channelbag_for_slot", None)
    if action_slot is not None and get_channelbag is not None:
        channelbag = get_channelbag(action, action_slot)
        if channelbag is not None:
            return list(channelbag.fcurves)
    return list(action.fcurves)


def authored_keyframes(
    action: bpy.types.Action,
    armature: bpy.types.Object,
) -> list[float]:
    values: set[float] = set()
    for curve in action_fcurves(action, armature):
        for point in curve.keyframe_points:
            values.add(round(float(point.co.x), 6))
    result = sorted(values)
    if not result:
        raise RuntimeError(f"Action {action.name!r} has no authored keyframes")
    return result


def configure_fast_base_color_review(scene, mesh_objects):
    """Render actual base-color textures without PBR lighting."""
    engine_items = {
        item.identifier
        for item in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items
    }
    engine = next(
        (name for name in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE") if name in engine_items),
        None,
    )
    if engine is None:
        raise RuntimeError(f"No supported Eevee engine available: {sorted(engine_items)}")
    scene.render.engine = engine
    scene.render.film_transparent = True

    converted = 0
    for obj in mesh_objects:
        for slot in obj.material_slots:
            mat = slot.material
            if mat is None or not mat.use_nodes or mat.node_tree is None:
                continue
            nt = mat.node_tree
            output = next((n for n in nt.nodes if n.type == "OUTPUT_MATERIAL" and n.is_active_output), None)
            if output is None:
                output = next((n for n in nt.nodes if n.type == "OUTPUT_MATERIAL"), None)
            principled = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
            if output is None or principled is None:
                continue
            base = principled.inputs.get("Base Color")
            source = base.links[0].from_socket if base and base.is_linked and base.links else None
            default = tuple(base.default_value) if base else (0.8, 0.8, 0.8, 1.0)
            emission = nt.nodes.new("ShaderNodeEmission")
            emission.inputs["Strength"].default_value = 1.0
            emission.inputs["Color"].default_value = default
            if source is not None:
                nt.links.new(source, emission.inputs["Color"])
            surface = output.inputs.get("Surface")
            if surface is None:
                continue
            for link in list(surface.links):
                nt.links.remove(link)
            nt.links.new(emission.outputs["Emission"], surface)
            converted += 1
    if converted == 0:
        raise RuntimeError("No materials converted to base-color review shading")
    return converted


def main() -> None:
    args = cli_args()
    asset = Path(args.asset).resolve()
    out_dir = Path(args.out_dir).resolve()
    if not asset.is_file():
        raise FileNotFoundError(asset)
    if args.width <= 0 or args.height <= 0:
        raise RuntimeError("width and height must be positive")
    if args.source_fps <= 0:
        raise RuntimeError("source fps must be positive")

    requested_indices = None
    if args.key_indices is not None:
        requested_indices = [
            int(value.strip())
            for value in args.key_indices.split(",")
            if value.strip()
        ]
        if not requested_indices:
            raise RuntimeError("--key-indices must select at least one authored key")
        if len(set(requested_indices)) != len(requested_indices):
            raise RuntimeError("--key-indices contains duplicates")
        if any(index < 0 for index in requested_indices):
            raise RuntimeError("--key-indices must be non-negative")

    clear_scene()
    bpy.ops.import_scene.gltf(filepath=str(asset))
    scene = bpy.context.scene
    armature = select_armature()
    action = resolve_action(args.action)
    armature.animation_data_create()
    armature.animation_data.action = action
    muted_root_curves = suppress_root_motion(action, armature)

    keys = authored_keyframes(action, armature)
    if args.all_keyframes:
        requested_indices = list(range(len(keys)))
    assert requested_indices is not None
    missing = [index for index in requested_indices if index >= len(keys)]
    if missing:
        raise RuntimeError(
            f"Requested key indices {missing} exceed {len(keys)} authored keys "
            f"for {action.name!r}"
        )
    render_frames = [keys[index] for index in requested_indices]

    mesh_objects = [
        obj for obj in scene.objects
        if obj.type == "MESH" and not obj.hide_render
    ]
    if not mesh_objects:
        raise RuntimeError("Source asset imported no renderable mesh objects")

    scene.render.resolution_x = args.width
    scene.render.resolution_y = args.height
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.fps = round(args.source_fps)
    converted_materials = configure_fast_base_color_review(scene, mesh_objects)

    lower, upper = sampled_bounds(
        scene,
        armature,
        mesh_objects,
        render_frames,
    )
    camera = make_camera(scene)
    lock_camera(
        camera,
        args.camera_side,
        lower,
        upper,
        args.width / args.height,
    )

    out_dir.mkdir(parents=True, exist_ok=True)
    records = []
    for output_index, (key_index, frame) in enumerate(
        zip(requested_indices, render_frames)
    ):
        set_native_pose(scene, armature, frame)
        path = out_dir / f"k{key_index:02d}.png"
        render_frame(scene, path)
        records.append(
            {
                "outputIndex": output_index,
                "keyIndex": key_index,
                "blenderFrame": frame,
                "image": path.name,
                "sha256": sha256(path),
            }
        )

    manifest = {
        "schema": "pose-lab-selected-action-beauty-v1",
        "status": "PASS",
        "renderPolicy": (
            "beauty-only-all-authored-keyframes"
            if args.all_keyframes
            else "beauty-only-selected-authored-keyframes"
        ),
        "asset": str(asset),
        "assetSha256": sha256(asset),
        "actionRequested": args.action,
        "actionResolved": action.name,
        "authoredKeyframeCount": len(keys),
        "selectedKeyIndices": requested_indices,
        "selectedBlenderFrames": render_frames,
        "cameraSide": f"model-{args.camera_side}",
        "resolution": [args.width, args.height],
        "rootMotionSuppressed": True,
        "appearance": "base-color-textures-only",
        "renderer": scene.render.engine,
        "convertedMaterialCount": converted_materials,
        "mutedRootMotionCurves": muted_root_curves,
        "frames": records,
    }
    manifest_path = out_dir / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    print(
        json.dumps(
            {
                "status": "PASS",
                "action": action.name,
                "rendered": len(records),
                "authoredKeyframeCount": len(keys),
                "keyIndices": requested_indices,
                "resolution": [args.width, args.height],
                "cameraSide": args.camera_side,
                "passes": ["beauty"],
                "appearance": "base-color-textures-only",
                "renderer": scene.render.engine,
                "outDir": str(out_dir),
            }
        )
    )


if __name__ == "__main__":
    main()
