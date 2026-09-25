#!/usr/bin/env bash
set -euo pipefail
export GIT_PAGER=cat PAGER=cat
P="$HOME/storage/documents/GodotProjects/pose-lab-v2"
L="$HOME/.local/state/pose-lab-v2-vanguard-live"; W="$L/worktree"
FXIN="/storage/emulated/0/Download/vanguard-shotgun-fire-effect.png"
FX="public/assets/vanguard/procedural/vanguard-shotgun-fire-effect.png"
R="public/assets/vanguard/procedural/shotgun-reload.recipe.json"
F="public/assets/vanguard/procedural/shotgun-fire.recipe.json"
J="src/procedural-motion-preview.js"
A="public/assets/vanguard/procedural/vanguard-pose-atlas-90.png"
cd "$P"
cat AGENTS.md docs/POSE_LAB_CAMPAIGN_RULES.md docs/POSE_IS_GOD.md >/dev/null
echo "MISSION=two independent shotgun review animations"
echo "MUTABLE=$FX $R $F $J"
echo "LOCKED=canonical atlas + every pre-existing recipe"
git status --short
git diff --quiet HEAD -- "$A" || { echo "STOP: canonical atlas dirty"; exit 1; }
git diff --quiet HEAD -- "$J" || { echo "STOP: renderer/registry dirty"; exit 1; }
git fetch origin main
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || git merge --ff-only origin/main
START=$(git rev-parse HEAD)
mkdir -p "$L/shotgun-dual"
python3 - "$P" "$L/shotgun-dual/locks.json" <<'PY'
from pathlib import Path
import hashlib,json,sys
r=Path(sys.argv[1]); o={}
for p in sorted((r/"public/assets/vanguard/procedural").glob("*.recipe.json")): o[str(p.relative_to(r))]=hashlib.sha256(p.read_bytes()).hexdigest()
p=r/"public/assets/vanguard/procedural/vanguard-pose-atlas-90.png"; o[str(p.relative_to(r))]=hashlib.sha256(p.read_bytes()).hexdigest()
Path(sys.argv[2]).write_text(json.dumps(o))
PY
test -f "$FXIN" || { echo "STOP: exact muzzle source missing"; exit 1; }
python3 - "$FXIN" "$P/$A" <<'PY'
from PIL import Image
import sys
assert Image.open(sys.argv[1]).size==(240,165)
assert Image.open(sys.argv[2]).size==(1037,1728)
PY
cp -f "$FXIN" "$FX"
FXSHA=$(sha256sum "$FX" | awk '{print $1}')
python3 - "$P" "$FXSHA" <<'PY'
from pathlib import Path
import json,sys
r=Path(sys.argv[1]); h=sys.argv[2]
rb={**{str(i):[round(i*1536/15),round((i+1)*1536/15)] for i in range(15)},"15":[1536,1632],"16":[1632,1728]}
atlas={"path":"assets/vanguard/procedural/vanguard-pose-atlas-90.png","columns":6,"rows":17,"indexBase":1,"mode":"blue-key","size":[1037,1728],"rowBounds":rb}
def s(c): return {"kind":"atlas-cell","atlas":"vanguard-canonical","cell":c,"role":"body","trim":False,"registrationOffset":[0,0]}
def d(sh=0,sx=1,sy=1): return {"shearX":sh,"scaleX":sx,"scaleY":sy,"shiftX":0,"shiftY":0}
z={"reveal":0,"core":0,"tightGlow":0,"wideGlow":0}
es={"kind":"image","path":"assets/vanguard/procedural/vanguard-shotgun-fire-effect.png","role":"effect","trim":True,"sha256":h}
ef={"source":"muzzle","width":150,"position":[145,92],"pivot":[.5,.5],"alphaGain":1,"gradientStops":[{"at":0,"rgb":[110,20,0]},{"at":.18,"rgb":[255,105,0]},{"at":.55,"rgb":[255,20,8]},{"at":1,"rgb":[255,245,120]}],"tightGlowRgb":[255,180,28],"wideGlowRgb":[255,42,0],"tightBlurPx":2.2,"wideBlurPx":6.8,"tightOpacity":.65,"wideOpacity":.5,"revealMode":"none","rotateZDeg":0,"tiltXDeg":0,"yawYDeg":0,"scaleX":1,"scaleY":1,"flipX":False,"flipY":False,"depthSplit":0,"revealStartDeg":0,"revealSweepDeg":360,"liveControls":True}
base={"schema":"pose-lab-v2-procedural-motion-recipe-v1","subject":"vanguard","rootMotion":False,"canvas":{"size":[430,260],"background":[0,0,0,255],"anchor":[92,226],"anchorMeaning":"review-stage anchor; explicit foot pin remains human-review gated"},"atlases":{"vanguard-canonical":atlas},"bodyScale":1.5,"stage":{"centerX":215,"centerSource":"idle","mode":"native-pixel-scale-ground-anchor"}}
reload={**base,"id":"vanguard-shotgun-reload-procedural-v1","description":"Shotgun reload review · 91→92→93→idle","sources":{"idle":s(2),"open":s(91),"shell":s(92),"close":s(93),"muzzle":es},"phases":[{"id":"idle","source":"idle","durationMs":60,"deform":d(),"effect":z},{"id":"open","source":"open","durationMs":150,"deform":d(-.04,.99,1.01),"effect":z},{"id":"insert","source":"shell","durationMs":220,"deform":d(),"effect":z},{"id":"close","source":"close","durationMs":150,"deform":d(.03),"effect":z},{"id":"idle-return","source":"idle","durationMs":120,"deform":d(),"effect":z}],"effect":ef,"motionAuthority":{"kind":"user-authored-reload","description":"91,92,93 are pose authority; no visible effect; no guessed foot point."}}
fire={**base,"id":"vanguard-shotgun-fire-procedural-v1","description":"Shotgun fire review · 97→98→99 + dedicated muzzle","sources":{"idle":s(2),"brace":s(97),"drive":s(98),"recoil":s(99),"muzzle":es},"phases":[{"id":"idle","source":"idle","durationMs":45,"deform":d(),"effect":z},{"id":"brace","source":"brace","durationMs":100,"deform":d(-.08,.985,1.015),"effect":z},{"id":"fire","source":"drive","durationMs":70,"deform":d(.12,1.035,.985),"effect":{"reveal":1,"core":1,"tightGlow":.8,"wideGlow":.42}},{"id":"recoil","source":"recoil","durationMs":125,"deform":d(-.08,.98,1.02),"effect":{"reveal":.35,"core":.32,"tightGlow":.22,"wideGlow":.12}},{"id":"idle-return","source":"idle","durationMs":120,"deform":d(),"effect":z}],"effect":ef,"motionAuthority":{"kind":"user-authored-shotgun-fire","description":"97,98,99 are pose authority; dedicated exact muzzle; no root motion; pin/effect placement review-gated."}}
(r/"public/assets/vanguard/procedural/shotgun-reload.recipe.json").write_text(json.dumps(reload,indent=2)+"\n")
(r/"public/assets/vanguard/procedural/shotgun-fire.recipe.json").write_text(json.dumps(fire,indent=2)+"\n")
PY
python3 - "$J" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]); s=p.read_text()
pairs=[
("const animation=requested==='vanguard-shoulder-charge'\n  ? 'vanguard-shoulder-charge'","const animation=requested==='vanguard-shotgun-reload'\n  ? 'vanguard-shotgun-reload'\n  : requested==='vanguard-shotgun-fire'\n  ? 'vanguard-shotgun-fire'\n  : requested==='vanguard-shoulder-charge'\n  ? 'vanguard-shoulder-charge'"),
("const isShoulderCharge=animation==='vanguard-shoulder-charge';","const isShotgunReload=animation==='vanguard-shotgun-reload';\nconst isShotgunFire=animation==='vanguard-shotgun-fire';\nconst isShoulderCharge=animation==='vanguard-shoulder-charge';"),
("title:isShoulderCharge?'Vanguard Shoulder Charge':","title:isShotgunReload?'Vanguard Shotgun Reload':isShotgunFire?'Vanguard Shotgun Fire':isShoulderCharge?'Vanguard Shoulder Charge':"),
("const recipePath=isShoulderCharge\n   ? './assets/vanguard/procedural/shoulder-charge.recipe.json'","const recipePath=isShotgunReload\n   ? './assets/vanguard/procedural/shotgun-reload.recipe.json'\n   : isShotgunFire\n   ? './assets/vanguard/procedural/shotgun-fire.recipe.json'\n   : isShoulderCharge\n   ? './assets/vanguard/procedural/shoulder-charge.recipe.json'")
]
for old,new in pairs:
 assert old in s, "STOP: registry contract changed"
 s=s.replace(old,new,1)
p.write_text(s)
PY
node --check "$J"
python3 - "$P" "$L/shotgun-dual/locks.json" <<'PY'
from pathlib import Path
import hashlib,json,sys
r=Path(sys.argv[1]); locks=json.loads(Path(sys.argv[2]).read_text())
for rel,want in locks.items():
 assert hashlib.sha256((r/rel).read_bytes()).hexdigest()==want, "STOP: locked artifact changed: "+rel
print("LOCKS=PASS")
PY
git add "$FX" "$R" "$F" "$J"
git commit -m "Add Vanguard shotgun reload and fire reviews"
git push origin main
REV=$(git rev-parse HEAD)
git worktree remove --force "$W" 2>/dev/null || true
rm -rf "$W"; git worktree add --detach "$W" "$REV"; cd "$W"
node --check "$J"; npm run build
[ ! -f "$L/server.pid" ] || kill "$(cat "$L/server.pid")" 2>/dev/null || true
python3 -m http.server 8766 --bind 127.0.0.1 --directory "$W/dist" >"$L/server.log" 2>&1 &
PID=$!; echo "$PID" >"$L/server.pid"; sleep 2; kill -0 "$PID"
RU="http://127.0.0.1:8766/motion.html?procedural=vanguard-shotgun-reload&rev=$REV"
FU="http://127.0.0.1:8766/motion.html?procedural=vanguard-shotgun-fire&rev=$REV"
echo "REV=$REV"; echo "RELOAD=$RU"; echo "FIRE=$FU"
termux-open-url "$RU"
