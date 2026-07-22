#!/usr/bin/env python3
"""Keep rejected-frame pose hashes bound to the Blender generator's canonical JSON."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
V3_PATH = ROOT / "src/review-candidates/crimson-combat-ready-vanguard-frame0-3.js"
V480_PATH = ROOT / "src/review-candidates/crimson-frame-zero-480eb888-rejected.js"
V4_PATH = ROOT / "src/review-candidates/crimson-combat-ready-vanguard-frame0-4.js"
CONSTANTS_PATH = ROOT / "src/review-constants.js"
PROTECTED_BASELINE_PATH = ROOT / "public/assets/crimson/crimson-frame-zero-480eb888-protected-baseline.json"
EXPECTED_GLB_SHA = "4e57cc6a443b6cdd0cae1177357536234e4c4e7de98069e7027af74070bd0b56"
EXPECTED_PROTECTED_BONES = {
    "Hips", "Spine", "Spine01", "Spine02", "neck", "Head",
    "LeftUpLeg", "LeftLeg", "LeftFoot",
    "RightUpLeg", "RightLeg", "RightFoot",
}


def load_candidate(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    match = re.search(r"export const \w+ = (.*);\s*$", text, re.S)
    if not match:
        raise AssertionError(f"candidate module is not a plain exported object: {path}")
    payload = match.group(1)
    try:
        return json.loads(payload)
    except json.JSONDecodeError:
        payload = re.sub(
            r"([\{,]\s*)([A-Za-z_$][A-Za-z0-9_$]*)(\s*:)",
            r'\1"\2"\3',
            payload,
        )
        converted: list[str] = []
        index = 0
        while index < len(payload):
            if payload[index] != "'":
                converted.append(payload[index])
                index += 1
                continue
            index += 1
            value: list[str] = []
            while index < len(payload):
                character = payload[index]
                if character == "\\" and index + 1 < len(payload):
                    following = payload[index + 1]
                    value.append("'" if following == "'" else character + following)
                    index += 2
                    continue
                if character == "'":
                    index += 1
                    break
                value.append(character)
                index += 1
            converted.append(json.dumps("".join(value)))
        payload = re.sub(r",\s*([}\]])", r"\1", "".join(converted))
        return json.loads(payload)


def canonical_pose_sha(candidate: dict) -> str:
    frame = candidate["frames"][0]
    canonical = {
        "label": frame.get("label"),
        "time": frame.get("time"),
        "positions": frame.get("positions") or {},
        "sabreLocal": frame.get("sabreLocal") or {},
        "bones": frame.get("bones") or {},
    }
    payload = json.dumps(canonical, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


v3 = load_candidate(V3_PATH)
v480 = load_candidate(V480_PATH)
v4 = load_candidate(V4_PATH)
v3_sha = canonical_pose_sha(v3)
v480_sha = canonical_pose_sha(v480)

assert v3_sha == "b9ec44d3d17527779334e372a79894b07cbd535c4af54927e0cc638f3b1b6c2f"
assert v480_sha == "b5ef5555ba060546f4d6dd3921f09cf0e4251dfac8a346d4db7f4f30858bd554"
assert v480["source"]["poseSha256"] == v480_sha
assert v4["source"]["rejectedBaseline"]["poseSha256"] == v480_sha

constants = CONSTANTS_PATH.read_text(encoding="utf-8")
assert v3_sha in constants
assert v480_sha in constants

protected = json.loads(PROTECTED_BASELINE_PATH.read_text(encoding="utf-8"))
assert protected["authoredGlbSha256"] == EXPECTED_GLB_SHA
assert set(protected["positions"]) == {"Hips"}
assert set(protected["bones"]) == EXPECTED_PROTECTED_BONES
assert all(len(values) == 3 for values in protected["positions"].values())
assert all(len(values) == 4 for values in protected["bones"].values())

print(json.dumps({
    "ok": True,
    "canonicalizer": "Python json.dumps(sort_keys=True,separators=(',',':'))",
    "rejectedV3PoseSha256": v3_sha,
    "rejected480PoseSha256": v480_sha,
}, indent=2))
