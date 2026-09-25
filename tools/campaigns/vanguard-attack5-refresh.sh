#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
ROOT="/storage/emulated/0/Documents/GodotProjects/pose-lab-v2"
STATE="$HOME/.local/state/pose-lab-v2-vanguard-live"
LIVE="$STATE/worktree"; SESSION="plv2-vanguard-live"; PORT="${POSE_LAB_PORT:-8766}"
echo "=== PULL CANONICAL MAIN ==="
git -C "$ROOT" fetch origin main
git -C "$ROOT" checkout main
git -C "$ROOT" merge --ff-only origin/main
HEAD="$(git -C "$ROOT" rev-parse HEAD)"
echo "main_head=$HEAD"
echo "=== FAIL-CLOSED CAMPAIGN GUARD ==="
python3 "$ROOT/tools/campaigns/pose_campaign_guard.py"
echo "=== RECREATE DISPOSABLE LIVE WORKTREE ==="
mkdir -p "$STATE"; git -C "$ROOT" worktree remove --force "$LIVE" >/dev/null 2>&1 || true
rm -rf "$LIVE"; git -C "$ROOT" worktree prune; git -C "$ROOT" worktree add --detach "$LIVE" "$HEAD" >/dev/null
python3 "$LIVE/tools/campaigns/pose_campaign_guard.py"
echo "=== BUILD ==="
cd "$LIVE"; node scripts/build.mjs
for f in motion.html src/procedural-motion-preview.js; do
  [[ -s "$LIVE/dist/$f" ]] || { echo "STOP: built runtime missing $f"; exit 12; }
done

rm -f "$LIVE/assets"
ln -s "$LIVE/public/assets" "$LIVE/assets"

for f in public/assets/vanguard/procedural/attack5.recipe.json public/assets/vanguard/procedural/attack5-spray-atlas.png; do
  [[ -s "$LIVE/$f" ]] || { echo "STOP: canonical runtime missing $f"; exit 12; }
done
echo "=== RESTART REVIEW SERVER ==="
tmux kill-session -t "$SESSION" 2>/dev/null || true
tmux new-session -d -s "$SESSION" "cd '$LIVE' && exec python3 -m http.server '$PORT' --bind 127.0.0.1"
BASE="http://127.0.0.1:$PORT"; REV="$(git -C "$LIVE" rev-parse --short HEAD)"; READY=0
for _ in $(seq 1 40); do
 if curl -fsS "$BASE/motion.html?procedural=vanguard-attack5&rev=$REV" -o /dev/null 2>&1 &&
    curl -fsS "$BASE/assets/vanguard/procedural/attack5.recipe.json?rev=$REV" -o /dev/null 2>&1 &&
    curl -fsS "$BASE/assets/vanguard/procedural/attack5-spray-atlas.png?rev=$REV" -o /dev/null 2>&1 &&
    curl -fsS "$BASE/src/procedural-motion-preview.js?rev=$REV" -o /dev/null 2>&1; then READY=1; break; fi
 sleep .2
done
[[ "$READY" -eq 1 ]] || { echo "STOP: exact Attack5 browser runtime failed"; tmux capture-pane -pt "$SESSION" || true; exit 20; }
URL="$BASE/motion.html?procedural=vanguard-attack5&rev=$REV&nocache=$(date +%s)"
echo "ATTACK5_CANONICAL_REFRESH_OK"
echo "head=$HEAD"
echo "served_root=$LIVE"
echo "asset_bridge=$LIVE/assets -> $LIVE/public/assets"
echo "url=$URL"
echo "NOTE: transport/build/guard PASS is not visual acceptance."
termux-open-url "$URL" 2>/dev/null || true
