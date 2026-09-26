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
echo " VANGUARD RUN + ATTACK 1 TRUE RECENTER"
echo "============================================================"
echo "MISSION=recenter in the coordinate system the renderers actually use"
echo "RUN=trimmed sprite center -> canvas X 215; remove per-cell horizontal offsets"
echo "ATTACK1=derive stage.centerX from canonical atlas cell-2 visible foreground center"
echo "WRITABLE=$RUN_REL horizontal center/offsetX only; $ATTACK1_REL stage.centerX only"
echo "LOCKED=atlas bytes; pose cells; Y; timing; effects; deformation; scales; anchor points; every other recipe"

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
echo "=== SNAPSHOT LOCKED INPUTS ==="
ATLAS_SHA="$(sha256sum "$ATLAS" | awk '{print $1}')"
cp "$RUN" "$L/run-attack1-recenter/run-before.json"
cp "$ATTACK1" "$L/run-attack1-recenter/attack1-before.json"
echo "ATLAS_SHA256=$ATLAS_SHA"

echo
echo "=== RECENTER FROM RENDERER GEOMETRY ==="
python3 - "$RUN" "$ATTACK1" "$ATLAS" <<'PY'
from PIL import Image
from pathlib import Path
import copy,json,math,sys

run_p,atk_p,atlas_p=map(Path,sys.argv[1:])
run=json.loads(run_p.read_text())
atk=json.loads(atk_p.read_text())
run_before=copy.deepcopy(run)
atk_before=copy.deepcopy(atk)

assert run["id"]=="vanguard-sixframe-run-procedural-v1"
assert atk["id"]=="vanguard-overhand-strike-procedural-proof-v4"
assert run["atlas"]["file"]=="assets/vanguard/procedural/vanguard-pose-atlas-expanded.png"
assert atk["atlases"]["vanguard-canonical"]["path"]=="assets/vanguard/procedural/vanguard-pose-atlas-expanded.png"

# RUN renderer contract:
# it trims each atlas cell to its occupied sprite, anchors that trimmed image at
# its horizontal midpoint, then applies canvas.anchor.x + per-cell offsetX.
# Therefore true horizontal recenter is exact and simple.
run_old_anchor=run["canvas"]["anchor"][0]
run["canvas"]["anchor"][0]=215
run_old_offsets={}
for cell in ("49","50","51","52","53","54"):
    reg=run["registration"]["byCell"][cell]
    run_old_offsets[cell]=reg["offsetX"]
    reg["offsetX"]=0

# ATTACK 1 renderer contract:
# stageOffsetX centers the full source cell, not the visible foreground.
# Measure visible cell-2 foreground using the exact renderer blue-key rule, then
# compensate stage.centerX so the visible idle sprite center lands on X=215.
spec=atk["atlases"]["vanguard-canonical"]
src=atk["sources"]["idle"]
assert src["cell"]==2
assert src["atlas"]=="vanguard-canonical"
im=Image.open(atlas_p).convert("RGBA")
assert list(im.size)==spec["size"]

idx=src["cell"]-int(spec.get("indexBase",1))
col=idx%int(spec["columns"])
row=idx//int(spec["columns"])
x0=round(col*im.width/int(spec["columns"]))
x1=round((col+1)*im.width/int(spec["columns"]))
rb=spec.get("rowBounds",{})
if str(row) in rb:
    y0,y1=map(int,rb[str(row)])
else:
    y0=round(row*im.height/int(spec["rows"]))
    y1=round((row+1)*im.height/int(spec["rows"]))

cell=im.crop((x0,y0,x1,y1))
px=cell.load()
xs=[];ys=[]
for y in range(cell.height):
    for x in range(cell.width):
        R,G,B,A=px[x,y]
        if B>110 and B>R+35 and B>G+35:
            continue
        if A>8:
            xs.append(x);ys.append(y)

assert xs, "STOP: Attack 1 idle cell foreground empty after blue key"
minx,maxx=min(xs),max(xs)
bbox_center=(minx+maxx)/2
cell_center=cell.width/2
body_scale=float(atk.get("bodyScale",1))
idle_reg=float(src.get("registrationOffset",[0,0])[0] or 0)
visual_delta=idle_reg+(bbox_center-cell_center)*body_scale

atk_old_center=int(atk["stage"]["centerX"])
atk_new_center=round(215-visual_delta)
atk["stage"]["centerX"]=atk_new_center

# Fail closed: only approved horizontal-centering properties may differ.
def scrub_run(o):
    x=copy.deepcopy(o)
    x["canvas"]["anchor"][0]="__CENTER_X__"
    for c in ("49","50","51","52","53","54"):
        x["registration"]["byCell"][c]["offsetX"]="__CENTER_X__"
    return x

def scrub_atk(o):
    x=copy.deepcopy(o)
    x["stage"]["centerX"]="__CENTER_X__"
    return x

assert scrub_run(run)==scrub_run(run_before), "STOP: Run mutation escaped horizontal recenter surface"
assert scrub_atk(atk)==scrub_atk(atk_before), "STOP: Attack 1 mutation escaped stage.centerX"

run_p.write_text(json.dumps(run,indent=2)+"\n")
atk_p.write_text(json.dumps(atk,indent=2)+"\n")

print(f"RUN_CANVAS_CENTER_X={run_old_anchor}->215")
print("RUN_OFFSET_X_BEFORE="+json.dumps(run_old_offsets,sort_keys=True))
print("RUN_OFFSET_X_AFTER=all-zero")
print(f"ATTACK1_IDLE_CELL_WIDTH={cell.width}")
print(f"ATTACK1_IDLE_FOREGROUND_BBOX_X={minx}..{maxx}")
print(f"ATTACK1_IDLE_VISIBLE_DELTA_FROM_CELL_CENTER={visual_delta:.3f}px")
print(f"ATTACK1_STAGE_CENTER_X={atk_old_center}->{atk_new_center}")
print("TARGET_VISIBLE_CENTER_X=215")
print("Y=UNCHANGED")
print("TIMING=UNCHANGED")
print("EFFECTS=UNCHANGED")
print("POSES=UNCHANGED")
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
git commit -m "Truly recenter Vanguard run and attack one"
git push origin main
REV="$(git rev-parse HEAD)"
echo "REV=$REV"

echo
echo "=== COMMITTED READBACK ==="
git show "$REV:$RUN_REL" > "$L/run-attack1-recenter/run-committed.json"
git show "$REV:$ATTACK1_REL" > "$L/run-attack1-recenter/attack1-committed.json"

python3 -   "$L/run-attack1-recenter/run-before.json"   "$L/run-attack1-recenter/attack1-before.json"   "$L/run-attack1-recenter/run-committed.json"   "$L/run-attack1-recenter/attack1-committed.json" <<'PY'
import copy,json,sys
rb=json.load(open(sys.argv[1]))
ab=json.load(open(sys.argv[2]))
r=json.load(open(sys.argv[3]))
a=json.load(open(sys.argv[4]))

assert r["canvas"]["anchor"][0]==215
assert all(r["registration"]["byCell"][c]["offsetX"]==0 for c in ("49","50","51","52","53","54"))

def scrub_run(o):
    x=copy.deepcopy(o)
    x["canvas"]["anchor"][0]="__CENTER_X__"
    for c in ("49","50","51","52","53","54"):
        x["registration"]["byCell"][c]["offsetX"]="__CENTER_X__"
    return x
def scrub_atk(o):
    x=copy.deepcopy(o);x["stage"]["centerX"]="__CENTER_X__";return x

assert scrub_run(r)==scrub_run(rb)
assert scrub_atk(a)==scrub_atk(ab)
print("COMMITTED_READBACK=PASS")
print("AUTHORIZED_SURFACE=HORIZONTAL_CENTERING_ONLY")
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
echo " RUN + ATTACK 1 TRUE RECENTER DEPLOYED"
echo "============================================================"
echo "REV=$REV"
echo "RUN_REVIEW=$RUN_URL"
echo "ATTACK1_REVIEW=$ATTACK1_URL"
echo "HUMAN_VERDICT=PENDING"

termux-open-url "$RUN_URL"
