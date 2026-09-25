#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT="/storage/emulated/0/Documents/GodotProjects/pose-lab-v2"
STATE="$HOME/.local/state/pose-lab-v2-vanguard-live"
LIVE="$STATE/worktree"
SESSION="plv2-vanguard-live"
PORT="${POSE_LAB_PORT:-8766}"
RECIPE="assets/vanguard/procedural/attack2-uppercut.recipe.json"

echo "=== PULL CANONICAL MAIN ==="
git -C "$ROOT" fetch origin main
git -C "$ROOT" checkout main
git -C "$ROOT" merge --ff-only origin/main
HEAD="$(git -C "$ROOT" rev-parse HEAD)"
echo "main_head=$HEAD"

echo "=== REFRESH LIVE WORKTREE ==="
mkdir -p "$STATE"
git -C "$ROOT" worktree remove --force "$LIVE" >/dev/null 2>&1 || true
rm -rf "$LIVE"
git -C "$ROOT" worktree prune
git -C "$ROOT" worktree add --detach "$LIVE" "$HEAD" >/dev/null

echo "=== BUILD ==="
cd "$LIVE"
node scripts/build.mjs

echo "=== VERIFY BUILT UPPERCUT ==="
[[ -s "$LIVE/dist/$RECIPE" ]] || { echo "STOP: built recipe missing: dist/$RECIPE"; exit 12; }
[[ -s "$LIVE/dist/src/procedural-motion-preview.js" ]] || { echo "STOP: built renderer missing"; exit 13; }

echo "=== RESTART 8766 FROM DIST ==="
tmux kill-session -t "$SESSION" 2>/dev/null || true
tmux new-session -d -s "$SESSION" "cd '$LIVE/dist' && exec python3 -m http.server '$PORT' --bind 127.0.0.1 --directory '$LIVE/dist'"

BASE="http://127.0.0.1:$PORT"
REV="$(git -C "$LIVE" rev-parse --short HEAD)"
URL="$BASE/motion.html?procedural=vanguard-attack2-uppercut&rev=$REV&nocache=$(date +%s)"

READY=0
for _ in $(seq 1 30); do
  if curl -fsS "$BASE/$RECIPE?rev=$REV" -o /dev/null 2>&1 &&
     curl -fsS "$BASE/src/procedural-motion-preview.js?rev=$REV" -o /dev/null 2>&1; then
    READY=1
    break
  fi
  sleep .2
done
[[ "$READY" -eq 1 ]] || { echo "STOP: 8766 dist runtime verification failed"; tmux capture-pane -pt "$SESSION" || true; exit 20; }

echo "VANGUARD_ATTACK2_UPPERCUT_REFRESH_OK"
echo "live_head=$(git -C "$LIVE" rev-parse HEAD)"
echo "recipe_http=200"
echo "renderer_http=200"
echo "served_root=$LIVE/dist"
echo "url=$URL"

if command -v termux-open-url >/dev/null 2>&1; then
  termux-open-url "$URL" || true
elif [[ -x /system/bin/am ]]; then
  /system/bin/am start -a android.intent.action.VIEW -d "$URL" >/dev/null 2>&1 || true
fi
