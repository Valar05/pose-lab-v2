#!/usr/bin/env python3
"""Fail closed if approved Attack1 pixels lose native vertical registration."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
METADATA = ROOT / "public/assets/vanguard/fleshpunk/swordattack1/source-metadata.json"
MANIFEST = ROOT / "public/assets/vanguard/fleshpunk/animations.json"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def pixel_sha256(image: Image.Image) -> str:
    pixels = bytearray(image.convert("RGBA").tobytes())
    for index in range(0, len(pixels), 4):
        if pixels[index + 3] == 0:
            pixels[index : index + 3] = b"\0\0\0"
    return hashlib.sha256(bytes(pixels)).hexdigest()


def alpha_bbox(image: Image.Image) -> list[int]:
    bbox = image.convert("RGBA").getchannel("A").getbbox()
    require(bbox is not None, "frame is fully transparent")
    assert bbox is not None
    return list(bbox)


def reverse_translation(image: Image.Image, dy: int) -> Image.Image:
    rgba = image.convert("RGBA")
    result = Image.new("RGBA", rgba.size, (0, 0, 0, 0))
    result.alpha_composite(rgba, (0, -dy))
    return result


metadata = json.loads(METADATA.read_text())
manifest = json.loads(MANIFEST.read_text())
registration = metadata.get("registration", {})
require(
    registration.get("schema") == "pose-lab-v2-source-envelope-registration-v1",
    "Attack1 source registration contract is missing",
)
require(registration.get("axis") == "y", "registration must be Y-only")
require(
    registration.get("transform") == "integer rigid canvas translation only",
    "registration must remain a rigid integer canvas translation",
)
require(registration.get("native_motion_preserved") is True, "native motion must be preserved")
require(registration.get("reference_frame") == 0, "frame zero must own registration")
offset = registration.get("source_to_fleshpunk_offset_px")
require(isinstance(offset, int), "source-to-Fleshpunk offset must be an integer")

attack = next(item for item in manifest["animations"] if item["id"] == "swordattack1")
require(attack.get("registration", {}).get("tolerancePx") == 0, "Attack1 drift tolerance must be zero")
require(len(attack["frames"]) == len(metadata["frames"]) == 12, "Attack1 must keep 12 frames")

for manifest_frame, record in zip(attack["frames"], metadata["frames"], strict=True):
    path = METADATA.parent / record["path"]
    image = Image.open(path).convert("RGBA")
    bbox = alpha_bbox(image)
    expected_bottom = record["source_bbox"][3] + offset
    dy = record["registration"]["translation_px"][1]

    require(image.size == (512, 512), f"frame {record['frame']} canvas changed")
    require(bbox == record["fleshpunk_bbox"], f"frame {record['frame']} bbox metadata drifted")
    require(bbox[3] == expected_bottom, f"frame {record['frame']} lost native vertical motion")
    require(sha256_file(path) == record["sha256"], f"frame {record['frame']} file hash drifted")
    require(pixel_sha256(image) == record["pixel_sha256"], f"frame {record['frame']} pixels drifted")
    require(
        pixel_sha256(reverse_translation(image, dy))
        == record["pre_registration"]["pixel_sha256"],
        f"frame {record['frame']} is not only a rigid translation of approved pixels",
    )
    require(
        manifest_frame["sha256"] == record["sha256"],
        f"frame {record['frame']} manifest hash drifted",
    )
    require(
        manifest_frame["pivot"]["y"] == expected_bottom,
        f"frame {record['frame']} pivot does not match native registration",
    )

contact_sheet = METADATA.parent / "contact-sheet.png"
require(
    sha256_file(contact_sheet) == metadata["sha256"]["contact-sheet.png"],
    "Attack1 contact sheet hash drifted",
)
print("Vanguard SwordAttack1 registration contract: PASS")
