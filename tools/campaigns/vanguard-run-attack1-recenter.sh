#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export GIT_PAGER=cat PAGER=cat

P="$HOME/storage/documents/GodotProjects/pose-lab-v2"
L="$HOME/.local/state/pose-lab-v2-vanguard-live"
W="$L/worktree"

RUN_REL="public/assets/vanguard/procedural/run.recipe.json"
ATTACK1_REL="public/assets/vanguard/procedural/overhand-strike.recipe.json"
RENDERER_REL="src/procedural-motion-preview.js"

RUN="$P/$RUN_REL"
ATTACK1="$P/$ATTACK1_REL"
RENDERER="$P/$RENDERER_REL"

cd "$P"

cat   AGENTS.md   docs/POSE_LAB_CAMPAIGN_RULES.md   docs/POSE_IS_GOD.md   docs/VANGUARD_ATLAS_AUTHORITY.md   >/dev/null

echo "============================================================"
echo " VANGUARD ATTACK 1 OPAQUE-BACKGROUND FIX"
echo "============================================================"
echo "HUMAN_VERDICT=Run fixed; locked"
echo "MISSION=opt Attack 1 body cells into canonical black-border keying"
echo "WRITABLE=$ATTACK1_REL source-local backgroundKey flags only"
echo "LOCKED=$RUN_REL entire file; renderer behavior for all non-opted-in sources; atlas bytes; Attack1 cells/timing/effects/registration/deformation/anchors/centerX"

mkdir -p "$L/run-attack1-recenter"

echo
echo "=== DIRTY PREFLIGHT ==="
git status --short

if ! git diff --quiet HEAD -- "$ATTACK1_REL"; then
  git diff -- "$ATTACK1_REL" > "$L/run-attack1-recenter/attack1.failed-prior-campaign.diff"
  git show "HEAD:$ATTACK1_REL" > "$L/run-attack1-recenter/attack1-head-before-recovery.json"
  python3 - "$ATTACK1" "$L/run-attack1-recenter/attack1-head-before-recovery.json" <<'PY'
import copy,json,sys
work=json.load(open(sys.argv[1]))
head=json.load(open(sys.argv[2]))

def normalize(o):
    x=copy.deepcopy(o)
    rb=x["atlases"]["vanguard-canonical"]["rowBounds"]
    rb["5"]="__CAMPAIGN__"; rb["6"]="__CAMPAIGN__"
    for key in ("idle","chamber","commit","preimpact","contact"):
        src=x["sources"][key]
        src.pop("backgroundKey",None)
        src.pop("backgroundKeyThreshold",None)
        src.pop("isolateLargestComponent",None)
    return x

assert normalize(work)==normalize(head), "STOP: Attack1 has unrelated dirty edits; archived diff only"
print("RECOVERABLE_PRIOR_CAMPAIGN_DIRTY=YES")
PY
  git restore --source=HEAD -- "$ATTACK1_REL"
fi

for F in "$RUN_REL" "$RENDERER_REL"; do
  if ! git diff --quiet HEAD -- "$F"; then
    git diff -- "$F" > "$L/run-attack1-recenter/$(basename "$F").preflight.diff"
    echo "STOP: locked/prerequisite file already dirty: $F"
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
RENDERER_SHA="$(sha256sum "$RENDERER" | awk '{print $1}')"

grep -Fq "if(src.backgroundKey==='black-border')" "$RENDERER" || {
  echo "STOP: canonical renderer prerequisite missing after sync"
  exit 1
}
echo "RENDERER_BLACK_BORDER_SUPPORT=CONFIRMED"

cp "$ATTACK1" "$L/run-attack1-recenter/attack1-before.json"

echo
echo "=== OPT ATTACK 1 INTO BLACK-BORDER KEYING ONLY ==="
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
rb["5"]=[512,614]
rb["6"]=[614,717]

for key in ("idle","chamber","commit","preimpact","contact"):
    src=after["sources"][key]
    assert src["kind"]=="atlas-cell"
    assert src["anchorMode"]=="explicit-point"
    src["backgroundKey"]="black-border"
    src["backgroundKeyThreshold"]=18
    src.pop("isolateLargestComponent",None)

def normalize(o):
    x=copy.deepcopy(o)
    rb=x["atlases"]["vanguard-canonical"]["rowBounds"]
    rb["5"]="__ROW5__"; rb["6"]="__ROW6__"
    for key in ("idle","chamber","commit","preimpact","contact"):
        src=x["sources"][key]
        src["backgroundKey"]="__KEY__"
        src["backgroundKeyThreshold"]="__THRESH__"
        src.pop("isolateLargestComponent",None)
    return x

before_cmp=copy.deepcopy(before)
before_cmp["atlases"]["vanguard-canonical"]["rowBounds"]["5"]="__ROW5__"
before_cmp["atlases"]["vanguard-canonical"]["rowBounds"]["6"]="__ROW6__"
for key in ("idle","chamber","commit","preimpact","contact"):
    src=before_cmp["sources"][key]
    src["backgroundKey"]="__KEY__"
    src["backgroundKeyThreshold"]="__THRESH__"
    src.pop("isolateLargestComponent",None)

assert normalize(after)==before_cmp, "STOP: Attack1 mutation escaped authorized source-local surface"

p.write_text(json.dumps(after,indent=2)+"\n")

print("ATTACK1_ROW5=512..614")
print("ATTACK1_ROW6=614..717")
print("ATTACK1_BODY_BACKGROUND_KEY=black-border")
print("ATTACK1_BODY_BACKGROUND_THRESHOLD=18")
print("RUN=LOCKED")
print("CENTER_X=UNCHANGED_220")
print("CELLS=UNCHANGED")
print("TIMING=UNCHANGED")
print("EFFECTS=UNCHANGED")
print("REGISTRATION=UNCHANGED")
print("ANCHORS=UNCHANGED")
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
[ "$(sha256sum "$RENDERER" | awk '{print $1}')" = "$RENDERER_SHA" ] || {
  echo "STOP: canonical renderer changed locally"
  exit 1
}

echo
echo "=== COMMIT + PUSH ==="
git add "$ATTACK1_REL"
git commit -m "Enable black-border keying for Vanguard attack one"
git push origin main
REV="$(git rev-parse HEAD)"
echo "REV=$REV"

echo
echo "=== COMMITTED READBACK ==="
git show "$REV:$ATTACK1_REL" > "$L/run-attack1-recenter/attack1-committed.json"
python3 - "$L/run-attack1-recenter/attack1-committed.json" <<'PY'
import json,sys
a=json.load(open(sys.argv[1]))
assert a["stage"]["centerX"]==220
assert a["atlases"]["vanguard-canonical"]["rowBounds"]["5"]==[512,614]
assert a["atlases"]["vanguard-canonical"]["rowBounds"]["6"]==[614,717]
for key in ("idle","chamber","commit","preimpact","contact"):
    assert a["sources"][key]["backgroundKey"]=="black-border"
    assert a["sources"][key]["backgroundKeyThreshold"]==18
    assert "isolateLargestComponent" not in a["sources"][key]
print("COMMITTED_READBACK=PASS")
PY

echo
echo "=== EXACT-REVISION BUILD ==="
git worktree remove --force "$W" 2>/dev/null || true
rm -rf "$W"
git worktree add --detach "$W" "$REV"
cd "$W"

grep -Fq "if(src.backgroundKey==='black-border')" src/procedural-motion-preview.js
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

for U in   assets/vanguard/procedural/vanguard-pose-atlas-expanded.png   assets/vanguard/procedural/overhand-strike.recipe.json   src/procedural-motion-preview.js; do
  curl -fsS "http://127.0.0.1:8766/$U" >/dev/null
done

STAMP="$(date +%s)"
URL="http://127.0.0.1:8766/motion.html?procedural=vanguard-overhand-strike&rev=$REV&nocache=$STAMP"

echo
echo "============================================================"
echo " ATTACK 1 OPAQUE-BACKGROUND FIX DEPLOYED"
echo "============================================================"
echo "REV=$REV"
echo "RUN=LOCKED_ACCEPTED"
echo "ATTACK1_REVIEW=$URL"
echo "HUMAN_VERDICT=PENDING"

termux-open-url "$URL"
