#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import statistics
import sys
from copy import deepcopy
from pathlib import Path

from PIL import Image

root=Path(sys.argv[1])
contract_path=root/sys.argv[2]
manifest_path=root/"public/assets/vanguard/fleshpunk/characters/swarmling/animations.json"
atlas_path=root/"public/assets/vanguard/fleshpunk/characters/swarmling/source/swarmling-approved-atlas.png"
preview_path=root/"src/procedural-swarmling-preview.js"
shell_path=root/"src/procedural-review-shell.js"
package_path=root/"package.json"

contract=json.loads(contract_path.read_text())
manifest=json.loads(manifest_path.read_text())
atlas=Image.open(atlas_path).convert("RGBA")

if manifest.get("character")!="Swarmling" or manifest.get("lineage")!="vanguard-side-2d-sprite":
    raise SystemExit("STOP: wrong Swarmling manifest")
if manifest.get("authority",{}).get("sourceByteSha256")!=contract["authority"]["atlasSha256"]:
    raise SystemExit("STOP: manifest atlas authority drifted")
if atlas.size!=(1536,1024):
    raise SystemExit("STOP: canonical Swarmling atlas dimensions drifted")

def animation(aid):
    return next((a for a in manifest["animations"] if a.get("id")==aid),None)

locked=contract["lockedAcceptedState"]
run=animation("run")
if not run:
    raise SystemExit("STOP: accepted Run missing")
if [f.get("sourceCell") for f in run["frames"]]!=locked["run"]["sourceCells"]:
    raise SystemExit("STOP: accepted Run source cells drifted")
if [f.get("anchorPoint") for f in run["frames"]]!=locked["run"]["anchors"]:
    raise SystemExit("STOP: accepted Run anchors drifted")

for aid in ("jab","rake","scythe-bloom"):
    a=animation(aid)
    spec=locked[aid]
    if not a:
        raise SystemExit(f"STOP: accepted {aid} missing")
    if [f.get("sourceCell") for f in a["frames"]]!=spec["sourceCells"]:
        raise SystemExit(f"STOP: accepted {aid} source cells drifted")
    if [f.get("sourceCell") for f in a["timeline"]]!=spec["timelineCells"]:
        raise SystemExit(f"STOP: accepted {aid} timeline drifted")
    if a.get("stageAnchor")!=spec["stageAnchor"]:
        raise SystemExit(f"STOP: accepted {aid} stage anchor drifted")
if animation("jab")["frames"][1]["sourceCell"]!=15:
    raise SystemExit("STOP: Needle Jab impact cell drifted")

def rect(cell:int):
    idx=cell-1
    col=idx%6
    row=idx//6
    return (col*256,row*256,(col+1)*256,(row+1)*256)

def body_ground_anchor(cell:int):
    im=atlas.crop(rect(cell))
    px=im.load()
    points=[]
    for y in range(256):
        for x in range(256):
            r,g,b,a=px[x,y]
            if a>0 and max(r,g,b)>40:
                points.append((x,y))
    if not points:
        raise SystemExit(f"STOP: empty source cell {cell}")
    ys=[y for _,y in points]
    ymin,ymax=min(ys),max(ys)
    height=max(1,ymax-ymin+1)
    lo=max(0,int(round(ymin+height*.24)))
    hi=min(255,int(round(ymin+height*.72)))
    core=[]
    for y in range(lo,hi+1):
        for x in range(256):
            r,g,b,a=px[x,y]
            if a>0 and max(r,g,b)>55:
                core.append(x)
    if not core:
        core=[x for x,_ in points]
    return [int(round(statistics.median(core))), int(ymax)]

utility=contract["utilityAnimations"]
new_anims=[]
for aid,spec in utility.items():
    timeline=[]
    for phase in spec["timeline"]:
        item=deepcopy(phase)
        item["anchorPoint"]=body_ground_anchor(int(item["sourceCell"]))
        timeline.append(item)
    new_anims.append({
        "id":aid,
        "label":spec["label"],
        "loop":bool(spec["loop"]),
        "rootMotion":False,
        "stageAnchor":spec["stageAnchor"],
        "semantic":spec["semantic"],
        "contract":[
            "canonical atlas pose authority",
            "body-core X + ground Y registration",
            "root motion OFF; engine owns translation",
            "utility animation; no combat active window"
        ],
        "timeline":timeline,
        "procedural":{
            "interpolation":"smoothstep-deform-only",
            "pivot":"body-core-x-ground-y",
            "rootTranslation":False,
            "allowed":["shearX","scaleX","scaleY","rotateDeg"],
            "forbidden":["shiftX","shiftY","root motion","stage translation"]
        },
        "pinAuthority":{
            "mode":"body-core-x-ground-y",
            "source":"canonical Swarmling atlas"
        }
    })

utility_ids=set(utility)
manifest["animations"]=[a for a in manifest["animations"] if a.get("id") not in utility_ids]+new_anims
manifest["authority"]["utilityPack"]={
    "contract":"campaigns/swarmling-utility-pack.contract.json",
    "animations":list(utility.keys()),
    "knockdownTerminalCell":21,
    "deathTerminalCell":22,
    "rootMotion":False
}
manifest_path.write_text(json.dumps(manifest,indent=2)+"\n")

preview=preview_path.read_text()
route_match=re.search(r"const routeLabels=Object\.freeze\(\{.*?\}\);",preview,re.S)
if not route_match:
    raise SystemExit("STOP: routeLabels declaration not found")
labels={
    "run":"Swarmling Run",
    "jab":"Swarmling Needle Jab",
    "rake":"Swarmling Low Rake",
    "scythe-bloom":"Swarmling Scythe Bloom",
    "idle":"Swarmling Idle",
    "aggro":"Swarmling Aggro / Attention",
    "damage":"Swarmling Damage / Hit React",
    "knockdown":"Swarmling Knockdown",
    "stand-up":"Swarmling Stand Up",
    "death":"Swarmling Death"
}
route_lines=["const routeLabels=Object.freeze({"]
for key,val in labels.items():
    route_lines.append(f"  {json.dumps(key)}:{json.dumps(val)},")
route_lines.append("});")
preview=preview[:route_match.start()]+"\n".join(route_lines)+preview[route_match.end():]
preview=preview.replace(
    "if(animation.rootMotion!==false && animationId!=='run')throw new Error('Swarmling attack root motion must be OFF');",
    "if(animation.rootMotion!==false && animationId!=='run')throw new Error('Swarmling root motion must be OFF');"
)
if "Swarmling root motion must be OFF" not in preview:
    raise SystemExit("STOP: root-motion runtime guard patch failed")
preview_path.write_text(preview)

shell=shell_path.read_text()
pattern=r"swarmling:\s*\[\['swarmling-run'.*?\]\n\}\);"
match=re.search(pattern,shell,re.S)
if not match:
    raise SystemExit("STOP: Swarmling selector declaration not found")
selector="swarmling: ["+(",".join([
    "['swarmling-run','Run']",
    "['swarmling-idle','Idle']",
    "['swarmling-aggro','Aggro / Attention']",
    "['swarmling-damage','Damage / Hit React']",
    "['swarmling-knockdown','Knockdown']",
    "['swarmling-stand-up','Stand Up']",
    "['swarmling-death','Death']",
    "['swarmling-jab','Needle Jab']",
    "['swarmling-rake','Low Rake']",
    "['swarmling-scythe-bloom','Scythe Bloom']"
]))+"]\n});"
shell=shell[:match.start()]+selector+shell[match.end():]
shell_path.write_text(shell)

pkg=json.loads(package_path.read_text())
pkg["scripts"]["test:swarmling-utility"]="node tools/test_swarmling_utility_animations.mjs"
package_path.write_text(json.dumps(pkg,indent=2)+"\n")

for aid in utility:
    a=animation(aid)
    print(f"{aid.upper()}_CELLS="+json.dumps([x["sourceCell"] for x in a["timeline"]]))
    print(f"{aid.upper()}_ANCHORS="+json.dumps([x["anchorPoint"] for x in a["timeline"]]))
print("KNOCKDOWN_TERMINAL=21")
print("DEATH_TERMINAL=22")
print("ROOT_MOTION=OFF")
