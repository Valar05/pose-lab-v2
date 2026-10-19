#!/usr/bin/env bash
set -euo pipefail
BRANCH=codex/unicorn-reference-measurement-v1
BASE=0e6944f789318deee3945dadf2444f8daab23f92
ROOT="$HOME/pose-lab-v2"
SRC=/sdcard/Download/file_00000000ab3881f59acb321d0506ba88.png
[ -f "$SRC" ] || { echo "STOP original art missing"; exit 2; }
[ -d "$ROOT/.git" ] || { echo "STOP need Pose Lab V2 checkout at $ROOT"; exit 2; }
cd "$ROOT"
git fetch origin "$BRANCH"
HEAD_SHA="$(git rev-parse FETCH_HEAD)"
WORK="$(mktemp -d)/repo"
git worktree add --detach "$WORK" "$HEAD_SHA"
cd "$WORK"
python3 tools/campaigns/campaign_core.py --root "$WORK" preflight --contract campaigns/unicorn-mounted-canter-v1.contract.json --skip-diff
[ ! -e public/assets/unicorn/candidate-v2 ] || { echo "STOP V2 candidate exists"; exit 2; }
python3 tools/campaigns/unicorn_textured_rig_v2.py --source "$SRC" --out public/assets/unicorn/candidate-v2
echo "V2 GENERATED IN QUARANTINE. Segmentation diagnostic review required."
echo "CANDIDATE_DIR=$WORK/public/assets/unicorn/candidate-v2"
echo "No push, promotion or hosted acceptance claimed."
