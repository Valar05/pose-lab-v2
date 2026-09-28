#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export PAGER=cat GIT_PAGER=cat

ROOT="/storage/emulated/0/Documents/GodotProjects/pose-lab-v2"
CONTRACT="campaigns/swarmling-run5-size-normalization.contract.json"
HELPER="tools/campaigns/apply_swarmling_run5_size_normalization.py"
SELF="tools/campaigns/swarmling-run5-size-normalization.sh"
ASSET_ROOT="public/assets/vanguard/fleshpunk/characters/swarmling"
ATLAS="$ASSET_ROOT/source/swarmling-approved-atlas.png"
MANIFEST="$ASSET_ROOT/animations.json"
PREVIEW="src/procedural-swarmling-preview.js"
TEST="tools/test_swarmling_attacks.mjs"
RECEIPT="campaigns/swarmling-run5-size-normalization.receipt.json"
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

AUTHOR="$STATE/swarmling-run5-size-$SEALED"
mkdir -p "$STATE"
if [ -e "$AUTHOR" ]; then
  git worktree remove --force "$AUTHOR" 2>/dev/null || stop "stale author worktree"
fi
git worktree add --detach "$AUTHOR" "$SEALED" >/dev/null
cd "$AUTHOR"

echo "=== STICKY BOOT ==="
for f in AGENTS.md docs/POSE_LAB_CAMPAIGN_RULES.md docs/POSE_IS_GOD.md "$CONTRACT"; do
  [ -s "$f" ] || stop "missing required rule/contract: $f"
  cat "$f" >/dev/null
  echo "READ=$f"
done

echo "=== APPLY RUN-5 NORMALIZATION ==="\necho "GUARD_MATCH=STRUCTURAL_V2"
python3 "$HELPER" "$ATLAS" "$MANIFEST" "$PREVIEW" "$TEST" "$ASSET_ROOT"

echo "=== VERIFY ==="
grep -Fq 'const presentationScale=1.5;' "$PREVIEW" || stop "presentation scale changed"
grep -Fq '"sourceCell": 15' "$MANIFEST" || stop "Needle Jab impact cell 15 changed"
node "$TEST"
node --check "$PREVIEW"
npm run test:2d
npm run build
npm run smoke
git diff --check

echo "=== STAGE IMPLEMENTATION ==="
git add "$ATLAS" "$ASSET_ROOT/run" "$MANIFEST" "$PREVIEW" "$TEST"
for p in $(git diff --cached --name-only); do
  case "$p" in
    "$ATLAS"|"$ASSET_ROOT"/run/*|"$MANIFEST"|"$PREVIEW"|"$TEST") ;;
    *) stop "unauthorized staged path: $p" ;;
  esac
done

git config user.name "Pose Lab Campaign"
git config user.email "pose-lab-campaign@localhost"
git commit -m "Normalize Swarmling run frame 5 size"
IMPLEMENTATION="$(git rev-parse HEAD)"

echo "=== CREATE RECEIPT ==="
python3 - "$RECEIPT" "$SEALED" "$IMPLEMENTATION" <<'PY'
from pathlib import Path
import json,sys
Path(sys.argv[1]).write_text(json.dumps({
  "schema":"pose-lab-v2-campaign-receipt-v1",
  "campaign":"swarmling-run5-size-normalization-v1",
  "status":"implemented-awaiting-human-review",
  "sealedRevision":sys.argv[2],
  "implementationRevision":sys.argv[3],
  "run5":{"oldVisibleHeightPx":40,"targetVisibleHeightPx":46,"scale":1.15},
  "locksPreserved":{"needleJabImpactCell":15,"presentationScale":1.5,"rootMotion":False},
  "humanVerdict":"pending"
},indent=2)+"\n")
PY

git add "$RECEIPT"
git commit -m "Record Swarmling run-5 normalization receipt"
FINAL="$(git rev-parse HEAD)"

echo "=== PUSH + READBACK ==="
git push origin "HEAD:main"
git fetch origin main
[ "$(git rev-parse origin/main)" = "$FINAL" ] || stop "origin/main readback mismatch"

if [ -d "$LIVE" ]; then
  git -C "$ROOT" worktree remove --force "$LIVE" 2>/dev/null || stop "stale live worktree"
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
BASE="http://127.0.0.1:$PORT"
LOG="$STATE/server-$PORT.log"
python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$LIVE/dist" >"$LOG" 2>&1 &
PID=$!

READY=0
for _ in $(seq 1 50); do
  if ! kill -0 "$PID" 2>/dev/null; then cat "$LOG" >&2 || true; stop "review server exited"; fi
  if curl -fsS "$BASE/motion.html?rev=$FINAL" >/dev/null 2>&1; then READY=1; break; fi
  sleep .1
done
[ "$READY" = 1 ] || stop "review server not ready"

STAMP="$(date +%s)"
RUN="$BASE/motion.html?procedural=swarmling-run&rev=$FINAL&nocache=$STAMP"

echo "=== REVIEW ==="
echo "FINAL_REV=$FINAL"
echo "RUN=$RUN"
echo "RUN5_HEIGHT=46"
echo "RUN5_SCALE=1.15"
echo "JAB_IMPACT_CELL=15"
echo "ROOT_MOTION=OFF"
echo "HUMAN_VERDICT=PENDING"

termux-open-url "$RUN" >/dev/null 2>&1 || true
