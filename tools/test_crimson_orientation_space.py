#!/usr/bin/env python3
"""Prove the committed ledger converts Crimson quaternion spaces exactly."""

from __future__ import annotations

import json
from pathlib import Path

from crimson_orientation_space import (
    angular_difference_degrees,
    blender_basis_to_gltf_local,
    gltf_local_to_blender_basis,
    load_ledger,
)


ROOT = Path(__file__).resolve().parents[1]
ledger = load_ledger()
manifest = json.loads((ROOT / "public" / "assets" / "crimson" / "crimson_manifest.json").read_text(encoding="utf-8"))
assert ledger["status"] == "PASS"
assert ledger["calibrationSpecimen"]["visualVerdict"] == "REJECTED_FOR_HANDOFF_MEASUREMENT_WORTHY"
assert manifest["orientationLedger"] == {
    "path": "public/assets/crimson/crimson-bone-orientation-ledger.json",
    "schema": ledger["schema"],
    "calibrationCandidateId": ledger["calibrationSpecimen"]["candidateId"],
    "calibrationPoseSha256": ledger["calibrationSpecimen"]["poseSha256"],
    "visualVerdict": ledger["calibrationSpecimen"]["visualVerdict"],
    "conversionLaw": "gltfLocal = parentRelativeRest * blenderMatrixBasis",
    "inverseConversionLaw": "blenderMatrixBasis = inverse(parentRelativeRest) * gltfLocal",
}

residuals = {}
direct_assignment_errors = {}
for bone_name, bone in ledger["bones"].items():
    rest = bone["rest"]["parentRelativeRest"]["quaternion"]
    basis = bone["gltfRoundTrip"]["baselineBlenderMatrixBasisQuaternion"]
    gltf = bone["gltfRoundTrip"]["baselineExportedQuaternion"]
    composed = blender_basis_to_gltf_local(rest, basis)
    recovered = gltf_local_to_blender_basis(rest, gltf)
    residuals[bone_name] = angular_difference_degrees(composed, gltf)
    direct_assignment_errors[bone_name] = angular_difference_degrees(basis, gltf)
    assert residuals[bone_name] <= 0.001, (bone_name, residuals[bone_name])
    assert angular_difference_degrees(recovered, basis) <= 0.001, bone_name
    recorded = bone["gltfRoundTrip"]["baselineQuaternionAngularDifferenceDegrees"]
    assert abs(direct_assignment_errors[bone_name] - recorded) <= 0.001, bone_name

assert min(direct_assignment_errors.values()) >= 15.0
assert max(direct_assignment_errors.values()) >= 135.0
assert ledger["bones"]["LeftArm"]["bendGuidance"]["preferredBendAxis"] == {
    "axis": "Z", "sign": 1, "alignment": 0.94722158,
}
assert ledger["bones"]["RightArm"]["bendGuidance"]["preferredBendAxis"] == {
    "axis": "Z", "sign": -1, "alignment": 0.98953205,
}

renderer = (ROOT / "tools" / "render_crimson_vanguard_attack1_compare_blender.py").read_text(encoding="utf-8")
assert "def apply_crimson_gltf_local_quaternion(" in renderer
assert "rest_quaternion.inverted() @ gltf_quaternion" in renderer
assert "apply_crimson_gltf_local_quaternion(armature, bone_name, quat)" in renderer

print(json.dumps({
    "ok": True,
    "check": "crimson-orientation-space",
    "boneCount": len(residuals),
    "maximumCompositionResidualDegrees": max(residuals.values()),
    "directAssignmentErrorRangeDegrees": [
        min(direct_assignment_errors.values()),
        max(direct_assignment_errors.values()),
    ],
    "bendAxes": {"left": "+Z", "right": "-Z"},
}, indent=2))
