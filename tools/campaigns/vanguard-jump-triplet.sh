#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export GIT_PAGER=cat PAGER=cat

P="$HOME/storage/documents/GodotProjects/pose-lab-v2"
L="$HOME/.local/state/pose-lab-v2-vanguard-jump-triplet"
A="$L/authoring"
W="$L/review"

JUMP_REL="public/assets/vanguard/procedural/jump.recipe.json"
MIDAIR_REL="public/assets/vanguard/procedural/midair.recipe.json"
LAND_REL="public/assets/vanguard/procedural/land.recipe.json"
RENDERER_REL="src/procedural-motion-preview.js"
SHELL_REL="src/procedural-review-shell.js"
ATLAS_REL="public/assets/vanguard/procedural/vanguard-pose-atlas-expanded.png"
RELOAD_REL="public/assets/vanguard/procedural/shotgun-reload.recipe.json"
FIRE_REL="public/assets/vanguard/procedural/shotgun-fire.recipe.json"
EFFECT_REL="public/assets/vanguard/procedural/vanguard-shotgun-fire-effect.png"

cd "$P"
mkdir -p "$L"

cat AGENTS.md docs/POSE_LAB_CAMPAIGN_RULES.md docs/POSE_IS_GOD.md docs/VANGUARD_ATLAS_AUTHORITY.md >/dev/null

echo "============================================================"
echo " VANGUARD JUMP TRIPLET — MIDAIR + LAND TUNING"
echo "============================================================"
echo "PRIMARY_WORKTREE=READ_ONLY"
echo "WRITABLE=$MIDAIR_REL timing only"
echo "WRITABLE=$LAND_REL impact squash only"
echo "LOCKED=$JUMP_REL"
echo "LOCKED=route registration; dropdown; atlas; cells 15-18; shotgun/reload/fire; effects; renderer behavior; all unrelated recipes"
echo "TARGET_MIDAIR_MS=90,90,90"
echo "TARGET_LAND_IMPACT_SCALE=1.06,0.92"

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

for F in "$JUMP_REL" "$MIDAIR_REL" "$LAND_REL" "$RENDERER_REL" "$SHELL_REL" "$ATLAS_REL" "$RELOAD_REL" "$FIRE_REL" "$EFFECT_REL"; do
  test -e "$F" || { echo "STOP: missing $F"; exit 1; }
done

JUMP_SHA="$(sha256sum "$JUMP_REL"|awk '{print $1}')"
RENDERER_SHA="$(sha256sum "$RENDERER_REL"|awk '{print $1}')"
SHELL_SHA="$(sha256sum "$SHELL_REL"|awk '{print $1}')"
ATLAS_SHA="$(sha256sum "$ATLAS_REL"|awk '{print $1}')"
RELOAD_SHA="$(sha256sum "$RELOAD_REL"|awk '{print $1}')"
FIRE_SHA="$(sha256sum "$FIRE_REL"|awk '{print $1}')"
EFFECT_SHA="$(sha256sum "$EFFECT_REL"|awk '{print $1}')"

echo
echo "=== VERIFY EXISTING TRIPLET ROUTES + SOURCE CELLS ==="
python3 - "$JUMP_REL" "$MIDAIR_REL" "$LAND_REL" "$RENDERER_REL" "$SHELL_REL" <<'PY'
import json,sys
j,m,l=[json.load(open(x)) for x in sys.argv[1:4]]
r=open(sys.argv[4]).read()
s=open(sys.argv[5]).read()

assert j["id"]=="vanguard-jump-procedural-v1"
assert [j["sources"]["pose"]["cell"],j["sources"]["launch"]["cell"]]==[15,16]
assert m["id"]=="vanguard-midair-procedural-v1"
assert m["sources"]["pose"]["cell"]==17
assert {p["source"] for p in m["phases"]}=={"pose"}
assert l["id"]=="vanguard-land-procedural-v1"
assert l["sources"]["pose"]["cell"]==18
assert {p["source"] for p in l["phases"]}=={"pose"}

for token in (
  "requested==='vanguard-jump'",
  "requested==='vanguard-midair'",
  "requested==='vanguard-land'",
  "./assets/vanguard/procedural/jump.recipe.json",
  "./assets/vanguard/procedural/midair.recipe.json",
  "./assets/vanguard/procedural/land.recipe.json",
):
    assert token in r, f"STOP: missing existing renderer route token {token}"

for token in ('value="vanguard-jump"','value="vanguard-midair"','value="vanguard-land"'):
    assert token in s, f"STOP: missing existing dropdown token {token}"

print("TRIPLET_INFRASTRUCTURE=PASS")
PY

echo
echo "=== APPLY ONLY REQUESTED TUNING ==="
python3 - "$MIDAIR_REL" "$LAND_REL" <<'PY'
import copy,json,sys
from pathlib import Path

mp,lp=map(Path,sys.argv[1:])
m=json.loads(mp.read_text())
l=json.loads(lp.read_text())
mb=copy.deepcopy(m)
lb=copy.deepcopy(l)

assert m["sources"]["pose"]["cell"]==17
assert {p["source"] for p in m["phases"]}=={"pose"}
assert l["sources"]["pose"]["cell"]==18
assert {p["source"] for p in l["phases"]}=={"pose"}

# Mid-air: same one-frame modulation, simply slower/less spastic.
for p in m["phases"]:
    p["durationMs"]=90

# Land: preserve timing and pose, add only a modest impact squash.
impact=l["phases"][0]
assert impact["id"]=="impact"
impact["deform"]["scaleX"]=1.06
impact["deform"]["scaleY"]=0.92

def norm_mid(x):
    y=copy.deepcopy(x)
    for p in y["phases"]:
        p["durationMs"]="__AUTHORIZED_TIMING__"
    return y

def norm_land(x):
    y=copy.deepcopy(x)
    y["phases"][0]["deform"]["scaleX"]="__AUTHORIZED_SX__"
    y["phases"][0]["deform"]["scaleY"]="__AUTHORIZED_SY__"
    return y

assert norm_mid(m)==norm_mid(mb), "STOP: midair mutation escaped timing"
assert norm_land(l)==norm_land(lb), "STOP: land mutation escaped impact squash"

mp.write_text(json.dumps(m,indent=2)+"\n")
lp.write_text(json.dumps(l,indent=2)+"\n")

print("MIDAIR_MS=[90,90,90]")
print("LAND_IMPACT_SCALE=[1.06,0.92]")
print("SOURCE_CELLS=17,18_UNCHANGED")
PY

echo
echo "=== DIFF GUARD ==="
mapfile -t CHANGED < <(git diff --name-only)
printf 'changed=%s\n' "${CHANGED[@]}"

# Idempotent reruns are allowed. Otherwise exactly the two requested recipes may differ.
for F in "${CHANGED[@]}"; do
  [ "$F" = "$MIDAIR_REL" ] || [ "$F" = "$LAND_REL" ] || {
    echo "STOP: unauthorized changed file $F"
    exit 1
  }
done

[ "$(sha256sum "$JUMP_REL"|awk '{print $1}')" = "$JUMP_SHA" ] || { echo "STOP: jump changed"; exit 1; }
[ "$(sha256sum "$RENDERER_REL"|awk '{print $1}')" = "$RENDERER_SHA" ] || { echo "STOP: renderer changed"; exit 1; }
[ "$(sha256sum "$SHELL_REL"|awk '{print $1}')" = "$SHELL_SHA" ] || { echo "STOP: shell changed"; exit 1; }
[ "$(sha256sum "$ATLAS_REL"|awk '{print $1}')" = "$ATLAS_SHA" ] || { echo "STOP: atlas changed"; exit 1; }
[ "$(sha256sum "$RELOAD_REL"|awk '{print $1}')" = "$RELOAD_SHA" ] || { echo "STOP: reload changed"; exit 1; }
[ "$(sha256sum "$FIRE_REL"|awk '{print $1}')" = "$FIRE_SHA" ] || { echo "STOP: fire changed"; exit 1; }
[ "$(sha256sum "$EFFECT_REL"|awk '{print $1}')" = "$EFFECT_SHA" ] || { echo "STOP: effect changed"; exit 1; }

echo
echo "=== CONTRACT GUARD ==="
python3 - "$MIDAIR_REL" "$LAND_REL" <<'PY'
import json,sys
m,l=[json.load(open(x)) for x in sys.argv[1:]]
assert [p["durationMs"] for p in m["phases"]]==[90,90,90]
assert m["sources"]["pose"]["cell"]==17
assert all(p["deform"]["shiftX"]==0 and p["deform"]["shiftY"]==0 for p in m["phases"])
assert l["phases"][0]["id"]=="impact"
assert l["phases"][0]["deform"]["scaleX"]==1.06
assert l["phases"][0]["deform"]["scaleY"]==0.92
assert l["sources"]["pose"]["cell"]==18
assert all(p["deform"]["shiftX"]==0 and p["deform"]["shiftY"]==0 for p in l["phases"])
print("CONTRACT_GUARD=PASS")
PY

echo
echo "=== COMMIT + PUSH IF NEEDED ==="
if [ -n "$(git diff --name-only)" ]; then
  git add "$MIDAIR_REL" "$LAND_REL"
  git commit -m "Tune Vanguard midair loop and landing squash"
  REV="$(git rev-parse HEAD)"
  git fetch origin main
  [ "$(git rev-parse origin/main)" = "$ORIGIN_HEAD" ] || {
    echo "STOP: origin/main advanced during campaign; no push performed"
    exit 1
  }
  git push origin HEAD:main
else
  REV="$ORIGIN_HEAD"
  echo "NO_OP=already tuned"
fi

echo "REV=$REV"

echo
echo "=== COMMITTED READBACK ==="
git show "$REV:$MIDAIR_REL" > "$L/midair-committed.json"
git show "$REV:$LAND_REL" > "$L/land-committed.json"
python3 - "$L/midair-committed.json" "$L/land-committed.json" <<'PY'
import json,sys
m,l=[json.load(open(x)) for x in sys.argv[1:]]
assert [p["durationMs"] for p in m["phases"]]==[90,90,90]
assert m["sources"]["pose"]["cell"]==17
assert l["phases"][0]["deform"]["scaleX"]==1.06
assert l["phases"][0]["deform"]["scaleY"]==0.92
assert l["sources"]["pose"]["cell"]==18
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

probe(){
  local base="$1" tmp="$L/probe.$$"
  for F in midair.recipe.json land.recipe.json; do
    curl -fsS "$base/assets/vanguard/procedural/$F" > "$tmp.$F" 2>/dev/null || return 1
    [ "$(sha256sum "$tmp.$F"|awk '{print $1}')" = "$(sha256sum "$W/dist/assets/vanguard/procedural/$F"|awk '{print $1}')" ] || return 1
  done
  rm -f "$tmp".*
}

BASE_URL=""
for PORT in 8766 8767 8768 8769 8770 8771 8772 8773 8774 8775; do
  C="http://127.0.0.1:$PORT"
  if probe "$C"; then BASE_URL="$C"; echo "SERVER=REUSED_EXACT PORT=$PORT"; break; fi
  python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$W/dist" >"$L/server-$PORT.log" 2>&1 &
  PID=$!; sleep 1
  if kill -0 "$PID" 2>/dev/null && probe "$C"; then
    BASE_URL="$C"; echo "$PID" > "$L/server.pid"; echo "SERVER=STARTED_EXACT PORT=$PORT PID=$PID"; break
  fi
  kill "$PID" 2>/dev/null || true
done
[ -n "$BASE_URL" ] || { echo "STOP: no exact review server"; exit 1; }

STAMP="$(date +%s)"
MU="$BASE_URL/motion.html?procedural=vanguard-midair&rev=$REV&nocache=$STAMP"
LU="$BASE_URL/motion.html?procedural=vanguard-land&rev=$REV&nocache=$STAMP"

echo
echo "============================================================"
echo " MIDAIR + LAND REVIEW READY"
echo "============================================================"
echo "REV=$REV"
echo "MIDAIR_REVIEW=$MU"
echo "LAND_REVIEW=$LU"
echo "MIDAIR_MS=270"
echo "LAND_IMPACT_SCALE_X=1.06"
echo "LAND_IMPACT_SCALE_Y=0.92"
echo "JUMP_UNCHANGED_SHA256=$JUMP_SHA"
echo "ATLAS_UNCHANGED_SHA256=$ATLAS_SHA"
echo "HUMAN_VERDICT=PENDING"

if command -v termux-open-url >/dev/null 2>&1 && termux-open-url "$MU" >/dev/null 2>&1; then
  echo "BROWSER_OPEN=MIDAIR"
elif command -v am >/dev/null 2>&1 && am start -a android.intent.action.VIEW -d "$MU" >/dev/null 2>&1; then
  echo "BROWSER_OPEN=MIDAIR_AM"
else
  echo "OPEN_THIS_URL=$MU"
fi
