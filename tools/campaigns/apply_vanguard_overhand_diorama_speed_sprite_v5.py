#!/usr/bin/env python3
from __future__ import annotations
import hashlib,json,shutil,struct,sys
from pathlib import Path

root=Path(sys.argv[1]).resolve()
contract=json.loads((root/sys.argv[2]).read_text())
src=Path(sys.argv[3]).resolve()
rp=root/"public/assets/vanguard/procedural/overhand-strike.recipe.json"
sp=root/"src/procedural-motion-preview.js"
dst=root/contract["sourceAsset"]["destination"]
recipe=json.loads(rp.read_text())
renderer=sp.read_text()

def stop(m): raise SystemExit("STOP: "+m)

# Preserve every accepted semantic/pose/timing property.
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
for pid,amount in contract["blurEnvelope"].items():
    p=next((q for q in recipe["phases"] if q["id"]==pid),None)
    if not p or p.get("blur",{}).get("amount")!=amount: stop(f"{pid} accepted blur envelope changed")
mb=recipe.get("motionBlur",{})
for k,v in {"primaryStretchX":0,"primarySquashY":0,"primaryShearX":0,"primaryShiftPx":0,"primaryFilterPx":4.0}.items():
    if mb.get(k)!=v: stop(f"accepted motion blur property changed: {k}")

# Verify the exact user-approved PNG before ingress.
if not src.is_file(): stop(f"approved speed-line PNG missing: {src}")
raw=src.read_bytes()
if hashlib.sha256(raw).hexdigest()!=contract["sourceAsset"]["byteSha256"]: stop("speed-line PNG byte hash mismatch")
if raw[:8]!=b"\x89PNG\r\n\x1a\n": stop("speed-line source is not PNG")
w,h=struct.unpack(">II",raw[16:24])
if [w,h]!=[contract["sourceAsset"]["width"],contract["sourceAsset"]["height"]]:
    stop(f"speed-line dimensions changed: {w}x{h}")
dst.parent.mkdir(parents=True,exist_ok=True)
shutil.copyfile(src,dst)
if hashlib.sha256(dst.read_bytes()).hexdigest()!=contract["sourceAsset"]["byteSha256"]: stop("copied speed-line bytes changed")

# Retire v4 primitive dashes. One baked sprite is now the effect primitive.
recipe.pop("animeSpeedLines",None)
recipe["speedLineSprite"]=dict(contract["speedLineSprite"])

# Replace the v4 vector helper with one sprite draw.
start=renderer.find("function drawAnimeSpeedLines(")
end=renderer.find("function revealOriginFor(sourceId){")
if start<0 or end<0 or end<=start: stop("v4 anime-line renderer block not found")
sprite_fn="""function drawSpeedLineSprite(px,py,reg,d,amount){
 const spec=recipe.speedLineSprite||{};
 if(!spec.enabled||!speedLines||amount<=0)return;
 const pos=Array.isArray(spec.position)?spec.position:[20,-68];
 const minX=Number(spec.minScaleX??0.58);
 const maxX=Number(spec.maxScaleX??1);
 const sx=minX+(maxX-minX)*Math.max(0,Math.min(1,amount));
 const sy=Number(spec.scaleY??1);
 const alpha=Math.max(0,Math.min(1,Number(spec.alpha??0.78)))*amount;

 ctx.save();
 ctx.globalAlpha=alpha;
 ctx.imageSmoothingEnabled=spec.imageSmoothing!==false;
 ctx.translate(stageOffsetX(),0);
 ctx.translate(px+Number(reg[0]||0)+Number(pos[0]||0),py+Number(reg[1]||0)+Number(pos[1]||0));
 ctx.transform((d.scaleX||1),0,d.shearX,(d.scaleY||1),d.shiftX||0,d.shiftY||0);
 ctx.scale(sx,sy);
 // The source converges at its right edge, so pin that edge to Vanguard's back.
 ctx.drawImage(speedLines,-speedLines.width,-speedLines.height/2);
 ctx.restore();
}

"""
renderer=renderer[:start]+sprite_fn+renderer[end:]

old="""   if(recipe.animeSpeedLines?.enabled){
     drawAnimeSpeedLines(px,py,reg,d,bodyScale,blurAmount);
   }
"""
if old not in renderer: stop("v4 anime-line draw call not found")
renderer=renderer.replace(old,"""   if(recipe.speedLineSprite?.enabled){
     drawSpeedLineSprite(px,py,reg,d,blurAmount);
   }
""",1)

old_decl="let recipe,atlas,slash,slashMap,playing=true,start=performance.now(),offset=0,total=1,phases=[];"
if old_decl not in renderer: stop("renderer image declaration not found")
renderer=renderer.replace(old_decl,"let recipe,atlas,slash,slashMap,speedLines,playing=true,start=performance.now(),offset=0,total=1,phases=[];",1)

old_load=""" }
 buildSlash();
 for(const [id,src] of Object.entries(recipe.sources))if(src.role==='body')body(id);
"""
if old_load not in renderer: stop("renderer effect-load boundary not found")
new_load=""" }
 if(recipe.speedLineSprite?.enabled){
   const speedPath=recipe.speedLineSprite.path.startsWith('./')
     ? recipe.speedLineSprite.path
     : './'+recipe.speedLineSprite.path;
   speedLines=await loadImage(speedPath);
 }
 buildSlash();
 for(const [id,src] of Object.entries(recipe.sources))if(src.role==='body')body(id);
"""
renderer=renderer.replace(old_load,new_load,1)

rp.write_text(json.dumps(recipe,indent=2)+"\n")
sp.write_text(renderer)

print("TIMING=LOCKED_600MS")
print("HANDOFF=LOCKED_310MS")
print("SLASH=LOCKED")
print("POSES=LOCKED")
print("BLUR_ENVELOPE=LOCKED_SHORT")
print("VECTOR_DASHES=REMOVED")
print("SPEED_LINE_SPRITE=ONE_BAKED_157x72")
print("SPEED_LINE_DRAW=ONE_IMAGE_NO_INSTANCING")
print("SPEED_LINE_X=PROCEDURAL_0.58_TO_1.0")
print("SPEED_LINE_ALPHA=PROCEDURAL_FROM_BLUR_AMOUNT")
print("ROOT_MOTION=OFF")
