#!/usr/bin/env bash
set -euo pipefail
# Repo-owned, self-locating, turret-only. No hull, barrel, or art rewriting.
SOURCE="${BASH_SOURCE[0]}"
while [ -L "$SOURCE" ]; do BASE="$(cd -P "$(dirname "$SOURCE")" && pwd)"; SOURCE="$(readlink "$SOURCE")"; [[ "$SOURCE" = /* ]] || SOURCE="$BASE/$SOURCE"; done
REPO="$(cd -P "$(dirname "$SOURCE")/../.." && pwd)"
cd "$REPO"
[[ -f AGENTS.md && -f motion.html && -d public/assets/panzer-pose-experiment ]] || { echo BLOCKER=WRONG_REPOSITORY >&2; exit 2; }
printf 'RESOLVED_REPO=%s\nEXECUTION_DIR=%s\nBRANCH=%s\nHEAD=%s\n' "$REPO" "$PWD" "$(git branch --show-current)" "$(git rev-parse HEAD)"
python3 -c 'import PIL' || { echo 'BLOCKER=python3 requires Pillow; install in Termux with python3 -m pip install Pillow' >&2; exit 3; }
python3 tools/campaigns/panzer_turret_only_v1.py
node --check src/panzer-turret-only-preview.js
echo 'RESULT=generated locally; Git push and hosted verification are separate gates'
git status --short
