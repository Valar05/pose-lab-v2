#!/usr/bin/env python3
import hashlib, json, subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
def die(m): raise SystemExit("STOP: "+m)
def blob_sha(p):
    b=Path(p).read_bytes(); return hashlib.sha1(f"blob {len(b)}\0".encode()+b).hexdigest()
locked={
"public/assets/vanguard/procedural/attack5.recipe.json":"b10fe105a34d83ff5d468bb8aacbbc2757370b5c",
"public/assets/vanguard/procedural/butt-smash.recipe.json":"8b979b23a737a575ce5566d339d6abea3aba4755",
"public/assets/vanguard/procedural/attack2-uppercut.recipe.json":"beebd70e69fa1faa09024624324a574d8f37afac",
}
for rel,want in locked.items():
    p=ROOT/rel
    if not p.exists() or blob_sha(p)!=want: die("LOCK VIOLATION "+rel)
r=json.loads((ROOT/"public/assets/vanguard/procedural/shoulder-charge.recipe.json").read_text())
if r["phases"][0]["source"]!="idle" or r["phases"][-1]["source"]!="idle": die("first/last phase must be idle")
if r["sources"]["idle"]["cell"]!=2: die("idle must be cell 2")
if r["sources"]["brace"]["cell"]!=89 or r["sources"]["impact"]["cell"]!=90: die("shoulder charge must use cells 89 and 90")
if r["motionAuthority"]["kind"]!="user-designated-canonical-atlas-poses": die("pose authority changed")
subprocess.run(["node","--check",str(ROOT/"src/procedural-motion-preview.js")],check=True)
print("SHOULDER_CHARGE_GUARD_OK")
print("cells=2,89,90")
print("first_last=idle")
