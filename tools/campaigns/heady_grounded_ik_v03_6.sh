#!/usr/bin/env bash
# Heady grounded IK v03.6.0 | permanent repo-owned execution entrypoint.
# Original invocation: bash tools/campaigns/heady_grounded_ik_v03_6.sh review|verify|blender
set -euo pipefail
here="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
repo="$(cd -- "$here/../.." && pwd -P)"
base="$repo/tools/heady/campaigns/grounded_ik_v03/review_v03_6"
[[ -f "$repo/AGENTS.md" && -f "$base/FILES_SHA256.json" ]] || { echo CAMPAIGN_STATUS=BLOCKED_MISSING_REPO_OR_PACKET;exit 2; }
case "${1:-review}" in
  review)
    gif="$base/Heady_v03_6_SynchronizedTripod_Candidate.gif"
    [[ -f "$gif" ]] || { echo CAMPAIGN_STATUS=BLOCKED_MISSING_GIF;exit 3; }
    if command -v termux-open >/dev/null 2>&1; then termux-open "$gif";else echo "REVIEW_GIF=$gif";fi;;
  verify)
    python3 "$base/TEST_PACKET.py";;
  blender)
    bash "$base/RUN_BLENDER_TRIPOD.sh" "${@:2}";;
  *) echo 'Usage: heady_grounded_ik_v03_6.sh review|verify|blender';exit 2;;
esac
