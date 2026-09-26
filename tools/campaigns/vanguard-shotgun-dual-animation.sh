#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export GIT_PAGER=cat PAGER=cat

P="$HOME/storage/documents/GodotProjects/pose-lab-v2"
L="$HOME/.local/state/pose-lab-v2-vanguard-shotgun-fire-single-pose"
A="$L/authoring"
W="$L/review"

SHELL_REL="src/procedural-review-shell.js"
RENDERER_REL="src/procedural-motion-preview.js"
RELOAD_REL="public/assets/vanguard/procedural/shotgun-reload.recipe.json"
FIRE_REL="public/assets/vanguard/procedural/shotgun-fire.recipe.json"
EFFECT_REL="public/assets/vanguard/procedural/vanguard-shotgun-fire-effect.png"
ATLAS_REL="public/assets/vanguard/procedural/vanguard-pose-atlas-expanded.png"
MANIFEST_REL="public/assets/vanguard/procedural/vanguard-shotgun-atlas-append.manifest.json"

cd "$P"
mkdir -p "$L"

cat AGENTS.md docs/POSE_LAB_CAMPAIGN_RULES.md docs/POSE_IS_GOD.md docs/VANGUARD_ATLAS_AUTHORITY.md >/dev/null

echo "============================================================"
echo " VANGUARD SHOTGUN FIRE — SINGLE WIDE-STANCE POSE"
echo "============================================================"
echo "MISSION=one planted wide-stance body pose; skew back then snap forward"
echo "PRIMARY_WORKTREE=READ_ONLY"
echo "BODY_AUTHORITY=existing fire brace source / cell 100"
echo "WRITABLE=$FIRE_REL phases + effect.controlProfile"
echo "WRITABLE+=$RENDERER_REL shotgun-fire control UI branch only"
echo "LOCKED=reload; atlas pixels; accepted size/color/fuzziness/placement; muzzle effect bytes/visual values; every other effect and animation"
echo "SHOTGUN_BLAST_CONTROLS=move X/Y + scale X/Y only"

echo
echo "=== DIRTY / DIVERGENCE PREFLIGHT ==="
git status --short || true
git fetch origin main
LOCAL_HEAD="$(git rev-parse HEAD)"
ORIGIN_HEAD="$(git rev-parse origin/main)"
BASE="$(git merge-base HEAD origin/main)"
echo "LOCAL_HEAD=$LOCAL_HEAD"
echo "ORIGIN_HEAD=$ORIGIN_HEAD"
echo "MERGE_BASE=$BASE"
if [ "$LOCAL_HEAD" != "$ORIGIN_HEAD" ]; then
  git log --oneline "$BASE..HEAD" > "$L/local-only-commits.txt" || true
  git diff --binary "$BASE..HEAD" > "$L/local-only-history.patch" || true
  echo "LOCAL_DIVERGENCE=PRESERVED_NOT_MUTATED"
fi
git ls-files --others --exclude-standard > "$L/untracked.txt" || true
echo "PRIMARY_WORKTREE_LEFT_UNTOUCHED=YES"

echo
echo "=== CLEAN AUTHORING WORKTREE FROM ORIGIN/MAIN ==="
git worktree remove --force "$A" 2>/dev/null || true
rm -rf "$A"
git worktree add --detach "$A" "$ORIGIN_HEAD"
cd "$A"

for F in "$SHELL_REL" "$RENDERER_REL" "$RELOAD_REL" "$FIRE_REL" "$EFFECT_REL" "$ATLAS_REL" "$MANIFEST_REL"; do
  test -e "$F" || { echo "STOP: missing $F"; exit 1; }
done

SHELL_SHA="$(sha256sum "$SHELL_REL"|awk '{print $1}')"
RELOAD_SHA="$(sha256sum "$RELOAD_REL"|awk '{print $1}')"
EFFECT_SHA="$(sha256sum "$EFFECT_REL"|awk '{print $1}')"
ATLAS_SHA="$(sha256sum "$ATLAS_REL"|awk '{print $1}')"
MANIFEST_SHA="$(sha256sum "$MANIFEST_REL"|awk '{print $1}')"

echo
echo "=== APPLY FIRE BODY + SHOTGUN-BLAST CONTROLS ==="
python3 - "$FIRE_REL" "$RENDERER_REL" <<'PY'
import copy,json,sys
from pathlib import Path

fp,rp=map(Path,sys.argv[1:])
fire=json.loads(fp.read_text())
before=copy.deepcopy(fire)

assert fire["atlases"]["vanguard-canonical"]["path"]=="assets/vanguard/procedural/vanguard-pose-atlas-expanded.png"
assert fire["stage"]["centerX"]==215
assert fire["sources"]["brace"]["cell"]==100
assert fire["sources"]["drive"]["cell"]==101
assert fire["sources"]["recoil"]["cell"]==102
assert fire["sources"]["muzzle"]["path"]=="assets/vanguard/procedural/vanguard-shotgun-fire-effect.png"

fx_before=copy.deepcopy(fire["effect"])
fire["effect"]["controlProfile"]="move-scale-only"

def phase(pid,source,duration,shear,reveal=0,core=0,tight=0,wide=0):
    return {
      "id":pid,"source":source,"durationMs":duration,
      "deform":{"shearX":shear,"scaleX":1,"scaleY":1,"shiftX":0,"shiftY":0},
      "effect":{"reveal":reveal,"core":core,"tightGlow":tight,"wideGlow":wide}
    }

fire["phases"]=[
  phase("idle","idle",45,0),
  phase("wide-plant","brace",60,0),
  phase("load-back","brace",105,-0.24),
  phase("fire","brace",65,0.30,1,1,0.8,0.42),
  phase("settle","brace",105,0,0.28,0.25,0.16,0.08),
  phase("idle-return","idle",120,0)
]

fx_after=copy.deepcopy(fire["effect"])
fx_after.pop("controlProfile",None)
assert fx_after==fx_before, "STOP: shotgun effect visual values changed"

for k in ("schema","subject","rootMotion","canvas","atlases","bodyScale","stage","id","sources"):
    assert fire[k]==before[k], f"STOP: unauthorized recipe change: {k}"

fire["description"]="Shotgun fire review · single wide-stance brace pose · aggressive back/forward shear + dedicated muzzle"
fire["motionAuthority"]={
  "kind":"user-authored-shotgun-fire-single-wide-stance",
  "description":"Brace cell 100 is the sole non-idle body pose. Body shears backward then snaps forward with zero body shift/scale. Dedicated muzzle remains unchanged; shotgun blast controls expose move and scale only."
}
fp.write_text(json.dumps(fire,indent=2)+"\n")

renderer=rp.read_text()
needle="""function installSlashControls(){
 const side=document.querySelector('.side');
 if(!side||side.querySelector('[data-slash-controls]'))return;

 const box=document.createElement('details');
"""
assert renderer.count(needle)==1, "STOP: Slash Controls anchor changed"

branch=r'''function installShotgunBlastMoveScaleControls(side){
 const box=document.createElement('details');
 box.open=true;
 box.setAttribute('data-slash-controls','');
 box.innerHTML=
   '<summary style="font-size:15px;margin-bottom:10px">Shotgun Blast Controls</summary>'+
   '<div style="display:grid;grid-template-columns:92px 1fr 54px;gap:7px 8px;align-items:center;font-size:12px">'+
   '<label>X</label><input data-hc="x" type="range" min="-250" max="450" step="1"><output data-out="x"></output>'+
   '<label>Y</label><input data-hc="y" type="range" min="-250" max="450" step="1"><output data-out="y"></output>'+
   '<label>Scale X</label><input data-hc="sx" type="range" min="-3" max="3" step=".05"><output data-out="sx"></output>'+
   '<label>Scale Y</label><input data-hc="sy" type="range" min="-3" max="3" step=".05"><output data-out="sy"></output>'+
   '</div>'+
   '<div style="display:flex;gap:7px;margin-top:10px;flex-wrap:wrap">'+
   '<button data-hc-reset>Reset move/scale</button><button data-hc-copy>Copy values</button></div>';
 side.insertBefore(box,side.querySelector('details'));
 const fx=recipe.effect;
 const defaults={position:[...(fx.position||[0,0])],scaleX:Number(fx.scaleX??1),scaleY:Number(fx.scaleY??1)};
 const controls={
   x:box.querySelector('[data-hc="x"]'),y:box.querySelector('[data-hc="y"]'),
   sx:box.querySelector('[data-hc="sx"]'),sy:box.querySelector('[data-hc="sy"]')
 };
 function refresh(){for(const k of ['x','y','sx','sy'])box.querySelector('[data-out="'+k+'"]').textContent=controls[k].value}
 function setValues(){
   controls.x.value=fx.position?.[0]??0;controls.y.value=fx.position?.[1]??0;
   controls.sx.value=Number(fx.scaleX??1);controls.sy.value=Number(fx.scaleY??1);refresh();
 }
 function apply(){
   fx.position=[Number(controls.x.value),Number(controls.y.value)];
   const sx=Number(controls.sx.value),sy=Number(controls.sy.value);
   fx.scaleX=Math.abs(sx)<.01?.01:sx;fx.scaleY=Math.abs(sy)<.01?.01:sy;
   refresh();render(offset);
 }
 Object.values(controls).forEach(el=>{el.oninput=apply;el.onchange=apply});
 box.querySelector('[data-hc-reset]').onclick=()=>{
   fx.position=[...defaults.position];fx.scaleX=defaults.scaleX;fx.scaleY=defaults.scaleY;setValues();render(offset);
 };
 box.querySelector('[data-hc-copy]').onclick=async()=>{
   const text=JSON.stringify({position:fx.position,scaleX:fx.scaleX,scaleY:fx.scaleY},null,2);
   try{await navigator.clipboard.writeText(text)}catch{} console.log('SHOTGUN_BLAST_VALUES',text);
 };
 setValues();
 window.__slashControls={box,controls};
}

function installSlashControls(){
 const side=document.querySelector('.side');
 if(!side||side.querySelector('[data-slash-controls]'))return;
 if(recipe.id==='vanguard-shotgun-fire-procedural-v1'&&recipe.effect?.controlProfile==='move-scale-only'){
   installShotgunBlastMoveScaleControls(side);
   return;
 }

 const box=document.createElement('details');
'''
renderer=renderer.replace(needle,branch)
assert renderer.count("Shotgun Blast Controls")==1
assert renderer.count("Rotate Z °")==1
assert renderer.count("Reveal sweep")==1
assert "recipe.id==='vanguard-shotgun-fire-procedural-v1'" in renderer
rp.write_text(renderer)

print("BODY=brace/cell100 only for all non-idle fire phases")
print("SHEAR=0 -> -0.24 -> +0.30 -> 0")
print("BODY_SHIFT=0")
print("BODY_SCALE=1")
print("SHOTGUN_BLAST_CONTROLS=X,Y,SCALE_X,SCALE_Y_ONLY")
print("OTHER_EFFECTS=UNCHANGED")
PY

echo
echo "=== DIFF GUARD ==="
mapfile -t CHANGED < <(git diff --name-only)
printf 'changed=%s\n' "\${CHANGED[@]}"
[ "\${#CHANGED[@]}" -eq 2 ] || { echo "STOP: expected fire recipe + renderer only"; exit 1; }
printf '%s\n' "\${CHANGED[@]}" | grep -Fxq "$FIRE_REL"
printf '%s\n' "\${CHANGED[@]}" | grep -Fxq "$RENDERER_REL"

[ "$(sha256sum "$SHELL_REL"|awk '{print $1}')" = "$SHELL_SHA" ] || { echo "STOP: shell changed"; exit 1; }
[ "$(sha256sum "$RELOAD_REL"|awk '{print $1}')" = "$RELOAD_SHA" ] || { echo "STOP: reload changed"; exit 1; }
[ "$(sha256sum "$EFFECT_REL"|awk '{print $1}')" = "$EFFECT_SHA" ] || { echo "STOP: blast image bytes changed"; exit 1; }
[ "$(sha256sum "$ATLAS_REL"|awk '{print $1}')" = "$ATLAS_SHA" ] || { echo "STOP: atlas changed"; exit 1; }
[ "$(sha256sum "$MANIFEST_REL"|awk '{print $1}')" = "$MANIFEST_SHA" ] || { echo "STOP: manifest changed"; exit 1; }

node --check "$RENDERER_REL"

echo
echo "=== COMMIT + PUSH ==="
git add "$FIRE_REL" "$RENDERER_REL"
git commit -m "Simplify Vanguard shotgun fire to one planted pose"
REV="$(git rev-parse HEAD)"
git fetch origin main
[ "$(git rev-parse origin/main)" = "$ORIGIN_HEAD" ] || { echo "STOP: origin/main advanced; no push"; exit 1; }
git push origin HEAD:main
echo "REV=$REV"

echo
echo "=== COMMITTED READBACK ==="
git show "$REV:$FIRE_REL" > "$L/fire-committed.json"
git show "$REV:$RENDERER_REL" > "$L/renderer-committed.js"
python3 - "$L/fire-committed.json" "$L/renderer-committed.js" <<'PY'
import json,sys
f=json.load(open(sys.argv[1])); r=open(sys.argv[2]).read()
a=[p for p in f["phases"] if p["id"] in ("wide-plant","load-back","fire","settle")]
assert [p["source"] for p in a]==["brace"]*4
assert [p["deform"]["shearX"] for p in a]==[0,-0.24,0.30,0]
assert all(p["deform"]["scaleX"]==p["deform"]["scaleY"]==1 for p in a)
assert all(p["deform"]["shiftX"]==p["deform"]["shiftY"]==0 for p in a)
assert f["effect"]["controlProfile"]=="move-scale-only"
assert "Shotgun Blast Controls" in r
print("COMMITTED_READBACK=PASS")
PY

echo
echo "=== EXACT BUILD / SERVE / REVIEW ==="
cd "$P"
git worktree remove --force "$W" 2>/dev/null || true
rm -rf "$W"
git worktree add --detach "$W" "$REV"
cd "$W"
node --check "$RENDERER_REL"
node --check "$SHELL_REL"
npm run build
test -f "$W/dist/assets/vanguard/procedural/shotgun-fire.recipe.json"
test -f "$W/dist/assets/vanguard/procedural/vanguard-shotgun-fire-effect.png"

probe(){
  local base="$1" t="$L/probe.$$"
  curl -fsS "$base/assets/vanguard/procedural/shotgun-fire.recipe.json" > "$t.fire" 2>/dev/null || return 1
  curl -fsS "$base/src/procedural-motion-preview.js" > "$t.js" 2>/dev/null || return 1
  local ok=0
  [ "$(sha256sum "$t.fire"|awk '{print $1}')" = "$(sha256sum "$W/dist/assets/vanguard/procedural/shotgun-fire.recipe.json"|awk '{print $1}')" ] || ok=1
  [ "$(sha256sum "$t.js"|awk '{print $1}')" = "$(sha256sum "$W/dist/src/procedural-motion-preview.js"|awk '{print $1}')" ] || ok=1
  rm -f "$t.fire" "$t.js"; [ "$ok" -eq 0 ]
}

BASE_URL=""
for PORT in 8766 8767 8768 8769 8770 8771 8772 8773 8774 8775; do
  C="http://127.0.0.1:$PORT"
  if probe "$C"; then BASE_URL="$C"; echo "SERVER=REUSED_EXACT PORT=$PORT"; break; fi
  python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$W/dist" >"$L/server-$PORT.log" 2>&1 &
  PID=$!; sleep 1
  if kill -0 "$PID" 2>/dev/null && probe "$C"; then
    BASE_URL="$C"; echo "$PID" > "$L/server.pid"; echo "SERVER=STARTED_EXACT PORT=$PORT PID=$PID"; break
  fi
  kill "$PID" 2>/dev/null || true
done
[ -n "$BASE_URL" ] || { echo "STOP: no exact review server"; exit 1; }

STAMP="$(date +%s)"
FU="$BASE_URL/motion.html?procedural=vanguard-shotgun-fire&rev=$REV&nocache=$STAMP"
echo "FIRE_REVIEW=$FU"
echo "HUMAN_VERDICT=PENDING"

if command -v termux-open-url >/dev/null 2>&1 && termux-open-url "$FU" >/dev/null 2>&1; then
  echo "BROWSER_OPEN=termux-open-url"
elif command -v am >/dev/null 2>&1 && am start -a android.intent.action.VIEW -d "$FU" >/dev/null 2>&1; then
  echo "BROWSER_OPEN=am"
else
  echo "OPEN_THIS_URL=$FU"
fi
