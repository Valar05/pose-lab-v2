#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export PAGER=cat GIT_PAGER=cat

ROOT="/storage/emulated/0/Documents/GodotProjects/pose-lab-v2"
CONTRACT="campaigns/swarmling-procedural-physiology-v4.contract.json"
HELPER="tools/campaigns/apply_swarmling_procedural_physiology_v4.py"
SELF="tools/campaigns/swarmling-procedural-physiology-v4.sh"
COMMON="tools/campaigns/campaign_common.sh"
MANIFEST="public/assets/vanguard/fleshpunk/characters/swarmling/animations.json"
PREVIEW="src/procedural-swarmling-preview.js"
KERNEL="src/procedural-motion-kernel.js"
KERNEL_TEST="tools/test_procedural_motion_kernel.mjs"
UTILITY_TEST="tools/test_swarmling_utility_animations.mjs"
PACKAGE="package.json"
RECEIPT="campaigns/swarmling-procedural-physiology-v4.receipt.json"
STATE="$HOME/.local/state/pose-lab-v2-swarmling-physiology-v4"
LIVE="$STATE/live"

stop(){ echo "STOP: $*" >&2; exit 1; }

[ -d "$ROOT/.git" ] || stop "Pose Lab checkout missing: $ROOT"
cd "$ROOT"

echo "=== PRIMARY WORKTREE READ-ONLY ==="
git status --short
git fetch origin main
SEALED="$(git rev-parse origin/main)"
echo "SEALED_REV=$SEALED"

for f in "$CONTRACT" "$HELPER" "$SELF" "$COMMON" "$KERNEL" "$KERNEL_TEST" "$UTILITY_TEST"; do
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

echo "=== PACKAGE PREFLIGHT ==="
python3 -m py_compile "$HELPER" tools/campaigns/campaign_core.py
bash -n "$SELF"
bash -n "$COMMON"
node --check "$KERNEL"
node --check "$KERNEL_TEST"
node --check "$UTILITY_TEST"
python3 tools/test_pose_campaign_framework.py
node "$KERNEL_TEST"

echo "=== APPLY STATE-AWARE PROCEDURAL PHYSIOLOGY ==="
python3 "$HELPER" "$AUTHOR" "$CONTRACT"

echo "=== FRAMEWORK VERIFY ==="
pose_campaign_check_worktree "$AUTHOR" "$CONTRACT"
pose_campaign_verify "$AUTHOR" "$CONTRACT"

echo "=== PHYSIOLOGY + REGRESSION TESTS ==="
npm run test:procedural-motion-kernel
npm run test:swarmling-utility
npm run test:swarmling-utility-scale
node tools/test_swarmling_attacks.mjs
npm run test:campaign-framework
npm run test:2d
node --check "$PREVIEW"
node --check "$KERNEL"
npm run build
npm run smoke
git diff --check

echo "=== STAGE IMPLEMENTATION ==="
pose_campaign_stage "$AUTHOR" "$CONTRACT"   "$MANIFEST"   "$PREVIEW"   "$PACKAGE"

IMPLEMENTATION="$(pose_campaign_commit "$AUTHOR" "Advance Swarmling state-aware procedural physiology" | tail -n1)"
echo "IMPLEMENTATION_REV=$IMPLEMENTATION"

echo "=== CREATE RECEIPT ==="
pose_campaign_write_receipt   "$AUTHOR"   "$CONTRACT"   "$SEALED"   "$IMPLEMENTATION"   ""   ""   "repo-owned-framework-v2-campaign"   "pending"

pose_campaign_stage "$AUTHOR" "$CONTRACT" "$RECEIPT"
FINAL="$(pose_campaign_commit "$AUTHOR" "Record Swarmling procedural physiology v4 receipt" | tail -n1)"
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
npm run test:procedural-motion-kernel
npm run test:swarmling-utility
npm run test:swarmling-utility-scale
node tools/test_swarmling_attacks.mjs
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
IDLE="$BASE/motion.html?procedural=swarmling-idle&rev=$FINAL&nocache=$STAMP"
AGGRO="$BASE/motion.html?procedural=swarmling-aggro&rev=$FINAL&nocache=$STAMP"
DAMAGE="$BASE/motion.html?procedural=swarmling-damage&rev=$FINAL&nocache=$STAMP"
KNOCKDOWN="$BASE/motion.html?procedural=swarmling-knockdown&rev=$FINAL&nocache=$STAMP"
STANDUP="$BASE/motion.html?procedural=swarmling-stand-up&rev=$FINAL&nocache=$STAMP"
DEATH="$BASE/motion.html?procedural=swarmling-death&rev=$FINAL&nocache=$STAMP"

echo "=== HUMAN REVIEW ==="
echo "FINAL_REV=$FINAL"
echo "IDLE=$IDLE"
echo "AGGRO=$AGGRO"
echo "DAMAGE=$DAMAGE"
echo "KNOCKDOWN=$KNOCKDOWN"
echo "STAND_UP=$STANDUP"
echo "DEATH=$DEATH"
echo "MOTION_KERNEL=STATE_AWARE_V2"
echo "AXIS_OSCILLATORS=INDEPENDENT"
echo "PHASE_ENVELOPES=ON"
echo "AGGRO_PULSE=ASYMMETRIC"
echo "DAMAGE_RINGDOWN=DAMPED"
echo "STAND_UP_EFFORT_BURST=ON"
echo "CORPSE_PROCEDURAL_MOTION=ZERO"
echo "POSE_SEQUENCES=LOCKED_UNCHANGED"
echo "ATLAS_PIXELS=LOCKED_UNCHANGED"
echo "VANGUARD_TRANSFER_KERNEL=READY"
echo "FRAMEWORK_V2=PASS"
echo "HUMAN_VERDICT=PENDING"

termux-open-url "$AGGRO" >/dev/null 2>&1 || true
