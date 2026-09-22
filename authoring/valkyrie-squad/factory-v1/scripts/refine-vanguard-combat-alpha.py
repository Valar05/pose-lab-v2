#!/usr/bin/env python3
"""Recover complete Vanguard silhouettes from the brown contact-sheet matte.

The first GrabCut pass kept broad brown wedges and deleted dark weapon regions.
This pass models each cell's smooth background from pixels already known to be
exterior, then uses residual color—not luminance—to seed a fresh segmentation.
"""

import argparse
from pathlib import Path

import cv2
import numpy as np
from PIL import Image


def features(height, width):
    yy, xx = np.mgrid[0:height, 0:width].astype(np.float64)
    x = xx / max(1, width - 1) * 2 - 1
    y = yy / max(1, height - 1) * 2 - 1
    return np.stack((
        np.ones_like(x), x, y, x * y, x * x, y * y,
        x * x * x, y * y * y, x * x * y, x * y * y,
    ), axis=-1)


def background_prediction(rgb, known_background):
    height, width = rgb.shape[:2]
    basis = features(height, width)
    sample = known_background.copy()
    sample[1::3, :] = False
    sample[2::3, :] = False
    sample[:, 1::3] = False
    sample[:, 2::3] = False
    design = basis[sample]
    values = rgb[sample].astype(np.float64)
    if len(values) < 500:
        raise RuntimeError("insufficient exterior background samples")
    coefficients, *_ = np.linalg.lstsq(design, values, rcond=None)
    prediction = basis.reshape(-1, basis.shape[-1]) @ coefficients
    return np.clip(prediction.reshape(height, width, 3), 0, 255).astype(np.uint8)


def largest_component(binary):
    count, labels, stats, _ = cv2.connectedComponentsWithStats(binary, 8)
    if count <= 1:
        raise RuntimeError("refined cell produced no foreground")
    largest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    return np.where(labels == largest, 255, 0).astype(np.uint8)


def fill_small_interior_holes(binary, maximum_area=120):
    inverse = np.where(binary == 0, 255, 0).astype(np.uint8)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(inverse, 8)
    height, width = binary.shape
    result = binary.copy()
    for label in range(1, count):
        left, top, component_width, component_height, area = stats[label]
        touches_border = left == 0 or top == 0 or left + component_width == width or top + component_height == height
        if not touches_border and area <= maximum_area:
            result[labels == label] = 255
    return result


def refine_cell(rgb, old_alpha):
    height, width = old_alpha.shape
    known_background = old_alpha == 0
    border = max(5, round(min(width, height) * .025))
    known_background[:border, :] = True
    known_background[-border:, :] = True
    known_background[:, :border] = True
    known_background[:, -border:] = True
    predicted = background_prediction(rgb, known_background)
    actual_lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB).astype(np.float32)
    predicted_lab = cv2.cvtColor(predicted, cv2.COLOR_RGB2LAB).astype(np.float32)
    residual = np.linalg.norm(actual_lab - predicted_lab, axis=2)

    mask = np.full((height, width), cv2.GC_PR_BGD, dtype=np.uint8)
    mask[residual < 9] = cv2.GC_BGD
    mask[residual >= 16] = cv2.GC_PR_FGD
    mask[residual >= 30] = cv2.GC_FGD
    mask[:border, :] = cv2.GC_BGD
    mask[-border:, :] = cv2.GC_BGD
    mask[:, :border] = cv2.GC_BGD
    mask[:, -border:] = cv2.GC_BGD

    background_model = np.zeros((1, 65), np.float64)
    foreground_model = np.zeros((1, 65), np.float64)
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    cv2.grabCut(bgr, mask, None, background_model, foreground_model, 8, cv2.GC_INIT_WITH_MASK)
    binary = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    binary[(residual < 12) & (old_alpha == 0)] = 0
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8), iterations=1)
    binary = largest_component(binary)
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY).astype(np.float32)
    gradient = cv2.magnitude(cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3), cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3))
    yy = np.arange(height)[:, None]
    binary[(yy > height * .91) & (gradient < 24) & (residual < 38)] = 0
    binary = largest_component(binary)
    binary = fill_small_interior_holes(binary)
    return binary, residual


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("prior_alpha", type=Path)
    parser.add_argument("output_alpha", type=Path)
    parser.add_argument("output_atlas", type=Path)
    parser.add_argument("--columns", type=int, default=4)
    parser.add_argument("--rows", type=int, default=3)
    parser.add_argument("--cell", type=int, default=96)
    args = parser.parse_args()

    source = np.asarray(Image.open(args.source).convert("RGB"))
    prior = np.asarray(Image.open(args.prior_alpha).convert("RGBA"))
    height, width = source.shape[:2]
    x_edges = np.linspace(0, width, args.columns + 1, dtype=int)
    y_edges = np.linspace(0, height, args.rows + 1, dtype=int)
    output = np.zeros((height, width, 4), dtype=np.uint8)
    atlas = Image.new("RGBA", (args.columns * args.cell, args.rows * args.cell), (0, 0, 0, 0))
    report = []

    for row in range(args.rows):
        for column in range(args.columns):
            left, right = x_edges[column], x_edges[column + 1]
            top, bottom = y_edges[row], y_edges[row + 1]
            rgb = source[top:bottom, left:right]
            old_alpha = prior[top:bottom, left:right, 3]
            alpha, residual = refine_cell(rgb, old_alpha)
            rgba = np.dstack((rgb, alpha))
            output[top:bottom, left:right] = rgba
            pose = Image.fromarray(rgba, "RGBA")
            pose.thumbnail((args.cell, args.cell), Image.Resampling.LANCZOS)
            atlas.alpha_composite(pose, (column * args.cell + (args.cell - pose.width) // 2, row * args.cell + args.cell - pose.height))
            report.append({
                "cell": row * args.columns + column,
                "oldCoverage": round(float((old_alpha > 0).mean()), 4),
                "newCoverage": round(float((alpha > 0).mean()), 4),
                "residualP95": round(float(np.percentile(residual, 95)), 2),
            })

    Image.fromarray(output, "RGBA").save(args.output_alpha)
    atlas.save(args.output_atlas)
    print(report)


if __name__ == "__main__":
    main()
