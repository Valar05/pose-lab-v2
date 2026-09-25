#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DL="/storage/emulated/0/Download/Diorama-Slash-Keys"
ATLAS="$ROOT/public/assets/vanguard/procedural/diorama-slash-atlas.png"
RECIPE="$ROOT/public/assets/vanguard/procedural/horizontal-strike.recipe.json"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$DL/jovian-atlas-before-$STAMP.png"
FINAL="$DL/jovian-atlas-final-$STAMP.png"

SRC="$(find "$DL" -maxdepth 1 -type f \
  \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.webp' \) \
  -printf '%T@ %p\n' 2>/dev/null | sort -nr | head -1 | cut -d' ' -f2-)"

echo "=== REPLACE JOVIAN ==="
echo "source=$SRC"

test -n "$SRC" || { echo 'STOP: no image found in Diorama-Slash-Keys'; exit 1; }
test -f "$ATLAS" || { echo 'STOP: atlas missing'; exit 1; }
test -f "$RECIPE" || { echo 'STOP: horizontal recipe missing'; exit 1; }

python3 - "$SRC" <<'PY'
from PIL import Image
import sys
im=Image.open(sys.argv[1])
print('source_size=', im.size)
print('source_mode=', im.mode)
PY

cp -f "$ATLAS" "$BACKUP"

echo
printf '%s\n' '=== PATCH CELL 8 ONLY ==='
python3 - "$ATLAS" "$SRC" "$RECIPE" <<'PY'
from PIL import Image
from pathlib import Path
import hashlib, json, sys

atlas_path=Path(sys.argv[1])
src_path=Path(sys.argv[2])
recipe_path=Path(sys.argv[3])

atlas=Image.open(atlas_path).convert('RGBA')
src=Image.open(src_path).convert('RGBA')

if atlas.size != (768,384):
    raise SystemExit(f'STOP: unexpected atlas size {atlas.size}')

cw,ch=192,192
before=atlas.copy()

# Cell 8 is bottom-right. Fit the COMPLETE downloaded image into 192x192.
scale=min(cw/src.width, ch/src.height)
nw=max(1,round(src.width*scale))
nh=max(1,round(src.height*scale))
fitted=src.resize((nw,nh),Image.Resampling.LANCZOS)
cell=Image.new('RGBA',(cw,ch),(0,0,0,0))
cell.alpha_composite(fitted,((cw-nw)//2,(ch-nh)//2))
atlas.paste(cell,(576,192))
atlas.save(atlas_path)

# Hard guard: cells 1-7 remain pixel-identical.
for i in range(7):
    x=(i%4)*cw
    y=(i//4)*ch
    if before.crop((x,y,x+cw,y+ch)).tobytes() != atlas.crop((x,y,x+cw,y+ch)).tobytes():
        raise SystemExit(f'STOP: non-target cell changed: {i+1}')

atlas_sha=hashlib.sha256(atlas_path.read_bytes()).hexdigest()
recipe=json.loads(recipe_path.read_text())
recipe['effectAtlases']['slash-canonical']['sha256']=atlas_sha
recipe_path.write_text(json.dumps(recipe,indent=2)+'\n')

print('cell8_fit=',(nw,nh))
print('cell8_offset=',((cw-nw)//2,(ch-nh)//2))
print('atlas_sha256=',atlas_sha)
PY

cp -f "$ATLAS" "$FINAL"

echo
printf '%s\n' '=== VERIFY HORIZONTAL HOOK ==='
python3 - "$RECIPE" <<'PY'
import json,sys
r=json.load(open(sys.argv[1]))
e=r['sources']['slash-right']
print('effect_kind=',e['kind'])
print('atlas=',e['atlas'])
print('cell=',e['cell'])
print('horizontal_animation=vanguard-horizontal-strike')
assert e['kind']=='effect-atlas-cell'
assert e['atlas']=='slash-canonical'
assert e['cell']==8
PY

echo
printf '%s\n' '=== GIT ==='
git add public/assets/vanguard/procedural/diorama-slash-atlas.png public/assets/vanguard/procedural/horizontal-strike.recipe.json tools/campaigns/replace-jovian-and-refresh.sh
git commit -m 'Replace horizontal Jovian slash source'
git push origin main

echo
printf '%s\n' '=== REFRESH ==='
bash tools/campaigns/vanguard-horizontal-projective-refresh.sh
LIVE="$HOME/.local/state/pose-lab-v2-vanguard-live/worktree"
HEAD="$(git -C "$LIVE" rev-parse HEAD)"

echo
echo '=== RECEIPT ==='
echo "source=$SRC"
echo "backup=$BACKUP"
echo "final_atlas=$FINAL"
echo "live_head=$HEAD"
echo "http://127.0.0.1:8766/motion.html?procedural=vanguard-horizontal-strike&rev=$HEAD&nocache=$(date +%s)"
