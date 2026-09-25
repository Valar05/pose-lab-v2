#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DL="/storage/emulated/0/Download/Diorama-Slash-Keys"
SRC="$DL/jovian-one-move.png"
ATLAS="$ROOT/public/assets/vanguard/procedural/diorama-slash-atlas.png"
RECIPE="$ROOT/public/assets/vanguard/procedural/horizontal-strike.recipe.json"
MANIFEST="$ROOT/public/assets/vanguard/procedural/diorama-slash-atlas.manifest.json"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$DL/jovian-atlas-before-visible-fit-$STAMP.png"
FINAL="$DL/jovian-atlas-final-visible-fit-$STAMP.png"

echo '=== JOVIAN CELL 8 VISIBLE-BOUNDS FIX ==='

test -f "$SRC" || { echo 'STOP: jovian-one-move.png missing'; exit 1; }
test -f "$ATLAS" || { echo 'STOP: atlas missing'; exit 1; }
test -f "$RECIPE" || { echo 'STOP: horizontal recipe missing'; exit 1; }

cp -f "$ATLAS" "$BACKUP"

python3 - "$SRC" "$ATLAS" "$RECIPE" "$MANIFEST" "$FINAL" <<'PY'
from PIL import Image
from pathlib import Path
import hashlib, json, sys

src_path, atlas_path, recipe_path, manifest_path, final_path = map(Path, sys.argv[1:])

src = Image.open(src_path).convert('RGBA')
atlas = Image.open(atlas_path).convert('RGBA')
before = atlas.copy()

if atlas.size != (768,384):
    raise SystemExit(f'STOP: unexpected atlas size {atlas.size}')

cw = ch = 192
bbox = src.getchannel('A').getbbox()
if bbox is None:
    raise SystemExit('STOP: source has no visible pixels')

print('source_size=', src.size)
print('source_visible_bbox=', bbox)

visible = src.crop(bbox)
margin = 8
max_w = cw - margin * 2
max_h = ch - margin * 2
scale = min(max_w / visible.width, max_h / visible.height)
nw = max(1, round(visible.width * scale))
nh = max(1, round(visible.height * scale))

fitted = visible.resize((nw, nh), Image.Resampling.LANCZOS)
cell = Image.new('RGBA', (cw, ch), (0,0,0,0))
ox = (cw - nw) // 2
oy = (ch - nh) // 2
cell.alpha_composite(fitted, (ox, oy))

# Cell 8 is bottom-right. Do not touch anything else.
atlas.paste(cell, (576,192))
atlas.save(atlas_path)

for i in range(7):
    x = (i % 4) * cw
    y = (i // 4) * ch
    if before.crop((x,y,x+cw,y+ch)).tobytes() != atlas.crop((x,y,x+cw,y+ch)).tobytes():
        raise SystemExit(f'STOP: non-target cell changed: {i+1}')

cell8_bbox = atlas.crop((576,192,768,384)).getchannel('A').getbbox()
print('cell8_fit=', (nw,nh))
print('cell8_offset=', (ox,oy))
print('cell8_visible_bbox=', cell8_bbox)

if cell8_bbox is None:
    raise SystemExit('STOP: cell 8 became empty')

x0,y0,x1,y1 = cell8_bbox
if x0 < margin or y0 < margin or x1 > cw-margin or y1 > ch-margin:
    raise SystemExit('STOP: cell 8 violates safety margin')

atlas_sha = hashlib.sha256(atlas_path.read_bytes()).hexdigest()

recipe = json.loads(recipe_path.read_text())
recipe['effectAtlases']['slash-canonical']['sha256'] = atlas_sha
recipe_path.write_text(json.dumps(recipe, indent=2) + '\n')

if manifest_path.exists():
    manifest = json.loads(manifest_path.read_text())
    changed = False
    if 'atlas_sha256' in manifest:
        manifest['atlas_sha256'] = atlas_sha
        changed = True
    if changed:
        manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
        print('manifest_updated=1')
    else:
        print('manifest_updated=0')

final_path.parent.mkdir(parents=True, exist_ok=True)
from shutil import copy2
copy2(atlas_path, final_path)
print('atlas_sha256=', atlas_sha)
print('final_atlas=', final_path)
PY

echo
echo '=== VERIFY HORIZONTAL HOOK ==='
python3 - "$RECIPE" <<'PY'
import json,sys
r=json.load(open(sys.argv[1]))
e=r['sources']['slash-right']
assert e['kind']=='effect-atlas-cell'
assert e['atlas']=='slash-canonical'
assert e['cell']==8
print('horizontal=vanguard-horizontal-strike')
print('atlas=slash-canonical')
print('cell=8')
PY

echo
echo '=== COMMIT + PUSH ==='
git add public/assets/vanguard/procedural/diorama-slash-atlas.png public/assets/vanguard/procedural/horizontal-strike.recipe.json public/assets/vanguard/procedural/diorama-slash-atlas.manifest.json tools/campaigns/fix-jovian-cell8-visible-bounds.sh
git commit -m 'Fit Jovian slash by visible bounds'
git push origin main

echo
echo '=== REFRESH ==='
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
