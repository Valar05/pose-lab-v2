#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / 'config/embodied-kinesis-canary.json').read_text())
STAGE = CONFIG['stage']
CANDIDATE = CONFIG['candidate']
OUT = ROOT / 'generated' / 'embodied-kinesis' / STAGE / CANDIDATE
REF = json.loads((ROOT / 'generated/fps-reference/fist/fist-fpv-reference.json').read_text())
CAPTURE = json.loads((OUT / 'runtime-capture.json').read_text())

phases = ['start', 'windup', 'contact', 'followThrough', 'recoil', 'end']
ref_by_label = {sample['label']: sample for sample in REF['samples'] if sample['clip'] == 'FistAttack1'}
target_by_label = {item['label']: item for item in CAPTURE['keyCaptures']}

W = 980
ROW_H = 330
HEADER_H = 92
sheet = Image.new('RGB', (W, HEADER_H + ROW_H * len(phases)), (18, 20, 23))
draw = ImageDraw.Draw(sheet)
font = ImageFont.load_default()

def text(xy, value, fill=(240,240,240)):
    draw.text(xy, value, fill=fill, font=font)

def draw_reference(sample, box):
    x0, y0, x1, y1 = box
    draw.rectangle(box, fill=(26, 31, 36), outline=(90, 100, 110), width=1)
    bones = sample['bones']
    sx = (x1-x0) / 390.0
    sy = (y1-y0) / 844.0
    def p(name):
        px, py = bones[name]['screen']
        return (x0 + px*sx, y0 + py*sy)
    for a,b in [('ArmR','ForearmR'),('ForearmR','HandR')]:
        draw.line([p(a),p(b)], fill=(105,183,255), width=5)
    for a,b in [('ArmL','ForearmL'),('ForearmL','HandL')]:
        draw.line([p(a),p(b)], fill=(245,154,131), width=5)
    for name in ['ArmR','ForearmR','HandR','ArmL','ForearmL','HandL']:
        px,py = p(name)
        r = 5 if 'Hand' in name else 4
        draw.ellipse((px-r,py-r,px+r,py+r), fill=(247,242,232))

text((20, 16), 'EMBODIED KINESIS LAB — FIRST-PERSON FISTATTACK1 CANARY')
text((20, 36), f"SOURCE: {CONFIG['source']['repository']}:{CONFIG['source']['path']} clip={CONFIG['source']['clip']} camera={CONFIG['source']['camera']} fov={CONFIG['source']['fov']}")
text((20, 56), f"TARGET: {CONFIG['target']['path']} rig={CONFIG['target']['rig']} candidate={CANDIDATE} camera=FPV")

for row, phase in enumerate(phases):
    y = HEADER_H + row * ROW_H
    sample = ref_by_label[phase]
    target = target_by_label[phase]
    text((12, y+8), f"{phase.upper()}   source={sample['time']:.3f}s   target={target['time']:.3f}s")
    ref_box = (12, y+30, 462, y+310)
    draw_reference(sample, ref_box)
    text((18, y+288), 'REFERENCE — source-camera projected arm joints', (190,200,210))
    image = Image.open(ROOT / target['file']).convert('RGB')
    image.thumbnail((486, 280), Image.Resampling.LANCZOS)
    tx = 482 + (486-image.width)//2
    ty = y+30 + (280-image.height)//2
    sheet.paste(image, (tx,ty))
    draw.rectangle((482,y+30,968,y+310), outline=(90,100,110), width=1)
    text((488, y+288), 'TARGET — unified Lab true-FPV canvas', (190,200,210))

sheet_path = OUT / 'key-comparison-sheet.png'
sheet.save(sheet_path, optimize=True)
receipt = {
    'schema': 'embodied-kinesis-key-sheet-v1',
    'stage': STAGE,
    'candidate': CANDIDATE,
    'sourceReference': 'generated/fps-reference/fist/fist-fpv-reference.json',
    'runtimeCapture': str((OUT / 'runtime-capture.json').relative_to(ROOT)),
    'output': str(sheet_path.relative_to(ROOT)),
    'phases': phases,
    'targetCamera': 'firstPerson',
}
(OUT / 'key-sheet-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps(receipt, indent=2))
