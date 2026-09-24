#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
STATE="$HOME/.local/state/pose-lab-v2-vanguard-live"
WORK="$STATE/worktree"
PROC="$WORK/public/assets/vanguard/procedural"
SESSION="plv2-vanguard-live"
PORT="${POSE_LAB_PORT:-8766}"

git -C "$ROOT" fetch origin main

mkdir -p "$STATE"
if [[ ! -e "$WORK/.git" ]]; then
  git -C "$ROOT" worktree prune
  git -C "$ROOT" worktree add --detach "$WORK" origin/main
else
  git -C "$WORK" reset --hard origin/main
fi

mkdir -p "$PROC"

# One canonical Vanguard body atlas. Keep it if already installed; otherwise
# copy the known accepted 90-pose atlas from the phone checkout/Downloads.
if [[ ! -f "$PROC/vanguard-pose-atlas-90.png" ]]; then
  for src in     "$ROOT/public/assets/vanguard/procedural/vanguard-pose-atlas-90.png"     "/storage/emulated/0/Download/vanguard-pose-atlas-90.png"     "/storage/emulated/0/Download/918598.png"
  do
    if [[ -f "$src" ]]; then
      cp -f "$src" "$PROC/vanguard-pose-atlas-90.png"
      break
    fi
  done
fi

[[ -f "$PROC/vanguard-pose-atlas-90.png" ]] || {
  echo "STOP: missing canonical vanguard-pose-atlas-90.png"
  exit 11
}

# Fail closed on the old split runtime.
! grep -R -n "vanguard-pose-atlas-54\|slash_right.png\|drawLegacySlash"   "$WORK/public/assets/vanguard/procedural/"*.recipe.json   "$WORK/src/procedural-motion-preview.js" >/dev/null || {
  echo "STOP: legacy atlas/slash runtime reference remains"
  grep -R -n "vanguard-pose-atlas-54\|slash_right.png\|drawLegacySlash"     "$WORK/public/assets/vanguard/procedural/"*.recipe.json     "$WORK/src/procedural-motion-preview.js" || true
  exit 12
}

cd "$WORK"
node scripts/build.mjs

for s in plv2-vanguard-run-live plv2-overhand-live plv2-vanguard-live; do
  tmux kill-session -t "$s" 2>/dev/null || true
done
pkill -f "python3 -m http.server $PORT" 2>/dev/null || true

LOG="$STATE/server.log"
: > "$LOG"
tmux new-session -d -s "$SESSION"   "cd '$WORK' && exec python3 -m http.server '$PORT' --bind 127.0.0.1 --directory '$WORK/dist' >>'$LOG' 2>&1"

BASE="http://127.0.0.1:$PORT"
REV="$(git -C "$WORK" rev-parse --short HEAD)"
URL="$BASE/motion.html?procedural=vanguard-attack2-uppercut&rev=$REV"

for _ in $(seq 1 40); do
  if curl -fsS "$BASE/assets/vanguard/procedural/vanguard-pose-atlas-90.png" -o /dev/null 2>&1     && curl -fsS "$BASE/assets/vanguard/procedural/diorama-slash-atlas.png" -o /dev/null 2>&1     && curl -fsS "$BASE/assets/vanguard/procedural/attack2-uppercut.recipe.json" -o /dev/null 2>&1     && curl -fsS "$BASE/src/procedural-motion-preview.js?rev=$REV" -o /dev/null 2>&1
  then
    break
  fi
  sleep .2
done

curl -fsS "$BASE/assets/vanguard/procedural/vanguard-pose-atlas-90.png" -o /dev/null
curl -fsS "$BASE/assets/vanguard/procedural/diorama-slash-atlas.png" -o /dev/null
curl -fsS "$URL" -o /dev/null

echo "POSE_LAB_CANONICAL_REFRESH_OK"
echo "head=$(git -C "$WORK" rev-parse HEAD)"
echo "body_atlas=vanguard-pose-atlas-90.png"
echo "slash_atlas=diorama-slash-atlas.png"
echo "slash_renderer=single"
echo "url=$URL"

if command -v termux-open-url >/dev/null 2>&1; then
  termux-open-url "$URL" || true
elif [[ -x /system/bin/am ]]; then
  /system/bin/am start -a android.intent.action.VIEW -d "$URL" >/dev/null 2>&1 || true
fi
