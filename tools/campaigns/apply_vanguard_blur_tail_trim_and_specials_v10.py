#!/usr/bin/env python3
from __future__ import annotations
import copy,json,sys
from pathlib import Path

root=Path(sys.argv[1]).resolve()
contract=json.loads((root/sys.argv[2]).read_text())

paths={
 "jab":root/"public/assets/vanguard/procedural/attack5.recipe.json",
 "horizontal":root/"public/assets/vanguard/procedural/horizontal-strike.recipe.json",
 "buttStrike":root/"public/assets/vanguard/procedural/butt-smash.recipe.json",
 "shoulderCharge":root/"public/assets/vanguard/procedural/shoulder-charge.recipe.json",
 "overhand":root/"public/assets/vanguard/procedural/overhand-strike.recipe.json",
 "undercut":root/"public/assets/vanguard/procedural/undercut-strike.recipe.json",
 "uppercut":root/"public/assets/vanguard/procedural/attack2-uppercut.recipe.json",
}
r={k:json.loads(p.read_text()) for k,p in paths.items()}

def stop(m): raise SystemExit("STOP: "+m)

# Lock accepted blur envelopes. Under/upper may only adopt Overhand's alpha-composite presentation.
accepted={
 "overhand":{"idle":0.0,"anticipation":0.0,"chamber":0.0,"cross-commit":0.32,"lean-forward":1.0,"contact":0.46,"follow-through":0.08,"recoil-1":0.0,"recoil-2":0.0,"idle-return":0.0},
 "undercut":{"idle":0.0,"anticipation":0.0,"low-chamber":0.08,"undercut-commit":0.42,"rise-through":1.0,"high-contact":0.50,"high-follow-through":0.10,"recoil-1":0.0,"recoil-2":0.0,"idle-return":0.0},
 "uppercut":{"idle":0.0,"anticipation":0.0,"low-chamber":0.08,"rising-drive":1.0,"high-contact":0.52,"high-follow-through":0.10,"recoil":0.0,"idle-return":0.0},
}
for name,env in accepted.items():
    rr=r[name]
    for p in rr["phases"]:
        if p["id"] not in env: stop(f"{name} unexpected phase {p['id']}")
        if p.get("blur",{}).get("amount")!=env[p["id"]]: stop(f"{name}:{p['id']} accepted blur changed")
    if set(env)!={p["id"] for p in rr["phases"]}: stop(f"{name} accepted phase set changed")

# Freeze timing and pose identity for the four writable animations.
expected={
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

# Match the preferred Overhand echo-shadow presentation: only border-connected
# near-black background becomes transparent. Interior black character pixels survive.
for name in ["undercut","uppercut","jab","horizontal","buttStrike","shoulderCharge"]:
    for src in r[name]["sources"].values():
        if src.get("role")=="body":
            src["backgroundKey"]="black-border"
            src["backgroundKeyThreshold"]=18

# Blur-only mutation.
base=copy.deepcopy(contract["motionBlur"])
for name in ["jab","horizontal","buttStrike","shoulderCharge"]:
    rr=r[name]
    cfg=copy.deepcopy(base)
    cfg["directionStage"]=contract["directions"][name]
    rr["motionBlur"]=cfg
    env=contract["envelopes"][name]
    for p in rr["phases"]:
        if p["id"] not in env: stop(f"{name} missing envelope for {p['id']}")
        p["blur"]={"amount":env[p["id"]]}
    if set(env)!={p["id"] for p in rr["phases"]}: stop(f"{name} envelope phase mismatch")

for name in ["undercut","uppercut","jab","horizontal","buttStrike","shoulderCharge"]:
    paths[name].write_text(json.dumps(r[name],indent=2)+"\n")

print("JAB_BLUR_TAIL=SHORTENED")
print("HORIZONTAL_BLUR_TAIL=SHORTENED_APPROX_30_PERCENT")
print("BUTT_STRIKE_BLUR=ADDED")
print("SHOULDER_CHARGE_TACKLE_BLUR=ADDED")
print("OVERHAND=LOCKED_REFERENCE_STYLE")
print("UNDERCUT_UPPERCUT=ENVELOPES_LOCKED_ALPHA_COMPOSITE_MATCHED")
print("ECHO_SHADOW_STYLE=BLACK_BORDER_KEY_ON_ALL_ATTACK_BODY_SOURCES")
print("TIMING=LOCKED")
print("POSES=LOCKED")
print("EFFECTS=LOCKED")
print("ROOT_MOTION=LOCKED_OFF")
