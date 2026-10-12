#!/usr/bin/env python3
"""Native Pose Lab doctrine import and context bootstrap regression gates."""
import hashlib
import json
import os
from pathlib import Path
import struct
import subprocess
import sys
import tempfile
import zlib

ROOT = Path(__file__).resolve().parents[1]
BOOT = ROOT / "tools/campaigns/sprite_doctrine_boot.py"
INDEX = ROOT / "doctrine/animation/doctrine-index-v1.json"
CONTRACT = "campaigns/pose-lab-native-animation-doctrine-v1.contract.json"

def sha(data):
    return hashlib.sha256(data).hexdigest()

def run(*args, success=True):
    p = subprocess.run([sys.executable, str(BOOT), *map(str, args)],
                       cwd=ROOT, text=True, capture_output=True, timeout=20)
    if success and p.returncode != 0:
        raise AssertionError((args, p.returncode, p.stdout, p.stderr))
    if not success and p.returncode == 0:
        raise AssertionError("unsealed task unexpectedly passed: " + repr(args))
    return p

def make_png():
    def chunk(kind, data):
        return (struct.pack(">I", len(data)) + kind + data +
                struct.pack(">I", zlib.crc32(kind + data) & 0xffffffff))
    ihdr = struct.pack(">IIBBBBB", 64, 64, 8, 6, 0, 0, 0)
    scanlines = (b"\x00" + b"\x71\x29\xe6\xff" * 64) * 64
    return (bytes((137,80,78,71,13,10,26,10)) + chunk(b"IHDR", ihdr) +
            chunk(b"IDAT", zlib.compress(scanlines)) + chunk(b"IEND", b""))

index = json.loads(INDEX.read_text())
assert index["schema"] == "pose-lab-animation-doctrine-index-v1"
assert set(index["taskKinds"]) == {
    "sprite-author", "sprite-edit", "extract", "idle", "run", "jump", "locomotion", "attack", "review"}
provenance = json.loads((ROOT / index["provenanceFile"]).read_text())
assert provenance["source_repository"] == "Valar05/organ"
assert provenance["source_revision"] == "bbbd5576eb02521d86edccddf953c974d019f2d1"
assert len(provenance["files"]) == 6
for item in provenance["files"]:
    data = (ROOT / item["path"]).read_bytes()
    blob = hashlib.sha1(b"blob " + str(len(data)).encode() + b"\x00" + data).hexdigest()
    assert blob == item["source_git_blob_sha1"], "Organ source copy differs: " + item["path"]

april = json.loads((ROOT / "doctrine/sprite-animation/april-run-minimal-keyframes-v1.rules.json").read_text())
assert len(april["accepted_rules"]) == 14
assert len(april["failure_modes"]) == 18
sparse = (ROOT / "doctrine/animation/sparse_sprite_motion_v1.json").read_text()
assert "Store the minimum authored semantic poses" in sparse
assert (ROOT / "docs/SPRITE_AUTHORING_BOOT.md").is_file()
assert "sprite_doctrine_boot.py" in (ROOT / "AGENTS.md").read_text()
shell = (ROOT / "tools/campaigns/campaign_common.sh").read_text()
assert 'sprite_doctrine_boot.py --task auto --contract "$contract" --output "$context_packet"' in shell
assert 'cat "$f" >/dev/null' not in shell

with tempfile.TemporaryDirectory(prefix="pose-doctrine-", dir=ROOT) as td:
    d = Path(td)
    rel = str(d.relative_to(ROOT))
    for kind in index["taskKinds"]:
        destination = d / (kind + ".md")
        p = run("--task", kind, "--contract", CONTRACT, "--output", destination,
                success=kind != "sprite-author")
        if kind == "sprite-author":
            assert "SOURCE_AUTHORITY_REQUIRED" in p.stderr
            continue
        packet = destination.read_text()
        assert "This is mechanically assembled source text" in packet
        assert "# Pose Lab context packet | task=" + kind in packet
        assert "docs/POSE_LAB_CAMPAIGN_RULES.md" in packet
        assert "docs/POSE_IS_GOD.md" in packet
        assert "doctrine/animation/sparse_sprite_motion_v1.json" in packet
        assert len(packet) > 110000
        assert "POSE_CONTEXT_REQUIRES_MODEL_READ=TRUE" in p.stdout
        if kind == "jump":
            assert "## Source: doctrine/animation/april_one_frame_idle_accepted_v1.json" not in packet
            assert "## Source: doctrine/animation/april_slow_jog_accepted_v1.json" not in packet
        if kind == "idle":
            assert "EXEMPLAR-NON-NORMATIVE" in packet
            assert "april_one_frame_idle_accepted_v1.json" in packet
        if kind == "run":
            assert "april_slow_jog_accepted_v1.json" in packet
            assert "april-run-minimal-keyframes-v1.rules.json" in packet

    auto = d / "auto.md"
    run("--task", "auto", "--contract", CONTRACT, "--output", auto)
    assert auto.read_text().startswith("# Pose Lab context packet | task=review")

    assert "ACTIVE_CAMPAIGN_REQUIRED" in run(
        "--task", "sprite-author", success=False).stderr
    assert "SOURCE_AUTHORITY_REQUIRED" in run(
        "--task", "sprite-author", "--contract", CONTRACT, success=False).stderr

    artwork = d / "original.png"
    artwork.write_bytes(make_png())
    auth = d / "character.json"
    sample = {"schema":"pose-lab-sprite-character-authority-v1",
              "character":"Fixture", "project":"Fixture only",
              "references":[
                {"role":"CHARACTER", "path": rel + "/original.png", "sha256":sha(artwork.read_bytes())},
                {"role":"STYLE", "path": rel + "/original.png", "sha256":sha(artwork.read_bytes())},
              ]}
    auth.write_text(json.dumps(sample))
    result = d / "author.md"
    run("--task", "sprite-author", "--contract", CONTRACT,
        "--character-manifest", rel + "/character.json", "--output", result)
    assert "CHARACTER-MANIFEST" in result.read_text()

    sample["references"][1]["sha256"] = "0" * 64
    auth.write_text(json.dumps(sample))
    assert "hash mismatch" in run("--task", "sprite-author", "--contract", CONTRACT,
                                  "--character-manifest", rel + "/character.json",
                                  success=False).stderr
    sample["references"][1]["sha256"] = sha(artwork.read_bytes())
    sample["references"] = sample["references"][:1]
    auth.write_text(json.dumps(sample))
    assert "STYLE image" in run("--task", "sprite-author", "--contract", CONTRACT,
                                "--character-manifest", rel + "/character.json",
                                success=False).stderr

print("POSE_LAB_NATIVE_SPRITE_DOCTRINE_BOOT_PASS")
