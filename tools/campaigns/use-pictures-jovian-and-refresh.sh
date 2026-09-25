#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SRC="/storage/emulated/0/Pictures/file_00000000bb3481f5ae303e7cda000d99.png"
PROJECT_SRC="$ROOT/public/assets/vanguard/procedural/jovian-source.png"
ATLAS="$ROOT/public/assets/vanguard/procedural/diorama-slash-atlas.png"
RECIPE="$ROOT/public/assets/vanguard/procedural/horizontal-strike.recipe.json"
MANIFEST="$ROOT/public/assets/vanguard/procedural/diorama-slash-atlas.manifest.json"
DL="/storage/emulated/0/Download/Diorama-Slash-Keys"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$DL/jovian-atlas-before-pictures-$STAMP.png"
FINAL="$DL/jovian-atlas-final-pictures-$STAMP.png"

mkdir -p "$DL"
echo "=== USE PICTURES JOVIAN SOURCE ==="
test -f "$SRC" || { echo "STOP: Pictures source missing"; exit 1; }

python3 - "$SRC" <<'PY'
from PIL import Image
import hashlib,sys
p=sys.argv[1]
im=Image.open(p)
print("source_size=",im.size)
print("source_mode=",im.mode)
print("source_sha256=",hashlib.sha256(open(p,"rb").read()).hexdigest())
PY

cp -f "$SRC" "$PROJECT_SRC"
cmp -s "$SRC" "$PROJECT_SRC"
echo "SOURCE_COPY_IDENTICAL=1"

cp -f "$ATLAS" "$BACKUP"

python3 - "$PROJECT_SRC" "$ATLAS" "$RECIPE" "$MANIFEST" "$FINAL" <<'PY'
from PIL import Image
from pathlib import Path
import hashlib,json,sys
src_path,atlas_path,recipe_path,manifest_path,final_path=map(Path,sys.argv[1:])
src=Image.open(src_path).convert("RGB")
atlas=Image.open(atlas_path).convert("RGB")
before=atlas.copy()
if atlas.size!=(1536,768):
    raise SystemExit(f"STOP: unexpected atlas size {atlas.size}")

cell=src.resize((384,384),Image.Resampling.LANCZOS)
atlas.paste(cell,(1152,384))
atlas.save(atlas_path)

for i in range(7):
    x=(i%4)*384
    y=(i//4)*384
    if before.crop((x,y,x+384,y+384)).tobytes()!=atlas.crop((x,y,x+384,y+384)).tobytes():
        raise SystemExit(f"STOP: cell {i+1} changed")

atlas_sha=hashlib.sha256(atlas_path.read_bytes()).hexdigest()

recipe=json.loads(recipe_path.read_text())
recipe["effectAtlases"]["slash-canonical"]["sha256"]=atlas_sha
recipe_path.write_text(json.dumps(recipe,indent=2)+"
")

if manifest_path.exists():
    m=json.loads(manifest_path.read_text())
    if "atlas_sha256" in m:
        m["atlas_sha256"]=atlas_sha
        manifest_path.write_text(json.dumps(m,indent=2)+"
")

from shutil import copy2
copy2(atlas_path,final_path)

print("cell8_size=",cell.size)
print("atlas_sha256=",atlas_sha)
print("final_atlas=",final_path)
PY

python3 - "$RECIPE" <<'PY'
import json,sys
r=json.load(open(sys.argv[1]))
e=r["sources"]["slash-right"]
assert e["kind"]=="effect-atlas-cell"
assert e["atlas"]=="slash-canonical"
assert e["cell"]==8
print("horizontal=vanguard-horizontal-strike")
print("cell=8")
PY

git add public/assets/vanguard/procedural/jovian-source.png public/assets/vanguard/procedural/diorama-slash-atlas.png public/assets/vanguard/procedural/horizontal-strike.recipe.json public/assets/vanguard/procedural/diorama-slash-atlas.manifest.json tools/campaigns/use-pictures-jovian-and-refresh.sh
git commit -m "Use Pictures Jovian slash source"
git push origin main

echo "=== REFRESH ==="
bash tools/campaigns/vanguard-horizontal-projective-refresh.sh
LIVE="$HOME/.local/state/pose-lab-v2-vanguard-live/worktree"
HEAD="$(git -C "$LIVE" rev-parse HEAD)"
echo "=== RECEIPT ==="
echo "source=$SRC"
echo "project_source=$PROJECT_SRC"
echo "backup=$BACKUP"
echo "final_atlas=$FINAL"
echo "live_head=$HEAD"
echo "http://127.0.0.1:8766/motion.html?procedural=vanguard-horizontal-strike&rev=$HEAD&nocache=$(date +%s)"
