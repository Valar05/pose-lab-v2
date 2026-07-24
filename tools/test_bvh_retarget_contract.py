#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ANALYZER = ROOT / "tools/analyze_bvh_retarget.py"
REPORT = ROOT / "experiments/bvh-retarget/rig-diff.json"
SKELETON = ROOT / "experiments/bvh-retarget/canonical-skeleton.json"


subprocess.run([sys.executable, str(ANALYZER)], cwd=ROOT, check=True)
report = json.loads(REPORT.read_text())
skeleton = json.loads(SKELETON.read_text())

assert report["source"]["nodeCount"] == 440
assert report["source"]["skinJointCount"] == 437
assert report["source"]["selectedClipChannelCount"] == 1311
assert report["source"]["selectedClipTrackedNodeCount"] == 437
assert report["target"]["nodeCount"] == 26
assert report["target"]["skinJointCount"] == 24
assert report["mapping"]["complete"] is True
assert report["mapping"]["intentionalSourceGaps"] == {"spineMid": None}
assert report["status"] == "ready-for-blender-proxy-bake"
assert len(skeleton["joints"]) == 21
assert skeleton["excludedByDesign"]

mapped_target_nodes = [
    "Hips", "Spine", "Spine01", "Spine02", "neck", "Head",
    "LeftShoulder", "LeftArm", "LeftForeArm", "LeftHand",
    "RightShoulder", "RightArm", "RightForeArm", "RightHand",
    "LeftUpLeg", "LeftLeg", "LeftFoot",
    "RightUpLeg", "RightLeg", "RightFoot",
]
print(json.dumps({
    name: report["target"]["parentByName"].get(name)
    for name in mapped_target_nodes
}, indent=2))
print("BVH retarget contract: PASS")
