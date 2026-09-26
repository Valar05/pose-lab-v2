#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export GIT_PAGER=cat PAGER=cat

P="$HOME/storage/documents/GodotProjects/pose-lab-v2"
L="$HOME/.local/state/pose-lab-v2-vanguard-live"
W="$L/worktree"

RUN_REL="public/assets/vanguard/procedural/run.recipe.json"
ATTACK1_REL="public/assets/vanguard/procedural/overhand-strike.recipe.json"
MANIFEST_REL="public/assets/vanguard/procedural/vanguard-pose-atlas-expanded.manifest.json"

RUN="$P/$RUN_REL"
ATTACK1="$P/$ATTACK1_REL"
MANIFEST="$P/$MANIFEST_REL"

cd "$P"

cat   AGENTS.md   docs/POSE_LAB_CAMPAIGN_RULES.md   docs/POSE_IS_GOD.md   docs/VANGUARD_ATLAS_AUTHORITY.md   >/dev/null

echo "============================================================"
echo " VANGUARD RUN + ATTACK 1 RECENTER — ONE FIX"
echo "============================================================"
echo "MISSION=recenter Run + Attack 1 by correcting their atlas sampling windows"
echo "WHY=expanded atlas was uniformly scaled, but these recipes kept pre-scale Y row bounds"
echo "WRITABLE=$RUN_REL rowBounds[8] + canvas.anchor[0]; $ATTACK1_REL rowBounds[0,4,5,6] + stage.centerX"
echo "LOCKED=atlas bytes; cell IDs; timing; effects; registration; deformation; Y stage placement; every other recipe"

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

echo
echo "=== APPLY SOURCE-SCALE-CORRECT ROW BOUNDS ==="
python3 - "$RUN" "$ATTACK1" "$MANIFEST" <<'PY'
from pathlib import Path
import copy,json,sys

run_p,atk_p,manifest_p=map(Path,sys.argv[1:])
run=json.loads(run_p.read_text())
atk=json.loads(atk_p.read_text())
manifest=json.loads(manifest_p.read_text())
rb=copy.deepcopy(run)
ab=copy.deepcopy(atk)

assert run["id"]=="vanguard-sixframe-run-procedural-v1"
assert atk["id"]=="vanguard-overhand-strike-procedural-proof-v4"
assert run["atlas"]["file"]=="assets/vanguard/procedural/vanguard-pose-atlas-expanded.png"
assert atk["atlases"]["vanguard-canonical"]["path"]=="assets/vanguard/procedural/vanguard-pose-atlas-expanded.png"

norm=manifest["normalization"]
assert norm["kind"]=="uniform-whole-image-resize"
assert manifest["sourceSize"]==[968,1536]
assert norm["outputSize"]==[1037,1645]
scale=float(norm["scale"])
assert abs(scale-(1037/968))<1e-12

def scaled(pair):
    return [round(pair[0]*scale),round(pair[1]*scale)]

# Run's accepted pre-expansion extraction window was the special row-8 slice
# [790,890], not the generic row. Map that exact window through the atlas's
# documented whole-image scale.
run_target=scaled([790,890])
run["atlas"]["rowBounds"]["8"]=run_target
run["canvas"]["anchor"][0]=215

# Keep Run's accepted intra-cycle registration exactly as-is.
accepted_offsets=[-3,0,3,-3,0,3]
got_offsets=[run["registration"]["byCell"][str(c)]["offsetX"] for c in range(49,55)]
assert got_offsets==accepted_offsets, f"STOP: Run offsetX pattern changed: {got_offsets}"

# Attack 1 uses cells 2,26,32,35,40, i.e. rows 0,4,5,6.
# Its old row coordinates were copied unchanged into the scaled atlas.
# Map only those used rows through the same documented scale.
atk_rows={
    "0":scaled([0,102]),
    "4":scaled([410,512]),
    "5":scaled([512,614]),
    "6":scaled([614,717]),
}
for k,v in atk_rows.items():
    atk["atlases"]["vanguard-canonical"]["rowBounds"][k]=v

# Remove our prior guessed global nudge. The actual fix is the sampling window.
atk["stage"]["centerX"]=215

def scrub_run(o):
    x=copy.deepcopy(o)
    x["atlas"]["rowBounds"]["8"]="__AUTHORIZED__"
    x["canvas"]["anchor"][0]="__AUTHORIZED__"
    return x

def scrub_atk(o):
    x=copy.deepcopy(o)
    for k in ("0","4","5","6"):
        x["atlases"]["vanguard-canonical"]["rowBounds"][k]="__AUTHORIZED__"
    x["stage"]["centerX"]="__AUTHORIZED__"
    return x

assert scrub_run(run)==scrub_run(rb), "STOP: Run mutation escaped authorized surface"
assert scrub_atk(atk)==scrub_atk(ab), "STOP: Attack 1 mutation escaped authorized surface"

run_p.write_text(json.dumps(run,indent=2)+"\n")
atk_p.write_text(json.dumps(atk,indent=2)+"\n")

print(f"ATLAS_SCALE={scale:.12f}")
print(f"RUN_ROW8={rb['atlas']['rowBounds']['8']}->{run_target}")
print(f"RUN_CENTER_X={rb['canvas']['anchor'][0]}->215")
for k in ("0","4","5","6"):
    print(f"ATTACK1_ROW{k}={ab['atlases']['vanguard-canonical']['rowBounds'][k]}->{atk_rows[k]}")
print(f"ATTACK1_CENTER_X={ab['stage']['centerX']}->215")
print("POSE_CELLS=UNCHANGED")
print("TIMING=UNCHANGED")
print("EFFECTS=UNCHANGED")
print("REGISTRATION=UNCHANGED")
print("ATLAS_BYTES=UNCHANGED")
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

echo
echo "=== COMMIT + PUSH ==="
git add "$RUN_REL" "$ATTACK1_REL"
git commit -m "Recenter Vanguard run and attack one sampling"
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

assert r["atlas"]["rowBounds"]["8"]==[846,953]
assert r["canvas"]["anchor"][0]==215
assert [r["registration"]["byCell"][str(c)]["offsetX"] for c in range(49,55)]==[-3,0,3,-3,0,3]

rb=a["atlases"]["vanguard-canonical"]["rowBounds"]
assert rb["0"]==[0,109]
assert rb["4"]==[439,548]
assert rb["5"]==[548,658]
assert rb["6"]==[658,768]
assert a["stage"]["centerX"]==215

print("COMMITTED_READBACK=PASS")
print("RUN_ROW8=846..953")
print("ATTACK1_ROWS=0:0..109 4:439..548 5:548..658 6:658..768")
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
echo " RUN + ATTACK 1 RECENTER DEPLOYED"
echo "============================================================"
echo "REV=$REV"
echo "RUN_REVIEW=$RUN_URL"
echo "ATTACK1_REVIEW=$ATTACK1_URL"
echo "HUMAN_VERDICT=PENDING"

termux-open-url "$RUN_URL"
