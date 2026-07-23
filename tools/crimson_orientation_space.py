#!/usr/bin/env python3
"""Pure-Python Crimson quaternion conversions backed by the measured ledger."""

from __future__ import annotations

import json
import math
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
LEDGER_PATH = ROOT / "public" / "assets" / "crimson" / "crimson-bone-orientation-ledger.json"


def normalize(quaternion: list[float]) -> list[float]:
    magnitude = math.sqrt(sum(float(value) ** 2 for value in quaternion))
    if magnitude <= 0:
        raise ValueError("zero quaternion")
    result = [float(value) / magnitude for value in quaternion]
    return [-value for value in result] if result[3] < 0 else result


def multiply(left: list[float], right: list[float]) -> list[float]:
    x1, y1, z1, w1 = normalize(left)
    x2, y2, z2, w2 = normalize(right)
    return normalize([
        w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2,
        w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2,
        w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2,
        w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2,
    ])


def inverse(quaternion: list[float]) -> list[float]:
    x, y, z, w = normalize(quaternion)
    return [-x, -y, -z, w]


def angular_difference_degrees(left: list[float], right: list[float]) -> float:
    delta = multiply(inverse(left), right)
    return math.degrees(2.0 * math.acos(min(1.0, abs(delta[3]))))


def blender_basis_to_gltf_local(parent_relative_rest: list[float], blender_matrix_basis: list[float]) -> list[float]:
    """Measured law: glTF local = parent-relative rest * Blender matrix_basis."""
    return multiply(parent_relative_rest, blender_matrix_basis)


def gltf_local_to_blender_basis(parent_relative_rest: list[float], gltf_local: list[float]) -> list[float]:
    """Measured inverse: Blender matrix_basis = inverse(rest) * glTF local."""
    return multiply(inverse(parent_relative_rest), gltf_local)


def load_ledger(path: Path = LEDGER_PATH) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def bone_guidance(bone_name: str, ledger: dict | None = None) -> dict:
    ledger = ledger or load_ledger()
    bone = ledger["bones"][bone_name]
    return {
        "parentRelativeRest": bone["rest"]["parentRelativeRest"]["quaternion"],
        "localAimAxis": bone["rest"]["localAimAxis"],
        "bendGuidance": bone["bendGuidance"],
        "meshInfluence": bone["meshInfluence"],
    }
