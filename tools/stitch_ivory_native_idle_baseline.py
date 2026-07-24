#!/usr/bin/env python3
"""Assemble the untouched Ivory native-idle views beside Vanguard frame zero."""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True)
    parser.add_argument("--vanguard", required=True)
    args = parser.parse_args()

    root = Path(args.root)
    vanguard_path = Path(args.vanguard)
    inventory = json.loads((root / "inventory.json").read_text(encoding="utf-8"))
    cells: list[tuple[str, Image.Image]] = []
    for record in inventory["render"]["renders"]:
        label = f'Ivory F{record["frame"]:g} {record["view"]}'
        cells.append((label, Image.open(root / record["file"]).convert("RGBA")))
    cells.append(
        ("Accepted Vanguard Idle F0", Image.open(vanguard_path).convert("RGBA"))
    )

    cell_width = max(image.width for _, image in cells)
    cell_height = max(image.height for _, image in cells)
    label_height = 34
    columns = 3
    rows = math.ceil(len(cells) / columns)
    sheet = Image.new(
        "RGBA",
        (cell_width * columns, (cell_height + label_height) * rows),
        (29, 32, 38, 255),
    )
    draw = ImageDraw.Draw(sheet)
    for index, (label, image) in enumerate(cells):
        column = index % columns
        row = index // columns
        x = column * cell_width
        y = row * (cell_height + label_height)
        checker = Image.new("RGBA", (cell_width, cell_height), (72, 76, 84, 255))
        tile = 32
        tile_draw = ImageDraw.Draw(checker)
        for ty in range(0, cell_height, tile):
            for tx in range(0, cell_width, tile):
                if (tx // tile + ty // tile) % 2:
                    tile_draw.rectangle(
                        (tx, ty, tx + tile - 1, ty + tile - 1),
                        fill=(57, 61, 68, 255),
                    )
        sheet.alpha_composite(checker, (x, y))
        sheet.alpha_composite(image, (x, y))
        draw.rectangle(
            (x, y + cell_height, x + cell_width, y + cell_height + label_height),
            fill=(18, 20, 24, 255),
        )
        draw.text((x + 10, y + cell_height + 9), label, fill=(238, 241, 245, 255))

    output = root / "baseline-contact-sheet.png"
    sheet.convert("RGB").save(output, quality=95)


if __name__ == "__main__":
    main()
