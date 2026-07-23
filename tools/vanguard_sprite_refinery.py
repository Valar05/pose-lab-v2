#!/usr/bin/env python3
"""Repository-owned, resumable Vanguard sprite refinery.

This tool never calls an appearance provider.  It packages native Steel evidence,
accepts manually returned sheets, performs structural checks, records human
decisions, and collects only explicitly approved attempts.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image


SCHEMA = "vanguard-sprite-refinery-batch-v1"
STATE_SCHEMA = "vanguard-sprite-refinery-state-v1"
CONCEPT_ID = "file_00000000500881f4adab6e2f24ce0c7d"
CONCEPT_HASH = "a81310b22ed537ec0aac39133bcf810d965ff2f2d00d7f9a8a56472c04c6878e"
CONCEPT_SIZE = 316594
CONCEPT_TARGET = "public/assets/vanguard/concepts/fleshpunk-vanguard-v1.jpg"
CAMERA = "vanguard-orthographic-screen-right-v1"
STATES = {"planned", "rendering", "awaiting_skin", "candidate", "red", "approved", "ready", "blocked"}


def digest(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def read_json(path: Path) -> dict:
    return json.loads(path.read_text())


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n")


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def fail(message: str) -> None:
    raise ValueError(message)


def validate_manifest(data: dict) -> None:
    if data.get("schema") != SCHEMA:
        fail(f"manifest schema must be {SCHEMA}")
    if not isinstance(data.get("batchId"), str) or not re.fullmatch(r"[a-z0-9][a-z0-9-]*", data["batchId"]):
        fail("batchId must contain only lowercase letters, digits, and hyphens")
    concurrency = data.get("maxConcurrency")
    if not isinstance(concurrency, int) or not 1 <= concurrency <= 8:
        fail("maxConcurrency must be an integer from 1 through 8")
    concept = data.get("concept", {})
    expected = (CONCEPT_ID, CONCEPT_HASH, CONCEPT_TARGET)
    actual = (concept.get("id"), concept.get("sha256"), concept.get("target"))
    if actual != expected:
        fail("manifest must name the exact approved Vanguard concept id, hash, and target")
    clips = data.get("clips")
    if not isinstance(clips, list) or not clips:
        fail("clips must be a non-empty list")
    seen = set()
    for clip in clips:
        clip_id = clip.get("id")
        if not isinstance(clip_id, str) or not re.fullmatch(r"[a-z0-9][a-z0-9-]*", clip_id) or clip_id in seen:
            fail(f"clip id is missing or duplicated: {clip_id!r}")
        seen.add(clip_id)
        if not isinstance(clip.get("nativeAction"), str) or not clip["nativeAction"]:
            fail(f"{clip_id}: nativeAction is required")
        samples, timing = clip.get("frameSamples"), clip.get("timingMs")
        if not isinstance(samples, list) or not samples or not all(isinstance(v, int) and v >= 0 for v in samples):
            fail(f"{clip_id}: frameSamples must be non-negative integers")
        if len(set(samples)) != len(samples):
            fail(f"{clip_id}: frameSamples must be unique")
        if not isinstance(timing, list) or len(timing) != len(samples) or not all(isinstance(v, int) and v > 0 for v in timing):
            fail(f"{clip_id}: timingMs must contain one positive duration per frame")
        if clip.get("facing") != "screen-right" or clip.get("cameraProfile") != CAMERA:
            fail(f"{clip_id}: locked screen-right camera profile is required")
        grid = clip.get("grid", {})
        if grid.get("columns", 0) * grid.get("rows", 0) != len(samples):
            fail(f"{clip_id}: grid must exactly contain every sampled frame")


def load(manifest_path: Path, root_arg: str | None) -> tuple[dict, Path]:
    manifest = read_json(manifest_path)
    validate_manifest(manifest)
    root = Path(root_arg) if root_arg else Path("generated/vanguard-refinery") / manifest["batchId"]
    return manifest, root


def initial_state(manifest: dict) -> dict:
    return {
        "schema": STATE_SCHEMA,
        "batchId": manifest["batchId"],
        "manifestSha256": None,
        "updatedAt": now(),
        "clips": {clip["id"]: {"state": "planned", "attempts": {}} for clip in manifest["clips"]},
    }


def state_for(manifest: dict, manifest_path: Path, root: Path) -> dict:
    path = root / "state.json"
    state = read_json(path) if path.exists() else initial_state(manifest)
    if state.get("schema") != STATE_SCHEMA or state.get("batchId") != manifest["batchId"]:
        fail("state does not belong to this batch")
    manifest_hash = digest(manifest_path)
    prior = state.get("manifestSha256")
    if prior not in (None, manifest_hash):
        fail("batch manifest changed after state was created; create a new batch id")
    state["manifestSha256"] = manifest_hash
    return state


def save_state(root: Path, state: dict) -> None:
    state["updatedAt"] = now()
    write_json(root / "state.json", state)


def select_clips(manifest: dict, clip_id: str | None) -> list[dict]:
    clips = manifest["clips"]
    if clip_id is None:
        return clips
    selected = [clip for clip in clips if clip["id"] == clip_id]
    if not selected:
        fail(f"unknown clip: {clip_id}")
    return selected


def concept_available(manifest: dict, fixture: bool) -> bool:
    if fixture:
        return True
    target = Path(manifest["concept"]["target"])
    return target.is_file() and target.stat().st_size == CONCEPT_SIZE and digest(target) == CONCEPT_HASH


def cmd_import_concept(args: argparse.Namespace) -> None:
    source, target = Path(args.source), Path(CONCEPT_TARGET)
    if source.stat().st_size != CONCEPT_SIZE or digest(source) != CONCEPT_HASH:
        fail("concept import refused: bytes do not match approved size and SHA-256")
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists() and digest(target) == CONCEPT_HASH:
        print(json.dumps({"state": "ready", "target": str(target), "reused": True}))
        return
    shutil.copyfile(source, target)
    print(json.dumps({"state": "ready", "target": str(target), "sha256": digest(target)}))


def packet_hashes(packet: Path) -> dict[str, str]:
    names = ["manifest.json", "geometry-grid.png", "limb-id-grid.png", "depth-grid.png", "beauty-grid.png", "appearance-only-generation-contract.json"]
    missing = [name for name in names if not (packet / name).is_file()]
    if missing:
        fail(f"pose packet is incomplete: {', '.join(missing)}")
    return {name: digest(packet / name) for name in names}


def cmd_prepare(args: argparse.Namespace) -> None:
    manifest_path = Path(args.manifest)
    manifest, root = load(manifest_path, args.root)
    state = state_for(manifest, manifest_path, root)
    has_concept = concept_available(manifest, args.fixture)
    for clip in select_clips(manifest, args.clip):
        clip_state = state["clips"][clip["id"]]
        packet = Path(clip["posePacket"])
        try:
            hashes = packet_hashes(packet)
        except (ValueError, FileNotFoundError) as error:
            clip_state.update({"state": "blocked", "failureKind": "infrastructure", "reason": str(error)})
            continue
        work_dir = root / "clips" / clip["id"]
        work_dir.mkdir(parents=True, exist_ok=True)
        bundled_packet = work_dir / "steel-pose-packet"
        bundled_packet.mkdir(exist_ok=True)
        for name in hashes:
            shutil.copyfile(packet / name, bundled_packet / name)
        output_name = f"{manifest['batchId']}--{clip['id']}--attempt-001.png"
        packet_data = {
            "schema": "vanguard-chatgpt-work-packet-v1",
            "batchId": manifest["batchId"], "clipId": clip["id"], "attemptId": "attempt-001",
            "state": "awaiting_skin", "nativeAction": clip["nativeAction"],
            "concept": {**manifest["concept"], "originalMetadataName": "upload/01-562930.png", "materialized": has_concept},
            "steelPosePacket": {"path": "steel-pose-packet", "sourcePath": clip["posePacket"], "hashes": hashes},
            "geometryContract": {
                "authority": "native Steel Vanguard only", "immutable": True,
                "owns": ["pose", "camera", "facing", "hand depth", "weapon geometry", "cloth motion", "frame order", "timing"],
                "appearanceProvider": "interactive ChatGPT image generation (manual handoff only)"
            },
            "grid": {**clip["grid"], "cellWidth": 512, "cellHeight": 512, "order": "row-major"},
            "frameSamples": clip["frameSamples"], "timingMs": clip["timingMs"],
            "expectedOutputFilename": output_name,
            "forbiddenChanges": ["mirror", "reframe", "stabilize", "interpolate", "redraw geometry", "change occlusion", "recurse from generated output"],
            "ingestionCommand": f"npm run refinery:vanguard -- ingest --manifest {args.manifest} --clip {clip['id']} --attempt attempt-001 --sheet {output_name}",
        }
        write_json(work_dir / "work-packet.json", packet_data)
        if clip_state["state"] in {"planned", "rendering", "awaiting_skin", "blocked"}:
            clip_state["state"] = "awaiting_skin"
        clip_state["workPacket"] = f"clips/{clip['id']}/work-packet.json"
        clip_state.pop("failureKind", None); clip_state.pop("reason", None)
    save_state(root, state)
    print(json.dumps({"batchId": manifest["batchId"], "root": str(root), "states": {k: v["state"] for k, v in state["clips"].items()}, "conceptMaterialized": has_concept}))


def cmd_queue(args: argparse.Namespace) -> None:
    manifest, _ = load(Path(args.manifest), args.root)
    matrix = {"include": [{"clip": clip["id"]} for clip in manifest["clips"]]}
    print(json.dumps({"matrix": matrix, "maxConcurrency": manifest["maxConcurrency"]}, separators=(",", ":")))


def cmd_status(args: argparse.Namespace) -> None:
    manifest_path = Path(args.manifest); manifest, root = load(manifest_path, args.root)
    state = state_for(manifest, manifest_path, root)
    print(json.dumps({"batchId": manifest["batchId"], "root": str(root), "states": {key: value["state"] for key, value in state["clips"].items()}, "details": state["clips"]}, indent=2))


def cmd_ingest(args: argparse.Namespace) -> None:
    manifest_path = Path(args.manifest); manifest, root = load(manifest_path, args.root)
    state = state_for(manifest, manifest_path, root); clip = select_clips(manifest, args.clip)[0]
    sheet = Path(args.sheet); raw_hash = digest(sheet)
    attempt_dir = root / "clips" / args.clip / "attempts" / args.attempt
    record_path = attempt_dir / "provenance.json"
    if record_path.exists():
        record = read_json(record_path)
        if record["rawSheetSha256"] != raw_hash:
            fail("attempt id already exists with different returned-sheet bytes")
        print(json.dumps({"state": record["state"], "duplicate": True, "rawSheetSha256": raw_hash})); return
    expected_name = f"{manifest['batchId']}--{args.clip}--{args.attempt}.png"
    if sheet.name != expected_name:
        fail(f"returned sheet filename must be {expected_name}")
    with Image.open(sheet) as source:
        image = source.convert("RGBA")
    columns, rows = clip["grid"]["columns"], clip["grid"]["rows"]
    if image.size != (columns * 512, rows * 512):
        fail(f"returned sheet must be exactly {columns * 512}x{rows * 512}")
    attempt_dir.mkdir(parents=True, exist_ok=False)
    raw_path = attempt_dir / "raw-sheet.png"; shutil.copyfile(sheet, raw_path)
    frames = []
    for index, duration in enumerate(clip["timingMs"]):
        x, y = (index % columns) * 512, (index // columns) * 512
        frame_path = attempt_dir / "frames" / f"{args.clip}_{index:04d}.png"
        frame_path.parent.mkdir(parents=True, exist_ok=True)
        image.crop((x, y, x + 512, y + 512)).save(frame_path, format="PNG")
        frames.append({"index": index, "sourceFrame": clip["frameSamples"][index], "durationMs": duration, "path": str(frame_path.relative_to(root)), "sha256": digest(frame_path)})
    record = {"schema": "vanguard-refinery-attempt-v1", "batchId": manifest["batchId"], "clipId": args.clip, "attemptId": args.attempt, "state": "candidate", "rawSheet": str(raw_path.relative_to(root)), "rawSheetSha256": raw_hash, "ingestedAt": now(), "provider": "interactive ChatGPT image generation", "model": None, "frames": frames}
    write_json(record_path, record)
    state["clips"][args.clip]["attempts"][args.attempt] = {"state": "candidate", "provenance": str(record_path.relative_to(root))}
    state["clips"][args.clip]["state"] = "candidate"; save_state(root, state)
    print(json.dumps({"state": "candidate", "duplicate": False, "rawSheetSha256": raw_hash, "frames": len(frames)}))


def attempt_record(manifest: dict, root: Path, clip: str, attempt: str) -> tuple[Path, dict]:
    path = root / "clips" / clip / "attempts" / attempt / "provenance.json"
    if not path.exists(): fail("attempt has not been ingested")
    record = read_json(path)
    if (record.get("batchId"), record.get("clipId"), record.get("attemptId")) != (manifest["batchId"], clip, attempt):
        fail("attempt identity mismatch")
    return path, record


def cmd_verify(args: argparse.Namespace) -> None:
    manifest_path = Path(args.manifest); manifest, root = load(manifest_path, args.root)
    state = state_for(manifest, manifest_path, root); path, record = attempt_record(manifest, root, args.clip, args.attempt)
    failures = []
    raw = root / record["rawSheet"]
    if not raw.exists() or digest(raw) != record["rawSheetSha256"]: failures.append("raw sheet hash mismatch")
    for frame in record["frames"]:
        target = root / frame["path"]
        if not target.exists() or digest(target) != frame["sha256"]: failures.append(f"frame {frame['index']} hash mismatch")
        elif Image.open(target).convert("RGBA").size != (512, 512): failures.append(f"frame {frame['index']} dimensions changed")
    new_state = "red" if failures else "candidate"
    record["state"] = new_state; record["structuralVerification"] = {"checkedAt": now(), "failures": failures}
    write_json(path, record); state["clips"][args.clip]["state"] = new_state; state["clips"][args.clip]["attempts"][args.attempt]["state"] = new_state; save_state(root, state)
    print(json.dumps({"state": new_state, "failures": failures}))
    if failures: sys.exit(1)


def cmd_reject(args: argparse.Namespace) -> None:
    manifest_path = Path(args.manifest); manifest, root = load(manifest_path, args.root)
    state = state_for(manifest, manifest_path, root); path, record = attempt_record(manifest, root, args.clip, args.attempt)
    record["state"] = "red"; record["rejection"] = {"reason": args.reason, "reviewer": args.reviewer, "timestamp": now()}; write_json(path, record)
    state["clips"][args.clip]["state"] = "red"; state["clips"][args.clip]["attempts"][args.attempt]["state"] = "red"; save_state(root, state)
    print(json.dumps({"state": "red", "reason": args.reason}))


def cmd_approve(args: argparse.Namespace) -> None:
    manifest_path = Path(args.manifest); manifest, root = load(manifest_path, args.root)
    state = state_for(manifest, manifest_path, root); path, record = attempt_record(manifest, root, args.clip, args.attempt)
    if record.get("state") != "candidate" or record.get("structuralVerification", {}).get("failures") != []:
        fail("only a structurally verified candidate may be explicitly approved")
    approval = {"schema": "vanguard-refinery-approval-v1", "batchId": manifest["batchId"], "clipId": args.clip, "attemptId": args.attempt, "rawSheetSha256": record["rawSheetSha256"], "frameSha256": [frame["sha256"] for frame in record["frames"]], "reviewer": args.reviewer, "timestamp": now()}
    write_json(path.parent / "approval.json", approval); record["state"] = "approved"; write_json(path, record)
    state["clips"][args.clip]["state"] = "approved"; state["clips"][args.clip]["attempts"][args.attempt]["state"] = "approved"; save_state(root, state)
    print(json.dumps({"state": "approved", "approval": str(path.parent / "approval.json")}))


def cmd_collect(args: argparse.Namespace) -> None:
    manifest_path = Path(args.manifest); manifest, root = load(manifest_path, args.root)
    state = state_for(manifest, manifest_path, root); registry_path = Path(args.registry)
    if args.worker_artifacts:
        workers = Path(args.worker_artifacts)
        for packet_path in workers.rglob("work-packet.json"):
            packet = read_json(packet_path)
            if packet.get("batchId") != manifest["batchId"]:
                fail(f"worker packet belongs to another batch: {packet_path}")
            clip_id = packet.get("clipId")
            if clip_id not in state["clips"]:
                fail(f"worker packet names unknown clip: {clip_id}")
            target = root / "clips" / clip_id / "work-packet.json"
            target.parent.mkdir(parents=True, exist_ok=True); shutil.copyfile(packet_path, target)
            if state["clips"][clip_id]["state"] == "planned": state["clips"][clip_id]["state"] = "awaiting_skin"
            state["clips"][clip_id]["workPacket"] = str(target.relative_to(root))
    registry = read_json(registry_path) if registry_path.exists() else {"schema": "vanguard-refinery-registry-v1", "batches": {}}
    batch_entry = registry["batches"].setdefault(manifest["batchId"], {"clips": {}})
    for clip in manifest["clips"]:
        info = state["clips"][clip["id"]]
        approved = [key for key, value in info["attempts"].items() if value["state"] == "approved"]
        if len(approved) != 1: continue
        attempt = approved[0]; _, record = attempt_record(manifest, root, clip["id"], attempt)
        approval = read_json(root / "clips" / clip["id"] / "attempts" / attempt / "approval.json")
        expected_binding = (manifest["batchId"], clip["id"], attempt, record["rawSheetSha256"], [frame["sha256"] for frame in record["frames"]])
        actual_binding = (approval.get("batchId"), approval.get("clipId"), approval.get("attemptId"), approval.get("rawSheetSha256"), approval.get("frameSha256"))
        if actual_binding != expected_binding or not approval.get("reviewer") or not approval.get("timestamp"):
            fail(f"approval binding mismatch for {clip['id']} {attempt}")
        batch_entry["clips"][clip["id"]] = {"state": "ready", "attemptId": attempt, "approval": approval, "frames": record["frames"]}
        info["state"] = "ready"
    save_state(root, state); write_json(registry_path, registry)
    print(json.dumps({"states": {key: value["state"] for key, value in state["clips"].items()}, "registry": str(registry_path)}))


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(); subs = result.add_subparsers(dest="command", required=True)
    concept = subs.add_parser("import-concept"); concept.add_argument("--source", required=True); concept.set_defaults(func=cmd_import_concept)
    for name, func in (("prepare", cmd_prepare), ("queue", cmd_queue), ("status", cmd_status), ("ingest", cmd_ingest), ("verify", cmd_verify), ("reject", cmd_reject), ("approve", cmd_approve), ("collect", cmd_collect)):
        sub = subs.add_parser(name); sub.add_argument("--manifest", required=True); sub.add_argument("--root")
        if name in {"prepare", "ingest", "verify", "reject", "approve"}: sub.add_argument("--clip", required=name != "prepare")
        if name == "prepare": sub.add_argument("--fixture", action="store_true")
        if name in {"ingest", "verify", "reject", "approve"}: sub.add_argument("--attempt", required=True)
        if name == "ingest": sub.add_argument("--sheet", required=True)
        if name == "reject": sub.add_argument("--reason", required=True); sub.add_argument("--reviewer", required=True)
        if name == "approve": sub.add_argument("--reviewer", required=True)
        if name == "collect":
            sub.add_argument("--registry", default="generated/vanguard-refinery/registry.json")
            sub.add_argument("--worker-artifacts", help="collector-only directory containing isolated worker artifacts")
        sub.set_defaults(func=func)
    return result


def main() -> None:
    args = parser().parse_args()
    try: args.func(args)
    except (ValueError, FileNotFoundError, KeyError, json.JSONDecodeError) as error:
        print(json.dumps({"state": "blocked", "failureKind": "infrastructure", "error": str(error)}), file=sys.stderr); sys.exit(2)


if __name__ == "__main__": main()
