#!/usr/bin/env python3
"""Package a learning packet into a self-contained cloud-worker job bundle."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_ROOT = ROOT / "generated" / "cloud-worker-jobs"
SCHEMA = "pose-lab-v2-cloud-worker-job-v1"
TOOL = "package_cloud_worker_job.py"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def slugify(value: str) -> str:
    value = re.sub(r"[^A-Za-z0-9._-]+", "-", value.strip()).strip("-._")
    return value[:96] or "cloud-worker-job"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_json(path: Path) -> dict:
    return json.loads(path.read_text())


def copy_input(source: str | None, dest: Path, required: bool) -> dict | None:
    if not source:
        if required:
            raise SystemExit(f"missing required source for {dest.name}")
        return None
    source_path = Path(source)
    if not source_path.exists():
        raise SystemExit(f"source input not found: {source_path}")
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source_path, dest)
    return {
        "path": str(dest),
        "sha256": sha256(dest),
        "originalPath": str(source_path),
        "originalSha256": sha256(source_path),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--learning-packet", required=True)
    parser.add_argument("--label")
    parser.add_argument("--out")
    args = parser.parse_args()

    packet_path = Path(args.learning_packet)
    packet = load_json(packet_path)
    if packet.get("schema") != "pose-lab-v2-learning-packet-v1":
        raise SystemExit(f"not a learning packet: {packet_path}")
    label = args.label or packet.get("label") or packet_path.parent.name
    out_dir = Path(args.out) if args.out else OUT_ROOT / slugify(label)
    inputs_dir = out_dir / "inputs"
    out_dir.mkdir(parents=True, exist_ok=True)
    inputs_dir.mkdir(parents=True, exist_ok=True)

    shutil.copyfile(packet_path, out_dir / "learning_manifest.json")
    source = packet.get("source", {})
    packaged_inputs = {
        "legacyPoseclip": copy_input(source.get("legacyPoseclip"), inputs_dir / "legacy_poseclip.json", True),
        "legacyEvidence": copy_input(source.get("legacyEvidence"), inputs_dir / "legacy_evidence.json", True),
        "tripodContactManifest": copy_input(source.get("tripodContactManifest"), inputs_dir / "tripod_contact_manifest.json", False),
        "videoLedger": copy_input(source.get("videoLedger"), inputs_dir / "video_ledger.json", False),
    }
    job = {
        "schema": SCHEMA,
        "status": packet.get("status", "draft"),
        "tool": TOOL,
        "generatedAt": utc_now(),
        "label": label,
        "target": packet.get("target", {}),
        "phaseTags": packet.get("phaseTags", []),
        "learningPacket": {
            "path": str(out_dir / "learning_manifest.json"),
            "sha256": sha256(out_dir / "learning_manifest.json"),
            "originalPath": str(packet_path),
            "originalSha256": sha256(packet_path),
        },
        "inputs": packaged_inputs,
        "requiredDocs": [
            "CODEX_STARTS_HERE.md",
            "PROJECT_ORIENTATION.md",
            "docs/CLOUD_WORKER_ANIMATION_SURFACE.md",
            "docs/CLOUD_WORKER_OUTPUT_CONTRACT.md",
            "docs/LOCAL_BLENDER_ANIMATION_MUSCLE.md",
        ],
        "expectedOutputs": [
            "outputs/worker_report.md",
            "outputs/observations.json",
            "outputs/artifact_manifest.json",
        ],
        "blockedOutput": "outputs/blocked_reason.txt",
        "workerContract": {
            "dispatchSurface": "Home Center Command Center MCP",
            "mcpEndpoint": "https://us-central1-home-center-dclar.cloudfunctions.net/commandCenterMcp/mcp",
            "workerRequirements": ["codex", "one-shot-worker", "prepared-workspace"],
            "mayWrite": ["generated/cloud-worker-jobs/<job-id>/outputs/"],
            "mustNotWrite": ["src/", "public/", "dist/", "docs/", "package.json"],
            "forbiddenDependencies": [".codex", "memories", "workspace skills", "local browser state"],
            "acceptance": "diagnostic only; hosted visual review remains final for promoted animation",
            "noTripodVideoPolicy": "NO_TRIPOD_VIDEO is incomplete input, not worker failure; legacy choreography analysis may proceed with that caveat.",
        },
    }
    job_path = out_dir / "job.json"
    job_path.write_text(json.dumps(job, indent=2) + "\n")
    print(str(job_path))


if __name__ == "__main__":
    main()
