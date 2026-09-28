#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export PAGER=cat GIT_PAGER=cat

ROOT="/storage/emulated/0/Documents/GodotProjects/pose-lab-v2"
CONTRACT="campaigns/swarmling-procedural-physiology-v5.contract.json"
HELPER="tools/campaigns/apply_swarmling_procedural_physiology_v5.py"
SELF="tools/campaigns/swarmling-procedural-physiology-v5.sh"
COMMON="tools/campaigns/campaign_common.sh"
MANIFEST="public/assets/vanguard/fleshpunk/characters/swarmling/animations.json"
KERNEL="src/procedural-motion-kernel.js"
KERNEL_TEST="tools/test_procedural_motion_kernel.mjs"
UTILITY_TEST="tools/test_swarmling_utility_animations.mjs"
ATTACK_TEST="tools/test_swarmling_attacks.mjs"
RECEIPT="campaigns/swarmling-procedural-physiology-v5.receipt.json"
STATE="$HOME/.local/state/pose-lab-v2-swarmling-physiology-v5"
LIVE="$STATE/live"

stop(){ echo "STOP: $*" >&2; exit 1; }

[ -d "$ROOT/.git" ] || stop "Pose Lab checkout missing: $ROOT"
cd "$ROOT"

echo "=== PRIMARY WORKTREE READ-ONLY ==="
git status --short
git fetch origin main
SEALED="$(git rev-parse origin/main)"
echo "SEALED_REV=$SEALED"

for f in "$CONTRACT" "$HELPER" "$SELF" "$COMMON" "$KERNEL" "$KERNEL_TEST" "$UTILITY_TEST" "$ATTACK_TEST"; do
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
node --check "$ATTACK_TEST"
python3 tools/test_pose_campaign_framework.py
node "$KERNEL_TEST"

echo "=== APPLY V5 PROCEDURAL MOTION ==="
python3 "$HELPER" "$AUTHOR" "$CONTRACT"

echo "=== FRAMEWORK VERIFY ==="
pose_campaign_check_worktree "$AUTHOR" "$CONTRACT"
pose_campaign_verify "$AUTHOR" "$CONTRACT"

echo "=== V5 REGRESSION TESTS ==="
node "$KERNEL_TEST"
node "$UTILITY_TEST"
node "$ATTACK_TEST"
npm run test:swarmling-utility-scale
npm run test:campaign-framework
npm run test:2d
npm run build
npm run smoke
git diff --check

echo "=== STAGE IMPLEMENTATION ==="
pose_campaign_stage "$AUTHOR" "$CONTRACT" "$MANIFEST"

IMPLEMENTATION="$(pose_campaign_commit "$AUTHOR" "Refine Swarmling micro-pulse idle and attack motion" | tail -n1)"
echo "IMPLEMENTATION_REV=$IMPLEMENTATION"

echo "=== CREATE RECEIPT ==="
pose_campaign_write_receipt   "$AUTHOR"   "$CONTRACT"   "$SEALED"   "$IMPLEMENTATION"   ""   ""   "repo-owned-framework-v2-campaign"   "pending"

pose_campaign_stage "$AUTHOR" "$CONTRACT" "$RECEIPT"
FINAL="$(pose_campaign_commit "$AUTHOR" "Record Swarmling procedural physiology v5 receipt" | tail -n1)"
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
node "$KERNEL_TEST"
node "$UTILITY_TEST"
node "$ATTACK_TEST"
npm run test:swarmling-utility-scale
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
JAB="$BASE/motion.html?procedural=swarmling-jab&rev=$FINAL&nocache=$STAMP"
RAKE="$BASE/motion.html?procedural=swarmling-rake&rev=$FINAL&nocache=$STAMP"
BLOOM="$BASE/motion.html?procedural=swarmling-scythe-bloom&rev=$FINAL&nocache=$STAMP"

echo "=== HUMAN REVIEW ==="
echo "FINAL_REV=$FINAL"
echo "IDLE=$IDLE"
echo "AGGRO=$AGGRO"
echo "DAMAGE=$DAMAGE"
echo "JAB=$JAB"
echo "RAKE=$RAKE"
echo "SCYTHE_BLOOM=$BLOOM"
echo "AGGRO_MODE=MICRO_ALERT_CLUSTER"
echo "IDLE=MORE_DEFORMATION_LESS_SHRINK"
echo "DAMAGE=V4_PROFILE_PRESERVED"
echo "JAB_PROCEDURAL=ATTACK_SNAP"
echo "RAKE_PROCEDURAL=ATTACK_DRAG"
echo "SCYTHE_BLOOM_PROCEDURAL=ATTACK_BLOOM"
echo "POSE_CHOICES=UNCHANGED"
echo "STAGE_ANCHORS=LOCKED"
echo "TIMING=LOCKED"
echo "ATLAS_PIXELS=LOCKED_UNCHANGED"
echo "ROOT_MOTION=OFF"
echo "FRAMEWORK_V2=PASS"
echo "HUMAN_VERDICT=PENDING"

termux-open-url "$AGGRO" >/dev/null 2>&1 || true
