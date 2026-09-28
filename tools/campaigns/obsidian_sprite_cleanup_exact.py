#!/usr/bin/env python3
"""Reproduce the exact human-accepted Obsidian low-res sprite cleanup.

This tool is intentionally NOT a generic sprite extractor. It records the exact
local repairs that turned 929116.png into the artifact Drew accepted as
"Perfect!". Any different input fails closed.
"""

from __future__ import annotations

import argparse
import hashlib
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

EXPECTED_INPUT_SHA256 = "da348a4e1179aa8fd5e25050f85fadb7088d8ec7610db40caf501ca565c83395"
EXPECTED_OUTPUT_SHA256 = "245adbc39d5dfe358276e9f6c10861678e6ceac15cb30389893da6fdaaa25a39"

PIXEL_THRESHOLD = 25
JUNK_BOXES = {
    (959, 934, 979, 972),
    (959, 972, 979, 996),
}
BOTTOM_LEFT_BBOX = (28, 1366, 323, 1510)
TARGET_HEIGHT = 117
PLACEMENT = (55, 1349)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--output", required=True)
    args = ap.parse_args()

    src = Path(args.input)
    out = Path(args.output)

    actual_input = sha256(src)
    if actual_input != EXPECTED_INPUT_SHA256:
        raise SystemExit(
            f"STOP: input SHA mismatch: {actual_input} != {EXPECTED_INPUT_SHA256}"
        )

    im = Image.open(src).convert("RGB")
    arr = np.asarray(im).copy()

    mask = arr.max(axis=2) > PIXEL_THRESHOLD
    labels, _ = ndi.label(mask)
    objects = ndi.find_objects(labels)

    removed = []
    for idx, sl in enumerate(objects, start=1):
        if sl is None:
            continue
        area = int((labels[sl] == idx).sum())
        y0, y1 = sl[0].start, sl[0].stop
        x0, x1 = sl[1].start, sl[1].stop
        bbox = (x0, y0, x1, y1)
        if bbox in JUNK_BOXES:
            local = labels[sl] == idx
            sub = arr[sl]
            sub[local] = 0
            arr[sl] = sub
            removed.append((bbox, area))

    expected_removed = {
        ((959, 934, 979, 972), 452),
        ((959, 972, 979, 996), 300),
    }
    if set(removed) != expected_removed:
        raise SystemExit(f"STOP: cleanup mask mismatch: {removed!r}")

    cleaned = Image.fromarray(arr)

    x0, y0, x1, y1 = BOTTOM_LEFT_BBOX
    sprite = cleaned.crop(BOTTOM_LEFT_BBOX)
    scale = TARGET_HEIGHT / sprite.height
    target_width = round(sprite.width * scale)
    sprite_small = sprite.resize(
        (target_width, TARGET_HEIGHT),
        Image.Resampling.BOX,
    )

    arr2 = np.asarray(cleaned).copy()
    original_region = arr2[y0:y1, x0:x1]
    original_mask = np.asarray(sprite).max(axis=2) > PIXEL_THRESHOLD
    original_region[original_mask] = 0
    arr2[y0:y1, x0:x1] = original_region

    px, py = PLACEMENT
    small_arr = np.asarray(sprite_small)
    small_mask = small_arr.max(axis=2) > 20
    target_region = arr2[py:py + TARGET_HEIGHT, px:px + target_width]
    target_region[small_mask] = small_arr[small_mask]
    arr2[py:py + TARGET_HEIGHT, px:px + target_width] = target_region

    out.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(arr2).save(out)

    actual_output = sha256(out)
    if actual_output != EXPECTED_OUTPUT_SHA256:
        raise SystemExit(
            f"STOP: output SHA mismatch: {actual_output} != {EXPECTED_OUTPUT_SHA256}"
        )

    print("PASS: accepted Obsidian cleanup reproduced")
    print(f"output={out}")
    print(f"sha256={actual_output}")


if __name__ == "__main__":
    main()
