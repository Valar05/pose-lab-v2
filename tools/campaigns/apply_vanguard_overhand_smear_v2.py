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

# Preserve accepted timing and visual identity exactly.
if [p["durationMs"] for p in recipe["phases"]]!=contract["lockedTiming"]["phaseDurationsMs"]: stop("accepted timing changed")
if sum(p["durationMs"] for p in recipe["phases"])!=600: stop("accepted total changed")
if recipe.get("comboHandoffMs")!=310: stop("accepted handoff changed")
if recipe.get("rootMotion") is not False: stop("root motion changed")
if recipe.get("canvas",{}).get("anchor")!=[92,226]: stop("canvas anchor changed")
if recipe.get("stage",{}).get("centerX")!=220: stop("stage changed")
if recipe.get("bodyScale")!=1.5: stop("bodyScale changed")
expect={"idle":2,"chamber":26,"commit":40,"preimpact":32,"contact":35}
for k,v in expect.items():
    if recipe["sources"][k]["cell"]!=v: stop(f"{k} pose cell changed")
if recipe["sources"]["slash-right"]["cell"]!=5: stop("slash source changed")
if recipe["effectAtlases"]["slash-canonical"]["sha256"]!="e9b551585d6f92e1e5d94c7722d5051771fd6f38092eeb5c3f447b5c27e55c2d": stop("slash authority changed")

cfg=contract["primarySmear"]
mb=recipe.setdefault("motionBlur",{})
for k,v in cfg.items(): mb[k]=v

old=""" const blur=recipe.motionBlur;
 if(blur?.enabled && blurAmount>0){
   const samples=Math.max(1,Math.round(Number(blur.samples??4)));
   const span=Math.max(0,Number(blur.spanPx??28));
   const filterPx=Math.max(0,Number(blur.filterPx??2));
   const maxAlpha=Math.max(0,Math.min(1,Number(blur.maxAlpha??.32)));
   const direction=Array.isArray(blur.directionStage)?blur.directionStage:[-1,0];
   const dx=Number(direction[0]??-1),dy=Number(direction[1]??0);
   for(let n=samples;n>=1;n--){
     const t=n/samples;
     const alpha=blurAmount*maxAlpha*(1-.52*t);
     drawPass(dx*span*t,dy*span*t,alpha,filterPx?('blur('+filterPx+'px)'):'none');
   }
 }
 drawPass();
}
"""
new=""" const blur=recipe.motionBlur;
 if(blur?.enabled && blurAmount>0){
   const samples=Math.max(1,Math.round(Number(blur.samples??4)));
   const span=Math.max(0,Number(blur.spanPx??28));
   const filterPx=Math.max(0,Number(blur.filterPx??2));
   const maxAlpha=Math.max(0,Math.min(1,Number(blur.maxAlpha??.32)));
   const direction=Array.isArray(blur.directionStage)?blur.directionStage:[-1,0];
   const dx=Number(direction[0]??-1),dy=Number(direction[1]??0);
   for(let n=samples;n>=1;n--){
     const t=n/samples;
     const alpha=blurAmount*maxAlpha*(1-.52*t);
     drawPass(dx*span*t,dy*span*t,alpha,filterPx?('blur('+filterPx+'px)'):'none');
   }
   const primaryFilterPx=Math.max(0,Number(blur.primaryFilterPx??0))*blurAmount;
   const primaryStretchX=1+Math.max(0,Number(blur.primaryStretchX??0))*blurAmount;
   const primarySquashY=1-Math.max(0,Number(blur.primarySquashY??0))*blurAmount;
   const primaryShearX=Number(blur.primaryShearX??0)*blurAmount;
   const primaryShiftPx=Math.max(0,Number(blur.primaryShiftPx??0))*blurAmount;
   ctx.save();
   ctx.globalAlpha=1;
   ctx.filter=primaryFilterPx?('blur('+primaryFilterPx+'px)'):'none';
   ctx.translate(stageOffsetX(),0);
   ctx.translate(px+Number(reg[0]||0)-dx*primaryShiftPx,py+Number(reg[1]||0)-dy*primaryShiftPx);
   ctx.transform((d.scaleX||1)*bodyScale*primaryStretchX,0,d.shearX+primaryShearX,(d.scaleY||1)*bodyScale*primarySquashY,d.shiftX||0,d.shiftY||0);
   ctx.drawImage(it.canvas,-it.anchor[0],-it.anchor[1]);
   ctx.restore();
   return;
 }
 drawPass();
}
"""
if old not in renderer: stop("expected v1 blur renderer block not found")
renderer=renderer.replace(old,new,1)

rp.write_text(json.dumps(recipe,indent=2)+"\n")
sp.write_text(renderer)
print("TIMING=LOCKED_600MS")
print("HANDOFF=LOCKED_310MS")
print("PRIMARY_SPRITE_BLUR=ON")
print("PRIMARY_STRETCH_X=0.34")
print("PRIMARY_FILTER_PX=4")
print("TRAIL_SAMPLES=4")
print("POSES=LOCKED")
print("SLASH=LOCKED")
print("ATLAS_PIXELS=LOCKED")
