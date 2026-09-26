#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export GIT_PAGER=cat PAGER=cat

P="$HOME/storage/documents/GodotProjects/pose-lab-v2"
L="$HOME/.local/state/pose-lab-v2-vanguard-attack1-rearfoot"
A="$L/authoring"
W="$L/review"

RUN_REL="public/assets/vanguard/procedural/run.recipe.json"
ATTACK1_REL="public/assets/vanguard/procedural/overhand-strike.recipe.json"

cd "$P"

cat   AGENTS.md   docs/POSE_LAB_CAMPAIGN_RULES.md   docs/POSE_IS_GOD.md   docs/VANGUARD_ATLAS_AUTHORITY.md   animations/candidates/vanguard/overhand-strike/MANUAL_TEST_PROMPT.md   >/dev/null

echo "============================================================"
echo " VANGUARD ATTACK 1 REAR-FOOT RE-REGISTER"
echo "============================================================"
echo "HUMAN_VERDICT=Run fixed; locked"
echo "MISSION=keep current sprites/row crops and pin every Attack 1 pose to one rear-foot stage point"
echo "PRIMARY_WORKTREE=READ_ONLY"
echo "AUTHORING_WORKTREE=disposable from origin/main"
echo "WRITABLE=$ATTACK1_REL body anchorPoint + body registrationOffset only"
echo "LOCKED=$RUN_REL entire file; atlas bytes; Attack1 rowBounds/cells/centerX/timing/effects/deformation/canvas; renderer; every other recipe"

mkdir -p "$L"

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

# Preserve proof of local-only history without modifying it.
if [ "$LOCAL_HEAD" != "$ORIGIN_HEAD" ]; then
  git log --oneline --decorate "$BASE..HEAD" > "$L/local-only-commits.txt" || true
  git diff --binary "$BASE..HEAD" > "$L/local-only-history.patch" || true
  echo "LOCAL_DIVERGENCE=PRESERVED_NOT_MUTATED"
fi

# Untracked files are archaeology. They do not block this campaign.
echo "PRIMARY_WORKTREE_LEFT_UNTOUCHED=YES"

echo
echo "=== CREATE CLEAN AUTHORING WORKTREE FROM ORIGIN/MAIN ==="
git worktree remove --force "$A" 2>/dev/null || true
rm -rf "$A"
git worktree add --detach "$A" "$ORIGIN_HEAD"

cd "$A"
START="$(git rev-parse HEAD)"
echo "AUTHORING_START=$START"

RUN="$A/$RUN_REL"
ATTACK1="$A/$ATTACK1_REL"

RUN_SHA="$(sha256sum "$RUN" | awk '{print $1}')"
cp "$ATTACK1" "$L/attack1-before.json"

echo
echo "=== RE-PIN EXACT REAR-FOOT POINTS ==="
python3 - "$ATTACK1" <<'PY'
from pathlib import Path
import copy,json,sys

p=Path(sys.argv[1])
before=json.loads(p.read_text())
after=copy.deepcopy(before)

assert after["id"]=="vanguard-overhand-strike-procedural-proof-v4"
assert after["stage"]["centerX"]==220
assert after["canvas"]["anchor"]==[92,226]
assert after["atlases"]["vanguard-canonical"]["path"]=="assets/vanguard/procedural/vanguard-pose-atlas-expanded.png"

expected_rows={
    "4":[401,495],
    "5":[495,596],
    "6":[596,703],
}
rb=after["atlases"]["vanguard-canonical"]["rowBounds"]
for k,v in expected_rows.items():
    assert rb[k]==v, f"STOP: unexpected rowBounds[{k}]={rb[k]}"

assert "sourceRect" not in after["sources"]["contact"], "STOP: rejected contact sourceRect still present"

rear_foot={
    "idle":[58,97],
    "chamber":[64,84],
    "commit":[58,86],
    "preimpact":[60,89],
    "contact":[46,89],
}

for key,point in rear_foot.items():
    src=after["sources"][key]
    assert src["kind"]=="atlas-cell"
    assert src["anchorMode"]=="explicit-point"
    src["anchorPoint"]=point
    src["registrationOffset"]=[0,0]

cell_rows={
    "idle":"0",
    "chamber":"4",
    "commit":"6",
    "preimpact":"5",
    "contact":"5",
}
for key,row in cell_rows.items():
    y0,y1=rb[row]
    h=y1-y0
    x,y=after["sources"][key]["anchorPoint"]
    assert 0 <= y < h, f"STOP: {key} rear-foot y={y} outside crop height={h}"
    assert 0 <= x < 173, f"STOP: {key} rear-foot x={x} outside cell width"

for phase in after["phases"]:
    d=phase.get("deform",{})
    assert float(d.get("shiftX",0) or 0)==0.0, f"STOP: {phase['id']} has shiftX compensation"
    assert float(d.get("shiftY",0) or 0)==0.0, f"STOP: {phase['id']} has shiftY compensation"

def normalize(o):
    x=copy.deepcopy(o)
    for key in ("idle","chamber","commit","preimpact","contact"):
        x["sources"][key]["anchorPoint"]="__AUTHORIZED_ANCHOR__"
        x["sources"][key]["registrationOffset"]="__AUTHORIZED_REG__"
    return x

assert normalize(after)==normalize(before), "STOP: mutation escaped rear-foot registration surface"

p.write_text(json.dumps(after,indent=2)+"\n")

for key in ("idle","chamber","commit","preimpact","contact"):
    print(f"{key.upper()}_REAR_FOOT={after['sources'][key]['anchorPoint']}")
    print(f"{key.upper()}_REGISTRATION=[0,0]")
print("ROW_BOUNDS=UNCHANGED")
print("CELLS=UNCHANGED")
print("CENTER_X=UNCHANGED_220")
print("TIMING=UNCHANGED")
print("EFFECTS=UNCHANGED")
print("DEFORMATION=UNCHANGED")
print("RUN=LOCKED")
PY

echo
echo "=== DIFF GUARD ==="
mapfile -t CHANGED < <(git diff --name-only)
printf 'changed=%s\n' "${CHANGED[@]}"
[ "${#CHANGED[@]}" -eq 1 ] || {
  echo "STOP: expected exactly one changed file"
  exit 1
}
[ "${CHANGED[0]}" = "$ATTACK1_REL" ] || {
  echo "STOP: unauthorized diff ${CHANGED[0]}"
  exit 1
}
[ "$(sha256sum "$RUN" | awk '{print $1}')" = "$RUN_SHA" ] || {
  echo "STOP: accepted Run changed"
  exit 1
}

echo
echo "=== COMMIT + PUSH FROM CLEAN AUTHORING WORKTREE ==="
git add "$ATTACK1_REL"
git commit -m "Re-register Vanguard attack one to rear foot"
REV="$(git rev-parse HEAD)"
echo "REV=$REV"

# Push only if origin/main is still exactly the revision this worktree started from.
git fetch origin main
[ "$(git rev-parse origin/main)" = "$ORIGIN_HEAD" ] || {
  echo "STOP: origin/main advanced during campaign; no push performed"
  exit 1
}
git push origin "HEAD:main"

echo
echo "=== COMMITTED READBACK ==="
git show "$REV:$ATTACK1_REL" > "$L/attack1-committed.json"
python3 - "$L/attack1-committed.json" <<'PY'
import json,sys
a=json.load(open(sys.argv[1]))
assert a["atlases"]["vanguard-canonical"]["rowBounds"]["4"]==[401,495]
assert a["atlases"]["vanguard-canonical"]["rowBounds"]["5"]==[495,596]
assert a["atlases"]["vanguard-canonical"]["rowBounds"]["6"]==[596,703]
expected={
 "idle":[58,97],
 "chamber":[64,84],
 "commit":[58,86],
 "preimpact":[60,89],
 "contact":[46,89],
}
for k,v in expected.items():
    assert a["sources"][k]["anchorPoint"]==v
    assert a["sources"][k]["registrationOffset"]==[0,0]
assert "sourceRect" not in a["sources"]["contact"]
assert a["stage"]["centerX"]==220
print("COMMITTED_READBACK=PASS")
print("REAR_FOOT_REGISTRATION=SOLE_STAGE_AUTHORITY")
PY

echo
echo "=== EXACT-REVISION BUILD ==="
git worktree remove --force "$W" 2>/dev/null || true
rm -rf "$W"
git worktree add --detach "$W" "$REV"
cd "$W"

node --check src/procedural-motion-preview.js
npm run build

echo
echo "=== SERVE EXACT REVISION ==="

probe_exact_server() {
  local base="$1" tmp
  tmp="$L/probe.$$"
  if ! curl -fsS "$base/assets/vanguard/procedural/overhand-strike.recipe.json" > "$tmp.recipe" 2>/dev/null; then
    rm -f "$tmp.recipe"
    return 1
  fi
  local served built
  served="$(sha256sum "$tmp.recipe" | awk '{print $1}')"
  built="$(sha256sum "$W/dist/assets/vanguard/procedural/overhand-strike.recipe.json" | awk '{print $1}')"
  rm -f "$tmp.recipe"
  [ "$served" = "$built" ]
}

BASE_URL=""
for PORT in 8766 8767 8768 8769 8770 8771 8772 8773 8774 8775; do
  CANDIDATE="http://127.0.0.1:$PORT"
  if probe_exact_server "$CANDIDATE"; then
    BASE_URL="$CANDIDATE"
    echo "SERVER=REUSED_EXACT PORT=$PORT"
    break
  fi
  python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$W/dist" >"$L/server-$PORT.log" 2>&1 &
  PID=$!
  sleep 1
  if kill -0 "$PID" 2>/dev/null; then
    BASE_URL="$CANDIDATE"
    echo "$PID" > "$L/server.pid"
    echo "$PORT" > "$L/server.port"
    echo "SERVER=STARTED PORT=$PORT PID=$PID"
    break
  fi
done

[ -n "$BASE_URL" ] || {
  echo "STOP: no review port available in 8766..8775"
  exit 1
}

probe_exact_server "$BASE_URL" || {
  echo "STOP: runtime recipe bytes do not match exact built revision"
  exit 1
}

STAMP="$(date +%s)"
URL="$BASE_URL/motion.html?procedural=vanguard-overhand-strike&rev=$REV&nocache=$STAMP"

echo
echo "============================================================"
echo " ATTACK 1 REAR-FOOT REVIEW READY"
echo "============================================================"
echo "REV=$REV"
echo "PRIMARY_WORKTREE_UNTOUCHED=YES"
echo "RUN=LOCKED_ACCEPTED"
echo "REVIEW_URL=$URL"
echo "HUMAN_VERDICT=PENDING"

termux-open-url "$URL"
