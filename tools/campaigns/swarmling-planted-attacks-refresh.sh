#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export PAGER=cat GIT_PAGER=cat

ROOT="/storage/emulated/0/Documents/GodotProjects/pose-lab-v2"
TARGET="a6f1d7bcd89890d123c56ce170c4a9f65561e598"
CONTRACT="campaigns/swarmling-planted-attacks.contract.json"
MANIFEST="public/assets/vanguard/fleshpunk/characters/swarmling/animations.json"
SERVED_MANIFEST="${MANIFEST#public/}"
PREVIEW="src/procedural-swarmling-preview.js"
SHELL="src/procedural-review-shell.js"
MOTION="motion.html"
TEST="tools/test_swarmling_attacks.mjs"
STATE="$HOME/.local/state/pose-lab-v2-vanguard-live"
LIVE="$STATE/worktree"

stop(){ echo "STOP: $*" >&2; exit 1; }

cd "$ROOT"
echo "=== PRIMARY WORKTREE READ-ONLY ==="
git status --short
git fetch origin main
git cat-file -e "$TARGET^{commit}" || stop "target revision unavailable after fetch"

mkdir -p "$STATE"
if [ -d "$LIVE" ]; then
  git worktree remove --force "$LIVE" 2>/dev/null || stop "could not retire prior live worktree"
fi
git worktree add --detach "$LIVE" "$TARGET" >/dev/null
cd "$LIVE"

echo "=== STICKY BOOT ==="
for f in AGENTS.md docs/POSE_LAB_CAMPAIGN_RULES.md docs/POSE_IS_GOD.md "$CONTRACT"; do
  [ -s "$f" ] || stop "missing required rule/contract: $f"
  cat "$f" >/dev/null
  echo "READ=$f"
done

echo "=== ATTACK CONTRACT ==="
grep -Fq '"rootMotion": {' "$CONTRACT" || stop "no-root-motion contract missing"
grep -Fq '"enabled": false' "$CONTRACT" || stop "root motion is not explicitly disabled"
grep -Fq '"revision": "e89c2adf671b06af4ce6a6c1d3f0118e68a6c274"' "$CONTRACT" || stop "SecurityTitan timing authority drifted"
grep -Fq '"sourceByteSha256": "2a9ee9cc38a4b695d9a561bdce08eab71671de261fcae9e07b1f6a44f55f6f91"' "$MANIFEST" || stop "Swarmling source identity changed"

node "$TEST"
node --check "$PREVIEW"
node --check "$SHELL"
npm run test:2d
npm run build
npm run smoke
git diff --check

probe(){
  local base="$1"
  curl -fsS "$base/motion.html?rev=$TARGET" | grep -Fq "Motion Profile Lab" &&
  curl -fsS "$base/$PREVIEW?rev=$TARGET" | grep -Fq "Missing Swarmling animation" &&
  curl -fsS "$base/$SERVED_MANIFEST?rev=$TARGET" | grep -Fq '"scythe-bloom"'
}

PORT="$(python3 - <<'PY'
import socket
s=socket.socket()
s.bind(('127.0.0.1',0))
print(s.getsockname()[1])
s.close()
PY
)"
[ -n "$PORT" ] || stop "failed to allocate free review port"

BASE="http://127.0.0.1:$PORT"
LOG="$STATE/server-$PORT.log"
python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$LIVE/dist" >"$LOG" 2>&1 &
PID=$!
echo "$PID" >"$STATE/server.pid"

READY=0
for _ in $(seq 1 40); do
  if ! kill -0 "$PID" 2>/dev/null; then
    cat "$LOG" >&2 || true
    stop "exact review server exited"
  fi
  if probe "$BASE"; then
    READY=1
    break
  fi
  sleep .1
done
[ "$READY" = 1 ] || {
  cat "$LOG" >&2 || true
  stop "exact review server did not become ready"
}
echo "SERVER=STARTED_EXACT PORT=$PORT PID=$PID"

STAMP="$(date +%s)"
JAB="$BASE/motion.html?procedural=swarmling-jab&rev=$TARGET&nocache=$STAMP"
RAKE="$BASE/motion.html?procedural=swarmling-rake&rev=$TARGET&nocache=$STAMP"
BLOOM="$BASE/motion.html?procedural=swarmling-scythe-bloom&rev=$TARGET&nocache=$STAMP"

echo "=== REVIEW ==="
echo "JAB=$JAB"
echo "RAKE=$RAKE"
echo "SCYTHE_BLOOM=$BLOOM"
echo "ROOT_MOTION=OFF"
echo "HUMAN_VERDICT=PENDING"

termux-open-url "$JAB" >/dev/null 2>&1 || true
