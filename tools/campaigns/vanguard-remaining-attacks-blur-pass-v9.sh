#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export PAGER=cat GIT_PAGER=cat

ROOT="/storage/emulated/0/Documents/GodotProjects/pose-lab-v2"
CONTRACT="campaigns/vanguard-remaining-attacks-blur-pass-v9.contract.json"
HELPER="tools/campaigns/apply_vanguard_remaining_attacks_blur_pass_v9.py"
SELF="tools/campaigns/vanguard-remaining-attacks-blur-pass-v9.sh"
COMMON="tools/campaigns/campaign_common.sh"
TEST="tools/test_vanguard_remaining_attacks_blur_pass_v9.mjs"
RECEIPT="campaigns/vanguard-remaining-attacks-blur-pass-v9.receipt.json"
STATE="$HOME/.local/state/pose-lab-v2-vanguard-remaining-attacks-blur-pass-v9"
LIVE="$STATE/live"

MUTABLE=(
  "public/assets/vanguard/procedural/overhand-strike.recipe.json"
  "public/assets/vanguard/procedural/undercut-strike.recipe.json"
  "public/assets/vanguard/procedural/attack2-uppercut.recipe.json"
  "public/assets/vanguard/procedural/horizontal-strike.recipe.json"
  "public/assets/vanguard/procedural/attack5.recipe.json"
)

stop(){ echo "STOP: $*" >&2; exit 1; }

[ -d "$ROOT/.git" ] || stop "Pose Lab checkout missing: $ROOT"
cd "$ROOT"

echo "=== PRIMARY WORKTREE READ-ONLY ==="
git status --short
git fetch origin main
SEALED="$(git rev-parse origin/main)"
echo "SEALED_REV=$SEALED"

for f in "$CONTRACT" "$HELPER" "$SELF" "$COMMON" "$TEST" "${MUTABLE[@]}"; do
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
printf '%s\n' "${MUTABLE[@]}" "$RECEIPT"
echo "OVERHAND_SPEED_LINES=REMOVE"
echo "REMAINING_ATTACKS=BLUR_ONLY"
echo "TIMING=LOCKED_PER_ATTACK"
echo "POSES=LOCKED"
echo "EFFECTS=LOCKED"

echo "=== PACKAGE PREFLIGHT ==="
python3 -m py_compile "$HELPER" tools/campaigns/campaign_core.py
bash -n "$SELF"
bash -n "$COMMON"
node --check "$TEST"
python3 tools/test_pose_campaign_framework.py

echo "=== APPLY FAMILY BLUR PASS V9 ==="
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
pose_campaign_stage "$AUTHOR" "$CONTRACT" "${MUTABLE[@]}"
IMPLEMENTATION="$(pose_campaign_commit "$AUTHOR" "Apply Vanguard blur treatment across remaining normal attacks" | tail -n1)"
echo "IMPLEMENTATION_REV=$IMPLEMENTATION"

echo "=== CREATE RECEIPT ==="
pose_campaign_write_receipt "$AUTHOR" "$CONTRACT" "$SEALED" "$IMPLEMENTATION" "" "" "repo-owned-framework-v2-campaign" "pending"
pose_campaign_stage "$AUTHOR" "$CONTRACT" "$RECEIPT"
FINAL="$(pose_campaign_commit "$AUTHOR" "Record Vanguard remaining-attacks blur pass v9 receipt" | tail -n1)"
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

echo "=== START REVIEW SERVER ==="
PORT="$(pose_campaign_free_port)"
BASE="http://127.0.0.1:$PORT"
LOG="$STATE/server-$PORT.log"
python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$LIVE/dist" >"$LOG" 2>&1 &
PID=$!
pose_campaign_wait_http "$BASE/motion.html?rev=$FINAL" "$PID" "$LOG"

STAMP="$(date +%s)"
echo "=== HUMAN REVIEW ==="
echo "FINAL_REV=$FINAL"
echo "OVERHAND=$BASE/motion.html?procedural=vanguard-overhand-strike&rev=$FINAL&nocache=$STAMP"
echo "UNDERCUT=$BASE/motion.html?procedural=vanguard-undercut-strike&rev=$FINAL&nocache=$STAMP"
echo "UPPERCUT=$BASE/motion.html?procedural=vanguard-attack2-uppercut&rev=$FINAL&nocache=$STAMP"
echo "HORIZONTAL=$BASE/motion.html?procedural=vanguard-horizontal-strike&rev=$FINAL&nocache=$STAMP"
echo "HALBERD_JAB=$BASE/motion.html?procedural=vanguard-attack5&rev=$FINAL&nocache=$STAMP"
echo "OVERHAND_SPEED_LINES=REMOVED"
echo "TIMING=UNCHANGED_FOR_REMAINING_ATTACKS"
echo "BODY_BLUR=ADDED_TO_REMAINING_ATTACKS"
echo "HUMAN_VERDICT=PENDING"

termux-open-url "$BASE/motion.html?procedural=vanguard-attack5&rev=$FINAL&nocache=$STAMP" >/dev/null 2>&1 || true
