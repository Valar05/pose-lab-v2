#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export PAGER=cat GIT_PAGER=cat

ROOT="/storage/emulated/0/Documents/GodotProjects/pose-lab-v2"
CONTRACT="campaigns/vanguard-overhand-diorama-speed-sprite-v5.contract.json"
HELPER="tools/campaigns/apply_vanguard_overhand_diorama_speed_sprite_v5.py"
SELF="tools/campaigns/vanguard-overhand-diorama-speed-sprite-v5.sh"
COMMON="tools/campaigns/campaign_common.sh"
RECIPE="public/assets/vanguard/procedural/overhand-strike.recipe.json"
RENDERER="src/procedural-motion-preview.js"
ASSET="public/assets/vanguard/procedural/vanguard-diorama-speed-lines.png"
TEST="tools/test_vanguard_overhand_diorama_speed_sprite_v5.mjs"
RECEIPT="campaigns/vanguard-overhand-diorama-speed-sprite-v5.receipt.json"
STATE="$HOME/.local/state/pose-lab-v2-vanguard-overhand-diorama-speed-sprite-v5"
LIVE="$STATE/live"

stop(){ echo "STOP: $*" >&2; exit 1; }

[ -d "$ROOT/.git" ] || stop "Pose Lab checkout missing: $ROOT"
cd "$ROOT"

echo "=== PRIMARY WORKTREE READ-ONLY ==="
git status --short
git fetch origin main
SEALED="$(git rev-parse origin/main)"
echo "SEALED_REV=$SEALED"

for f in "$CONTRACT" "$HELPER" "$SELF" "$COMMON" "$RECIPE" "$RENDERER" "$TEST"; do
  git cat-file -e "$SEALED:$f" || stop "sealed package missing: $f"
done

echo "=== RESOLVE EXACT USER-APPROVED SPEED-LINE PNG ==="
SRC="$(python3 - "$ROOT" "$CONTRACT" <<'PY'
import glob,hashlib,json,struct,sys
from pathlib import Path
root=Path(sys.argv[1])
c=json.loads((root/sys.argv[2]).read_text())
a=c["sourceAsset"]
ordered=[]
for s in a["androidCandidates"]:
    p=Path(s)
    if p not in ordered: ordered.append(p)
for s in sorted(glob.glob("/storage/emulated/0/Download/"+a["basenamePattern"])):
    p=Path(s)
    if p not in ordered: ordered.append(p)
good=[]
for p in ordered:
    if not p.is_file(): continue
    raw=p.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=a["byteSha256"]: continue
    if raw[:8]!=b"\x89PNG\r\n\x1a\n": continue
    w,h=struct.unpack(">II",raw[16:24])
    if [w,h]!=[a["width"],a["height"]]: continue
    good.append(p)
if not good:
    raise SystemExit("STOP: exact approved 157x72 speed-line PNG not found in bounded Download candidates")
print(good[0])
PY
)" || exit $?
echo "SOURCE=$SRC"
echo "SOURCE_SHA256=$(sha256sum "$SRC" | awk '{print $1}')"

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
echo "SOURCE_AUTHORITY=$SRC"
echo "LOCKED_TIMING=600MS"
echo "LOCKED_HANDOFF=310MS"
echo "LOCKED_SLASH=YES"
echo "LOCKED_POSES=YES"
echo "LOCKED_BLUR_ENVELOPE=YES"

echo "=== PACKAGE PREFLIGHT ==="
python3 -m py_compile "$HELPER" tools/campaigns/campaign_core.py
bash -n "$SELF"
bash -n "$COMMON"
node --check "$RENDERER"
node --check "$TEST"
python3 tools/test_pose_campaign_framework.py

echo "=== APPLY DIORAMA BAKED SPEED-SPRITE V5 ==="
python3 "$HELPER" "$AUTHOR" "$CONTRACT" "$SRC"

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

IMPLEMENTATION="$(pose_campaign_commit "$AUTHOR" "Replace Vanguard vector dashes with Diorama baked speed sprite" | tail -n1)"
echo "IMPLEMENTATION_REV=$IMPLEMENTATION"

echo "=== CREATE RECEIPT ==="
pose_campaign_write_receipt "$AUTHOR" "$CONTRACT" "$SEALED" "$IMPLEMENTATION" "" "" "repo-owned-framework-v2-campaign" "pending"

pose_campaign_stage "$AUTHOR" "$CONTRACT" "$RECEIPT"
FINAL="$(pose_campaign_commit "$AUTHOR" "Record Vanguard overhand Diorama speed-sprite v5 receipt" | tail -n1)"
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
[ "$(sha256sum "$ASSET" | awk '{print $1}')" = "363b184de9bfc98a74c92a2066f63b6a4c9a9998a168fad87f67f2c32cc396e8" ] || stop "final asset hash mismatch"

echo "=== START REVIEW SERVER ==="
PORT="$(pose_campaign_free_port)"
BASE="http://127.0.0.1:$PORT"
LOG="$STATE/server-$PORT.log"
python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$LIVE/dist" >"$LOG" 2>&1 &
PID=$!
pose_campaign_wait_http "$BASE/motion.html?rev=$FINAL" "$PID" "$LOG"
SERVED_SHA="$(curl -fsS "$BASE/assets/vanguard/procedural/vanguard-diorama-speed-lines.png" | sha256sum | awk '{print $1}')"
[ "$SERVED_SHA" = "363b184de9bfc98a74c92a2066f63b6a4c9a9998a168fad87f67f2c32cc396e8" ] || stop "served speed-line bytes mismatch"

STAMP="$(date +%s)"
OVERHAND="$BASE/motion.html?procedural=vanguard-overhand-strike&rev=$FINAL&nocache=$STAMP"

echo "=== HUMAN REVIEW ==="
echo "FINAL_REV=$FINAL"
echo "OVERHAND=$OVERHAND"
echo "SPEED_LINE_ASSET_SHA256=$SERVED_SHA"
echo "SPEED_LINE_ASSET=157x72_SINGLE_BAKED_SPRITE"
echo "SPEED_LINE_GEOMETRY=FIVE_LINE_TRAPEZOID"
echo "SPEED_LINE_PALETTE=YELLOW_GOLD_SLASH_FAMILY"
echo "SPEED_LINE_DRAW=ONE_IMAGE_NO_INSTANCING"
echo "SPEED_LINE_X_SCALE=0.58_TO_1.0_FROM_BLUR_AMOUNT"
echo "VECTOR_DASHES=REMOVED"
echo "SLICED_SPRITE_DISTORTION=ABSENT"
echo "TIMING=LOCKED_600MS"
echo "HANDOFF=LOCKED_310MS"
echo "PRIMARY_SPRITE_BLUR=KEPT_SHORT"
echo "SLASH=LOCKED"
echo "POSES=LOCKED"
echo "ATLAS_PIXELS=LOCKED"
echo "ROOT_MOTION=OFF"
echo "HUMAN_VERDICT=PENDING"

termux-open-url "$OVERHAND" >/dev/null 2>&1 || true
