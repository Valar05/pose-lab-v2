#!/usr/bin/env python3
"""Fail closed on incomplete or laundered Crimson orientation ledgers."""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path


SCHEMA = "pose-lab-v2-crimson-bone-orientation-ledger-v1"
EXPECTED_CANDIDATE_ID = "crimson-combat-ready-vanguard-frame0-4"
EXPECTED_POSE_SHA256 = "4db76a74b24d56411d6429c0c5f35bbe77bedbe92bda086d65a162aaea0ab41a"
EXPECTED_AUTHORED_GLB_SHA256 = "d20a0f8f8f82b94ffbf0b96a10e4aa1326c6915f7346abc29385c89bcc8d734b"
EXPECTED_BONES = {
    "LeftShoulder", "LeftArm", "LeftForeArm", "LeftHand",
    "RightShoulder", "RightArm", "RightForeArm", "RightHand",
}
EXPECTED_AXES = {"X", "Y", "Z"}


def vector(values, length: int, label: str) -> list[float]:
    if not isinstance(values, list) or len(values) != length:
        raise AssertionError(f"{label} must contain {length} values")
    if any(not isinstance(value, (int, float)) or not math.isfinite(float(value)) for value in values):
        raise AssertionError(f"{label} contains a non-finite number")
    return [float(value) for value in values]


def validate(ledger: dict) -> dict:
    assert ledger.get("schema") == SCHEMA, ledger.get("schema")
    assert ledger.get("status") == "PASS", ledger.get("failures")
    assert ledger.get("classification") == "calibration-measurement-not-pose-acceptance"
    specimen = ledger.get("calibrationSpecimen") or {}
    assert specimen.get("candidateId") == EXPECTED_CANDIDATE_ID
    assert specimen.get("poseSha256") == EXPECTED_POSE_SHA256
    assert specimen.get("authoredGlbSha256") == EXPECTED_AUTHORED_GLB_SHA256
    assert specimen.get("exactAuthoredGlb") is True
    assert specimen.get("visualVerdict") == "REJECTED_FOR_HANDOFF_MEASUREMENT_WORTHY"
    assert "plume" in specimen.get("rejectedBecause", "").lower()
    authority = ledger.get("authority") or {}
    assert authority.get("crossRigPoseInputs") == []
    assert "glTF export" in authority.get("orientationTruth", "")
    probe = ledger.get("probe") or {}
    assert probe.get("degrees") == 5.0
    assert set(probe.get("axes") or []) == EXPECTED_AXES
    assert probe.get("sampleCount") == 49
    protected = ledger.get("protectedBody") or {}
    assert protected.get("maximumRotationDeltaDegrees") is not None
    assert protected["maximumRotationDeltaDegrees"] <= protected.get("thresholdDegrees", -1)
    bones = ledger.get("bones") or {}
    assert set(bones) == EXPECTED_BONES, sorted(bones)
    for bone_name, bone in bones.items():
        rest = bone.get("rest") or {}
        aim = vector(rest.get("localAimAxis"), 3, f"{bone_name}.rest.localAimAxis")
        assert aim[1] >= 0.999
        mapping = bone.get("gltfRoundTrip") or {}
        matrix = mapping.get("blenderLocalToGltfLocalAxisMatrix")
        assert isinstance(matrix, list) and len(matrix) == 3
        for index, row in enumerate(matrix):
            vector(row, 3, f"{bone_name}.mapping.row{index}")
        assert 0.98 <= mapping.get("determinant", 0) <= 1.02
        composition = mapping.get("blenderBasisToGltf") or {}
        assert composition.get("formula") == "gltfLocal = parentRelativeRest * blenderMatrixBasis"
        assert composition.get("inverseFormula") == "blenderMatrixBasis = inverse(parentRelativeRest) * gltfLocal"
        assert composition.get("compositionResidualDegrees", 1) <= composition.get("maximumResidualDegrees", 0)
        assert set(mapping.get("responses") or {}) == EXPECTED_AXES
        for axis_name, pair in mapping["responses"].items():
            assert pair.get("signedPairDot", 1) <= -0.995, (bone_name, axis_name, pair)
            for sign_name in ("plus", "minus"):
                response = pair.get(sign_name) or {}
                vector(response.get("exportedDeltaAxis"), 3, f"{bone_name}.{axis_name}.{sign_name}.axis")
                assert abs(response.get("exportedDeltaDegrees", 0) - 5.0) <= 0.2
        mesh = bone.get("meshInfluence")
        assert mesh is not None, f"{bone_name} has no measured mesh influence"
        assert mesh.get("weightedVertexCount", 0) > 0
        vector(mesh.get("weightedCentroidWorld"), 3, f"{bone_name}.meshInfluence.centroid")
        if bone_name.endswith("Arm") or bone_name.endswith("ForeArm"):
            bend = bone.get("bendGuidance") or {}
            assert bend.get("status") == "INFERRED"
            assert bend.get("preferredBendAxis", {}).get("axis") in EXPECTED_AXES
            assert 0 <= bend.get("preferredBendAxis", {}).get("alignment", -1) <= 1
    weapon = ledger.get("weaponAttachment") or {}
    assert weapon.get("attachmentBone") == "RightHand"
    assert weapon.get("solveOrder") == [
        "position-target", "pole-guidance", "measured-bone-basis", "wrist-roll", "visible-mesh-seat",
    ]
    assert ledger.get("failures") == []
    return {
        "ok": True,
        "schema": SCHEMA,
        "candidateId": specimen["candidateId"],
        "boneCount": len(bones),
        "probeSampleCount": probe["sampleCount"],
        "visualVerdict": specimen["visualVerdict"],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("ledger", type=Path)
    args = parser.parse_args()
    result = validate(json.loads(args.ledger.read_text(encoding="utf-8")))
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
