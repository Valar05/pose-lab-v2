#!/usr/bin/env python3
"""Regression tests for the Vanguard idle export's four hard failures."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

from PIL import Image

from finalize_vanguard_idle_export import SCHEMA, ValidationFailure, finalize, sha256


CAMERA = [
    1.0,
    0.0,
    0.0,
    0.0,
    0.0,
    1.0,
    0.0,
    0.0,
    0.0,
    0.0,
    1.0,
    0.0,
    0.0,
    0.0,
    0.0,
    1.0,
]


def write_fixture(root: Path) -> None:
    records = []
    for index in range(2):
        path = root / f"idle_{index:04d}.png"
        image = Image.new("RGBA", (8, 8), (0, 0, 0, 0))
        for x in range(2, 6):
            for y in range(1, 7):
                image.putpixel((x, y), (80 + index, 140, 210, 255))
        image.save(path)
        records.append(
            {
                "frame": index,
                "sourceFrame": index * 5,
                "image": path.name,
                "imageSha256": sha256(path),
                "pivot": {"x": 4.0, "y": 7.0},
                "leftFootAnchor": {"x": 3.0, "y": 6.0},
                "rightFootAnchor": {"x": 5.0, "y": 6.0},
                "footAnchor": {"x": 4.0, "y": 6.0},
                "swordRoot": {"x": 4.0, "y": 3.0},
                "swordTip": {"x": 2.0, "y": 1.0},
                "frameDurationMs": 83.333333,
                "cameraMatrixWorld": CAMERA,
                "cameraOrthoScale": 2.0,
                "armatureMatrixWorld": CAMERA,
                "rootLocation": [0.0, 0.0, 0.0],
            }
        )
    metadata = {
        "schema": SCHEMA,
        "status": "rendered-pending-verification",
        "source": {
            "rootMotionSuppressed": False,
            "animationModified": False,
        },
        "output": {
            "width": 8,
            "height": 8,
            "frameCount": 2,
        },
        "contract": {
            "cameraType": "ORTHO",
            "cameraMatrixWorld": CAMERA,
            "cameraOrthoScale": 2.0,
            "armatureMatrixWorld": CAMERA,
            "footAnchorTolerancePx": 1.0,
            "renderedGroundContactTolerancePx": 1.0,
            "footAnchorStabilization": False,
            "animationModifications": [],
        },
        "frames": records,
    }
    (root / "metadata.json").write_text(json.dumps(metadata, indent=2) + "\n")


def mutate_metadata(root: Path, callback) -> None:
    path = root / "metadata.json"
    data = json.loads(path.read_text())
    callback(data)
    path.write_text(json.dumps(data, indent=2) + "\n")


def expect_failure(name: str, mutator, expected: str) -> None:
    with tempfile.TemporaryDirectory(prefix=f"vanguard-idle-{name}-") as tmp:
        root = Path(tmp)
        write_fixture(root)
        mutator(root)
        try:
            finalize(root)
        except ValidationFailure as exc:
            joined = "\n".join(exc.failures)
            if expected not in joined:
                raise AssertionError(f"{name}: expected {expected!r} in {joined!r}")
        else:
            raise AssertionError(f"{name}: verifier unexpectedly passed")


def main() -> None:
    exporter_source = (
        Path(__file__).with_name("export_vanguard_idle_game_blender.py").read_text()
    )
    banned_exporter_motion = (
        "armature.location =",
        "armature.matrix_world =",
        "root.location =",
        "suppress_root_motion",
        "footAnchorCorrectionWorld",
        "anchor_corrections",
        "stabilized_bounds",
        "set_game_export_pose",
    )
    for banned in banned_exporter_motion:
        assert banned not in exporter_source, (
            f"exporter reintroduced artificial motion through {banned!r}"
        )

    with tempfile.TemporaryDirectory(prefix="vanguard-idle-pass-") as tmp:
        root = Path(tmp)
        write_fixture(root)
        result = finalize(root)
        assert result["status"] == "verified-game-export"
        assert (root / "contact_sheet.png").is_file()
        assert (root / "idle.gif").is_file()

    expect_failure(
        "camera",
        lambda root: mutate_metadata(
            root,
            lambda data: data["frames"][1].update(
                {"cameraMatrixWorld": [2.0, *CAMERA[1:]]}
            ),
        ),
        "camera transform changes",
    )

    def opaque(root: Path) -> None:
        path = root / "idle_0001.png"
        Image.new("RGBA", (8, 8), (20, 30, 40, 255)).save(path)
        mutate_metadata(
            root,
            lambda data: data["frames"][1].update({"imageSha256": sha256(path)}),
        )

    expect_failure("alpha", opaque, "background is not transparent")

    def dimensions(root: Path) -> None:
        path = root / "idle_0001.png"
        Image.new("RGBA", (9, 8), (0, 0, 0, 0)).save(path)
        mutate_metadata(
            root,
            lambda data: data["frames"][1].update({"imageSha256": sha256(path)}),
        )

    expect_failure("dimensions", dimensions, "frame dimensions differ")

    expect_failure(
        "left-foot",
        lambda root: mutate_metadata(
            root,
            lambda data: data["frames"][1]["leftFootAnchor"].update({"x": 8.0}),
        ),
        "leftFootAnchor drifts",
    )

    expect_failure(
        "armature",
        lambda root: mutate_metadata(
            root,
            lambda data: data["frames"][1].update(
                {"armatureMatrixWorld": [2.0, *CAMERA[1:]]}
            ),
        ),
        "armature object transform changes",
    )

    expect_failure(
        "stabilization",
        lambda root: mutate_metadata(
            root,
            lambda data: data["contract"].update(
                {"footAnchorStabilization": "whole-rig translation"}
            ),
        ),
        "foot anchor stabilization must be disabled",
    )

    expect_failure(
        "native-root-motion",
        lambda root: mutate_metadata(
            root,
            lambda data: data["frames"][1].update(
                {"rootLocation": [0.0, 0.25, 0.0]}
            ),
        ),
        "native root motion appears",
    )

    def ground_contact(root: Path) -> None:
        path = root / "idle_0001.png"
        with Image.open(path) as opened:
            image = opened.convert("RGBA")
        for x in range(image.width):
            for y in range(5, image.height):
                image.putpixel((x, y), (0, 0, 0, 0))
        image.save(path)
        mutate_metadata(
            root,
            lambda data: data["frames"][1].update(
                {"imageSha256": sha256(path)}
            ),
        )

    expect_failure(
        "ground-contact",
        ground_contact,
        "rendered ground contact drifts",
    )

    print(
        json.dumps(
            {
                "status": "PASS",
                "checked": [
                    "valid export",
                    "camera transform change",
                    "armature object transform change",
                    "artificial stabilization contract",
                    "artificial exporter motion",
                    "native root motion",
                    "opaque background",
                    "dimension mismatch",
                    "individual IK foot anchor drift",
                    "rendered ground contact drift",
                ],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
