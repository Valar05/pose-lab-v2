#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
ROOT="/storage/emulated/0/Documents/GodotProjects/pose-lab-v2"
cd "$ROOT"
for f in AGENTS.md docs/POSE_LAB_CAMPAIGN_RULES.md docs/POSE_IS_GOD.md campaigns/swarmling-motion-presentation-scale.contract.json; do
  [ -s "$f" ] || exit 1
  cat "$f" >/dev/null
done
python3 tools/campaigns/patch_swarmling_presentation_scale.py src/procedural-swarmling-preview.js
node --check src/procedural-swarmling-preview.js
npm run build
npm run smoke
