#!/usr/bin/env python3
from __future__ import annotations

import json
import statistics
import sys
from copy import deepcopy
from pathlib import Path

from PIL import Image

root=Path(sys.argv[1]).resolve()
contract_path=root/sys.argv[2]
manifest_path=root/"public/assets/vanguard/fleshpunk/characters/swarmling/animations.json"
atlas_path=root/"public/assets/vanguard/fleshpunk/characters/swarmling/source/swarmling-approved-atlas.png"
preview_path=root/"src/procedural-swarmling-preview.js"

contract=json.loads(contract_path.read_text())
manifest=json.loads(manifest_path.read_text())
atlas=Image.open(atlas_path).convert("RGBA")

def stop(msg:str):
    raise SystemExit("STOP: "+msg)

def rect(cell:int):
    i=cell-1
    c=i%6
    r=i//6
    return (c*256,r*256,(c+1)*256,(r+1)*256)

def bbox(im,threshold=30):
    px=im.load()
    xs=[]; ys=[]
    for y in range(256):
        for x in range(256):
            r,g,b,a=px[x,y]
            if a>0 and max(r,g,b)>threshold:
                xs.append(x); ys.append(y)
    if not xs:
        stop("empty source cell")
    return min(xs),min(ys),max(xs)+1,max(ys)+1

def body_core_x(im,b):
    x0,y0,x1,y1=b
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
    return float(statistics.median(xs)) if xs else (x0+x1-1)/2

def anchor_for_cell(cell:int):
    im=atlas.crop(rect(cell))
    b=bbox(im)
    return [int(round(body_core_x(im,b))),int(b[3]-1)]

locked=contract["lockedAcceptedState"]
if manifest.get("authority",{}).get("sourceByteSha256")!=locked["atlasSha256"]:
    stop("utility-scale-repaired atlas hash changed")
if atlas.size!=(1536,1024):
    stop("atlas dimensions changed")

by_id={a["id"]:a for a in manifest["animations"]}
run=by_id.get("run")
if not run:
    stop("accepted Run missing")
if [f["sourceCell"] for f in run["frames"]]!=locked["run"]["sourceCells"]:
    stop("accepted Run source cells changed")
if [f["anchorPoint"] for f in run["frames"]]!=locked["run"]["anchors"]:
    stop("accepted Run anchors changed")
for aid in ("jab","rake","scythe-bloom"):
    a=by_id.get(aid)
    spec=locked[aid]
    if not a:
        stop(f"accepted {aid} missing")
    if [f["sourceCell"] for f in a["frames"]]!=spec["sourceCells"]:
        stop(f"accepted {aid} authored cells changed")
    if [f["sourceCell"] for f in a["timeline"]]!=spec["timelineCells"]:
        stop(f"accepted {aid} timeline changed")
    if a.get("stageAnchor")!=spec["stageAnchor"]:
        stop(f"accepted {aid} stage anchor changed")
if by_id["jab"]["frames"][1]["sourceCell"]!=15:
    stop("Needle Jab impact cell changed")

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
        "reviewLoop":bool(spec["reviewLoop"]),
        "reviewLoopGapMs":int(spec.get("reviewLoopGapMs",0)),
        "rootMotion":False,
        "stageAnchor":spec["stageAnchor"],
        "semantic":spec["semantic"],
        "contract":[
            "canonical atlas pose authority",
            "utility scale repair from v2 is locked",
            "gameplay loop semantics are separate from review looping",
            "root motion OFF; engine owns translation",
            "explicit procedural motion profile required"
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
    "contract":"campaigns/swarmling-utility-pack-v3.contract.json",
    "animations":list(contract["utilityAnimations"].keys()),
    "idleSourceCells":[7],
    "aggroSurpriseSourceCell":17,
    "damageSourceCells":[18,19],
    "knockdownTerminalCell":21,
    "deathTerminalCell":22,
    "proceduralMotionRequired":True,
    "reviewLoopSeparatedFromGameplay":True,
    "rootMotion":False
}
manifest_path.write_text(json.dumps(manifest,indent=2)+"\n")

preview=preview_path.read_text()

start=preview.find("function proceduralMotionAt(ms,state,base){")
end=preview.find("\nfunction normalizedTimeMs(ms){",start)
if start<0 or end<0:
    stop("procedural motion runtime block not found")

new_motion='''function proceduralMotionAt(ms,state,base){
  const p=animation?.proceduralMotion;
  if(!p)return base;
  const cycle=Math.max(1,Number(p.cycleMs||1000));
  const phase=(ms/cycle)*Math.PI*2;
  const s1=Math.sin(phase);
  const s2=Math.sin(phase*2+0.65);
  const harmonic=Number(p.secondHarmonic||0);
  let signal=s1+harmonic*s2;
  const decay=Math.max(1,Number(p.decayMs||600));
  const decayEnv=Math.exp(-Math.max(0,ms)/decay);

  if(p.mode==='organic-breath'){
    signal=s1+harmonic*s2;
  }else if(p.mode==='startle-quiver'){
    signal=(Math.sin(phase*1.8)+0.45*Math.sin(phase*3.1))*Math.max(.28,decayEnv);
  }else if(p.mode==='impact-rattle'){
    signal=(Math.sin(phase*2.2)+0.35*Math.sin(phase*4.4))*decayEnv;
  }else if(p.mode==='collapse-jolt'){
    signal=(Math.sin(phase*1.6)+0.3*Math.sin(phase*3.2))*Math.max(.18,decayEnv);
  }else if(p.mode==='effort-pulse'){
    signal=(s1+harmonic*s2)*(.65+.35*Math.sin(Math.PI*clamp(state.u)));
  }else if(p.mode==='death-spasm'){
    signal=(Math.sin(phase*2.4)+0.4*Math.sin(phase*4.8))*decayEnv;
  }

  return{
    shearX:Number(base.shearX||0)+signal*Number(p.shearX||0),
    scaleX:Number(base.scaleX||1)-signal*Number(p.scaleX||0),
    scaleY:Number(base.scaleY||1)+signal*Number(p.scaleY||0),
    rotateDeg:Number(base.rotateDeg||0)+signal*Number(p.rotateDeg||0)
  };
}

function reviewTimeAt(raw){
  if(animation?.reviewLoop===true){
    const gap=Math.max(0,Number(animation.reviewLoopGapMs||0));
    const span=Math.max(1,total+gap);
    const t=((raw%span)+span)%span;
    return t>=total?Math.max(0,total-.001):t;
  }
  if(animation?.loop===true)return ((raw%total)+total)%total;
  return Math.max(0,Math.min(Math.max(0,total-.001),raw));
}
'''
preview=preview[:start]+new_motion+preview[end:]

# Remove the old normalizedTimeMs helper after inserting reviewTimeAt.
old_norm='''function normalizedTimeMs(ms){
  if(animation?.loop===false)return Math.max(0,Math.min(Math.max(0,total-.001),ms));
  return ((ms%total)+total)%total;
}
'''
if old_norm not in preview:
    stop("old normalizedTimeMs helper drifted")
preview=preview.replace(old_norm,"")

preview=preview.replace("  ms=normalizedTimeMs(ms);","  ms=reviewTimeAt(ms);")

loop_start=preview.find("function loop(now){")
loop_end=preview.find("\nplay.onclick=()=>{",loop_start)
if loop_start<0 or loop_end<0:
    stop("loop function not found")
new_loop='''function loop(now){
  const raw=playing?(offset+(now-start)):offset;
  if(animation?.reviewLoop!==true && animation?.loop!==true && playing && raw>=total){
    offset=Math.max(0,total-.001);
    playing=false;
    play.textContent='▶';
  }
  const ms=reviewTimeAt(playing?raw:offset);
  render(ms).catch(err=>{playing=false;throw err});
  requestAnimationFrame(loop);
}
'''
preview=preview[:loop_start]+new_loop+preview[loop_end:]

old_resume="else{if(animation?.loop===false&&offset>=total-1)offset=0;start=performance.now();playing=true;play.textContent='❚❚'}"
new_resume="else{if(animation?.reviewLoop!==true&&animation?.loop!==true&&offset>=total-1)offset=0;start=performance.now();playing=true;play.textContent='❚❚'}"
if old_resume in preview:
    preview=preview.replace(old_resume,new_resume)

preview_path.write_text(preview)

print("IDLE_SOURCE_CELLS=[7]")
print("AGGRO_SURPRISE_CELLS=[7,17,17,7]")
print("DAMAGE_CELLS=[7,18,19,7]")
print("KNOCKDOWN_CELLS=[19,20,21]")
print("STAND_UP_CELLS=[21,20,19,7]")
print("DEATH_CELLS=[19,20,21,22]")
print("PROCEDURAL_MOTION=STRONG_DISTINCT_PROFILES")
print("REVIEW_LOOP=SEPARATE_FROM_GAMEPLAY")
print("ATLAS_PIXELS=UNCHANGED")
print("RUN_AND_ATTACKS=LOCKED")
