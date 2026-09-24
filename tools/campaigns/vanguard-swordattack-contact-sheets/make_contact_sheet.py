#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument("--root", required=True)
    p.add_argument("--out", required=True)
    p.add_argument("--title", required=True)
    return p.parse_args()


def main() -> None:
    a = args()
    root = Path(a.root)
    out = Path(a.out)
    metadata_path = root / "metadata.json"
    if not metadata_path.is_file():
        raise SystemExit(f"missing Blender metadata: {metadata_path}")

    metadata = json.loads(metadata_path.read_text())
    records = metadata.get("frames", [])
    if not records:
        raise SystemExit("metadata contains no rendered frames")

    loaded: list[tuple[dict, Image.Image]] = []
    for record in records:
        path = root / str(record.get("image", ""))
        if not path.is_file():
            raise SystemExit(f"missing rendered frame: {path}")
        loaded.append((record, Image.open(path).convert("RGBA")))

    cell_w = max(im.width for _, im in loaded)
    cell_h = max(im.height for _, im in loaded)
    cols = min(3, len(loaded))
    rows = math.ceil(len(loaded) / cols)
    header_h = 46
    label_h = 28
    pad = 10

    sheet = Image.new(
        "RGBA",
        (
            cols * cell_w + (cols + 1) * pad,
            header_h + rows * (cell_h + label_h + pad) + pad,
        ),
        (0, 0, 0, 255),
    )
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()

    source = metadata.get("source", {})
    draw.text((pad, 8), f"{a.title} — 3D Vanguard donor", fill="white", font=font)
    draw.text(
        (pad, 24),
        f"{len(loaded)} uniform samples | source range {source.get('actionFrameRange')}",
        fill=(190, 190, 190, 255),
        font=font,
    )

    for i, (record, image) in enumerate(loaded):
        col = i % cols
        row = i // cols
        x = pad + col * (cell_w + pad)
        y = header_h + pad + row * (cell_h + label_h + pad)
        sheet.alpha_composite(image, (x, y))
        source_frame = record.get("sourceFrame")
        blender_frame = record.get("blenderImportedFrame")
        draw.text(
            (x + 4, y + cell_h + 5),
            f"{i + 1:02d}  src {source_frame}  glb {blender_frame}",
            fill="white",
            font=font,
        )

    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    print(
        json.dumps(
            {
                "status": "OK",
                "contactSheet": str(out),
                "frames": len(loaded),
                "columns": cols,
                "rows": rows,
            }
        )
    )


if __name__ == "__main__":
    main()
