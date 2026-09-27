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

# Keep blur strength and trail configuration, but remove the rejected geometric smear.
mb=recipe.setdefault("motionBlur",{})
mb["primaryStretchX"]=0
mb["primarySquashY"]=0
mb["primaryShearX"]=0
mb["primaryShiftPx"]=0
mb["primaryFilterPx"]=4.0

phase_by={p["id"]:p for p in recipe["phases"]}
for pid,amount in contract["blurEnvelope"].items():
    phase_by[pid]["blur"]={"amount":amount}

recipe.pop("motionLines",None)
recipe["animeSpeedLines"]=dict(contract["animeLines"])

# Replace expensive sliced-sprite distortion with simple vector streaks.
start=renderer.find("function drawMotionLineBody(")
end=renderer.find("function revealOriginFor(sourceId){")
if start<0 or end<0 or end<=start:
    stop("v3 motion-line renderer block not found")
anime_fn="""function drawAnimeSpeedLines(px,py,reg,d,bodyScale,amount){
 const spec=recipe.animeSpeedLines||{};
 if(!spec.enabled||amount<=0)return;
 const count=Math.max(1,Math.round(Number(spec.count??10)));
 const minLen=Math.max(1,Number(spec.minLengthPx??8));
 const maxLen=Math.max(minLen,Number(spec.maxLengthPx??28));
 const spreadY=Math.max(1,Number(spec.spreadY??28));
 const back=Math.max(0,Number(spec.offsetBackPx??10));
 const lineWidth=Math.max(.5,Number(spec.lineWidthPx??1.5));
 const alpha=Math.max(0,Math.min(1,Number(spec.alpha??.4)))*amount;
 const stagger=Math.max(0,Number(spec.staggerPx??6));

 ctx.save();
 ctx.translate(stageOffsetX(),0);
 ctx.translate(px+Number(reg[0]||0),py+Number(reg[1]||0));
 ctx.transform((d.scaleX||1)*bodyScale,0,d.shearX,(d.scaleY||1)*bodyScale,d.shiftX||0,d.shiftY||0);
 ctx.globalAlpha=alpha;
 ctx.lineCap='round';
 ctx.lineWidth=lineWidth;
 ctx.strokeStyle='rgba(255,220,180,1)';
 for(let i=0;i<count;i++){
   const t=count===1?0.5:i/(count-1);
   const y=(t-.5)*spreadY;
   const wobble=Math.sin((i*1.91)+amount*3.2)*3;
   const len=minLen+(maxLen-minLen)*(0.25+0.75*((i*37)%11)/10);
   const x0=-back-stagger*(i%3);
   ctx.beginPath();
   ctx.moveTo(x0,y+wobble);
   ctx.lineTo(x0-len,y+wobble*.65);
   ctx.stroke();
 }
 ctx.restore();
}

"""
renderer=renderer[:start]+anime_fn+renderer[end:]

old="""   if(recipe.motionLines?.enabled){
     drawMotionLineBody(it,px,py,reg,d,bodyScale,blurAmount);
     return;
   }
"""
if old not in renderer: stop("v3 motion-line call not found")
new="""   if(recipe.animeSpeedLines?.enabled){
     drawAnimeSpeedLines(px,py,reg,d,bodyScale,blurAmount);
   }
   const primaryFilterPx=Math.max(0,Number(blur.primaryFilterPx??0))*blurAmount;
   ctx.save();
   ctx.globalAlpha=1;
   ctx.filter=primaryFilterPx?('blur('+primaryFilterPx+'px)'):'none';
   ctx.translate(stageOffsetX(),0);
   ctx.translate(px+Number(reg[0]||0),py+Number(reg[1]||0));
   ctx.transform((d.scaleX||1)*bodyScale,0,d.shearX,(d.scaleY||1)*bodyScale,d.shiftX||0,d.shiftY||0);
   ctx.drawImage(it.canvas,-it.anchor[0],-it.anchor[1]);
   ctx.restore();
   return;
"""
renderer=renderer.replace(old,new,1)

rp.write_text(json.dumps(recipe,indent=2)+"\n")
sp.write_text(renderer)

print("TIMING=LOCKED_600MS")
print("HANDOFF=LOCKED_310MS")
print("FORWARD_SCALING=OFF")
print("PRIMARY_SPRITE_BLUR=KEPT")
print("BLUR_ENVELOPE=SHORTENED")
print("ANIME_SPEED_LINES=12_VECTOR_STREAKS")
print("SCANLINE_SPRITE_DISTORTION=REMOVED")
print("SLASH=LOCKED")
print("POSES=LOCKED")
print("ATLAS_PIXELS=LOCKED")
