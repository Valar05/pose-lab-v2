#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export PAGER=cat GIT_PAGER=cat
ROOT="/storage/emulated/0/Documents/GodotProjects/pose-lab-v2"
STATE="$HOME/.local/state/pose-lab-v2-vanguard-live"
LIVE="$STATE/worktree"; SESSION="plv2-vanguard-live"; PORT="${POSE_LAB_PORT:-8766}"
cd "$ROOT"
echo "=== PRESERVE USER WORKTREE / FETCH CANONICAL MAIN ==="
git status --short
git fetch origin main
HEAD="$(git rev-parse origin/main)"
echo "origin_main_head=$HEAD"
echo "=== DISPOSABLE LIVE WORKTREE ==="
mkdir -p "$STATE"
git worktree remove --force "$LIVE" >/dev/null 2>&1 || true
rm -rf "$LIVE"
git worktree prune
git worktree add --detach "$LIVE" "$HEAD" >/dev/null
echo "=== SEALED CAMPAIGN GUARD ==="
python3 "$LIVE/tools/campaigns/vanguard-shoulder-charge-guard.py"
node --check "$LIVE/src/procedural-motion-preview.js"
cd "$LIVE"
node scripts/build.mjs
[[ -s "$LIVE/dist/motion.html" ]] || { echo "STOP: built motion.html missing"; exit 12; }
[[ -s "$LIVE/dist/src/procedural-motion-preview.js" ]] || { echo "STOP: built module missing"; exit 13; }
node --check "$LIVE/dist/src/procedural-motion-preview.js"
rm -f "$LIVE/assets"
ln -s "$LIVE/public/assets" "$LIVE/assets"
tmux kill-session -t "$SESSION" 2>/dev/null || true
tmux new-session -d -s "$SESSION" "cd '$LIVE' && exec python3 -m http.server '$PORT' --bind 127.0.0.1"
BASE="http://127.0.0.1:$PORT"; REV="$(git rev-parse --short HEAD)"; READY=0
for _ in $(seq 1 40); do
  if curl -fsS "$BASE/motion.html?procedural=vanguard-shoulder-charge&rev=$REV" -o /dev/null 2>&1 &&
     curl -fsS "$BASE/assets/vanguard/procedural/shoulder-charge.recipe.json?rev=$REV" -o /dev/null 2>&1 &&
     curl -fsS "$BASE/src/procedural-motion-preview.js?rev=$REV" -o /dev/null 2>&1; then READY=1; break; fi
  sleep .2
done
[[ "$READY" -eq 1 ]] || { echo "STOP: exact shoulder-charge runtime failed"; tmux capture-pane -pt "$SESSION" || true; exit 20; }
URL="$BASE/motion.html?procedural=vanguard-shoulder-charge&rev=$REV&nocache=$(date +%s)"
echo "SHOULDER_CHARGE_REFRESH_OK"
echo "head=$HEAD"
echo "served_root=$LIVE"
echo "user_worktree_untouched=true"
echo "url=$URL"
echo "NOTE: mechanical/runtime green is not human visual acceptance."
termux-open-url "$URL" 2>/dev/null || true
