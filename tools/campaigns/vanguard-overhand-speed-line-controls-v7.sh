#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export PAGER=cat GIT_PAGER=cat

ROOT="/storage/emulated/0/Documents/GodotProjects/pose-lab-v2"
CONTRACT="campaigns/vanguard-overhand-speed-line-controls-v7.contract.json"
HELPER="tools/campaigns/apply_vanguard_overhand_speed_line_controls_v7.py"
SELF="tools/campaigns/vanguard-overhand-speed-line-controls-v7.sh"
COMMON="tools/campaigns/campaign_common.sh"
RECIPE="public/assets/vanguard/procedural/overhand-strike.recipe.json"
RENDERER="src/procedural-motion-preview.js"
ASSET="public/assets/vanguard/procedural/vanguard-diorama-speed-lines.png"
TEST="tools/test_vanguard_overhand_speed_line_controls_v7.mjs"
RECEIPT="campaigns/vanguard-overhand-speed-line-controls-v7.receipt.json"
STATE="$HOME/.local/state/pose-lab-v2-vanguard-overhand-speed-line-controls-v7"
LIVE="$STATE/live"

stop(){ echo "STOP: $*" >&2; exit 1; }

[ -d "$ROOT/.git" ] || stop "Pose Lab checkout missing: $ROOT"
cd "$ROOT"

echo "=== PRIMARY WORKTREE READ-ONLY ==="
git status --short
git fetch origin main
SEALED="$(git rev-parse origin/main)"
echo "SEALED_REV=$SEALED"

for f in "$CONTRACT" "$HELPER" "$SELF" "$COMMON" "$RECIPE" "$RENDERER" "$ASSET" "$TEST"; do
  git cat-file -e "$SEALED:$f" || stop "sealed package missing: $f"
done

AUTHOR="$STATE/author-$SEALED"
mkdir -p "$STATE"
if [ -e "$AUTHOR" ]; then
  git worktree remove --force "$AUTHOR" >/dev/null 2>&1 || stop "could not retire stale author worktree"
fi
git worktree add --detach "$AUTHOR" "$SEALED" >/dev/null
cd "$AUTHOR"

source "$COMMON"

echo "=== FRAMEWORK V2 BOOT ==="
pose_campaign_boot "$AUTHOR" "$CONTRACT"

echo "=== MUTABLE SURFACE ==="
printf '%s\n' "$ASSET" "$RECIPE" "$RENDERER" "$RECEIPT"
echo "REQUESTED_DEFECT_1=RIGHT_EDGE_CROP"
echo "REQUESTED_DEFECT_2=POSITION_NOT_ACCEPTED"
echo "SLASH_CONTROLS=MUST_REMAIN"
echo "SPEED_LINE_CONTROLS=ADD_SEPARATELY"

echo "=== PACKAGE PREFLIGHT ==="
python3 -m py_compile "$HELPER" tools/campaigns/campaign_core.py
bash -n "$SELF"
bash -n "$COMMON"
node --check "$RENDERER"
node --check "$TEST"
python3 tools/test_pose_campaign_framework.py

echo "=== APPLY CROP FIX + ADDITIVE SPEED-LINE CONTROLS V7 ==="
python3 "$HELPER" "$AUTHOR" "$CONTRACT"

echo "=== FRAMEWORK VERIFY ==="
pose_campaign_check_worktree "$AUTHOR" "$CONTRACT"
pose_campaign_verify "$AUTHOR" "$CONTRACT"

echo "=== REGRESSION TESTS ==="
node "$TEST"
npm run test:campaign-framework
npm run test:2d
npm run build
npm run smoke
git diff --check

echo "=== STAGE IMPLEMENTATION ==="
pose_campaign_stage "$AUTHOR" "$CONTRACT" "$ASSET" "$RECIPE" "$RENDERER"
IMPLEMENTATION="$(pose_campaign_commit "$AUTHOR" "Fix Vanguard speed-line crop and add separate live controls" | tail -n1)"
echo "IMPLEMENTATION_REV=$IMPLEMENTATION"

echo "=== CREATE RECEIPT ==="
pose_campaign_write_receipt "$AUTHOR" "$CONTRACT" "$SEALED" "$IMPLEMENTATION" "" "" "repo-owned-framework-v2-campaign" "pending"
pose_campaign_stage "$AUTHOR" "$CONTRACT" "$RECEIPT"
FINAL="$(pose_campaign_commit "$AUTHOR" "Record Vanguard speed-line controls v7 receipt" | tail -n1)"
echo "FINAL_REV=$FINAL"

echo "=== PUSH + EXACT READBACK ==="
pose_campaign_push_and_readback "$AUTHOR" main "$FINAL"

echo "=== EXACT-REVISION LIVE WORKTREE ==="
if [ -e "$LIVE" ]; then
  git -C "$ROOT" worktree remove --force "$LIVE" >/dev/null 2>&1 || stop "could not retire stale live worktree"
fi
git -C "$ROOT" worktree add --detach "$LIVE" "$FINAL" >/dev/null
cd "$LIVE"

echo "=== FINAL REVISION TESTS ==="
python3 tools/campaigns/campaign_core.py --root "$LIVE" verify --contract "$CONTRACT"
node "$TEST"
npm run test:campaign-framework
npm run test:2d
npm run build
npm run smoke
git diff --check
[ -z "$(git status --porcelain)" ] || stop "final live worktree is dirty"
PIXEL_SHA="$(python3 - "$ASSET" <<'PY'
from PIL import Image
import hashlib,sys
im=Image.open(sys.argv[1]).convert("RGBA")
print(hashlib.sha256(im.tobytes()).hexdigest())
PY
)"
[ "$PIXEL_SHA" = "0675ecc1022145a893833f722e547a22bf73fa4c034c56db4bd9b9d2c678a448" ] || stop "crop-fixed speed-line pixel hash mismatch"

echo "=== START REVIEW SERVER ==="
PORT="$(pose_campaign_free_port)"
BASE="http://127.0.0.1:$PORT"
LOG="$STATE/server-$PORT.log"
python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$LIVE/dist" >"$LOG" 2>&1 &
PID=$!
pose_campaign_wait_http "$BASE/motion.html?rev=$FINAL" "$PID" "$LOG"

STAMP="$(date +%s)"
OVERHAND="$BASE/motion.html?procedural=vanguard-overhand-strike&rev=$FINAL&nocache=$STAMP"

echo "=== HUMAN REVIEW ==="
echo "FINAL_REV=$FINAL"
echo "OVERHAND=$OVERHAND"
echo "RIGHT_EDGE_CROP=FIXED"
echo "SPEED_LINE_ASSET=169x72"
echo "SLASH_CONTROLS=PRESERVED"
echo "SPEED_LINE_CONTROLS=SEPARATE_ADDITIVE_PANEL"
echo "SPEED_LINE_CONTROLS_FIELDS=X,Y,SCALE_X,SCALE_Y,ALPHA"
echo "SPEED_LINE_COPY_VALUES=AVAILABLE"
echo "TIMING=LOCKED_600MS"
echo "HANDOFF=LOCKED_310MS"
echo "SLASH=LOCKED"
echo "POSES=LOCKED"
echo "BLUR_ENVELOPE=LOCKED"
echo "HUMAN_VERDICT=PENDING"

termux-open-url "$OVERHAND" >/dev/null 2>&1 || true
