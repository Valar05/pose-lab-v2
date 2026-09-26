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
echo "MISSION=remove the opaque black source-cell rectangle that is visually clipping Attack 1"
echo "WHY=explicit-point body sources return the raw cell canvas; black atlas background remains opaque and masks the back slash"
echo "WRITABLE=$ATTACK1_REL source-local backgroundKey flags; $RENDERER_REL behavior gated by those flags only"
echo "LOCKED=$RUN_REL entire file; atlas bytes; Attack1 cells/timing/effects/registration/deformation/anchors/centerX; every other recipe"

mkdir -p "$L/run-attack1-recenter"

echo
echo "=== DIRTY PREFLIGHT ==="
git status --short
for F in "$RUN_REL" "$ATTACK1_REL" "$RENDERER_REL"; do
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
cp "$RENDERER" "$L/run-attack1-recenter/renderer-before.js"

echo
echo "=== PATCH ATTACK 1 SOURCE-LOCAL BACKGROUND KEY ==="
python3 - "$ATTACK1" <<'PY'
from pathlib import Path
import copy,json,sys

p=Path(sys.argv[1])
before=json.loads(p.read_text())
after=copy.deepcopy(before)

assert after["id"]=="vanguard-overhand-strike-procedural-proof-v4"
assert after["stage"]["centerX"]==220
assert after["atlases"]["vanguard-canonical"]["path"]=="assets/vanguard/procedural/vanguard-pose-atlas-expanded.png"

# Revert the prior unaccepted row-window experiment. The visual defect persisted,
# so crop-window surgery is not the authority for this fix.
rb=after["atlases"]["vanguard-canonical"]["rowBounds"]
rb["5"]=[512,614]
rb["6"]=[614,717]

# Every Attack 1 body source uses explicit-point anchoring. Preserve those exact
# coordinates, but make the opaque black atlas background transparent by flood
# filling only border-connected near-black pixels in the renderer.
for key in ("idle","chamber","commit","preimpact","contact"):
    src=after["sources"][key]
    assert src["kind"]=="atlas-cell"
    assert src["anchorMode"]=="explicit-point"
    src["backgroundKey"]="black-border"
    src["backgroundKeyThreshold"]=18
    src.pop("isolateLargestComponent",None)

def scrub(o):
    x=copy.deepcopy(o)
    x["atlases"]["vanguard-canonical"]["rowBounds"]["5"]="__ROW5__"
    x["atlases"]["vanguard-canonical"]["rowBounds"]["6"]="__ROW6__"
    for key in ("idle","chamber","commit","preimpact","contact"):
        s=x["sources"][key]
        s["backgroundKey"]="__KEY__"
        s["backgroundKeyThreshold"]="__THRESH__"
        s.pop("isolateLargestComponent",None)
    return x

before_cmp=copy.deepcopy(before)
before_cmp["atlases"]["vanguard-canonical"]["rowBounds"]["5"]="__ROW5__"
before_cmp["atlases"]["vanguard-canonical"]["rowBounds"]["6"]="__ROW6__"
for key in ("idle","chamber","commit","preimpact","contact"):
    s=before_cmp["sources"][key]
    s["backgroundKey"]="__KEY__"
    s["backgroundKeyThreshold"]="__THRESH__"
    s.pop("isolateLargestComponent",None)

assert scrub(after)==before_cmp, "STOP: Attack 1 mutation escaped source-local background-key surface"

p.write_text(json.dumps(after,indent=2)+"\n")

print("ATTACK1_ROW5=RESTORED_512..614")
print("ATTACK1_ROW6=RESTORED_614..717")
print("ATTACK1_BODY_BACKGROUND_KEY=black-border")
print("ATTACK1_BODY_BACKGROUND_THRESHOLD=18")
print("CENTER_X=UNCHANGED_220")
print("ANCHOR_POINTS=UNCHANGED")
print("CELLS=UNCHANGED")
print("TIMING=UNCHANGED")
print("EFFECTS=UNCHANGED")
print("REGISTRATION=UNCHANGED")
PY

echo
echo "=== PATCH RENDERER, DEFAULT-OFF SOURCE-LOCAL BEHAVIOR ==="
python3 - "$RENDERER" <<'PY'
from pathlib import Path
import sys

p=Path(sys.argv[1])
s=p.read_text()

old="""  const im=rc.getImageData(0,0,sw,sh),d=im.data;
  let minX=sw,minY=sh,maxX=-1,maxY=-1;
  for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){
    const i=(y*sw+x)*4,R=d[i],G=d[i+1],B=d[i+2];
    if(B>110&&B>R+35&&B>G+35){d[i]=0;d[i+1]=0;d[i+2]=0;d[i+3]=0;}
    if(d[i+3]>8){
      minX=Math.min(minX,x);minY=Math.min(minY,y);
      maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
    }
  }
  if(src.isolateLargestComponent){"""

new="""  const im=rc.getImageData(0,0,sw,sh),d=im.data;
  for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){
    const i=(y*sw+x)*4,R=d[i],G=d[i+1],B=d[i+2];
    if(B>110&&B>R+35&&B>G+35){d[i]=0;d[i+1]=0;d[i+2]=0;d[i+3]=0;}
  }

  // Optional source-local cleanup for opaque-black sprite sheets.
  // Default is OFF, so every existing locked animation is behavior-identical.
  if(src.backgroundKey==='black-border'){
    const threshold=Number(src.backgroundKeyThreshold??18);
    const seen=new Uint8Array(sw*sh),stack=[];
    const isBg=(x,y)=>{
      const i=(y*sw+x)*4;
      return d[i+3]>8 && Math.max(d[i],d[i+1],d[i+2])<=threshold;
    };
    const push=(x,y)=>{
      const i=y*sw+x;
      if(seen[i]||!isBg(x,y))return;
      seen[i]=1;stack.push([x,y]);
    };
    for(let x=0;x<sw;x++){push(x,0);push(x,sh-1);}
    for(let y=0;y<sh;y++){push(0,y);push(sw-1,y);}
    while(stack.length){
      const [x,y]=stack.pop(),di=(y*sw+x)*4;
      d[di+3]=0;
      if(x>0)push(x-1,y);
      if(x+1<sw)push(x+1,y);
      if(y>0)push(x,y-1);
      if(y+1<sh)push(x,y+1);
    }
  }

  let minX=sw,minY=sh,maxX=-1,maxY=-1;
  for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){
    const i=(y*sw+x)*4;
    if(d[i+3]>8){
      minX=Math.min(minX,x);minY=Math.min(minY,y);
      maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
    }
  }
  if(src.isolateLargestComponent){"""

assert old in s, "STOP: renderer body-key block changed; refusing blind patch"
s=s.replace(old,new,1)
p.write_text(s)
print("RENDERER_BACKGROUND_KEY_SUPPORT=INSTALLED")
print("DEFAULT_BEHAVIOR=UNCHANGED")
PY

node --check "$RENDERER"

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
git commit -m "Fix opaque crop box in Vanguard attack one"
git push origin main
REV="$(git rev-parse HEAD)"
echo "REV=$REV"

echo
echo "=== COMMITTED READBACK ==="
git show "$REV:$ATTACK1_REL" > "$L/run-attack1-recenter/attack1-committed.json"
git show "$REV:$RENDERER_REL" > "$L/run-attack1-recenter/renderer-committed.js"

python3 - "$L/run-attack1-recenter/attack1-committed.json" <<'PY'
import json,sys
a=json.load(open(sys.argv[1]))
assert a["atlases"]["vanguard-canonical"]["rowBounds"]["5"]==[512,614]
assert a["atlases"]["vanguard-canonical"]["rowBounds"]["6"]==[614,717]
assert a["stage"]["centerX"]==220
for key in ("idle","chamber","commit","preimpact","contact"):
    assert a["sources"][key]["backgroundKey"]=="black-border"
    assert a["sources"][key]["backgroundKeyThreshold"]==18
print("ATTACK1_COMMITTED_READBACK=PASS")
PY

grep -Fq "if(src.backgroundKey==='black-border')" "$L/run-attack1-recenter/renderer-committed.js"
grep -Fq "Default is OFF" "$L/run-attack1-recenter/renderer-committed.js"
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
echo " ATTACK 1 OPAQUE-BACKGROUND FIX DEPLOYED"
echo "============================================================"
echo "REV=$REV"
echo "RUN=LOCKED_ACCEPTED"
echo "ATTACK1_REVIEW=$URL"
echo "HUMAN_VERDICT=PENDING"

termux-open-url "$URL"
