#!/usr/bin/env python3
"""Refine one synchronized-red Vanguard hardest-key puppet without changing motion."""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))

from mmpose_to_vanguard_blender import (
    digest,
    extract_part,
    image_angle,
    load_json,
    output_landmark,
    output_pixel,
    place_part,
    render,
    set_collection_render,
)

ATTACHMENTS = (
    "breastplate_turn_3q",
    "overhead_two_hand_grip",
    "rear_boot_foreshortened",
    "rear_forearm_foreshortened",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-blend", required=True)
    parser.add_argument("--idle-frame", required=True)
    parser.add_argument("--part-library", required=True)
    parser.add_argument("--weapon-track", required=True)
    parser.add_argument("--published-root", required=True)
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--blend-name", default="Vanguard_Muramasa_Style_2p5D_Puppet_Canary_002.blend")
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    return parser.parse_args(argv)


def text_json(name: str) -> dict:
    return json.loads(bpy.data.texts[name].as_string())


def replace_text(name: str, payload: dict) -> None:
    block = bpy.data.texts.get(name) or bpy.data.texts.new(name)
    block.clear()
    block.write(json.dumps(payload, indent=2) + "\n")


def remove_object(name: str) -> None:
    obj = bpy.data.objects.get(name)
    if obj:
        bpy.data.objects.remove(obj, do_unlink=True)


def remove_prefix(prefix: str) -> None:
    for obj in list(bpy.data.objects):
        if obj.name == prefix or obj.name.startswith(prefix + "__"):
            bpy.data.objects.remove(obj, do_unlink=True)


def attachment_root(name: str, attachment_id: str, target: bpy.types.Collection) -> bpy.types.Object:
    root = bpy.data.objects.new(name, None)
    target.objects.link(root)
    root.empty_display_type = "PLAIN_AXES"
    root["corrective_attachment_id"] = attachment_id
    root["attachment_status"] = "revised-from-production-v21-synchronized-red"
    root["source_frame"] = 42
    root["performance_changed"] = False
    return root


def place_segment_component(name: str, image_path: Path, bounds: tuple[int, int, int, int],
                            source_start: tuple[float, float], source_end: tuple[float, float],
                            target_start: tuple[float, float], target_end: tuple[float, float],
                            z: float, target_collection: bpy.types.Collection,
                            parent: bpy.types.Object | None = None) -> bpy.types.Object:
    source_length = math.hypot(source_end[0] - source_start[0], source_end[1] - source_start[1])
    target_length = math.hypot(target_end[0] - target_start[0], target_end[1] - target_start[1])
    if source_length <= 1e-6:
        raise RuntimeError(f"zero-length source segment for {name}")
    scale = target_length / source_length
    obj = place_part(
        name, image_path, bounds, source_start, target_start,
        image_angle(source_start, source_end), image_angle(target_start, target_end), z,
        target_collection, scale, scale, None,
    )
    if parent:
        obj.parent = parent
        obj["attachment_component_of"] = parent.get("corrective_attachment_id")
    obj["source_segment"] = [*source_start, *source_end]
    obj["target_segment"] = [*target_start, *target_end]
    return obj


def scene_objects() -> list[dict]:
    return [{
        "name": obj.name,
        "type": obj.type,
        "parent": obj.parent.name if obj.parent else None,
        "collections": [collection.name for collection in obj.users_collection],
        "customProperties": sorted(key for key in obj.keys() if key != "_RNA_UI"),
    } for obj in sorted(bpy.data.objects, key=lambda item: item.name)]


def main() -> None:
    args = parse_args()
    base_blend = Path(args.base_blend).resolve()
    published = Path(args.published_root).resolve()
    out_dir = Path(args.out_dir).resolve()
    parts_dir = out_dir / "parts-attempt-003"
    out_dir.mkdir(parents=True, exist_ok=True)
    parts_dir.mkdir(parents=True, exist_ok=True)

    bpy.ops.wm.open_mainfile(filepath=str(base_blend), load_ui=False, use_scripts=False)
    scene = bpy.context.scene
    config = text_json("Vanguard_CanaryConfig.json")
    track = text_json("GroundedMotion_ReviewedTrack.json")
    embedded_weapon_track = text_json("Vanguard_WeaponCompanionTrack.json")
    weapon_track = load_json(args.weapon_track)
    part_library = load_json(args.part_library)
    if tuple(item["id"] for item in part_library["correctiveAttachments"]) != ATTACHMENTS:
        raise RuntimeError("repair must retain the same four attachment roots from production v21")
    if part_library["correctiveAttachments"][-1]["gateEvidence"]["cloudCaptureSha256"] != "462130acac6d229e6f73661a3cddd9b151874bf18757f07e56eabdf66a5e2a48":
        raise RuntimeError("the fourth attachment lacks the locked synchronized Pose Lab evidence")
    correction = next((item for item in weapon_track.get("corrections", []) if item.get("sourceFrame") == 42), None)
    if not correction or correction.get("basis", {}).get("cloudCaptureSha256") != "2c45cfce48e12477885cb0d17e5a1d62259b1b827029a80ecd888703c8a93c49":
        raise RuntimeError("frame-42 sword correction lacks production-v21 synchronized evidence")
    embedded_weapon_frame = next(item for item in embedded_weapon_track["frames"] if item["sourceFrame"] == 42)
    weapon_frame = next(item for item in weapon_track["frames"] if item["sourceFrame"] == 42)
    for field in ("root", "primaryHand", "secondaryHand", "timestampSeconds", "activeEdge"):
        if weapon_frame[field] != embedded_weapon_frame[field]:
            raise RuntimeError(f"frame-42 locked weapon field changed: {field}")
    if embedded_weapon_frame["tip"] != correction["priorTip"] or weapon_frame["tip"] != correction["correctedTip"]:
        raise RuntimeError("frame-42 sword correction does not match the recorded prior/corrected tip")

    frame_index = int(config["hardestKey"]["sourceFrame"])
    frame = track["frames"][frame_index]
    scene.frame_set(frame_index + 1)
    camera = bpy.data.objects["Vanguard_GameCamera"]
    scene.camera = camera
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.film_transparent = True
    if hasattr(scene, "eevee"):
        scene.eevee.taa_render_samples = 1

    attachment_collection = bpy.data.collections["Attachments_Corrective"]
    puppet_collection = bpy.data.collections["Puppet_Canonical"]
    source_idle = bpy.data.images.load(str(Path(args.idle_frame).resolve()), check_existing=True)

    frame_index = int(config["hardestKey"]["sourceFrame"])
    frame = track["frames"][frame_index]
    weapon_frame = next(item for item in weapon_track["frames"] if item["sourceFrame"] == frame_index)
    sword_root_out = output_pixel(config, *weapon_frame["root"])
    sword_tip_out = output_pixel(config, *weapon_frame["tip"])
    left_shoulder = output_landmark(frame, "left_shoulder", config)
    right_shoulder = output_landmark(frame, "right_shoulder", config)
    left_elbow = output_landmark(frame, "left_elbow", config)
    right_elbow = output_landmark(frame, "right_elbow", config)
    left_wrist = output_landmark(frame, "left_wrist", config)
    right_wrist = output_landmark(frame, "right_wrist", config)
    shoulder_mid = ((left_shoulder[0] + right_shoulder[0]) / 2.0, (left_shoulder[1] + right_shoulder[1]) / 2.0)
    left_hip = output_landmark(frame, "left_hip", config)
    right_hip = output_landmark(frame, "right_hip", config)
    hip_mid = ((left_hip[0] + right_hip[0]) / 2.0, (left_hip[1] + right_hip[1]) / 2.0)
    rear_ankle = output_landmark(frame, "right_ankle", config)
    rear_toe = output_landmark(frame, "right_big_toe", config)

    # Production v21 proved that one rigid crop per slot left disconnected limbs.
    # Keep exactly four attachment roots, but rebuild their internal Blender-backed
    # sprite components so every frozen joint endpoint has a continuous interface.
    for prefix in (
        "ATTACH_BreastplateTurn3Q",
        "ATTACH_OverheadTwoHandGrip",
        "ATTACH_RearBootForeshortened",
        "ATTACH_RearForearmForeshortened",
    ):
        remove_prefix(prefix)
    remove_object("PART_CanonicalSword")
    remove_prefix("PART_HeadHelmetPlume")

    masks = {
        "breastplate": [(246, 190), (294, 188), (303, 220), (286, 268), (239, 268), (228, 219), (239, 196)],
        "arm_segment": [(283, 171), (299, 171), (322, 202), (314, 216), (299, 207), (289, 190)],
        "grip_cluster": [(276, 167), (291, 163), (304, 177), (319, 201), (310, 213), (298, 205), (289, 190), (277, 182)],
        "helmet_face": [(258, 104), (288, 104), (303, 121), (303, 162), (290, 174), (270, 166), (258, 144)],
        "plume_hair": [(224, 96), (274, 96), (281, 119), (264, 145), (255, 198), (239, 191), (222, 148)],
        "rear_boot": [(181, 320), (219, 321), (241, 347), (244, 378), (181, 378)],
        "canonical_sword": [(205, 29), (219, 31), (302, 170), (300, 190), (279, 183)],
    }
    extracted = {name: extract_part(source_idle, f"{name}_attempt_003", polygon, parts_dir) for name, polygon in masks.items()}

    breastplate_root = attachment_root("ATTACH_BreastplateTurn3Q", "breastplate_turn_3q", attachment_collection)
    torso_anchor = (
        shoulder_mid[0] + (hip_mid[0] - shoulder_mid[0]) * 0.27,
        shoulder_mid[1] + (hip_mid[1] - shoulder_mid[1]) * 0.27,
    )
    torso = place_part(
        "ATTACH_BreastplateTurn3Q__Torso", *extracted["breastplate"], (260, 210), torso_anchor,
        math.radians(90), image_angle(shoulder_mid, hip_mid), 0.18, attachment_collection, 0.98, 1.08, None,
    )
    torso.parent = breastplate_root
    torso["attachment_component_of"] = "breastplate_turn_3q"
    place_segment_component(
        "ATTACH_BreastplateTurn3Q__FarUpperArm", *extracted["arm_segment"],
        (315, 211), (291, 181), left_shoulder, left_elbow, 0.29, attachment_collection, breastplate_root,
    )
    place_segment_component(
        "ATTACH_BreastplateTurn3Q__NearUpperArm", *extracted["arm_segment"],
        (315, 211), (291, 181), right_shoulder, right_elbow, 0.32, attachment_collection, breastplate_root,
    )

    rear_forearm_root = attachment_root("ATTACH_RearForearmForeshortened", "rear_forearm_foreshortened", attachment_collection)
    place_segment_component(
        "ATTACH_RearForearmForeshortened__ElbowToWrist", *extracted["arm_segment"],
        (315, 211), (291, 181), left_elbow, left_wrist, 0.34, attachment_collection, rear_forearm_root,
    )
    rear_forearm_root["cloud_capture_sha256"] = "462130acac6d229e6f73661a3cddd9b151874bf18757f07e56eabdf66a5e2a48"

    grip_root = attachment_root("ATTACH_OverheadTwoHandGrip", "overhead_two_hand_grip", attachment_collection)
    place_segment_component(
        "ATTACH_OverheadTwoHandGrip__PrimaryForearm", *extracted["arm_segment"],
        (315, 211), (291, 181), right_elbow, right_wrist, 0.37, attachment_collection, grip_root,
    )
    grip_cluster = place_segment_component(
        "ATTACH_OverheadTwoHandGrip__HandsAndHilt", *extracted["grip_cluster"],
        (284, 174), (300, 190), left_wrist, right_wrist, 0.42, attachment_collection, grip_root,
    )
    grip_cluster["secondary_hand_constraint"] = "recorded-hilt-socket"

    head_root = bpy.data.objects.new("PART_HeadHelmetPlume", None)
    puppet_collection.objects.link(head_root)
    head_root.empty_display_type = "PLAIN_AXES"
    head_root["canonical_base_recut"] = "production-v21-crossed-arm-contamination-removed"
    for component_name, source_name, z in (
        ("PART_HeadHelmetPlume__PlumeHair", "plume_hair", 0.27),
        ("PART_HeadHelmetPlume__HelmetFace", "helmet_face", 0.30),
    ):
        component = place_part(
            component_name, *extracted[source_name], (291, 146), output_landmark(frame, "nose", config),
            0.0, 0.0, z, puppet_collection, 1.0, 1.0, None,
        )
        component.parent = head_root
        component["canonical_component_of"] = "helmet_head_plume"

    boot_root = attachment_root("ATTACH_RearBootForeshortened", "rear_boot_foreshortened", attachment_collection)
    boot = place_part(
        "ATTACH_RearBootForeshortened__BootAndShinSeat", *extracted["rear_boot"],
        (198, 355), rear_ankle, image_angle((198, 355), (183, 371)), image_angle(rear_ankle, rear_toe),
        0.12, attachment_collection, 1.45, 1.08, None,
    )
    boot.parent = boot_root
    boot["attachment_component_of"] = "rear_boot_foreshortened"
    boot["locked_ankle_output"] = list(rear_ankle)
    boot["locked_toe_output"] = list(rear_toe)

    sword = place_segment_component(
        "PART_CanonicalSword", *extracted["canonical_sword"],
        (291, 178), (211, 35), sword_root_out, sword_tip_out, 0.45, puppet_collection, None,
    )
    sword["driver_chain"] = "sword-root-and-primary-hand"
    sword["active_edge"] = weapon_frame["activeEdge"]
    sword["production_v21_vector_corrected"] = True
    sword["prior_tip_source_pixels"] = correction["priorTip"]
    sword["corrected_tip_source_pixels"] = correction["correctedTip"]
    replace_text("Vanguard_WeaponCompanionTrack.json", weapon_track)

    for obj in attachment_collection.objects:
        if obj.get("corrective_attachment_id") in ATTACHMENTS:
            obj["attempt_id"] = "muramasa-canary-001-attempt-003"
            obj["human_accepted"] = False

    actual_corrective = [obj.get("corrective_attachment_id") for obj in attachment_collection.objects if obj.get("corrective_attachment_id")]
    if len(actual_corrective) != len(ATTACHMENTS) or set(actual_corrective) != set(ATTACHMENTS):
        raise RuntimeError(f"unexpected attempt-3 attachments: {actual_corrective}")
    corrective = list(ATTACHMENTS)
    scene["corrective_attachments"] = json.dumps(corrective)
    scene["status"] = "quarantined-awaiting-normal-size-synchronized-gate-attempt-003"
    scene["human_accepted"] = False
    scene["approved_performance_changed"] = False
    replace_text("Vanguard_PartLibrary.json", part_library)

    # Blender 4.3 may exclude hide_viewport collections from final render
    # evaluation. Keep every collection evaluable and control only render visibility.
    for target in bpy.data.collections:
        target.hide_viewport = False
    puppet_collection.hide_render = False
    attachment_collection.hide_render = False
    for name in ("Diagnostics_Render", "Pose_Layout_Render", "Reference_Images", "Controls_ReviewedTrack", "Evidence_GroundedMotion"):
        target = bpy.data.collections.get(name)
        if target:
            target.hide_render = True
    bpy.context.view_layer.update()
    scene.frame_set(frame_index + 1)
    candidate_path = published / "frames" / "hardest-key-candidate.png"
    render(candidate_path, camera, 512, 512, True)

    mapping_path = published / "evidence" / "mapping-manifest.json"
    mapping = load_json(mapping_path)
    mapping["attachments"] = corrective
    mapping["attemptId"] = "muramasa-canary-001-attempt-003"
    mapping["synchronizedExpansionEvidence"] = {
        "runId": "30581078830",
        "cloudCaptureSha256": "462130acac6d229e6f73661a3cddd9b151874bf18757f07e56eabdf66a5e2a48",
        "failureClasses": ["foreshortening", "grip", "contact", "overlap", "silhouette"],
        "performanceChanged": False,
    }
    mapping_path.write_text(json.dumps(mapping, indent=2) + "\n", encoding="utf-8")

    inspection_path = published / "evidence" / "scene-inspection-manifest.json"
    inspection = load_json(inspection_path)
    inspection["objects"] = scene_objects()
    inspection["correctiveAttachments"] = corrective
    inspection["attemptId"] = "muramasa-canary-001-attempt-003"
    inspection["humanAccepted"] = False
    inspection_path.write_text(json.dumps(inspection, indent=2) + "\n", encoding="utf-8")

    validation_path = published / "evidence" / "validation-report.json"
    validation = load_json(validation_path)
    validation["technicalState"] = "rendered-awaiting-normal-size-synchronized-visual-gate"
    validation["correctiveAttachmentCount"] = len(corrective)
    validation["correctiveAttachments"] = corrective
    validation["visualVerdict"] = "attempt 3 pending normal-size synchronized Pose Lab comparison; not ready for Drew until silhouette matches"
    validation["humanAccepted"] = False
    validation_path.write_text(json.dumps(validation, indent=2) + "\n", encoding="utf-8")

    for source, target_name in (
        (args.part_library, "part-library.json"),
        (mapping_path, "mapping-manifest.json"),
        (inspection_path, "scene-inspection-manifest.json"),
        (validation_path, "validation-report.json"),
    ):
        source_path = Path(source)
        target = published / "evidence" / target_name
        if source_path.resolve() != target.resolve():
            target.write_bytes(source_path.read_bytes())

    bpy.ops.file.pack_all()
    blend_path = out_dir / args.blend_name
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path), check_existing=False)
    result = {
        "schema": "vanguard-muramasa-canary-result-v1",
        "attemptId": "muramasa-canary-001-attempt-003",
        "status": "ready-for-normal-size-synchronized-comparison",
        "blend": blend_path.name,
        "blendSha256": digest(blend_path),
        "candidateSha256": digest(candidate_path),
        "correctiveAttachments": corrective,
        "performanceChanged": False,
        "humanAccepted": False,
    }
    (out_dir / "canary-result-attempt-003.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
