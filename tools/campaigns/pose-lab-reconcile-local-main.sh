#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export GIT_PAGER=cat PAGER=cat

P="$HOME/storage/documents/GodotProjects/pose-lab-v2"
STATE="$HOME/.local/state/pose-lab-v2-git-reconcile"

cd "$P"
mkdir -p "$STATE"

cat \
  AGENTS.md \
  docs/POSE_LAB_CAMPAIGN_RULES.md \
  docs/POSE_IS_GOD.md \
  >/dev/null

echo "============================================================"
echo " POSE LAB LOCAL MAIN RECONCILIATION"
echo "============================================================"
echo "MISSION=make local main exactly match origin/main without deleting local history or untracked archaeology"
echo "FORBIDDEN=stash reset clean deleting untracked files rewriting rescue history"
echo "PRESERVE=local divergent commits + untracked files + evidence"

echo
echo "=== PREFLIGHT ==="
git status --short || true
git fetch origin main

LOCAL_HEAD="$(git rev-parse HEAD)"
ORIGIN_HEAD="$(git rev-parse origin/main)"
BASE="$(git merge-base HEAD origin/main)"
STAMP="$(date +%Y%m%d-%H%M%S)"
SHORT="$(printf '%s' "$LOCAL_HEAD" | cut -c1-8)"
RESCUE="rescue/local-main-$SHORT-$STAMP"

echo "LOCAL_HEAD=$LOCAL_HEAD"
echo "ORIGIN_HEAD=$ORIGIN_HEAD"
echo "MERGE_BASE=$BASE"

git status --porcelain=v1 > "$STATE/status-$STAMP.txt"
git log --oneline --decorate "$BASE..HEAD" > "$STATE/local-only-commits-$STAMP.txt" || true
git diff --binary "$BASE..HEAD" > "$STATE/local-only-history-$STAMP.patch" || true
git ls-files --others --exclude-standard > "$STATE/untracked-$STAMP.txt" || true

if ! git diff --quiet HEAD -- || ! git diff --cached --quiet HEAD --; then
  git diff --binary HEAD > "$STATE/tracked-working-$STAMP.patch" || true
  git diff --cached --binary HEAD > "$STATE/tracked-index-$STAMP.patch" || true
  echo "STOP: tracked working-tree changes exist."
  echo "Archived:"
  echo "  $STATE/tracked-working-$STAMP.patch"
  echo "  $STATE/tracked-index-$STAMP.patch"
  echo "No branch pointers changed."
  exit 1
fi

echo "TRACKED_WORKTREE=CLEAN"
echo "UNTRACKED_FILES=PRESERVED"

if [ "$LOCAL_HEAD" = "$ORIGIN_HEAD" ]; then
  git branch --set-upstream-to=origin/main main >/dev/null 2>&1 || true
  echo "LOCAL_MAIN_ALREADY_MATCHES_ORIGIN=YES"
  echo "HEAD=$(git rev-parse HEAD)"
  git status --short
  exit 0
fi

echo
echo "=== PRESERVE LOCAL HISTORY ==="
git branch "$RESCUE" "$LOCAL_HEAD"
echo "RESCUE_BRANCH=$RESCUE"
echo "RESCUE_HEAD=$(git rev-parse "$RESCUE")"

echo
echo "=== REPOINT LOCAL MAIN TO ORIGIN/MAIN ==="
git switch --detach "$ORIGIN_HEAD"
git branch -f main "$ORIGIN_HEAD"
git switch main
git branch --set-upstream-to=origin/main main

echo
echo "=== VERIFY ==="
HEAD_NOW="$(git rev-parse HEAD)"
UPSTREAM_NOW="$(git rev-parse origin/main)"
[ "$HEAD_NOW" = "$UPSTREAM_NOW" ] || {
  echo "STOP: verification mismatch after reconciliation"
  exit 1
}

git diff --quiet HEAD -- || {
  echo "STOP: tracked worktree changed unexpectedly"
  exit 1
}
git diff --cached --quiet HEAD -- || {
  echo "STOP: index changed unexpectedly"
  exit 1
}

echo "LOCAL_MAIN_RECONCILED=YES"
echo "HEAD=$HEAD_NOW"
echo "ORIGIN_MAIN=$UPSTREAM_NOW"
echo "RESCUE_BRANCH=$RESCUE"
echo "LOCAL_ONLY_HISTORY_PATCH=$STATE/local-only-history-$STAMP.patch"
echo "LOCAL_ONLY_COMMITS=$STATE/local-only-commits-$STAMP.txt"
echo "UNTRACKED_MANIFEST=$STATE/untracked-$STAMP.txt"
echo
echo "=== REMAINING STATUS ==="
git status --short
