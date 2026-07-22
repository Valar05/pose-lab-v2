#!/usr/bin/env python3
"""Build a legible, self-contained visual review sheet from Blender evidence."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw


TILE_SIZE = (480, 300)
CAPTION_HEIGHT = 34
COLUMNS = 3


def make_tile(image_path: Path, caption: str, status: str) -> Image.Image:
    image = Image.open(image_path).convert("RGB")
    image.thumbnail(TILE_SIZE)
    canvas = Image.new("RGB", (TILE_SIZE[0], TILE_SIZE[1] + CAPTION_HEIGHT), (14, 16, 18))
    canvas.paste(image, ((TILE_SIZE[0] - image.width) // 2, CAPTION_HEIGHT))
    draw = ImageDraw.Draw(canvas)
    color = (255, 180, 150) if status == "FAIL" else (190, 255, 190)
    draw.text((10, 10), f"{caption} — {status}", fill=color)
    return canvas


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True)
    args = parser.parse_args()
    manifest_path = Path(args.manifest)
    if not manifest_path.exists():
        raise SystemExit(f"missing manifest: {manifest_path}")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    root = manifest_path.parent
    frames = manifest.get("frames") or []
    if not frames:
        raise SystemExit("manifest has no frames")

    tiles = []
    included = []
    for frame in frames:
        status = "FAIL" if frame.get("failures") else "PASS"
        evidence = [("source + candidate", frame.get("image"))]
        evidence.extend(
            (view.get("view", "view"), view.get("image"))
            for view in frame.get("crimsonViews") or []
        )
        for view_name, filename in evidence:
            if not filename:
                continue
            image_path = root / filename
            if not image_path.exists():
                raise SystemExit(f"manifest references missing image: {image_path}")
            caption = f"{frame['label']} / {view_name}"
            tiles.append(make_tile(image_path, caption, status))
            included.append(filename)

    if not tiles:
        raise SystemExit("manifest produced no reviewable images")
    rows = (len(tiles) + COLUMNS - 1) // COLUMNS
    sheet = Image.new(
        "RGB",
        (TILE_SIZE[0] * COLUMNS, (TILE_SIZE[1] + CAPTION_HEIGHT) * rows),
        (8, 9, 10),
    )
    for index, tile in enumerate(tiles):
        sheet.paste(tile, ((index % COLUMNS) * TILE_SIZE[0], (index // COLUMNS) * (TILE_SIZE[1] + CAPTION_HEIGHT)))
    out = root / "contact_sheet.png"
    sheet.save(out)
    manifest["contactSheet"] = out.name
    manifest["contactSheetImages"] = included
    manifest["contactSheetContract"] = "source comparison plus every authored orthogonal view; no blank padding lane"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps({"ok": True, "contactSheet": str(out), "images": len(included)}, indent=2))


if __name__ == "__main__":
    main()
