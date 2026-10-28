#!/data/data/com.termux/files/usr/bin/bash
# Pose Lab v03.1 permanent visualization rerun. Original install/launch method: v03.1 ZIP INSTALL_AND_DELIVER_v03_1.py; no old campaigns rerun.
set -euo pipefail
HERE="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(CDPATH= cd -- "$HERE/../.." && pwd)"
exec python3 "$REPO/tools/heady/campaigns/grounded_ik_v03/review_v03_1/PUBLISH_AND_OPEN.py"
