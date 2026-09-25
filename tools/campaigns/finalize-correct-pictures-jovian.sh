#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SRC="/storage/emulated/0/Pictures/file_00000000bb3481f5ae303e7cda000d99.png"
PROJECT_SRC="$ROOT/public/assets/vanguard/procedural/jovian-source.png"
ATLAS="$ROOT/public/assets/vanguard/procedural/diorama-slash-atlas.png"
RECIPE="$ROOT/public/assets/vanguard/procedural/horizontal-strike.recipe.json"

echo "=== FINALIZE CORRECT PICTURES JOVIAN ==="

test -f "$SRC"
test -f "$PROJECT_SRC"
test -f "$ATLAS"
test -f "$RECIPE"

cmp -s "$SRC" "$PROJECT_SRC"

python3 -c 'from PIL import Image; import hashlib,sys,json; src,atlas,recipe=sys.argv[1:]; s=Image.open(src).convert("RGB"); a=Image.open(atlas).convert("RGB"); assert a.size==(768,384),a.size; expected=s.resize((192,192),Image.Resampling.LANCZOS); actual=a.crop((576,192,768,384)); assert actual.tobytes()==expected.tobytes(),"STOP: cell 8 does not exactly equal the complete Pictures source resized to 192x192"; print("source_size=",s.size); print("atlas_size=",a.size); print("cell8_size=",actual.size); print("source_sha256=",hashlib.sha256(open(src,"rb").read()).hexdigest()); print("atlas_sha256=",hashlib.sha256(open(atlas,"rb").read()).hexdigest()); r=json.load(open(recipe)); e=r["sources"]["slash-right"]; assert e["kind"]=="effect-atlas-cell" and e["atlas"]=="slash-canonical" and e["cell"]==8; print("horizontal_hook=cell8")' "$SRC" "$ATLAS" "$RECIPE"

SHA="$(sha256sum "$ATLAS" | cut -d' ' -f1)"
python3 -c 'import json,sys; p=sys.argv[1]; r=json.load(open(p)); r["effectAtlases"]["slash-canonical"]["sha256"]=sys.argv[2]; open(p,"w").write(json.dumps(r,indent=2)+"
")' "$RECIPE" "$SHA"

git add public/assets/vanguard/procedural/jovian-source.png public/assets/vanguard/procedural/diorama-slash-atlas.png public/assets/vanguard/procedural/horizontal-strike.recipe.json tools/campaigns/finalize-correct-pictures-jovian.sh
git commit -m "Use exact Pictures Jovian source in horizontal slash"
git push origin main

echo "=== REFRESH ==="
bash tools/campaigns/vanguard-horizontal-projective-refresh.sh
LIVE="$HOME/.local/state/pose-lab-v2-vanguard-live/worktree"
HEAD="$(git -C "$LIVE" rev-parse HEAD)"

echo "=== RECEIPT ==="
echo "pictures_source=$SRC"
echo "project_source=$PROJECT_SRC"
echo "atlas=$ATLAS"
echo "cell=8"
echo "atlas_sha256=$SHA"
echo "live_head=$HEAD"
echo "http://127.0.0.1:8766/motion.html?procedural=vanguard-horizontal-strike&rev=$HEAD&nocache=$(date +%s)"
