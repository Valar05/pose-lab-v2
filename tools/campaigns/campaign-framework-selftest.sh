#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export PAGER=cat GIT_PAGER=cat

ROOT="/storage/emulated/0/Documents/GodotProjects/pose-lab-v2"
STATE="$HOME/.local/state/pose-lab-v2-campaign-framework"
LIVE="$STATE/worktree"

stop(){ echo "STOP: $*" >&2; exit 1; }

[ -d "$ROOT/.git" ] || stop "Pose Lab checkout missing: $ROOT"
cd "$ROOT"

echo "=== PRIMARY WORKTREE READ-ONLY ==="
git status --short
git fetch origin main
TARGET="$(git rev-parse origin/main)"
echo "TARGET_REV=$TARGET"

mkdir -p "$STATE"
if [ -d "$LIVE" ]; then
  git worktree remove --force "$LIVE" >/dev/null 2>&1 || stop "could not retire stale framework worktree"
fi
git worktree add --detach "$LIVE" "$TARGET" >/dev/null
cd "$LIVE"

echo "=== STICKY BOOT ==="
for f in   AGENTS.md   docs/POSE_LAB_CAMPAIGN_RULES.md   docs/POSE_IS_GOD.md   docs/POSE_CAMPAIGN_FRAMEWORK.md
do
  [ -s "$f" ] || stop "missing required framework document: $f"
  cat "$f" >/dev/null
  echo "READ=$f"
done

echo "=== STATIC PREFLIGHT ==="
python3 -m py_compile tools/campaigns/campaign_core.py
bash -n tools/campaigns/campaign_common.sh
python3 tools/test_pose_campaign_framework.py

echo "=== REPO REGRESSION SURFACE ==="
npm run test:campaign-framework
npm run test:2d
npm run build
npm run smoke
git diff --check

echo "=== FRAMEWORK RECEIPT ==="
echo "FRAMEWORK_V2=PASS"
echo "REVISION=$TARGET"
echo "CORE=tools/campaigns/campaign_core.py"
echo "SHELL=tools/campaigns/campaign_common.sh"
echo "DOC=docs/POSE_CAMPAIGN_FRAMEWORK.md"
echo "TEST=tools/test_pose_campaign_framework.py"
echo "WORKTREE_DIRTY=$(git status --porcelain | wc -l | tr -d ' ')"
echo "NEXT_CAMPAIGN_SCHEMA=pose-lab-v2-campaign-contract-v2"
