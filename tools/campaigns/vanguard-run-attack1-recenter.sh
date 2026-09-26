#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export GIT_PAGER=cat PAGER=cat

P="$HOME/storage/documents/GodotProjects/pose-lab-v2"
L="$HOME/.local/state/pose-lab-v2-vanguard-live"
W="$L/worktree"

RUN_REL="public/assets/vanguard/procedural/run.recipe.json"
ATTACK1_REL="public/assets/vanguard/procedural/overhand-strike.recipe.json"
ATLAS_REL="public/assets/vanguard/procedural/vanguard-pose-atlas-expanded.png"

RUN="$P/$RUN_REL"
ATTACK1="$P/$ATTACK1_REL"
ATLAS="$P/$ATLAS_REL"

cd "$P"

cat   AGENTS.md   docs/POSE_LAB_CAMPAIGN_RULES.md   docs/POSE_IS_GOD.md   docs/VANGUARD_ATLAS_AUTHORITY.md   >/dev/null

echo "============================================================"
echo " VANGUARD RUN + ATTACK 1 MEASURED RECENTER"
echo "============================================================"
echo "MISSION=apply the visible residual measured from Drew's 921137 review"
echo "EVIDENCE=both Run and Attack 1 visible sprite centers were about 5 px left of stage center"
echo "TARGET_X=220 internal canvas px (canonical center 215 + measured 5 px correction)"
echo "WRITABLE=Run canvas.anchor[0] + restoration of accepted Run offsetX pattern; Attack1 stage.centerX only"
echo "LOCKED=atlas bytes; cells; Y; timing; effects; deformation; scale; anchor points; every other recipe"

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

cp "$RUN" "$L/run-attack1-recenter/run-before.json"
cp "$ATTACK1" "$L/run-attack1-recenter/attack1-before.json"
ATLAS_SHA="$(sha256sum "$ATLAS" | awk '{print $1}')"

echo
echo "=== APPLY MEASURED +5PX RIGHT RECENTER ==="
python3 - "$RUN" "$ATTACK1" <<'PY'
from pathlib import Path
import copy,json,sys

run_p=Path(sys.argv[1])
atk_p=Path(sys.argv[2])

run=json.loads(run_p.read_text())
atk=json.loads(atk_p.read_text())
rb=copy.deepcopy(run)
ab=copy.deepcopy(atk)

assert run["id"]=="vanguard-sixframe-run-procedural-v1"
assert atk["id"]=="vanguard-overhand-strike-procedural-proof-v4"
assert run["atlas"]["file"]=="assets/vanguard/procedural/vanguard-pose-atlas-expanded.png"
assert atk["atlases"]["vanguard-canonical"]["path"]=="assets/vanguard/procedural/vanguard-pose-atlas-expanded.png"

# The 8:47 review recording predates both failed recenter attempts.
# Measured stage canvas: visible sprite center ~220 vs stage center ~225 on the
# phone capture, which maps to ~5 internal canvas px. Apply that global residual.
run["canvas"]["anchor"][0]=220
atk["stage"]["centerX"]=220

# Undo our previous failed "zero every offset" experiment and restore the
# accepted Run intra-cycle horizontal registration pattern from before recenter work.
accepted_offsets={"49":-3,"50":0,"51":3,"52":-3,"53":0,"54":3}
for cell,val in accepted_offsets.items():
    run["registration"]["byCell"][cell]["offsetX"]=val

def scrub_run(o):
    x=copy.deepcopy(o)
    x["canvas"]["anchor"][0]="__GLOBAL_X__"
    for c in accepted_offsets:
        x["registration"]["byCell"][c]["offsetX"]="__ACCEPTED_OFFSET_X__"
    return x

def scrub_atk(o):
    x=copy.deepcopy(o)
    x["stage"]["centerX"]="__GLOBAL_X__"
    return x

assert scrub_run(run)==scrub_run(rb), "STOP: Run mutation escaped authorized horizontal recenter surface"
assert scrub_atk(atk)==scrub_atk(ab), "STOP: Attack 1 mutation escaped stage.centerX"

run_p.write_text(json.dumps(run,indent=2)+"\n")
atk_p.write_text(json.dumps(atk,indent=2)+"\n")

print(f"RUN_GLOBAL_X={rb['canvas']['anchor'][0]}->220")
print("RUN_ACCEPTED_OFFSET_X_RESTORED=-3,0,3,-3,0,3")
print(f"ATTACK1_GLOBAL_X={ab['stage']['centerX']}->220")
print("MEASURED_RESIDUAL=+5px RIGHT FROM PRE-RECENTER REVIEW")
print("Y=UNCHANGED")
print("TIMING=UNCHANGED")
print("EFFECTS=UNCHANGED")
print("DEFORMATION=UNCHANGED")
print("POSE_CELLS=UNCHANGED")
PY

echo
echo "=== DIFF GUARD ==="
mapfile -t CHANGED < <(git diff --name-only)
printf 'changed=%s\n' "${CHANGED[@]}"
[ "${#CHANGED[@]}" -eq 2 ] || {
  echo "STOP: expected exactly Run + Attack 1 recipe diffs"
  exit 1
}
for F in "${CHANGED[@]}"; do
  case "$F" in
    "$RUN_REL"|"$ATTACK1_REL") ;;
    *) echo "STOP: unauthorized diff $F"; exit 1 ;;
  esac
done

[ "$(sha256sum "$ATLAS" | awk '{print $1}')" = "$ATLAS_SHA" ] || {
  echo "STOP: canonical atlas changed"
  exit 1
}

echo
echo "=== COMMIT + PUSH ==="
git add "$RUN_REL" "$ATTACK1_REL"
git commit -m "Apply measured Vanguard run and attack one recenter"
git push origin main
REV="$(git rev-parse HEAD)"
echo "REV=$REV"

echo
echo "=== COMMITTED READBACK ==="
git show "$REV:$RUN_REL" > "$L/run-attack1-recenter/run-committed.json"
git show "$REV:$ATTACK1_REL" > "$L/run-attack1-recenter/attack1-committed.json"

python3 - "$L/run-attack1-recenter/run-committed.json" "$L/run-attack1-recenter/attack1-committed.json" <<'PY'
import json,sys
r=json.load(open(sys.argv[1]))
a=json.load(open(sys.argv[2]))
assert r["canvas"]["anchor"][0]==220
assert [r["registration"]["byCell"][c]["offsetX"] for c in ("49","50","51","52","53","54")]==[-3,0,3,-3,0,3]
assert a["stage"]["centerX"]==220
print("COMMITTED_READBACK=PASS")
print("RUN_CENTER_X=220")
print("ATTACK1_CENTER_X=220")
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

for U in   assets/vanguard/procedural/vanguard-pose-atlas-expanded.png   assets/vanguard/procedural/run.recipe.json   assets/vanguard/procedural/overhand-strike.recipe.json; do
  curl -fsS "http://127.0.0.1:8766/$U" >/dev/null
done

STAMP="$(date +%s)"
RUN_URL="http://127.0.0.1:8766/motion.html?procedural=vanguard-run&rev=$REV&nocache=$STAMP"
ATTACK1_URL="http://127.0.0.1:8766/motion.html?procedural=vanguard-overhand-strike&rev=$REV&nocache=$STAMP"

echo
echo "============================================================"
echo " RUN + ATTACK 1 MEASURED RECENTER DEPLOYED"
echo "============================================================"
echo "REV=$REV"
echo "RUN_REVIEW=$RUN_URL"
echo "ATTACK1_REVIEW=$ATTACK1_URL"
echo "HUMAN_VERDICT=PENDING"

termux-open-url "$RUN_URL"
