#!/usr/bin/env python3
"""Register Fleshpunk Attack1 frames to the native render's vertical motion.

The appearance pass is allowed to change surface pixels, but it is not allowed
to invent whole-frame movement. This tool derives a Y-only canvas translation
from the native and Fleshpunk bounding boxes already recorded in
source-metadata.json. It never scales, rotates, mirrors, crops, or repaints a
frame.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
from pathlib import Path

from PIL import Image


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def pixel_sha256(image: Image.Image) -> str:
    pixels = bytearray(image.convert("RGBA").tobytes())
    for index in range(0, len(pixels), 4):
        if pixels[index + 3] == 0:
            pixels[index : index + 3] = b"\0\0\0"
    return sha256_bytes(bytes(pixels))


def alpha_bbox(image: Image.Image) -> list[int]:
    rgba = image.convert("RGBA")
    bbox = rgba.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError("frame is fully transparent")
    return list(bbox)


def translate_y(image: Image.Image, dy: int) -> Image.Image:
    rgba = image.convert("RGBA")
    bbox = rgba.getchannel("A").getbbox()
    assert bbox is not None
    if bbox[1] + dy < 0 or bbox[3] + dy > rgba.height:
        raise ValueError(f"translation {dy}px would clip non-transparent pixels")
    result = Image.new("RGBA", rgba.size, (0, 0, 0, 0))
    result.alpha_composite(rgba, (0, dy))
    return result


def png_bytes(image: Image.Image) -> bytes:
    output = io.BytesIO()
    image.save(output, format="PNG", optimize=False, compress_level=9)
    return output.getvalue()


def build_contact_sheet(images: list[Image.Image], columns: int, rows: int) -> Image.Image:
    if len(images) != columns * rows:
        raise ValueError("frame count does not fill the declared contact-sheet grid")
    width, height = images[0].size
    sheet = Image.new("RGBA", (columns * width, rows * height), (0, 0, 0, 0))
    for index, frame in enumerate(images):
        sheet.alpha_composite(frame, ((index % columns) * width, (index // columns) * height))
    return sheet


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--metadata",
        default="public/assets/vanguard/fleshpunk/swordattack1/source-metadata.json",
    )
    parser.add_argument(
        "--manifest",
        default="public/assets/vanguard/fleshpunk/animations.json",
    )
    args = parser.parse_args()

    metadata_path = Path(args.metadata)
    manifest_path = Path(args.manifest)
    clip_root = metadata_path.parent
    metadata = json.loads(metadata_path.read_text())
    manifest = json.loads(manifest_path.read_text())
    records = metadata["frames"]
    if len(records) != 12:
        raise ValueError("SwordAttack1 registration requires the approved 12-frame set")

    reference = records[0]
    source_offset_y = reference["fleshpunk_bbox"][3] - reference["source_bbox"][3]
    corrected_images: list[Image.Image] = []
    translations: list[int] = []

    for record in records:
        path = clip_root / record["path"]
        image = Image.open(path).convert("RGBA")
        actual_bbox = alpha_bbox(image)
        if actual_bbox != record["fleshpunk_bbox"]:
            raise ValueError(
                f"frame {record['frame']} bbox changed before registration: "
                f"{actual_bbox} != {record['fleshpunk_bbox']}"
            )
        if sha256_file(path) != record["sha256"]:
            raise ValueError(f"frame {record['frame']} file hash changed before registration")

        expected_bottom = record["source_bbox"][3] + source_offset_y
        dy = expected_bottom - actual_bbox[3]
        corrected = translate_y(image, dy)
        corrected_bbox = alpha_bbox(corrected)
        if corrected_bbox[3] != expected_bottom:
            raise AssertionError(f"frame {record['frame']} failed vertical registration")

        original_file_sha = record["sha256"]
        original_pixel_sha = pixel_sha256(image)
        corrected_data = path.read_bytes() if dy == 0 else png_bytes(corrected)
        if dy != 0:
            path.write_bytes(corrected_data)

        record["pre_registration"] = {
            "file_sha256": original_file_sha,
            "pixel_sha256": original_pixel_sha,
            "fleshpunk_bbox": actual_bbox,
        }
        record["registration"] = {
            "translation_px": [0, dy],
            "native_source_bottom_y": record["source_bbox"][3],
            "expected_fleshpunk_bottom_y": expected_bottom,
        }
        record["fleshpunk_bbox"] = corrected_bbox
        record["sha256"] = sha256_bytes(corrected_data)
        record["pixel_sha256"] = pixel_sha256(corrected)
        translations.append(dy)
        corrected_images.append(corrected)

    columns = metadata["layout"]["columns"]
    rows = metadata["layout"]["rows"]
    contact_sheet_path = clip_root / "contact-sheet.png"
    contact_sheet_path.write_bytes(png_bytes(build_contact_sheet(corrected_images, columns, rows)))

    metadata["authority"]["excluded"] = [
        "Crimson model",
        "bitmap mirroring",
        "generator-authored per-frame reframing",
        "pose-aware stabilization",
        "invented in-betweens",
    ]
    metadata["contract"]["registration"] = "source-derived rigid Y-only canvas translation"
    metadata["registration"] = {
        "schema": "pose-lab-v2-source-envelope-registration-v1",
        "axis": "y",
        "reference_frame": 0,
        "source_anchor": "native source_bbox bottom",
        "source_to_fleshpunk_offset_px": source_offset_y,
        "translation_px_by_frame": translations,
        "transform": "integer rigid canvas translation only",
        "forbidden": ["scale", "rotation", "mirror", "crop", "repaint", "bone edit", "camera edit"],
        "native_motion_preserved": True,
    }
    metadata["sha256"] = {
        "contact-sheet.png": sha256_file(contact_sheet_path),
    }
    metadata_path.write_text(json.dumps(metadata, indent=2) + "\n")

    attack = next(item for item in manifest["animations"] if item["id"] == "swordattack1")
    attack["groundGuideY"] = reference["source_bbox"][3] + source_offset_y
    attack["contract"] = [
        "screen-right",
        "native SwordAttack1 geometry",
        "fixed camera",
        "appearance edit only",
        "source-derived rigid Y-only canvas registration",
    ]
    attack["registration"] = {
        "schema": "pose-lab-v2-source-envelope-registration-v1",
        "axis": "y",
        "referenceFrame": 0,
        "sourceToFleshpunkOffsetPx": source_offset_y,
        "tolerancePx": 0,
    }
    for frame, record in zip(attack["frames"], records, strict=True):
        frame["sha256"] = record["sha256"]
        frame["pivot"] = {
            "y": record["registration"]["expected_fleshpunk_bottom_y"],
            "kind": "native-source-envelope-bottom",
        }
    manifest["authority"]["excluded"] = metadata["authority"]["excluded"]
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")

    print(
        json.dumps(
            {
                "status": "registered",
                "frames": len(records),
                "translationsY": translations,
                "contactSheet": str(contact_sheet_path),
            }
        )
    )


if __name__ == "__main__":
    main()
