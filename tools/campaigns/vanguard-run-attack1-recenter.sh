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

# Visual recenter only, derived from Drew's 2026-09-25 review recording.
# Positive X = screen-right. Negative X = screen-left.
RUN_DX=3
ATTACK1_DX=-20

cd "$P"

cat   AGENTS.md   docs/POSE_LAB_CAMPAIGN_RULES.md   docs/POSE_IS_GOD.md   docs/VANGUARD_ATLAS_AUTHORITY.md   >/dev/null

echo "============================================================"
echo " VANGUARD RUN + ATTACK 1 RECENTER"
echo "============================================================"
echo "MISSION=fix forward by recentering Run and Attack 1 only"
echo "ATTACK1=Vanguard Overhand Strike (first golden procedural Vanguard attack)"
echo "WRITABLE=$RUN_REL canvas.anchor[0] only; $ATTACK1_REL stage.centerX only"
echo "RUN_DX=$RUN_DX"
echo "ATTACK1_DX=$ATTACK1_DX"
echo "LOCKED=one canonical atlas; atlas pixels; cells; timing; effects; registration; deformation; Y placement; every other recipe"

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

echo
echo "=== VERIFY TARGET IDENTITY + ONE-ATLAS CONTRACT ==="
python3 - "$RUN" "$ATTACK1" <<'PY'
from pathlib import Path
import json,sys

run=json.loads(Path(sys.argv[1]).read_text())
atk=json.loads(Path(sys.argv[2]).read_text())

assert run["id"]=="vanguard-sixframe-run-procedural-v1", f"STOP: unexpected run id {run.get('id')}"
assert atk["id"]=="vanguard-overhand-strike-procedural-proof-v4", f"STOP: Attack 1 identity changed: {atk.get('id')}"

assert run["atlas"]["file"]=="assets/vanguard/procedural/vanguard-pose-atlas-expanded.png"
assert atk["atlases"]["vanguard-canonical"]["path"]=="assets/vanguard/procedural/vanguard-pose-atlas-expanded.png"

assert run["atlas"]["size"]==[1037,1754]
assert atk["atlases"]["vanguard-canonical"]["size"]==[1037,1754]

print("RUN_ID=CONFIRMED")
print("ATTACK1_ID=VANGUARD_OVERHAND_STRIKE_CONFIRMED")
print("ONE_ATLAS=CONFIRMED")
PY

echo
echo "=== APPLY HORIZONTAL RECENTER ONLY ==="
python3 - "$RUN" "$ATTACK1" "$RUN_DX" "$ATTACK1_DX" "$L/run-attack1-recenter" <<'PY'
from pathlib import Path
import copy,hashlib,json,sys

run_p=Path(sys.argv[1])
atk_p=Path(sys.argv[2])
run_dx=int(sys.argv[3])
atk_dx=int(sys.argv[4])
receipt_dir=Path(sys.argv[5])

run=json.loads(run_p.read_text())
atk=json.loads(atk_p.read_text())
run_before=copy.deepcopy(run)
atk_before=copy.deepcopy(atk)

receipt_dir.mkdir(parents=True,exist_ok=True)
(receipt_dir/"run-before.json").write_text(json.dumps(run_before,indent=2)+"\n")
(receipt_dir/"attack1-before.json").write_text(json.dumps(atk_before,indent=2)+"\n")

run_old=int(run["canvas"]["anchor"][0])
atk_old=int(atk["stage"]["centerX"])

run["canvas"]["anchor"][0]=run_old+run_dx
atk["stage"]["centerX"]=atk_old+atk_dx

def scrub_run(o):
    x=copy.deepcopy(o)
    x["canvas"]["anchor"][0]="__HORIZONTAL_CENTER__"
    return x

def scrub_atk(o):
    x=copy.deepcopy(o)
    x["stage"]["centerX"]="__HORIZONTAL_CENTER__"
    return x

assert scrub_run(run_before)==scrub_run(run), "STOP: Run mutation escaped canvas.anchor[0]"
assert scrub_atk(atk_before)==scrub_atk(atk), "STOP: Attack 1 mutation escaped stage.centerX"

# Explicit locks called out because these are the failure-prone properties.
assert run["poses"]==run_before["poses"]
assert run["registration"]==run_before["registration"]
assert run["cycleMs"]==run_before["cycleMs"]
assert run["blendWindow"]==run_before["blendWindow"]
assert run["bodyScale"]==run_before["bodyScale"]

for key in ("sources","phases","effect","bodyScale","rootMotion","atlases"):
    assert atk[key]==atk_before[key], f"STOP: Attack 1 locked property changed: {key}"

run_p.write_text(json.dumps(run,indent=2)+"\n")
atk_p.write_text(json.dumps(atk,indent=2)+"\n")

print(f"RUN_CENTER_X={run_old}->{run['canvas']['anchor'][0]}")
print(f"ATTACK1_CENTER_X={atk_old}->{atk['stage']['centerX']}")
print("Y_PLACEMENT=UNCHANGED")
print("TIMING=UNCHANGED")
print("EFFECTS=UNCHANGED")
print("REGISTRATION=UNCHANGED")
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

echo
echo "=== COMMIT + PUSH ==="
git add "$RUN_REL" "$ATTACK1_REL"
git commit -m "Recenter Vanguard run and attack one"
git push origin main
REV="$(git rev-parse HEAD)"
echo "REV=$REV"

echo
echo "=== COMMITTED READBACK ==="
git show "$REV:$RUN_REL" > "$L/run-attack1-recenter/run-committed.json"
git show "$REV:$ATTACK1_REL" > "$L/run-attack1-recenter/attack1-committed.json"

python3 -   "$L/run-attack1-recenter/run-before.json"   "$L/run-attack1-recenter/attack1-before.json"   "$L/run-attack1-recenter/run-committed.json"   "$L/run-attack1-recenter/attack1-committed.json"   "$RUN_DX" "$ATTACK1_DX" <<'PY'
import copy,json,sys
rb=json.load(open(sys.argv[1]))
ab=json.load(open(sys.argv[2]))
r=json.load(open(sys.argv[3]))
a=json.load(open(sys.argv[4]))
rdx=int(sys.argv[5]); adx=int(sys.argv[6])

assert r["canvas"]["anchor"][0]==rb["canvas"]["anchor"][0]+rdx
assert a["stage"]["centerX"]==ab["stage"]["centerX"]+adx

rr=copy.deepcopy(r); rr["canvas"]["anchor"][0]=rb["canvas"]["anchor"][0]
aa=copy.deepcopy(a); aa["stage"]["centerX"]=ab["stage"]["centerX"]

assert rr==rb, "STOP: committed Run changed outside horizontal center"
assert aa==ab, "STOP: committed Attack 1 changed outside horizontal center"

print("COMMITTED_READBACK=PASS")
print("AUTHORIZED_MUTATION=2_HORIZONTAL_CENTER_SCALARS_ONLY")
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
