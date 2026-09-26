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
echo " VANGUARD ATTACK 1 EXACT ROW SEPARATOR"
echo "============================================================"
echo "HUMAN_VERDICT=Run fixed; locked"
echo "MISSION=fix Attack 1 crop at the actual row-5/row-6 separator"
echo "EVIDENCE=accepted source has row-5 pose band ending before source y=569 and row-6 pose band beginning at source y=569; expanded atlas scale maps that boundary to y=609"
echo "WRITABLE=$ATTACK1_REL rowBounds[5], rowBounds[6], removal of failed background-key flags"
echo "LOCKED=$RUN_REL entire file; atlas bytes; Attack1 centerX/cells/timing/effects/registration/deformation/anchors; renderer; every other recipe"

mkdir -p "$L/run-attack1-recenter"

echo
echo "=== DIRTY PREFLIGHT ==="
git status --short

# Recover only campaign-owned partial Attack1 dirt from failed prior runs.
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

if ! git diff --quiet HEAD -- "$RUN_REL"; then
  git diff -- "$RUN_REL" > "$L/run-attack1-recenter/run.preflight.diff"
  echo "STOP: accepted Run is dirty; archived diff"
  exit 1
fi

echo
echo "=== SYNC MAIN ==="
git fetch origin main
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || git merge --ff-only origin/main
START="$(git rev-parse HEAD)"
echo "START_HEAD=$START"

RUN_SHA="$(sha256sum "$RUN" | awk '{print $1}')"
cp "$ATTACK1" "$L/run-attack1-recenter/attack1-before.json"

echo
echo "=== APPLY EXACT 609PX ROW SEPARATOR ==="
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

# Accepted source evidence:
# source row-5 target band occupies roughly y=480..543
# source row-6 target band starts y=569
# accepted atlas normalization scale = 1037/968 = 1.0712809917
# round(569 * scale) = 609
#
# Use one shared exact separator. No gap, no overlap.
rb["5"]=[512,609]
rb["6"]=[609,717]

# Remove failed experiments that did not change the visible result.
for key in ("idle","chamber","commit","preimpact","contact"):
    src=after["sources"][key]
    src.pop("backgroundKey",None)
    src.pop("backgroundKeyThreshold",None)
    src.pop("isolateLargestComponent",None)

def normalize(o):
    x=copy.deepcopy(o)
    rb=x["atlases"]["vanguard-canonical"]["rowBounds"]
    rb["5"]="__AUTHORIZED__"; rb["6"]="__AUTHORIZED__"
    for key in ("idle","chamber","commit","preimpact","contact"):
        src=x["sources"][key]
        src.pop("backgroundKey",None)
        src.pop("backgroundKeyThreshold",None)
        src.pop("isolateLargestComponent",None)
    return x

assert normalize(after)==normalize(before), "STOP: Attack1 mutation escaped exact crop surface"

p.write_text(json.dumps(after,indent=2)+"\n")

print(f"ATTACK1_ROW5={before['atlases']['vanguard-canonical']['rowBounds']['5']}->[512, 609]")
print(f"ATTACK1_ROW6={before['atlases']['vanguard-canonical']['rowBounds']['6']}->[609, 717]")
print("ROW5_ROW6_GAP=0")
print("ROW5_ROW6_OVERLAP=0")
print("FAILED_BACKGROUND_KEY_FLAGS=REMOVED")
print("RUN=LOCKED")
print("CENTER_X=UNCHANGED_220")
print("CELLS=UNCHANGED")
print("TIMING=UNCHANGED")
print("EFFECTS=UNCHANGED")
print("REGISTRATION=UNCHANGED")
print("DEFORMATION=UNCHANGED")
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

echo
echo "=== COMMIT + PUSH ==="
git add "$ATTACK1_REL"
git commit -m "Fix Vanguard attack one row separator"
git push origin main
REV="$(git rev-parse HEAD)"
echo "REV=$REV"

echo
echo "=== COMMITTED READBACK ==="
git show "$REV:$ATTACK1_REL" > "$L/run-attack1-recenter/attack1-committed.json"
python3 - "$L/run-attack1-recenter/attack1-committed.json" <<'PY'
import json,sys
a=json.load(open(sys.argv[1]))
rb=a["atlases"]["vanguard-canonical"]["rowBounds"]
assert rb["5"]==[512,609]
assert rb["6"]==[609,717]
assert rb["5"][1]==rb["6"][0]
assert a["stage"]["centerX"]==220
for key in ("idle","chamber","commit","preimpact","contact"):
    src=a["sources"][key]
    assert "backgroundKey" not in src
    assert "backgroundKeyThreshold" not in src
    assert "isolateLargestComponent" not in src
print("COMMITTED_READBACK=PASS")
print("ATTACK1_EXACT_SEPARATOR_Y=609")
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
echo " ATTACK 1 EXACT ROW SEPARATOR DEPLOYED"
echo "============================================================"
echo "REV=$REV"
echo "RUN=LOCKED_ACCEPTED"
echo "ATTACK1_REVIEW=$URL"
echo "HUMAN_VERDICT=PENDING"

termux-open-url "$URL"
