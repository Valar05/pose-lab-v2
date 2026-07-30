#!/usr/bin/env python3
"""Refine one synchronized-red Vanguard hardest-key puppet without changing motion."""
from __future__ import annotations

import argparse
import hashlib
import json
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
    parts_dir = out_dir / "parts-attempt-002"
    out_dir.mkdir(parents=True, exist_ok=True)
    parts_dir.mkdir(parents=True, exist_ok=True)

    bpy.ops.wm.open_mainfile(filepath=str(base_blend), load_ui=False, use_scripts=False)
    scene = bpy.context.scene
    config = text_json("Vanguard_CanaryConfig.json")
    track = text_json("GroundedMotion_ReviewedTrack.json")
    weapon_track = text_json("Vanguard_WeaponCompanionTrack.json")
    part_library = load_json(args.part_library)
    if tuple(item["id"] for item in part_library["correctiveAttachments"]) != ATTACHMENTS:
        raise RuntimeError("attempt 2 must contain the three initial attachments plus the synchronized-evidence rear forearm")
    if part_library["correctiveAttachments"][-1]["gateEvidence"]["cloudCaptureSha256"] != "462130acac6d229e6f73661a3cddd9b151874bf18757f07e56eabdf66a5e2a48":
        raise RuntimeError("the fourth attachment lacks the locked synchronized Pose Lab evidence")

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

    # Attempt 1 proved that the broad grip crop carried head/sword fragments and
    # rotated the hand unit by the torso-to-wrist axis. Attempt 2 keeps the exact
    # reviewed wrists but uses the source hand-to-hand axis, then adds only the
    # missing rear forearm surface proved by synchronized Pose Lab comparison.
    remove_object("ATTACH_OverheadTwoHandGrip")
    remove_object("ATTACH_RearForearmForeshortened")
    grip = extract_part(source_idle, "overhead_two_hand_grip_attempt_002", [
        (274, 166), (292, 158), (312, 170), (320, 194),
        (312, 211), (292, 207), (278, 190),
    ], parts_dir)
    rear_forearm = extract_part(source_idle, "rear_forearm_foreshortened", [
        (224, 164), (242, 157), (278, 158), (292, 169),
        (281, 184), (242, 191), (226, 181),
    ], parts_dir)

    left_wrist = output_landmark(frame, "left_wrist", config)
    right_wrist = output_landmark(frame, "right_wrist", config)
    wrist_mid = ((left_wrist[0] + right_wrist[0]) / 2.0, (left_wrist[1] + right_wrist[1]) / 2.0)
    grip_obj = place_part(
        "ATTACH_OverheadTwoHandGrip", *grip, (291, 181), wrist_mid,
        image_angle((278, 174), (307, 194)), image_angle(left_wrist, right_wrist),
        0.40, attachment_collection, 1.0, 1.0, "overhead_two_hand_grip",
    )
    grip_obj["attachment_status"] = "revised-from-synchronized-red-attempt-002"
    grip_obj["source_frame"] = 42
    grip_obj["performance_changed"] = False

    left_elbow = output_landmark(frame, "left_elbow", config)
    rear_obj = place_part(
        "ATTACH_RearForearmForeshortened", *rear_forearm, (239, 176), left_elbow,
        image_angle((239, 176), (278, 170)), image_angle(left_elbow, left_wrist),
        0.38, attachment_collection, 1.12, 1.0, "rear_forearm_foreshortened",
    )
    rear_obj["attachment_status"] = "evidence-justified-attempt-002"
    rear_obj["source_frame"] = 42
    rear_obj["performance_changed"] = False
    rear_obj["cloud_capture_sha256"] = "462130acac6d229e6f73661a3cddd9b151874bf18757f07e56eabdf66a5e2a48"

    for obj in attachment_collection.objects:
        if obj.get("corrective_attachment_id") in ATTACHMENTS:
            obj["attempt_id"] = "muramasa-canary-001-attempt-002"
            obj["human_accepted"] = False

    actual_corrective = [obj.get("corrective_attachment_id") for obj in attachment_collection.objects if obj.get("corrective_attachment_id")]
    if len(actual_corrective) != len(ATTACHMENTS) or set(actual_corrective) != set(ATTACHMENTS):
        raise RuntimeError(f"unexpected attempt-2 attachments: {actual_corrective}")
    corrective = list(ATTACHMENTS)
    scene["corrective_attachments"] = json.dumps(corrective)
    scene["status"] = "quarantined-synchronized-red-attempt-002"
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
    mapping["attemptId"] = "muramasa-canary-001-attempt-002"
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
    inspection["attemptId"] = "muramasa-canary-001-attempt-002"
    inspection["humanAccepted"] = False
    inspection_path.write_text(json.dumps(inspection, indent=2) + "\n", encoding="utf-8")

    validation_path = published / "evidence" / "validation-report.json"
    validation = load_json(validation_path)
    validation["technicalState"] = "rendered-awaiting-second-synchronized-visual-gate"
    validation["correctiveAttachmentCount"] = len(corrective)
    validation["correctiveAttachments"] = corrective
    validation["visualVerdict"] = "attempt 1 synchronized red; attempt 2 pending synchronized Pose Lab comparison and Drew review"
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
        "attemptId": "muramasa-canary-001-attempt-002",
        "status": "ready-for-second-synchronized-comparison",
        "blend": blend_path.name,
        "blendSha256": digest(blend_path),
        "candidateSha256": digest(candidate_path),
        "correctiveAttachments": corrective,
        "performanceChanged": False,
        "humanAccepted": False,
    }
    (out_dir / "canary-result-attempt-002.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
