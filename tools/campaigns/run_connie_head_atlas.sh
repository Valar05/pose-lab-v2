#!/data/data/com.termux/files/usr/bin/bash
# Connie Pose Lab V2 head-normalized atlas campaign.
# Run from repository root: bash tools/campaigns/run_connie_head_atlas.sh
set -euo pipefail
export PAGER=cat GIT_PAGER=cat
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
cd "$ROOT"
source tools/campaigns/campaign_common.sh
CONTRACT="campaigns/connie-head-normalized-atlas-v1.contract.json"
INPUTS="campaigns/connie-head-atlas.inputs.json"
OUT="public/assets/connie/atlas"
pose_campaign_boot "$ROOT" "$CONTRACT"
# Read the actual packet into terminal output; an agent must consume it before authoring.
PACKET="$(mktemp "${TMPDIR:-/tmp}/connie-pose-packet.XXXXXXXX")"
trap 'rm -f "$PACKET"' EXIT
python3 tools/campaigns/sprite_doctrine_boot.py --task extract --contract "$CONTRACT" --output "$PACKET"
cat "$PACKET"
for file in public/assets/connie/source/idle.png public/assets/connie/source/run.png public/assets/connie/source/rebound.png public/assets/connie/source/dash.png; do
  pose_campaign_require_file "$file"
done
pose_campaign_require_file "$INPUTS"
python3 -c 'from PIL import Image; print("CONNIE_PILLOW_OK")' || pose_campaign_stop "Pillow missing: pkg install python; python -m pip install Pillow"
python3 tools/campaigns/connie_head_atlas.py --manifest "$INPUTS" --output "$OUT"
python3 - "$INPUTS" "$OUT/connie_atlas.json" <<'PY'
import json,sys
m=json.load(open(sys.argv[1])); a=json.load(open(sys.argv[2]))
names={f["name"] for f in m["frames"]}
expected={"idle","run_1","run_2","run_3","rebound_1","rebound_2","rebound_3","dash_1","dash_2","dash_3"}
assert names==expected,(names,expected)
assert set(a["frames"])==expected
assert a["size"]["w"]<=int(m.get("maxAtlasSize",2048))
assert a["size"]["h"]<=int(m.get("maxAtlasSize",2048))
print("CONNIE_ATLAS_STRUCTURAL_PASS=10")
PY
echo "CONNIE_ATLAS_CANDIDATE=$OUT/connie_atlas.png"
echo "CONNIE_ATLAS_METADATA=$OUT/connie_atlas.json"
echo "HUMAN_VISUAL_VERDICT=PENDING (not promoted)"
# Do not auto-commit/push assets or claim hosted review. Perform controlled source
# mutation, guard, commit/receipt/push/readback and visual approval separately.
