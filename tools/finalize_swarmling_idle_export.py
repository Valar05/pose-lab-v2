#!/usr/bin/env python3
"""Verify, assemble, and publish the six-frame Swarmling Idle review set."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import shutil
from pathlib import Path

from PIL import Image


SCHEMA = "pose-lab-v2-swarmling-idle-game-export-v1"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def gif_frame(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    opaque = Image.new("RGB", rgba.size, (0, 0, 0))
    opaque.paste(rgba.convert("RGB"), mask=alpha)
    paletted = opaque.quantize(colors=255, method=Image.Quantize.MEDIANCUT)
    transparent = alpha.point(lambda value: 255 if value <= 8 else 0)
    paletted.paste(255, mask=transparent)
    paletted.info["transparency"] = 255
    paletted.info["disposal"] = 2
    return paletted


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True, type=Path)
    parser.add_argument("--publish-root", required=True, type=Path)
    args = parser.parse_args()
    root = args.root.resolve()
    publish_root = args.publish_root.resolve()
    metadata_path = root / "metadata.json"
    metadata = json.loads(metadata_path.read_text())
    failures: list[str] = []

    if metadata.get("schema") != SCHEMA:
        failures.append("wrong metadata schema")
    if metadata.get("source", {}).get("animationModified") is not False:
        failures.append("native Idle animation was modified")
    contract = metadata.get("contract", {})
    if contract.get("cameraType") != "ORTHO":
        failures.append("camera is not orthographic")
    if contract.get("cameraView") != "world_pos_x":
        failures.append("camera view is not world_pos_x")
    if contract.get("facing") != "screen-left":
        failures.append("Swarmling is not declared screen-left")
    if contract.get("animationModifications") != []:
        failures.append("animation modifications must remain empty")
    records = metadata.get("frames", [])
    if len(records) != 6:
        failures.append(f"expected six frames, found {len(records)}")

    images: list[Image.Image] = []
    ground_y = 0
    expected_camera = contract.get("cameraMatrixWorld")
    expected_scale = contract.get("cameraOrthoScale")
    expected_armature = contract.get("armatureMatrixWorld")
    expected_meshes = contract.get("meshMatricesWorld")
    for index, record in enumerate(records):
        if record.get("frame") != index:
            failures.append(f"non-contiguous frame index at {index}")
        if record.get("cameraMatrixWorld") != expected_camera:
            failures.append(f"camera transform changed at frame {index}")
        if record.get("cameraOrthoScale") != expected_scale:
            failures.append(f"camera scale changed at frame {index}")
        if record.get("armatureMatrixWorld") != expected_armature:
            failures.append(f"armature object transform changed at frame {index}")
        if record.get("meshMatricesWorld") != expected_meshes:
            failures.append(f"mesh object transform changed at frame {index}")
        image_path = root / str(record.get("image", ""))
        if not image_path.is_file():
            failures.append(f"missing frame image {index}")
            continue
        if sha256(image_path) != record.get("imageSha256"):
            failures.append(f"frame hash changed at {index}")
        with Image.open(image_path) as opened:
            image = opened.convert("RGBA")
        if image.size != (512, 512):
            failures.append(f"frame {index} is {image.size}, expected 512x512")
        alpha = image.getchannel("A")
        extrema = alpha.getextrema()
        if extrema[0] != 0 or extrema[1] == 0:
            failures.append(f"frame {index} lacks transparent character separation")
        bbox = alpha.getbbox()
        if bbox:
            ground_y = max(ground_y, bbox[3])
        images.append(image)

    if failures:
        raise RuntimeError(json.dumps({"ok": False, "failures": failures}, indent=2))

    sheet = Image.new("RGBA", (1536, 1024), (0, 0, 0, 0))
    for index, image in enumerate(images):
        sheet.alpha_composite(image, ((index % 3) * 512, (index // 3) * 512))
    contact_sheet = root / "contact-sheet.png"
    sheet.save(contact_sheet)

    duration_ms = float(records[0]["frameDurationMs"])
    gif_frames = [gif_frame(image) for image in images]
    preview = root / "idle.gif"
    gif_frames[0].save(
        preview,
        save_all=True,
        append_images=gif_frames[1:],
        duration=[max(1, round(duration_ms))] * len(gif_frames),
        loop=0,
        transparency=255,
        disposal=2,
        optimize=False,
    )

    frames_dir = publish_root / "idle" / "frames"
    frames_dir.mkdir(parents=True, exist_ok=True)
    for stale in frames_dir.glob("idle_*.png"):
        stale.unlink()
    manifest_frames = []
    for index, record in enumerate(records):
        source = root / record["image"]
        destination = frames_dir / record["image"]
        shutil.copyfile(source, destination)
        manifest_frames.append(
            {
                "src": f"idle/frames/{destination.name}",
                "durationMs": max(1, round(float(record["frameDurationMs"]))),
                "sha256": sha256(destination),
            }
        )
    shutil.copyfile(contact_sheet, publish_root / "idle" / "contact-sheet.png")
    shutil.copyfile(preview, publish_root / "idle" / "idle.gif")
    verified_metadata = {
        **metadata,
        "status": "verified-game-export",
        "verification": {"status": "PASS", "failures": []},
        "artifacts": {
            "contactSheetSha256": sha256(contact_sheet),
            "previewGifSha256": sha256(preview),
        },
    }
    source_metadata = publish_root / "idle" / "source-metadata.json"
    source_metadata.write_text(json.dumps(verified_metadata, indent=2) + "\n")

    manifest = {
        "schema": "pose-lab-v2-2d-animation-set-v1",
        "character": "Fleshpunk Swarmling",
        "defaultAnimation": "idle",
        "frameSpace": {
            "width": 512,
            "height": 512,
            "colorMode": "RGBA",
            "background": "transparent",
            "facing": "screen-left",
            "camera": "fixed",
        },
        "authority": {
            "poseCameraFacingTiming": "Swarmling.blend native Idle action",
            "appearance": "current source materials; concept skin pending",
            "excluded": [
                "bitmap mirroring",
                "per-frame reframing",
                "retargeting",
                "pose repair",
                "invented in-betweens",
            ],
        },
        "animations": [
            {
                "id": "idle",
                "label": "Native Idle Test",
                "loop": True,
                "contactSheet": "idle/contact-sheet.png",
                "sourceMetadata": "idle/source-metadata.json",
                "groundGuideY": min(511, ground_y),
                "contract": [
                    "screen-left",
                    "native Idle geometry",
                    "world_pos_x",
                    "fixed camera",
                    "six uniform samples",
                ],
                "frames": manifest_frames,
            }
        ],
    }
    (publish_root / "animations.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(
        json.dumps(
            {
                "ok": True,
                "frames": len(images),
                "nativeDurationMs": round(sum(frame["durationMs"] for frame in manifest_frames)),
                "contactSheet": str(contact_sheet),
                "previewGif": str(preview),
                "manifest": str(publish_root / "animations.json"),
            }
        )
    )


if __name__ == "__main__":
    main()
