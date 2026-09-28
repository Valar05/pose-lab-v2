#!/usr/bin/env python3
from __future__ import annotations
import copy,json,sys
from pathlib import Path

root=Path(sys.argv[1]).resolve()
contract=json.loads((root/sys.argv[2]).read_text())

FILES={
  "overhand": root/"public/assets/vanguard/procedural/overhand-strike.recipe.json",
  "undercut": root/"public/assets/vanguard/procedural/undercut-strike.recipe.json",
  "uppercut": root/"public/assets/vanguard/procedural/attack2-uppercut.recipe.json",
  "horizontal": root/"public/assets/vanguard/procedural/horizontal-strike.recipe.json",
  "jab": root/"public/assets/vanguard/procedural/attack5.recipe.json",
}
recipes={k:json.loads(p.read_text()) for k,p in FILES.items()}

def stop(m): raise SystemExit("STOP: "+m)

# Freeze current authorities before blur-only mutation.
expected={
 "overhand":{"dur":[25,45,45,30,25,70,70,95,90,105],"cells":{"idle":2,"chamber":26,"commit":40,"preimpact":32,"contact":35},"root":False},
 "undercut":{"dur":[75,75,70,45,45,125,90,95,90,105],"cells":{"idle":2,"chamber":79,"commit":77,"preimpact":64,"contact":68},"root":False},
 "uppercut":{"dur":[25,25,190,125,150,105,80,55],"cells":{"idle":2,"chamber":20,"rise":32,"contact":21},"root":False},
 "horizontal":{"dur":[65,125,130,155,85,90],"cells":{"idle":2,"chamber":80,"commit":62,"contact":61},"root":False},
 "jab":{"dur":[33,109,109,109,108,108,74],"cells":{"idle":2,"coil":65,"drive":75,"finish":87},"root":False},
}
for name,r in recipes.items():
    ex=expected[name]
    if [p["durationMs"] for p in r["phases"]]!=ex["dur"]: stop(f"{name} timing changed before blur pass")
    if r.get("rootMotion") is not ex["root"]: stop(f"{name} rootMotion changed")
    for sid,cell in ex["cells"].items():
        if r["sources"][sid]["cell"]!=cell: stop(f"{name}:{sid} source cell changed")

# Explicitly retire rejected Overhand speed-line presentation only.
recipes["overhand"].pop("speedLineSprite",None)

base=copy.deepcopy(contract["motionBlur"])
for name in ["undercut","uppercut","horizontal","jab"]:
    r=recipes[name]
    cfg=copy.deepcopy(base)
    cfg["directionStage"]=contract["directions"][name]
    r["motionBlur"]=cfg
    env=contract["envelopes"][name]
    seen=set()
    for p in r["phases"]:
        if p["id"] not in env: stop(f"{name} missing blur authority for phase {p['id']}")
        p["blur"]={"amount":env[p["id"]]}
        seen.add(p["id"])
    if seen!=set(env): stop(f"{name} blur envelope has unknown phases")

for name,p in FILES.items():
    p.write_text(json.dumps(recipes[name],indent=2)+"\n")

print("OVERHAND_SPEED_LINES=REMOVED")
print("OVERHAND_TIMING_AND_BLUR=PRESERVED")
print("UNDERCUT=BLUR_ADDED_TIMING_PRESERVED")
print("UPPERCUT=BLUR_ADDED_TIMING_PRESERVED")
print("HORIZONTAL=BLUR_ADDED_TIMING_PRESERVED")
print("HALBERD_JAB=BLUR_ADDED_TIMING_PRESERVED")
print("POSES=LOCKED")
print("EFFECT_TRANSFORMS=LOCKED")
print("ROOT_MOTION=LOCKED_OFF")
