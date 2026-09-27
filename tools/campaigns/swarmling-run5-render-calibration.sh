#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export PAGER=cat GIT_PAGER=cat

ROOT="/storage/emulated/0/Documents/GodotProjects/pose-lab-v2"
CONTRACT="campaigns/swarmling-run5-render-calibration.contract.json"
HELPER="tools/campaigns/apply_swarmling_run5_render_calibration.py"
SELF="tools/campaigns/swarmling-run5-render-calibration.sh"
ASSET_ROOT="public/assets/vanguard/fleshpunk/characters/swarmling"
ATLAS="$ASSET_ROOT/source/swarmling-approved-atlas.png"
MANIFEST="$ASSET_ROOT/animations.json"
PREVIEW="src/procedural-swarmling-preview.js"
TEST="tools/test_swarmling_attacks.mjs"
RECEIPT="campaigns/swarmling-run5-render-calibration.receipt.json"
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

AUTHOR="$STATE/swarmling-run5-render-$SEALED"
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

echo "=== APPLY RENDER CALIBRATION ==="
python3 "$HELPER" "$ATLAS" "$MANIFEST" "$ASSET_ROOT"

echo "=== VERIFY ==="
python3 - "$CONTRACT" "$MANIFEST" "$PREVIEW" <<'PY'
from pathlib import Path
import json,sys
contract=json.loads(Path(sys.argv[1]).read_text())
manifest=json.loads(Path(sys.argv[2]).read_text())
preview=Path(sys.argv[3]).read_text()
if contract.get("evidence",{}).get("renderedRun4HeightPx") != 99:
    raise SystemExit("STOP: render target contract missing")
jab=next((a for a in manifest.get("animations",[]) if a.get("id")=="jab"),None)
if not jab or len(jab.get("frames",[]))<2 or jab["frames"][1].get("sourceCell") != 15:
    raise SystemExit("STOP: Needle Jab impact cell 15 changed")
if "const presentationScale=1.5;" not in preview:
    raise SystemExit("STOP: presentation scale changed")
print("contract_and_lock_check=PASS")
PY
node "$TEST"
node --check "$PREVIEW"
npm run test:2d
npm run build
npm run smoke
git diff --check

echo "=== STAGE IMPLEMENTATION ==="
git add "$ATLAS" "$ASSET_ROOT/run/frames/run_0004.png" "$ASSET_ROOT/run/contact-sheet.png" "$MANIFEST"

for p in $(git diff --cached --name-only); do
  case "$p" in
    "$ATLAS"|"$ASSET_ROOT/run/frames/run_0004.png"|"$ASSET_ROOT/run/contact-sheet.png"|"$MANIFEST") ;;
    *) stop "unauthorized staged path: $p" ;;
  esac
done

git config user.name "Pose Lab Campaign"
git config user.email "pose-lab-campaign@localhost"
git commit -m "Calibrate Swarmling run frame 5 to rendered peer size"
IMPLEMENTATION="$(git rev-parse HEAD)"

echo "=== CREATE RECEIPT ==="
python3 - "$RECEIPT" "$SEALED" "$IMPLEMENTATION" <<'PY'
from pathlib import Path
import json,sys
Path(sys.argv[1]).write_text(json.dumps({
  "schema":"pose-lab-v2-campaign-receipt-v1",
  "campaign":"swarmling-run5-render-calibration-v1",
  "status":"implemented-awaiting-human-review",
  "sealedRevision":sys.argv[2],
  "implementationRevision":sys.argv[3],
  "renderedBeforePx":83,
  "renderedTargetPx":99,
  "scaleFromCurrent":99/83,
  "locksPreserved":{
    "needleJabImpactCell":15,
    "presentationScale":1.5,
    "rootMotion":False,
    "runAnchorsUnchanged":True
  },
  "humanVerdict":"pending"
},indent=2)+"\n")
PY

git add "$RECEIPT"
git commit -m "Record Swarmling run-5 rendered calibration receipt"
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
echo "RUN5_RENDER_TARGET_PX=99"
echo "RUN5_SCALE_FROM_CURRENT=1.1927710843373494"
echo "RUN_ANCHORS=UNCHANGED"
echo "JAB_IMPACT_CELL=15"
echo "ROOT_MOTION=OFF"
echo "HUMAN_VERDICT=PENDING"

termux-open-url "$RUN" >/dev/null 2>&1 || true
