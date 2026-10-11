#!/data/data/com.termux/files/usr/bin/bash
# Serin Glide V1: Git-owned phone ingress and Pose Lab V2 tmux preview.
# Intentionally does not touch the user's current checkout, Vanguard, or main.
set -euo pipefail
export PAGER=cat GIT_PAGER=cat
stop(){ printf 'SERIN_STOP=%s\n' "$*" >&2; exit 1; }
ROOT="${POSE_LAB_ROOT:-/storage/emulated/0/Documents/GodotProjects/pose-lab-v2}"
BRANCH="codex/serin-glide-locomotion-v1"
CONTRACT="campaigns/serin-glide-locomotion-v1.contract.json"
SOURCE=""
EXPECTED="d7cd7e8df9168b1adc774c6784fae3aad4671a68a7369d56329c18ee01ccfa40"
ASSET="public/assets/serin-glide/serin-glide-right.png"
IDLE="public/assets/serin-back/serin-back-idle.png"
IDLE_SHA="e666cd65570ee7485f8c5e6c422fb0172883a317e0bea466477e201d45f6c79c"
STATE="$HOME/.local/state/pose-lab-v2-serin-glide-locomotion-v1"
SESSION="plv2-serin-glide-v1"
[ -d "$ROOT/.git" ] || stop "No Pose Lab V2 Git repository at $ROOT"
command -v node >/dev/null || stop 'Node.js is required by the existing V2 build'
command -v python3 >/dev/null || stop 'Python3 is required by the existing V2 campaign core'
command -v tmux >/dev/null || stop 'tmux is required to keep phone preview alive'
command -v curl >/dev/null || stop 'curl required for runtime byte readback'
mkdir -p "$STATE"
printf 'REPO=%s\n' "$ROOT"
printf 'DIRTY_CURRENT_WORKTREE_BEGIN\n'
git -C "$ROOT" status --porcelain=v1 --untracked-files=normal || stop 'Cannot inspect current user workspace'
printf 'DIRTY_CURRENT_WORKTREE_END (preserved: no checkout, reset, clean, stash, merge)\n'
git -C "$ROOT" fetch origin "refs/heads/$BRANCH:refs/remotes/origin/$BRANCH" || stop 'Cannot fetch GitHub candidate branch'
REV="$(git -C "$ROOT" rev-parse "refs/remotes/origin/$BRANCH")"
W="$STATE/worktree-$REV"
if [ -e "$W" ]; then
 [ -e "$W/.git" ] || stop "Existing worktree path is not Git-owned: $W"
 [ "$(git -C "$W" rev-parse HEAD)" = "$REV" ] || stop "STALE_PLAN existing worktree at $W"
 [ -z "$(git -C "$W" status --porcelain)" ] || stop "DIRTY_TARGET at $W, preserving it unchanged"
else
 git -C "$ROOT" worktree add --detach "$W" "$REV" || stop 'Could not create isolated detached review worktree'
fi
cd "$W"
source tools/campaigns/campaign_common.sh
pose_campaign_boot "$W" "$CONTRACT"
for rule in docs/POSE_CAMPAIGN_FRAMEWORK.md; do [ -s "$rule" ] || stop "Missing $rule"; cat "$rule" >/dev/null; echo "READ=$rule"; done
pose_campaign_verify "$W" "$CONTRACT"
[ "$(sha256sum "$IDLE" | cut -d' ' -f1)" = "$IDLE_SHA" ] || stop "Idle PNG lock mismatch"
printf 'CURRENT_REMOTE_CANDIDATE=%s\n' "$REV"
if [ ! -f "$ASSET" ];then
 SOURCE="$(printenv SERIN_GLIDE_SOURCE 2>/dev/null || true)"
 if [ -n "$SOURCE" ];then
  [ -f "$SOURCE" ] || stop "Source absent: $SOURCE"
  [ "$(sha256sum "$SOURCE" | cut -d' ' -f1)" = "$EXPECTED" ] || stop 'Explicit source identity mismatch'
 else
  HITS=0
  [ -d /storage/emulated/0/Pictures ] || stop 'Pictures unavailable'
  while IFS= read -r -d '' candidate;do
   if [ "$(sha256sum "$candidate" | cut -d' ' -f1)" = "$EXPECTED" ];then
    SOURCE="$candidate";HITS=$((HITS+1))
   fi
  done < <(find /storage/emulated/0/Pictures -maxdepth 1 -type f -iname '*.png' -print0)
  [ "$HITS" -eq 1 ] || stop "Found $HITS exact Serin glide sources in Pictures; save the final approved PNG or set SERIN_GLIDE_SOURCE"
 fi
fi
if [ -f "$ASSET" ]; then
 GOT="$(sha256sum "$ASSET" | awk '{print $1}')"
 [ "$GOT" = "$EXPECTED" ] || stop "LOCK_VIOLATION: Git-owned Serin PNG $GOT"
 echo "NO_OP_ALREADY_APPLIED: image already Git-owned"
else
 [ -f "$SOURCE" ] || stop "MISSING_AUTHORITY: approved phone PNG absent at $SOURCE"
 GOT="$(sha256sum "$SOURCE" | awk '{print $1}')"
 [ "$GOT" = "$EXPECTED" ] || stop "UNKNOWN_SOURCE_IDENTITY: $SOURCE has $GOT, expected $EXPECTED"
 mkdir -p "$(dirname "$ASSET")"
 cp -- "$SOURCE" "$ASSET"
 [ "$(sha256sum "$ASSET" | awk '{print $1}')" = "$EXPECTED" ] || stop 'Ingress copy mismatch'
 node tools/test_serin_glide_runtime.mjs
 node tools/test_serin_glide_system.mjs
 pose_campaign_check_worktree "$W" "$CONTRACT"
 pose_campaign_stage "$W" "$CONTRACT" "$ASSET"
 IMPL="$(pose_campaign_commit "$W" 'asset(serin): ingest exact approved transparent idle' | tail -1)"
 pose_campaign_write_receipt "$W" "$CONTRACT" "$REV" "$IMPL" "" "" "phone-termux-repo-owned-campaign" "pending"
 pose_campaign_stage "$W" "$CONTRACT" "campaigns/serin-glide-locomotion-v1.receipt.json"
 pose_campaign_commit "$W" 'campaign(serin): record source ingress receipt' >/dev/null
 FINAL="$(git rev-parse HEAD)"
 pose_campaign_push_and_readback "$W" "$BRANCH" "$FINAL"
 [ "$(git show "HEAD:$ASSET" | sha256sum | awk '{print $1}')" = "$EXPECTED" ] || stop 'Committed PNG readback mismatch'
 REV="$FINAL"
 echo "GITHUB_ASSET_COMMITTED=$FINAL"
fi
node --check src/serin-glide-preview.js
node --check src/serin-glide-system.mjs
node tools/test_serin_glide_runtime.mjs
node tools/test_serin_glide_system.mjs
pose_campaign_verify "$W" "$CONTRACT"
node scripts/build.mjs
test -f "$W/dist/assets/serin-glide/serin-glide-right.png" || stop 'Build did not contain exact PNG'
[ "$(sha256sum "$W/dist/assets/serin-glide/serin-glide-right.png" | awk '{print $1}')" = "$EXPECTED" ] || stop 'Build mutated source bytes'
# Only the dedicated Serin tmux session is ever recycled.
if tmux has-session -t "$SESSION" 2>/dev/null; then
 if [ -f "$STATE/served-revision" ] && [ "$(cat "$STATE/served-revision")" = "$REV" ]; then
   PORT="$(cat "$STATE/server-port")"
   echo 'NO_OP_ALREADY_APPLIED: preview already runs the exact revision'
 else
   tmux kill-session -t "$SESSION" || stop 'Could not retire this campaign-owned tmux session'
 fi
fi
if ! tmux has-session -t "$SESSION" 2>/dev/null; then
 PORT="${POSE_LAB_SERIN_GLIDE_PORT:-$(pose_campaign_free_port)}"
 printf '%s\n' "$PORT" > "$STATE/server-port"
 tmux new-session -d -s "$SESSION" "exec python3 -m http.server $PORT --bind 127.0.0.1 --directory '$W/dist' > '$STATE/server.log' 2>&1"
 printf '%s\n' "$REV" > "$STATE/served-revision"
fi
PID="$(tmux display-message -p -t "$SESSION" '#{pane_pid}')"
BASE="http://127.0.0.1:$PORT"
pose_campaign_wait_http "$BASE/motion.html" "$PID" "$STATE/server.log"
curl -fsS "$BASE/assets/serin-glide/idle.recipe.json" >/dev/null || stop 'Served recipe unavailable'
HTTP_SHA="$(curl -fsS "$BASE/assets/serin-glide/serin-glide-right.png" | sha256sum | awk '{print $1}')"
[ "$HTTP_SHA" = "$EXPECTED" ] || stop "SERVER_ROOT_MISMATCH: served image hash=$HTTP_SHA"
URL="$BASE/motion.html?procedural=serin-glide&rev=$REV"
printf '\nSERIN_GLIDE_TRANSPORT=PASS\nREVISION=%s\nSOURCE_SHA256=%s\nSERVED_SHA256=%s\nTMUX_SESSION=%s\nREVIEW_URL=%s\nHUMAN_VERDICT=PENDING\n' "$REV" "$EXPECTED" "$HTTP_SHA" "$SESSION" "$URL"
if command -v termux-open-url >/dev/null; then termux-open-url "$URL" || echo "OPEN_BROWSER_MANUALLY=$URL"; fi
