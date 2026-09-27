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

# Preserve accepted timing and identity.
if [p["durationMs"] for p in recipe["phases"]]!=contract["lockedTiming"]["phaseDurationsMs"]: stop("accepted timing changed")
if recipe.get("comboHandoffMs")!=310: stop("accepted handoff changed")
if recipe.get("rootMotion") is not False: stop("rootMotion changed")
if recipe.get("canvas",{}).get("anchor")!=[92,226]: stop("canvas anchor changed")
if recipe.get("stage",{}).get("centerX")!=220: stop("stage changed")
if recipe.get("bodyScale")!=1.5: stop("bodyScale changed")
for k,v in {"idle":2,"chamber":26,"commit":40,"preimpact":32,"contact":35}.items():
    if recipe["sources"][k]["cell"]!=v: stop(f"{k} source cell changed")
if recipe["sources"]["slash-right"]["cell"]!=5: stop("slash source changed")
if recipe["effectAtlases"]["slash-canonical"]["sha256"]!="e9b551585d6f92e1e5d94c7722d5051771fd6f38092eeb5c3f447b5c27e55c2d": stop("slash authority changed")

# Explicitly retire the rejected forward-scaling smear.
mb=recipe.setdefault("motionBlur",{})
mb["primaryStretchX"]=0
mb["primarySquashY"]=0
mb["primaryShearX"]=0
mb["primaryShiftPx"]=0
mb["primaryFilterPx"]=0

recipe["motionLines"]=dict(contract["motionLines"])

old="""   const primaryFilterPx=Math.max(0,Number(blur.primaryFilterPx??0))*blurAmount;
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
"""
new="""   if(recipe.motionLines?.enabled){
     drawMotionLineBody(it,px,py,reg,d,bodyScale,blurAmount);
     return;
   }
"""

if old not in renderer: stop("expected v2 primary-smear block not found")
renderer=renderer.replace(old,new,1)

insert_before="function revealOriginFor(sourceId){"
if "function drawMotionLineBody" not in renderer:
    fn="""function drawMotionLineBody(it,px,py,reg,d,bodyScale,amount){
 const ml=recipe.motionLines||{};
 const sliceH=Math.max(1,Math.round(Number(ml.sliceHeightPx??3)));
 const maxPull=Math.max(0,Number(ml.maxPullPx??30))*amount;
 const wavePx=Math.max(0,Number(ml.wavePx??6))*amount;
 const waveCycles=Math.max(.1,Number(ml.waveCycles??3));
 const baseAlphaAtPeak=Math.max(0,Math.min(1,Number(ml.baseAlphaAtPeak??.35)));
 const ghostAlpha=Math.max(0,Math.min(1,Number(ml.ghostAlpha??.2)));
 const ghostStep=Math.max(1,Number(ml.ghostStepPx??10));
 const ghostCount=Math.max(0,Math.round(Number(ml.ghostCount??3)));
 const lineFilterPx=Math.max(0,Number(ml.lineFilterPx??1));
 const x0=-it.anchor[0],y0=-it.anchor[1],w=it.canvas.width,h=it.canvas.height;

 const begin=()=>{ctx.save();ctx.translate(stageOffsetX(),0);ctx.translate(px+Number(reg[0]||0),py+Number(reg[1]||0));ctx.transform((d.scaleX||1)*bodyScale,0,d.shearX,(d.scaleY||1)*bodyScale,d.shiftX||0,d.shiftY||0);};
 begin();
 ctx.globalAlpha=1-amount*(1-baseAlphaAtPeak);
 ctx.drawImage(it.canvas,x0,y0);
 ctx.restore();

 for(let g=ghostCount;g>=1;g--){
   begin();
   ctx.globalAlpha=ghostAlpha*amount*(1-g/(ghostCount+1));
   ctx.filter=lineFilterPx?('blur('+lineFilterPx+'px)'):'none';
   for(let sy=0;sy<h;sy+=sliceH){
     const band=Math.min(sliceH,h-sy);
     const yn=(sy+band*.5)/Math.max(1,h);
     const wave=Math.sin((yn*waveCycles+g*.17)*Math.PI*2)*wavePx;
     const taper=Math.sin(Math.PI*yn);
     const pull=maxPull*(.35+.65*taper)+wave+g*ghostStep;
     ctx.drawImage(it.canvas,0,sy,w,band,x0-pull,y0+sy,w,band);
   }
   ctx.restore();
 }

 begin();
 ctx.globalAlpha=Math.min(1,.66+.34*amount);
 ctx.filter=lineFilterPx?('blur('+(lineFilterPx*.55*amount)+'px)'):'none';
 for(let sy=0;sy<h;sy+=sliceH){
   const band=Math.min(sliceH,h-sy);
   const yn=(sy+band*.5)/Math.max(1,h);
   const wave=Math.sin((yn*waveCycles+.11)*Math.PI*2)*wavePx;
   const taper=Math.sin(Math.PI*yn);
   const pull=maxPull*taper+wave;
   ctx.drawImage(it.canvas,0,sy,w,band,x0-pull,y0+sy,w,band);
 }
 ctx.restore();
}

"""
    renderer=renderer.replace(insert_before,fn+insert_before,1)

rp.write_text(json.dumps(recipe,indent=2)+"\n")
sp.write_text(renderer)
print("TIMING=LOCKED_600MS")
print("HANDOFF=LOCKED_310MS")
print("FORWARD_SCALING=OFF")
print("PRIMARY_SPRITE_SCANLINE_DISTORTION=ON")
print("MAX_BACKWARD_PULL_PX=34")
print("SPEED_LINE_GHOSTS=3")
print("SLASH=LOCKED")
print("POSES=LOCKED")
print("ATLAS_PIXELS=LOCKED")
