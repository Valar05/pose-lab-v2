#!/usr/bin/env python3
from __future__ import annotations
import copy,json,sys
from pathlib import Path

root=Path(sys.argv[1]).resolve()
contract=json.loads((root/sys.argv[2]).read_text())

paths={
 "undercut":root/"public/assets/vanguard/procedural/undercut-strike.recipe.json",
 "uppercut":root/"public/assets/vanguard/procedural/attack2-uppercut.recipe.json",
 "jab":root/"public/assets/vanguard/procedural/attack5.recipe.json",
 "horizontal":root/"public/assets/vanguard/procedural/horizontal-strike.recipe.json",
 "buttStrike":root/"public/assets/vanguard/procedural/butt-smash.recipe.json",
 "shoulderCharge":root/"public/assets/vanguard/procedural/shoulder-charge.recipe.json",
}
r={k:json.loads(p.read_text()) for k,p in paths.items()}

def stop(m): raise SystemExit("STOP: "+m)

expected={
 "undercut":{"dur":[75,75,70,45,45,125,90,95,90,105],"cells":{"idle":2,"chamber":79,"commit":77,"preimpact":64,"contact":68,"slash-right":5}},
 "uppercut":{"dur":[25,25,190,125,150,105,80,55],"cells":{"idle":2,"chamber":20,"rise":32,"contact":21,"slash-right":3}},
 "jab":{"dur":[33,109,109,109,108,108,74],"cells":{"idle":2,"coil":65,"drive":75,"finish":87,"spray":9}},
 "horizontal":{"dur":[65,125,130,155,85,90],"cells":{"idle":2,"chamber":80,"commit":62,"contact":61,"slash-right":8}},
 "buttStrike":{"dur":[70,160,140,240,90],"cells":{"idle":2,"windup":91,"drive":92,"impact":93,"dummyFx":9}},
 "shoulderCharge":{"dur":[70,165,55,80,90,150],"cells":{"idle":2,"brace":94,"impact":95,"dummyFx":9,"shoulderWake":10}},
}
for name,ex in expected.items():
    rr=r[name]
    if [p["durationMs"] for p in rr["phases"]]!=ex["dur"]: stop(f"{name} timing changed")
    if rr.get("rootMotion") is not False: stop(f"{name} rootMotion changed")
    for sid,cell in ex["cells"].items():
        if rr["sources"][sid]["cell"]!=cell: stop(f"{name}:{sid} source changed")

# Existing accepted envelopes for undercut/uppercut remain exactly the same.
for name in ["undercut","uppercut"]:
    env=contract["envelopes"][name]
    for p in r[name]["phases"]:
        if p["id"] not in env: stop(f"{name} phase mismatch")
        if p.get("blur",{}).get("amount")!=env[p["id"]]: stop(f"{name}:{p['id']} accepted blur changed")

base=copy.deepcopy(contract["motionBlur"])
for name in ["undercut","uppercut","jab","horizontal","buttStrike","shoulderCharge"]:
    rr=r[name]

    # Overhand's echo-shadow look comes from its same blur profile plus
    # source-local removal of only border-connected black background pixels.
    for sid,src in rr["sources"].items():
        if src.get("role")=="body":
            src["backgroundKey"]="black-border"
            src["backgroundKeyThreshold"]=18

    cfg=copy.deepcopy(base)
    cfg["directionStage"]=contract["directions"][name]
    rr["motionBlur"]=cfg

    env=contract["envelopes"][name]
    for p in rr["phases"]:
        if p["id"] not in env: stop(f"{name} missing envelope for {p['id']}")
        p["blur"]={"amount":env[p["id"]]}
    if set(env)!={p["id"] for p in rr["phases"]}: stop(f"{name} envelope mismatch")

for name,p in paths.items():
    p.write_text(json.dumps(r[name],indent=2)+"\n")

print("ECHO_SHADOW_PARITY=BLACK_BORDER_KEY_ON_ALL_NON_OVERHAND_BODY_SOURCES")
print("UNDERCUT_ENVELOPE=UNCHANGED")
print("UPPERCUT_ENVELOPE=UNCHANGED")
print("JAB_BLUR_TAIL=SHORTENED")
print("HORIZONTAL_BLUR_TAIL=SHORTENED")
print("BUTT_STRIKE_BLUR=ADDED")
print("SHOULDER_CHARGE_TACKLE_BLUR=ADDED")
print("TIMING=LOCKED")
print("POSES=LOCKED")
print("EFFECTS=LOCKED")
print("ROOT_MOTION=LOCKED_OFF")
