#!/usr/bin/env python3
"""Register Vanguard combat cells to two independent no-step foot contacts."""

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import map_coordinates


def contact(alpha, x0, x1, threshold=128):
    mask = alpha[:, x0:x1] >= threshold
    ys, _ = np.where(mask)
    if not len(ys):
        raise ValueError(f"no foreground in contact window {x0}:{x1}")
    bottom = int(ys.max())
    columns = np.where(mask[max(0, bottom - 5):bottom + 1].any(axis=0))[0] + x0
    return float((columns.min() + columns.max()) / 2), float(bottom)


def contacts(image):
    alpha = np.asarray(image.getchannel("A"))
    return {"image-left": contact(alpha, 0, 32), "image-right": contact(alpha, 48, 96)}


def remap(image, global_dx, global_dy, right_dx, right_dy):
    rgba = np.asarray(image.convert("RGBA"), dtype=np.float32) / 255
    height, width = rgba.shape[:2]
    yy, xx = np.mgrid[0:height, 0:width].astype(np.float32)
    right_x_weight = np.clip((xx - 40) / 16, 0, 1)
    lower_y_weight = np.clip((yy - 54) / 22, 0, 1)
    local_weight = right_x_weight * lower_y_weight
    source_x = xx - global_dx - right_dx * local_weight
    source_y = yy - global_dy - right_dy * local_weight
    coords = np.vstack((source_y.ravel(), source_x.ravel()))
    alpha = rgba[..., 3]
    premultiplied = rgba[..., :3] * alpha[..., None]
    out_alpha = map_coordinates(alpha, coords, order=1, mode="constant", cval=0).reshape(height, width)
    out_rgb = np.empty((height, width, 3), dtype=np.float32)
    for channel in range(3):
        out_rgb[..., channel] = map_coordinates(premultiplied[..., channel], coords, order=1, mode="constant", cval=0).reshape(height, width)
    safe_alpha = np.maximum(out_alpha, 1e-6)
    out_rgb = np.where(out_alpha[..., None] > 0, out_rgb / safe_alpha[..., None], 0)
    return Image.fromarray(np.rint(np.dstack((np.clip(out_rgb, 0, 1), np.clip(out_alpha, 0, 1))) * 255).astype(np.uint8), "RGBA")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-dir", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--reference", default="pose-02.png")
    parser.add_argument("--report", required=True, type=Path)
    args = parser.parse_args()
    paths = sorted(args.input_dir.glob("*.png"))
    with Image.open(args.input_dir / args.reference) as source:
        target = contacts(source.convert("RGBA"))
    args.output_dir.mkdir(parents=True, exist_ok=True)
    rows = []
    for path in paths:
        with Image.open(path) as source:
            image = source.convert("RGBA")
        before = contacts(image)
        output = image
        iterations = []
        for _ in range(3):
            current = contacts(output)
            global_dx = target["image-left"][0] - current["image-left"][0]
            global_dy = target["image-left"][1] - current["image-left"][1]
            right_dx = target["image-right"][0] - (current["image-right"][0] + global_dx)
            right_dy = target["image-right"][1] - (current["image-right"][1] + global_dy)
            iterations.append({"global": [global_dx, global_dy], "rightLowerLeg": [right_dx, right_dy]})
            if max(abs(global_dx), abs(global_dy), abs(right_dx), abs(right_dy)) <= 0.5:
                break
            output = remap(output, global_dx, global_dy, right_dx, right_dy)
        output.save(args.output_dir / path.name)
        after = contacts(output)
        rows.append({"frame": path.name, "before": before, "iterations": iterations, "after": after})
    report = {"schema": "vanguard-combat-ground-lock/v1", "policy": "no-step", "target": target, "tolerancePx": 1, "frames": rows, "warning": "Mechanical registration is not anatomical or visual acceptance."}
    args.report.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({"frames": len(rows), "target": target, "report": str(args.report)}))


if __name__ == "__main__":
    main()
