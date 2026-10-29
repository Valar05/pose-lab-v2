#!/data/data/com.termux/files/usr/bin/bash
# Original owner invocation, any directory:
# bash "$HOME/storage/documents/GodotProjects/pose-lab-v2/tools/campaigns/heady_3d_campaign.sh" run
# Preflight and auto-install ONLY NumPy/Pillow if missing via Termux pkg; never Git/Hands.
set -euo pipefail
REPO="${HOME}/storage/documents/GodotProjects/pose-lab-v2"
ENTRY="$REPO/tools/campaigns/heady_3d_weighting.py"
if [ ! -f "$REPO/AGENTS.md" ] || [ ! -f "$REPO/motion.html" ] || [ ! -f "$REPO/scripts/build.mjs" ] || [ ! -f "$ENTRY" ]; then
  echo 'WRONG_REPO_OR_SCRIPT_MISSING' >&2;exit 2
fi
ACTION="${1:-run}"
if [ "$ACTION" = 'run' ] || [ "$ACTION" = 'doctor' ] || [ "$ACTION" = 'resume' ]; then
  if ! python -c 'import numpy;from PIL import Image' >/dev/null 2>&1; then
     if ! command -v pkg >/dev/null 2>&1; then echo 'DEPENDENCIES_MISSING: numpy and Pillow; not Termux' >&2;exit 3;fi
     echo 'Preflight: installing Termux python-numpy and python-pillow only';
     if command -v timeout >/dev/null 2>&1; then timeout 180 pkg install -y python-numpy python-pillow || { echo 'DEPENDENCY_INSTALL_FAILED' >&2;exit 4; }; else pkg install -y python-numpy python-pillow || exit 4;fi
  fi
fi
exec python "$ENTRY" "$ACTION" "${@:2}"
