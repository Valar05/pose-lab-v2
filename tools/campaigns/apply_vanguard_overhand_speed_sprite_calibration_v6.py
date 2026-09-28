#!/usr/bin/env python3
from __future__ import annotations
import json,sys
from pathlib import Path

root=Path(sys.argv[1]).resolve()
contract=json.loads((root/sys.argv[2]).read_text())
rp=root/"public/assets/vanguard/procedural/overhand-strike.recipe.json"
sp=root/"src/procedural-motion-preview.js"
recipe=json.loads(rp.read_text())
renderer=sp.read_text()

def stop(m): raise SystemExit("STOP: "+m)

# Lock all accepted semantics and source identity before presentation-only correction.
if [p["durationMs"] for p in recipe["phases"]] != [25,45,45,30,25,70,70,95,90,105]: stop("accepted timing changed")
if recipe.get("comboHandoffMs") != 310: stop("accepted handoff changed")
if recipe.get("rootMotion") is not False: stop("rootMotion changed")
if recipe.get("canvas",{}).get("anchor") != [92,226]: stop("canvas anchor changed")
if recipe.get("stage",{}).get("centerX") != 220: stop("stage changed")
if recipe.get("bodyScale") != 1.5: stop("bodyScale changed")
for k,v in {"idle":2,"chamber":26,"commit":40,"preimpact":32,"contact":35}.items():
    if recipe["sources"][k]["cell"] != v: stop(f"{k} source cell changed")
if recipe["sources"]["slash-right"]["cell"] != 5: stop("slash source changed")
if recipe["effectAtlases"]["slash-canonical"]["sha256"] != "e9b551585d6f92e1e5d94c7722d5051771fd6f38092eeb5c3f447b5c27e55c2d": stop("slash authority changed")
expected_blur={"idle":0.0,"anticipation":0.0,"chamber":0.0,"cross-commit":0.32,"lean-forward":1.0,"contact":0.46,"follow-through":0.08,"recoil-1":0.0,"recoil-2":0.0,"idle-return":0.0}
for pid,amount in expected_blur.items():
    p=next((q for q in recipe["phases"] if q["id"]==pid),None)
    if not p or p.get("blur",{}).get("amount") != amount: stop(f"{pid} blur envelope changed")
old=recipe.get("speedLineSprite",{})
if old.get("path")!="assets/vanguard/procedural/vanguard-diorama-speed-lines.png": stop("speed-line source path changed")

# Presentation-only calibration.
recipe["speedLineSprite"]=dict(contract["speedLineSprite"])

old_call="drawSpeedLineSprite(px,py,reg,d,blurAmount);"
new_call="drawSpeedLineSprite(px,py,reg,d,bodyScale,blurAmount);"
if old_call not in renderer: stop("v5 speed-line call not found")
renderer=renderer.replace(old_call,new_call,1)

old_sig="function drawSpeedLineSprite(px,py,reg,d,amount){"
new_sig="function drawSpeedLineSprite(px,py,reg,d,bodyScale,amount){"
if old_sig not in renderer: stop("v5 speed-line helper signature not found")
renderer=renderer.replace(old_sig,new_sig,1)

old_transform=""" ctx.transform((d.scaleX||1),0,d.shearX,(d.scaleY||1),d.shiftX||0,d.shiftY||0);
 ctx.scale(sx,sy);
"""
new_transform=""" const inheritedScale=spec.inheritBodyScale===false?1:bodyScale;
 ctx.transform((d.scaleX||1)*inheritedScale,0,d.shearX,(d.scaleY||1)*inheritedScale,d.shiftX||0,d.shiftY||0);
 ctx.scale(sx,sy);
"""
if old_transform not in renderer: stop("v5 speed-line transform block not found")
renderer=renderer.replace(old_transform,new_transform,1)

rp.write_text(json.dumps(recipe,indent=2)+"\n")
sp.write_text(renderer)

print("SPEED_LINE_SOURCE=LOCKED_157x72")
print("SPEED_LINE_POSITION=42,-96")
print("SPEED_LINE_X_SCALE=1.05_TO_1.45_PLUS_BODY_SCALE")
print("SPEED_LINE_BODY_SCALE=INHERITED_1.5")
print("SPEED_LINE_ALPHA=0.88")
print("TIMING=LOCKED_600MS")
print("HANDOFF=LOCKED_310MS")
print("SLASH=LOCKED")
print("POSES=LOCKED")
print("BLUR_ENVELOPE=LOCKED")
