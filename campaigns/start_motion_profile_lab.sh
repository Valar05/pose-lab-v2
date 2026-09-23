#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

# Pose Lab V2 Motion Profile Lab campaign bootstrap.
# Safe to launch from anywhere in Termux.
#
# Responsibilities:
#   1. find or clone Valar05/pose-lab-v2
#   2. enter the real checkout
#   3. verify origin + clean main
#   4. fast-forward to current GitHub main
#   5. install JS deps when missing
#   6. build
#   7. restart the dedicated tmux server
#   8. verify the Motion Profile Lab route, not merely port 4173
#   9. open it on Android
#
# Optional:
#   POSE_LAB_ROOT=/custom/path
#   POSE_LAB_PORT=4173

REPO_SLUG="Valar05/pose-lab-v2"
REPO_HTTPS="https://github.com/Valar05/pose-lab-v2.git"
SESSION="pose-lab-v2-motion"
PORT="${POSE_LAB_PORT:-4173}"
URL="http://127.0.0.1:${PORT}/?view=motion"

say()  { printf '\n[pose-lab-motion] %s\n' "$*"; }
fail() { printf '\n[pose-lab-motion] STOP: %s\n' "$*" >&2; exit 1; }

need() {
  command -v "$1" >/dev/null 2>&1 || fail "missing required command: $1"
}

need git
need tmux
need python3
need curl

find_checkout() {
  if [ -n "${POSE_LAB_ROOT:-}" ] && [ -d "$POSE_LAB_ROOT/.git" ]; then
    printf '%s\n' "$POSE_LAB_ROOT"
    return 0
  fi

  for candidate in \
    "$HOME/pose-lab-v2" \
    "$HOME/src/pose-lab-v2" \
    "$HOME/projects/pose-lab-v2" \
    "/storage/emulated/0/Documents/pose-lab-v2" \
    "/storage/emulated/0/Documents/GodotProjects/pose-lab-v2"
  do
    if [ -d "$candidate/.git" ]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  # One bounded search under HOME before cloning.
  local found
  found="$(find "$HOME" -maxdepth 3 -type d -name pose-lab-v2 -print -quit 2>/dev/null || true)"
  if [ -n "$found" ] && [ -d "$found/.git" ]; then
    printf '%s\n' "$found"
    return 0
  fi

  return 1
}

if ROOT="$(find_checkout)"; then
  say "found checkout: $ROOT"
else
  ROOT="${POSE_LAB_ROOT:-$HOME/pose-lab-v2}"
  say "checkout not found; cloning $REPO_SLUG to $ROOT"
  mkdir -p "$(dirname "$ROOT")"
  git clone "$REPO_HTTPS" "$ROOT"
fi

cd "$ROOT"
say "working directory: $(pwd)"

REMOTE="$(git remote get-url origin 2>/dev/null || true)"
case "$REMOTE" in
  *Valar05/pose-lab-v2* ) ;;
  * ) fail "origin is not $REPO_SLUG: $REMOTE" ;;
esac

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$BRANCH" != "main" ]; then
  fail "expected branch main, found $BRANCH"
fi

if [ -n "$(git status --porcelain)" ]; then
  say "dirty worktree detected; refusing to overwrite local work"
  git status --short
  fail "clean or stash the checkout, then rerun"
fi

say "fetching current GitHub main"
git fetch --prune origin main

say "fast-forwarding main"
git merge --ff-only origin/main

HEAD="$(git rev-parse HEAD)"
say "HEAD: $HEAD"

if command -v npm >/dev/null 2>&1; then
  if [ -f package-lock.json ]; then
    if [ ! -d node_modules ]; then
      say "installing npm dependencies"
      npm ci
    else
      say "npm dependencies already present"
    fi
  elif [ -f package.json ] && [ ! -d node_modules ]; then
    say "installing npm dependencies"
    npm install
  fi

  say "building Pose Lab V2"
  npm run build
else
  fail "npm is required for the current Pose Lab build"
fi

# Make sure stale campaign tmux is gone before starting a new one.
if tmux has-session -t "$SESSION" 2>/dev/null; then
  say "stopping prior tmux session: $SESSION"
  tmux kill-session -t "$SESSION"
fi

# Refuse to murder unrelated processes using the requested port.
if curl -fsS "http://127.0.0.1:$PORT/" >/dev/null 2>&1; then
  fail "port $PORT is already serving something outside the campaign tmux session"
fi

say "starting server in tmux: $SESSION"
tmux new-session -d -s "$SESSION" -c "$ROOT" \
  "python3 -m http.server $PORT --bind 127.0.0.1"

READY=0
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS "http://127.0.0.1:$PORT/" >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 0.25
done

if [ "$READY" -ne 1 ]; then
  say "server failed readiness check; tmux output follows"
  tmux capture-pane -pt "$SESSION" || true
  fail "Pose Lab server did not become ready"
fi

# Verify the commissioned route actually resolves to the Motion Profile Lab code.
ROUTE_HTML="$(curl -fsS "$URL")"
printf '%s' "$ROUTE_HTML" | grep -q 'loading Pose Lab V2' \
  || fail "Motion Profile Lab route did not return the Pose Lab shell"

# Verify the source module exists on the live server too.
curl -fsS "http://127.0.0.1:$PORT/src/motion-profile-editor.js" \
  | grep -q 'Motion Profile Lab' \
  || fail "motion-profile-editor.js is not reachable from the live server"

say "Motion Profile Lab verified"
say "$URL"

if command -v termux-open-url >/dev/null 2>&1; then
  say "opening on Android"
  termux-open-url "$URL"
elif command -v am >/dev/null 2>&1; then
  say "opening on Android"
  am start -a android.intent.action.VIEW -d "$URL" >/dev/null
else
  say "browser launcher unavailable; open manually: $URL"
fi

say "READY"
say "repo: $ROOT"
say "head: $HEAD"
say "tmux: $SESSION"
say "attach: tmux attach -t $SESSION"
say "stop: tmux kill-session -t $SESSION"
say "reopen: termux-open-url '$URL'"

# Leave a shell user with the exact directory command too, since a child script
# cannot alter the parent shell's working directory.
printf '\ncd %q\n' "$ROOT"
