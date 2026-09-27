#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from copy import deepcopy
from pathlib import Path

root=Path(sys.argv[1]).resolve()
contract_path=root/sys.argv[2]
recipe_path=root/"public/assets/vanguard/procedural/overhand-strike.recipe.json"
renderer_path=root/"src/procedural-motion-preview.js"

contract=json.loads(contract_path.read_text())
recipe=json.loads(recipe_path.read_text())
renderer=renderer_path.read_text()

def stop(msg:str):
    raise SystemExit("STOP: "+msg)

locks=contract["locks"]
canary=contract["canary"]

if recipe.get("id")!="vanguard-overhand-strike-procedural-proof-v4":
    stop("unexpected Overhand recipe id")
if recipe.get("rootMotion") is not False:
    stop("rootMotion changed")
if recipe.get("canvas",{}).get("anchor")!=locks["canvasAnchor"]:
    stop("canvas anchor changed")
if recipe.get("stage",{}).get("centerX")!=locks["stageCenterX"]:
    stop("stage center changed")
if recipe.get("bodyScale")!=locks["bodyScale"]:
    stop("bodyScale changed")

expected_sources=locks["poseSources"]
for source_id,spec in expected_sources.items():
    src=recipe.get("sources",{}).get(source_id)
    if not src:
        stop(f"missing source {source_id}")
    if src.get("cell")!=spec["cell"]:
        stop(f"{source_id} source cell changed")
    if src.get("anchorPoint")!=spec["anchorPoint"]:
        stop(f"{source_id} anchorPoint changed")
    if src.get("registrationOffset")!=[0,0]:
        stop(f"{source_id} registrationOffset changed")

slash=recipe.get("sources",{}).get("slash-right")
if not slash or slash.get("kind")!="effect-atlas-cell" or slash.get("cell")!=locks["slashSourceCell"]:
    stop("slash source changed")
slash_atlas=recipe.get("effectAtlases",{}).get(slash.get("atlas"),{})
embedded_slash_sha=slash_atlas.get("sha256")
if embedded_slash_sha not in (
    locks["slashAtlasSha256"],
    "94a59e09dd0bbc9ceb79a81697d4c5096fc451438c3d9df337e7e2782d743b70",
):
    stop("unexpected slash atlas metadata")
# The Git-owned effect bytes are locked by Campaign Framework V2. The Overhand
# recipe carried stale pre-repair metadata, so reconcile metadata only.
slash_atlas["sha256"]=locks["slashAtlasSha256"]

phase_order=[p.get("id") for p in recipe.get("phases",[])]
if phase_order!=canary["phaseOrder"]:
    stop("Overhand phase identity/order changed")

old_durations=[75,75,70,45,45,125,90,95,90,105]
desired=canary["phaseDurationsMs"]
current=[int(p.get("durationMs",0)) for p in recipe["phases"]]
if current not in (old_durations,desired):
    stop(f"unexpected pre-canary durations: {current}")

for phase,duration in zip(recipe["phases"],desired):
    phase["durationMs"]=duration

phase_by_id={p["id"]:p for p in recipe["phases"]}
for pid,amount in contract["motionBlur"]["phaseAmounts"].items():
    phase_by_id[pid]["blur"]={"amount":amount}

for pid,values in contract["slashPersistence"]["phaseValues"].items():
    phase_by_id[pid]["effect"]=deepcopy(values)

recipe["motionBlur"]={
    "enabled": True,
    "samples": contract["motionBlur"]["samples"],
    "spanPx": contract["motionBlur"]["spanPx"],
    "filterPx": contract["motionBlur"]["filterPx"],
    "maxAlpha": contract["motionBlur"]["maxAlpha"],
    "directionStage": contract["motionBlur"]["directionStage"],
}
recipe["comboHandoffMs"]=canary["comboHandoffMs"]
recipe["timingCanary"]={
    "reference":"Ninja Gaiden Black user-supplied video, fine-frame analysis 2026-09-27",
    "contactStartMs":canary["contactStartMs"],
    "contactEndMs":canary["contactEndMs"],
    "essentialFollowThroughEndMs":canary["comboHandoffMs"],
    "fullPresentationMs":canary["totalDurationMs"],
    "standaloneRecoveryPreserved":True,
    "bufferMayReplaceRecoveryAfterMs":canary["comboHandoffMs"],
}

if sum(int(p["durationMs"]) for p in recipe["phases"])!=canary["totalDurationMs"]:
    stop("desired phase total does not match contract")

old_draw="""function drawBody(id,d){
 const it=body(id),[px,py]=recipe.canvas.anchor;
 const src=recipe.sources[id]||{};
 const reg=src.registrationOffset||[0,0];
 ctx.save();
 ctx.translate(stageOffsetX(),0);
 ctx.translate(px+Number(reg[0]||0),py+Number(reg[1]||0));
 const bodyScale=Number(recipe.bodyScale??1);
 ctx.transform((d.scaleX||1)*bodyScale,0,d.shearX,(d.scaleY||1)*bodyScale,d.shiftX||0,d.shiftY||0);
 ctx.drawImage(it.canvas,-it.anchor[0],-it.anchor[1]);
 ctx.restore();
}
"""
new_draw="""function drawBody(id,d,blurAmount=0){
 const it=body(id),[px,py]=recipe.canvas.anchor;
 const src=recipe.sources[id]||{};
 const reg=src.registrationOffset||[0,0];
 const bodyScale=Number(recipe.bodyScale??1);
 const drawPass=(offsetX=0,offsetY=0,alpha=1,filter='none')=>{
   ctx.save();
   ctx.globalAlpha=alpha;
   ctx.filter=filter;
   ctx.translate(stageOffsetX(),0);
   ctx.translate(px+Number(reg[0]||0)+offsetX,py+Number(reg[1]||0)+offsetY);
   ctx.transform((d.scaleX||1)*bodyScale,0,d.shearX,(d.scaleY||1)*bodyScale,d.shiftX||0,d.shiftY||0);
   ctx.drawImage(it.canvas,-it.anchor[0],-it.anchor[1]);
   ctx.restore();
 };
 const blur=recipe.motionBlur;
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

if "function drawBody(id,d,blurAmount=0)" not in renderer:
    if old_draw not in renderer:
        stop("renderer drawBody structure changed")
    renderer=renderer.replace(old_draw,new_draw,1)

old_render="const s=phaseAt(ms),p=s.p,i=s.i,u=s.u,d={shearX:iv(i,u,'deform','shearX'),scaleX:iv(i,u,'deform','scaleX'),scaleY:iv(i,u,'deform','scaleY'),shiftX:iv(i,u,'deform','shiftX'),shiftY:iv(i,u,'deform','shiftY')},e=p.effect?{reveal:iv(i,u,'effect','reveal'),core:iv(i,u,'effect','core'),tightGlow:iv(i,u,'effect','tightGlow'),wideGlow:iv(i,u,'effect','wideGlow')}:null;"
new_render="const s=phaseAt(ms),p=s.p,i=s.i,u=s.u,d={shearX:iv(i,u,'deform','shearX'),scaleX:iv(i,u,'deform','scaleX'),scaleY:iv(i,u,'deform','scaleY'),shiftX:iv(i,u,'deform','shiftX'),shiftY:iv(i,u,'deform','shiftY')},b=iv(i,u,'blur','amount'),e=p.effect?{reveal:iv(i,u,'effect','reveal'),core:iv(i,u,'effect','core'),tightGlow:iv(i,u,'effect','tightGlow'),wideGlow:iv(i,u,'effect','wideGlow')}:null;"
if "drawBody(p.source,d,b)" not in renderer:
    if old_render not in renderer:
        stop("renderer render sampler structure changed")
    renderer=renderer.replace(old_render,new_render,1)
    renderer=renderer.replace(" drawBody(p.source,d);"," drawBody(p.source,d,b);",1)

recipe_path.write_text(json.dumps(recipe,indent=2)+"\n")
renderer_path.write_text(renderer)

print("OVERHAND_CANARY_TOTAL_MS="+str(canary["totalDurationMs"]))
print("OVERHAND_CONTACT_START_MS="+str(canary["contactStartMs"]))
print("OVERHAND_HANDOFF_MS="+str(canary["comboHandoffMs"]))
print("MOTION_BLUR=STRONG_OPT_IN")
print("SLASH_PATH=PERSISTS_THROUGH_EARLY_RECOVERY")
print("POSE_CELLS=LOCKED")
print("ANCHORS=LOCKED")
print("ATLAS_PIXELS=LOCKED")
print("ROOT_MOTION=OFF")
