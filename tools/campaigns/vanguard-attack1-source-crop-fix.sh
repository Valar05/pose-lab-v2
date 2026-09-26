#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export GIT_PAGER=cat PAGER=cat

P="$HOME/storage/documents/GodotProjects/pose-lab-v2"
L="$HOME/.local/state/pose-lab-v2-vanguard-attack1-crop"
W="$L/worktree"

RUN_REL="public/assets/vanguard/procedural/run.recipe.json"
ATTACK1_REL="public/assets/vanguard/procedural/overhand-strike.recipe.json"
RENDERER_REL="src/procedural-motion-preview.js"

RUN="$P/$RUN_REL"
ATTACK1="$P/$ATTACK1_REL"
RENDERER="$P/$RENDERER_REL"

cd "$P"

cat   AGENTS.md   docs/POSE_LAB_CAMPAIGN_RULES.md   docs/POSE_IS_GOD.md   docs/VANGUARD_ATLAS_AUTHORITY.md   animations/candidates/vanguard/overhand-strike/MANUAL_TEST_PROMPT.md   >/dev/null

echo "============================================================"
echo " VANGUARD ATTACK 1 SOURCE-LOCAL CROP FIX"
echo "============================================================"
echo "HUMAN_VERDICT=Run fixed; locked"
echo "MISSION=remove the second sprite visible at the bottom of Attack 1 contact source"
echo "EVIDENCE=contact source diagnostic shows intended sprite rows 0..31, empty gap 32..57, neighboring sprite begins at row 58"
echo "WRITABLE=$ATTACK1_REL contact.sourceRect only; $RENDERER_REL default-off sourceRect support only"
echo "LOCKED=$RUN_REL entire file; atlas bytes; Attack1 rowBounds/centerX/cells/timing/effects/registration/deformation/anchorPoint; every other recipe"

mkdir -p "$L"

echo
echo "=== DIRTY PREFLIGHT ==="
git status --short

for F in "$RUN_REL" "$ATTACK1_REL" "$RENDERER_REL"; do
  if ! git diff --quiet HEAD -- "$F"; then
    git diff -- "$F" > "$L/$(basename "$F").preflight.diff"
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
cp "$ATTACK1" "$L/attack1-before.json"
cp "$RENDERER" "$L/renderer-before.js"

echo
echo "=== ADD DEFAULT-OFF BODY sourceRect SUPPORT ==="
python3 - "$RENDERER" <<'PY'
from pathlib import Path
import sys

p=Path(sys.argv[1])
s=p.read_text()

old=" const src=recipe.sources[sourceId],spec=recipe.atlases[src.atlas],[sx,sy,sw,sh]=rect(spec,src.cell);"
new=""" const src=recipe.sources[sourceId],spec=recipe.atlases[src.atlas];
 let [sx,sy,sw,sh]=rect(spec,src.cell);
 if(Array.isArray(src.sourceRect)&&src.sourceRect.length===4){
  const [rx,ry,rw,rh]=src.sourceRect.map(Number);
  if(![rx,ry,rw,rh].every(Number.isFinite)||rw<=0||rh<=0)throw new Error('Invalid sourceRect for '+sourceId);
  if(rx<0||ry<0||rx+rw>sw||ry+rh>sh)throw new Error('sourceRect escapes atlas cell for '+sourceId);
  sx+=rx;sy+=ry;sw=rw;sh=rh;
 }"""

if "src.sourceRect" in s:
    print("SOURCE_RECT_SUPPORT=ALREADY_PRESENT")
else:
    assert s.count(old)==1, f"STOP: expected exact body source line once, found {s.count(old)}"
    s=s.replace(old,new,1)
    p.write_text(s)
    print("SOURCE_RECT_SUPPORT=INSTALLED")
PY

node --check "$RENDERER"

echo
echo "=== CROP ONLY ATTACK 1 CONTACT SOURCE ==="
python3 - "$ATTACK1" <<'PY'
from pathlib import Path
import copy,json,sys

p=Path(sys.argv[1])
before=json.loads(p.read_text())
after=copy.deepcopy(before)

assert after["id"]=="vanguard-overhand-strike-procedural-proof-v4"
assert after["stage"]["centerX"]==220
assert after["atlases"]["vanguard-canonical"]["path"]=="assets/vanguard/procedural/vanguard-pose-atlas-expanded.png"

# Restore shared row geometry. This fix is source-local.
rb=after["atlases"]["vanguard-canonical"]["rowBounds"]
rb["5"]=[512,614]
rb["6"]=[614,717]

contact=after["sources"]["contact"]
assert contact["cell"]==35
assert contact["anchorMode"]=="explicit-point"
assert contact["anchorPoint"]==[46,89]

# The bad diagnostic crop is 162x102:
# intended sprite occupies y=0..31
# empty space y=32..57
# next sprite starts at y=58
#
# Runtime cell width is 173px. Keep full width, keep 2px bottom safety margin,
# and stop before the dead-space + neighboring-sprite region.
contact["sourceRect"]=[0,0,173,34]

# Remove failed experiments from Attack 1 sources.
for key in ("idle","chamber","commit","preimpact","contact"):
    src=after["sources"][key]
    src.pop("backgroundKey",None)
    src.pop("backgroundKeyThreshold",None)
    src.pop("isolateLargestComponent",None)

def normalize(o):
    x=copy.deepcopy(o)
    rb=x["atlases"]["vanguard-canonical"]["rowBounds"]
    rb["5"]="__ROW5__";rb["6"]="__ROW6__"
    for key in ("idle","chamber","commit","preimpact","contact"):
        src=x["sources"][key]
        src.pop("backgroundKey",None)
        src.pop("backgroundKeyThreshold",None)
        src.pop("isolateLargestComponent",None)
    x["sources"]["contact"]["sourceRect"]="__CONTACT_SOURCE_RECT__"
    return x

before_cmp=copy.deepcopy(before)
before_cmp["atlases"]["vanguard-canonical"]["rowBounds"]["5"]="__ROW5__"
before_cmp["atlases"]["vanguard-canonical"]["rowBounds"]["6"]="__ROW6__"
for key in ("idle","chamber","commit","preimpact","contact"):
    src=before_cmp["sources"][key]
    src.pop("backgroundKey",None)
    src.pop("backgroundKeyThreshold",None)
    src.pop("isolateLargestComponent",None)
before_cmp["sources"]["contact"]["sourceRect"]="__CONTACT_SOURCE_RECT__"

assert normalize(after)==before_cmp, "STOP: Attack 1 mutation escaped contact source crop surface"

p.write_text(json.dumps(after,indent=2)+"\n")

print("ATTACK1_CONTACT_CELL=35")
print("ATTACK1_CONTACT_SOURCE_RECT=[0,0,173,34]")
print("ATTACK1_CONTACT_ANCHOR_POINT=PRESERVED_[46,89]")
print("ROW_BOUNDS=RESTORED_SHARED_GEOMETRY")
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
[ "${#CHANGED[@]}" -eq 2 ] || {
  echo "STOP: expected exactly Attack 1 recipe + renderer"
  exit 1
}
for F in "${CHANGED[@]}"; do
  case "$F" in
    "$ATTACK1_REL"|"$RENDERER_REL") ;;
    *) echo "STOP: unauthorized diff $F"; exit 1 ;;
  esac
done

[ "$(sha256sum "$RUN" | awk '{print $1}')" = "$RUN_SHA" ] || {
  echo "STOP: accepted Run changed"
  exit 1
}

echo
echo "=== COMMIT + PUSH ==="
git add "$ATTACK1_REL" "$RENDERER_REL"
git commit -m "Crop Vanguard attack one contact source locally"
git push origin main
REV="$(git rev-parse HEAD)"
echo "REV=$REV"

echo
echo "=== COMMITTED READBACK ==="
git show "$REV:$ATTACK1_REL" > "$L/attack1-committed.json"
git show "$REV:$RENDERER_REL" > "$L/renderer-committed.js"

python3 - "$L/attack1-committed.json" <<'PY'
import json,sys
a=json.load(open(sys.argv[1]))
assert a["sources"]["contact"]["cell"]==35
assert a["sources"]["contact"]["sourceRect"]==[0,0,173,34]
assert a["sources"]["contact"]["anchorPoint"]==[46,89]
assert a["stage"]["centerX"]==220
assert a["atlases"]["vanguard-canonical"]["rowBounds"]["5"]==[512,614]
assert a["atlases"]["vanguard-canonical"]["rowBounds"]["6"]==[614,717]
print("ATTACK1_COMMITTED_READBACK=PASS")
PY

grep -Fq "Array.isArray(src.sourceRect)" "$L/renderer-committed.js"
echo "RENDERER_COMMITTED_READBACK=PASS"

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

for U in   assets/vanguard/procedural/vanguard-pose-atlas-expanded.png   assets/vanguard/procedural/overhand-strike.recipe.json   src/procedural-motion-preview.js; do
  curl -fsS "http://127.0.0.1:8766/$U" >/dev/null
done

STAMP="$(date +%s)"
URL="http://127.0.0.1:8766/motion.html?procedural=vanguard-overhand-strike&rev=$REV&nocache=$STAMP"

echo
echo "============================================================"
echo " ATTACK 1 SOURCE-LOCAL CROP DEPLOYED"
echo "============================================================"
echo "REV=$REV"
echo "RUN=LOCKED_ACCEPTED"
echo "CONTACT_SOURCE_RECT=[0,0,173,34]"
echo "ATTACK1_REVIEW=$URL"
echo "HUMAN_VERDICT=PENDING"

termux-open-url "$URL"
