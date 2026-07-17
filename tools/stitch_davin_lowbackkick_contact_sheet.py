#!/usr/bin/env python3
"""Stitch Davin LowBackKick diagnostic Blender frames into a labeled contact sheet."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = ROOT / "generated" / "davin-lowbackkick" / "contact-sheet" / "ares-transfer-1" / "manifest.json"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def font(size: int) -> ImageFont.ImageFont:
    for candidate in [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/system/fonts/Roboto-Regular.ttf",
    ]:
        path = Path(candidate)
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", default=str(DEFAULT_MANIFEST))
    parser.add_argument("--out", default=None)
    parser.add_argument("--columns", type=int, default=4)
    args = parser.parse_args()

    manifest_path = Path(args.manifest)
    if not manifest_path.is_absolute():
        manifest_path = ROOT / manifest_path
    manifest = json.loads(manifest_path.read_text())
    frames = manifest.get("frames") or []
    if not frames:
        raise SystemExit("manifest has no frames")

    images = []
    for frame in frames:
        path = Path(frame["path"])
        if not path.is_absolute():
            path = manifest_path.parent / path
        images.append((frame, Image.open(path).convert("RGB")))

    columns = max(1, args.columns)
    rows = (len(images) + columns - 1) // columns
    cell_w = max(img.width for _, img in images)
    cell_h = max(img.height for _, img in images) + 58
    title_h = 78
    sheet = Image.new("RGB", (columns * cell_w, title_h + rows * cell_h), (24, 27, 30))
    draw = ImageDraw.Draw(sheet)
    title_font = font(24)
    label_font = font(18)
    small_font = font(14)
    draw.text((18, 14), "Davin Wingsworth LowBackKick - Ares SF2 transfer 1", fill=(235, 238, 242), font=title_font)
    draw.text((18, 46), "Diagnostic contact sheet only: local Blender render, not accepted visual truth", fill=(255, 194, 102), font=small_font)

    for idx, (frame, img) in enumerate(images):
        col = idx % columns
        row = idx // columns
        x = col * cell_w
        y = title_h + row * cell_h
        sheet.paste(img, (x, y))
        label_y = y + img.height + 8
        label = f"{idx:02d} {frame.get('label') or ''}"
        time = frame.get("time")
        time_text = f"t={float(time):.5f}s" if isinstance(time, (int, float)) else "t=?"
        draw.rectangle((x, y + img.height, x + cell_w, y + cell_h), fill=(18, 21, 24))
        draw.text((x + 12, label_y), label, fill=(238, 241, 245), font=label_font)
        draw.text((x + 12, label_y + 26), time_text, fill=(166, 176, 190), font=small_font)

    out = Path(args.out) if args.out else manifest_path.parent / "davin-lowbackkick-ares-transfer-1-contact-sheet.png"
    if not out.is_absolute():
        out = ROOT / out
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    manifest["contactSheet"] = {"path": str(out), "sha256": sha256(out)}
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    print(str(out))


if __name__ == "__main__":
    main()
