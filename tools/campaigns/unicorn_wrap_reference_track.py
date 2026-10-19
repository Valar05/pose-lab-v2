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
FOLLOWUP_SHA = "b94fa6ff1f37dc2fec2b52a73f013fbdf4192a51c258f28ae49847c7fdef9b15"
FOLLOWUP_SEEDS = {
    18: {"hind_green": (936, 925), "fore_purple": (1225, 934)},
    40: {"hind_green": (938, 923), "fore_purple": (1225, 934)},
    70: {"hind_green": (694, 941), "fore_purple": (992, 939)},
    100: {"hind_green": (983, 932), "fore_purple": (1283, 937)}
}
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
    digest = hashlib.sha256(video.read_bytes()).hexdigest()
    if digest == FOLLOWUP_SHA:
        return followup(video, output / "followup_934762")
    if digest != EXPECTED_SHA:
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


def followup(video, output):
    """Hash-locked 934762 clip: measure reviewed wraps only; NOT canter keys.

    This uses manually reviewed seed neighborhoods instead of unconstrained
    color blobs, because YouTube's red progress bar corrupts red wrap masks.
    Failure to find exactly one matching component causes a hard stop.
    """
    capture = cv2.VideoCapture(str(video))
    if (int(capture.get(cv2.CAP_PROP_FRAME_WIDTH)),
            int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))) != (2404, 1080):
        raise SystemExit("Follow-up reference capture must be 2404x1080")
    output.mkdir(parents=True, exist_ok=True)
    result, rendered = [], []
    for index in range(101):
        ok, frame = capture.read()
        if not ok:
            raise SystemExit("Video ended before reviewed frame 100")
        if index not in FOLLOWUP_SEEDS:
            continue
        t = round(float(capture.get(cv2.CAP_PROP_POS_MSEC) / 1000), 3)
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        found = {}
        for name, (sx, sy) in FOLLOWUP_SEEDS[index].items():
            x0, y0 = sx - 45, sy - 38
            crop = hsv[y0:y0+76, x0:x0+90]
            if name == "hind_green":
                mask = cv2.inRange(crop, (29,65,50), (99,255,255))
            else:
                mask = cv2.inRange(crop, (103,60,50), (165,255,255))
            n, labels, stats, centers = cv2.connectedComponentsWithStats(mask, 8)
            choices = []
            for k in range(1, n):
                area = int(stats[k, cv2.CC_STAT_AREA])
                x, y = float(centers[k,0]+x0), float(centers[k,1]+y0)
                delta = math.hypot(x-sx, y-sy)
                if area >= 70 and delta < 24:
                    choices.append((x,y,area))
            if len(choices) != 1:
                raise SystemExit(f"Ambiguous {name} frame {index}: {choices}")
            x, y, area = choices[0]
            found[name] = (x,y)
            result.append({"frame": index, "capture_time_sec": t, "marker": name,
                           "x_px": round(x,2), "y_px": round(y,2),
                           "color_mask_area_px": area})
            color = (25,240,40) if name == "hind_green" else (220,80,235)
            cv2.circle(frame, (round(x),round(y)), 9, color, 3)
            cv2.putText(frame, "G" if name=="hind_green" else "P",
                        (round(x)-10,round(y)-27), cv2.FONT_HERSHEY_SIMPLEX,
                        0.8, color, 2)
        dx = round(found["fore_purple"][0]-found["hind_green"][0],2)
        dy = round(found["fore_purple"][1]-found["hind_green"][1],2)
        result.append({"frame":index, "capture_time_sec":t,
                       "marker":"screen_delta_purple_minus_green",
                       "x_px":dx, "y_px":dy, "color_mask_area_px":None})
        # Crops are diagnostics; source frame coordinates above remain invariant.
        gx = round(found["hind_green"][0])
        left = max(250,gx-170)
        cut = Image.fromarray(cv2.cvtColor(frame[780:970,left:left+650],
                                           cv2.COLOR_BGR2RGB))
        cut = cut.resize((975,285))
        rendered.append(cut)
    fields = ["frame","capture_time_sec","marker","x_px","y_px","color_mask_area_px"]
    with (output/"verified_green_purple_centroids.csv").open("w",newline="") as fp:
        writer = csv.DictWriter(fp,fieldnames=fields)
        writer.writeheader()
        writer.writerows(result)
    contact = Image.new("RGB", (1950,570), (16,16,16))
    for i, cut in enumerate(rendered):
        contact.paste(cut,((i%2)*975,(i//2)*285))
    contact.save(output/"reviewed_band_centers.png")
    metadata = {
        "schema":"unicorn-color-wrap-followup-intake-v1",
        "videoSha256":FOLLOWUP_SHA, "videoPixels":[2404,1080],
        "acceptedSampleFrames":sorted(FOLLOWUP_SEEDS),
        "observations":len(result), "phaseAuthority":"none",
        "decision":"rising-trot-to-ask-for-canter; no verified three-beat canter",
        "notes":["Color centroids are not hoof or anatomical joint angles",
                 "Red wraps rejected because YouTube progress bar overlaps",
                 "Foot contacts obscured; capture time not gait time",
                 "Frame 18 and 40 repeat substantially the same pose",
                 "These are local authoring diagnostics, not hosted Pose Lab review"]
    }
    (output/"followup_receipt.json").write_text(json.dumps(metadata,indent=2)+"\\n")
    print(json.dumps(metadata,indent=2))

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", type=Path, required=True)
    parser.add_argument("--out", type=Path,
                        default=ROOT/"generated/unicorn/reference")
    args = parser.parse_args()
    run(args.video, args.out)
