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
echo " VANGUARD ATTACK 1 CROP FIX"
echo "============================================================"
echo "HUMAN_VERDICT=Run fixed; locked"
echo "MISSION=fix Attack 1 source extraction windows only"
echo "EVIDENCE=row 5 includes the first pixels of row 6; row 6 starts a few pixels late"
echo "WRITABLE=$ATTACK1_REL rowBounds[5], rowBounds[6], and removal of failed isolate flags"
echo "LOCKED=$RUN_REL entire file; Attack1 centerX/cells/timing/effects/registration/deformation/anchors; atlas bytes; every other recipe"

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
echo "=== FIX ATTACK 1 EXTRACTION WINDOWS ONLY ==="
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

# Measured from the accepted canonical atlas source:
# - row 5 target foreground ends before y~600 in expanded coordinates.
#   The old y1=614 included the first pixels of row 6, producing the visible fragment.
# - row 6 target foreground begins around y~608.
#   The old y0=614 clipped the top of that pose.
rb["5"]=[512,600]
rb["6"]=[608,717]

# The previous isolateLargestComponent experiment was a no-op because the
# atlas background is opaque black, so remove those failed experimental flags.
for key in ("chamber","preimpact","contact"):
    after["sources"][key].pop("isolateLargestComponent",None)

def scrub(o):
    x=copy.deepcopy(o)
    x["atlases"]["vanguard-canonical"]["rowBounds"]["5"]="__AUTHORIZED__"
    x["atlases"]["vanguard-canonical"]["rowBounds"]["6"]="__AUTHORIZED__"
    for key in ("chamber","preimpact","contact"):
        x["sources"][key].pop("isolateLargestComponent",None)
    return x

assert scrub(after)==scrub(before), "STOP: Attack 1 mutation escaped crop-only surface"

p.write_text(json.dumps(after,indent=2)+"\n")

print(f"ATTACK1_ROW5={before['atlases']['vanguard-canonical']['rowBounds']['5']}->[512, 600]")
print(f"ATTACK1_ROW6={before['atlases']['vanguard-canonical']['rowBounds']['6']}->[608, 717]")
print("FAILED_ISOLATE_FLAGS=REMOVED")
print("RUN=LOCKED_UNCHANGED")
print("CENTER_X=UNCHANGED")
print("POSE_CELLS=UNCHANGED")
print("TIMING=UNCHANGED")
print("EFFECTS=UNCHANGED")
print("REGISTRATION=UNCHANGED")
print("DEFORMATION=UNCHANGED")
print("ANCHOR_POINTS=UNCHANGED")
print("ATLAS_BYTES=UNCHANGED")
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
git commit -m "Fix Vanguard attack one crop windows"
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

rb=a["atlases"]["vanguard-canonical"]["rowBounds"]
assert rb["5"]==[512,600]
assert rb["6"]==[608,717]
assert a["stage"]["centerX"]==220
for key in ("chamber","preimpact","contact"):
    assert "isolateLargestComponent" not in a["sources"][key]

def scrub(o):
    x=copy.deepcopy(o)
    x["atlases"]["vanguard-canonical"]["rowBounds"]["5"]="__AUTHORIZED__"
    x["atlases"]["vanguard-canonical"]["rowBounds"]["6"]="__AUTHORIZED__"
    for key in ("chamber","preimpact","contact"):
        x["sources"][key].pop("isolateLargestComponent",None)
    return x

assert scrub(a)==scrub(b)
print("COMMITTED_READBACK=PASS")
print("AUTHORIZED_MUTATION=ATTACK1_ROW5_ROW6_CROP_ONLY")
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
echo " ATTACK 1 CROP FIX DEPLOYED"
echo "============================================================"
echo "REV=$REV"
echo "RUN=LOCKED_ACCEPTED"
echo "ATTACK1_REVIEW=$URL"
echo "HUMAN_VERDICT=PENDING"

termux-open-url "$URL"
