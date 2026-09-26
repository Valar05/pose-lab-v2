#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export GIT_PAGER=cat PAGER=cat

P="$HOME/storage/documents/GodotProjects/pose-lab-v2"
L="$HOME/.local/state/pose-lab-v2-vanguard-live"
W="$L/worktree"

RUN_REL="public/assets/vanguard/procedural/run.recipe.json"
ATTACK1_REL="public/assets/vanguard/procedural/overhand-strike.recipe.json"
RUN="$P/$RUN_REL"
ATTACK1="$P/$ATTACK1_REL"

cd "$P"

cat   AGENTS.md   docs/POSE_LAB_CAMPAIGN_RULES.md   docs/POSE_IS_GOD.md   docs/VANGUARD_ATLAS_AUTHORITY.md   >/dev/null

echo "============================================================"
echo " VANGUARD ATTACK 1 CROP CLEANUP"
echo "============================================================"
echo "HUMAN_VERDICT=Run fixed; lock it"
echo "MISSION=remove detached neighboring-row fragments from Attack 1 body sources only"
echo "WRITABLE=$ATTACK1_REL sources.chamber/preimpact/contact isolateLargestComponent only"
echo "LOCKED=$RUN_REL entire file; atlas bytes; rowBounds; centerX; cells; timing; effects; registration; deformation; anchors; every other recipe"

mkdir -p "$L/run-attack1-recenter"

echo
echo "=== DIRTY PREFLIGHT ==="
git status --short
for F in "$RUN_REL" "$ATTACK1_REL"; do
  if ! git diff --quiet HEAD -- "$F"; then
    git diff -- "$F" > "$L/run-attack1-recenter/$(basename "$F").preflight.diff"
    echo "STOP: target already dirty; archived diff: $F"
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
cp "$ATTACK1" "$L/run-attack1-recenter/attack1-before.json"

echo
echo "=== APPLY ATTACK 1 FRAGMENT ISOLATION ONLY ==="
python3 - "$ATTACK1" <<'PY'
from pathlib import Path
import copy,json,sys

p=Path(sys.argv[1])
before=json.loads(p.read_text())
after=copy.deepcopy(before)

assert after["id"]=="vanguard-overhand-strike-procedural-proof-v4"
assert after["stage"]["centerX"]==220
assert after["atlases"]["vanguard-canonical"]["path"]=="assets/vanguard/procedural/vanguard-pose-atlas-expanded.png"

# Video review shows detached neighboring-row fragments during Attack 1.
# These three source cells are the affected crops. Use the renderer's existing
# source-local component isolation, already supported before explicit-point anchoring.
for key,cell in (("chamber",26),("preimpact",32),("contact",35)):
    src=after["sources"][key]
    assert src["cell"]==cell
    assert src["kind"]=="atlas-cell"
    assert src["anchorMode"]=="explicit-point"
    src["isolateLargestComponent"]=True

def scrub(o):
    x=copy.deepcopy(o)
    for key in ("chamber","preimpact","contact"):
        x["sources"][key]["isolateLargestComponent"]="__AUTHORIZED__"
    return x

# Normalize absent-before keys for strict comparison.
before_cmp=copy.deepcopy(before)
for key in ("chamber","preimpact","contact"):
    before_cmp["sources"][key]["isolateLargestComponent"]="__AUTHORIZED__"

assert scrub(after)==before_cmp, "STOP: Attack 1 mutation escaped authorized source-local cleanup"

p.write_text(json.dumps(after,indent=2)+"\n")

print("ATTACK1_CHAMBER_26=isolateLargestComponent:true")
print("ATTACK1_PREIMPACT_32=isolateLargestComponent:true")
print("ATTACK1_CONTACT_35=isolateLargestComponent:true")
print("RUN=LOCKED_UNCHANGED")
print("ROW_BOUNDS=UNCHANGED")
print("CENTER_X=UNCHANGED")
print("TIMING=UNCHANGED")
print("EFFECTS=UNCHANGED")
print("REGISTRATION=UNCHANGED")
print("ANCHOR_POINTS=UNCHANGED")
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
  echo "STOP: Run changed after human acceptance"
  exit 1
}

echo
echo "=== COMMIT + PUSH ==="
git add "$ATTACK1_REL"
git commit -m "Clean detached fragments from Vanguard attack one"
git push origin main
REV="$(git rev-parse HEAD)"
echo "REV=$REV"

echo
echo "=== COMMITTED READBACK ==="
git show "$REV:$ATTACK1_REL" > "$L/run-attack1-recenter/attack1-committed.json"

python3 - "$L/run-attack1-recenter/attack1-before.json" "$L/run-attack1-recenter/attack1-committed.json" <<'PY'
import copy,json,sys
b=json.load(open(sys.argv[1]))
a=json.load(open(sys.argv[2]))

for key in ("chamber","preimpact","contact"):
    assert a["sources"][key]["isolateLargestComponent"] is True

def scrub(o):
    x=copy.deepcopy(o)
    for key in ("chamber","preimpact","contact"):
        x["sources"][key]["isolateLargestComponent"]="__AUTHORIZED__"
    return x

bb=copy.deepcopy(b)
for key in ("chamber","preimpact","contact"):
    bb["sources"][key]["isolateLargestComponent"]="__AUTHORIZED__"

assert scrub(a)==bb
print("COMMITTED_READBACK=PASS")
print("AUTHORIZED_MUTATION=3_SOURCE_LOCAL_COMPONENT_FLAGS")
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
[ ! -f "$L/server.pid" ] || kill "$(cat "$L/server.pid")" 2>/dev/null || true
python3 -m http.server 8766 --bind 127.0.0.1 --directory "$W/dist" >"$L/server.log" 2>&1 &
PID=$!
echo "$PID" > "$L/server.pid"
sleep 2
kill -0 "$PID" || { cat "$L/server.log"; exit 1; }

for U in   assets/vanguard/procedural/vanguard-pose-atlas-expanded.png   assets/vanguard/procedural/overhand-strike.recipe.json; do
  curl -fsS "http://127.0.0.1:8766/$U" >/dev/null
done

STAMP="$(date +%s)"
URL="http://127.0.0.1:8766/motion.html?procedural=vanguard-overhand-strike&rev=$REV&nocache=$STAMP"

echo
echo "============================================================"
echo " ATTACK 1 CROP CLEANUP DEPLOYED"
echo "============================================================"
echo "REV=$REV"
echo "RUN=LOCKED_ACCEPTED"
echo "ATTACK1_REVIEW=$URL"
echo "HUMAN_VERDICT=PENDING"

termux-open-url "$URL"
