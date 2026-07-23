#!/usr/bin/env python3
"""Assemble and fail-closed verify the Vanguard idle game export."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

from PIL import Image


SCHEMA = "pose-lab-v2-vanguard-idle-game-export-v1"


class ValidationFailure(RuntimeError):
    def __init__(self, failures: list[str]):
        super().__init__("\n".join(failures))
        self.failures = failures


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def require(condition: bool, message: str, failures: list[str]) -> None:
    if not condition:
        failures.append(message)


def point_is_finite(point: object) -> bool:
    return (
        isinstance(point, dict)
        and isinstance(point.get("x"), (int, float))
        and isinstance(point.get("y"), (int, float))
        and math.isfinite(float(point["x"]))
        and math.isfinite(float(point["y"]))
    )


def gif_frame(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    opaque_rgb = Image.new("RGB", rgba.size, (0, 0, 0))
    opaque_rgb.paste(rgba.convert("RGB"), mask=alpha)
    paletted = opaque_rgb.quantize(colors=255, method=Image.Quantize.MEDIANCUT)
    transparent = alpha.point(lambda value: 255 if value <= 8 else 0)
    paletted.paste(255, mask=transparent)
    paletted.info["transparency"] = 255
    paletted.info["disposal"] = 2
    return paletted


def assemble_contact_sheet(
    images: list[Image.Image],
    out_path: Path,
    columns: int = 4,
) -> dict[str, object]:
    width, height = images[0].size
    rows = math.ceil(len(images) / columns)
    sheet = Image.new("RGBA", (columns * width, rows * height), (0, 0, 0, 0))
    for index, image in enumerate(images):
        x = (index % columns) * width
        y = (index // columns) * height
        sheet.alpha_composite(image.convert("RGBA"), (x, y))
    sheet.save(out_path)
    return {
        "path": out_path.name,
        "sha256": sha256(out_path),
        "width": sheet.width,
        "height": sheet.height,
        "columns": columns,
        "rows": rows,
    }


def assemble_gif(
    images: list[Image.Image],
    out_path: Path,
    duration_ms: float,
) -> dict[str, object]:
    frames = [gif_frame(image) for image in images]
    gif_duration_ms = max(1, round(duration_ms))
    frames[0].save(
        out_path,
        save_all=True,
        append_images=frames[1:],
        duration=[gif_duration_ms] * len(frames),
        loop=0,
        transparency=255,
        disposal=2,
        optimize=False,
    )
    with Image.open(out_path) as image:
        gif_frames = getattr(image, "n_frames", 1)
        gif_size = image.size
    return {
        "path": out_path.name,
        "sha256": sha256(out_path),
        "width": gif_size[0],
        "height": gif_size[1],
        "frames": gif_frames,
        "durationMs": gif_duration_ms,
        "loop": 0,
    }


def finalize(root: Path) -> dict[str, object]:
    metadata_path = root / "metadata.json"
    if not metadata_path.is_file():
        raise ValidationFailure([f"missing metadata: {metadata_path}"])
    metadata = json.loads(metadata_path.read_text())
    failures: list[str] = []
    require(metadata.get("schema") == SCHEMA, "wrong metadata schema", failures)
    output = metadata.get("output", {})
    contract = metadata.get("contract", {})
    records = metadata.get("frames", [])
    width = int(output.get("width", 0))
    height = int(output.get("height", 0))
    frame_count = int(output.get("frameCount", 0))
    expected_camera = contract.get("cameraMatrixWorld")
    expected_scale = contract.get("cameraOrthoScale")
    expected_armature = contract.get("armatureMatrixWorld")
    tolerance = float(contract.get("footAnchorTolerancePx", -1))
    ground_tolerance = float(
        contract.get("renderedGroundContactTolerancePx", -1)
    )

    require(width > 0 and height > 0, "invalid output dimensions", failures)
    require(frame_count > 0, "invalid frame count", failures)
    require(len(records) == frame_count, "metadata frame count differs", failures)
    require(contract.get("cameraType") == "ORTHO", "camera is not orthographic", failures)
    require(
        isinstance(expected_camera, list) and len(expected_camera) == 16,
        "locked camera matrix must have 16 values",
        failures,
    )
    require(
        isinstance(expected_scale, (int, float)) and float(expected_scale) > 0,
        "locked camera scale must be positive",
        failures,
    )
    require(
        isinstance(expected_armature, list) and len(expected_armature) == 16,
        "fixed armature matrix must have 16 values",
        failures,
    )
    require(tolerance >= 0, "foot anchor tolerance cannot be negative", failures)
    require(
        ground_tolerance >= 0,
        "rendered ground contact tolerance cannot be negative",
        failures,
    )
    require(
        contract.get("footAnchorStabilization") is False,
        "foot anchor stabilization must be disabled",
        failures,
    )
    require(
        contract.get("animationModifications") == [],
        "animation modifications must be empty",
        failures,
    )
    require(
        metadata.get("source", {}).get("rootMotionSuppressed") is False,
        "native Idle root motion must not be suppressed",
        failures,
    )
    require(
        metadata.get("source", {}).get("animationModified") is False,
        "native Idle animation must not be modified",
        failures,
    )

    images: list[Image.Image] = []
    foot_keys = ("leftFootAnchor", "rightFootAnchor", "footAnchor")
    baseline_feet: dict[str, tuple[float, float]] = {}
    max_foot_drift: dict[str, float] = {key: 0.0 for key in foot_keys}
    baseline_ground_y: int | None = None
    max_ground_drift = 0.0
    baseline_root_location: list[float] | None = None
    alpha_records: list[dict[str, object]] = []
    seen_frames: set[int] = set()
    for expected_index, record in enumerate(records):
        frame = int(record.get("frame", -1))
        require(frame == expected_index, f"frame sequence is not contiguous at {frame}", failures)
        require(frame not in seen_frames, f"duplicate frame {frame}", failures)
        seen_frames.add(frame)
        require(
            record.get("cameraMatrixWorld") == expected_camera,
            f"camera transform changes at frame {frame}",
            failures,
        )
        require(
            record.get("cameraOrthoScale") == expected_scale,
            f"camera orthographic scale changes at frame {frame}",
            failures,
        )
        require(
            record.get("armatureMatrixWorld") == expected_armature,
            f"armature object transform changes at frame {frame}",
            failures,
        )
        root_location = record.get("rootLocation")
        require(
            isinstance(root_location, list)
            and len(root_location) == 3
            and all(
                isinstance(value, (int, float)) and math.isfinite(float(value))
                for value in root_location
            ),
            f"frame {frame} has invalid native root location",
            failures,
        )
        if (
            isinstance(root_location, list)
            and len(root_location) == 3
            and all(isinstance(value, (int, float)) for value in root_location)
        ):
            numeric_root = [float(value) for value in root_location]
            if baseline_root_location is None:
                baseline_root_location = numeric_root
            require(
                numeric_root == baseline_root_location,
                f"native root motion appears at frame {frame}",
                failures,
            )
        for key in (
            "pivot",
            "leftFootAnchor",
            "rightFootAnchor",
            "footAnchor",
            "swordRoot",
            "swordTip",
        ):
            require(point_is_finite(record.get(key)), f"frame {frame} has invalid {key}", failures)
        require(
            isinstance(record.get("frameDurationMs"), (int, float))
            and float(record["frameDurationMs"]) > 0,
            f"frame {frame} has invalid duration",
            failures,
        )

        for key in foot_keys:
            foot = record.get(key)
            if not point_is_finite(foot):
                continue
            current_foot = (float(foot["x"]), float(foot["y"]))
            if key not in baseline_feet:
                baseline_feet[key] = current_foot
            drift = math.dist(baseline_feet[key], current_foot)
            max_foot_drift[key] = max(max_foot_drift[key], drift)
            require(
                drift <= tolerance,
                (
                    f"{key} drifts {drift:.4f}px at frame {frame}; "
                    f"tolerance is {tolerance:.4f}px"
                ),
                failures,
            )

        image_path = root / str(record.get("image", ""))
        require(image_path.is_file(), f"missing frame image {image_path.name}", failures)
        if not image_path.is_file():
            continue
        with Image.open(image_path) as opened:
            image = opened.convert("RGBA")
            original_mode = opened.mode
            original_size = opened.size
        require(
            original_size == (width, height),
            f"frame dimensions differ at frame {frame}: {original_size} != {(width, height)}",
            failures,
        )
        require(original_mode == "RGBA", f"frame {frame} is {original_mode}, expected RGBA", failures)
        alpha = image.getchannel("A")
        alpha_min, alpha_max = alpha.getextrema()
        corners = [
            alpha.getpixel((0, 0)),
            alpha.getpixel((width - 1, 0)),
            alpha.getpixel((0, height - 1)),
            alpha.getpixel((width - 1, height - 1)),
        ]
        require(
            alpha_min == 0 and all(value == 0 for value in corners),
            f"background is not transparent at frame {frame}",
            failures,
        )
        require(alpha_max > 0, f"frame {frame} contains no visible sprite pixels", failures)
        contact_pixels = [
            (x, y)
            for y in range(height)
            for x in range(width)
            if alpha.getpixel((x, y)) > 8
        ]
        if contact_pixels:
            ground_y = max(y for _, y in contact_pixels)
            ground_x = [x for x, y in contact_pixels if y == ground_y]
            if baseline_ground_y is None:
                baseline_ground_y = ground_y
            ground_drift = abs(ground_y - baseline_ground_y)
            max_ground_drift = max(max_ground_drift, float(ground_drift))
            require(
                ground_drift <= ground_tolerance,
                (
                    f"rendered ground contact drifts {ground_drift:.4f}px "
                    f"at frame {frame}; tolerance is {ground_tolerance:.4f}px"
                ),
                failures,
            )
            record["renderedGroundContact"] = {
                "y": ground_y,
                "xMin": min(ground_x),
                "xMax": max(ground_x),
                "alphaThreshold": 8,
                "method": "lowest visible sprite pixels; measurement only",
            }
        transparent_pixels = sum(1 for value in alpha.getdata() if value == 0)
        alpha_records.append(
            {
                "frame": frame,
                "minimum": alpha_min,
                "maximum": alpha_max,
                "transparentPixels": transparent_pixels,
                "cornerAlpha": corners,
            }
        )
        require(
            sha256(image_path) == record.get("imageSha256"),
            f"frame {frame} image hash differs from Blender metadata",
            failures,
        )
        images.append(image)

    if failures:
        metadata["status"] = "verification-failed"
        metadata["verification"] = {
            "status": "FAIL",
            "failures": failures,
            "maxFootAnchorDriftPx": {
                key: round(value, 6) for key, value in max_foot_drift.items()
            },
            "maxRenderedGroundContactDriftPx": round(max_ground_drift, 6),
        }
        metadata_path.write_text(json.dumps(metadata, indent=2) + "\n")
        raise ValidationFailure(failures)

    frame_duration_ms = float(records[0]["frameDurationMs"])
    contact_sheet = assemble_contact_sheet(images, root / "contact_sheet.png")
    preview_gif = assemble_gif(images, root / "idle.gif", frame_duration_ms)
    require(
        int(preview_gif["frames"]) == frame_count,
        "preview GIF frame count differs",
        failures,
    )
    if failures:
        raise ValidationFailure(failures)

    metadata["status"] = "verified-game-export"
    metadata["artifacts"] = {
        "contactSheet": contact_sheet,
        "previewGif": preview_gif,
    }
    metadata["verification"] = {
        "status": "PASS",
        "cameraTransformLocked": True,
        "transparentRgba": True,
        "uniformFrameDimensions": [width, height],
        "footAnchorTolerancePx": tolerance,
        "maxFootAnchorDriftPx": {
            key: round(value, 6) for key, value in max_foot_drift.items()
        },
        "renderedGroundContactTolerancePx": ground_tolerance,
        "maxRenderedGroundContactDriftPx": round(max_ground_drift, 6),
        "armatureObjectTransformLocked": True,
        "animationModifications": [],
        "alpha": alpha_records,
        "failures": [],
    }
    metadata_path.write_text(json.dumps(metadata, indent=2) + "\n")
    return metadata


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True)
    args = parser.parse_args()
    root = Path(args.root)
    try:
        metadata = finalize(root)
    except ValidationFailure as exc:
        print(
            json.dumps(
                {
                    "status": "FAIL",
                    "root": str(root),
                    "failures": exc.failures,
                },
                indent=2,
            )
        )
        raise SystemExit(1)
    print(
        json.dumps(
            {
                "status": "PASS",
                "root": str(root),
                "frames": len(metadata["frames"]),
                "contactSheet": metadata["artifacts"]["contactSheet"]["path"],
                "previewGif": metadata["artifacts"]["previewGif"]["path"],
                "maxFootAnchorDriftPx": metadata["verification"][
                    "maxFootAnchorDriftPx"
                ],
                "maxRenderedGroundContactDriftPx": metadata["verification"][
                    "maxRenderedGroundContactDriftPx"
                ],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
