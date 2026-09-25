#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SRC="/storage/emulated/0/Pictures/file_00000000bb3481f5ae303e7cda000d99.png"
PROJECT_SRC="$ROOT/public/assets/vanguard/procedural/jovian-source.png"
ATLAS="$ROOT/public/assets/vanguard/procedural/diorama-slash-atlas.png"
RECIPE="$ROOT/public/assets/vanguard/procedural/horizontal-strike.recipe.json"
DL="/storage/emulated/0/Download/Diorama-Slash-Keys"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$DL/jovian-atlas-before-pictures-$STAMP.png"
FINAL="$DL/jovian-atlas-final-pictures-$STAMP.png"

echo "=== CORRECT JOVIAN SOURCE ==="
test -f "$SRC"
cp -f "$SRC" "$PROJECT_SRC"
cmp -s "$SRC" "$PROJECT_SRC"
echo "source=$SRC"
echo "project_source=$PROJECT_SRC"
echo "SOURCE_COPY_IDENTICAL=1"
sha256sum "$SRC" "$PROJECT_SRC"

echo
echo "=== REPLACE CELL 8 ==="
mkdir -p "$DL"
cp -f "$ATLAS" "$BACKUP"

python3 -c 'from PIL import Image; import hashlib,json,sys,shutil; src_path,atlas_path,recipe_path,final_path=sys.argv[1:]; src=Image.open(src_path).convert("RGB"); atlas=Image.open(atlas_path).convert("RGB"); before=atlas.copy(); assert atlas.size==(768,384),atlas.size; cell=src.resize((192,192),Image.Resampling.LANCZOS); atlas.paste(cell,(576,192)); atlas.save(atlas_path); [(x:= (i%4)*384,y:=(i//4)*384, (before.crop((x,y,x+192,y+192)).tobytes()==atlas.crop((x,y,x+192,y+192)).tobytes()) or (_ for _ in ()).throw(SystemExit(f"STOP: cell {i+1} changed"))) for i in range(7)]; sha=hashlib.sha256(atlas_path.read_bytes()).hexdigest(); r=json.load(open(recipe_path)); r["effectAtlases"]["slash-canonical"]["sha256"]=sha; open(recipe_path,"w").write(json.dumps(r,indent=2)+"\\n"); shutil.copy2(atlas_path,final_path); print("source_size=",src.size); print("cell8_size=",cell.size); print("atlas_sha256=",sha); print("final_atlas=",final_path)' "$PROJECT_SRC" "$ATLAS" "$RECIPE" "$FINAL"

echo
echo "=== HORIZONTAL HOOK ==="
python3 -c 'import json,sys; r=json.load(open(sys.argv[1])); e=r["sources"]["slash-right"]; assert e["kind"]=="effect-atlas-cell"; assert e["atlas"]=="slash-canonical"; assert e["cell"]==8; print("horizontal=vanguard-horizontal-strike"); print("cell=8")' "$RECIPE"

echo
echo "=== COMMIT + PUSH ==="
git add public/assets/vanguard/procedural/jovian-source.png public/assets/vanguard/procedural/diorama-slash-atlas.png public/assets/vanguard/procedural/horizontal-strike.recipe.json tools/campaigns/use-pictures-jovian-direct.sh
git commit -m "Use correct Pictures Jovian source"
git push origin main

echo
echo "=== REFRESH ==="
bash tools/campaigns/vanguard-horizontal-projective-refresh.sh

LIVE="$HOME/.local/state/pose-lab-v2-vanguard-live/worktree"
HEAD="$(git -C "$LIVE" rev-parse HEAD)"

echo
echo "=== RECEIPT ==="
echo "source=$SRC"
echo "project_source=$PROJECT_SRC"
echo "backup=$BACKUP"
echo "final_atlas=$FINAL"
echo "live_head=$HEAD"
echo "http://127.0.0.1:8766/motion.html?procedural=vanguard-horizontal-strike&rev=$HEAD&nocache=$(date +%s)"
