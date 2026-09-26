#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export GIT_PAGER=cat PAGER=cat

P="$HOME/storage/documents/GodotProjects/pose-lab-v2"
L="$HOME/.local/state/pose-lab-v2-vanguard-attack1-crop"
W="$L/worktree"

RUN_REL="public/assets/vanguard/procedural/run.recipe.json"
ATTACK1_REL="public/assets/vanguard/procedural/overhand-strike.recipe.json"

RUN="$P/$RUN_REL"
ATTACK1="$P/$ATTACK1_REL"

cd "$P"

cat   AGENTS.md   docs/POSE_LAB_CAMPAIGN_RULES.md   docs/POSE_IS_GOD.md   docs/VANGUARD_ATLAS_AUTHORITY.md   animations/candidates/vanguard/overhand-strike/MANUAL_TEST_PROMPT.md   >/dev/null

echo "============================================================"
echo " VANGUARD ATTACK 1 ROW / PIVOT REPAIR"
echo "============================================================"
echo "HUMAN_VERDICT=Run fixed; locked"
echo "MISSION=remove neighboring-sprite contamination AND preserve Attack 1 body motion"
echo "AUTHORITY=accepted source vanguard_atlas_shoulders_midpoint.png -> uniform scale 1.0712809917355373"
echo "WRITABLE=$ATTACK1_REL rowBounds[4..6], chamber/commit/preimpact/contact anchorPoint.y, remove bad contact.sourceRect"
echo "LOCKED=$RUN_REL entire file; atlas bytes; cells; centerX; timing; effects; registration; deformation; anchorPoint.x; every other recipe"

mkdir -p "$L"

echo
echo "=== DIRTY PREFLIGHT ==="
git status --short

for F in "$RUN_REL" "$ATTACK1_REL"; do
  if ! git diff --quiet HEAD -- "$F"; then
    git diff -- "$F" > "$L/$(basename "$F").preflight.diff"
    echo "STOP: target dirty; archived diff: $F"
    exit 1
  fi
done

echo
echo "=== SYNC MAIN ==="
git fetch origin main
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || git merge --ff-only origin/main
START="$(git rev-parse HEAD)"
echo "START_HEAD=$START"

RUN_SHA="$(sha256sum "$RUN" | awk '{print $1}')"
cp "$ATTACK1" "$L/attack1-before.json"

echo
echo "=== APPLY SOURCE-DERIVED ROW BOUNDS + PIVOT TRANSLATION ==="
python3 - "$ATTACK1" <<'PY'
from pathlib import Path
import copy,json,sys

p=Path(sys.argv[1])
before=json.loads(p.read_text())
after=copy.deepcopy(before)

assert after["id"]=="vanguard-overhand-strike-procedural-proof-v4"
assert after["stage"]["centerX"]==220
assert after["atlases"]["vanguard-canonical"]["path"]=="assets/vanguard/procedural/vanguard-pose-atlas-expanded.png"

rb=after["atlases"]["vanguard-canonical"]["rowBounds"]

# Accepted source foreground bands in original 968x1536 source:
# row4: y 385..453
# row5: y 470..543
# row6: y 569..638
#
# Mid-gap source partitions:
# row4 start = midpoint(363,385) -> 374
# row4/5 boundary = midpoint(453,470) -> 462
# row5/6 boundary = midpoint(543,569) -> 556
# row6/7 boundary = midpoint(638,673) -> 656
#
# Uniform accepted scale = 1037 / 968 = 1.0712809917355373
# Expanded atlas partitions:
# 374 -> 401
# 462 -> 495
# 556 -> 596
# 656 -> 703
#
# These are the actual row partitions for the accepted expanded atlas.
old_starts={"4":410,"5":512,"6":614}
new_bounds={
    "4":[401,495],
    "5":[495,596],
    "6":[596,703],
}
for k,v in new_bounds.items():
    rb[k]=v

# Preserve the exact absolute authored pivot while moving each crop origin.
# newLocalY = oldLocalY + oldRowStart - newRowStart
moves={
    "chamber":("4",84),
    "preimpact":("5",89),
    "contact":("5",89),
    "commit":("6",86),
}
for key,(row,old_y) in moves.items():
    src=after["sources"][key]
    assert src["anchorMode"]=="explicit-point"
    assert src["anchorPoint"][1]==old_y
    new_y=old_y + old_starts[row] - new_bounds[row][0]
    src["anchorPoint"][1]=new_y

# Remove the rejected contact-only crop that cut the sprite out of frame.
after["sources"]["contact"].pop("sourceRect",None)

# Remove earlier rejected cleanup flags if any survived.
for key in ("idle","chamber","commit","preimpact","contact"):
    src=after["sources"][key]
    src.pop("backgroundKey",None)
    src.pop("backgroundKeyThreshold",None)
    src.pop("isolateLargestComponent",None)

# Guard exact writable surface.
def normalized(o):
    x=copy.deepcopy(o)
    for row in ("4","5","6"):
        x["atlases"]["vanguard-canonical"]["rowBounds"][row]="__AUTHORIZED_ROW__"
    for key in ("chamber","commit","preimpact","contact"):
        x["sources"][key]["anchorPoint"][1]="__AUTHORIZED_Y__"
    x["sources"]["contact"]["sourceRect"]="__AUTHORIZED_CONTACT_RECT__"
    for key in ("idle","chamber","commit","preimpact","contact"):
        src=x["sources"][key]
        src.pop("backgroundKey",None)
        src.pop("backgroundKeyThreshold",None)
        src.pop("isolateLargestComponent",None)
    return x

before_cmp=copy.deepcopy(before)
before_cmp["sources"]["contact"]["sourceRect"]="__AUTHORIZED_CONTACT_RECT__"
assert normalized(after)==normalized(before_cmp), "STOP: mutation escaped authorized Attack 1 crop/motion surface"

p.write_text(json.dumps(after,indent=2)+"\n")

print("ROW4=[401,495]")
print("ROW5=[495,596]")
print("ROW6=[596,703]")
print("CHAMBER_ANCHOR_Y=93")
print("PREIMPACT_ANCHOR_Y=106")
print("CONTACT_ANCHOR_Y=106")
print("COMMIT_ANCHOR_Y=104")
print("CONTACT_SOURCE_RECT=REMOVED")
print("ABSOLUTE_PIVOTS=PRESERVED")
print("RUN=LOCKED")
print("TIMING=UNCHANGED")
print("EFFECTS=UNCHANGED")
print("REGISTRATION=UNCHANGED")
print("DEFORMATION=UNCHANGED")
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
echo "=== COMMIT + PUSH ==="
git add "$ATTACK1_REL"
git commit -m "Repair Vanguard attack one source rows and pivots"
git push origin main
REV="$(git rev-parse HEAD)"
echo "REV=$REV"

echo
echo "=== COMMITTED READBACK ==="
git show "$REV:$ATTACK1_REL" > "$L/attack1-committed.json"
python3 - "$L/attack1-committed.json" <<'PY'
import json,sys
a=json.load(open(sys.argv[1]))
rb=a["atlases"]["vanguard-canonical"]["rowBounds"]
assert rb["4"]==[401,495]
assert rb["5"]==[495,596]
assert rb["6"]==[596,703]
assert a["sources"]["chamber"]["anchorPoint"]==[64,93]
assert a["sources"]["preimpact"]["anchorPoint"]==[60,106]
assert a["sources"]["contact"]["anchorPoint"]==[46,106]
assert a["sources"]["commit"]["anchorPoint"]==[58,104]
assert "sourceRect" not in a["sources"]["contact"]
assert a["stage"]["centerX"]==220
print("COMMITTED_READBACK=PASS")
print("ABSOLUTE_PIVOT_INVARIANT=PASS")
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

BASE=""
for PORT in 8766 8767 8768 8769 8770 8771 8772 8773 8774 8775; do
  CANDIDATE="http://127.0.0.1:$PORT"
  if probe_exact_server "$CANDIDATE"; then
    BASE="$CANDIDATE"
    echo "SERVER=REUSED_EXACT PORT=$PORT"
    break
  fi
  python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$W/dist" >"$L/server-$PORT.log" 2>&1 &
  PID=$!
  sleep 1
  if kill -0 "$PID" 2>/dev/null; then
    BASE="$CANDIDATE"
    echo "$PID" > "$L/server.pid"
    echo "$PORT" > "$L/server.port"
    echo "SERVER=STARTED PORT=$PORT PID=$PID"
    break
  fi
done

[ -n "$BASE" ] || {
  echo "STOP: no review port available in 8766..8775"
  exit 1
}

probe_exact_server "$BASE" || {
  echo "STOP: runtime recipe bytes do not match exact built revision"
  exit 1
}

STAMP="$(date +%s)"
URL="$BASE/motion.html?procedural=vanguard-overhand-strike&rev=$REV&nocache=$STAMP"

echo
echo "============================================================"
echo " ATTACK 1 ROW / PIVOT REPAIR READY"
echo "============================================================"
echo "REV=$REV"
echo "RUN=LOCKED_ACCEPTED"
echo "ATTACK1_REVIEW=$URL"
echo "HUMAN_VERDICT=PENDING"

termux-open-url "$URL"
