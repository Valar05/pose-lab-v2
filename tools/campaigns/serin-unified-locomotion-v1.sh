#!/data/data/com.termux/files/usr/bin/bash
# Unified Serin locomotion V1: read-only Git-owned source and phone preview.
# Intentionally does not touch the user's current checkout, Vanguard, or main.
set -euo pipefail
export PAGER=cat GIT_PAGER=cat
stop(){ printf 'SERIN_UNIFIED_STOP=%s\n' "$*" >&2; exit 1; }
ROOT="${POSE_LAB_ROOT:-/storage/emulated/0/Documents/GodotProjects/pose-lab-v2}"
BRANCH="codex/serin-unified-locomotion-v1"
CONTRACT="campaigns/serin-unified-locomotion-v1.contract.json"
SOURCE="/storage/emulated/0/Pictures/file_00000000b6ac81fbb8c9c9f85a645117.png"
EXPECTED=""
ASSET="public/assets/serin-glide/serin-glide-wave-v2.png"
IDLE="public/assets/serin/serin-idle.png"
IDLE_SHA="00ba472a4ee922a0840a3d63a71deafd054a3f91514480bab7918e94afab307f"
STATE="$HOME/.local/state/pose-lab-v2-serin-unified-locomotion-v1"
SESSION="plv2-serin-unified-v1"
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
[ -f "$ASSET" ] || stop "MISSING_GIT_GLIDE_ASSET: exact prior approved PNG not committed"
EXPECTED="$(node -p "require('./public/assets/serin-glide/unified-locomotion.recipe.json').source.glide.sha256")"
GOT="$(sha256sum "$ASSET" | awk '{print $1}')"
[ "$GOT" = "$EXPECTED" ] || stop "LOCK_VIOLATION: committed glide art"
echo "NO_OP_ALREADY_APPLIED: existing Git-owned artwork reused without mutation"
node --check src/serin-unified-preview.js
node --check src/serin-glide-wave-system.mjs
node --check src/serin-unified-locomotion.mjs
node tools/test_serin_unified_runtime.mjs
node tools/test_serin_unified_locomotion.mjs
pose_campaign_verify "$W" "$CONTRACT"
node tools/test_serin_glide_wave_system.mjs
node scripts/build.mjs
test -f "$W/dist/assets/serin-glide/serin-glide-wave-v2.png" || stop 'Build did not contain exact PNG'
[ "$(sha256sum "$W/dist/assets/serin/serin-idle.png" | awk '{print $1}')" = "$IDLE_SHA" ] || stop "Built locomotion idle mutated"
[ "$(sha256sum "$W/dist/assets/serin-glide/serin-glide-wave-v2.png" | awk '{print $1}')" = "$EXPECTED" ] || stop 'Build mutated source bytes'
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
 PORT="${POSE_LAB_SERIN_UNIFIED_PORT:-$(pose_campaign_free_port)}"
 printf '%s\n' "$PORT" > "$STATE/server-port"
 tmux new-session -d -s "$SESSION" "exec python3 -m http.server $PORT --bind 127.0.0.1 --directory '$W/dist' > '$STATE/server.log' 2>&1"
 printf '%s\n' "$REV" > "$STATE/served-revision"
fi
PID="$(tmux display-message -p -t "$SESSION" '#{pane_pid}')"
BASE="http://127.0.0.1:$PORT"
pose_campaign_wait_http "$BASE/motion.html" "$PID" "$STATE/server.log"
curl -fsS "$BASE/assets/serin-glide/unified-locomotion.recipe.json" >/dev/null || stop 'Served unified locomotion recipe unavailable'
curl -fsS "$BASE/assets/serin/idle.recipe.json" >/dev/null || stop 'Front idle blink recipe unavailable'
HTTP_SHA="$(curl -fsS "$BASE/assets/serin-glide/serin-glide-wave-v2.png" | sha256sum | awk '{print $1}')"
IDLE_HTTP_SHA="$(curl -fsS "$BASE/assets/serin/serin-idle.png" | sha256sum | awk '{print $1}')"
[ "$IDLE_HTTP_SHA" = "$IDLE_SHA" ] || stop "SERVED_IDLE_MISMATCH"
[ "$HTTP_SHA" = "$EXPECTED" ] || stop "SERVER_ROOT_MISMATCH: served image hash=$HTTP_SHA"
URL="$BASE/motion.html?procedural=serin-unified&rev=$REV"
printf '\nSERIN_UNIFIED_TRANSPORT=PASS\nREVISION=%s\nSOURCE_SHA256=%s\nSERVED_SHA256=%s\nTMUX_SESSION=%s\nREVIEW_URL=%s\nHUMAN_VERDICT=PENDING\n' "$REV" "$EXPECTED" "$HTTP_SHA" "$SESSION" "$URL"
if command -v termux-open-url >/dev/null; then termux-open-url "$URL" || echo "OPEN_BROWSER_MANUALLY=$URL"; fi
