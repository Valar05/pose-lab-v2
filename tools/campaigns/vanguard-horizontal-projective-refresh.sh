#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
[[ -n "$ROOT" ]] || { echo "STOP: run inside pose-lab-v2"; exit 2; }

STATE="$HOME/.local/state/pose-lab-v2-vanguard-live"
LIVE="$STATE/worktree"
SESSION="plv2-vanguard-live"
PORT="${POSE_LAB_PORT:-8766}"

POSE_REL="public/assets/vanguard/procedural/vanguard-pose-atlas-90.png"
SLASH_REL="public/assets/vanguard/procedural/diorama-slash-atlas.png"

echo "=== FETCH MAIN ==="
git -C "$ROOT" fetch origin main

echo "=== REFRESH LIVE WORKTREE ==="
mkdir -p "$STATE"
git -C "$ROOT" worktree remove --force "$LIVE" >/dev/null 2>&1 || true
rm -rf "$LIVE"
git -C "$ROOT" worktree prune
git -C "$ROOT" worktree add --detach "$LIVE" origin/main >/dev/null

echo "live_head=$(git -C "$LIVE" rev-parse HEAD)"

echo "=== VERIFY REPO ASSETS ==="
[[ -s "$LIVE/$POSE_REL" ]] || { echo "STOP: missing $POSE_REL"; exit 11; }
[[ -s "$LIVE/$SLASH_REL" ]] || { echo "STOP: missing $SLASH_REL"; exit 12; }
echo "pose_atlas_sha256=$(sha256sum "$LIVE/$POSE_REL" | awk '{print $1}')"
echo "slash_atlas_sha256=$(sha256sum "$LIVE/$SLASH_REL" | awk '{print $1}')"

echo "=== BUILD ==="
cd "$LIVE"
node scripts/build.mjs

echo "=== RESTART SERVER ==="
tmux kill-session -t "$SESSION" 2>/dev/null || true
tmux new-session -d -s "$SESSION"   "cd '$LIVE' && exec python3 -m http.server '$PORT' --bind 127.0.0.1 --directory '$LIVE/dist'"

BASE="http://127.0.0.1:$PORT"
REV="$(git -C "$LIVE" rev-parse --short HEAD)"
URL="$BASE/motion.html?procedural=vanguard-attack2-uppercut&rev=$REV"

READY=0
for _ in $(seq 1 40); do
  if curl -fsS "$BASE/assets/vanguard/procedural/vanguard-pose-atlas-90.png" -o /dev/null 2>&1 &&
     curl -fsS "$BASE/assets/vanguard/procedural/diorama-slash-atlas.png" -o /dev/null 2>&1 &&
     curl -fsS "$BASE/assets/vanguard/procedural/attack2-uppercut.recipe.json" -o /dev/null 2>&1 &&
     curl -fsS "$BASE/src/procedural-motion-preview.js?rev=$REV" -o /dev/null 2>&1; then
    READY=1
    break
  fi
  sleep .2
done

[[ "$READY" -eq 1 ]] || { echo "STOP: runtime verification failed"; exit 20; }

echo "POSE_LAB_CANONICAL_REFRESH_OK"
echo "pose_atlas=git"
echo "slash_atlas=git"
echo "slash_renderer=single"
echo "url=$URL"

if command -v termux-open-url >/dev/null 2>&1; then
  termux-open-url "$URL" || true
elif [[ -x /system/bin/am ]]; then
  /system/bin/am start -a android.intent.action.VIEW -d "$URL" >/dev/null 2>&1 || true
fi
