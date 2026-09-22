from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT.parent / ".deps"))

import cv2
import numpy as np
from PIL import Image

source = cv2.imread(str(ROOT / "source-masters" / "vanguard-squad-lineup.png"), cv2.IMREAD_COLOR)
left, top, width, height = 535, 0, 500, 864
crop = source[top:top + height, left:left + width].copy()
mask = np.full((height, width), cv2.GC_BGD, dtype=np.uint8)

outline = np.array([
    [185, 0], [285, 0], [330, 55], [370, 80], [398, 125], [410, 190],
    [415, 285], [410, 390], [430, 470], [460, 610], [490, 760], [410, 735],
    [395, 850], [255, 863], [55, 863], [40, 810], [50, 690], [75, 565],
    [60, 430], [50, 300], [55, 190], [75, 105], [125, 65]
], dtype=np.int32)
cv2.fillPoly(mask, [outline], cv2.GC_PR_FGD)

# Certain Vanguard material: hair/head, armored torso, both limbs, cannon, blades, and boots.
sure_foreground = [
    np.array([[190, 28], [270, 25], [292, 82], [265, 130], [190, 120], [165, 70]], np.int32),
    np.array([[135, 135], [315, 135], [330, 275], [285, 325], [145, 300], [110, 210]], np.int32),
    np.array([[75, 185], [135, 180], [165, 300], [135, 340], [82, 300]], np.int32),
    np.array([[125, 300], [230, 315], [250, 390], [170, 415], [110, 365]], np.int32),
    np.array([[320, 190], [370, 205], [385, 390], [345, 430], [315, 320]], np.int32),
    np.array([[230, 385], [340, 390], [390, 575], [325, 625], [250, 535]], np.int32),
    np.array([[95, 430], [175, 430], [185, 670], [130, 790], [70, 760], [75, 560]], np.int32),
    np.array([[285, 610], [365, 590], [400, 805], [335, 835], [270, 760]], np.int32),
    np.array([[330, 560], [400, 545], [445, 725], [390, 740]], np.int32)
]
for region in sure_foreground:
    cv2.fillPoly(mask, [region], cv2.GC_FGD)

# Neighbor-only zones that touch the coarse outline.
cv2.rectangle(mask, (0, 120), (38, 720), cv2.GC_BGD, -1)
cv2.rectangle(mask, (430, 145), (499, 585), cv2.GC_BGD, -1)
cv2.rectangle(mask, (0, 0), (125, 78), cv2.GC_BGD, -1)
cv2.rectangle(mask, (335, 0), (499, 95), cv2.GC_BGD, -1)

background_model = np.zeros((1, 65), np.float64)
foreground_model = np.zeros((1, 65), np.float64)
cv2.grabCut(crop, mask, None, background_model, foreground_model, 10, cv2.GC_INIT_WITH_MASK)
binary = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)

# Keep only components that intersect known Vanguard core seeds.
count, labels, stats, _ = cv2.connectedComponentsWithStats(binary, 8)
keep = set()
for x, y in [(230, 220), (170, 500), (315, 520), (150, 770), (340, 790)]:
    label = int(labels[y, x])
    if label:
        keep.add(label)
binary = np.where(np.isin(labels, list(keep)), 255, 0).astype(np.uint8)
binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8), iterations=1)

rgba = cv2.cvtColor(crop, cv2.COLOR_BGR2RGBA)
rgba[:, :, 3] = binary
ys, xs = np.where(binary > 0)
if not len(xs):
    raise RuntimeError("Vanguard segmentation produced no foreground")
pad = 12
x0, x1 = max(0, xs.min() - pad), min(width, xs.max() + pad + 1)
y0, y1 = max(0, ys.min() - pad), min(height, ys.max() + pad + 1)
output = ROOT / "factory-candidates" / "vanguard-center-source-cut-v4.png"
output.parent.mkdir(parents=True, exist_ok=True)
Image.fromarray(rgba[y0:y1, x0:x1]).save(output)
print(output)
