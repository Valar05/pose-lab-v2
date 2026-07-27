#!/usr/bin/env python3
"""Fail-closed contract checks for the checked-in Regnet motion inventory."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

EXPECTED_ARCHIVE_SHA256 = "4f4d7a973203e5f57493b7c6b7c41e5076bbe67f9164249cf107daa35b15c964"
EXPECTED_MD5 = "1569b7cce0ffdd7d547c4eb6b1aa7384"
EXPECTED_SIZE = 181652767
EXPECTED_TITLES = {
    "BackLeft run", "BackRight Run", "Boxing Guard Prep Straight Punch",
    "Cautious Crouch Walk Right inplace", "Jump Run", "Punch Combo 2",
    "Punch Combo", "Push and Walk Forward", "RunFast", "Run and Jump",
    "Run and Leap", "Run and Shoot", "Running", "Sprint and Sudden Stop",
    "Stage Walk", "Unarmed Vault", "Unsteady Walk", "Walk Backward with Gun 1",
    "Walk Left with Gun inplace", "Walking",
}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--vault",
        default=str(Path(__file__).resolve().parents[1] / "experiments/regnet-motion-vault/vault.json"),
    )
    args = parser.parse_args()
    vault_path = Path(args.vault)
    vault = json.loads(vault_path.read_text())
    if vault.get("shards"):
        clips = []
        for shard in vault["shards"]:
            clips.extend(json.loads((vault_path.parent / shard["path"]).read_text())["clips"])
        vault["clips"] = clips
    assert vault["schema"] == "pose-lab-v2-regnet-motion-vault-v1"
    assert vault["status"] == "indexed-not-human-accepted"
    assert vault["source"]["sha256"] == EXPECTED_ARCHIVE_SHA256
    assert vault["source"]["driveMd5"] == EXPECTED_MD5
    assert vault["source"]["byteCount"] == EXPECTED_SIZE
    assert vault["source"]["driveFileId"] == "1G6PsdVS24Zw8kqiWZgzRlM22hE_UhkFd"
    assert vault["contract"]["skeletonCount"] == 1
    assert vault["contract"]["skeletonSha256"]
    assert len(vault["contract"]["jointNames"]) == 22
    assert len(vault["clips"]) == 21
    titles = {clip["title"] for clip in vault["clips"]}
    assert EXPECTED_TITLES <= titles
    base = [clip for clip in vault["clips"] if clip["title"].endswith("Character output")]
    assert len(base) == 1
    for clip in vault["clips"]:
        assert clip["skeletonSha256"] == vault["contract"]["skeletonSha256"]
        assert clip["skinJointCount"] == 24
        assert clip["channelCount"] == 72
        assert clip["durationSeconds"] > 0
        assert len(clip["samples"]) == vault["contract"]["sampleCountPerClip"]
        assert clip["samples"][0]["timeSeconds"] == 0
        assert clip["samples"][-1]["timeSeconds"] == clip["durationSeconds"]
    print("Regnet motion vault contract: PASS")


if __name__ == "__main__":
    main()
