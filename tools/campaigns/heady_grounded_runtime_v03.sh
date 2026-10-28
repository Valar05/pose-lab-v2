#!/data/data/com.termux/files/usr/bin/bash
# Heady Pose Lab v03 | original invocation: bash tools/campaigns/heady_grounded_runtime_v03.sh show
# Source of truth: this runner and the complete tools/heady/campaigns/grounded_ik_v03 directory.
set -euo pipefail
HERE="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd -- "$HERE/../.." && pwd)"
P="$REPO/tools/heady/campaigns/grounded_ik_v03"
python3 "$P/VERIFY_AND_SHOW.py" "${1:-show}" "$P"
