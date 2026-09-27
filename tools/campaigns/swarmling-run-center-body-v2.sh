#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export PAGER=cat GIT_PAGER=cat

ROOT="/storage/emulated/0/Documents/GodotProjects/pose-lab-v2"
CONTRACT="campaigns/swarmling-run-center-body-v2.contract.json"
HELPER="tools/campaigns/apply_swarmling_run_center_body_v2.py"
SELF="tools/campaigns/swarmling-run-center-body-v2.sh"
ASSET_ROOT="public/assets/vanguard/fleshpunk/characters/swarmling"
ATLAS="$ASSET_ROOT/source/swarmling-approved-atlas.png"
MANIFEST="$ASSET_ROOT/animations.json"
PREVIEW="src/procedural-swarmling-preview.js"
TEST="tools/test_swarmling_attacks.mjs"
RECEIPT="campaigns/swarmling-run-center-body-v2.receipt.json"
STATE="$HOME/.local/state/pose-lab-v2-vanguard-live"
LIVE="$STATE/worktree"

stop(){ echo "STOP: $*" >&2; exit 1; }

cd "$ROOT"
echo "=== PRIMARY WORKTREE READ-ONLY ==="
git status --short
git fetch origin main
SEALED="$(git rev-parse origin/main)"

for f in "$CONTRACT" "$HELPER" "$SELF"; do
  git cat-file -e "$SEALED:$f" || stop "sealed package missing: $f"
done

AUTHOR="$STATE/swarmling-run-center-v2-$SEALED"
mkdir -p "$STATE"
if [ -e "$AUTHOR" ]; then
  git worktree remove --force "$AUTHOR" 2>/dev/null || stop "could not retire stale author worktree"
fi
git worktree add --detach "$AUTHOR" "$SEALED" >/dev/null
cd "$AUTHOR"

echo "=== STICKY BOOT ==="
for f in AGENTS.md docs/POSE_LAB_CAMPAIGN_RULES.md docs/POSE_IS_GOD.md "$CONTRACT"; do
  [ -s "$f" ] || stop "missing required rule/contract: $f"
  cat "$f" >/dev/null
  echo "READ=$f"
done

echo "=== APPLY ==="
python3 "$HELPER" "$ATLAS" "$MANIFEST" "$PREVIEW" "$TEST"

echo "=== VERIFY ==="
grep -Fq 'const presentationScale=1.5;' "$PREVIEW" || stop "presentation scale changed"
node "$TEST"
node --check "$PREVIEW"
npm run test:2d
npm run build
npm run smoke
git diff --check

echo "=== STAGE IMPLEMENTATION ==="
git add "$MANIFEST" "$PREVIEW" "$TEST"
for p in $(git diff --cached --name-only); do
  case "$p" in
    "$MANIFEST"|"$PREVIEW"|"$TEST") ;;
    *) stop "unauthorized staged path: $p" ;;
  esac
done

git config user.name "Pose Lab Campaign"
git config user.email "pose-lab-campaign@localhost"
git commit -m "Center Swarmling run body placement"
IMPLEMENTATION="$(git rev-parse HEAD)"

echo "=== CREATE RECEIPT ==="
python3 - "$RECEIPT" "$SEALED" "$IMPLEMENTATION" <<'PY'
from pathlib import Path
import json,sys
Path(sys.argv[1]).write_text(json.dumps({
  "schema":"pose-lab-v2-campaign-receipt-v1",
  "campaign":"swarmling-run-center-body-v2",
  "status":"implemented-awaiting-human-review",
  "sealedRevision":sys.argv[2],
  "implementationRevision":sys.argv[3],
  "summary":{
    "run":"body-center X plus ground Y on all six frames",
    "needleJab":"impact cell 15 preserved"
  },
  "rootMotion":False,
  "presentationScale":1.5,
  "humanVerdict":"pending"
},indent=2)+"\n")
PY

git add "$RECEIPT"
git commit -m "Record Swarmling run centering v2 receipt"
FINAL="$(git rev-parse HEAD)"

echo "=== PUSH + READBACK ==="
git push origin "HEAD:main"
git fetch origin main
[ "$(git rev-parse origin/main)" = "$FINAL" ] || stop "origin/main readback mismatch"

if [ -d "$LIVE" ]; then
  git -C "$ROOT" worktree remove --force "$LIVE" 2>/dev/null || stop "could not retire stale live worktree"
fi
git -C "$ROOT" worktree add --detach "$LIVE" "$FINAL" >/dev/null
cd "$LIVE"

node "$TEST"
node --check "$PREVIEW"
npm run test:2d
npm run build
npm run smoke

PORT="$(python3 - <<'PY'
import socket
s=socket.socket()
s.bind(('127.0.0.1',0))
print(s.getsockname()[1])
s.close()
PY
)"
[ -n "$PORT" ] || stop "failed to allocate review port"

BASE="http://127.0.0.1:$PORT"
LOG="$STATE/server-$PORT.log"
python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$LIVE/dist" >"$LOG" 2>&1 &
PID=$!

READY=0
for _ in $(seq 1 50); do
  if ! kill -0 "$PID" 2>/dev/null; then
    cat "$LOG" >&2 || true
    stop "review server exited"
  fi
  if curl -fsS "$BASE/motion.html?rev=$FINAL" >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep .1
done
[ "$READY" = 1 ] || stop "review server did not come up"

STAMP="$(date +%s)"
RUN="$BASE/motion.html?procedural=swarmling-run&rev=$FINAL&nocache=$STAMP"
JAB="$BASE/motion.html?procedural=swarmling-jab&rev=$FINAL&nocache=$STAMP"
RAKE="$BASE/motion.html?procedural=swarmling-rake&rev=$FINAL&nocache=$STAMP"
BLOOM="$BASE/motion.html?procedural=swarmling-scythe-bloom&rev=$FINAL&nocache=$STAMP"

echo "=== REVIEW ==="
echo "FINAL_REV=$FINAL"
echo "RUN=$RUN"
echo "JAB=$JAB"
echo "RAKE=$RAKE"
echo "SCYTHE_BLOOM=$BLOOM"
echo "RUN_PINNING=BODY_CENTER_X_GROUND_Y"
echo "JAB_IMPACT_CELL=15"
echo "ROOT_MOTION=OFF"
echo "HUMAN_VERDICT=PENDING"

termux-open-url "$RUN" >/dev/null 2>&1 || true
