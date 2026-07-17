#!/usr/bin/env python3
"""Smoke tests for local learning-packet generation."""

from __future__ import annotations

import json
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POSECLIP = ROOT.parent / "pose-lab" / "assets" / "pose_indexes" / "ares_lowbackkick_sf2.poseclip.json"
EVIDENCE = ROOT.parent / "pose-lab" / "assets" / "pose_indexes" / "ares_lowbackkick_sf2_visual_evidence.json"
EXPECTED_PHASES = [
    "start",
    "windup",
    "anticipation",
    "anticipationHold",
    "contact",
    "contactHold",
    "recoil",
    "settle",
]


def run_tool(*args: str) -> Path:
    result = subprocess.run(
        ["python3", str(ROOT / "tools" / "build_learning_packet.py"), *args],
        check=True,
        capture_output=True,
        text=True,
    )
    return Path(result.stdout.strip())


def assert_no_tripod_packet() -> None:
    with tempfile.TemporaryDirectory() as temp:
        manifest_path = run_tool(
            "--legacy-poseclip", str(POSECLIP),
            "--legacy-evidence", str(EVIDENCE),
            "--out", str(Path(temp) / "packet"),
        )
        packet = json.loads(manifest_path.read_text())
        assert packet["schema"] == "pose-lab-v2-learning-packet-v1"
        assert packet["status"] == "NO_TRIPOD_VIDEO"
        assert packet["phaseTags"] == EXPECTED_PHASES
        assert len(packet["phaseAlignment"]) == len(EXPECTED_PHASES)
        assert not packet["promotion"]["allowed"]


def assert_tripod_contact_packet() -> None:
    with tempfile.TemporaryDirectory() as temp:
        temp_path = Path(temp)
        video_path = temp_path / "tripod.mp4"
        video_path.write_bytes(b"synthetic-video-placeholder")
        contact_dir = temp_path / "contact"
        contact_dir.mkdir()
        contact_manifest = {
            "schema": "pose-lab-v2-video-contact-sheet-v1",
            "status": "draft",
            "source": {
                "path": str(video_path),
                "sha256": "synthetic",
                "ledger": None,
                "clipId": "lowbackkick-attempt-1",
                "clipLabel": "Low Back Kick attempt 1",
                "clipStart": 0,
                "clipEnd": 1,
            },
            "frames": [
                {"id": f"f{index:03d}", "label": f"f{index:03d}", "time": index / 10, "image": f"f{index:03d}.jpg"}
                for index in range(8)
            ],
        }
        contact_manifest_path = contact_dir / "manifest.json"
        contact_manifest_path.write_text(json.dumps(contact_manifest, indent=2) + "\n")
        ledger = {
            "schema": "pose-lab-v2-video-clip-ledger-v1",
            "source": {
                "path": str(video_path),
                "name": video_path.name,
                "sha256": "synthetic",
            },
            "clips": [{
                "id": "lowbackkick-attempt-1",
                "label": "Low Back Kick attempt 1",
                "start": 0,
                "end": 1,
                "duration": 1,
                "artifacts": [{
                    "kind": "video-contact-sheet",
                    "manifest": str(contact_manifest_path),
                }],
            }],
        }
        ledger_path = temp_path / "ledger.json"
        ledger_path.write_text(json.dumps(ledger, indent=2) + "\n")
        manifest_path = run_tool(
            "--legacy-poseclip", str(POSECLIP),
            "--legacy-evidence", str(EVIDENCE),
            "--video-ledger", str(ledger_path),
            "--clip-id", "lowbackkick-attempt-1",
            "--out", str(temp_path / "packet"),
        )
        packet = json.loads(manifest_path.read_text())
        assert packet["status"] == "draft"
        assert packet["phaseTags"] == EXPECTED_PHASES
        assert packet["phaseAlignment"][0]["tripodFrame"]["id"] == "f000"
        assert packet["phaseAlignment"][-1]["tripodFrame"]["id"] == "f007"


if __name__ == "__main__":
    assert_no_tripod_packet()
    assert_tripod_contact_packet()
    print("learning packet tests passed")
