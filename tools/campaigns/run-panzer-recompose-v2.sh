#!/usr/bin/env bash
set -euo pipefail

# Ritsu Panzer Pose Lab Campaign v2
# Objective: install a measured three-piece Panzer compositor into pose-lab-v2
# without relying on Codex/Claude at runtime.
# Uses the approved hull tone-match candidate, authored turret sheet, authored
# barrel sheet, and a manually measured registration packet.

REPO_DIR="${1:-$HOME/storage/shared/Documents/GodotProjects/pose-lab-v2}"
BRANCH="${BRANCH:-campaign/panzer-recompose-v2-20261025}"
REMOTE_URL="${REMOTE_URL:-https://github.com/Valar05/pose-lab-v2.git}"
ROUTE="panzer-turntable-v2"
REVSTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
WORK_ID="panzer-recompose-v2-${REVSTAMP}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "MISSING=$1" >&2; exit 2; }; }
need git
need python3
need sha256sum
python3 -c "from PIL import Image" 2>/dev/null || { echo "BLOCKER=MISSING_PILLOW (install via python -m pip install pillow)" >&2; exit 2; }

if [ ! -d "$REPO_DIR/.git" ]; then
  echo "REPO_MISSING=$REPO_DIR"
  echo "Cloning pose-lab-v2..."
  mkdir -p "$(dirname "$REPO_DIR")"
  git clone "$REMOTE_URL" "$REPO_DIR"
fi

cd "$REPO_DIR"
START_SHA="$(git rev-parse HEAD)"
CURRENT_BRANCH="$(git branch --show-current || true)"
echo "START_SHA=$START_SHA"
echo "CURRENT_BRANCH=$CURRENT_BRANCH"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "BLOCKER=DIRTY_TREE"
  echo "Please commit or stash unrelated work before running this campaign."
  exit 3
fi

git show-ref --verify --quiet "refs/heads/$BRANCH" && { echo "BLOCKER=BRANCH_ALREADY_EXISTS:$BRANCH" >&2; exit 3; }
git checkout -b "$BRANCH"

resolve_asset() {
  local label="$1"; shift
  local candidate found=""
  for candidate in "$@"; do
    if [ -f "$candidate" ]; then
      found="$candidate"
      break
    fi
  done
  if [ -z "$found" ]; then
    while IFS= read -r candidate; do
      found="$candidate"
      break
    done < <(find . "$HOME/storage/downloads" "$HOME/storage/shared/Download" "$HOME/storage/shared/Documents" -type f \( -iname '*.png' -o -iname '*.jpg' \) 2>/dev/null | grep -Ei "${label}" || true)
  fi
  if [ -z "$found" ]; then
    echo "BLOCKER=MISSING_ASSET:$label" >&2
    exit 4
  fi
  printf '%s\n' "$found"
}

HULL_SOURCE="$(resolve_asset 'panzer-hulls-tone-matched-94|weathered_panzer_hull_8_view_sprite_sheet' \
  './public/assets/panzer-pose-experiment/matching-study-v1/postprocess-v1/panzer-hulls-tone-matched-94.png' \
  './public/assets/panzer-pose-experiment/recompose-v1/source/panzer-hulls-working.png' \
  "$HOME/storage/downloads/panzer-hulls-tone-matched-94.png" \
  "$HOME/storage/downloads/weathered_panzer_hull_8_view_sprite_sheet.png")"
TURRET_SOURCE="$(resolve_asset 'german_wwii_tank_turret_sprite_sheet|weathered_panzer_turret_sprite_sheet|weathered_panzer_turret_eight_view_sprite_sheet' \
  './public/assets/panzer-pose-experiment/recompose-v2/source/turret-sheet.png' \
  "$HOME/storage/downloads/german_wwii_tank_turret_sprite_sheet.png" \
  "$HOME/storage/downloads/weathered_panzer_turret_sprite_sheet.png" \
  "$HOME/storage/downloads/weathered_panzer_turret_eight_view_sprite_sheet.png")"
BARREL_SOURCE="$(resolve_asset 'weathered_wwii_tank_barrel_sprite_sheet' \
  './public/assets/panzer-pose-experiment/recompose-v2/source/barrel-sheet.png' \
  "$HOME/storage/downloads/weathered_wwii_tank_barrel_sprite_sheet.png")"

echo "HULL_SOURCE=$HULL_SOURCE"
echo "TURRET_SOURCE=$TURRET_SOURCE"
echo "BARREL_SOURCE=$BARREL_SOURCE"

ASSET_DIR='public/assets/panzer-pose-experiment/recompose-v1'
SRC_DIR="$ASSET_DIR/source"
mkdir -p "$SRC_DIR"
cp -f "$HULL_SOURCE" "$SRC_DIR/panzer-hulls-working.png"
cp -f "$TURRET_SOURCE" "$SRC_DIR/panzer-turrets-working.png"
cp -f "$BARREL_SOURCE" "$SRC_DIR/panzer-barrels-working.png"

python3 - <<'PY'
import json, hashlib, pathlib
from PIL import Image

root = pathlib.Path('.')
asset_dir = root / 'public/assets/panzer-pose-experiment/recompose-v1'
src_dir = asset_dir / 'source'

# Measured here by visual inspection against the authored sprites.
# Direction order: front, front-right, right, rear-right, rear, rear-left, left, front-left.
registration = {
  "schema": "panzer-registration-v1",
  "workId": "panzer-recompose-v2",
  "route": "panzer-turntable-v2",
  "turretScale": 0.59,
  "directionOrder": [
    "front", "front-right", "right", "rear-right",
    "rear", "rear-left", "left", "front-left"
  ],
  "sheetLayout": {"cols": 2, "rows": 4},
  "sourceFiles": {
    "hull": "source/panzer-hulls-working.png",
    "turret": "source/panzer-turrets-working.png",
    "barrel": "source/panzer-barrels-working.png"
  },
  "hullFrameSize": [561, 350],
  "hullRingCenters": [
    [280,130], [306,121], [281,101], [258,102],
    [279,106], [300,104], [280,103], [252,120]
  ],
  # These anchors are in full-sheet cell space before alpha-cropping.
  # The preview module converts them into cropped/scaled local space.
  "turretBaseAnchorsFullCell": [
    [418,228], [405,228], [410,226], [420,224],
    [418,224], [416,224], [410,224], [425,228]
  ],
  "turretGunAnchorsFullCell": [
    [418,166], [652,162], [760,151], [745,145],
    [418,128], [86,145], [70,151], [184,162]
  ],
  "barrelRootAnchorsFullCell": [
    [362,35], [40,121], [56,136], [65,136],
    [362,35], [638,136], [668,131], [670,120]
  ],
  "barrelDrawBehindTurret": [3,4,5],
  "timing": {"stepMs": 650},
  "notes": [
    "Measured visually from authored hull, turret and barrel sheets.",
    "This campaign validates snapped directional composition first; deformation and barrel elevation remain deferred.",
    "The 94% post-process hull candidate is treated as the working hull source."
  ]
}

def sha256(path: pathlib.Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        while True:
            chunk = f.read(1024*1024)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()

for key,name in [("hull","panzer-hulls-working.png"),("turret","panzer-turrets-working.png"),("barrel","panzer-barrels-working.png")]:
    path = src_dir / name
    registration.setdefault('sourceSha256', {})[key] = sha256(path)
    registration.setdefault('sourcePixelSize', {})[key] = list(Image.open(path).size)

(asset_dir / 'panzer-registration-v1.json').write_text(json.dumps(registration, indent=2) + '\n', encoding='utf-8')
PY

cat > src/procedural-panzer-turntable-v2.js <<'JS'
const app = document.querySelector('#app');
app.replaceChildren();

const params = new URLSearchParams(location.search);
const revision = params.get('rev') || 'dev';
const showAnchorsInitial = params.get('anchors') === '1';
const base = './assets/panzer-pose-experiment/recompose-v1/';

const style = document.createElement('style');
style.textContent = `
  *{box-sizing:border-box}
  body{margin:0;background:#111a22;color:#e6edf0;font-family:system-ui,sans-serif}
  main{max-width:1200px;margin:auto;padding:16px}
  h1{font-size:1.35rem;margin:0 0 8px}
  p{line-height:1.45;color:#bfd0d9}
  .row{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin:10px 0}
  button{padding:10px 12px;border-radius:8px;border:1px solid #77838d;background:#2b3740;color:#fff}
  button[aria-pressed=true]{background:#d9a961;color:#111}
  .panel{background:#1b242b;border:1px solid #33414c;border-radius:12px;padding:12px}
  canvas{display:block;width:100%;height:auto;border-radius:12px;border:1px solid #4b5b67;background:#222}
  .status{font-family:ui-monospace,monospace;white-space:pre-wrap}
  .mini{display:grid;grid-template-columns:repeat(4,minmax(80px,1fr));gap:8px;margin-top:8px}
  .chip{padding:6px 8px;border-radius:8px;background:#222d35;border:1px solid #3f4f5a;font-size:.9rem}
  a{color:#e8bb78}
`;
document.head.append(style);

const main = document.createElement('main');
app.append(main);
main.innerHTML = `
  <h1>Panzer Turntable V2 Â· measured three-piece composition</h1>
  <p>Hull uses the approved post-processed working sprite. Turret and barrel are composed independently using manually measured directional anchors. This preview intentionally snaps the eight authored directions before any deformation or elevation experiments.</p>
  <div class="row">
    <button id="playBtn" aria-pressed="true">Pause</button>
    <button id="stepBtn">Step</button>
    <button id="anchorBtn" aria-pressed="${showAnchorsInitial ? 'true' : 'false'}">Toggle anchors</button>
    <div class="chip" id="frameLabel">Loadingâ€¦</div>
  </div>
  <div class="panel"><canvas id="view" width="561" height="350"></canvas></div>
  <div class="panel status" id="status"></div>
`;

const canvas = document.getElementById('view');
const ctx = canvas.getContext('2d');
const frameLabel = document.getElementById('frameLabel');
const status = document.getElementById('status');
const playBtn = document.getElementById('playBtn');
const stepBtn = document.getElementById('stepBtn');
const anchorBtn = document.getElementById('anchorBtn');

function asset(path){ return `${base}${path}?rev=${encodeURIComponent(revision)}`; }
function loadImage(url){ return new Promise((resolve,reject)=>{ const img = new Image(); img.onload=()=>resolve(img); img.onerror=()=>reject(new Error(`image load failed: ${url}`)); img.src=url; }); }
async function loadJSON(url){ const res = await fetch(url); if(!res.ok) throw new Error(`${url} -> ${res.status}`); return await res.json(); }

function sliceSheet(img, cols=2, rows=4){
  const out=[]; const cw=Math.floor(img.width/cols); const ch=Math.floor(img.height/rows);
  for(let i=0;i<cols*rows;i++){
    const sx=(i%cols)*cw, sy=Math.floor(i/cols)*ch;
    const c=document.createElement('canvas'); c.width=cw; c.height=ch;
    c.getContext('2d').drawImage(img,sx,sy,cw,ch,0,0,cw,ch);
    out.push({canvas:c,width:cw,height:ch});
  }
  return out;
}

function cropAlpha(frame){
  const {canvas,width,height}=frame; const data=canvas.getContext('2d').getImageData(0,0,width,height).data;
  let minX=width,minY=height,maxX=-1,maxY=-1;
  for(let y=0;y<height;y++) for(let x=0;x<width;x++){
    const a=data[(y*width+x)*4+3];
    if(a){ if(x<minX)minX=x; if(y<minY)minY=y; if(x>maxX)maxX=x; if(y>maxY)maxY=y; }
  }
  if(maxX<0){ return {canvas, width, height, bbox:[0,0,width,height]}; }
  const w=maxX-minX+1, h=maxY-minY+1;
  const out=document.createElement('canvas'); out.width=w; out.height=h;
  out.getContext('2d').drawImage(canvas,minX,minY,w,h,0,0,w,h);
  return {canvas:out,width:w,height:h,bbox:[minX,minY,maxX+1,maxY+1]};
}

function scaleFrame(frame, scale){
  const w=Math.max(1,Math.round(frame.width*scale));
  const h=Math.max(1,Math.round(frame.height*scale));
  const out=document.createElement('canvas'); out.width=w; out.height=h;
  const g=out.getContext('2d'); g.imageSmoothingEnabled=true; g.drawImage(frame.canvas,0,0,w,h);
  return {...frame, canvas:out, width:w, height:h, scale};
}

function dot(x,y,color,label){
  ctx.fillStyle=color; ctx.beginPath(); ctx.arc(x,y,5,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#000'; ctx.lineWidth=2; ctx.stroke();
  ctx.fillStyle='#fff'; ctx.font='12px ui-monospace,monospace'; ctx.fillText(label,x+8,y-8);
}

const DIRECTIONS = ['front','front-right','right','rear-right','rear','rear-left','left','front-left'];

(async function boot(){
  try{
    const reg = await loadJSON(asset('panzer-registration-v1.json'));
    const hullSheet = await loadImage(asset(reg.sourceFiles.hull));
    const turretSheet = await loadImage(asset(reg.sourceFiles.turret));
    const barrelSheet = await loadImage(asset(reg.sourceFiles.barrel));

    const hullFrames = sliceSheet(hullSheet,2,4);
    const turretFrames = sliceSheet(turretSheet,2,4).map(cropAlpha).map(f=>scaleFrame(f, reg.turretScale));
    const barrelFrames = sliceSheet(barrelSheet,2,4).map(cropAlpha).map(f=>scaleFrame(f, reg.turretScale));

    const turretBase = reg.turretBaseAnchorsFullCell.map((pt,i)=>{
      const bbox = cropAlpha(sliceSheet(turretSheet,2,4)[i]).bbox;
      return [Math.round((pt[0]-bbox[0])*reg.turretScale), Math.round((pt[1]-bbox[1])*reg.turretScale)];
    });
    const turretGun = reg.turretGunAnchorsFullCell.map((pt,i)=>{
      const bbox = cropAlpha(sliceSheet(turretSheet,2,4)[i]).bbox;
      return [Math.round((pt[0]-bbox[0])*reg.turretScale), Math.round((pt[1]-bbox[1])*reg.turretScale)];
    });
    const barrelRoot = reg.barrelRootAnchorsFullCell.map((pt,i)=>{
      const bbox = cropAlpha(sliceSheet(barrelSheet,2,4)[i]).bbox;
      return [Math.round((pt[0]-bbox[0])*reg.turretScale), Math.round((pt[1]-bbox[1])*reg.turretScale)];
    });
    const barrelBehind = new Set(reg.barrelDrawBehindTurret);

    let step = 0;
    let running = true;
    let showAnchors = showAnchorsInitial;
    let lastTick = performance.now();

    playBtn.onclick = ()=>{ running=!running; playBtn.textContent = running ? 'Pause' : 'Play'; playBtn.setAttribute('aria-pressed', String(running)); };
    stepBtn.onclick = ()=>{ step=(step+1)%8; draw(); };
    anchorBtn.onclick = ()=>{ showAnchors=!showAnchors; anchorBtn.setAttribute('aria-pressed', String(showAnchors)); draw(); };

    function draw(){
      const hullIndex = step % 8;
      const turretIndex = (8 - (step % 8)) % 8;
      const barrelIndex = turretIndex;

      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle = '#25282d';
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(hullFrames[hullIndex].canvas,0,0);

      const hr = reg.hullRingCenters[hullIndex];
      const tb = turretBase[turretIndex];
      const tg = turretGun[turretIndex];
      const br = barrelRoot[barrelIndex];
      const turret = turretFrames[turretIndex];
      const barrel = barrelFrames[barrelIndex];
      const tx = hr[0]-tb[0], ty = hr[1]-tb[1];
      const gx = tx+tg[0], gy = ty+tg[1];
      const bx = gx-br[0], by = gy-br[1];

      if(barrelBehind.has(barrelIndex)) ctx.drawImage(barrel.canvas,bx,by);
      ctx.drawImage(turret.canvas,tx,ty);
      if(!barrelBehind.has(barrelIndex)) ctx.drawImage(barrel.canvas,bx,by);

      if(showAnchors){
        dot(hr[0], hr[1], '#00e1ff', 'hull ring');
        dot(tx+tb[0], ty+tb[1], '#5dff78', 'turret base');
        dot(gx, gy, '#ffca28', 'gun');
        dot(bx+br[0], by+br[1], '#ff5d7a', 'barrel root');
      }

      frameLabel.textContent = `step ${step} Â· hull ${hullIndex} ${DIRECTIONS[hullIndex]} Â· turret ${turretIndex} ${DIRECTIONS[turretIndex]}`;
      status.textContent = [
        `revision: ${revision}`,
        `route: ${reg.route}`,
        `turret scale: ${reg.turretScale}`,
        `hull ring center: ${JSON.stringify(hr)}`,
        `turret base anchor: ${JSON.stringify(tb)}`,
        `turret gun anchor: ${JSON.stringify(tg)}`,
        `barrel root anchor: ${JSON.stringify(br)}`,
        `barrel behind turret: ${barrelBehind.has(barrelIndex)}`,
        `source hashes: ${JSON.stringify(reg.sourceSha256, null, 2)}`
      ].join('\n');
    }

    function tick(now){
      if(running && now-lastTick >= reg.timing.stepMs){
        step=(step+1)%8; lastTick=now; draw();
      }
      requestAnimationFrame(tick);
    }

    draw();
    requestAnimationFrame(tick);
  }catch(err){
    console.error(err);
    status.textContent = String(err && err.stack || err);
  }
})();
JS

python3 - <<'PY'
from pathlib import Path
path = Path('motion.html')
text = path.read_text(encoding='utf-8')
needle = "procedural === 'panzer-turntable'"
insert = "procedural === 'panzer-turntable-v2' ? './src/procedural-panzer-turntable-v2.js' : procedural === 'panzer-turntable'"
if "panzer-turntable-v2" not in text:
    if needle not in text:
        raise SystemExit('BLOCKER=ROUTE_PATCH_FAILED')
    text = text.replace(needle, insert, 1)
    path.write_text(text, encoding='utf-8')
PY

# Simple static verification
python3 - <<'PY'
import json, pathlib
root = pathlib.Path('.')
reg = json.loads((root/'public/assets/panzer-pose-experiment/recompose-v1/panzer-registration-v1.json').read_text())
assert reg['turretScale'] == 0.59
assert len(reg['hullRingCenters']) == 8
assert len(reg['turretBaseAnchorsFullCell']) == 8
assert len(reg['turretGunAnchorsFullCell']) == 8
assert len(reg['barrelRootAnchorsFullCell']) == 8
print('STATIC_VERIFY=PASS')
PY

# Commit implementation
mkdir -p campaigns
IMPL_COMMIT_MSG='Panzer turntable v2: measured three-piece composition preview'
RECEIPT_PATH='campaigns/panzer-recompose-v2.receipt.json'

git add motion.html src/procedural-panzer-turntable-v2.js "$ASSET_DIR"
git commit -m "$IMPL_COMMIT_MSG"
IMPL_SHA="$(git rev-parse HEAD)"

python3 - <<PY
import json, pathlib, subprocess
receipt = {
  "schema": "panzer-recompose-v2-receipt",
  "campaignId": "panzer-recompose-v2",
  "status": "implementation-committed-pending-human-review",
  "startRevision": "${START_SHA}",
  "implementationRevision": "${IMPL_SHA}",
  "branch": "${BRANCH}",
  "route": "${ROUTE}",
  "reviewUrl": "https://valar05.github.io/pose-lab-v2/motion.html?procedural=${ROUTE}&rev=${IMPL_SHA}",
  "notes": [
    "Measured visually in ChatGPT against authored hull/turret/barrel sheets.",
    "94% tone-matched hull candidate promoted as working hull source.",
    "This receipt covers snapped directional composition only; deformation/elevation deferred."
  ]
}
pathlib.Path('${RECEIPT_PATH}').write_text(json.dumps(receipt, indent=2)+'\\n', encoding='utf-8')
PY

git add "$RECEIPT_PATH"
git commit -m 'Receipt: panzer recompose v2 preview campaign'
FINAL_SHA="$(git rev-parse HEAD)"

set +e
git push -u origin "$BRANCH"
PUSH_STATUS=$?
set -e

echo "FINAL_SHA=$FINAL_SHA"
echo "BRANCH=$BRANCH"
echo "PUSH_STATUS=$PUSH_STATUS"
echo "CANDIDATE_URL_UNPUBLISHED=https://valar05.github.io/pose-lab-v2/motion.html?procedural=${ROUTE}&rev=${FINAL_SHA}"
echo "PUBLISH_STATUS=branch_push_only_requires_review_and_merge_before_hosted_url_exists"

if [ "$PUSH_STATUS" -ne 0 ]; then
  echo "NOTE=Push failed. Fix auth / remote and push branch manually."
fi
