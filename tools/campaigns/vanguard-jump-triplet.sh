#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export GIT_PAGER=cat PAGER=cat

P="$HOME/storage/documents/GodotProjects/pose-lab-v2"
L="$HOME/.local/state/pose-lab-v2-vanguard-jump-triplet"
A="$L/authoring"
W="$L/review"

RULES_REL="docs/POSE_LAB_CAMPAIGN_RULES.md"
POSE_REL="docs/POSE_IS_GOD.md"
ATLAS_AUTH_REL="docs/VANGUARD_ATLAS_AUTHORITY.md"
ATLAS_REL="public/assets/vanguard/procedural/vanguard-pose-atlas-expanded.png"
RELOAD_REL="public/assets/vanguard/procedural/shotgun-reload.recipe.json"
EFFECT_REL="public/assets/vanguard/procedural/vanguard-shotgun-fire-effect.png"
JUMP_REL="public/assets/vanguard/procedural/jump.recipe.json"
MIDAIR_REL="public/assets/vanguard/procedural/midair.recipe.json"
LAND_REL="public/assets/vanguard/procedural/land.recipe.json"
RENDERER_REL="src/procedural-motion-preview.js"
SHELL_REL="src/procedural-review-shell.js"

cd "$P"
mkdir -p "$L"

cat AGENTS.md "$RULES_REL" "$POSE_REL" "$ATLAS_AUTH_REL" >/dev/null

echo "============================================================"
echo " VANGUARD JUMP / MIDAIR / LAND — CANONICAL ATLAS CAMPAIGN"
echo "============================================================"
echo "POSE_AUTHORITY=$ATLAS_REL"
echo "SOURCE_MAPPING=cell15->jump preload; cell16->jump launch; cell17->midair; cell18->land"
echo "ROOT_MOTION=OFF"
echo "TRAVEL=IN_PLACE"
echo "PRIMARY_WORKTREE=READ_ONLY"
echo "WRITABLE=$JUMP_REL"
echo "WRITABLE=$MIDAIR_REL"
echo "WRITABLE=$LAND_REL"
echo "WRITABLE=$RENDERER_REL route/title/recipe selection only"
echo "WRITABLE=$SHELL_REL dropdown entries only"
echo "LOCKED=atlas pixels; cells 1-102; shotgun/reload/fire; existing recipes; existing effects; all unrelated renderer behavior"

echo
echo "=== DIRTY / DIVERGENCE PREFLIGHT ==="
git status --short || true
git fetch origin main
LOCAL_HEAD="$(git rev-parse HEAD)"
ORIGIN_HEAD="$(git rev-parse origin/main)"
BASE="$(git merge-base HEAD origin/main)"
echo "LOCAL_HEAD=$LOCAL_HEAD"
echo "ORIGIN_HEAD=$ORIGIN_HEAD"
echo "MERGE_BASE=$BASE"

if [ "$LOCAL_HEAD" != "$ORIGIN_HEAD" ]; then
  git log --oneline "$BASE..HEAD" > "$L/local-only-commits.txt" || true
  git diff --binary "$BASE..HEAD" > "$L/local-only-history.patch" || true
  echo "LOCAL_DIVERGENCE=PRESERVED_NOT_MUTATED"
fi
git ls-files --others --exclude-standard > "$L/untracked.txt" || true
echo "PRIMARY_WORKTREE_LEFT_UNTOUCHED=YES"

echo
echo "=== CLEAN AUTHORING WORKTREE FROM ORIGIN/MAIN ==="
git worktree remove --force "$A" 2>/dev/null || true
rm -rf "$A"
git worktree add --detach "$A" "$ORIGIN_HEAD"
cd "$A"

for F in "$ATLAS_REL" "$RELOAD_REL" "$EFFECT_REL" "$RENDERER_REL" "$SHELL_REL"; do
  test -e "$F" || { echo "STOP: missing $F"; exit 1; }
done

ATLAS_SHA="$(sha256sum "$ATLAS_REL" | awk '{print $1}')"
RELOAD_SHA="$(sha256sum "$RELOAD_REL" | awk '{print $1}')"
EFFECT_SHA="$(sha256sum "$EFFECT_REL" | awk '{print $1}')"

echo
echo "=== VERIFY CANONICAL ATLAS GEOMETRY AND CELLS 15-18 ==="
python3 - "$ATLAS_REL" "$RELOAD_REL" <<'PY'
import json,sys
from pathlib import Path
from PIL import Image

atlas=Path(sys.argv[1])
reload=Path(sys.argv[2])
r=json.loads(reload.read_text())

assert r["atlases"]["vanguard-canonical"]["path"]=="assets/vanguard/procedural/vanguard-pose-atlas-expanded.png"
assert r["atlases"]["vanguard-canonical"]["columns"]==6
assert r["atlases"]["vanguard-canonical"]["rows"]==17
assert r["atlases"]["vanguard-canonical"]["indexBase"]==1

with Image.open(atlas) as im:
    assert im.size==(1037,1754), f"STOP: unexpected atlas size {im.size}"
    px=im.convert("RGBA")
    spec=r["atlases"]["vanguard-canonical"]
    for cell in (15,16,17,18):
        idx=cell-1
        col=idx%6
        row=idx//6
        x0=round(col*im.width/6)
        x1=round((col+1)*im.width/6)
        y0,y1=map(int,spec["rowBounds"][str(row)])
        crop=px.crop((x0,y0,x1,y1))
        alpha=crop.getchannel("A")
        if alpha.getbbox() is None:
            raise SystemExit(f"STOP: atlas cell {cell} empty")
        # Blue-key atlases are opaque, so also require non-black/non-blue-key image energy.
        data=list(crop.getdata())
        fg=sum(1 for R,G,B,A in data if A>8 and not (B>110 and B>R+35 and B>G+35) and max(R,G,B)>16)
        if fg < 40:
            raise SystemExit(f"STOP: atlas cell {cell} lacks foreground ({fg})")
        print(f"CELL_{cell}_FOREGROUND_PIXELS={fg}")
print("ATLAS_GEOMETRY=PASS")
PY

echo
echo "=== AUTHOR THREE RECIPES ==="
python3 - "$RELOAD_REL" "$JUMP_REL" "$MIDAIR_REL" "$LAND_REL" <<'PY'
import copy,json,sys
from pathlib import Path

template=Path(sys.argv[1])
jump_path,mid_path,land_path=map(Path,sys.argv[2:])
base=json.loads(template.read_text())

# Reuse the exact canonical atlas declaration and exact existing invisible effect carrier.
atlas=copy.deepcopy(base["atlases"])
muzzle=copy.deepcopy(base["sources"]["muzzle"])
effect=copy.deepcopy(base["effect"])
effect["liveControls"]=False

def body(cell):
    return {
      "kind":"atlas-cell",
      "atlas":"vanguard-canonical",
      "cell":cell,
      "role":"body",
      "trim":False,
      "registrationOffset":[0,0]
    }

def fx0():
    return {"reveal":0,"core":0,"tightGlow":0,"wideGlow":0}

def deform(shear=0, sx=1, sy=1):
    return {"shearX":shear,"scaleX":sx,"scaleY":sy,"shiftX":0,"shiftY":0}

common={
  "schema":"pose-lab-v2-procedural-motion-recipe-v1",
  "subject":"vanguard",
  "rootMotion":False,
  "canvas":copy.deepcopy(base["canvas"]),
  "atlases":atlas,
  "bodyScale":1.5,
  "stage":{"centerX":215,"centerSource":"pose","mode":"native-pixel-scale-ground-anchor"},
  "effect":effect,
}

jump=copy.deepcopy(common)
jump.update({
  "id":"vanguard-jump-procedural-v1",
  "description":"Vanguard Jump · canonical atlas cells 15→16 · very quick in-place takeoff",
  "sources":{
    "pose":body(15),
    "launch":body(16),
    "muzzle":muzzle,
  },
  "phases":[
    {"id":"preload","source":"pose","durationMs":55,"deform":deform(-0.06,1.03,0.97),"effect":fx0()},
    {"id":"launch","source":"launch","durationMs":70,"deform":deform(0.10,0.97,1.05),"effect":fx0()},
    {"id":"launch-hold","source":"launch","durationMs":35,"deform":deform(0.03,1.00,1.00),"effect":fx0()},
  ],
  "motionAuthority":{
    "kind":"canonical-atlas-jump-triplet",
    "description":"Cell 15 is takeoff preload; cell 16 is launch. No root motion, no horizontal travel, no effect."
  }
})

mid=copy.deepcopy(common)
mid.update({
  "id":"vanguard-midair-procedural-v1",
  "description":"Vanguard Mid-Air · canonical atlas cell 17 only · subtle one-frame modulation",
  "sources":{
    "pose":body(17),
    "muzzle":muzzle,
  },
  "phases":[
    {"id":"air-a","source":"pose","durationMs":90,"deform":deform(-0.015,1.00,1.00),"effect":fx0()},
    {"id":"air-b","source":"pose","durationMs":90,"deform":deform(0.015,1.015,0.99),"effect":fx0()},
    {"id":"air-c","source":"pose","durationMs":90,"deform":deform(0,1.00,1.00),"effect":fx0()},
  ],
  "motionAuthority":{
    "kind":"canonical-atlas-jump-triplet",
    "description":"Cell 17 is the sole body frame. Modulation is deformation only; no alternate pose, root motion, or horizontal travel."
  }
})

land=copy.deepcopy(common)
land.update({
  "id":"vanguard-land-procedural-v1",
  "description":"Vanguard Land · canonical atlas cell 18 only · very quick in-place impact",
  "sources":{
    "pose":body(18),
    "muzzle":muzzle,
  },
  "phases":[
    {"id":"impact","source":"pose","durationMs":55,"deform":deform(0.04,1.06,0.92),"effect":fx0()},
    {"id":"settle","source":"pose","durationMs":65,"deform":deform(-0.02,0.99,1.02),"effect":fx0()},
    {"id":"ready","source":"pose","durationMs":30,"deform":deform(0,1.00,1.00),"effect":fx0()},
  ],
  "motionAuthority":{
    "kind":"canonical-atlas-jump-triplet",
    "description":"Cell 18 is the sole landing body frame. Impact/settle use deformation only; no root motion, horizontal travel, or effect."
  }
})

for path,data in ((jump_path,jump),(mid_path,mid),(land_path,land)):
    path.write_text(json.dumps(data,indent=2)+"\n")

assert [p["source"] for p in jump["phases"]]==["pose","launch","launch"]
assert {jump["sources"]["pose"]["cell"],jump["sources"]["launch"]["cell"]}=={15,16}
assert {p["source"] for p in mid["phases"]}=={"pose"} and mid["sources"]["pose"]["cell"]==17
assert {p["source"] for p in land["phases"]}=={"pose"} and land["sources"]["pose"]["cell"]==18
for d in (jump,mid,land):
    assert d["rootMotion"] is False
    assert all(p["deform"]["shiftX"]==0 and p["deform"]["shiftY"]==0 for p in d["phases"])
    assert all(all(v==0 for v in p["effect"].values()) for p in d["phases"])
print("RECIPES=PASS")
PY

echo
echo "=== REGISTER ROUTES + DROPDOWN ==="
python3 - "$RENDERER_REL" "$SHELL_REL" <<'PY'
import sys
from pathlib import Path

rp,sp=map(Path,sys.argv[1:])
r=rp.read_text()
s=sp.read_text()

# Route selection. Insert before existing shotgun branches.
old="""const animation=requested==='vanguard-shotgun-reload'
  ? 'vanguard-shotgun-reload'"""
new="""const animation=requested==='vanguard-jump'
  ? 'vanguard-jump'
  : requested==='vanguard-midair'
  ? 'vanguard-midair'
  : requested==='vanguard-land'
  ? 'vanguard-land'
  : requested==='vanguard-shotgun-reload'
  ? 'vanguard-shotgun-reload'"""
assert r.count(old)==1, "STOP: animation route anchor changed"
r=r.replace(old,new)

old="""const isShotgunReload=animation==='vanguard-shotgun-reload';"""
new="""const isJump=animation==='vanguard-jump';
const isMidair=animation==='vanguard-midair';
const isLand=animation==='vanguard-land';
const isShotgunReload=animation==='vanguard-shotgun-reload';"""
assert r.count(old)==1, "STOP: route flags anchor changed"
r=r.replace(old,new)

old="""  title:isShotgunReload?'Vanguard Shotgun Reload':isShotgunFire?'Vanguard Shotgun Fire':"""
new="""  title:isJump?'Vanguard Jump':isMidair?'Vanguard Mid-Air':isLand?'Vanguard Land':isShotgunReload?'Vanguard Shotgun Reload':isShotgunFire?'Vanguard Shotgun Fire':"""
assert r.count(old)==1, "STOP: title anchor changed"
r=r.replace(old,new)

old=""" const recipePath=isShotgunReload
   ? './assets/vanguard/procedural/shotgun-reload.recipe.json'"""
new=""" const recipePath=isJump
   ? './assets/vanguard/procedural/jump.recipe.json'
   : isMidair
   ? './assets/vanguard/procedural/midair.recipe.json'
   : isLand
   ? './assets/vanguard/procedural/land.recipe.json'
   : isShotgunReload
   ? './assets/vanguard/procedural/shotgun-reload.recipe.json'"""
assert r.count(old)==1, "STOP: recipe-path anchor changed"
r=r.replace(old,new)

# These moves deliberately use zero-visible-effect recipes. Do not show irrelevant effect controls.
old="""function installSlashControls(){
 const side=document.querySelector('.side');
 if(!side||side.querySelector('[data-slash-controls]'))return;"""
new="""function installSlashControls(){
 const side=document.querySelector('.side');
 if(!side||side.querySelector('[data-slash-controls]'))return;
 if(recipe.effect?.liveControls===false)return;"""
assert r.count(old)==1, "STOP: controls anchor changed"
r=r.replace(old,new)

# Dropdown.
old='''      <option value="vanguard-shotgun-reload">Vanguard · Shotgun Reload</option>'''
new='''      <option value="vanguard-jump">Vanguard · Jump</option>
      <option value="vanguard-midair">Vanguard · Mid-Air</option>
      <option value="vanguard-land">Vanguard · Land</option>
      <option value="vanguard-shotgun-reload">Vanguard · Shotgun Reload</option>'''
assert s.count(old)==1, "STOP: dropdown anchor changed"
s=s.replace(old,new)

rp.write_text(r)
sp.write_text(s)

for token in (
    "requested==='vanguard-jump'",
    "requested==='vanguard-midair'",
    "requested==='vanguard-land'",
    "./assets/vanguard/procedural/jump.recipe.json",
    "./assets/vanguard/procedural/midair.recipe.json",
    "./assets/vanguard/procedural/land.recipe.json",
):
    assert token in r
for token in ('value="vanguard-jump"','value="vanguard-midair"','value="vanguard-land"'):
    assert token in s
print("ROUTES_DROPDOWN=PASS")
PY

echo
echo "=== SYNTAX + DIFF GUARD ==="
node --check "$RENDERER_REL"
node --check "$SHELL_REL"

mapfile -t CHANGED < <(git status --short | sed -E 's/^.. //')
printf 'changed=%s\n' "${CHANGED[@]}"

EXPECTED=(
  "$JUMP_REL"
  "$MIDAIR_REL"
  "$LAND_REL"
  "$RENDERER_REL"
  "$SHELL_REL"
)
[ "${#CHANGED[@]}" -eq 5 ] || {
  echo "STOP: expected exactly five campaign-owned files, got ${#CHANGED[@]}"
  git status --short
  exit 1
}
for F in "${EXPECTED[@]}"; do
  printf '%s\n' "${CHANGED[@]}" | grep -Fxq "$F" || { echo "STOP: missing expected change $F"; exit 1; }
done

[ "$(sha256sum "$ATLAS_REL" | awk '{print $1}')" = "$ATLAS_SHA" ] || { echo "STOP: canonical atlas changed"; exit 1; }
[ "$(sha256sum "$RELOAD_REL" | awk '{print $1}')" = "$RELOAD_SHA" ] || { echo "STOP: reload recipe changed"; exit 1; }
[ "$(sha256sum "$EFFECT_REL" | awk '{print $1}')" = "$EFFECT_SHA" ] || { echo "STOP: effect bytes changed"; exit 1; }

echo
echo "=== RECIPE CONTRACT GUARD ==="
python3 - "$JUMP_REL" "$MIDAIR_REL" "$LAND_REL" <<'PY'
import json,sys
j,m,l=[json.load(open(x)) for x in sys.argv[1:]]

assert j["id"]=="vanguard-jump-procedural-v1"
assert j["sources"]["pose"]["cell"]==15 and j["sources"]["launch"]["cell"]==16
assert sum(p["durationMs"] for p in j["phases"])==160

assert m["id"]=="vanguard-midair-procedural-v1"
assert m["sources"]["pose"]["cell"]==17
assert {p["source"] for p in m["phases"]}=={"pose"}
assert sum(p["durationMs"] for p in m["phases"])==270

assert l["id"]=="vanguard-land-procedural-v1"
assert l["sources"]["pose"]["cell"]==18
assert {p["source"] for p in l["phases"]}=={"pose"}
assert sum(p["durationMs"] for p in l["phases"])==150

for d in (j,m,l):
    assert d["rootMotion"] is False
    assert d["effect"]["liveControls"] is False
    assert all(p["deform"]["shiftX"]==0 and p["deform"]["shiftY"]==0 for p in d["phases"])
print("CONTRACT_GUARD=PASS")
PY

echo
echo "=== COMMIT + PUSH ==="
git add "$JUMP_REL" "$MIDAIR_REL" "$LAND_REL" "$RENDERER_REL" "$SHELL_REL"
git commit -m "Add Vanguard jump midair and land triplet"
REV="$(git rev-parse HEAD)"

git fetch origin main
[ "$(git rev-parse origin/main)" = "$ORIGIN_HEAD" ] || {
  echo "STOP: origin/main advanced during campaign; no push performed"
  exit 1
}
git push origin HEAD:main
echo "REV=$REV"

echo
echo "=== COMMITTED READBACK ==="
for F in "$JUMP_REL" "$MIDAIR_REL" "$LAND_REL" "$RENDERER_REL" "$SHELL_REL"; do
  git show "$REV:$F" > "$L/$(basename "$F").committed"
done
python3 - "$L/jump.recipe.json.committed" "$L/midair.recipe.json.committed" "$L/land.recipe.json.committed" "$L/procedural-motion-preview.js.committed" "$L/procedural-review-shell.js.committed" <<'PY'
import json,sys
j=json.load(open(sys.argv[1]))
m=json.load(open(sys.argv[2]))
l=json.load(open(sys.argv[3]))
r=open(sys.argv[4]).read()
s=open(sys.argv[5]).read()
assert [j["sources"]["pose"]["cell"],j["sources"]["launch"]["cell"]]==[15,16]
assert m["sources"]["pose"]["cell"]==17
assert [p["durationMs"] for p in m["phases"]]==[90,90,90]
assert l["sources"]["pose"]["cell"]==18
assert l["phases"][0]["deform"]["scaleX"]==1.06
assert l["phases"][0]["deform"]["scaleY"]==0.92
for x in ("vanguard-jump","vanguard-midair","vanguard-land"):
    assert x in r and x in s
print("COMMITTED_READBACK=PASS")
PY

echo
echo "=== EXACT-REVISION BUILD ==="
cd "$P"
git worktree remove --force "$W" 2>/dev/null || true
rm -rf "$W"
git worktree add --detach "$W" "$REV"
cd "$W"
node --check "$RENDERER_REL"
node --check "$SHELL_REL"
npm run build

for F in jump.recipe.json midair.recipe.json land.recipe.json; do
  test -f "$W/dist/assets/vanguard/procedural/$F" || { echo "STOP: missing built $F"; exit 1; }
done

echo
echo "=== SERVE EXACT REVISION ==="
probe(){
  local base="$1" tmp="$L/probe.$$"
  for F in jump.recipe.json midair.recipe.json land.recipe.json; do
    curl -fsS "$base/assets/vanguard/procedural/$F" > "$tmp.$F" 2>/dev/null || return 1
    [ "$(sha256sum "$tmp.$F"|awk '{print $1}')" = "$(sha256sum "$W/dist/assets/vanguard/procedural/$F"|awk '{print $1}')" ] || return 1
  done
  curl -fsS "$base/src/procedural-motion-preview.js" > "$tmp.renderer" 2>/dev/null || return 1
  [ "$(sha256sum "$tmp.renderer"|awk '{print $1}')" = "$(sha256sum "$W/dist/src/procedural-motion-preview.js"|awk '{print $1}')" ] || return 1
  rm -f "$tmp".*
}

BASE_URL=""
for PORT in 8766 8767 8768 8769 8770 8771 8772 8773 8774 8775; do
  C="http://127.0.0.1:$PORT"
  if probe "$C"; then
    BASE_URL="$C"
    echo "SERVER=REUSED_EXACT PORT=$PORT"
    break
  fi
  python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$W/dist" >"$L/server-$PORT.log" 2>&1 &
  PID=$!
  sleep 1
  if kill -0 "$PID" 2>/dev/null && probe "$C"; then
    BASE_URL="$C"
    echo "$PID" > "$L/server.pid"
    echo "$PORT" > "$L/server.port"
    echo "SERVER=STARTED_EXACT PORT=$PORT PID=$PID"
    break
  fi
  kill "$PID" 2>/dev/null || true
done
[ -n "$BASE_URL" ] || { echo "STOP: no exact review server"; exit 1; }

STAMP="$(date +%s)"
JU="$BASE_URL/motion.html?procedural=vanguard-jump&rev=$REV&nocache=$STAMP"
MU="$BASE_URL/motion.html?procedural=vanguard-midair&rev=$REV&nocache=$STAMP"
LU="$BASE_URL/motion.html?procedural=vanguard-land&rev=$REV&nocache=$STAMP"

echo
echo "============================================================"
echo " JUMP TRIPLET REVIEW READY"
echo "============================================================"
echo "REV=$REV"
echo "JUMP_REVIEW=$JU"
echo "MIDAIR_REVIEW=$MU"
echo "LAND_REVIEW=$LU"
echo "SOURCE_CELLS=15,16,17,18"
echo "JUMP_MS=160"
echo "MIDAIR_MS=270"
echo "LAND_MS=150"
echo "ROOT_MOTION=OFF"
echo "HORIZONTAL_SHIFT=0"
echo "ATLAS_UNCHANGED_SHA256=$ATLAS_SHA"
echo "HUMAN_VERDICT=PENDING"

if command -v termux-open-url >/dev/null 2>&1 && termux-open-url "$JU" >/dev/null 2>&1; then
  echo "BROWSER_OPEN=JUMP"
elif command -v am >/dev/null 2>&1 && am start -a android.intent.action.VIEW -d "$JU" >/dev/null 2>&1; then
  echo "BROWSER_OPEN=JUMP_AM"
else
  echo "OPEN_THIS_URL=$JU"
fi
