#!/usr/bin/env python3
"""Import reviewed Grounded Motion evidence into a Vanguard-specific Blender 2.5D canary.

Blender is the only authoring and rendering runtime. This script does not infer motion,
change reviewed detector evidence, mirror pixels, smooth events, or generate in-betweens.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

SELECTED_BODY = (
    "nose", "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
    "left_wrist", "right_wrist", "left_hip", "right_hip", "left_knee",
    "right_knee", "left_ankle", "right_ankle", "left_heel", "right_heel",
    "left_big_toe", "right_big_toe", "left_small_toe", "right_small_toe",
)
BODY_EDGES = (
    ("left_shoulder", "right_shoulder"), ("left_shoulder", "left_elbow"),
    ("left_elbow", "left_wrist"), ("right_shoulder", "right_elbow"),
    ("right_elbow", "right_wrist"), ("left_shoulder", "left_hip"),
    ("right_shoulder", "right_hip"), ("left_hip", "right_hip"),
    ("left_hip", "left_knee"), ("left_knee", "left_ankle"),
    ("right_hip", "right_knee"), ("right_knee", "right_ankle"),
    ("left_ankle", "left_heel"), ("left_ankle", "left_big_toe"),
    ("right_ankle", "right_heel"), ("right_ankle", "right_big_toe"),
)
CORRECTIVE_ATTACHMENTS = (
    "breastplate_turn_3q", "overhead_two_hand_grip", "rear_boot_foreshortened"
)


def args_after_separator() -> list[str]:
    return sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--reviewed-track", required=True)
    parser.add_argument("--reviewed-track-set", required=True)
    parser.add_argument("--raw-predictions", required=True)
    parser.add_argument("--event-map", required=True)
    parser.add_argument("--source-frame", required=True)
    parser.add_argument("--overlay-frame", required=True)
    parser.add_argument("--motion-witness-frame", required=True)
    parser.add_argument("--idle-frame", required=True)
    parser.add_argument("--config", required=True)
    parser.add_argument("--weapon-track", required=True)
    parser.add_argument("--part-library", required=True)
    parser.add_argument("--constraint-ledger", required=True)
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--blend-name", default="Vanguard_Muramasa_Style_2p5D_Puppet_Canary_001.blend")
    return parser.parse_args(args_after_separator())


def load_json(path: str | Path) -> dict:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def digest(path: str | Path) -> str:
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def reset_scene() -> None:
    bpy.ops.object.mode_set(mode="OBJECT") if bpy.context.object and bpy.context.object.mode != "OBJECT" else None
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.meshes, bpy.data.curves, bpy.data.armatures, bpy.data.materials, bpy.data.cameras):
        for item in list(block):
            if item.users == 0:
                block.remove(item)
    for collection in list(bpy.data.collections):
        if collection.name != "Collection":
            bpy.data.collections.remove(collection)
    base = bpy.data.collections.get("Collection")
    if base:
        base.name = "Scene_Root"


def collection(name: str, parent: bpy.types.Collection | None = None) -> bpy.types.Collection:
    result = bpy.data.collections.new(name)
    (parent or bpy.context.scene.collection).children.link(result)
    return result


def link_only(obj: bpy.types.Object, target: bpy.types.Collection) -> None:
    for owner in list(obj.users_collection):
        owner.objects.unlink(obj)
    target.objects.link(obj)


def output_pixel(config: dict, source_x: float, source_y: float) -> tuple[float, float]:
    spec = config["coordinateTransform"]["outputPixels"]
    return source_x * 0.78 - 87.0, source_y * 0.78 - 244.1


def world_from_output(point: tuple[float, float], z: float = 0.0, x_offset: float = 0.0) -> Vector:
    return Vector(((point[0] - 256.0) * 0.01 + x_offset, (256.0 - point[1]) * 0.01, z))


def source_panel_world(point: tuple[float, float], panel_center_x: float, z: float = 0.0) -> Vector:
    scale = 5.12 / 1280.0
    return Vector((panel_center_x + (point[0] - 360.0) * scale, (640.0 - point[1]) * scale, z))


def ensure_camera(name: str, resolution_x: int = 512, resolution_y: int = 512) -> bpy.types.Object:
    camera_data = bpy.data.cameras.new(name)
    camera = bpy.data.objects.new(name, camera_data)
    bpy.context.scene.collection.objects.link(camera)
    camera.location = (0.0, 0.0, 10.0)
    camera.rotation_euler = (0.0, 0.0, 0.0)
    camera_data.type = "ORTHO"
    camera_data.sensor_fit = "VERTICAL"
    camera_data.ortho_scale = 5.12
    bpy.context.scene.camera = camera
    scene = bpy.context.scene
    scene.render.resolution_x = resolution_x
    scene.render.resolution_y = resolution_y
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.eevee.taa_render_samples = 1
    scene.render.image_settings.color_depth = "8"
    scene.render.resolution_percentage = 100
    return camera


def emission_material(name: str, color: tuple[float, float, float, float]) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    emission = nodes.new("ShaderNodeEmission")
    emission.inputs["Color"].default_value = color
    emission.inputs["Strength"].default_value = 1.0
    mat.node_tree.links.new(emission.outputs["Emission"], out.inputs["Surface"])
    return mat


def image_material(name: str, image_path: str | Path) -> bpy.types.Material:
    image = bpy.data.images.load(str(Path(image_path).resolve()), check_existing=True)
    image.alpha_mode = "STRAIGHT"
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    transparent = nodes.new("ShaderNodeBsdfTransparent")
    emission = nodes.new("ShaderNodeEmission")
    texture = nodes.new("ShaderNodeTexImage")
    mix = nodes.new("ShaderNodeMixShader")
    texture.image = image
    texture.interpolation = "Closest"
    mat.node_tree.links.new(texture.outputs["Color"], emission.inputs["Color"])
    mat.node_tree.links.new(transparent.outputs["BSDF"], mix.inputs[1])
    mat.node_tree.links.new(emission.outputs["Emission"], mix.inputs[2])
    mat.node_tree.links.new(texture.outputs["Alpha"], mix.inputs[0])
    mat.node_tree.links.new(mix.outputs["Shader"], out.inputs["Surface"])
    if hasattr(mat, "surface_render_method"):
        mat.surface_render_method = "DITHERED"
    return mat


def plane(name: str, width: float, height: float, material: bpy.types.Material,
          target: bpy.types.Collection, center: Vector = Vector((0, 0, 0))) -> bpy.types.Object:
    mesh = bpy.data.meshes.new(name + "Mesh")
    hw, hh = width / 2.0, height / 2.0
    mesh.from_pydata([(-hw, -hh, 0), (hw, -hh, 0), (hw, hh, 0), (-hw, hh, 0)], [], [(0, 1, 2, 3)])
    mesh.uv_layers.new(name="UVMap")
    uv = mesh.uv_layers.active.data
    for loop, value in zip(uv, ((0, 0), (1, 0), (1, 1), (0, 1))):
        loop.uv = value
    obj = bpy.data.objects.new(name, mesh)
    target.objects.link(obj)
    obj.location = center
    obj.data.materials.append(material)
    return obj


def sphere(name: str, location: Vector, material: bpy.types.Material,
           target: bpy.types.Collection, radius: float = 0.035) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=6, radius=radius, location=location)
    obj = bpy.context.object
    obj.name = name
    link_only(obj, target)
    obj.data.materials.append(material)
    return obj


def segment(name: str, a: Vector, b: Vector, material: bpy.types.Material,
            target: bpy.types.Collection, radius: float = 0.012) -> bpy.types.Object:
    delta = b - a
    midpoint = (a + b) / 2.0
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=radius, depth=delta.length, location=midpoint)
    obj = bpy.context.object
    obj.name = name
    link_only(obj, target)
    obj.data.materials.append(material)
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(delta.normalized())
    return obj


def text_object(name: str, body: str, location: Vector, size: float,
                material: bpy.types.Material, target: bpy.types.Collection) -> bpy.types.Object:
    curve = bpy.data.curves.new(name + "Curve", type="FONT")
    curve.body = body
    curve.align_x = "CENTER"
    curve.size = size
    curve.extrude = 0.0
    obj = bpy.data.objects.new(name, curve)
    target.objects.link(obj)
    obj.location = location
    obj.data.materials.append(material)
    return obj


def set_collection_render(target: bpy.types.Collection, hide: bool) -> None:
    target.hide_render = hide
    target.hide_viewport = hide


def remove_post_render_scaffolding(*targets: bpy.types.Collection) -> dict[str, int]:
    removed = {"objects": 0, "meshes": 0}
    for target in targets:
        for item in list(target.objects):
            if item.type == "MESH":
                removed["meshes"] += 1
            bpy.data.objects.remove(item, do_unlink=True)
            removed["objects"] += 1
    for block in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.images):
        for item in list(block):
            if item.users == 0:
                block.remove(item)
    return removed


def point_in_polygon(x: float, y: float, polygon: list[tuple[float, float]]) -> bool:
    inside = False
    j = len(polygon) - 1
    for i, (xi, yi) in enumerate(polygon):
        xj, yj = polygon[j]
        crosses = ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-9) + xi)
        if crosses:
            inside = not inside
        j = i
    return inside


def extract_part(source: bpy.types.Image, name: str, polygon: list[tuple[int, int]],
                 out_dir: Path) -> tuple[Path, tuple[int, int, int, int]]:
    min_x = max(0, min(p[0] for p in polygon))
    max_x = min(source.size[0] - 1, max(p[0] for p in polygon))
    min_y = max(0, min(p[1] for p in polygon))
    max_y = min(source.size[1] - 1, max(p[1] for p in polygon))
    width, height = max_x - min_x + 1, max_y - min_y + 1
    pixels = list(source.pixels[:])
    output = [0.0] * (width * height * 4)
    for top_y in range(min_y, max_y + 1):
        for x in range(min_x, max_x + 1):
            if not point_in_polygon(x + 0.5, top_y + 0.5, polygon):
                continue
            source_bottom_y = source.size[1] - 1 - top_y
            source_offset = (source_bottom_y * source.size[0] + x) * 4
            dest_top_y = top_y - min_y
            dest_bottom_y = height - 1 - dest_top_y
            dest_offset = (dest_bottom_y * width + (x - min_x)) * 4
            output[dest_offset:dest_offset + 4] = pixels[source_offset:source_offset + 4]
    image = bpy.data.images.new(name, width=width, height=height, alpha=True)
    image.pixels = output
    result = out_dir / f"{name}.png"
    image.filepath_raw = str(result)
    image.file_format = "PNG"
    image.save()
    return result, (min_x, min_y, max_x, max_y)


def rotated_image_vector(vector: Vector, delta: float, sx: float, sy: float) -> Vector:
    x, y = vector.x * sx, vector.y * sy
    c, s = math.cos(delta), math.sin(delta)
    return Vector((x * c - y * s, x * s + y * c))


def place_part(name: str, image_path: Path, bounds: tuple[int, int, int, int],
               anchor_source: tuple[float, float], target_output: tuple[float, float],
               source_angle: float, target_angle: float, z: float,
               target_collection: bpy.types.Collection, scale_x: float = 1.0,
               scale_y: float = 1.0, attachment_id: str | None = None) -> bpy.types.Object:
    min_x, min_y, max_x, max_y = bounds
    width, height = max_x - min_x + 1, max_y - min_y + 1
    delta = target_angle - source_angle
    crop_center = Vector(((min_x + max_x) / 2.0, (min_y + max_y) / 2.0))
    anchor = Vector(anchor_source)
    center_image = Vector(target_output) + rotated_image_vector(crop_center - anchor, delta, scale_x, scale_y)
    obj = plane(name, width * 0.01, height * 0.01, image_material(name + "Material", image_path),
                target_collection, world_from_output((center_image.x, center_image.y), z))
    obj.rotation_euler[2] = -delta
    obj.scale.x = scale_x
    obj.scale.y = scale_y
    obj["canonical_source"] = "idle_0000"
    obj["source_bounds_top_left_pixels"] = list(bounds)
    if attachment_id:
        obj["corrective_attachment_id"] = attachment_id
        obj["attachment_status"] = "anticipated-canary"
    return obj


def image_angle(a: tuple[float, float], b: tuple[float, float]) -> float:
    return math.atan2(b[1] - a[1], b[0] - a[0])


def midpoint(a: dict, b: dict) -> tuple[float, float]:
    return ((float(a["x"]) + float(b["x"])) / 2.0, (float(a["y"]) + float(b["y"])) / 2.0)


def landmark_xy(frame: dict, name: str) -> tuple[float, float]:
    point = frame["landmarks"][name]
    return float(point["x"]), float(point["y"])


def output_landmark(frame: dict, name: str, config: dict) -> tuple[float, float]:
    return output_pixel(config, *landmark_xy(frame, name))


def create_control_armature(target: bpy.types.Collection) -> bpy.types.Object:
    armature = bpy.data.armatures.new("VanguardControlArmatureData")
    obj = bpy.data.objects.new("VanguardControlArmature", armature)
    target.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    hierarchy = [
        ("root", None), ("pelvis", "root"), ("spine", "pelvis"), ("head", "spine"),
        ("upper_arm.L", "spine"), ("forearm.L", "upper_arm.L"), ("hand.L", "forearm.L"),
        ("upper_arm.R", "spine"), ("forearm.R", "upper_arm.R"), ("hand.R", "forearm.R"),
        ("thigh.L", "pelvis"), ("shin.L", "thigh.L"), ("foot.L", "shin.L"),
        ("thigh.R", "pelvis"), ("shin.R", "thigh.R"), ("foot.R", "shin.R"),
        ("sword", "hand.R"),
    ]
    for index, (name, parent) in enumerate(hierarchy):
        bone = armature.edit_bones.new(name)
        bone.head = (index * 0.02, 0, 0)
        bone.tail = (index * 0.02, 0.08, 0)
        if parent:
            bone.parent = armature.edit_bones[parent]
    bpy.ops.object.mode_set(mode="OBJECT")
    obj["representation"] = "Vanguard-specific layered 2.5D controls"
    obj["full_3d_character"] = False
    return obj


def keyframe_reviewed_controls(track: dict, controls_collection: bpy.types.Collection,
                               config: dict) -> tuple[dict[str, bpy.types.Object], int, int]:
    landmark_names = list(track["frames"][0]["landmarks"].keys())
    animated_names = {name for name in landmark_names
                      if name in SELECTED_BODY
                      or name.startswith("left_hand_")
                      or name.startswith("right_hand_")}
    hardest = track["frames"][int(config["hardestKey"]["sourceFrame"])]
    controls: dict[str, bpy.types.Object] = {}
    for name in landmark_names:
        obj = bpy.data.objects.new("EVIDENCE_" + name, None)
        controls_collection.objects.link(obj)
        obj.empty_display_type = "SPHERE"
        obj.empty_display_size = 0.025
        obj.hide_render = True
        obj["landmark_id"] = name
        obj["source_sample_count"] = len(track["frames"])
        obj["reviewed_track_text_block"] = "GroundedMotion_ReviewedTrack.json"
        obj["timeline_animated"] = name in animated_names
        point = hardest["landmarks"].get(name)
        visible = bool(point and point.get("x") is not None and point.get("y") is not None)
        obj.hide_viewport = not visible
        if visible:
            obj.location = world_from_output(
                output_pixel(config, float(point["x"]), float(point["y"])), 0.0)
        controls[name] = obj
    for frame in track["frames"]:
        blender_frame = int(frame["index"]) + 1
        for name in animated_names:
            obj = controls[name]
            point = frame["landmarks"].get(name)
            visible = bool(point and point.get("x") is not None and point.get("y") is not None)
            obj.hide_viewport = not visible
            obj.keyframe_insert(data_path="hide_viewport", frame=blender_frame)
            if not visible:
                continue
            obj.location = world_from_output(output_pixel(config, float(point["x"]), float(point["y"])), 0.0)
            obj.keyframe_insert(data_path="location", frame=blender_frame)
    for action in bpy.data.actions:
        for fcurve in action.fcurves:
            for key in fcurve.keyframe_points:
                key.interpolation = "CONSTANT"
    return controls, len(landmark_names), len(animated_names)


def embed_text(name: str, path: str | Path) -> None:
    block = bpy.data.texts.new(name)
    block.write(Path(path).read_text(encoding="utf-8"))


def render(path: Path, camera: bpy.types.Object, width: int, height: int,
           film_transparent: bool = True) -> None:
    scene = bpy.context.scene
    scene.camera = camera
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = film_transparent
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)


def main() -> None:
    args = parse_args()
    out_dir = Path(args.out_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    parts_dir = out_dir / "parts"
    parts_dir.mkdir(exist_ok=True)
    config = load_json(args.config)
    weapon_track = load_json(args.weapon_track)
    part_library = load_json(args.part_library)
    track = load_json(args.reviewed_track)
    event_map = load_json(args.event_map)
    locks = config["evidenceLocks"]
    checks = {
        "reviewedSubjectSha256": digest(args.reviewed_track),
        "reviewedTrackSetSha256": digest(args.reviewed_track_set),
        "rawPredictionsSha256": digest(args.raw_predictions),
        "eventMapSha256": digest(args.event_map),
    }
    for key, actual in checks.items():
        if actual != locks[key]:
            raise RuntimeError(f"evidence hash mismatch for {key}: {actual} != {locks[key]}")
    if (track.get("schema") != "grounded-motion-track/v3"
            or track.get("state") != "event-locked"
            or track.get("review", {}).get("status") != "reviewed"):
        raise RuntimeError("adapter requires the reviewed, event-locked grounded-motion-track/v3 subject")
    if event_map.get("status") != "reviewed":
        raise RuntimeError("adapter requires reviewed event map")
    if tuple(config["initialCorrectiveAttachments"]) != CORRECTIVE_ATTACHMENTS:
        raise RuntimeError("the user-locked three-attachment vocabulary changed")
    library_ids = tuple(item["id"] for item in part_library["correctiveAttachments"])
    if library_ids != CORRECTIVE_ATTACHMENTS:
        raise RuntimeError("part library must begin with exactly the three user-locked attachments")

    reset_scene()
    scene = bpy.context.scene
    scene.name = "Vanguard_Muramasa_Canary_001"
    scene.frame_start = 1
    scene.frame_end = len(track["frames"])
    scene.render.fps = 55
    scene.render.fps_base = 55.0 / float(track["source"]["fps"])
    scene["schema"] = "vanguard-muramasa-blender-canary-v1"
    scene["status"] = "quarantined-ready-for-drew-review"
    scene["human_accepted"] = False
    scene["source_frame"] = int(config["hardestKey"]["sourceFrame"])
    scene["source_timestamp_seconds"] = float(config["hardestKey"]["sourceTimestampSeconds"])
    scene["coordinate_transform"] = json.dumps(config["coordinateTransform"], sort_keys=True)
    scene["corrective_attachments"] = json.dumps(list(CORRECTIVE_ATTACHMENTS))
    scene["approved_motion_witness_frame_sha256"] = digest(args.motion_witness_frame)

    root_collection = bpy.data.collections.get("Scene_Root")
    evidence_collection = collection("Evidence_GroundedMotion", root_collection)
    controls_collection = collection("Controls_ReviewedTrack", root_collection)
    puppet_collection = collection("Puppet_Canonical", root_collection)
    attachment_collection = collection("Attachments_Corrective", root_collection)
    diagnostic_collection = collection("Diagnostics_Render", root_collection)
    layout_collection = collection("Pose_Layout_Render", root_collection)
    reference_collection = collection("Reference_Images", root_collection)

    camera = ensure_camera("Vanguard_GameCamera")
    link_only(camera, root_collection)
    armature = create_control_armature(controls_collection)
    controls, imported_landmark_count, animated_landmark_count = keyframe_reviewed_controls(
        track, controls_collection, config)
    armature["imported_landmark_count"] = imported_landmark_count
    armature["animated_landmark_count"] = animated_landmark_count
    armature["imported_frame_count"] = len(track["frames"])
    armature["source_resampled"] = False
    armature["event_lock_status"] = "locked"

    embed_text("GroundedMotion_RawPredictions.json", args.raw_predictions)
    embed_text("GroundedMotion_ReviewedTrack.json", args.reviewed_track)
    embed_text("GroundedMotion_ReviewedTrackSet.json", args.reviewed_track_set)
    embed_text("GroundedMotion_EventMap.json", args.event_map)
    embed_text("Vanguard_WeaponCompanionTrack.json", args.weapon_track)
    embed_text("Vanguard_PartLibrary.json", args.part_library)
    embed_text("Vanguard_ConstraintLedger.json", args.constraint_ledger)
    embed_text("Vanguard_CanaryConfig.json", args.config)

    frame_index = int(config["hardestKey"]["sourceFrame"])
    frame = track["frames"][frame_index]
    scene.frame_set(frame_index + 1)
    white = emission_material("DiagnosticWhite", (0.9, 0.95, 1.0, 1.0))
    cyan = emission_material("DiagnosticCyan", (0.0, 0.85, 1.0, 1.0))
    gold = emission_material("DiagnosticGold", (1.0, 0.62, 0.05, 1.0))
    red = emission_material("LayoutRed", (0.95, 0.15, 0.15, 1.0))
    green = emission_material("LayoutGreen", (0.1, 0.9, 0.45, 1.0))
    blue = emission_material("LayoutBlue", (0.15, 0.45, 1.0, 1.0))

    for name in SELECTED_BODY:
        if name in frame["landmarks"]:
            sphere("DIAG_" + name, world_from_output(output_landmark(frame, name, config), 0.3), cyan, diagnostic_collection)
    for a_name, b_name in BODY_EDGES:
        if a_name in frame["landmarks"] and b_name in frame["landmarks"]:
            segment("DIAG_" + a_name + "__" + b_name,
                    world_from_output(output_landmark(frame, a_name, config), 0.29),
                    world_from_output(output_landmark(frame, b_name, config), 0.29),
                    cyan, diagnostic_collection)
    pelvis = midpoint(frame["landmarks"]["left_hip"], frame["landmarks"]["right_hip"])
    root_witness = bpy.data.objects.new("CTRL_RootWitness", None)
    controls_collection.objects.link(root_witness)
    root_witness.empty_display_type = "CIRCLE"
    for source_frame in track["frames"]:
        p = midpoint(source_frame["landmarks"]["left_hip"], source_frame["landmarks"]["right_hip"])
        root_witness.location = world_from_output(output_pixel(config, *p), 0.0)
        root_witness.keyframe_insert(data_path="location", frame=int(source_frame["index"]) + 1)
    root_witness["per_frame_recentering"] = False
    root_witness["source_role"] = "pelvis-midpoint-root-witness"

    weapon_frame = next(item for item in weapon_track["frames"] if item["sourceFrame"] == frame_index)
    sword_root_out = output_pixel(config, *weapon_frame["root"])
    sword_tip_out = output_pixel(config, *weapon_frame["tip"])
    for label, point in (("SwordRoot", sword_root_out), ("SwordTip", sword_tip_out)):
        sphere("CTRL_" + label, world_from_output(point, 0.32), gold, diagnostic_collection, 0.045)
    segment("DIAG_SwordVector", world_from_output(sword_root_out, 0.31), world_from_output(sword_tip_out, 0.31), gold, diagnostic_collection, 0.018)

    source_idle = bpy.data.images.load(str(Path(args.idle_frame).resolve()), check_existing=True)
    masks = {
        "helmet_head_plume": [(224, 96), (274, 96), (303, 122), (304, 183), (281, 200), (239, 188), (222, 148)],
        "breastplate_turn_3q": [(236, 174), (289, 173), (299, 219), (277, 262), (241, 248)],
        "skirt_pelvis": [(221, 219), (293, 219), (303, 290), (280, 343), (217, 342), (202, 299)],
        "front_thigh": [(268, 244), (305, 248), (322, 289), (302, 314), (271, 292)],
        "front_shin": [(294, 283), (324, 291), (322, 379), (275, 379), (273, 338)],
        "rear_thigh": [(228, 243), (274, 246), (265, 306), (221, 321), (205, 293)],
        "rear_shin": [(205, 286), (256, 297), (241, 378), (183, 378), (191, 326)],
        "rear_boot_foreshortened": [(183, 337), (231, 338), (243, 378), (183, 378)],
        "overhead_two_hand_grip": [(219, 143), (291, 143), (322, 204), (300, 218), (270, 194), (233, 194)],
        "canonical_sword": [(205, 29), (218, 32), (296, 170), (279, 182)],
    }
    extracted: dict[str, tuple[Path, tuple[int, int, int, int]]] = {}
    for name, polygon in masks.items():
        extracted[name] = extract_part(source_idle, name, polygon, parts_dir)

    shoulder_mid_source = midpoint(frame["landmarks"]["left_shoulder"], frame["landmarks"]["right_shoulder"])
    hip_mid_source = pelvis
    wrist_mid_source = midpoint(frame["landmarks"]["left_wrist"], frame["landmarks"]["right_wrist"])
    nose_out = output_landmark(frame, "nose", config)
    shoulder_mid_out = output_pixel(config, *shoulder_mid_source)
    hip_mid_out = output_pixel(config, *hip_mid_source)
    wrist_mid_out = output_pixel(config, *wrist_mid_source)

    target_torso_angle = image_angle(shoulder_mid_out, hip_mid_out)
    place_part("PART_SkirtPelvis", *extracted["skirt_pelvis"], (258, 244), hip_mid_out,
               math.radians(90), target_torso_angle, 0.10, puppet_collection)
    place_part("ATTACH_BreastplateTurn3Q", *extracted["breastplate_turn_3q"], (260, 182), shoulder_mid_out,
               math.radians(90), target_torso_angle, 0.15, attachment_collection, 0.9, 1.0,
               "breastplate_turn_3q")
    place_part("PART_HeadHelmetPlume", *extracted["helmet_head_plume"], (291, 146), nose_out,
               0.0, 0.0, 0.35, puppet_collection)

    leg_specs = [
        ("PART_FrontThigh", "front_thigh", (284, 256), (309, 287), "left_hip", "left_knee", 0.18, 1.0, 1.0, None),
        ("PART_FrontShin", "front_shin", (309, 287), (291, 359), "left_knee", "left_ankle", 0.19, 1.0, 1.0, None),
        ("PART_RearThigh", "rear_thigh", (252, 253), (230, 300), "right_hip", "right_knee", 0.05, 1.0, 1.0, None),
        ("PART_RearShin", "rear_shin", (230, 300), (198, 355), "right_knee", "right_ankle", 0.06, 1.0, 1.0, None),
    ]
    for obj_name, part_name, source_a, source_b, target_a_name, target_b_name, z, sx, sy, attachment_id in leg_specs:
        target_a = output_landmark(frame, target_a_name, config)
        target_b = output_landmark(frame, target_b_name, config)
        place_part(obj_name, *extracted[part_name], source_a, target_a,
                   image_angle(source_a, source_b), image_angle(target_a, target_b), z,
                   puppet_collection, sx, sy, attachment_id)
    rear_ankle_out = output_landmark(frame, "right_ankle", config)
    rear_toe_out = output_landmark(frame, "right_big_toe", config)
    place_part("ATTACH_RearBootForeshortened", *extracted["rear_boot_foreshortened"], (198, 355), rear_ankle_out,
               image_angle((198, 355), (214, 371)), image_angle(rear_ankle_out, rear_toe_out), 0.12,
               attachment_collection, 0.82, 1.0, "rear_boot_foreshortened")

    source_shoulder_to_wrist = image_angle((250, 169), (291, 181))
    target_shoulder_to_wrist = image_angle(shoulder_mid_out, wrist_mid_out)
    grip = place_part("ATTACH_OverheadTwoHandGrip", *extracted["overhead_two_hand_grip"], (291, 181), wrist_mid_out,
                      source_shoulder_to_wrist, target_shoulder_to_wrist, 0.40,
                      attachment_collection, 1.0, 1.0, "overhead_two_hand_grip")
    sword = place_part("PART_CanonicalSword", *extracted["canonical_sword"], (282, 171), sword_root_out,
                       image_angle((282, 171), (211, 31)), image_angle(sword_root_out, sword_tip_out), 0.45,
                       puppet_collection, 0.92, 0.92)
    sword["driver_chain"] = "sword-root-and-primary-hand"
    sword["active_edge"] = weapon_frame["activeEdge"]
    grip["secondary_hand_constraint"] = "recorded-hilt-socket"

    primary = bpy.data.objects.new("CTRL_SwordPrimaryHand", None)
    secondary = bpy.data.objects.new("CTRL_SwordSecondaryHand", None)
    hilt_socket = bpy.data.objects.new("CTRL_HiltSecondarySocket", None)
    for obj in (primary, secondary, hilt_socket):
        controls_collection.objects.link(obj)
        obj.empty_display_type = "CIRCLE"
    primary.location = world_from_output(output_pixel(config, *weapon_frame["primaryHand"]), 0.0)
    hilt_socket.location = world_from_output(output_pixel(config, *weapon_frame["secondaryHand"]), 0.0)
    constraint = secondary.constraints.new(type="COPY_LOCATION")
    constraint.target = hilt_socket
    secondary["evidence_target"] = "recorded secondary hand hilt socket"
    secondary["double_solve_forbidden"] = True

    layout_points = {name: world_from_output(output_landmark(frame, name, config), 0.25) for name in SELECTED_BODY if name in frame["landmarks"]}
    for name, loc in layout_points.items():
        sphere("LAYOUT_" + name, loc, green if "foot" in name or "toe" in name or "heel" in name or "ankle" in name else red, layout_collection, 0.045)
    for a_name, b_name in BODY_EDGES:
        if a_name in layout_points and b_name in layout_points:
            segment("LAYOUT_" + a_name + "__" + b_name, layout_points[a_name], layout_points[b_name], blue, layout_collection, 0.022)
    segment("LAYOUT_SwordVector", world_from_output(sword_root_out, 0.27), world_from_output(sword_tip_out, 0.27), gold, layout_collection, 0.025)

    # Gate 1: source frame, preserved overlay, and Blender-imported source-space projection.
    diag_camera = ensure_camera("AdapterDiagnosticCamera", 1536, 512)
    diag_camera.data.ortho_scale = 5.12
    source_mat = image_material("SourceFrameMaterial", args.source_frame)
    overlay_mat = image_material("OverlayFrameMaterial", args.overlay_frame)
    plane("SOURCE_FRAME_f000042", 2.88, 5.12, source_mat, reference_collection, Vector((-5.12, 0, 0.0)))
    plane("REVIEWED_OVERLAY_f000042", 2.88, 5.12, overlay_mat, reference_collection, Vector((0.0, 0, 0.0)))
    for name in SELECTED_BODY:
        if name not in frame["landmarks"]:
            continue
        sphere("SOURCE_DIAG_" + name, source_panel_world(landmark_xy(frame, name), 5.12, 0.2), cyan, reference_collection, 0.035)
    for a_name, b_name in BODY_EDGES:
        if a_name in frame["landmarks"] and b_name in frame["landmarks"]:
            segment("SOURCE_DIAG_" + a_name + "__" + b_name,
                    source_panel_world(landmark_xy(frame, a_name), 5.12, 0.19),
                    source_panel_world(landmark_xy(frame, b_name), 5.12, 0.19), cyan, reference_collection, 0.012)
    text_object("Gate1SourceLabel", "SOURCE f000042", Vector((-5.12, 2.25, 0.3)), 0.16, white, reference_collection)
    text_object("Gate1OverlayLabel", "REVIEWED MMPOSE", Vector((0.0, 2.25, 0.3)), 0.16, white, reference_collection)
    text_object("Gate1BlenderLabel", "BLENDER CONTROLS  t=0.766116s", Vector((5.12, 2.25, 0.3)), 0.16, white, reference_collection)

    set_collection_render(puppet_collection, True)
    set_collection_render(attachment_collection, True)
    set_collection_render(diagnostic_collection, True)
    set_collection_render(layout_collection, True)
    set_collection_render(reference_collection, False)
    set_collection_render(controls_collection, True)
    set_collection_render(evidence_collection, True)
    render(out_dir / "source-aligned-adapter-diagnostic.png", diag_camera, 1536, 512, False)

    set_collection_render(reference_collection, True)
    set_collection_render(layout_collection, False)
    render(out_dir / "non-rendered-pose-layout.png", camera, 512, 512, True)

    set_collection_render(layout_collection, True)
    set_collection_render(puppet_collection, False)
    set_collection_render(attachment_collection, False)
    render(out_dir / "hardest-key-candidate.png", camera, 512, 512, True)

    set_collection_render(puppet_collection, True)
    set_collection_render(attachment_collection, True)
    set_collection_render(diagnostic_collection, False)
    render(out_dir / "blender-control-projection.png", camera, 512, 512, True)
    set_collection_render(diagnostic_collection, True)

    # The evidence PNGs are immutable outputs. Keep the complete reviewed motion as
    # animated empties/armature controls, but do not burden persistent inspection
    # with render-only spheres, cylinders, labels, and reference planes.
    removed_scaffolding = remove_post_render_scaffolding(
        diagnostic_collection, layout_collection, reference_collection)

    corrective_objects = [obj for obj in attachment_collection.objects if obj.get("corrective_attachment_id")]
    mapping = {
        "schema": "mmpose-to-vanguard-blender-mapping-v1",
        "status": "quarantined",
        "source": {"executionId": locks["groundedMotionExecutionId"], "reviewedSubjectSha256": checks["reviewedSubjectSha256"], "reviewedTrackSetSha256": checks["reviewedTrackSetSha256"], "rawPredictionsSha256": checks["rawPredictionsSha256"], "eventMapSha256": checks["eventMapSha256"], "approvedMotionWitnessFrameSha256": digest(args.motion_witness_frame)},
        "hardestKey": config["hardestKey"],
        "coordinateTransform": config["coordinateTransform"],
        "timeline": {"sourceFrameCount": len(track["frames"]), "blenderFrameStart": 1, "blenderFrameEnd": len(track["frames"]), "interpolation": "CONSTANT", "resampled": False, "animatedLandmarkControls": animated_landmark_count, "completeLandmarkStreamsEmbedded": imported_landmark_count},
        "controls": {name: "EVIDENCE_" + name for name in track["frames"][0]["landmarks"].keys()},
        "rootWitness": "CTRL_RootWitness",
        "weaponOwnership": weapon_track["ownership"],
        "attachments": [obj.get("corrective_attachment_id") for obj in corrective_objects],
        "humanAccepted": False,
    }
    (out_dir / "mapping-manifest.json").write_text(json.dumps(mapping, indent=2) + "\n", encoding="utf-8")
    inspection = {
        "schema": "vanguard-blender-scene-inspection-v1",
        "scene": scene.name,
        "blenderVersion": bpy.app.version_string,
        "objects": [{"name": obj.name, "type": obj.type, "parent": obj.parent.name if obj.parent else None, "collections": [c.name for c in obj.users_collection], "customProperties": sorted(k for k in obj.keys() if k != "_RNA_UI")} for obj in sorted(bpy.data.objects, key=lambda item: item.name)],
        "collections": sorted(c.name for c in bpy.data.collections),
        "textBlocks": [{"name": block.name, "characters": len(block.as_string())} for block in bpy.data.texts],
        "animation": {"frameStart": scene.frame_start, "frameEnd": scene.frame_end, "fps": float(track["source"]["fps"]), "actions": len(bpy.data.actions), "animatedEvidenceControls": animated_landmark_count, "completeEmbeddedLandmarkStreams": imported_landmark_count},
        "camera": {"name": camera.name, "type": camera.data.type, "orthographicScale": camera.data.ortho_scale, "resolution": [512, 512]},
        "correctiveAttachments": [obj.get("corrective_attachment_id") for obj in corrective_objects],
        "postRenderScaffoldingRemoved": removed_scaffolding,
        "humanAccepted": False,
    }
    (out_dir / "scene-inspection-manifest.json").write_text(json.dumps(inspection, indent=2) + "\n", encoding="utf-8")
    validation = {
        "schema": "vanguard-muramasa-canary-validation-v1",
        "technicalState": "rendered-awaiting-synchronized-visual-gate",
        "evidenceHashesVerified": True,
        "completeReviewedFramesImported": len(track["frames"]) == 254,
        "completeLandmarkVocabularyImported": imported_landmark_count == 133,
        "animatedBodyFeetAndHandControls": animated_landmark_count,
        "nonAnimatedLandmarksRetainedInReviewedTrackText": imported_landmark_count - animated_landmark_count,
        "eventLock": "locked",
        "sourceResampled": False,
        "perFrameRecentering": False,
        "perFrameScaleNormalization": False,
        "mirrored": False,
        "correctiveAttachmentCount": len(corrective_objects),
        "correctiveAttachments": [obj.get("corrective_attachment_id") for obj in corrective_objects],
        "attachmentExpansionGate": config["attachmentExpansionGate"],
        "humanAccepted": False,
        "visualVerdict": "pending synchronized Pose Lab comparison and Drew review",
        "persistentSource": {"renderScaffoldingRemoved": removed_scaffolding, "texturesPacked": True}
    }
    if validation["correctiveAttachmentCount"] != 3:
        raise RuntimeError("attempt 1 must contain exactly three corrective attachments")
    (out_dir / "validation-report.json").write_text(json.dumps(validation, indent=2) + "\n", encoding="utf-8")

    scene["mapping_manifest"] = json.dumps(mapping, sort_keys=True)
    scene["validation_report"] = json.dumps(validation, sort_keys=True)
    blend_path = out_dir / args.blend_name
    bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path), check_existing=False)
    hashes = {path.name: digest(path) for path in sorted(out_dir.iterdir()) if path.is_file()}
    result = {"schema": "vanguard-muramasa-canary-result-v1", "status": "ready-for-synchronized-comparison", "blend": blend_path.name, "artifacts": hashes, "correctiveAttachments": list(CORRECTIVE_ATTACHMENTS), "humanAccepted": False}
    (out_dir / "canary-result.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
