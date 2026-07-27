#!/usr/bin/env python3
"""Exercise sparse capture selection and self-mocap retrieval without video bytes."""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VAULT = ROOT / "experiments/regnet-motion-vault/vault.json"
TOOL = ROOT / "tools/regnet_capture_packet.py"


def main() -> None:
    vault = json.loads(VAULT.read_text())
    if vault.get("shards"):
        clips = []
        for shard in vault["shards"]:
            clips.extend(json.loads((VAULT.parent / shard["path"]).read_text())["clips"])
        vault["clips"] = clips
    clip = next(item for item in vault["clips"] if item["title"] == "Punch Combo")
    samples = clip["samples"]
    frames = []
    for index in range(40):
        source = samples[round(index * (len(samples) - 1) / 39)]
        landmarks = {
            name: {
                "x": values[0],
                "y": values[1],
                "z": values[2],
                "confidence": 0.95,
            }
            for name, values in source["positions"].items()
        }
        frames.append({
            "frame": index,
            "timeSeconds": round(index / 30, 6),
            "landmarks": landmarks,
        })
    fixture = {
        "schema": "pose-lab-v2-humanoid-landmarks-v1",
        "source": {"video": "fixture.mp4", "sha256": "fixture"},
        "frames": frames,
    }
    with tempfile.TemporaryDirectory() as temp:
        source = Path(temp) / "landmarks.json"
        output = Path(temp) / "packet.json"
        source.write_text(json.dumps(fixture))
        subprocess.run([
            sys.executable, str(TOOL), "build",
            "--landmarks", str(source),
            "--vault", str(VAULT),
            "--out", str(output),
            "--keys", "8",
            "--matches", "5",
        ], check=True)
        packet = json.loads(output.read_text())
    assert packet["schema"] == "pose-lab-v2-regnet-capture-direction-v1"
    assert packet["status"] == "proposed-not-authored-not-accepted"
    assert 2 <= len(packet["keyframes"]) <= 8
    assert packet["keyframes"][0]["sourceFrame"] == 0
    assert packet["keyframes"][-1]["sourceFrame"] == 39
    for keyframe in packet["keyframes"]:
        assert len(keyframe["nearestRegnetPoses"]) == 5
        assert keyframe["nearestRegnetPoses"][0]["distance"] >= 0
        assert keyframe["status"] == "proposed"
    assert packet["acceptance"]["humanVerdict"] == "pending"
    assert "emit every captured frame as a pose key" in packet["solverContract"]["forbidden"]
    print("Regnet capture packet contract: PASS")


if __name__ == "__main__":
    main()
