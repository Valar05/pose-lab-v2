#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SRC="/storage/emulated/0/Pictures/file_00000000bb3481f5ae303e7cda000d99.png"
PROJECT_SRC="$ROOT/public/assets/vanguard/procedural/jovian-source.png"
ATLAS="$ROOT/public/assets/vanguard/procedural/diorama-slash-atlas.png"
RECIPE="$ROOT/public/assets/vanguard/procedural/horizontal-strike.recipe.json"
SHA="e9b551585d6f92e1e5d94c7722d5051771fd6f38092eeb5c3f447b5c27e55c2d"

echo "=== FINALIZE PICTURES JOVIAN ==="
test -f "$SRC"
test -f "$PROJECT_SRC"
test -f "$ATLAS"
test -f "$RECIPE"
cmp -s "$SRC" "$PROJECT_SRC"

python3 -c 'import json,sys; p=sys.argv[1]; r=json.load(open(p)); r["effectAtlases"]["slash-canonical"]["sha256"]=sys.argv[2]; open(p,"w").write(json.dumps(r,indent=2))' "$RECIPE" "$SHA"
python3 -c 'import json,sys; r=json.load(open(sys.argv[1])); e=r["sources"]["slash-right"]; assert e["kind"]=="effect-atlas-cell" and e["atlas"]=="slash-canonical" and e["cell"]==8; print("horizontal=vanguard-horizontal-strike"); print("cell=8")' "$RECIPE"

git add public/assets/vanguard/procedural/jovian-source.png public/assets/vanguard/procedural/diorama-slash-atlas.png public/assets/vanguard/procedural/horizontal-strike.recipe.json tools/campaigns/finalize-pictures-jovian-refresh.sh
git commit -m "Finalize correct Pictures Jovian slash"
git push origin main
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
