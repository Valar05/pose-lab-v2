#!/usr/bin/env python3
from pathlib import Path
import json
import statistics
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
CONTRACT=json.loads((ROOT/"campaigns/swarmling-utility-pack-v2.contract.json").read_text())
MANIFEST=json.loads((ROOT/"public/assets/vanguard/fleshpunk/characters/swarmling/animations.json").read_text())
ATLAS=Image.open(ROOT/"public/assets/vanguard/fleshpunk/characters/swarmling/source/swarmling-approved-atlas.png").convert("RGBA")

def stop(msg):
    raise SystemExit("STOP: "+msg)

def rect(cell):
    i=cell-1
    c=i%6
    r=i//6
    return (c*256,r*256,(c+1)*256,(r+1)*256)

def bbox(im,threshold=30):
    px=im.load(); xs=[]; ys=[]
    for y in range(256):
        for x in range(256):
            r,g,b,a=px[x,y]
            if a>0 and max(r,g,b)>threshold:
                xs.append(x); ys.append(y)
    if not xs: stop("empty cell")
    return min(xs),min(ys),max(xs)+1,max(ys)+1

def core_x(im,b):
    x0,y0,x1,y1=b
    h=max(1,y1-y0)
    lo=max(0,int(round(y0+h*.24)))
    hi=min(255,int(round(y0+h*.72)))
    px=im.load(); xs=[]
    for y in range(lo,hi+1):
        for x in range(256):
            r,g,b,a=px[x,y]
            if a>0 and max(r,g,b)>55:
                xs.append(x)
    return float(statistics.median(xs)) if xs else (x0+x1-1)/2

targets={int(k):int(v) for k,v in CONTRACT["authority"]["targetVisibleHeightsPx"].items()}
target_x=CONTRACT["authority"]["physicalRegistration"]["bodyCoreX"]
target_ground=CONTRACT["authority"]["physicalRegistration"]["groundY"]
observed={}
for cell,target_h in targets.items():
    im=ATLAS.crop(rect(cell))
    b=bbox(im)
    h=b[3]-b[1]
    cx=core_x(im,b)
    ground=b[3]-1
    observed[cell]={"height":h,"coreX":cx,"ground":ground}
    if abs(h-target_h)>1:
        stop(f"cell {cell} height {h} misses target {target_h}")
    if abs(cx-target_x)>2:
        stop(f"cell {cell} core X {cx:.2f} misses {target_x}")
    if abs(ground-target_ground)>1:
        stop(f"cell {cell} ground {ground} misses {target_ground}")

repair=MANIFEST.get("authority",{}).get("utilityScaleRepairV2")
if not repair:
    stop("manifest utilityScaleRepairV2 receipt missing")
if repair.get("targetVisibleHeightsPx")!=CONTRACT["authority"]["targetVisibleHeightsPx"]:
    stop("manifest target heights drifted")

print(json.dumps({
    "ok":True,
    "sharedScaleFormula":CONTRACT["authority"]["sharedScaleFormula"],
    "observed":observed
},indent=2))
