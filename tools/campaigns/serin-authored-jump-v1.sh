#!/data/data/com.termux/files/usr/bin/bash
# Serin authored airborne V1: exact phone picture -> isolated Git-backed review.
set -euo pipefail
export PAGER=cat GIT_PAGER=cat
stop(){ printf 'SERIN_AUTHORED_JUMP_STOP=%s\n' "$*" >&2; exit 1; }
ROOT="${POSE_LAB_ROOT:-/storage/emulated/0/Documents/GodotProjects/pose-lab-v2}"
BRANCH="codex/serin-authored-jump-v1"
CONTRACT="campaigns/serin-authored-jump-v1.contract.json"
SOURCE="/storage/emulated/0/Pictures/file_00000000d06481f5866e830f23523b51.png"
SHA="dae365a6adf33bb3961df2a5cbeb21f53c37f1043124765511c7b8ef8015e453"
ASSET="public/assets/serin-jump/serin-jump-airborne-v1.png"
STATE="$HOME/.local/state/pose-lab-v2-serin-authored-jump-v1"
SESSION="plv2-serin-authored-v1"
[ -d "$ROOT/.git" ] || stop "Pose Lab V2 repository unavailable at $ROOT"
for cmd in git node python3 curl tmux sha256sum; do command -v "$cmd" >/dev/null || stop "Missing $cmd"; done
mkdir -p "$STATE"
printf 'CURRENT_WORKSPACE_DIRT_PRESERVED_BEGIN\n'
git -C "$ROOT" status --porcelain=v1 --untracked-files=normal || stop "Cannot inspect local repo"
printf 'CURRENT_WORKSPACE_DIRT_PRESERVED_END\n'
git -C "$ROOT" fetch origin "refs/heads/$BRANCH:refs/remotes/origin/$BRANCH" || stop "Cannot fetch $BRANCH"
START="$(git -C "$ROOT" rev-parse "refs/remotes/origin/$BRANCH")"
W="$STATE/worktree-$START"
if [ -e "$W" ]; then
  [ -e "$W/.git" ] || stop "Existing worktree location is not Git-owned"
  [ "$(git -C "$W" rev-parse HEAD)" = "$START" ] || stop "STALE_WORKTREE_HEAD"
  [ -z "$(git -C "$W" status --porcelain=v1)" ] || stop "DIRTY_ISOLATED_WORKTREE: preserved"
else
  git -C "$ROOT" worktree add --detach "$W" "$START" || stop "Cannot create isolated worktree"
fi
cd "$W"
source tools/campaigns/campaign_common.sh
pose_campaign_boot "$W" "$CONTRACT"
if [ ! -f "$ASSET" ]; then
  [ -f "$SOURCE" ] && [ ! -L "$SOURCE" ] || stop "SOURCE_NOT_AT_CONFIRMED_PHONE_PATH=$SOURCE"
  python3 - "$SOURCE" <<'PY'
import hashlib,struct,sys
p=sys.argv[1]
b=open(p,'rb').read()
want="dae365a6adf33bb3961df2a5cbeb21f53c37f1043124765511c7b8ef8015e453"
assert hashlib.sha256(b).hexdigest()==want,"SOURCE_SHA256_MISMATCH"
assert b[:8]==bytes((137,80,78,71,13,10,26,10)) and b[12:16]==b'IHDR',"SOURCE_NOT_PNG"
assert struct.unpack('>II',b[16:24])==(1086,1448),"SOURCE_DIMENSIONS_MISMATCH"
assert b[24]==8 and b[25]==6,"SOURCE_NOT_RGBA"
print("EXACT_AUTHORITATIVE_PHONE_PNG=PASS",len(b),"bytes")
PY
  mkdir -p "$(dirname "$ASSET")"
  cp -- "$SOURCE" "$ASSET" || stop "SOURCE_COPY_FAILED"
  [ "$(sha256sum "$ASSET" | awk '{print $1}')" = "$SHA" ] || stop "INGEST_HASH_MISMATCH"
  pose_campaign_stage "$W" "$CONTRACT" "$ASSET"
  pose_campaign_verify "$W" "$CONTRACT"
  node tools/test_serin_unified_locomotion.mjs
  node tools/test_serin_unified_runtime.mjs
  node tools/test_serin_authored_jump.mjs
  pose_campaign_commit "$W" "art(serin): ingest exact selected one-frame full-body airborne PNG" >/dev/null
  IMPL="$(git -C "$W" rev-parse HEAD)"
  pose_campaign_write_receipt "$W" "$CONTRACT" "$START" "$IMPL" "" "" "termux-phone-exact-source-ingress" "pending"
  pose_campaign_stage "$W" "$CONTRACT" "campaigns/serin-authored-jump-v1.receipt.json"
  pose_campaign_commit "$W" "receipt(serin): record exact airborne PNG ingress pending runtime verdict" >/dev/null
  REV="$(git -C "$W" rev-parse HEAD)"
  pose_campaign_push_and_readback "$W" "$BRANCH" "$REV"
else
  [ "$(sha256sum "$ASSET" | awk '{print $1}')" = "$SHA" ] || stop "GIT_OWNED_PNG_HASH_MISMATCH"
  [ -z "$(git -C "$W" status --porcelain=v1)" ] || stop "DIRTY_EXACT_SOURCE_WORKTREE"
  REV="$START"
  printf 'NO_OP_EXACT_IMAGE_ALREADY_COMMITTED=%s\n' "$REV"
fi
pose_campaign_verify "$W" "$CONTRACT"
node --check src/serin-unified-authored-preview.js
node tools/test_serin_authored_jump.mjs
node tools/test_serin_unified_locomotion.mjs
node tools/test_serin_unified_runtime.mjs
node scripts/build.mjs
[ "$(sha256sum "$W/dist/assets/serin-jump/serin-jump-airborne-v1.png" | awk '{print $1}')" = "$SHA" ] || stop "BUILD_CHANGED_AIRBORNE_ART"
if tmux has-session -t "$SESSION" 2>/dev/null; then
 if [ -f "$STATE/served-revision" ] && [ "$(cat "$STATE/served-revision")" = "$REV" ]; then
   PORT="$(cat "$STATE/server-port")"
 else
   tmux kill-session -t "$SESSION" || stop "Cannot retire this campaign-owned server"
 fi
fi
if ! tmux has-session -t "$SESSION" 2>/dev/null; then
  PORT="${POSE_LAB_SERIN_AUTHORED_PORT:-$(pose_campaign_free_port)}"
  printf '%s\n' "$PORT" > "$STATE/server-port"
  tmux new-session -d -s "$SESSION" "exec python3 -m http.server $PORT --bind 127.0.0.1 --directory '$W/dist' > '$STATE/server.log' 2>&1"
  printf '%s\n' "$REV" > "$STATE/served-revision"
fi
PID="$(tmux display-message -p -t "$SESSION" '#{pane_pid}')"
BASE="http://127.0.0.1:$PORT"
pose_campaign_wait_http "$BASE/motion.html" "$PID" "$STATE/server.log"
curl -fsS "$BASE/src/serin-unified-authored-preview.js" | cmp - "$W/dist/src/serin-unified-authored-preview.js" || stop "SERVED_RENDERER_MISMATCH"
curl -fsS "$BASE/assets/serin-jump/unified-airborne.recipe.json" | cmp - "$W/dist/assets/serin-jump/unified-airborne.recipe.json" || stop "SERVED_RECIPE_MISMATCH"
SERVEDS="$(curl -fsS "$BASE/assets/serin-jump/serin-jump-airborne-v1.png" | sha256sum | awk '{print $1}')"
[ "$SERVEDS" = "$SHA" ] || stop "SERVED_ORIGINAL_PNG_HASH_MISMATCH"
URL="$BASE/motion.html?procedural=serin-unified-authored&rev=$REV"
printf '\nSERIN_AUTHORED_JUMP_TRANSPORT=PASS\nREVISION=%s\nSOURCE_SHA256=%s\nSERVED_SHA256=%s\nTMUX_SESSION=%s\nREVIEW_URL=%s\nHUMAN_RUNTIME_VERDICT=PENDING\n' "$REV" "$SHA" "$SERVEDS" "$SESSION" "$URL"
if command -v termux-open-url >/dev/null; then termux-open-url "$URL" || echo "OPEN_BROWSER_MANUALLY=$URL"; fi
