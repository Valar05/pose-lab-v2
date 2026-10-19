#!/usr/bin/env python3
"""Reference-wrap measurement only. NOT a canter synthesizer or acceptance check.

Run from the Pose Lab V2 repository root:
python tools/campaigns/unicorn_wrap_reference_track.py --video path/to/934757.mp4

Requires numpy, opencv-python and Pillow. Writes diagnostics under ignored
generated/unicorn/reference/ by default; does not change authored assets.
"""
import argparse
import csv
import hashlib
import json
import math
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
CONTRACT = "campaigns/unicorn-mounted-canter-v1.contract.json"
EXPECTED_SHA = "b5430cdd1090e90bec22d6964817b6ae852cbb1421776433847b129c814afcba"
REGIONS = {"hind_green": (28, 95), "fore_purple": (105, 163)}
PALETTE = {"hind_green": (80, 230, 165), "hind_red": (255, 100, 100),
           "fore_purple": (167, 118, 250), "fore_red": (252, 202, 80)}

def guard():
    command = [sys.executable, str(ROOT / "tools/campaigns/campaign_core.py"),
               "preflight", "--contract", CONTRACT]
    subprocess.run(command, cwd=ROOT, check=True)

def candidates(frame):
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    masks = {
        "green": cv2.inRange(hsv, (30, 55, 55), (97, 255, 255)),
        "purple": cv2.inRange(hsv, (105, 58, 50), (163, 255, 255)),
        "red": cv2.bitwise_or(cv2.inRange(hsv, (0, 93, 75), (14, 255, 255)),
                              cv2.inRange(hsv, (166, 93, 75), (179, 255, 255))),
    }
    groups = {}
    for key, mask in masks.items():
        # This ROI is ONLY calibrated to the exact supplied 2404x1080 capture.
        mask[:875] = 0
        mask[985:] = 0
        mask[:, :985] = 0
        mask[:, 1550:] = 0
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
        n, labels, stats, centers = cv2.connectedComponentsWithStats(mask, 8)
        items = []
        for k in range(1, n):
            x, y, w, h, area = map(int, stats[k])
            if area < 36 or w > 41 or h > 63 or h < 8 or w < 3:
                continue
            pts = np.column_stack(np.nonzero(labels[y:y+h, x:x+w] == k))
            if len(pts) < 20:
                continue
            xx_yy = pts[:, ::-1].astype(float)
            eig, vec = np.linalg.eigh(np.cov(xx_yy, rowvar=False))
            axis = vec[:, np.argmax(eig)]
            if axis[1] < 0:
                axis = -axis
            aspect = float(eig.max() / (eig.min() + 1e-6))
            angle = math.degrees(math.atan2(axis[0], axis[1]))
            # Axis of colored wrap, not angle of the whole leg or a joint.
            if aspect < 1.25 or abs(angle) > 65:
                angle = None
            items.append({"x_px": round(float(centers[k, 0]), 2),
                          "y_px": round(float(centers[k, 1]), 2),
                          "band_axis_deg": None if angle is None else round(angle, 1),
                          "area_px": area, "axis_aspect": round(aspect, 2)})
        groups[key] = sorted(items, key=lambda v: v["area_px"], reverse=True)[:7]
    purple = groups["purple"][0] if groups["purple"] else None
    green = groups["green"][0] if groups["green"] else None
    result = {}
    if purple:
        result["fore_purple"] = purple
    if green:
        result["hind_green"] = green
    red = groups["red"]
    if purple:
        red = [r for r in red if purple["x_px"]-330 < r["x_px"] <
               purple["x_px"]+145 and abs(r["y_px"]-purple["y_px"]) < 95]
    if red:
        split = ((green["x_px"]+purple["x_px"])/2 if green and purple else
                 purple["x_px"]-110 if purple else 1265)
        hind = [r for r in red if r["x_px"] < split]
        fore = [r for r in red if r["x_px"] >= split]
        if hind:
            result["hind_red"] = max(hind, key=lambda e: e["area_px"])
        if fore:
            result["fore_red"] = max(fore, key=lambda e: e["area_px"])
    return result

def run(video, output):
    guard()
    if hashlib.sha256(video.read_bytes()).hexdigest() != EXPECTED_SHA:
        raise SystemExit("Reference-video SHA-256 mismatch. Refusing to guess input.")
    capture = cv2.VideoCapture(str(video))
    fps, total = capture.get(cv2.CAP_PROP_FPS), int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
    size = (int(capture.get(3)), int(capture.get(4)))
    if size != (2404, 1080):
        raise SystemExit("Unexpected image size. ROI is not transferable.")
    output.mkdir(parents=True, exist_ok=True)
    data, previews, old, delta = [], [], None, []
    # Lower limbs are obscured by phone controls in later frames.
    for index in range(min(145, total)):
        ok, image = capture.read()
        if not ok:
            raise SystemExit(f"Unreadable capture frame {index}.")
        roi = cv2.resize(cv2.cvtColor(image[725:985, 985:1550],
                                    cv2.COLOR_BGR2GRAY), (141, 65))
        diff = None if old is None else float(np.mean(
            np.abs(roi.astype(float) - old.astype(float))))
        old = roi
        if diff is not None:
            delta.append(diff)
        markers = candidates(image)
        for name, m in markers.items():
            data.append({"capture_frame": index,
                         "capture_sec": round(index/fps, 4),
                         "color_leg": name, **m,
                         "static_capture": None if diff is None else diff < 0.3})
        if index in (0, 40, 60, 100, 120, 140):
            cut = image[770:1004, 980:1640].copy()
            for name, m in markers.items():
                px, py = int(m["x_px"])-980, int(m["y_px"])-770
                color = tuple(reversed(PALETTE[name]))
                cv2.circle(cut, (px, py), 6, color, 2)
                cv2.putText(cut, name, (max(0, px-28), max(18, py-24)),
                            cv2.FONT_HERSHEY_SIMPLEX, .42, color, 1)
            previews.append(Image.fromarray(cv2.cvtColor(cut, cv2.COLOR_BGR2RGB)))
    header = ["capture_frame", "capture_sec", "color_leg", "x_px", "y_px",
              "band_axis_deg", "area_px", "axis_aspect", "static_capture"]
    with (output/"marker_tracks.csv").open("w", newline="") as fp:
        writer = csv.DictWriter(fp, fieldnames=header)
        writer.writeheader()
        writer.writerows(data)
    canvas = Image.new("RGB", (1320, ((len(previews)+1)//2)*234), (15,15,15))
    for i, im in enumerate(previews):
        canvas.paste(im, ((i%2)*660, (i//2)*234))
    canvas.save(output/"annotated_markers.png")
    summary = {"schema": "unicorn-equine-reference-band-tracking-v1",
               "videoSha256": EXPECTED_SHA, "videoPixels": list(size),
               "captureFps": fps, "capturedFrames": total,
               "inspectedCaptureFrameRange": [0, min(145, total)-1],
               "observations": len(data),
               "staticFraction": round(float(np.mean(np.array(delta)<.3)),3),
               "motionClassification": "walk-not-canter",
               "humanVerdict": "pending",
               "limitations": [
                   "Phone capture includes pauses and scrubbing; capture FPS is not gait FPS",
                   "Markers measure wraps, not actual hooves, stifles, carpi or hocks",
                   "Red markers are assigned by screen position; occlusion can defeat them",
                   "A three-beat canter and suspension have NOT been measured here"]}
    (output/"analysis.json").write_text(json.dumps(summary, indent=2)+"\n")
    print(json.dumps(summary, indent=2))

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", type=Path, required=True)
    parser.add_argument("--out", type=Path,
                        default=ROOT/"generated/unicorn/reference")
    args = parser.parse_args()
    run(args.video, args.out)
