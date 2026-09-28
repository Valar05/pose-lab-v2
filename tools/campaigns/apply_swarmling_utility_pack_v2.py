#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import math
import re
import statistics
import sys
from copy import deepcopy
from pathlib import Path

from PIL import Image

root=Path(sys.argv[1]).resolve()
contract_path=root/sys.argv[2]
atlas_path=root/"public/assets/vanguard/fleshpunk/characters/swarmling/source/swarmling-approved-atlas.png"
manifest_path=root/"public/assets/vanguard/fleshpunk/characters/swarmling/animations.json"
preview_path=root/"src/procedural-swarmling-preview.js"
package_path=root/"package.json"

contract=json.loads(contract_path.read_text())
manifest=json.loads(manifest_path.read_text())
authority=contract["authority"]

def stop(msg:str):
    raise SystemExit("STOP: "+msg)

def sha256_bytes(data:bytes)->str:
    return hashlib.sha256(data).hexdigest()

def file_sha256(path:Path)->str:
    return sha256_bytes(path.read_bytes())

if file_sha256(atlas_path)!=authority["currentAtlasSha256"]:
    stop("unexpected pre-v2 atlas hash")
if manifest.get("authority",{}).get("sourceByteSha256")!=authority["currentAtlasSha256"]:
    stop("manifest atlas authority does not match v2 starting atlas")

atlas=Image.open(atlas_path).convert("RGBA")
if atlas.size!=(1536,1024):
    stop("canonical atlas dimensions drifted")

def rect(cell:int):
    idx=cell-1
    col=idx%6
    row=idx//6
    return (col*256,row*256,(col+1)*256,(row+1)*256)

def visible_bbox(im:Image.Image,threshold:int=30):
    px=im.load()
    xs=[]
    ys=[]
    for y in range(256):
        for x in range(256):
            r,g,b,a=px[x,y]
            if a>0 and max(r,g,b)>threshold:
                xs.append(x); ys.append(y)
    if not xs:
        stop("empty source cell")
    return min(xs),min(ys),max(xs)+1,max(ys)+1

def body_core_x(im:Image.Image,bbox):
    x0,y0,x1,y1=bbox
    h=max(1,y1-y0)
    lo=max(0,int(round(y0+h*.24)))
    hi=min(255,int(round(y0+h*.72)))
    px=im.load()
    xs=[]
    for y in range(lo,hi+1):
        for x in range(256):
            r,g,b,a=px[x,y]
            if a>0 and max(r,g,b)>55:
                xs.append(x)
    if not xs:
        return (x0+x1-1)/2
    return float(statistics.median(xs))

def anchor_for_cell(cell:int):
    im=atlas.crop(rect(cell))
    b=visible_bbox(im)
    return [int(round(body_core_x(im,b))),int(b[3]-1)]

allowed=set(int(x) for x in authority["utilityExclusiveCells"])
before={
    n:sha256_bytes(atlas.crop(rect(n)).tobytes())
    for n in range(1,25)
}
target_heights={int(k):int(v) for k,v in authority["targetVisibleHeightsPx"].items()}
target_x=int(authority["physicalRegistration"]["bodyCoreX"])
target_ground=int(authority["physicalRegistration"]["groundY"])

print("=== UTILITY SOURCE-SCALE REPAIR ===")
for cell,target_h in target_heights.items():
    if cell not in allowed:
        stop(f"target height declared for non-writable cell {cell}")
    im=atlas.crop(rect(cell)).copy()
    x0,y0,x1,y1=visible_bbox(im)
    old_h=y1-y0
    core_x=body_core_x(im,(x0,y0,x1,y1))
    subject=im.crop((x0,y0,x1,y1))
    scale=target_h/old_h
    nw=max(1,int(round(subject.width*scale)))
    nh=max(1,int(round(subject.height*scale)))
    subject=subject.resize((nw,nh),Image.Resampling.LANCZOS)
    core_rel=(core_x-x0)*scale
    px=int(round(target_x-core_rel))
    py=int(round(target_ground+1-nh))
    px=max(0,min(256-nw,px))
    py=max(0,min(256-nh,py))
    out=Image.new("RGBA",(256,256),(0,0,0,255))
    out.alpha_composite(subject,(px,py))
    atlas.paste(out,rect(cell))
    print(f"CELL_{cell}_HEIGHT={old_h}->{target_h}")

after={
    n:sha256_bytes(atlas.crop(rect(n)).tobytes())
    for n in range(1,25)
}
changed={n for n in range(1,25) if before[n]!=after[n]}
if not changed.issubset(allowed):
    stop("atlas changed outside utility-exclusive cells: "+",".join(map(str,sorted(changed))))
if 8 not in changed:
    stop("cell 8 scale repair did not change pixels")

# Verify post-repair geometry before writing.
for cell,target_h in target_heights.items():
    im=atlas.crop(rect(cell))
    b=visible_bbox(im)
    got_h=b[3]-b[1]
    got_x=body_core_x(im,b)
    got_ground=b[3]-1
    if abs(got_h-target_h)>1:
        stop(f"cell {cell} visible height {got_h} misses target {target_h}")
    if abs(got_x-target_x)>2:
        stop(f"cell {cell} body core X {got_x:.2f} misses target {target_x}")
    if abs(got_ground-target_ground)>1:
        stop(f"cell {cell} ground {got_ground} misses target {target_ground}")

atlas.save(atlas_path)

new_atlas_sha=file_sha256(atlas_path)
manifest["authority"]["sourceByteSha256"]=new_atlas_sha
manifest["authority"]["sourceRgbaPixelSha256"]=sha256_bytes(atlas.tobytes())
manifest["authority"]["utilityScaleRepairV2"]={
    "sourceContract":"campaigns/swarmling-utility-pack-v2.contract.json",
    "scaleAnchorCell":authority["scaleAnchorCell"],
    "scaleAnchorVisibleHeightPx":authority["scaleAnchorCurrentVisibleHeightPx"],
    "originalAuthoredVisibleHeightsPx":authority["originalAuthoredVisibleHeightsPx"],
    "targetVisibleHeightsPx":authority["targetVisibleHeightsPx"],
    "physicalBodyCoreX":target_x,
    "physicalGroundY":target_ground,
    "changedCells":sorted(changed)
}

locked=contract["lockedAcceptedState"]
by_id={a["id"]:a for a in manifest["animations"]}
run=by_id["run"]
if [f["sourceCell"] for f in run["frames"]]!=locked["run"]["sourceCells"]:
    stop("accepted Run cells drifted")
if [f["anchorPoint"] for f in run["frames"]]!=locked["run"]["anchors"]:
    stop("accepted Run anchors drifted")
for aid in ("jab","rake","scythe-bloom"):
    a=by_id[aid]; spec=locked[aid]
    if [f["sourceCell"] for f in a["frames"]]!=spec["sourceCells"]:
        stop(f"accepted {aid} source cells drifted")
    if [f["sourceCell"] for f in a["timeline"]]!=spec["timelineCells"]:
        stop(f"accepted {aid} timeline drifted")
    if a["stageAnchor"]!=spec["stageAnchor"]:
        stop(f"accepted {aid} stage anchor drifted")
if by_id["jab"]["frames"][1]["sourceCell"]!=15:
    stop("Needle Jab impact cell drifted")

utility_ids=set(contract["utilityAnimations"])
kept=[a for a in manifest["animations"] if a.get("id") not in utility_ids]
utilities=[]

for aid,spec in contract["utilityAnimations"].items():
    timeline=[]
    for raw in spec["timeline"]:
        item=deepcopy(raw)
        item["anchorPoint"]=anchor_for_cell(int(item["sourceCell"]))
        timeline.append(item)
    utilities.append({
        "id":aid,
        "label":spec["label"],
        "loop":bool(spec["loop"]),
        "rootMotion":False,
        "stageAnchor":spec["stageAnchor"],
        "semantic":spec["semantic"],
        "contract":[
            "canonical atlas pose authority",
            "utility-exclusive cells share one source scale family",
            "root motion OFF; engine owns translation",
            "procedural motion profile is required"
        ],
        "timeline":timeline,
        "proceduralMotion":deepcopy(spec["proceduralMotion"]),
        "procedural":{
            "interpolation":"smoothstep-deform-only",
            "motionOverlay":"proceduralMotion",
            "pivot":"body-core-x-ground-y",
            "rootTranslation":False,
            "allowed":["shearX","scaleX","scaleY","rotateDeg"],
            "forbidden":["shiftX","shiftY","root motion","stage translation"]
        },
        "pinAuthority":{
            "mode":"body-core-x-ground-y",
            "source":"utility-scale-repaired canonical Swarmling atlas"
        }
    })

manifest["animations"]=kept+utilities
manifest["authority"]["utilityPack"]={
    "contract":"campaigns/swarmling-utility-pack-v2.contract.json",
    "animations":list(contract["utilityAnimations"].keys()),
    "idleSourceCells":[7],
    "knockdownTerminalCell":21,
    "deathTerminalCell":22,
    "proceduralMotionRequired":True,
    "rootMotion":False
}
manifest_path.write_text(json.dumps(manifest,indent=2)+"\n")

preview=preview_path.read_text()

old_deform='''function deformAt(index,u){
  const seq=sequence();
  const a=seq[index]?.deform||{};
  const b=seq[Math.min(seq.length-1,index+1)]?.deform||a;
  const t=smooth(u);
  return{
    shearX:lerp(Number(a.shearX??0),Number(b.shearX??a.shearX??0),t),
    scaleX:lerp(Number(a.scaleX??1),Number(b.scaleX??a.scaleX??1),t),
    scaleY:lerp(Number(a.scaleY??1),Number(b.scaleY??a.scaleY??1),t),
    rotateDeg:lerp(Number(a.rotateDeg??0),Number(b.rotateDeg??a.rotateDeg??0),t)
  };
}
'''
if old_deform not in preview:
    stop("deformAt source block drifted")

new_deform=old_deform+'''
function proceduralMotionAt(ms,state,base){
  const p=animation?.proceduralMotion;
  if(!p)return base;
  const cycle=Math.max(1,Number(p.cycleMs||1000));
  const phase=(ms/cycle)*Math.PI*2;
  let signal=Math.sin(phase);
  if(p.mode==='breathing-loop'){
    signal=Math.sin(phase);
  }else if(p.mode==='damped-wobble'){
    const decay=Math.max(1,Number(p.decayMs||600));
    signal=Math.sin(phase)*Math.exp(-Math.max(0,ms)/decay);
  }else if(p.mode==='tension-wave'){
    signal=Math.sin(phase)*(.65+.35*Math.sin(Math.PI*clamp(state.u)));
  }else if(p.mode==='strain-wave'){
    signal=Math.sin(phase)*(.55+.45*Math.sin(Math.PI*clamp(state.u)));
  }
  return{
    shearX:Number(base.shearX||0)+signal*Number(p.shearX||0),
    scaleX:Number(base.scaleX||1)-signal*Number(p.scaleX||0),
    scaleY:Number(base.scaleY||1)+signal*Number(p.scaleY||0),
    rotateDeg:Number(base.rotateDeg||0)+signal*Number(p.rotateDeg||0)
  };
}

function normalizedTimeMs(ms){
  if(animation?.loop===false)return Math.max(0,Math.min(Math.max(0,total-.001),ms));
  return ((ms%total)+total)%total;
}
'''
preview=preview.replace(old_deform,new_deform)

preview=preview.replace(
  "  ms=((ms%total)+total)%total;\n  const state=stateAtMs(ms),item=state.item,index=state.index;",
  "  ms=normalizedTimeMs(ms);\n  const state=stateAtMs(ms),item=state.item,index=state.index;"
)
preview=preview.replace(
  "  const d=deformAt(index,state.u);\n  drawPlanted(image,item,index,d);",
  "  const baseDeform=deformAt(index,state.u);\n  const d=proceduralMotionAt(ms,state,baseDeform);\n  drawPlanted(image,item,index,d);"
)

old_loop='''function loop(now){
  const ms=playing?(offset+(now-start))%total:offset;
  render(ms).catch(err=>{playing=false;throw err});
  requestAnimationFrame(loop);
}
'''
if old_loop not in preview:
    stop("loop source block drifted")
new_loop='''function loop(now){
  const raw=playing?(offset+(now-start)):offset;
  if(animation?.loop===false && playing && raw>=total){
    offset=Math.max(0,total-.001);
    playing=false;
    play.textContent='▶';
    render(offset).catch(err=>{throw err});
    requestAnimationFrame(loop);
    return;
  }
  const ms=animation?.loop===false?raw:(raw%total);
  render(ms).catch(err=>{playing=false;throw err});
  requestAnimationFrame(loop);
}
'''
preview=preview.replace(old_loop,new_loop)

old_play="""  else{start=performance.now();playing=true;play.textContent='❚❚'}"""
new_play="""  else{if(animation?.loop===false&&offset>=total-1)offset=0;start=performance.now();playing=true;play.textContent='❚❚'}"""
if old_play not in preview:
    stop("play resume source block drifted")
preview=preview.replace(old_play,new_play)

preview_path.write_text(preview)

pkg=json.loads(package_path.read_text())
pkg["scripts"]["test:swarmling-utility-scale"]="python3 tools/test_swarmling_utility_scale.py"
package_path.write_text(json.dumps(pkg,indent=2)+"\n")

print("NEW_ATLAS_SHA256="+new_atlas_sha)
print("CHANGED_ATLAS_CELLS="+json.dumps(sorted(changed)))
print("IDLE_SOURCE_CELLS=[7]")
print("PROCEDURAL_MOTION=ALL_UTILITIES")
print("NON_LOOP_TERMINAL_HOLD=ON")
print("RUN_AND_ATTACKS=LOCKED")
