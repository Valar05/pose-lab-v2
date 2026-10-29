#!/usr/bin/env bash
# HEADY_GROUNDED_IK v03.4.0 ORIGINAL INVOCATION:
# Download Heady_GroundedIK_v03_4_OutAndBack_Campaign.zip, run the matching SHA-pinned
# single Termux python bootstrap supplied with the release to install and commit.
set -euo pipefail
SELF="$(realpath "${BASH_SOURCE[0]}")"
ROOT="$(cd "$(dirname "$SELF")/../.." && pwd -P)"
test -f "$ROOT/AGENTS.md" || { echo REPO_CHECK=BLOCKED; exit 1; }
PACKET="$ROOT/tools/heady/campaigns/grounded_ik_v03/review_v03_4"
case "${1:-verify}" in
 verify) python3 "$PACKET/verify_candidate.py" ;;
 view) GIF="$HOME/storage/pictures/Heady_GroundedIK_v03_4_OutAndBack.gif"
       test -f "$GIF" || { echo PUBLIC_GIF_NOT_FOUND; exit 1; }
       if command -v termux-open >/dev/null;then termux-open "$GIF";else echo "OPEN_UNAVAILABLE GIF=$GIF";fi ;;
 *) echo 'USAGE: verify|view';exit 2;;
esac
