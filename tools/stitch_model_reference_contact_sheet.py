#!/usr/bin/env python3
"""Build one master beauty contact sheet from generic model-reference packets."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--title", default="Model Reference")
    args = parser.parse_args()

    root = Path(args.root)
    out = Path(args.out)
    sheets = sorted(root.glob("*/beauty-grid.png"))
    if not sheets:
        raise RuntimeError(f"No beauty-grid.png files found under {root}")

    tiles = []
    for path in sheets:
        image = Image.open(path).convert("RGB")
        max_width = 900
        if image.width > max_width:
            ratio = max_width / image.width
            image = image.resize((max_width, round(image.height * ratio)), Image.Resampling.LANCZOS)
        tile = Image.new("RGB", (image.width, image.height + 42), (16, 16, 16))
        tile.paste(image, (0, 42))
        draw = ImageDraw.Draw(tile)
        draw.text((12, 12), path.parent.name, fill=(240, 240, 240))
        tiles.append(tile)

    cols = 2 if len(tiles) > 1 else 1
    col_width = max(tile.width for tile in tiles)
    rows = (len(tiles) + cols - 1) // cols
    row_heights = []
    for row in range(rows):
        row_tiles = tiles[row * cols : (row + 1) * cols]
        row_heights.append(max(tile.height for tile in row_tiles))

    title_h = 56
    canvas = Image.new(
        "RGB",
        (col_width * cols, title_h + sum(row_heights)),
        (8, 8, 8),
    )
    ImageDraw.Draw(canvas).text((16, 18), args.title, fill=(255, 255, 255))

    y = title_h
    for row in range(rows):
        row_tiles = tiles[row * cols : (row + 1) * cols]
        for col, tile in enumerate(row_tiles):
            canvas.paste(tile, (col * col_width, y))
        y += row_heights[row]

    out.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out, quality=88)
    print(json.dumps({"status": "PASS", "out": str(out), "actions": len(tiles)}))


if __name__ == "__main__":
    main()
