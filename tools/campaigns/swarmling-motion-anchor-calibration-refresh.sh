#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export PAGER=cat GIT_PAGER=cat

ROOT="/storage/emulated/0/Documents/GodotProjects/pose-lab-v2"
TARGET="bf7c8f1d04a5f829bb669b41621996b49cb26719"
CONTRACT="campaigns/swarmling-motion-anchor-calibration.contract.json"
PREVIEW="src/procedural-swarmling-preview.js"
RUN="public/assets/vanguard/fleshpunk/characters/swarmling/animations.json"
STATE="$HOME/.local/state/pose-lab-v2-vanguard-live"
LIVE="$STATE/worktree"

stop(){ echo "STOP: $*" >&2; exit 1; }

cd "$ROOT"
git status --short
git fetch origin main
git cat-file -e "$TARGET^{commit}" || stop "target revision unavailable"

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

grep -Fq "const presentationScale=1.5;" "$PREVIEW" || stop "1.5x presentation scale missing"
grep -Fq "const frameAnchors=[" "$PREVIEW" || stop "fixed run anchors missing"
grep -Fq "const anchorX=220,anchorY=226;" "$PREVIEW" || stop "canonical motion anchor missing"
grep -Fq '"sourceByteSha256": "2a9ee9cc38a4b695d9a561bdce08eab71671de261fcae9e07b1f6a44f55f6f91"' "$RUN" || stop "accepted Swarmling source identity changed"

node --check "$PREVIEW"
npm run test:2d
npm run build
npm run smoke
git diff --check

probe(){
  local base="$1"
  curl -fsS "$base/src/procedural-swarmling-preview.js?rev=$TARGET" | grep -Fq "const frameAnchors=["
}

BASE=""
for PORT in 8766 8767 8768 8769 8770 8771 8772 8773 8774 8775; do
  C="http://127.0.0.1:$PORT"
  if probe "$C"; then
    BASE="$C"
    break
  fi
  python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$LIVE/dist" >"$STATE/server-$PORT.log" 2>&1 &
  PID=$!
  sleep 1
  if kill -0 "$PID" 2>/dev/null && probe "$C"; then
    echo "$PID" >"$STATE/server.pid"
    BASE="$C"
    break
  fi
  kill "$PID" 2>/dev/null || true
done
[ -n "$BASE" ] || stop "exact review server unavailable"

URL="$BASE/motion.html?procedural=swarmling-run&rev=$TARGET&nocache=$(date +%s)"
echo "TARGET_REV=$TARGET"
echo "REVIEW=$URL"
echo "HUMAN_VERDICT=PENDING"
termux-open-url "$URL" >/dev/null 2>&1 || true
