#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export PAGER=cat GIT_PAGER=cat

ROOT="/storage/emulated/0/Documents/GodotProjects/pose-lab-v2"
CONTRACT="campaigns/swarmling-utility-pack-v2.contract.json"
HELPER="tools/campaigns/apply_swarmling_utility_pack_v2.py"
SELF="tools/campaigns/swarmling-utility-pack-v2.sh"
COMMON="tools/campaigns/campaign_common.sh"
ATLAS="public/assets/vanguard/fleshpunk/characters/swarmling/source/swarmling-approved-atlas.png"
MANIFEST="public/assets/vanguard/fleshpunk/characters/swarmling/animations.json"
PREVIEW="src/procedural-swarmling-preview.js"
UTILITY_TEST="tools/test_swarmling_utility_animations.mjs"
SCALE_TEST="tools/test_swarmling_utility_scale.py"
PACKAGE="package.json"
RECEIPT="campaigns/swarmling-utility-pack-v2.receipt.json"
STATE="$HOME/.local/state/pose-lab-v2-swarmling-utility-pack-v2"
LIVE="$STATE/live"

stop(){ echo "STOP: $*" >&2; exit 1; }

[ -d "$ROOT/.git" ] || stop "Pose Lab checkout missing: $ROOT"
cd "$ROOT"

echo "=== PRIMARY WORKTREE READ-ONLY ==="
git status --short
git fetch origin main
SEALED="$(git rev-parse origin/main)"
echo "SEALED_REV=$SEALED"

for f in "$CONTRACT" "$HELPER" "$SELF" "$COMMON" "$UTILITY_TEST" "$SCALE_TEST"; do
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
python3 -m py_compile "$HELPER" "$SCALE_TEST" tools/campaigns/campaign_core.py
bash -n "$SELF"
bash -n "$COMMON"
node --check "$UTILITY_TEST"
python3 tools/test_pose_campaign_framework.py

echo "=== APPLY UTILITY PACK V2 ==="
python3 "$HELPER" "$AUTHOR" "$CONTRACT"

echo "=== FRAMEWORK SURFACE + STRUCTURAL VERIFY ==="
pose_campaign_check_worktree "$AUTHOR" "$CONTRACT"
pose_campaign_verify "$AUTHOR" "$CONTRACT"

echo "=== UTILITY SEMANTIC + SOURCE-SCALE TESTS ==="
npm run test:swarmling-utility
npm run test:swarmling-utility-scale
node tools/test_swarmling_attacks.mjs
npm run test:campaign-framework
npm run test:2d
node --check "$PREVIEW"
npm run build
npm run smoke
git diff --check

echo "=== STAGE IMPLEMENTATION ==="
pose_campaign_stage "$AUTHOR" "$CONTRACT"   "$ATLAS"   "$MANIFEST"   "$PREVIEW"   "$PACKAGE"

IMPLEMENTATION="$(pose_campaign_commit "$AUTHOR" "Correct Swarmling utility scale and procedural motion" | tail -n1)"
echo "IMPLEMENTATION_REV=$IMPLEMENTATION"

echo "=== CREATE RECEIPT ==="
pose_campaign_write_receipt   "$AUTHOR"   "$CONTRACT"   "$SEALED"   "$IMPLEMENTATION"   ""   ""   "repo-owned-framework-v2-campaign"   "pending"

pose_campaign_stage "$AUTHOR" "$CONTRACT" "$RECEIPT"
FINAL="$(pose_campaign_commit "$AUTHOR" "Record corrected Swarmling utility pack v2 receipt" | tail -n1)"
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
echo "IDLE_AUTHORED_FRAMES=1"
echo "IDLE_SOURCE_CELL=7"
echo "UTILITY_SOURCE_SCALE=SHARED"
echo "PROCEDURAL_MOTION=ALL_UTILITIES"
echo "NON_LOOP_TERMINAL_HOLD=ON"
echo "KNOCKDOWN_TERMINAL=21"
echo "DEATH_TERMINAL=22"
echo "RUN_AND_ATTACKS=LOCKED_UNCHANGED"
echo "ROOT_MOTION=OFF"
echo "FRAMEWORK_V2=PASS"
echo "HUMAN_VERDICT=PENDING"

termux-open-url "$IDLE" >/dev/null 2>&1 || true
