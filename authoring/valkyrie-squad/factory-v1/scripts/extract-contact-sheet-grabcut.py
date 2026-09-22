#!/usr/bin/env python3
import argparse
import cv2
import numpy as np
from PIL import Image


def cut_cell(bgr):
    height, width = bgr.shape[:2]
    mask = np.full((height, width), cv2.GC_PR_BGD, dtype=np.uint8)
    border = max(3, round(min(width, height) * 0.018))
    mask[:border, :] = cv2.GC_BGD
    mask[-border:, :] = cv2.GC_BGD
    mask[:, :border] = cv2.GC_BGD
    mask[:, -border:] = cv2.GC_BGD
    # The accepted contact-sheet contract puts exactly one complete figure near each cell center.
    cv2.ellipse(mask, (width // 2, height // 2), (round(width * .38), round(height * .43)), 0, 0, 360, cv2.GC_PR_FGD, -1)
    background_model = np.zeros((1, 65), np.float64)
    foreground_model = np.zeros((1, 65), np.float64)
    cv2.grabCut(bgr, mask, None, background_model, foreground_model, 10, cv2.GC_INIT_WITH_MASK)
    binary = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(binary, 8)
    if count <= 1:
        raise RuntimeError("contact-sheet cell produced no foreground")
    largest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    binary = np.where(labels == largest, 255, 0).astype(np.uint8)
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8), iterations=1)
    return binary


def main():
    parser = argparse.ArgumentParser(description="Deterministically segment a regular accepted contact sheet with GrabCut.")
    parser.add_argument("input")
    parser.add_argument("alpha_sheet")
    parser.add_argument("arcade_atlas")
    parser.add_argument("--columns", type=int, default=4)
    parser.add_argument("--rows", type=int, default=3)
    parser.add_argument("--cell", type=int, default=96)
    args = parser.parse_args()

    source = cv2.imread(args.input, cv2.IMREAD_COLOR)
    if source is None:
        raise RuntimeError(f"cannot read {args.input}")
    height, width = source.shape[:2]
    x_edges = np.linspace(0, width, args.columns + 1, dtype=int)
    y_edges = np.linspace(0, height, args.rows + 1, dtype=int)
    alpha_sheet = np.zeros((height, width, 4), dtype=np.uint8)
    atlas = Image.new("RGBA", (args.columns * args.cell, args.rows * args.cell), (0, 0, 0, 0))
    coverage = []

    for row in range(args.rows):
        for column in range(args.columns):
            left, right = x_edges[column], x_edges[column + 1]
            top, bottom = y_edges[row], y_edges[row + 1]
            cell = source[top:bottom, left:right]
            alpha = cut_cell(cell)
            rgba = cv2.cvtColor(cell, cv2.COLOR_BGR2RGBA)
            rgba[:, :, 3] = alpha
            alpha_sheet[top:bottom, left:right] = rgba
            pose = Image.fromarray(rgba, "RGBA")
            pose.thumbnail((args.cell, args.cell), Image.Resampling.LANCZOS)
            x = column * args.cell + (args.cell - pose.width) // 2
            y = row * args.cell + args.cell - pose.height
            atlas.alpha_composite(pose, (x, y))
            coverage.append(float((alpha > 0).mean()))

    Image.fromarray(alpha_sheet, "RGBA").save(args.alpha_sheet)
    atlas.save(args.arcade_atlas)
    print({"sheet": [width, height], "atlas": list(atlas.size), "coverage": coverage})


if __name__ == "__main__":
    main()
