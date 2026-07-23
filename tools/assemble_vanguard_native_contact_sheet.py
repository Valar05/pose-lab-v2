#!/usr/bin/env python3
"""Assemble labeled Vanguard native-animation renders into contact sheets."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def font(size: int) -> ImageFont.ImageFont:
    for candidate in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf",
    ):
        if Path(candidate).is_file():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True)
    args = parser.parse_args()
    root = Path(args.root)
    manifest = json.loads((root / "manifest.json").read_text())
    title_font = font(23)
    label_font = font(17)
    note_font = font(15)
    background = (13, 18, 23)
    panel = (24, 31, 38)
    edge = (67, 83, 96)
    text = (241, 244, 247)
    muted = (170, 183, 194)

    for view in ("left", "right"):
        records = [record for record in manifest["frames"] if record["view"] == view]
        records.sort(key=lambda record: record["index"])
        images = [Image.open(root / record["image"]).convert("RGB") for record in records]
        frame_w, frame_h = images[0].size
        header_h = 72
        label_h = 50
        gutter = 10
        cols, rows = 4, 3
        cell_w = frame_w + gutter * 2
        cell_h = frame_h + label_h + gutter * 2
        sheet = Image.new(
            "RGB",
            (cell_w * cols, header_h + cell_h * rows),
            background,
        )
        draw = ImageDraw.Draw(sheet)
        title = f"Vanguard native SwordAttack1 — strict {view} lateral"
        draw.text((18, 12), title, fill=text, font=title_font)
        draw.text(
            (18, 42),
            "Pose/timing authority only • 12 samples from source frames 0–38 • no retargeting",
            fill=muted,
            font=note_font,
        )
        for record, image in zip(records, images):
            index = int(record["index"])
            col = index % cols
            row = index // cols
            x = col * cell_w
            y = header_h + row * cell_h
            draw.rectangle(
                (x + gutter - 1, y + gutter - 1, x + gutter + frame_w, y + gutter + frame_h),
                fill=panel,
                outline=edge,
                width=1,
            )
            sheet.paste(image, (x + gutter, y + gutter))
            label_y = y + gutter + frame_h + 7
            draw.text(
                (x + gutter, label_y),
                f"F{index:02d}  source {record['sourceFrame']:04.1f}",
                fill=text,
                font=label_font,
            )
            draw.text(
                (x + gutter, label_y + 23),
                f"{record['sourceSecondsAt60Fps']:.3f}s @ 60 fps",
                fill=muted,
                font=note_font,
            )
        out_path = root / f"vanguard-swordattack1-{view}-lateral-contact-sheet.png"
        sheet.save(out_path)


if __name__ == "__main__":
    main()
