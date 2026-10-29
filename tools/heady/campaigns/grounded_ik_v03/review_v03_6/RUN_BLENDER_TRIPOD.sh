#!/usr/bin/env bash
# Original v03.6.0 invocation: bash RUN_BLENDER_TRIPOD.sh [--render-stills]
set -euo pipefail
HERE="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
export PYTHONUNBUFFERED=1
command -v blender >/dev/null 2>&1 || { echo 'CAMPAIGN_STATUS=BLOCKED';echo 'REASON=BLENDER_BINARY_NOT_FOUND_ON_THIS_COMPUTER';exit 2; }
blender --background --python "$HERE/blender_bake_six_leg_tripod.py" -- \
 --source "$HERE/Meshy_AI_Character_output (1).glb" \
 --tracks "$HERE/tripod_bone_tracks.json" \
 --out "$HERE/Blender_Exports" "$@"
