#!/usr/bin/env python3
"""No-provider integration fixture for the Vanguard refinery state machine."""

import hashlib
import json
import subprocess
import tempfile
from pathlib import Path

from PIL import Image


REPO = Path(__file__).resolve().parents[1]
TOOL = REPO / "tools/vanguard_sprite_refinery.py"


def run(*args: str, expect: int = 0) -> dict:
    result = subprocess.run(["python3", str(TOOL), *args], cwd=REPO, text=True, capture_output=True)
    if result.returncode != expect:
        raise AssertionError(f"command failed ({result.returncode}): {result.stderr}\n{result.stdout}")
    return json.loads((result.stdout if expect == 0 else result.stderr).strip())


def packet(root: Path, color: tuple[int, int, int, int]) -> None:
    root.mkdir(parents=True)
    (root / "manifest.json").write_text('{"schema":"animation-pose-packet-v1"}\n')
    (root / "appearance-only-generation-contract.json").write_text('{"immutable":true}\n')
    for name in ("geometry-grid.png", "limb-id-grid.png", "depth-grid.png", "beauty-grid.png"):
        Image.new("RGBA", (1024, 512), color).save(root / name)


def sheet(path: Path, colors: list[tuple[int, int, int, int]]) -> None:
    image = Image.new("RGBA", (1024, 512))
    for index, color in enumerate(colors): image.paste(Image.new("RGBA", (512, 512), color), (index * 512, 0))
    image.save(path)


def main() -> None:
    with tempfile.TemporaryDirectory(prefix="vanguard-refinery-") as temporary:
        temp = Path(temporary); first_packet, second_packet = temp / "packets/idle", temp / "packets/attack"
        packet(first_packet, (20, 40, 60, 255)); packet(second_packet, (60, 40, 20, 255))
        manifest = {
            "schema": "vanguard-sprite-refinery-batch-v1", "batchId": "fixture-two-clip", "maxConcurrency": 2,
            "concept": {"id": "file_00000000500881f4adab6e2f24ce0c7d", "sha256": "a81310b22ed537ec0aac39133bcf810d965ff2f2d00d7f9a8a56472c04c6878e", "target": "public/assets/vanguard/concepts/fleshpunk-vanguard-v1.jpg"},
            "clips": [
                {"id": "idle", "nativeAction": "Idle", "frameSamples": [0, 10], "timingMs": [400, 600], "facing": "screen-right", "cameraProfile": "vanguard-orthographic-screen-right-v1", "grid": {"columns": 2, "rows": 1}, "posePacket": str(first_packet)},
                {"id": "attack", "nativeAction": "SwordAttack1", "frameSamples": [0, 20], "timingMs": [100, 150], "facing": "screen-right", "cameraProfile": "vanguard-orthographic-screen-right-v1", "grid": {"columns": 2, "rows": 1}, "posePacket": str(second_packet)}
            ]
        }
        manifest_path = temp / "batch.json"; manifest_path.write_text(json.dumps(manifest)); root = temp / "state"
        bad_concept = temp / "wrong-concept.jpg"; bad_concept.write_bytes(b"not approved")
        refused = run("import-concept", "--source", str(bad_concept), expect=2)
        assert refused["state"] == "blocked" and "SHA-256" in refused["error"]
        common = ("--manifest", str(manifest_path), "--root", str(root))
        prepared = run("prepare", *common, "--fixture")
        assert prepared["states"] == {"idle": "awaiting_skin", "attack": "awaiting_skin"}
        queued = run("queue", *common); assert len(queued["matrix"]["include"]) == 2 and queued["maxConcurrency"] == 2

        idle_sheet = temp / "fixture-two-clip--idle--attempt-001.png"
        attack_sheet = temp / "fixture-two-clip--attack--attempt-001.png"
        sheet(idle_sheet, [(255, 0, 0, 0), (0, 255, 0, 255)])
        sheet(attack_sheet, [(0, 0, 255, 255), (255, 255, 0, 255)])
        ingested = run("ingest", *common, "--clip", "idle", "--attempt", "attempt-001", "--sheet", str(idle_sheet))
        assert ingested["state"] == "candidate" and ingested["frames"] == 2
        duplicate = run("ingest", *common, "--clip", "idle", "--attempt", "attempt-001", "--sheet", str(idle_sheet))
        assert duplicate["duplicate"] is True
        run("verify", *common, "--clip", "idle", "--attempt", "attempt-001")
        run("approve", *common, "--clip", "idle", "--attempt", "attempt-001", "--reviewer", "Fixture Reviewer")

        run("ingest", *common, "--clip", "attack", "--attempt", "attempt-001", "--sheet", str(attack_sheet))
        run("verify", *common, "--clip", "attack", "--attempt", "attempt-001")
        run("reject", *common, "--clip", "attack", "--attempt", "attempt-001", "--reviewer", "Fixture Reviewer", "--reason", "fixture geometry mismatch")
        resumed = run("prepare", *common, "--fixture")
        assert resumed["states"] == {"idle": "approved", "attack": "red"}, "resume must not regress decisions"
        registry = temp / "registry.json"
        collected = run("collect", *common, "--registry", str(registry))
        assert collected["states"] == {"idle": "ready", "attack": "red"}
        approval = json.loads((root / "clips/idle/attempts/attempt-001/approval.json").read_text())
        assert approval["rawSheetSha256"] == hashlib.sha256(idle_sheet.read_bytes()).hexdigest()
        assert len(approval["frameSha256"]) == 2 and approval["reviewer"] == "Fixture Reviewer"
        provenance = json.loads((root / "clips/idle/attempts/attempt-001/provenance.json").read_text())
        assert provenance["model"] is None and [f["durationMs"] for f in provenance["frames"]] == [400, 600]
        assert Image.open(root / provenance["frames"][0]["path"]).mode == "RGBA"
        status = run("status", *common); assert status["states"] == {"idle": "ready", "attack": "red"}
        print(json.dumps({"ok": True, "fixture": "two clips", "states": status["states"], "checks": ["exact-hash concept import refusal", "prepare", "queue", "mixed ingestion", "duplicate idempotency", "verify", "rejection", "resume", "approval binding", "collection", "RGBA/timing provenance"]}, indent=2))


if __name__ == "__main__": main()
