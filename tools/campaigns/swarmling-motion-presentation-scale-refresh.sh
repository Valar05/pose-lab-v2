#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export PAGER=cat GIT_PAGER=cat

ROOT="/storage/emulated/0/Documents/GodotProjects/pose-lab-v2"
TARGET="e226e7dbf8800dc2319312aa19369cef94b8ab04"
CONTRACT="campaigns/swarmling-motion-presentation-scale.contract.json"
PREVIEW="src/procedural-swarmling-preview.js"
RUN="public/assets/vanguard/fleshpunk/characters/swarmling/animations.json"
STATE="$HOME/.local/state/pose-lab-v2-vanguard-live"
LIVE="$STATE/worktree"

stop(){ echo "STOP: $*" >&2; exit 1; }

cd "$ROOT"
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

grep -Fq "const presentationScale=1.5;" "$PREVIEW" || stop "Swarmling 1.5x presentation scale missing"
grep -Fq '"sourceByteSha256": "2a9ee9cc38a4b695d9a561bdce08eab71671de261fcae9e07b1f6a44f55f6f91"' "$RUN" || stop "accepted Swarmling source identity changed"

node --check "$PREVIEW"
npm run build
npm run smoke
git diff --check

probe(){
  curl -fsS "$1/src/procedural-swarmling-preview.js?rev=$TARGET" | grep -Fq "const presentationScale=1.5;"
}
BASE=""
for PORT in 8766 8767 8768 8769 8770 8771 8772 8773 8774 8775; do
  U="http://127.0.0.1:$PORT"
  if probe "$U"; then BASE="$U"; break; fi
  python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$LIVE/dist" >"$STATE/server-$PORT.log" 2>&1 &
  PID=$!
  sleep 1
  if kill -0 "$PID" 2>/dev/null && probe "$U"; then
    BASE="$U"
    echo "$PID" >"$STATE/server.pid"
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
