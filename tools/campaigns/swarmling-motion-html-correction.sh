#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export PAGER=cat GIT_PAGER=cat

ROOT="/storage/emulated/0/Documents/GodotProjects/pose-lab-v2"
PACKAGE_PARENT="e0b6f2bde0a8c1898bb42a0f5aa250b503f1a46c"
CAMPAIGN="tools/campaigns/swarmling-motion-html-correction.sh"
CONTRACT="campaigns/swarmling-motion-html-correction.contract.json"
RECEIPT="campaigns/swarmling-motion-html-correction.receipt.json"
MOTION="motion.html"
SHELL="src/procedural-review-shell.js"
PREVIEW="src/procedural-swarmling-preview.js"
SPRITE="src/sprite-viewer.js"
SPRITE_TEST="tools/test_sprite_review_surface.mjs"
RUN_MANIFEST="public/assets/vanguard/fleshpunk/characters/swarmling/animations.json"
LEGACY="public/assets/swarmling/fleshpunk/animations.json"
STATE="$HOME/.local/state/pose-lab-v2-vanguard-live"
AUTHOR="$STATE/swarmling-motion-author"
LIVE="$STATE/worktree"

stop(){ echo "STOP: $*" >&2; exit 1; }

cd "$ROOT"
git status --short
git fetch origin main
SEALED="$(git rev-parse origin/main)"
mapfile -t GOT < <(git diff --name-only "$PACKAGE_PARENT..$SEALED" | sort)
mapfile -t WANT < <(printf '%s\n' "$CAMPAIGN" "$CONTRACT" | sort)
[ "${GOT[*]}" = "${WANT[*]}" ] || stop "origin/main is not the sealed correction package"

mkdir -p "$STATE"
if [ -d "$AUTHOR" ]; then git worktree remove --force "$AUTHOR" 2>/dev/null || rm -rf "$AUTHOR"; fi
git worktree add --detach "$AUTHOR" "$SEALED" >/dev/null
cd "$AUTHOR"

echo "=== STICKY BOOT ==="
for f in AGENTS.md docs/POSE_LAB_CAMPAIGN_RULES.md docs/POSE_IS_GOD.md "$CONTRACT"; do
  [ -s "$f" ] || stop "missing required rule/contract: $f"
  cat "$f" >/dev/null
  echo "READ=$f"
done

[ -s "$RUN_MANIFEST" ] || stop "accepted Swarmling run manifest missing"
LEGACY_BLOB="$(git hash-object "$LEGACY")"
RUN_BLOB="$(git hash-object "$RUN_MANIFEST")"

echo "=== PATCH motion.html ROUTER ==="
python3 - "$MOTION" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]); s=p.read_text()
old="""      const modulePath = (procedural === 'vanguard-run' || procedural === 'vanguard-idle')
        ? './src/procedural-run-preview.js'
        : procedural
          ? './src/procedural-motion-preview.js'
          : './src/motion-profile-editor.js';"""
new="""      const modulePath = procedural === 'swarmling-run'
        ? './src/procedural-swarmling-preview.js'
        : (procedural === 'vanguard-run' || procedural === 'vanguard-idle')
          ? './src/procedural-run-preview.js'
          : procedural
            ? './src/procedural-motion-preview.js'
            : './src/motion-profile-editor.js';"""
if old not in s: raise SystemExit("STOP: motion router anchor changed")
p.write_text(s.replace(old,new,1))
PY

echo "=== PATCH PROCEDURAL SHELL CHARACTER FILTER ==="
python3 - "$SHELL" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]); s=p.read_text()
s=s.replace(
"export function createProceduralReviewShell({title,animation,accent='#59d5e8'}){",
"""const CHARACTER_ANIMATIONS = Object.freeze({
  vanguard: [
    ['vanguard-idle','Idle'],['vanguard-run','Run'],['vanguard-overhand-strike','Overhand Strike'],
    ['vanguard-undercut-strike','Undercut Strike'],['vanguard-attack2-uppercut','Attack 2 Uppercut'],
    ['vanguard-horizontal-strike','Horizontal Slash'],['vanguard-shoulder-charge','Shoulder Charge'],
    ['vanguard-butt-smash','Butt Smash'],['vanguard-attack5','Attack 5 Jab'],['vanguard-jump','Jump'],
    ['vanguard-midair','Mid-Air'],['vanguard-land','Land'],['vanguard-shotgun-reload','Shotgun Reload'],
    ['vanguard-shotgun-fire','Shotgun Fire']
  ],
  swarmling: [['swarmling-run','Run']]
});
const DEFAULT_ANIMATION = Object.freeze({vanguard:'vanguard-idle',swarmling:'swarmling-run'});

export function createProceduralReviewShell({title,animation,accent='#59d5e8',character=null}){""",1)
if "const CHARACTER_ANIMATIONS" not in s: raise SystemExit("STOP: shell function anchor changed")

old="""    <select class="anim-select" data-animation>
      <option value="vanguard-idle">Vanguard · Idle</option>
      <option value="vanguard-run">Vanguard · Run</option>
      <option value="vanguard-overhand-strike">Vanguard · Overhand Strike</option>
      <option value="vanguard-undercut-strike">Vanguard · Undercut Strike</option>
      <option value="vanguard-attack2-uppercut">Vanguard · Attack 2 Uppercut</option>
      <option value="vanguard-horizontal-strike">Vanguard · Horizontal Slash</option>
      <option value="vanguard-shoulder-charge">Vanguard · Shoulder Charge</option>
      <option value="vanguard-butt-smash">Vanguard · Butt Smash</option>
      <option value="vanguard-attack5">Vanguard · Attack 5 Jab</option>
      <option value="vanguard-jump">Vanguard · Jump</option>
      <option value="vanguard-midair">Vanguard · Mid-Air</option>
      <option value="vanguard-land">Vanguard · Land</option>
      <option value="vanguard-shotgun-reload">Vanguard · Shotgun Reload</option>
      <option value="vanguard-shotgun-fire">Vanguard · Shotgun Fire</option>
    </select>"""
new="""    <select class="anim-select" data-character aria-label="Character"></select>
    <select class="anim-select" data-animation aria-label="Animation"></select>"""
if old not in s: raise SystemExit("STOP: shell option block changed")
s=s.replace(old,new,1)

old2="""  const zoomInput=q('[data-zoom]'), zoomReadout=q('[data-zoom-readout]'), select=q('[data-animation]');
  select.value=animation;
  select.onchange=()=>{
    const p=new URLSearchParams(location.search);
    const rev=p.get('rev');
    const nocache=p.get('nocache');
    location.href='./motion.html?procedural='+encodeURIComponent(select.value)
      +(rev?'&rev='+encodeURIComponent(rev):'')
      +(nocache?'&nocache='+encodeURIComponent(nocache):'');
  };"""
new2="""  const zoomInput=q('[data-zoom]'), zoomReadout=q('[data-zoom-readout]'), select=q('[data-animation]'), characterSelect=q('[data-character]');
  const activeCharacter=character || (String(animation).startsWith('swarmling-')?'swarmling':'vanguard');
  for(const id of Object.keys(CHARACTER_ANIMATIONS)){
    const o=document.createElement('option');o.value=id;o.textContent=id==='vanguard'?'Vanguard':'Swarmling';characterSelect.append(o);
  }
  characterSelect.value=activeCharacter;
  for(const [id,label] of CHARACTER_ANIMATIONS[activeCharacter]){
    const o=document.createElement('option');o.value=id;o.textContent=label;select.append(o);
  }
  select.value=animation;
  const go=(next)=>{
    const p=new URLSearchParams(location.search),rev=p.get('rev'),nocache=p.get('nocache');
    location.href='./motion.html?procedural='+encodeURIComponent(next)
      +(rev?'&rev='+encodeURIComponent(rev):'')
      +(nocache?'&nocache='+encodeURIComponent(nocache):'');
  };
  characterSelect.onchange=()=>go(DEFAULT_ANIMATION[characterSelect.value]);
  select.onchange=()=>go(select.value);"""
if old2 not in s: raise SystemExit("STOP: shell select handler changed")
s=s.replace(old2,new2,1)

s=s.replace(
'<div class="meta">Vanguard uses one canonical review position across animations. Drag the stage to pan when zoomed.</div>',
'<div class="meta">Character-specific animation lists share one procedural review surface. Drag the stage to pan when zoomed.</div>',1)
p.write_text(s)
PY

echo "=== ADD SWARMLING MOTION PREVIEW ==="
cat > "$PREVIEW" <<'JS'
import { createProceduralReviewShell } from './procedural-review-shell.js';

const ui=createProceduralReviewShell({
  title:'Swarmling Run',
  animation:'swarmling-run',
  character:'swarmling',
  accent:'#d6a84d'
});
const {q,canvas,fit}=ui;
const ctx=canvas.getContext('2d');
ctx.imageSmoothingEnabled=true;
const play=q('[data-play]'),restart=q('[data-restart]'),scrub=q('[data-scrub]');
const phase=q('[data-phase]'),time=q('[data-time]'),kv=q('[data-kv]');
let manifest,run,images=[],playing=true,start=performance.now(),offset=0,total=480;

const loadImage=src=>new Promise((ok,no)=>{
  const i=new Image();i.onload=()=>ok(i);i.onerror=()=>no(new Error('Could not load '+src));i.src=src;
});

function render(ms){
  ms=((ms%total)+total)%total;
  const index=Math.min(run.frames.length-1,Math.floor(ms/80));
  ctx.setTransform(1,0,0,1,0,0);
  ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);
  const image=images[index];
  const x=Math.round((canvas.width-image.naturalWidth)/2);
  const y=Math.round((canvas.height-image.naturalHeight)/2);
  ctx.drawImage(image,x,y);
  phase.textContent='run-'+String(index+1);
  time.textContent=Math.round(ms)+' / '+total+' ms';
  scrub.value=String(ms/total);
  kv.innerHTML=`<div>Character</div><div>Swarmling</div><div>Frame</div><div>${index+1} / 6</div><div>Cadence</div><div>80 ms</div><div>Root motion</div><div>OFF</div>`;
}
function loop(now){const ms=playing?(offset+(now-start))%total:offset;render(ms);requestAnimationFrame(loop)}
play.onclick=()=>{if(playing){offset=(offset+(performance.now()-start))%total;playing=false;play.textContent='▶'}else{start=performance.now();playing=true;play.textContent='❚❚'}};
restart.onclick=()=>{offset=0;start=performance.now();render(0)};
scrub.oninput=()=>{offset=Number(scrub.value)*total;start=performance.now();render(offset)};

try{
  manifest=await fetch('./assets/vanguard/fleshpunk/characters/swarmling/animations.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('manifest HTTP '+r.status);return r.json()});
  if(manifest.character!=='Swarmling'||manifest.lineage!=='vanguard-side-2d-sprite')throw new Error('Wrong Swarmling lineage');
  run=manifest.animations.find(a=>a.id==='run');
  if(!run||run.frames.length!==6||!run.frames.every((f,i)=>f.durationMs===80&&f.sourceCell===i+1))throw new Error('Wrong Swarmling run contract');
  const base='./assets/vanguard/fleshpunk/characters/swarmling/';
  images=await Promise.all(run.frames.map(f=>loadImage(base+f.src)));
  canvas.width=430;canvas.height=260;
  q('[data-recipe]').textContent=JSON.stringify(run,null,2);
  q('[data-title]').textContent='Swarmling Run';
  render(0);
  requestAnimationFrame(()=>{fit();requestAnimationFrame(loop)});
}catch(err){
  document.querySelector('#app').innerHTML='<pre style="padding:18px;color:#ff8a8a;white-space:pre-wrap"></pre>';
  document.querySelector('#app pre').textContent=err?.stack||String(err);
}
JS

echo "=== REMOVE MISTAKEN ?view=2d CHARACTER SELECTOR ==="
python3 - "$SPRITE" "$SPRITE_TEST" <<'PY'
from pathlib import Path
import re,sys
vp,tp=map(Path,sys.argv[1:3]); v=vp.read_text(); t=tp.read_text()

start=v.find("const CHARACTER_MANIFESTS = Object.freeze({")
end=v.find("const app = document.querySelector('#app');")
if start<0 or end<0: raise SystemExit("STOP: mistaken sprite selector header not found")
v=v[:start]+"const DEFAULT_MANIFEST = './assets/vanguard/fleshpunk/animations.json';\nconst manifestUrl = new URL(URL_PARAMS.get('manifest') || DEFAULT_MANIFEST, window.location.href);\n"+v[end:]

v=re.sub(r"""\n\s*<label class="sprite-character-picker">.*?</label>""","",v,count=1,flags=re.S)
v=v.replace("const characterPicker = app.querySelector('[data-character-picker]');\n","")
v=v.replace("characterPicker.value = activeCharacterId;\n","")
v=v.replace("  nextUrl.searchParams.set('character', activeCharacterId);\n","")
v=v.replace("    document.body.dataset.reviewCharacter = activeCharacterId;\n","")
v=re.sub(r"""\ncharacterPicker\.addEventListener\('change', \(\) => \{.*?\n\}\);\n""","\n",v,count=1,flags=re.S)
vp.write_text(v)

lines=t.splitlines()
drop_terms=[
 "dedicated character registry","Swarmling must live in the Vanguard-side 2D sprite namespace",
 "separate character selector","animation id across characters","Vanguard batch state","active character for hosted verification"
]
lines=[line for line in lines if not any(term in line for term in drop_terms)]
text="\n".join(lines)+"\n"
start=text.find("const spriteSwarmlingPath = 'public/assets/vanguard/fleshpunk/characters/swarmling/animations.json';")
if start>=0:
    end=text.find("\nif (failures.length) {",start)
    if end<0: raise SystemExit("STOP: sprite Swarmling test block end missing")
    text=text[:start]+text[end+1:]
tp.write_text(text)
PY

echo "=== VERIFY / COMMIT ==="
[ "$(git hash-object "$LEGACY")" = "$LEGACY_BLOB" ] || stop "legacy 3D-derived Swarmling changed"
[ "$(git hash-object "$RUN_MANIFEST")" = "$RUN_BLOB" ] || stop "accepted Swarmling run assets changed"
node --check "$SHELL"
node --check "$PREVIEW"
node --check "$SPRITE"
npm run test:2d
npm run build
npm run smoke
git diff --check

git add "$MOTION" "$SHELL" "$PREVIEW" "$SPRITE" "$SPRITE_TEST"
for p in $(git diff --cached --name-only); do
  case "$p" in "$MOTION"|"$SHELL"|"$PREVIEW"|"$SPRITE"|"$SPRITE_TEST") ;; *) stop "unauthorized staged path: $p";; esac
done
git config user.name "Pose Lab Campaign"
git config user.email "pose-lab-campaign@localhost"
git commit -m "Move Swarmling review into motion surface"
IMPLEMENTATION="$(git rev-parse HEAD)"

python3 - "$RECEIPT" "$SEALED" "$IMPLEMENTATION" <<'PY'
from pathlib import Path
import json,sys
Path(sys.argv[1]).write_text(json.dumps({
 "schema":"pose-lab-v2-campaign-receipt-v1",
 "campaign":"swarmling-motion-html-correction-v1",
 "status":"implemented-awaiting-human-review",
 "sealedRevision":sys.argv[2],
 "implementationRevision":sys.argv[3],
 "surface":"motion.html",
 "route":"procedural=swarmling-run",
 "preserved":["accepted Swarmling run pixels/timing","Vanguard procedural behavior","old 3D-derived Swarmling/Fleshling lineage"],
 "humanVerdict":"pending"
},indent=2)+"\n")
PY
git add "$RECEIPT"
git commit -m "Record Swarmling motion surface correction"
FINAL="$(git rev-parse HEAD)"
git push origin "HEAD:main"
git fetch origin main
[ "$(git rev-parse origin/main)" = "$FINAL" ] || stop "Git readback mismatch"

if [ -d "$LIVE" ]; then git -C "$ROOT" worktree remove --force "$LIVE" 2>/dev/null || rm -rf "$LIVE"; fi
git -C "$ROOT" worktree add --detach "$LIVE" "$FINAL" >/dev/null
cd "$LIVE"
node --check "$SHELL"; node --check "$PREVIEW"; npm run build; npm run smoke

probe(){
 local u="$1"
 curl -fsS "$u/motion.html?procedural=swarmling-run&rev=$FINAL" | grep -Fq "Pose Lab V2" &&
 curl -fsS "$u/src/procedural-swarmling-preview.js?rev=$FINAL" | grep -Fq "Swarmling Run"
}
BASE=""
for PORT in 8766 8767 8768 8769 8770 8771 8772 8773 8774 8775; do
 U="http://127.0.0.1:$PORT"
 if probe "$U"; then BASE="$U"; break; fi
 python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$LIVE/dist" >"$STATE/server-$PORT.log" 2>&1 &
 PID=$!; sleep 1
 if kill -0 "$PID" 2>/dev/null && probe "$U"; then BASE="$U"; echo "$PID" >"$STATE/server.pid"; break; fi
 kill "$PID" 2>/dev/null || true
done
[ -n "$BASE" ] || stop "exact motion review server unavailable"
URL="$BASE/motion.html?procedural=swarmling-run&rev=$FINAL&nocache=$(date +%s)"
echo "FINAL_REV=$FINAL"
echo "REVIEW=$URL"
echo "HUMAN_VERDICT=PENDING"
termux-open-url "$URL" >/dev/null 2>&1 || true
