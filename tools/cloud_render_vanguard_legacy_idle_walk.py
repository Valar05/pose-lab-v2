#!/usr/bin/env python3
"""Bake Vanguard's legacy Fleshpunk palette and render canonical Idle or Walk."""

from __future__ import annotations

import hashlib
import json
import math
import re
import struct
import sys
import zlib
from pathlib import Path

import bpy
from mathutils import Vector


RENDER_PROFILE = "vanguard-legacy-fleshpunk-v1"
COLOR_ATTRIBUTE = "VanguardLegacyColor"
SOURCE_GLB_SHA256 = (
    "5411b177525e69f0db8ad77175d8d60d4a0a6cac5abe10e5d47a2c62cbdeff94"
)
COLORED_GLB_SHA256 = (
    "83621917b56f90daa268682503c33eae72769434ce16915f25a2ddcbdd5aa046"
)
CLIPS = {
    "idle": {
        "action": "Idle",
        "frame_count": 6,
        "timing_ms": [170, 170, 160, 170, 170, 160],
        "camera_side": "right",
        "authority": (
            "accepted Fleshpunk Vanguard Idle: six uniform native loop samples "
            "over 1000 ms"
        ),
    },
    "walk": {
        "action": "WalkSwordCarryV2",
        "frame_count": 8,
        "timing_ms": [110, 90, 100, 110, 110, 90, 100, 110],
        "camera_side": "left",
        "authority": (
            "WalkSwordCarryV2 Candidate 003: eight authored in-place poses "
            "over 820 ms"
        ),
    },
}
PALETTE = {
    "plate_ivory": "#c8bca5",
    "plate_shadow": "#786f64",
    "underarmor": "#171416",
    "plume": "#8f1725",
    "cloth": "#4b1019",
    "eye": "#75e7e5",
    "steel": "#bec3c7",
}


def renderer_args() -> tuple[Path, Path, Path, Path]:
    values = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    if len(values) < 4:
        raise SystemExit(
            "Usage after --: input.glb output_dir settings.json "
            "script-output-manifest.json"
        )
    return tuple(Path(value).resolve() for value in values[:4])


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_debug_png(path: Path) -> None:
    width = height = 8
    scanline = b"\x00" + b"\xff\x00\xff\xff" * width
    payload = scanline * height

    def chunk(kind: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + kind
            + data
            + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)
        )

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(payload))
        + chunk(b"IEND", b"")
    )


def write_failure_manifest(exc: Exception) -> None:
    _asset, output_dir, _settings, script_manifest_path = renderer_args()
    output_dir.mkdir(parents=True, exist_ok=True)
    message = f"{type(exc).__name__}-{exc}"
    slug = re.sub(r"[^A-Za-z0-9_.-]+", "-", message).strip("-")[:160]
    debug_dir = output_dir / "debug"
    image_path = debug_dir / f"ERROR-{slug}.png"
    data_path = debug_dir / f"ERROR-{slug}.json"
    write_debug_png(image_path)
    data_path.write_text(
        json.dumps(
            {
                "schema": "pose-lab-v2-cloud-render-failure-v1",
                "status": "failed",
                "errorType": type(exc).__name__,
                "message": str(exc)[:1000],
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    relative_image = str(image_path.relative_to(output_dir))
    script_manifest_path.write_text(
        json.dumps(
            {
                "renderedFrames": [relative_image],
                "fixedCameraRenders": [relative_image],
                "diagnosticViewRenders": [relative_image],
                "nativePoseAnimationData": str(data_path.relative_to(output_dir)),
                "evidenceFrames": [0],
                "gifFrames": [0],
                "gifTimingMs": [1000],
                "renderProfile": RENDER_PROFILE,
                "grayOnWhiteAllowed": False,
                "failureDiagnostic": True,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


def hex_rgba(value: str) -> tuple[float, float, float, float]:
    raw = value.removeprefix("#")
    return tuple(int(raw[index : index + 2], 16) / 255.0 for index in (0, 2, 4)) + (
        1.0,
    )


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def select_armature() -> bpy.types.Object:
    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    if len(armatures) != 1:
        raise RuntimeError(
            f"Expected one Vanguard armature, found {[obj.name for obj in armatures]}"
        )
    return armatures[0]


def select_action(name: str) -> bpy.types.Action:
    exact = bpy.data.actions.get(name)
    if exact:
        return exact
    aliases = [action for action in bpy.data.actions if action.name == f"{name}_rig"]
    if len(aliases) != 1:
        raise RuntimeError(
            f"Expected one {name!r} action, found "
            f"{[action.name for action in bpy.data.actions]}"
        )
    return aliases[0]


def mesh_objects() -> list[bpy.types.Object]:
    meshes = [
        obj
        for obj in bpy.context.scene.objects
        if obj.type == "MESH" and not obj.hide_render
    ]
    if not meshes:
        raise RuntimeError("Vanguard imported no renderable mesh objects")
    return meshes


def is_weapon(obj: bpy.types.Object) -> bool:
    lowered = f"{obj.name} {getattr(obj.data, 'name', '')}".lower()
    return any(token in lowered for token in ("long_sword", "sword", "blade"))


def normalized_position(
    coordinate: Vector, lower: Vector, upper: Vector
) -> tuple[float, float, float]:
    span = upper - lower
    width_extent = max(abs(lower.x), abs(upper.x), 0.0001)
    height = (coordinate.z - lower.z) / max(span.z, 0.0001)
    width = abs(coordinate.x) / width_extent
    # Three.js' historical depth axis becomes Blender's inverted local Y.
    depth = (upper.y - coordinate.y) / max(span.y, 0.0001)
    return height, width, depth


def legacy_family(
    coordinate: Vector, lower: Vector, upper: Vector
) -> str:
    height, width, depth = normalized_position(coordinate, lower, upper)
    if height > 0.72 and depth > 0.72 and 0.08 < width < 0.34:
        return "eye"
    if height > 0.82 and (depth < 0.55 or width > 0.32):
        return "plume"
    if (
        (height < 0.36 and width < 0.34)
        or (0.34 < height < 0.68 and width < 0.18)
        or (height > 0.43 and width > 0.58)
    ):
        return "underarmor"
    if depth < 0.18 and height < 0.72:
        return "plate_shadow"
    if 0.34 < height < 0.72 and depth < 0.42 and width > 0.34:
        return "cloth"
    return "plate_ivory"


def ensure_vertex_material(
    obj: bpy.types.Object, attribute_name: str, metallic: float, roughness: float
) -> None:
    material = bpy.data.materials.new(f"{obj.name}_{RENDER_PROFILE}")
    material.use_nodes = True
    material.metallic = metallic
    material.roughness = roughness
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    principled = nodes.get("Principled BSDF")
    vertex = nodes.new("ShaderNodeVertexColor")
    vertex.layer_name = attribute_name
    if principled:
        links.new(vertex.outputs["Color"], principled.inputs["Base Color"])
        principled.inputs["Metallic"].default_value = metallic
        principled.inputs["Roughness"].default_value = roughness
    obj.data.materials.clear()
    obj.data.materials.append(material)


def bake_vertex_colors(meshes: list[bpy.types.Object]) -> dict[str, object]:
    assignments: dict[str, dict[str, int]] = {}
    for obj in meshes:
        positions = obj.data.vertices
        if not positions:
            raise RuntimeError(f"{obj.name} has no vertices")
        lower = Vector(
            (
                min(vertex.co.x for vertex in positions),
                min(vertex.co.y for vertex in positions),
                min(vertex.co.z for vertex in positions),
            )
        )
        upper = Vector(
            (
                max(vertex.co.x for vertex in positions),
                max(vertex.co.y for vertex in positions),
                max(vertex.co.z for vertex in positions),
            )
        )
        existing = obj.data.color_attributes.get(COLOR_ATTRIBUTE)
        if existing:
            obj.data.color_attributes.remove(existing)
        layer = obj.data.color_attributes.new(
            name=COLOR_ATTRIBUTE, type="FLOAT_COLOR", domain="POINT"
        )
        family_counts: dict[str, int] = {}
        for vertex in positions:
            family = "steel" if is_weapon(obj) else legacy_family(
                vertex.co, lower, upper
            )
            layer.data[vertex.index].color = hex_rgba(PALETTE[family])
            family_counts[family] = family_counts.get(family, 0) + 1
        obj.data.color_attributes.active_color = layer
        obj.data.color_attributes.active = layer
        ensure_vertex_material(
            obj,
            COLOR_ATTRIBUTE,
            metallic=0.72 if is_weapon(obj) else 0.22,
            roughness=0.30 if is_weapon(obj) else 0.62,
        )
        assignments[obj.name] = family_counts

    required = {"plate_ivory", "underarmor", "plume"}
    body_families = {
        family
        for obj, counts in assignments.items()
        if not any(token in obj.lower() for token in ("sword", "blade"))
        for family, count in counts.items()
        if count > 0
    }
    missing = sorted(required - body_families)
    if missing:
        raise RuntimeError(
            f"Legacy Vanguard color bake failed closed; missing families {missing}"
        )
    return {
        "attribute": COLOR_ATTRIBUTE,
        "palette": PALETTE,
        "assignments": assignments,
        "source": "baked_in_this_job",
    }


def use_exported_vertex_colors(
    meshes: list[bpy.types.Object],
) -> dict[str, object]:
    assignments: dict[str, dict[str, object]] = {}
    body_distinct: set[tuple[float, float, float]] = set()
    body_chromatic = 0
    for obj in meshes:
        layer = obj.data.color_attributes.get(COLOR_ATTRIBUTE)
        if layer is None:
            layer = obj.data.color_attributes.active_color
        if layer is None and obj.data.color_attributes:
            layer = obj.data.color_attributes[0]
        if layer is None:
            raise RuntimeError(
                f"{obj.name} lost its exported vertex-color attribute"
            )
        obj.data.color_attributes.active_color = layer
        obj.data.color_attributes.active = layer
        ensure_vertex_material(
            obj,
            layer.name,
            metallic=0.72 if is_weapon(obj) else 0.22,
            roughness=0.30 if is_weapon(obj) else 0.62,
        )
        colors = [
            tuple(round(float(channel), 4) for channel in datum.color[:3])
            for datum in layer.data
        ]
        distinct = set(colors)
        chromatic = sum(
            1 for color in colors if max(color) - min(color) >= 0.08
        )
        if not is_weapon(obj):
            body_distinct.update(distinct)
            body_chromatic += chromatic
        assignments[obj.name] = {
            "attribute": layer.name,
            "domain": layer.domain,
            "dataType": layer.data_type,
            "sampleCount": len(colors),
            "distinctColorCount": len(distinct),
            "chromaticSampleCount": chromatic,
        }

    if len(body_distinct) < 4 or body_chromatic == 0:
        raise RuntimeError(
            "Exported Vanguard candidate failed closed: vertex colors are "
            "missing, flattened, or achromatic; "
            f"bodyDistinct={len(body_distinct)} "
            f"bodyChromaticSamples={body_chromatic} "
            f"layers={assignments}"
        )
    return {
        "attribute": COLOR_ATTRIBUTE,
        "palette": PALETTE,
        "assignments": assignments,
        "source": "verified_from_exported_candidate",
        "bodyDistinctColorCount": len(body_distinct),
        "bodyChromaticSampleCount": body_chromatic,
    }


def action_frames(action: bpy.types.Action, clip: str) -> list[float]:
    start, end = (float(value) for value in action.frame_range)
    count = int(CLIPS[clip]["frame_count"])
    if end <= start:
        raise RuntimeError(f"{action.name} has invalid frame range {[start, end]}")
    if clip == "idle":
        return [start + (end - start) * index / count for index in range(count)]
    expected = [start + index for index in range(count)]
    if expected[-1] > end + 0.0001:
        raise RuntimeError(
            f"{action.name} cannot supply eight authored keys from {[start, end]}"
        )
    return expected


def require_in_place(action: bpy.types.Action, armature: bpy.types.Object) -> None:
    root_names = {
        bone.name for bone in armature.pose.bones if bone.name.lower() == "root"
    }
    paths = {"location"} | {
        f'pose.bones["{name}"].location' for name in root_names
    }
    failures = []
    for curve in action.fcurves:
        if curve.data_path not in paths:
            continue
        values = [float(point.co.y) for point in curve.keyframe_points]
        if values and max(values) - min(values) > 0.00001:
            failures.append(
                {
                    "path": curve.data_path,
                    "axis": curve.array_index,
                    "range": max(values) - min(values),
                }
            )
    if failures:
        raise RuntimeError(
            f"{action.name} contains forbidden root travel: {failures}"
        )


def set_pose(
    scene: bpy.types.Scene,
    armature: bpy.types.Object,
    frame: float,
) -> None:
    scene.frame_set(int(frame), subframe=frame - int(frame))
    armature.location = (0.0, 0.0, 0.0)
    bpy.context.view_layer.update()


def evaluated_vertices(obj: bpy.types.Object) -> list[Vector]:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    try:
        matrix = evaluated.matrix_world
        return [matrix @ vertex.co for vertex in mesh.vertices]
    finally:
        evaluated.to_mesh_clear()


def sampled_bounds(
    scene: bpy.types.Scene,
    armature: bpy.types.Object,
    meshes: list[bpy.types.Object],
    frames: list[float],
) -> tuple[Vector, Vector]:
    lower = Vector((math.inf, math.inf, math.inf))
    upper = Vector((-math.inf, -math.inf, -math.inf))
    for frame in frames:
        set_pose(scene, armature, frame)
        for obj in meshes:
            for point in evaluated_vertices(obj):
                for axis in range(3):
                    lower[axis] = min(lower[axis], point[axis])
                    upper[axis] = max(upper[axis], point[axis])
    return lower, upper


def make_camera(scene: bpy.types.Scene) -> bpy.types.Object:
    data = bpy.data.cameras.new("VanguardLegacyLockedSide")
    data.type = "ORTHO"
    data.lens = 50
    camera = bpy.data.objects.new("VanguardLegacyLockedSide", data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    return camera


def lock_lateral(
    camera: bpy.types.Object,
    side: str,
    lower: Vector,
    upper: Vector,
    aspect: float,
) -> None:
    center = (lower + upper) * 0.5
    span = upper - lower
    visible_width = span.y
    visible_height = span.z
    camera.data.ortho_scale = max(
        visible_height * 1.16, (visible_width / aspect) * 1.16
    )
    distance = max(span.x, visible_width, visible_height) * 3.0 + 3.0
    x = lower.x - distance if side == "left" else upper.x + distance
    camera.location = Vector((x, center.y, center.z))
    camera.rotation_euler = (center - camera.location).to_track_quat(
        "-Z", "Y"
    ).to_euler()
    bpy.context.view_layer.update()


def lock_front(
    camera: bpy.types.Object,
    lower: Vector,
    upper: Vector,
    aspect: float,
) -> None:
    center = (lower + upper) * 0.5
    span = upper - lower
    camera.data.ortho_scale = max(span.z * 1.16, (span.x / aspect) * 1.16)
    distance = max(span.x, span.y, span.z) * 3.0 + 3.0
    camera.location = Vector((center.x, lower.y - distance, center.z))
    camera.rotation_euler = (center - camera.location).to_track_quat(
        "-Z", "Y"
    ).to_euler()
    bpy.context.view_layer.update()


def matrix_rows(matrix) -> list[list[float]]:
    return [[round(float(value), 9) for value in row] for row in matrix]


def configure_render(
    scene: bpy.types.Scene, width: int, height: int
) -> None:
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.film_transparent = True
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "VERTEX"
    scene.display.shading.show_shadows = False
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "WORLD"


def render_pose(
    scene: bpy.types.Scene,
    armature: bpy.types.Object,
    frame: float,
    path: Path,
) -> None:
    set_pose(scene, armature, frame)
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    if not path.is_file():
        raise RuntimeError(f"Blender did not write {path}")


def glb_animation_names(path: Path) -> list[str]:
    with path.open("rb") as handle:
        header = handle.read(12)
        if len(header) != 12:
            raise RuntimeError(f"{path.name} has a truncated GLB header")
        magic, version, _length = struct.unpack("<4sII", header)
        if magic != b"glTF" or version != 2:
            raise RuntimeError(f"{path.name} is not a GLB v2 file")
        chunk_header = handle.read(8)
        if len(chunk_header) != 8:
            raise RuntimeError(f"{path.name} has no JSON chunk")
        chunk_length, chunk_type = struct.unpack("<II", chunk_header)
        if chunk_type != 0x4E4F534A:
            raise RuntimeError(f"{path.name} does not begin with a JSON chunk")
        document = json.loads(
            handle.read(chunk_length).decode("utf-8").rstrip("\x00 ")
        )
    return [
        str(animation.get("name", ""))
        for animation in document.get("animations", [])
    ]


def export_candidate(path: Path) -> dict[str, object]:
    supported = {
        prop.identifier for prop in bpy.ops.export_scene.gltf.get_rna_type().properties
    }
    options: dict[str, object] = {
        "filepath": str(path),
        "export_format": "GLB",
        "export_animations": True,
        "export_current_frame": False,
        "export_materials": "EXPORT",
        "export_attributes": True,
    }
    optional = {
        "export_animation_mode": "ACTIONS",
        "export_all_armature_actions": True,
        "export_nla_strips": True,
        "export_anim_single_armature": True,
        "export_vertex_color": "ACTIVE",
        "export_all_vertex_colors": True,
        "export_active_vertex_color_when_no_material": True,
    }
    for key, value in optional.items():
        if key in supported:
            options[key] = value
    bpy.ops.export_scene.gltf(**options)
    if not path.is_file():
        raise RuntimeError(f"Blender did not export candidate {path}")
    animation_names = glb_animation_names(path)
    required = {"Idle", "WalkSwordCarryV2"}
    present = {
        name if name in required else name.split(".", 1)[0]
        for name in animation_names
        if name in required or name.split(".", 1)[0] in required
    }
    missing = sorted(required - present)
    if missing:
        raise RuntimeError(
            "Exported Vanguard candidate lost required legacy actions "
            f"{missing}; present animations are {animation_names}"
        )
    return {
        "animationNames": animation_names,
        "exportOptions": {
            key: value for key, value in options.items() if key != "filepath"
        },
    }


def main() -> None:
    asset, output_dir, settings_path, script_manifest_path = renderer_args()
    settings = json.loads(settings_path.read_text(encoding="utf-8"))
    asset_sha256 = sha256(asset)
    if asset_sha256 == SOURCE_GLB_SHA256:
        clip = "idle"
    elif asset_sha256 == COLORED_GLB_SHA256:
        clip = "walk"
    else:
        raise RuntimeError(
            "Legacy Vanguard recipe accepts only the pinned golden source or "
            f"its pinned colored candidate, received {asset_sha256}"
        )
    width = int(settings.get("width", 512))
    height = int(settings.get("height", 512))
    # Idle is the single appearance-bake lane. The dispatcher intentionally
    # sanitizes unknown settings, so candidate export cannot depend on an
    # optional request flag. Walk consumes this immutable candidate and remains
    # render-only.
    export_glb = clip == "idle"
    if width != 512 or height != 512:
        raise RuntimeError(
            f"Legacy Pose Lab frame space is locked to 512x512, got {width}x{height}"
        )
    if not asset.is_file():
        raise FileNotFoundError(asset)

    output_dir.mkdir(parents=True, exist_ok=True)
    frames_dir = output_dir / clip / "frames"
    diagnostic_dir = output_dir / clip / "diagnostic"
    frames_dir.mkdir(parents=True, exist_ok=True)
    diagnostic_dir.mkdir(parents=True, exist_ok=True)

    clear_scene()
    bpy.ops.import_scene.gltf(filepath=str(asset))
    scene = bpy.context.scene
    armature = select_armature()
    meshes = mesh_objects()
    weapons = [obj for obj in meshes if is_weapon(obj)]
    if len(weapons) != 1:
        raise RuntimeError(
            f"Expected one embedded Long_Sword, found {[obj.name for obj in weapons]}"
        )
    action = select_action(str(CLIPS[clip]["action"]))
    armature.animation_data_create()
    armature.animation_data.action = action
    require_in_place(action, armature)
    frames = action_frames(action, clip)
    color_record = (
        bake_vertex_colors(meshes)
        if clip == "idle"
        else use_exported_vertex_colors(meshes)
    )
    configure_render(scene, width, height)

    lower, upper = sampled_bounds(scene, armature, meshes, frames)
    camera = make_camera(scene)
    camera_side = str(CLIPS[clip]["camera_side"])
    lock_lateral(camera, camera_side, lower, upper, width / height)
    side_matrix = matrix_rows(camera.matrix_world)
    side_scale = round(float(camera.data.ortho_scale), 9)

    rendered: list[str] = []
    for index, frame in enumerate(frames):
        path = frames_dir / f"{clip}_{index:04d}.png"
        render_pose(scene, armature, frame, path)
        rendered.append(str(path.relative_to(output_dir)))

    opposite = "right" if camera_side == "left" else "left"
    lock_lateral(camera, opposite, lower, upper, width / height)
    opposite_path = diagnostic_dir / f"{opposite}_{clip}_contact.png"
    render_pose(scene, armature, frames[len(frames) // 2], opposite_path)
    opposite_matrix = matrix_rows(camera.matrix_world)

    lock_front(camera, lower, upper, width / height)
    front_path = diagnostic_dir / f"front_{clip}_contact.png"
    render_pose(scene, armature, frames[len(frames) // 2], front_path)
    front_matrix = matrix_rows(camera.matrix_world)

    candidate_path = output_dir / "vanguard_legacy_fleshpunk_v1.glb"
    candidate_export = None
    if export_glb:
        armature.animation_data.action = action
        candidate_export = export_candidate(candidate_path)

    native = {
        "schema": "pose-lab-v2-vanguard-legacy-color-evidence-v1",
        "status": "quarantined",
        "source": {
            "repository": "Valar05/pose-lab-v2",
            "asset": (
                "public/assets/vanguard/steel/candidates/"
                "walk-sword-carry-v2/attempt-003/"
                "vanguard_walk_sword_carry_v2.glb"
            ),
            "assetSha256": asset_sha256,
            "action": action.name,
            "actionFrameRange": [
                round(float(action.frame_range[0]), 6),
                round(float(action.frame_range[1]), 6),
            ],
        },
        "contract": {
            "lane": "appearance-only vertex-color bake",
            "poseAuthority": CLIPS[clip]["authority"],
            "clip": clip,
            "frameCount": len(frames),
            "timingMs": CLIPS[clip]["timing_ms"],
            "screenFacing": "right",
            "camera": "historical locked orthographic side policy",
            "rootTravel": False,
            "poseEdits": False,
            "retiming": False,
            "retargeting": False,
            "mirroring": False,
            "perFrameReframing": False,
            "weaponMode": "embedded",
            "weaponMesh": weapons[0].name,
            "renderProfile": RENDER_PROFILE,
            "grayOnWhiteAllowed": False,
            "modelBytesReturnedToChat": False,
            "candidateExported": export_glb,
            "humanVerdict": "pending",
        },
        "sampleFrames": [round(frame, 6) for frame in frames],
        "color": color_record,
        "camera": {
            "side": camera_side,
            "matrixWorld": side_matrix,
            "orthoScale": side_scale,
            "oppositeDiagnosticMatrixWorld": opposite_matrix,
            "frontDiagnosticMatrixWorld": front_matrix,
        },
        "render": {
            "width": width,
            "height": height,
            "transparentRgba": True,
            "engine": scene.render.engine,
            "blenderVersion": bpy.app.version_string,
        },
        "candidate": (
            {
                "path": candidate_path.name,
                "sha256": sha256(candidate_path),
                "status": "quarantined",
                **candidate_export,
            }
            if export_glb
            else None
        ),
    }
    native_path = output_dir / f"{clip}-legacy-evidence.json"
    native_path.write_text(json.dumps(native, indent=2) + "\n", encoding="utf-8")

    script_manifest = {
        "renderedFrames": rendered,
        "fixedCameraRenders": rendered,
        "diagnosticViewRenders": [
            str(opposite_path.relative_to(output_dir)),
            str(front_path.relative_to(output_dir)),
        ],
        "nativePoseAnimationData": str(native_path.relative_to(output_dir)),
        "frameDurationsMs": CLIPS[clip]["timing_ms"],
        "authoredKeys": list(range(len(frames))) if clip == "walk" else [],
        "evidenceFrames": list(range(len(frames))),
        "gifFrames": list(range(len(frames))),
        "gifTimingMs": CLIPS[clip]["timing_ms"],
        "renderProfile": RENDER_PROFILE,
        "grayOnWhiteAllowed": False,
    }
    if export_glb:
        script_manifest["animatedGlb"] = candidate_path.name
    script_manifest_path.write_text(
        json.dumps(script_manifest, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "status": "PASS",
                "clip": clip,
                "frames": len(rendered),
                "renderProfile": RENDER_PROFILE,
                "candidateExported": export_glb,
                "assetSha256": asset_sha256,
            }
        )
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        write_failure_manifest(error)
        print(
            json.dumps(
                {
                    "status": "FAIL",
                    "errorType": type(error).__name__,
                    "message": str(error)[:1000],
                }
            )
        )
