#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from copy import deepcopy
from pathlib import Path

root=Path(sys.argv[1]).resolve()
contract_path=root/sys.argv[2]
manifest_path=root/"public/assets/vanguard/fleshpunk/characters/swarmling/animations.json"

contract=json.loads(contract_path.read_text())
manifest=json.loads(manifest_path.read_text())

def stop(msg:str):
    raise SystemExit("STOP: "+msg)

by_id={a["id"]:a for a in manifest["animations"]}
locked=contract["lockedAcceptedState"]

if manifest.get("authority",{}).get("sourceByteSha256")!=locked["atlasSha256"]:
    stop("atlas authority changed")

run=by_id.get("run")
if not run:
    stop("Run missing")
if [f["sourceCell"] for f in run["frames"]]!=locked["run"]["sourceCells"]:
    stop("Run source cells changed")
if [f["anchorPoint"] for f in run["frames"]]!=locked["run"]["anchors"]:
    stop("Run anchors changed")

for aid in ("jab","rake","scythe-bloom"):
    a=by_id.get(aid)
    spec=locked[aid]
    if not a:
        stop(f"{aid} missing")
    if [f["sourceCell"] for f in a["frames"]]!=spec["frames"]:
        stop(f"{aid} authored source cells changed")
    if [f["sourceCell"] for f in a["timeline"]]!=spec["timeline"]:
        stop(f"{aid} timeline source cells changed")
    if [f["durationMs"] for f in a["timeline"]]!=spec["durations"]:
        stop(f"{aid} timeline durations changed")
    if a.get("stageAnchor")!=spec["stageAnchor"]:
        stop(f"{aid} stage anchor changed")
    timing=a.get("combatTiming",{})
    if timing.get("activeAtMs")!=spec["activeAtMs"]:
        stop(f"{aid} activeAt changed")
    if timing.get("activeDurationMs")!=spec["activeDurationMs"]:
        stop(f"{aid} activeDuration changed")
    if timing.get("attackEndMs")!=spec["attackEndMs"]:
        stop(f"{aid} attackEnd changed")
if by_id["jab"]["frames"][1]["sourceCell"]!=15:
    stop("Needle Jab impact cell changed")

for aid,cells in locked["utilityPoseSequences"].items():
    a=by_id.get(aid)
    if not a:
        stop(f"utility {aid} missing")
    if [f["sourceCell"] for f in a["timeline"]]!=cells:
        stop(f"{aid} pose sequence changed")

# Preserve the currently liked V4 damage physiology exactly.
if by_id["damage"].get("proceduralMotion")!=locked["damageProfile"]:
    stop("Damage profile changed before v5; expected accepted V4 profile")

for aid,profile in contract["profiles"].items():
    a=by_id.get(aid)
    if not a:
        stop(f"target animation missing: {aid}")
    a["proceduralMotion"]=deepcopy(profile)
    a.setdefault("procedural",{})["motionOverlay"]="proceduralMotion-v5-kernel"

manifest.setdefault("authority",{})["proceduralPhysiologyV5"]={
    "contract":"campaigns/swarmling-procedural-physiology-v5.contract.json",
    "kernel":"src/procedural-motion-kernel.js",
    "microPulseAggro":True,
    "idleLowShrink":True,
    "damageProfilePreserved":True,
    "attackProfiles":{
        "jab":"attack-snap",
        "rake":"attack-drag",
        "scythe-bloom":"attack-bloom"
    },
    "atlasPixelsChanged":False,
    "poseSelectionsChanged":False,
    "timingChanged":False,
    "stageAnchorsChanged":False
}
manifest_path.write_text(json.dumps(manifest,indent=2)+"\n")

print("AGGRO_MODE=micro-alert-cluster")
print("IDLE_MODE=deform-breath-v3")
print("IDLE_SCALE_AMPLITUDES=0.008,0.014")
print("DAMAGE_PROFILE=PRESERVED")
print("JAB_PROCEDURAL=attack-snap")
print("RAKE_PROCEDURAL=attack-drag")
print("SCYTHE_BLOOM_PROCEDURAL=attack-bloom")
print("POSE_CHOICES=UNCHANGED")
print("STAGE_ANCHORS=UNCHANGED")
print("TIMING=UNCHANGED")
print("ATLAS_PIXELS=UNCHANGED")
