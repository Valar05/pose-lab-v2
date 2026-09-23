#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

# Pose Lab V2 Motion Profile Lab campaign.
# Run from anywhere after this repo has been pulled onto the phone.
# It updates current main, builds, starts/restarts the local review server in tmux,
# then opens the Motion Profile Lab on the phone.

SESSION="pose-lab-v2-motion"
PORT="${POSE_LAB_PORT:-4173}"
URL="http://127.0.0.1:${PORT}/?view=motion"

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
ROOT="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"

say() { printf '[pose-lab-motion] %s\n' "$*"; }

cd "$ROOT"

if ! command -v git >/dev/null 2>&1; then
  say "STOP: git is unavailable"
  exit 2
fi
if ! command -v tmux >/dev/null 2>&1; then
  say "STOP: tmux is unavailable"
  exit 2
fi
if ! command -v python3 >/dev/null 2>&1; then
  say "STOP: python3 is unavailable"
  exit 2
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$BRANCH" != "main" ]; then
  say "STOP: expected main, found $BRANCH"
  exit 3
fi

if [ -n "$(git status --porcelain)" ]; then
  say "STOP: worktree is dirty; refusing to overwrite local work"
  git status --short
  exit 4
fi

say "updating main"
git fetch origin main
git merge --ff-only origin/main

if command -v npm >/dev/null 2>&1; then
  say "building"
  npm run build
else
  say "npm unavailable; serving current checked-in browser source without build"
fi

say "starting tmux session: $SESSION"
tmux kill-session -t "$SESSION" 2>/dev/null || true
tmux new-session -d -s "$SESSION" -c "$ROOT"   "python3 -m http.server $PORT --bind 127.0.0.1"

sleep 1

if ! curl -fsS "http://127.0.0.1:$PORT/" >/dev/null 2>&1; then
  say "STOP: server failed readiness check"
  tmux capture-pane -pt "$SESSION" || true
  exit 5
fi

say "server ready"
say "$URL"

# Open on Android through the existing phone lane. No browser architecture changes.
if command -v termux-open-url >/dev/null 2>&1; then
  termux-open-url "$URL"
elif command -v am >/dev/null 2>&1; then
  am start -a android.intent.action.VIEW -d "$URL" >/dev/null
else
  say "open this URL manually: $URL"
fi

say "tmux attach: tmux attach -t $SESSION"
say "status: tmux has-session -t $SESSION && curl -I http://127.0.0.1:$PORT/"
