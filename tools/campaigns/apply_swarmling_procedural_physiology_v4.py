#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
from copy import deepcopy
from pathlib import Path

root=Path(sys.argv[1]).resolve()
contract_path=root/sys.argv[2]
manifest_path=root/"public/assets/vanguard/fleshpunk/characters/swarmling/animations.json"
preview_path=root/"src/procedural-swarmling-preview.js"
package_path=root/"package.json"

contract=json.loads(contract_path.read_text())
manifest=json.loads(manifest_path.read_text())
preview=preview_path.read_text()
pkg=json.loads(package_path.read_text())

def stop(msg:str):
    raise SystemExit("STOP: "+msg)

by_id={a["id"]:a for a in manifest["animations"]}
locked=contract["lockedAcceptedState"]

run=by_id.get("run")
if not run:
    stop("accepted Run missing")
if [f["sourceCell"] for f in run["frames"]]!=locked["run"]["sourceCells"]:
    stop("Run source cells changed")
if [f["anchorPoint"] for f in run["frames"]]!=locked["run"]["anchors"]:
    stop("Run anchors changed")

for aid in ("jab","rake","scythe-bloom"):
    a=by_id.get(aid)
    spec=locked[aid]
    if not a:
        stop(f"accepted {aid} missing")
    if [f["sourceCell"] for f in a["frames"]]!=spec["sourceCells"]:
        stop(f"{aid} authored cells changed")
    if [f["sourceCell"] for f in a["timeline"]]!=spec["timelineCells"]:
        stop(f"{aid} timeline changed")
    if a.get("stageAnchor")!=spec["stageAnchor"]:
        stop(f"{aid} stage anchor changed")
if by_id["jab"]["frames"][1]["sourceCell"]!=15:
    stop("Needle Jab impact changed")

pose_sequences=contract["authority"]["poseSequences"]
for aid,cells in pose_sequences.items():
    a=by_id.get(aid)
    if not a:
        stop(f"utility animation missing: {aid}")
    if [f["sourceCell"] for f in a["timeline"]]!=cells:
        stop(f"{aid} pose sequence changed before physiology pass")
    if a.get("reviewLoop") is not True:
        stop(f"{aid} reviewLoop must already be true before physiology pass")

for aid,profile in contract["physiologyProfiles"].items():
    a=by_id[aid]
    a["proceduralMotion"]=deepcopy(profile)
    a.setdefault("procedural",{})["motionOverlay"]="proceduralMotion-v2-kernel"

manifest.setdefault("authority",{})["proceduralPhysiologyV4"]={
    "contract":"campaigns/swarmling-procedural-physiology-v4.contract.json",
    "kernel":"src/procedural-motion-kernel.js",
    "profiles":list(contract["physiologyProfiles"].keys()),
    "stateAware":True,
    "independentAxisPhase":True,
    "terminalStillness":True,
    "atlasPixelsChanged":False,
    "poseSequencesChanged":False
}
manifest_path.write_text(json.dumps(manifest,indent=2)+"\n")

import_line="import { evaluateProceduralMotion } from './procedural-motion-kernel.js';\n"
if import_line not in preview:
    first_import="import { createProceduralReviewShell } from './procedural-review-shell.js';\n"
    if first_import not in preview:
        stop("Swarmling preview import anchor missing")
    preview=preview.replace(first_import,first_import+import_line,1)

start=preview.find("function proceduralMotionAt(ms,state,base){")
end=preview.find("\nfunction reviewTimeAt(raw){",start)
if start<0 or end<0:
    stop("old inline proceduralMotionAt block missing")

new_block='''function proceduralMotionAt(ms,state,base){
  return evaluateProceduralMotion(
    animation?.proceduralMotion,
    {
      ms,
      phaseId:state?.item?.id||state?.item?.phase||'',
      phaseU:Number(state?.u||0)
    },
    base
  );
}
'''
preview=preview[:start]+new_block+preview[end:]
preview_path.write_text(preview)

pkg.setdefault("scripts",{})["test:procedural-motion-kernel"]="node tools/test_procedural_motion_kernel.mjs"
package_path.write_text(json.dumps(pkg,indent=2)+"\n")

print("PHYSIOLOGY_KERNEL=src/procedural-motion-kernel.js")
print("PHYSIOLOGY_PROFILES="+json.dumps(list(contract["physiologyProfiles"].keys())))
print("ATLAS_PIXELS=UNCHANGED")
print("POSE_SEQUENCES=UNCHANGED")
print("REVIEW_LOOP=UNCHANGED")
print("RUN_AND_ATTACKS=LOCKED")
