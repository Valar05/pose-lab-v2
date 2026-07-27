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
        temp = Path(temp)
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
        squat_frames = []
        for index in range(45):
            source_frame = frames[round(index * (len(frames) - 1) / 44)]
            landmarks = source_frame["landmarks"]
            if index < 22:
                compression = index / 22
            elif index <= 31:
                compression = 1.0
            else:
                compression = (44 - index) / 13
            image_landmarks = {
                name: {
                    "x": 0.5 + point["x"] * 0.1,
                    "y": 0.5,
                    "z": 0.0,
                    "confidence": 0.95,
                }
                for name, point in landmarks.items()
            }
            image_landmarks["Hips"]["y"] = 0.5 + compression * 0.2
            image_landmarks["LeftFoot"].update({"x": 0.40, "y": 0.90})
            image_landmarks["RightFoot"].update({"x": 0.60, "y": 0.90})
            squat_frames.append({
                "frame": index,
                "timeSeconds": round(index / 24, 6),
                "landmarks": landmarks,
                "imageLandmarks": image_landmarks,
            })
        squat_fixture = {
            "schema": "pose-lab-v2-humanoid-landmarks-v1",
            "source": {"video": "planted-squat.mp4", "sha256": "fixture"},
            "frames": squat_frames,
        }
        squat_source = temp / "planted-squat-landmarks.json"
        squat_output = temp / "planted-squat-packet.json"
        squat_source.write_text(json.dumps(squat_fixture))
        subprocess.run([
            sys.executable, str(TOOL), "build",
            "--landmarks", str(squat_source),
            "--vault", str(VAULT),
            "--out", str(squat_output),
            "--keys", "8",
            "--matches", "5",
        ], check=True)
        squat_packet = json.loads(squat_output.read_text())
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
    semantics = squat_packet["selection"]["semanticExtrema"]
    assert semantics["status"] == "available"
    selected_squat_frames = {
        keyframe["sourceFrame"] for keyframe in squat_packet["keyframes"]
    }
    assert len(selected_squat_frames.intersection(range(22, 32))) >= 2
    assert {
        role
        for keyframe in squat_packet["keyframes"]
        for role in keyframe["semanticRoles"]
    } == {
        "compression-plateau-entry",
        "compression-peak",
        "compression-plateau-exit",
    }
    assert len(squat_packet["contactHypotheses"]) == 2
    for contact in squat_packet["contactHypotheses"]:
        assert contact["startFrame"] == 0
        assert contact["endFrame"] == 44
        assert contact["evidenceSpace"] == "normalized-image"
    print("Regnet capture packet contract: PASS")


if __name__ == "__main__":
    main()
