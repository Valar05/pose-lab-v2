#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export PAGER=cat GIT_PAGER=cat

ROOT="/storage/emulated/0/Documents/GodotProjects/pose-lab-v2"
CONTRACT="campaigns/swarmling-run-row-uniform-scale.contract.json"
HELPER="tools/campaigns/apply_swarmling_run_row_uniform_scale.py"
SELF="tools/campaigns/swarmling-run-row-uniform-scale.sh"
ASSET_ROOT="public/assets/vanguard/fleshpunk/characters/swarmling"
ATLAS="$ASSET_ROOT/source/swarmling-approved-atlas.png"
MANIFEST="$ASSET_ROOT/animations.json"
PREVIEW="src/procedural-swarmling-preview.js"
TEST="tools/test_swarmling_attacks.mjs"
RECEIPT="campaigns/swarmling-run-row-uniform-scale.receipt.json"
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

AUTHOR="$STATE/swarmling-run-row-uniform-$SEALED"
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

echo "=== APPLY UNIFORM RUN ROW ==="
python3 "$HELPER" "$ATLAS" "$MANIFEST" "$PREVIEW" "$TEST" "$ASSET_ROOT"

echo "=== VERIFY ==="
python3 - "$MANIFEST" "$PREVIEW" <<'PY'
from pathlib import Path
import json,sys
m=json.loads(Path(sys.argv[1]).read_text())
p=Path(sys.argv[2]).read_text()
run=next(a for a in m["animations"] if a["id"]=="run")
anchors=[f["anchorPoint"] for f in run["frames"]]
if anchors != [[128,249]]*6:
    raise SystemExit(f"STOP: Run anchors not uniform: {anchors}")
if run.get("pinAuthority",{}).get("mode")!="physical-body-core-centered-source":
    raise SystemExit("STOP: Run physical centering authority missing")
jab=next(a for a in m["animations"] if a["id"]=="jab")
if jab["frames"][1]["sourceCell"]!=15:
    raise SystemExit("STOP: Needle Jab impact changed")
if "const presentationScale=1.5;" not in p:
    raise SystemExit("STOP: presentation scale changed")
print("uniform_run_lock_check=PASS")
PY

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
git commit -m "Rebuild Swarmling Run row at one scale"
IMPLEMENTATION="$(git rev-parse HEAD)"

echo "=== CREATE RECEIPT ==="
python3 - "$RECEIPT" "$SEALED" "$IMPLEMENTATION" "$MANIFEST" <<'PY'
from pathlib import Path
import json,sys
m=json.loads(Path(sys.argv[4]).read_text())
Path(sys.argv[1]).write_text(json.dumps({
  "schema":"pose-lab-v2-campaign-receipt-v1",
  "campaign":"swarmling-run-row-uniform-scale-v1",
  "status":"implemented-awaiting-human-review",
  "sealedRevision":sys.argv[2],
  "implementationRevision":sys.argv[3],
  "sourceAtlasSha256":m["authority"]["sourceByteSha256"],
  "targetRunHeightsPx":[45,45,46,46,45,46],
  "runAnchors":[[128,249],[128,249],[128,249],[128,249],[128,249],[128,249]],
  "needleJabImpactCell":15,
  "rootMotion":False,
  "humanVerdict":"pending"
},indent=2)+"\n")
PY

git add "$RECEIPT"
git commit -m "Record uniform Swarmling Run-row receipt"
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
s=socket.socket(); s.bind(('127.0.0.1',0)); print(s.getsockname()[1]); s.close()
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
echo "RUN_SCALE=UNIFORM"
echo "RUN_TARGET_HEIGHTS=[45,45,46,46,45,46]"
echo "RUN_ANCHORS=[[128,249],[128,249],[128,249],[128,249],[128,249],[128,249]]"
echo "JAB_IMPACT_CELL=15"
echo "ROOT_MOTION=OFF"
echo "HUMAN_VERDICT=PENDING"

termux-open-url "$RUN" >/dev/null 2>&1 || true
