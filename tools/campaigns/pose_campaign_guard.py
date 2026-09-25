#!/usr/bin/env python3
import json, hashlib, subprocess, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
CONTRACT=ROOT/"campaigns/vanguard-attack5.contract.json"
RECIPE=ROOT/"public/assets/vanguard/procedural/attack5.recipe.json"
def die(m): raise SystemExit("STOP: "+m)
def blob_sha(path):
    data=Path(path).read_bytes()
    hdr=f"blob {len(data)}\0".encode()
    return hashlib.sha1(hdr+data).hexdigest()
c=json.loads(CONTRACT.read_text()); r=json.loads(RECIPE.read_text())
for rel,want in c["lockedFiles"].items():
    p=ROOT/rel
    if not p.exists(): die("locked file missing: "+rel)
    got=blob_sha(p)
    if got!=want: die(f"LOCK VIOLATION {rel}: {got} != {want}")
for name,snap in c["bodySnapshot"].items():
    s=r["sources"][name]
    for k,v in snap.items():
        if s.get(k)!=v: die(f"accepted body changed: {name}.{k}: {s.get(k)} != {v}")
for name in ("coil","drive","finish"):
    if r["sources"][name].get("anchorMode")!="explicit-point": die(name+" must use explicit-point")
if r["motionAuthority"].get("kind")!=c["timingAuthority"]["kind"]: die("timing authority changed")
if sum(int(p["durationMs"]) for p in r["phases"])!=c["timingAuthority"]["durationMs"]: die("duration changed")
fx=r["sources"][r["effect"]["source"]]
ea=c["effectAuthority"]
if ea["kind"]=="irregular-effect-rect":
    if fx.get("kind")!="effect-atlas-cell": die("effect must select from canonical effect sheet")
    if fx.get("atlas") not in r.get("effectAtlases",{}): die("effect atlas missing")
    es=r["effectAtlases"][fx["atlas"]]
    got=es.get("rects",{}).get(str(fx.get("cell")))
    if got!=ea["rect"]: die(f"effect extraction rect changed: {got} != {ea['rect']}")
else:
    die("unsupported effect authority kind: "+str(ea.get("kind")))
asset=ROOT/ea["atlasPath"]
if hashlib.sha256(asset.read_bytes()).hexdigest()!=ea["atlasSha256"]: die("effect atlas bytes changed")
changed=subprocess.run(["git","-C",str(ROOT),"diff","--name-only"],capture_output=True,text=True,check=True).stdout.splitlines()
allowed={"public/assets/vanguard/procedural/attack5.recipe.json","campaigns/vanguard-attack5.contract.json","tools/campaigns/pose_campaign_guard.py","tools/campaigns/vanguard-attack5-refresh.sh","docs/POSE_LAB_CAMPAIGN_RULES.md"}
bad=[x for x in changed if x and x not in allowed]
if bad: die("unauthorized tracked changes: "+", ".join(bad))
print("POSE_CAMPAIGN_GUARD_OK")
print("locked_files="+str(len(c["lockedFiles"])))
print("attack5_cells=65,75,87")
print("mutable_now="+",".join(c["mutableNow"]))
print("effect_rect="+str(ea["rect"]))
