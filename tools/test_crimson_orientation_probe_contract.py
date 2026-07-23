#!/usr/bin/env python3
"""Repository-level guardrails for the Blender orientation probe."""

from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PROBE = ROOT / "tools" / "probe_crimson_bone_orientations_blender.py"
VALIDATOR = ROOT / "tools" / "validate_crimson_orientation_ledger.py"
SPACE_TEST = ROOT / "tools" / "test_crimson_orientation_space.py"
WORKFLOW = ROOT / ".github" / "workflows" / "crimson-orientation-ledger.yml"
CANDIDATE = ROOT / "src" / "review-candidates" / "crimson-combat-ready-vanguard-frame0-4.js"


def load_candidate() -> dict:
    text = CANDIDATE.read_text(encoding="utf-8")
    match = re.search(r"export const \w+ = (.*);\s*$", text, re.S)
    assert match
    return json.loads(match.group(1))


probe = PROBE.read_text(encoding="utf-8")
validator = VALIDATOR.read_text(encoding="utf-8")
space_test = SPACE_TEST.read_text(encoding="utf-8")
workflow = WORKFLOW.read_text(encoding="utf-8")
candidate = load_candidate()

assert candidate["source"]["poseSha256"] in probe
assert candidate["source"]["authoredGlbSha256"] in probe
assert "PROBE_DEGREES = 5.0" in probe
assert "PROBE_SIGNS = ((\"plus\", 1.0), (\"minus\", -1.0))" in probe
assert "blenderLocalToGltfLocalAxisMatrix" in probe
assert "baselineQuaternionAngularDifferenceDegrees" in probe
assert "inferred-from-calibration-positions-not-anatomical-metadata" in probe
assert '"crossRigPoseInputs": []' in probe
assert "VANGUARD_GLB" not in probe
assert "apply_crimson_candidate_pose" not in probe
assert "sys.path.insert(0, str(TOOLS_DIR))" in probe
assert "activate_action_containing(armature, candidate[\"id\"])" in probe
assert "freeze_armature_pose_and_remove_new_actions" in probe
assert "export_force_sampling=True" in probe
assert "calibration-measurement-not-pose-acceptance" in probe
assert "REJECTED_FOR_HANDOFF_MEASUREMENT_WORTHY" in probe
assert "REST_AIM_AXIS_MIN_DOT_Y = 0.999" in probe
assert "NON_TARGET_EXPORT_DELTA_MAX_DEGREES = 0.001" in probe
assert "REST_BASIS_COMPOSITION_MAX_RESIDUAL_DEGREES = 0.001" in probe
assert '"formula": "gltfLocal = parentRelativeRest * blenderMatrixBasis"' in probe
assert '"inverseFormula": "blenderMatrixBasis = inverse(parentRelativeRest) * gltfLocal"' in probe
assert "bone.roll" not in probe
assert '"zeroAuthority": "parentRelativeRest.quaternion"' in probe
assert "EXPECTED_BONES" in validator
assert "visualVerdict" in validator
assert "directAssignmentErrorRangeDegrees" in space_test
assert "probe_crimson_bone_orientations_blender.py" in workflow
assert "validate_crimson_orientation_ledger.py" in workflow
assert "actions/upload-artifact@v4" in workflow
assert "compare_crimson_orientation_ledgers.py" in workflow
assert "crimson-orientation-ledger-${{ github.run_id }}" in workflow

print(json.dumps({
    "ok": True,
    "check": "crimson-orientation-probe-contract",
    "candidateId": candidate["id"],
    "poseSha256": candidate["source"]["poseSha256"],
    "probeBones": 8,
    "signedAxisProbes": 48,
}, indent=2))
