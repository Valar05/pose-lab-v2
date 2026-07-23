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
                "footAnchor": {"x": 4.0, "y": 6.0},
                "swordRoot": {"x": 4.0, "y": 3.0},
                "swordTip": {"x": 2.0, "y": 1.0},
                "frameDurationMs": 83.333333,
                "cameraMatrixWorld": CAMERA,
                "cameraOrthoScale": 2.0,
            }
        )
    metadata = {
        "schema": SCHEMA,
        "status": "rendered-pending-verification",
        "output": {
            "width": 8,
            "height": 8,
            "frameCount": 2,
        },
        "contract": {
            "cameraType": "ORTHO",
            "cameraMatrixWorld": CAMERA,
            "cameraOrthoScale": 2.0,
            "footAnchorTolerancePx": 1.0,
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
        "foot",
        lambda root: mutate_metadata(
            root,
            lambda data: data["frames"][1]["footAnchor"].update({"x": 8.0}),
        ),
        "foot anchor drifts",
    )

    print(
        json.dumps(
            {
                "status": "PASS",
                "checked": [
                    "valid export",
                    "camera transform change",
                    "opaque background",
                    "dimension mismatch",
                    "foot anchor drift",
                ],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
