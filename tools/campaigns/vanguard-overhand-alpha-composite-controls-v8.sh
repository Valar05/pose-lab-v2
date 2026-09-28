#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export PAGER=cat GIT_PAGER=cat

ROOT="/storage/emulated/0/Documents/GodotProjects/pose-lab-v2"
CONTRACT="campaigns/vanguard-overhand-alpha-composite-controls-v8.contract.json"
HELPER="tools/campaigns/apply_vanguard_overhand_alpha_composite_controls_v8.py"
SELF="tools/campaigns/vanguard-overhand-alpha-composite-controls-v8.sh"
COMMON="tools/campaigns/campaign_common.sh"
RECIPE="public/assets/vanguard/procedural/overhand-strike.recipe.json"
RENDERER="src/procedural-motion-preview.js"
ASSET="public/assets/vanguard/procedural/vanguard-diorama-speed-lines.png"
TEST="tools/test_vanguard_overhand_alpha_composite_controls_v8.mjs"
RECEIPT="campaigns/vanguard-overhand-alpha-composite-controls-v8.receipt.json"
STATE="$HOME/.local/state/pose-lab-v2-vanguard-overhand-alpha-composite-controls-v8"
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
printf '%s\n' "$RECIPE" "$RENDERER" "$RECEIPT"
echo "ROOT_CAUSE=OPAQUE_BLACK_BODY_CARD"
echo "SPEED_LINE_ASSET=LOCKED_CURRENT_GIT_BYTES"
echo "SLASH_CONTROLS=MUST_REMAIN"
echo "SPEED_LINE_CONTROLS=ADD_SEPARATELY"

echo "=== PACKAGE PREFLIGHT ==="
python3 -m py_compile "$HELPER" tools/campaigns/campaign_core.py
bash -n "$SELF"
bash -n "$COMMON"
node --check "$RENDERER"
node --check "$TEST"
python3 tools/test_pose_campaign_framework.py

echo "=== APPLY ALPHA COMPOSITE FIX + ADDITIVE SPEED-LINE CONTROLS V8 ==="
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
pose_campaign_stage "$AUTHOR" "$CONTRACT" "$RECIPE" "$RENDERER"
IMPLEMENTATION="$(pose_campaign_commit "$AUTHOR" "Fix Vanguard Overhand alpha compositing and add separate speed-line controls" | tail -n1)"
echo "IMPLEMENTATION_REV=$IMPLEMENTATION"

echo "=== CREATE RECEIPT ==="
pose_campaign_write_receipt "$AUTHOR" "$CONTRACT" "$SEALED" "$IMPLEMENTATION" "" "" "repo-owned-framework-v2-campaign" "pending"
pose_campaign_stage "$AUTHOR" "$CONTRACT" "$RECEIPT"
FINAL="$(pose_campaign_commit "$AUTHOR" "Record Vanguard Overhand alpha-composite controls v8 receipt" | tail -n1)"
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
[ "$(sha256sum "$ASSET" | awk '{print $1}')" = "0ffcd220e8688e74387235305ca82853fc80dad5e7212f5c99b69d42d70cb0fa" ] || stop "speed-line asset bytes changed"

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
echo "BODY_ALPHA_FIX=BLACK_BORDER_KEY_OVERHAND_ONLY"
echo "SPEED_LINE_ASSET=UNCHANGED_157x72"
echo "SLASH_CONTROLS=PRESERVED"
echo "SPEED_LINE_CONTROLS=SEPARATE_ADDITIVE_PANEL"
echo "SPEED_LINE_CONTROLS_FIELDS=X,Y,SCALE_X,SCALE_Y,ALPHA"
echo "TIMING=LOCKED_600MS"
echo "HANDOFF=LOCKED_310MS"
echo "SLASH=LOCKED"
echo "POSES=LOCKED"
echo "BLUR_ENVELOPE=LOCKED"
echo "HUMAN_VERDICT=PENDING"

termux-open-url "$OVERHAND" >/dev/null 2>&1 || true
