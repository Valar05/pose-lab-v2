#!/usr/bin/env bash
# HEADY_GROUNDED_IK v03.3.0 ORIGINAL INVOCATION:
# Download Heady_GroundedIK_v03_3_OneDeliberateStep_Campaign.zip and run the exact
# SHA-pinned one-paste Python bootstrap supplied with it. This persists that code.
set -euo pipefail
SELF="$(realpath "${BASH_SOURCE[0]}")"; ROOT="$(dirname "$(dirname "$(dirname "$SELF")")")"
# script lives tools/campaigns -> repo root is two parents above tools/campaigns
ROOT="$(cd "$(dirname "$SELF")/../.." && pwd -P)"
test -f "$ROOT/AGENTS.md" || { echo REPO_CHECK=BLOCKED; exit 1; }
PACKET="$ROOT/tools/heady/campaigns/grounded_ik_v03/review_v03_3"
case "${1:-verify}" in
 verify)
  python3 - "$PACKET" <<'PY2'
from pathlib import Path
import sys,hashlib,json
p=Path(sys.argv[1]);manifest=json.loads((p/'FILES_SHA256.json').read_text())
for file,sha in manifest.items():
 f=p/file
 assert f.is_file() and hashlib.sha256(f.read_bytes()).hexdigest()==sha, 'MISMATCH:'+file
print('VERSION=03.3.0\nCANDIDATE=ONE_STEP_PENDING_VISUAL_ACCEPTANCE\nVERIFY=PASS')
PY2
  ;;
 view)
  image="$HOME/storage/pictures/Heady_GroundedIK_v03_3_OneDeliberateStep.gif"
  test -f "$image" || { echo 'PUBLIC_GIF_NOT_FOUND'; exit 1; }
  if command -v termux-open >/dev/null; then termux-open "$image"; else echo "OPEN_UNAVAILABLE PUBLIC_GIF=$image"; fi
  ;;
 reproduce)
  mkdir -p "$PACKET/reproduction_result"
  python3 "$PACKET/grounded_single_step.py" "$PACKET/Meshy_AI_Character_output (1).glb" "$PACKET/reproduction_result"
  ;;
 *) echo 'USAGE: verify|view|reproduce'; exit 2;;
esac
