#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export GIT_PAGER=cat PAGER=cat

P="$HOME/storage/documents/GodotProjects/pose-lab-v2"
L="$HOME/.local/state/pose-lab-v2-vanguard-live"
W="$L/worktree"

ATLAS_REL="public/assets/vanguard/procedural/vanguard-pose-atlas-90.png"
RUN_REL="src/procedural-run-preview.js"
ATLAS="$P/$ATLAS_REL"
RUN="$P/$RUN_REL"

cd "$P"

cat AGENTS.md docs/POSE_LAB_CAMPAIGN_RULES.md docs/POSE_IS_GOD.md >/dev/null

echo "============================================================"
echo " VANGUARD ATLAS 1728 + LEGACY READER COMPAT REPAIR"
echo "============================================================"
echo "MISSION=remove proven campaign-owned 4168px tail; preserve canonical 0..1728 pixels; make idle/run read declared 1536px atlas view"
echo "WRITABLE=$ATLAS_REL dimension/tail only; $RUN_REL legacy atlas-view compatibility only"
echo "LOCKED=all pixels x=0..1037,y=0..1728; all recipes; shotgun timing/effects; all pose identities; all registration"

echo
echo "=== DIRTY PREFLIGHT ==="
git status --short
for F in "$ATLAS_REL" "$RUN_REL"; do
  if ! git diff --quiet HEAD -- "$F"; then
    mkdir -p "$L/atlas-1728-repair"
    git diff -- "$F" > "$L/atlas-1728-repair/$(basename "$F").preflight.diff"
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

mkdir -p "$L/atlas-1728-repair"

echo
echo "=== PROVE CAMPAIGN-OWNED HEIGHT EXPLOSION + TRIM ==="
python3 - "$ATLAS" "$L/atlas-1728-repair/before-4168.png" "$L/atlas-1728-repair/retained-1728.png" <<'PY'
from PIL import Image
from pathlib import Path
import hashlib,sys

atlas_p,before_p,retained_p=map(Path,sys.argv[1:])
im=Image.open(atlas_p).convert("RGB")

assert im.size==(1037,4168), f"STOP: expected proven bad 1037x4168 state, got {im.size}"

im.save(before_p)

retained=im.crop((0,0,1037,1728))
retained.save(retained_p)

# Pixel-retained area is authority. Tail deletion is the only atlas mutation.
assert retained.tobytes()==im.crop((0,0,1037,1728)).tobytes()

def rect(cell):
    i=cell-1
    row=i//6
    col=i%6
    x0=round(col*1037/6)
    x1=round((col+1)*1037/6)
    assert row in (15,16)
    y0=1536+(row-15)*96
    y1=y0+96
    return x0,y0,x1,y1

def occupied(c):
    box=rect(c)
    part=retained.crop(box)
    return max(ch[1] for ch in part.getextrema())>18

for c in (91,92,93,97,98,99):
    assert occupied(c), f"STOP: required shotgun cell {c} empty before trim"

for c in (94,95,96,100,101,102):
    assert not occupied(c), f"STOP: reserved cell {c} unexpectedly populated before trim"

retained.save(atlas_p)

check=Image.open(atlas_p).convert("RGB")
assert check.size==(1037,1728)
assert check.tobytes()==retained.tobytes()

print("BAD_ATLAS_SIZE=1037x4168")
print("CANONICAL_ATLAS_SIZE=1037x1728")
print("RETAINED_PIXEL_RECTANGLE=BYTE_IDENTICAL_PIXELS")
print("SHOTGUN_CELLS=91,92,93,97,98,99 PRESENT")
print("RESERVED_CELLS=94,95,96,100,101,102 EMPTY")
print("RETAINED_SHA256="+hashlib.sha256(atlas_p.read_bytes()).hexdigest())
PY

echo
echo "=== PATCH LEGACY IDLE/RUN ATLAS VIEW ==="
python3 - "$RUN" <<'PY'
from pathlib import Path
import sys

p=Path(sys.argv[1])
s=p.read_text()

old_rect=""" const explicit=a.rowBounds?.[String(r)];
 const y0=explicit?Number(explicit[0]):Math.round(r*atlas.naturalHeight/a.rows);
 const y1=explicit?Number(explicit[1]):Math.round((r+1)*atlas.naturalHeight/a.rows);"""

new_rect=""" const explicit=a.rowBounds?.[String(r)];
 const viewHeight=Number(a.size?.[1]??atlas.naturalHeight);
 const y0=explicit?Number(explicit[0]):Math.round(r*viewHeight/a.rows);
 const y1=explicit?Number(explicit[1]):Math.round((r+1)*viewHeight/a.rows);"""

old_guard=""" if(atlas.naturalWidth!==recipe.atlas.size[0]||atlas.naturalHeight!==recipe.atlas.size[1])throw new Error(`Wrong Vanguard atlas dimensions: expected ${recipe.atlas.size.join('x')}, got ${atlas.naturalWidth}x${atlas.naturalHeight}`);"""

new_guard=""" const declaredAtlasWidth=Number(recipe.atlas.size[0]),declaredAtlasHeight=Number(recipe.atlas.size[1]);
 if(atlas.naturalWidth!==declaredAtlasWidth||atlas.naturalHeight<declaredAtlasHeight)throw new Error(`Wrong Vanguard atlas dimensions: expected width ${declaredAtlasWidth} and height >= ${declaredAtlasHeight}, got ${atlas.naturalWidth}x${atlas.naturalHeight}`);"""

assert old_rect in s, "STOP: rectFor legacy geometry insertion point changed"
assert old_guard in s, "STOP: legacy atlas dimension guard changed"

s=s.replace(old_rect,new_rect,1)
s=s.replace(old_guard,new_guard,1)

p.write_text(s)

print("LEGACY_ROW_GEOMETRY=recipe-declared-view-height")
print("LEGACY_DIMENSION_GUARD=exact-width + physical-height-at-least-declared")
PY

node --check "$RUN"

echo
echo "=== DIFF GUARD ==="
mapfile -t CHANGED < <(git diff --name-only)
printf 'changed=%s\n' "${CHANGED[@]}"
for F in "${CHANGED[@]}"; do
  case "$F" in
    "$ATLAS_REL"|"$RUN_REL") ;;
    *) echo "STOP: UNAUTHORIZED_DIFF $F"; exit 1 ;;
  esac
done
[ "${#CHANGED[@]}" -eq 2 ] || {
  echo "STOP: expected exactly atlas + legacy reader changes"
  exit 1
}

# Prove accepted top 1536 pixels and repaired append rows are untouched by the trim.
python3 - "$ATLAS" "$L/atlas-1728-repair/retained-1728.png" <<'PY'
from PIL import Image
import sys
a=Image.open(sys.argv[1]).convert("RGB")
r=Image.open(sys.argv[2]).convert("RGB")
assert a.size==r.size==(1037,1728)
assert a.tobytes()==r.tobytes()
print("ATLAS_PIXEL_MUTATION_INSIDE_1728=NONE")
PY

echo
echo "=== COMMIT + PUSH ==="
git add "$ATLAS_REL" "$RUN_REL"
git commit -m "Restore Vanguard atlas to 1728 and preserve legacy atlas views"
git push origin main
REV="$(git rev-parse HEAD)"
echo "REV=$REV"

echo
echo "=== COMMITTED READBACK ==="
git show "$REV:$ATLAS_REL" > "$L/atlas-1728-repair/committed-atlas.png"
cmp -s "$ATLAS" "$L/atlas-1728-repair/committed-atlas.png" || {
  echo "STOP: committed atlas readback mismatch"
  exit 1
}
git show "$REV:$RUN_REL" > "$L/atlas-1728-repair/committed-run-preview.js"
grep -Fq 'const viewHeight=Number(a.size?.[1]??atlas.naturalHeight);' "$L/atlas-1728-repair/committed-run-preview.js"
grep -Fq 'atlas.naturalHeight<declaredAtlasHeight' "$L/atlas-1728-repair/committed-run-preview.js"

python3 - "$L/atlas-1728-repair/committed-atlas.png" <<'PY'
from PIL import Image
import sys
assert Image.open(sys.argv[1]).size==(1037,1728)
print("COMMITTED_ATLAS_SIZE=1037x1728")
PY

echo
echo "=== EXACT-REVISION BUILD ==="
git worktree remove --force "$W" 2>/dev/null || true
rm -rf "$W"
git worktree add --detach "$W" "$REV"
cd "$W"

node --check src/procedural-run-preview.js
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

curl -fsS "http://127.0.0.1:8766/assets/vanguard/procedural/vanguard-pose-atlas-90.png" >/dev/null
curl -fsS "http://127.0.0.1:8766/assets/vanguard/procedural/idle.recipe.json" >/dev/null
curl -fsS "http://127.0.0.1:8766/assets/vanguard/procedural/run.recipe.json" >/dev/null
curl -fsS "http://127.0.0.1:8766/assets/vanguard/procedural/shotgun-reload.recipe.json" >/dev/null
curl -fsS "http://127.0.0.1:8766/assets/vanguard/procedural/shotgun-fire.recipe.json" >/dev/null

STAMP="$(date +%s)"
IDLE="http://127.0.0.1:8766/motion.html?procedural=vanguard-idle&rev=$REV&nocache=$STAMP"
RUNURL="http://127.0.0.1:8766/motion.html?procedural=vanguard-run&rev=$REV&nocache=$STAMP"
RELOADURL="http://127.0.0.1:8766/motion.html?procedural=vanguard-shotgun-reload&rev=$REV&nocache=$STAMP"
FIREURL="http://127.0.0.1:8766/motion.html?procedural=vanguard-shotgun-fire&rev=$REV&nocache=$STAMP"

echo
echo "============================================================"
echo " ATLAS 1728 REPAIR DEPLOYED"
echo "============================================================"
echo "REV=$REV"
echo "ATLAS=1037x1728"
echo "IDLE_REVIEW=$IDLE"
echo "RUN_REVIEW=$RUNURL"
echo "RELOAD_REVIEW=$RELOADURL"
echo "FIRE_REVIEW=$FIREURL"
echo "HUMAN_VERDICT=PENDING"

termux-open-url "$IDLE"
