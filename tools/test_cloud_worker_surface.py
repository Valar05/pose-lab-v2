#!/usr/bin/env python3
"""Verify learning packets can be packaged without hidden workspace dependencies."""

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


def run(command: list[str]) -> Path:
    result = subprocess.run(command, cwd=ROOT, check=True, capture_output=True, text=True)
    return Path(result.stdout.strip())


def main() -> None:
    with tempfile.TemporaryDirectory() as temp:
        temp_path = Path(temp)
        packet_path = run([
            "python3",
            "tools/build_learning_packet.py",
            "--legacy-poseclip",
            str(POSECLIP),
            "--legacy-evidence",
            str(EVIDENCE),
            "--out",
            str(temp_path / "packet"),
        ])
        job_path = run([
            "python3",
            "tools/package_cloud_worker_job.py",
            "--learning-packet",
            str(packet_path),
            "--out",
            str(temp_path / "job"),
        ])
        job = json.loads(job_path.read_text())
        assert job["schema"] == "pose-lab-v2-cloud-worker-job-v1"
        assert job["status"] == "NO_TRIPOD_VIDEO"
        assert job["phaseTags"] == EXPECTED_PHASES
        for key in ["legacyPoseclip", "legacyEvidence"]:
            packaged = job["inputs"][key]
            assert packaged is not None
            assert Path(packaged["path"]).exists()
            assert packaged["sha256"] == packaged["originalSha256"]
        forbidden = " ".join(job["workerContract"]["forbiddenDependencies"])
        assert ".codex" in forbidden
        assert "memories" in forbidden
        assert "workspace skills" in forbidden
        assert job["workerContract"]["dispatchSurface"] == "Home Center Command Center MCP"
        assert "commandCenterMcp/mcp" in job["workerContract"]["mcpEndpoint"]
        assert "codex" in job["workerContract"]["workerRequirements"]
        assert "one-shot-worker" in job["workerContract"]["workerRequirements"]
        assert "CODEX_STARTS_HERE.md" in job["requiredDocs"]
        assert "docs/CLOUD_WORKER_OUTPUT_CONTRACT.md" in job["requiredDocs"]
        assert "outputs/worker_report.md" in job["expectedOutputs"]
        assert job["blockedOutput"] == "outputs/blocked_reason.txt"
        assert "not worker failure" in job["workerContract"]["noTripodVideoPolicy"]
    print("cloud worker surface tests passed")


if __name__ == "__main__":
    main()
