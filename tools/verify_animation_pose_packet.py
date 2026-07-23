#!/usr/bin/env python3
"""Fail closed when a pose packet stops being native, single-camera geometry."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

from PIL import Image
from assemble_animation_pose_packet import geometry_overlay


REQUIRED_PASSES = ("beauty", "silhouette", "limb-id", "depth")
REQUIRED_SHEETS = REQUIRED_PASSES + ("geometry",)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def require(condition: bool, message: str, failures: list[str]) -> None:
    if not condition:
        failures.append(message)


def finite_point(point: object) -> bool:
    if not isinstance(point, dict):
        return False
    return all(
        isinstance(point.get(key), (int, float)) and math.isfinite(float(point[key]))
        for key in ("x", "y", "depth")
    )


def verify(
    root: Path,
    generated: Path | None,
    overlay_out: Path | None,
) -> dict[str, object]:
    manifest_path = root / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    failures: list[str] = []
    require(manifest.get("schema") == "animation-pose-packet-v1", "wrong schema", failures)
    require(
        manifest.get("status") == "native-geometry-reference",
        "packet is not native geometry reference",
        failures,
    )
    contract = manifest.get("contract", {})
    expected_contract = {
        "poseAuthority": "embedded native animation only",
        "appearanceAuthority": "none",
        "camera": "one locked orthographic camera for every frame and pass",
        "retargeting": False,
        "poseAuthoring": False,
        "ik": False,
        "semanticPoseNames": False,
        "generatedFrameAsReference": False,
        "rootMotionSuppressed": True,
    }
    for key, value in expected_contract.items():
        require(contract.get(key) == value, f"contract {key!r} must equal {value!r}", failures)

    camera_matrix = contract.get("cameraMatrixWorld")
    camera_scale = contract.get("cameraOrthoScale")
    require(
        isinstance(camera_matrix, list) and len(camera_matrix) == 16,
        "locked camera matrix must have 16 values",
        failures,
    )
    require(
        isinstance(camera_scale, (int, float)) and float(camera_scale) > 0,
        "locked orthographic scale must be positive",
        failures,
    )

    grid = manifest.get("grid", {})
    columns = int(grid.get("columns", 0))
    rows = int(grid.get("rows", 0))
    width = int(grid.get("frameWidth", 0))
    height = int(grid.get("frameHeight", 0))
    frames = manifest.get("frames", [])
    require(columns > 0 and rows > 0, "grid must be positive", failures)
    require(width > 0 and height > 0, "frame dimensions must be positive", failures)
    require(len(frames) == columns * rows, "frame count must exactly fill grid", failures)

    seen_indices: set[int] = set()
    for record in frames:
        index = int(record.get("index", -1))
        require(index not in seen_indices, f"duplicate frame index {index}", failures)
        seen_indices.add(index)
        require(
            record.get("cameraMatrixWorld") == camera_matrix,
            f"frame {index} changed camera matrix",
            failures,
        )
        require(
            record.get("cameraOrthoScale") == camera_scale,
            f"frame {index} changed orthographic scale",
            failures,
        )
        passes = record.get("passes", {})
        for pass_name in REQUIRED_PASSES:
            pass_record = passes.get(pass_name, {})
            path = root / str(pass_record.get("image", ""))
            require(path.is_file(), f"frame {index} missing {pass_name} image", failures)
            if path.is_file():
                require(
                    sha256(path) == pass_record.get("sha256"),
                    f"frame {index} {pass_name} hash mismatch",
                    failures,
                )
                with Image.open(path) as image:
                    require(
                        image.size == (width, height),
                        f"frame {index} {pass_name} size {image.size} != {(width, height)}",
                        failures,
                    )
        joints = record.get("joints", [])
        require(bool(joints), f"frame {index} has no projected joints", failures)
        for joint in joints:
            require(
                finite_point(joint.get("head")) and finite_point(joint.get("tail")),
                f"frame {index} bone {joint.get('bone')} has invalid projection",
                failures,
            )
        weapon = record.get("weapon")
        require(
            isinstance(weapon, dict) and weapon.get("status") == "measured",
            f"frame {index} does not have one measured weapon",
            failures,
        )
        if isinstance(weapon, dict) and weapon.get("status") == "measured":
            require(
                finite_point(weapon.get("hilt")) and finite_point(weapon.get("tip")),
                f"frame {index} weapon projection is invalid",
                failures,
            )

    assembled = manifest.get("assembled", {})
    expected_size = (columns * width, rows * height)
    for sheet_name in REQUIRED_SHEETS:
        sheet_record = assembled.get(sheet_name, {})
        path = root / str(sheet_record.get("image", ""))
        require(path.is_file(), f"missing assembled {sheet_name} sheet", failures)
        if path.is_file():
            require(
                sha256(path) == sheet_record.get("sha256"),
                f"assembled {sheet_name} hash mismatch",
                failures,
            )
            with Image.open(path) as image:
                require(
                    image.size == expected_size,
                    f"assembled {sheet_name} size {image.size} != {expected_size}",
                    failures,
                )

    generation_contract_record = manifest.get("generationContract", {})
    generation_contract_path = root / str(generation_contract_record.get("path", ""))
    require(
        generation_contract_path.is_file(),
        "missing appearance-only generation contract",
        failures,
    )
    if generation_contract_path.is_file():
        require(
            sha256(generation_contract_path) == generation_contract_record.get("sha256"),
            "appearance-only generation contract hash mismatch",
            failures,
        )
        generation_contract = json.loads(generation_contract_path.read_text())
        require(
            generation_contract.get("semanticPoseLanguageAllowed") is False,
            "generation contract allows semantic pose interpretation",
            failures,
        )
        require(
            generation_contract.get("retryAuthority")
            == "restart from this native packet, never generated output",
            "generation contract allows generated-frame recursion",
            failures,
        )

    generated_record: dict[str, object] | None = None
    if generated is not None:
        require(generated.is_file(), f"generated sheet not found: {generated}", failures)
        if generated.is_file():
            with Image.open(generated) as image:
                generated_record = {
                    "path": str(generated),
                    "sha256": sha256(generated),
                    "size": list(image.size),
                    "expectedSize": list(expected_size),
                }
                require(
                    image.size == expected_size,
                    "generated sheet changed grid dimensions; frame correspondence is lost",
                    failures,
                )
                if overlay_out is not None and image.size == expected_size:
                    overlay_out.parent.mkdir(parents=True, exist_ok=True)
                    review_overlay = geometry_overlay(
                        image.convert("RGB"),
                        frames,
                        columns,
                        width,
                        height,
                    )
                    review_overlay.save(overlay_out)
                    generated_record["geometryOverlay"] = {
                        "path": str(overlay_out),
                        "sha256": sha256(overlay_out),
                    }
    elif overlay_out is not None:
        failures.append("--overlay-out requires --generated")

    report = {
        "schema": "animation-pose-packet-verification-v1",
        "status": "PASS" if not failures else "FAIL",
        "posePacket": str(root),
        "cameraSide": contract.get("cameraSide"),
        "frameCount": len(frames),
        "generated": generated_record,
        "failures": failures,
        "guardrailNotice": (
            "This verifies source provenance, camera identity, frame correspondence, "
            "packet hashes, joint projections, and weapon projections. It does not infer "
            "anatomical landmarks from stylized output; geometry-overlay review remains "
            "a human-visible acceptance gate."
        ),
    }
    return report


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True)
    parser.add_argument("--generated")
    parser.add_argument("--overlay-out")
    parser.add_argument("--report")
    args = parser.parse_args()
    report = verify(
        Path(args.root),
        Path(args.generated) if args.generated else None,
        Path(args.overlay_out) if args.overlay_out else None,
    )
    output = json.dumps(report, indent=2) + "\n"
    if args.report:
        Path(args.report).write_text(output)
    print(output, end="")
    if report["status"] != "PASS":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
