#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export PAGER=cat GIT_PAGER=cat

ROOT="/storage/emulated/0/Documents/GodotProjects/pose-lab-v2"
TARGET="340c6810b0aa010b5ceca5bbc8cdbba22bf16771"
CONTRACT="campaigns/swarmling-planted-attacks-v5.contract.json"
MANIFEST="public/assets/vanguard/fleshpunk/characters/swarmling/animations.json"
SERVED_MANIFEST="${MANIFEST#public/}"
PREVIEW="src/procedural-swarmling-preview.js"
SHELL="src/procedural-review-shell.js"
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

echo "=== V5 MATERIAL CHANGE ==="
grep -Fq '"jab":[8,17]' "$CONTRACT" || stop "Jab source pose change missing"
grep -Fq '"rake":[9,10]' "$CONTRACT" || stop "Rake source pose change missing"
grep -Fq '"scytheBloom":[11,15,16]' "$CONTRACT" || stop "Scythe Bloom source pose contract missing"
grep -Fq '"rotateDeg"' "$CONTRACT" || stop "planted-foot rotation contract missing"
grep -Fq '"enabled":false' "$CONTRACT" || stop "root motion is not disabled"
grep -Fq "rotateDeg:lerp(" "$PREVIEW" || stop "rotation interpolation missing"
grep -Fq "ctx.rotate((d.rotateDeg||0)*Math.PI/180)" "$PREVIEW" || stop "planted-foot rotation draw missing"

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
  curl -fsS "$base/$PREVIEW?rev=$TARGET" | grep -Fq "rotateDeg:lerp(" &&
  curl -fsS "$base/$SERVED_MANIFEST?rev=$TARGET" | grep -Fq '"sourceCell": 17'
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

STAMP="$(date +%s)"
JAB="$BASE/motion.html?procedural=swarmling-jab&rev=$TARGET&nocache=$STAMP"
RAKE="$BASE/motion.html?procedural=swarmling-rake&rev=$TARGET&nocache=$STAMP"
BLOOM="$BASE/motion.html?procedural=swarmling-scythe-bloom&rev=$TARGET&nocache=$STAMP"

echo "=== REVIEW ==="
echo "JAB=$JAB"
echo "RAKE=$RAKE"
echo "SCYTHE_BLOOM=$BLOOM"
echo "ROOT_MOTION=OFF"
echo "POSE_CHOICES=MATERIALLY_CHANGED"
echo "PROCEDURAL_ROTATION=ON"
echo "HUMAN_VERDICT=PENDING"

termux-open-url "$JAB" >/dev/null 2>&1 || true
