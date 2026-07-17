#!/usr/bin/env python3
"""Build a local learning packet from a legacy poseclip and optional tripod clip."""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_ROOT = ROOT / "generated" / "learning"
SCHEMA = "pose-lab-v2-learning-packet-v1"
TOOL = "build_learning_packet.py"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def slugify(value: str) -> str:
    value = re.sub(r"[^A-Za-z0-9._-]+", "-", value.strip()).strip("-._")
    return value[:96] or "learning-packet"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def rel(path: Path, base: Path) -> str:
    try:
        return str(path.resolve().relative_to(base.resolve()))
    except ValueError:
        return str(path)


def load_json(path: Path) -> dict:
    return json.loads(path.read_text())


def evidence_slots(evidence: dict) -> list[dict]:
    slots = evidence.get("captureSlots", [])
    if not slots:
        raise SystemExit("legacy evidence has no captureSlots")
    return sorted(slots, key=lambda slot: int(slot.get("spriteFrame", 0)))


def poseclip_frames(poseclip: dict) -> list[dict]:
    reduction = poseclip.get("clip", {}).get("userData", {}).get("sourceReduction", {})
    frames = reduction.get("spriteFrames", [])
    if not frames:
        raise SystemExit("legacy poseclip has no sourceReduction.spriteFrames")
    return sorted(frames, key=lambda frame: int(frame.get("spriteFrame", 0)))


def load_ledger_clip(path: Path | None, clip_id: str | None) -> tuple[dict | None, dict | None]:
    if not path:
        return None, None
    if not clip_id:
        raise SystemExit("--clip-id is required with --video-ledger")
    ledger = load_json(path)
    for clip in ledger.get("clips", []):
        if clip.get("id") == clip_id:
            return ledger, clip
    raise SystemExit(f"clip not found in ledger: {clip_id}")


def find_contact_manifest(clip: dict | None, explicit: Path | None) -> Path | None:
    if explicit:
        return explicit
    if not clip:
        return None
    for artifact in reversed(clip.get("artifacts", [])):
        manifest = artifact.get("manifest")
        if artifact.get("kind") == "video-contact-sheet" and manifest and Path(manifest).exists():
            return Path(manifest)
    return None


def select_tripod_frame(frames: list[dict], phase_index: int, phase_count: int) -> dict | None:
    if not frames:
        return None
    if phase_count <= 1:
        return frames[0]
    index = round((len(frames) - 1) * (phase_index / (phase_count - 1)))
    return frames[max(0, min(len(frames) - 1, index))]


def build_phase_alignment(slots: list[dict], tripod_manifest: dict | None) -> list[dict]:
    tripod_frames = tripod_manifest.get("frames", []) if tripod_manifest else []
    alignment = []
    for index, slot in enumerate(slots):
        tripod = select_tripod_frame(tripod_frames, index, len(slots))
        alignment.append({
            "phase": slot["tag"],
            "evidenceKey": slot.get("evidenceKey"),
            "spriteFrame": slot.get("spriteFrame"),
            "legacyPoseclipTime": slot.get("poseclipTime"),
            "legacySourceTime": slot.get("sourceTime"),
            "description": slot.get("description", ""),
            "metrics": {
                "reach": slot.get("reach"),
                "effectorHeight": slot.get("effectorHeight"),
                "effectorExtension": slot.get("effectorExtension"),
                "motionTotal": slot.get("motionTotal"),
            },
            "tripodFrame": {
                "id": tripod.get("id"),
                "time": tripod.get("time"),
                "image": tripod.get("image"),
                "selection": "even-phase-proposal",
            } if tripod else None,
        })
    return alignment


def learning_observations(slots: list[dict], poseclip: dict) -> list[dict]:
    reduction = poseclip.get("clip", {}).get("userData", {}).get("sourceReduction", {})
    foot_plant = poseclip.get("clip", {}).get("userData", {}).get("footPlantProfile")
    upper_body = poseclip.get("clip", {}).get("userData", {}).get("kickPrecontactUpperBodyCarry")
    observations = [
        {
            "topic": "phase-shape",
            "note": "Low Back Kick is a good first learning specimen because it already has explicit windup, anticipation hold, contact hold, recoil, and settle reads.",
            "evidence": [slot["tag"] for slot in slots],
        },
        {
            "topic": "timing",
            "note": reduction.get("timingPolicy", "preserve source burst, readable holds, and recovery"),
            "evidence": reduction.get("segments", []),
        },
        {
            "topic": "body-mechanics",
            "note": "The learning packet should judge support-foot plant, hips-first turn, torso compression/carry, low-foot contact, and recoil rather than only leg endpoint position.",
            "evidence": {
                "footPlantProfile": foot_plant,
                "kickPrecontactUpperBodyCarry": upper_body,
            },
        },
    ]
    return observations


def write_html(packet: dict, path: Path) -> None:
    rows = []
    for phase in packet["phaseAlignment"]:
        tripod = phase.get("tripodFrame")
        tripod_text = "not supplied"
        if tripod:
            tripod_text = f"{html.escape(str(tripod.get('id')))} @ {tripod.get('time'):.3f}s"
        rows.append(
            "<tr>"
            f"<td>{html.escape(phase['phase'])}</td>"
            f"<td>{phase.get('spriteFrame')}</td>"
            f"<td>{phase.get('legacyPoseclipTime')}</td>"
            f"<td>{html.escape(phase.get('description') or '')}</td>"
            f"<td>{tripod_text}</td>"
            "</tr>"
        )
    status = html.escape(packet["status"])
    body = """<!doctype html><meta charset='utf-8'>
<title>Learning Packet</title>
<style>
body{margin:0;background:#101214;color:#eee;font:15px system-ui;line-height:1.45}
main{padding:18px;max-width:1120px;margin:0 auto}
table{width:100%;border-collapse:collapse;background:#181c20}
th,td{border:1px solid #303942;padding:8px;text-align:left;vertical-align:top}
th{background:#232a31}
code{color:#d7e5ff}
.status{display:inline-block;padding:3px 8px;border-radius:4px;background:#2a3440}
</style>
<main>
<h1>Low Back Kick Learning Packet</h1>
<p>Status: <span class='status'>""" + status + """</span></p>
<p>This is a local learning surface. It is not a promoted animation and not browser acceptance.</p>
<h2>Phase Alignment</h2>
<table><thead><tr><th>Phase</th><th>Sprite frame</th><th>Poseclip time</th><th>Legacy read</th><th>Tripod proposal</th></tr></thead><tbody>""" + "".join(rows) + """</tbody></table>
<h2>Artifacts</h2>
<p>Machine-readable manifest: <code>manifest.json</code></p>
</main>
"""
    path.write_text(body)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--legacy-poseclip", required=True)
    parser.add_argument("--legacy-evidence", required=True)
    parser.add_argument("--video-ledger")
    parser.add_argument("--clip-id")
    parser.add_argument("--tripod-contact-manifest")
    parser.add_argument("--label", default="Low Back Kick learning packet")
    parser.add_argument("--out")
    args = parser.parse_args()

    poseclip_path = Path(args.legacy_poseclip)
    evidence_path = Path(args.legacy_evidence)
    poseclip = load_json(poseclip_path)
    evidence = load_json(evidence_path)
    slots = evidence_slots(evidence)
    frames = poseclip_frames(poseclip)
    frame_tags = [frame.get("tag") for frame in frames]
    slot_tags = [slot.get("tag") for slot in slots]
    if frame_tags != slot_tags:
        raise SystemExit(f"poseclip/evidence phase mismatch: {frame_tags} != {slot_tags}")

    ledger_path = Path(args.video_ledger) if args.video_ledger else None
    ledger, clip = load_ledger_clip(ledger_path, args.clip_id)
    contact_path = find_contact_manifest(clip, Path(args.tripod_contact_manifest) if args.tripod_contact_manifest else None)
    tripod_manifest = load_json(contact_path) if contact_path else None

    status = "draft"
    gaps = []
    if ledger_path and not contact_path:
        status = "NO_TRIPOD_CONTACT_SHEET"
        gaps.append("video ledger clip exists, but no contact sheet artifact was found")
    if not ledger_path:
        status = "NO_TRIPOD_VIDEO"
        gaps.append("no tripod video ledger supplied")

    out_dir = Path(args.out) if args.out else OUT_ROOT / "lowbackkick" / slugify(args.label)
    out_dir.mkdir(parents=True, exist_ok=True)
    packet = {
        "schema": SCHEMA,
        "status": status,
        "tool": TOOL,
        "generatedAt": utc_now(),
        "label": args.label,
        "target": {
            "family": "Gravity Fist",
            "actor": evidence.get("actorLabel"),
            "attack": evidence.get("attackName"),
            "sourceClipName": evidence.get("sourceClipName"),
        },
        "source": {
            "legacyPoseclip": str(poseclip_path),
            "legacyPoseclipSha256": sha256(poseclip_path),
            "legacyEvidence": str(evidence_path),
            "legacyEvidenceSha256": sha256(evidence_path),
            "videoLedger": str(ledger_path) if ledger_path else None,
            "videoLedgerSha256": sha256(ledger_path) if ledger_path else None,
            "clipId": args.clip_id,
            "tripodContactManifest": str(contact_path) if contact_path else None,
            "tripodContactManifestSha256": sha256(contact_path) if contact_path else None,
        },
        "phaseTags": slot_tags,
        "phaseAlignment": build_phase_alignment(slots, tripod_manifest),
        "learningObservations": learning_observations(slots, poseclip),
        "gaps": gaps,
        "promotion": {
            "allowed": False,
            "reason": "learning packets are diagnostic input; they do not promote animation candidates",
        },
        "artifacts": {
            "html": "packet.html",
        },
    }
    manifest_path = out_dir / "manifest.json"
    html_path = out_dir / "packet.html"
    manifest_path.write_text(json.dumps(packet, indent=2) + "\n")
    write_html(packet, html_path)
    print(str(manifest_path))


if __name__ == "__main__":
    main()
