#!/usr/bin/env bash
set -euo pipefail
SOURCE="${BASH_SOURCE[0]}"
while [ -L "$SOURCE" ]; do BASE="$(cd -P "$(dirname "$SOURCE")" && pwd)"; SOURCE="$(readlink "$SOURCE")"; [[ "$SOURCE" = /* ]] || SOURCE="$BASE/$SOURCE"; done
REPO="$(cd -P "$(dirname "$SOURCE")/../.." && pwd)"
cd "$REPO"
[[ -f AGENTS.md && -f motion.html ]] || { echo 'BLOCKER=WRONG_REPO' >&2; exit 2; }
printf 'RESOLVED_REPO=%s\nEXECUTION_DIR=%s\nBRANCH=%s\nHEAD=%s\n' "$REPO" "$PWD" "$(git branch --show-current)" "$(git rev-parse HEAD)"
python3 tools/campaigns/panzer_hull_turret_static_v1.py
node --check src/panzer-hull-turret-static-preview.js
git status --short
